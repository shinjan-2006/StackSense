const {chromium} = require(process.env.STACKSENSE_PLAYWRIGHT || "playwright");
const fs = require("node:fs");
const {pathToFileURL} = require("node:url");
const path = require("node:path");
const scenarios = require("./scenarios/stacksense_public_scenarios.json");

async function main() {
  fs.mkdirSync("report-evidence", {recursive:true});
  const browser = await chromium.launch({channel:"chrome",headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"reduce"});
    page.on("pageerror", error => { console.error(error); process.exitCode = 1; });
    await page.addInitScript(() => {
      const createObjectURL = URL.createObjectURL.bind(URL);
      URL.createObjectURL = blob => {
        if (blob.type === "application/json") window.capturedExport = blob.text();
        return createObjectURL(blob);
      };
    });
    await page.goto(pathToFileURL(path.resolve("index.html")).href);
    const cases = [...scenarios,
      {...scenarios[1], scenario_id:"E-budget", budget:{monthly_infra_usd:0}},
      {...scenarios[1], scenario_id:"E-type", team:{...scenarios[1].team,has_devops:"yes"}},
      {scenario_id:"E-missing"},
      {...scenarios[0], scenario_id:"E-static", scale:{...scenarios[0].scale,users_12_months:1000000}},
      {...scenarios[2], scenario_id:"E-regulated", advanced:{regulated_use:"production"}},
      {...scenarios[1], scenario_id:"E-existing", infrastructure:{...scenarios[1].infrastructure,existing_systems:["MySQL database"]},
        advanced:{approved_existing_integrations:["MySQL database"],existing_support_records:["MySQL database => demonstration-review"]}},
      {...scenarios[0], scenario_id:"E-airgap", infrastructure:{deployment_model:"air_gapped"}},
      {...scenarios[1], scenario_id:"E-skills", team:{...scenarios[1].team,languages:["csharp"]}},
      {...scenarios[1], scenario_id:"E-retired", infrastructure:{...scenarios[1].infrastructure,existing_systems:["Azure Database for PostgreSQL Single Server"]}}
    ];
    for (const scenario of cases) {
      await page.locator("#file").setInputFiles({name:"scenario.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(scenario))});
      await page.waitForFunction(id => JSON.parse(document.querySelector("#input").value).scenario_id === id,scenario.scenario_id);
      await page.locator("#go").click();
      await page.waitForFunction(id => window.stackSenseResult?.scenario_id === id,scenario.scenario_id);
      const actual = await page.evaluate(() => JSON.stringify(window.stackSenseResult));
      if (actual !== JSON.stringify(require("./engine").recommend(scenario))) throw new Error("Browser output differs from Node");
      if (scenario.scenario_id === "E-existing") await page.getByText("Existing systems plan",{exact:true}).click();
      if (scenario.scenario_id === "E-regulated") await page.getByText("Required production verification",{exact:true}).click();
      if (scenario.scenario_id === "E-skills") await page.getByText("ASP.NET Core",{exact:true}).first().click();
      await page.locator("#result").evaluate(element => element.scrollIntoView({block:"start"}));
      await page.screenshot({path:`report-evidence/${scenario.scenario_id}.png`});
    }
    const pending = page.waitForEvent("download");
    await page.locator("#download").click();
    const downloaded = await pending;
    if (downloaded.suggestedFilename() !== "E-retired_output.json") throw new Error("Unexpected export filename");
    const exported = JSON.parse(await page.evaluate(() => window.capturedExport));
    require("node:assert/strict").deepEqual(exported,require("./engine").recommend(cases.at(-1)));
    console.log(`Captured ${cases.length} offline browser runs and verified JSON export.`);
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
