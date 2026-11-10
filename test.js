"use strict";
const assert = require("node:assert/strict");
const {recommend} = require("./engine");
const scenarios = require("./scenarios/stacksense_public_scenarios.json");
const [portfolio, marketplace, , , internal] = scenarios;
for (const scenario of scenarios) {
  const result = recommend(scenario);
  assert.deepEqual(result, recommend(scenario), scenario.scenario_id);
  assert.ok(result.stack, scenario.scenario_id);
  const cost = result.estimated_monthly_cost_usd;
  assert.equal(cost.min, cost.breakdown.reduce((total, row) => total + row.min, 0));
  assert.equal(cost.max, cost.breakdown.reduce((total, row) => total + row.max, 0));
  console.log("PASS", scenario.scenario_id);
}
const withInfra = (scenario, change) => recommend({...scenario,infrastructure:{...scenario.infrastructure,...change}});
const airGap = withInfra(portfolio,{deployment_model:"air_gapped"});
assert.match(airGap.stack.hosting.choice,/Nginx/);
assert.doesNotMatch(JSON.stringify([airGap.stack.hosting.choice,...airGap.stack.supporting.map(x => x.choice)]),/Cloudflare|GitHub Actions/);
const gcp = withInfra(marketplace,{cloud_preference:"gcp"});
assert.match(gcp.stack.hosting.choice,/Cloud Run.*asia-south1/);
assert.match(gcp.stack.database.choice,/Cloud SQL.*asia-south1/);
assert.match(gcp.stack.supporting.find(x => x.layer === "storage").choice,/Google Cloud Storage.*asia-south1/);
const aws = withInfra(marketplace,{cloud_preference:"aws",existing_systems:["Microsoft Entra ID"]});
assert.match(aws.stack.hosting.choice,/Amazon ECS/);
assert.match(aws.stack.frontend.choice,/Next.js.*React Native/);
assert.match(recommend(internal).stack.supporting.find(x => x.layer === "storage").choice,/Azure Blob Storage/);
const noBudget = recommend({...marketplace,budget:{monthly_infra_usd:0}});
assert.equal(noBudget.status,"infeasible");
assert.equal(noBudget.stack,null);
assert.ok(noBudget.warnings.some(x => x.code === "BUDGET_BELOW_MINIMUM"));
assert.match(withInfra(marketplace,{deployment_model:"self_hosted_cloud_vm",cloud_preference:"gcp"}).stack.hosting.choice,/Compute Engine/);
assert.equal(withInfra(marketplace,{data_residency:"other"}).stack,null);
assert.equal(recommend({...marketplace,team:{...marketplace.team,has_devops:"yes"}}).status,"invalid_input");
assert.equal(recommend({...marketplace,project:{...marketplace.project,platforms:["api_only","web"]}}).status,"infeasible");
assert.equal(recommend({...marketplace,project:{...marketplace.project,platforms:["api_only"]}}).stack.frontend.choice,"None");
const largeSearch = {...marketplace,advanced:{search_documents:500000}};
const searchChoice = scenario => recommend(scenario).stack.supporting.find(x => x.layer === "search").choice;
assert.equal(searchChoice({...largeSearch,priorities:{...largeSearch.priorities,cost:1}}),"Self-hosted Meilisearch");
assert.equal(searchChoice({...largeSearch,priorities:{...largeSearch.priorities,cost:5}}),"PostgreSQL full-text search");
console.log("PASS hidden-style constraint and sensitivity regressions");
const isolatedSso = recommend({...portfolio,requirements:{...portfolio.requirements,auth:"enterprise_sso"},
  infrastructure:{deployment_model:"air_gapped",existing_systems:["Microsoft Entra ID"]}});
