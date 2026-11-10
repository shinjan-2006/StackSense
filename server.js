"use strict";
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const {recommend} = require("./engine");

const assets = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/studio.css", ["studio.css", "text/css"]],
  ...["schema.js", "engine.js", "app.js"].map(file => ["/" + file, [file, "text/javascript"]])
]);

function send(res, status, type, body) {
  res.writeHead(status, {"Content-Type": type + "; charset=utf-8"});
  res.end(body);
}

function createServer() {
  return http.createServer(async (req, res) => {
    const route = req.url.split("?")[0];
    if (req.method === "POST" && route === "/api/recommend") {
      const chunks = [];
      let bytes = 0;
      try {
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes <= 1024 * 1024) chunks.push(chunk);
        }
      } catch {
        return;
      }
      if (bytes > 1024 * 1024) return send(res, 413, "application/json", '{"error":"Scenario exceeds 1 MiB."}');
      let scenario;
      try {
        scenario = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        return send(res, 400, "application/json", '{"error":"Invalid JSON."}');
      }
      let body;
      try {
        body = JSON.stringify(recommend(scenario));
      } catch (error) {
        console.error(error);
        return send(res, 500, "application/json", '{"error":"Could not generate a recommendation."}');
      }
      return send(res, 200, "application/json", body);
    }
    const asset = req.method === "GET" || req.method === "HEAD" ? assets.get(route) : undefined;
    if (!asset) return send(res, 404, "text/plain", "Not found");
    const [file, type] = asset;
    let body;
    try {
      const root = await fs.realpath(__dirname);
      const resolved = await fs.realpath(path.join(root, file));
      if (path.dirname(resolved) !== root) return send(res, 404, "text/plain", "Not found");
      body = await fs.readFile(resolved);
    } catch {
      return send(res, 404, "text/plain", "Not found");
    }
    return send(res, 200, type, req.method === "HEAD" ? undefined : body);
  });
}

if (require.main === module) {
  createServer().listen(3000, "127.0.0.1", () => console.log("StackSense running at http://127.0.0.1:3000"));
}
module.exports = {createServer};
