"use strict";
const fs=require("fs"),path=require("path"),{recommend}=require("./engine");
const args = process.argv.slice(2);
const value = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;

function write(file, data) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

if (args.includes("--batch")) {
  try {
    const rows = JSON.parse(fs.readFileSync(value("--batch"), "utf8"));
    if (!Array.isArray(rows)) throw new Error("Batch input must be an array.");
    const out = value("--out") || "outputs";
    const seen = new Set();
    const targets = rows.map((row, index) => {
      const id = row?.scenario_id ?? "scenario";
      if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(id)) {
        throw new Error(`Row ${index + 1} has an unsafe scenario ID. Use letters, digits, underscores, or hyphens.`);
      }
      const name = `${id}_output.json`;
      const key = name.toLowerCase();
      if (seen.has(key)) throw new Error(`Duplicate batch output filename: ${name}`);
      seen.add(key);
      const target = path.join(out, name);
      const existing = fs.lstatSync(target, {throwIfNoEntry:false});
      if (existing && (!existing.isFile() || existing.nlink > 1)) {
        throw new Error(`Batch output must be a regular, unlinked file: ${name}`);
      }
      return target;
    });
    const results = rows.map(recommend);
    targets.forEach((target, index) => write(target, results[index]));
    console.log(`Wrote ${rows.length} recommendations to ${out}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
} else {
  const input = value("--input");
  const out = value("--out") || "recommendation.json";
  if (!input) {
    console.error("Usage: node cli.js --input scenario.json [--out output.json]");
    process.exit(1);
  }
  write(out, recommend(JSON.parse(fs.readFileSync(input, "utf8"))));
  console.log(`Wrote ${out}`);
}