assert.equal(isolatedSso.status,"infeasible");
assert.equal(isolatedSso.stack,null);
assert.ok(isolatedSso.warnings.some(note => note.code === "AIR_GAP_SSO_UNVERIFIED"));
assert.equal(recommend(internal).stack.backend.choice,"ASP.NET Core");
assert.match(recommend(internal).stack.backend.justification,/identity ecosystem/);
const lending = recommend(scenarios[3]);
assert.equal(lending.capacity_plan.peak_requests_per_second,500);
assert.equal(lending.capacity_plan.app_replicas,6);
assert.equal(lending.capacity_plan.database_storage_gb,130);
assert.ok(lending.verification_checks.some(check => check.area === "PCI DSS" && check.blocking_before_production));
const hipaa = recommend({...marketplace,compliance:["hipaa"]});
assert.equal(hipaa.status,"infeasible");
assert.equal(hipaa.stack,null);
assert.ok(hipaa.warnings.some(note => note.code === "HIPAA_EVIDENCE_REQUIRED" && note.severity === "critical"));
assert.ok(hipaa.verification_checks.some(check => check.area === "HIPAA" && check.blocking_before_production));
console.log("PASS SSO, score factors, capacity and production-verification regressions");
const hasLayer = (result, pattern) => result.stack.supporting.some(item => pattern.test(item.choice));
assert.ok(hasLayer(recommend(scenarios[2]), /Yjs/));
assert.ok(!hasLayer(recommend({...scenarios[2],advanced:{realtime_interaction:"notifications"}}), /Yjs/));
assert.ok(hasLayer(lending, /double-entry journal/));
assert.ok(!hasLayer(recommend({...scenarios[3],advanced:{ledger_model:"none"}}), /double-entry journal/));
assert.ok(hasLayer(recommend(scenarios[5]), /tus upload/));
const offlineWeb = recommend({...portfolio,budget:{monthly_infra_usd:100},
  requirements:{...portfolio.requirements,offline_support:true},advanced:{offline_access:"read_only"}});
assert.ok(hasLayer(offlineWeb, /Service Worker \+ IndexedDB/));
assert.match(offlineWeb.stack.supporting.find(item => /IndexedDB/.test(item.choice)).justification,/disable writes/);
const staticHa = recommend({...portfolio,budget:{monthly_infra_usd:200},team:{...portfolio.team,has_devops:true},requirements:{...portfolio.requirements,availability:"99.99"}});
assert.ok(hasLayer(staticHa, /Redundant static serving/));
assert.equal(staticHa.estimated_monthly_cost_usd.breakdown.find(item => item.layer === "Hosting").min,50);
assert.equal(recommend({...portfolio,advanced:{resumable_uploads:true}}).status,"infeasible");
assert.equal(recommend({...portfolio,advanced:{realtime_interaction:"concurrent_editing"}}).status,"infeasible");
console.log("PASS workflow input overrides and availability regressions");
const uploadLayer = result => result.stack.supporting.find(item => /tus upload/.test(item.choice));
const onlineUpload = recommend({...marketplace,advanced:{resumable_uploads:true}});
assert.match(uploadLayer(onlineUpload).justification,/Start uploads while online/);
assert.doesNotMatch(uploadLayer(onlineUpload).justification,/local queue/);
const readOnlyUpload = recommend({...scenarios[5],advanced:{offline_access:"read_only",resumable_uploads:true}});
assert.match(uploadLayer(readOnlyUpload).justification,/offline stays disabled/);
const fieldSurvey = recommend(scenarios[5]);
assert.match(uploadLayer(fieldSurvey).justification,/durable local queue/);
assert.doesNotMatch(fieldSurvey.stack.supporting.find(item => /SQLite/.test(item.choice)).justification,/web shell/);
for (const scenario of [marketplace,scenarios[5]]) {
  const result = recommend(scenario);
  const plan = result.budget_fit_plan;
  assert.ok(plan.target_usd <= scenario.budget.monthly_infra_usd);
  assert.ok(plan.unallocated_usd > 0);
  assert.equal(plan.target_usd,Math.round(plan.allocations.reduce((sum,row) => sum + row.target_usd,0) * 100) / 100);
  assert.ok(result.warnings.some(note => note.code === "BUDGET_PRESSURE"));
}
assert.equal(noBudget.budget_fit_plan,undefined);
console.log("PASS upload-mode and budget-fit pilot regressions");

const expectBlocked = (scenario, code) => {
  const result = recommend(scenario);
  assert.equal(result.status,"infeasible");
  assert.equal(result.stack,null);
  assert.ok(result.warnings.some(note => note.code === code && note.severity === "critical"));
};
expectBlocked({...portfolio,budget:{monthly_infra_usd:1000},requirements:{...portfolio.requirements,availability:"99.99"}},"OPERATIONS_CAPACITY");
expectBlocked({...marketplace,timeline:{mvp_weeks:1},project:{...marketplace.project,platforms:["web","android","ios","desktop"]}},"TIMELINE_SCOPE_CONFLICT");
for (const auth of ["social","phone_otp","enterprise_sso"]) {
  expectBlocked({...portfolio,infrastructure:{deployment_model:"on_premise"},requirements:{...portfolio.requirements,auth}},
    auth === "enterprise_sso" ? "LOCAL_SSO_UNVERIFIED" : "LOCAL_EXTERNAL_AUTH");
}
const gdpr = recommend(scenarios[2]);
assert.match(gdpr.stack.hosting.choice,/eu-west-1/);
assert.ok(gdpr.assumptions.some(note => note.includes("synthetic data")));
assert.match(lending.stack.hosting.choice,/ap-south-1/);
const legacy = withInfra(marketplace,{existing_systems:["SQL Server 2008 R2","Legacy PHP monolith","PostgreSQL database"]});
assert.ok(legacy.warnings.some(note => note.code === "EXISTING_SYSTEM_END_OF_SUPPORT"));
assert.match(legacy.stack.database.choice,/PostgreSQL/);
assert.deepEqual(legacy.existing_systems_plan.map(item => item.action),["migrate","review","review"]);
assert.match(legacy.existing_systems_plan[1].guidance,/adapter/);
assert.match(legacy.existing_systems_plan[2].guidance,/system of record/);
const approvedSystems = ["Legacy PHP monolith","MySQL database"];
const reuseScenario = {...marketplace,infrastructure:{...marketplace.infrastructure,existing_systems:approvedSystems},
  advanced:{approved_existing_integrations:approvedSystems}};
expectBlocked(reuseScenario,"EXISTING_SUPPORT_UNVERIFIED");
const integrated = recommend({...reuseScenario,advanced:{...reuseScenario.advanced,
  existing_support_records:approvedSystems.map(system => system + " => test-support-review")}});
assert.ok(integrated.stack);
assert.deepEqual(integrated.existing_systems_plan.map(item => item.action),["integrate","integrate"]);
assert.match(integrated.existing_systems_plan[0].guidance,/authenticated API adapter/);
assert.match(integrated.existing_systems_plan[1].guidance,/read-only adapter/);
for (const retired of ["Azure Database for MySQL Single Server","Azure Database for PostgreSQL Single Server"]) {
  const retiredScenario = {...marketplace,infrastructure:{...marketplace.infrastructure,existing_systems:[retired]}};
  assert.equal(recommend(retiredScenario).existing_systems_plan[0].action,"migrate");
  expectBlocked({...retiredScenario,advanced:{approved_existing_integrations:[retired],
    existing_support_records:[retired + " => test-support-review"]}},"EXISTING_SYSTEM_END_OF_SUPPORT");
}
for (const scenario of [marketplace,scenarios[2],scenarios[3]]) {
  assert.equal(recommend(scenario).regulated_use,"evaluation");
  expectBlocked({...scenario,advanced:{regulated_use:"production"}},"REGULATED_PRODUCTION_UNVERIFIED");
}
const production = {...scenarios[2],advanced:{regulated_use:"production"}};
const productionReviews = recommend(production).verification_checks.map(check => check.review_key + " => test-deployment-review");
const reviewed = {...production,advanced:{...production.advanced,production_review_records:productionReviews}};
assert.equal(recommend(reviewed).regulated_use,"production");
assert.ok(recommend(reviewed).stack);
expectBlocked({...reviewed,infrastructure:{...reviewed.infrastructure,cloud_preference:"gcp"}},"REGULATED_PRODUCTION_UNVERIFIED");
const highTrafficStatic = recommend({...portfolio,scale:{...portfolio.scale,users_12_months:1000000}});
assert.equal(highTrafficStatic.architecture_style,"static");
assert.ok(highTrafficStatic.warnings.some(note => note.code === "STATIC_FREE_TIER_REVIEW"));
console.log("PASS Section 6 contradiction, regulatory, legacy, lifecycle, and restricted-deployment regressions");
