"use strict";

{
const schemaFields = typeof module === "undefined" ? fields : require("./schema");
const defaults = { scale:{traffic_pattern:"steady",workload:"balanced",peak_concurrent_users:0,data_volume_gb_12_months:0}, team:{has_devops:false}, infrastructure:{cloud_preference:"any",deployment_model:"managed_cloud",data_residency:"none",existing_systems:[]}, requirements:{realtime:false,offline_support:false,full_text_search:false,file_media_storage:false,payments:false,auth:"none",multi_tenant:false,ml_features:"none",seo_critical:false,availability:"99.9",p95_latency_ms:null}, compliance:[], priorities:{cost:3,time_to_market:3,scalability:3,performance:3,maintainability:3,security:3} };
const get=(o,path)=>path.split(".").reduce((x,k)=>x&&x[k],o);
const component=(choice,justification,driven_by,alternatives,tradeoffs=[])=>({choice,justification,driven_by,alternatives,tradeoffs});
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
function cloneAndDefault(input) {
  const x = isRecord(input) ? structuredClone(input) : {};
  const assumptions = [];
  for (const [section, values] of Object.entries(defaults)) {
    if (section === "compliance") {
      if (x.compliance === undefined) {
        x.compliance = [];
        assumptions.push("Applied default compliance=[].");
      }
      continue;
    }
    if (x[section] === undefined) x[section] = {};
    if (!isRecord(x[section])) continue;
    for (const [key, value] of Object.entries(values)) {
      if (x[section][key] !== undefined) continue;
      x[section][key] = value;
      assumptions.push(`Applied default ${section}.${key}=${JSON.stringify(value)}.`);
    }
  }
  return {x, assumptions};
}
function validate(input) {
  if (!isRecord(input)) return [{field:"$", message:"Expected a scenario object."}];
  const errors = [];
  const invalidSections = new Set();
  const report = (field, message) => errors.push({field, message});
  const sections = new Set(schemaFields.filter(field => field.path.includes(".")).map(field => field.path.split(".")[0]));
  for (const section of sections) {
    if (input[section] !== undefined && !isRecord(input[section])) {
      report(section, "Expected an object.");
      invalidSections.add(section);
    }
  }
  for (const {path, type, options, required} of schemaFields) {
    if (invalidSections.has(path.split(".")[0])) continue;
    const value = get(input, path);
    if (value === undefined) {
      if (required) report(path, "Required field.");
      continue;
    }
    if (type === "nullableInteger" && value === null) continue;
    if (type === "enum" && !options.includes(value)) report(path, `Choose one of: ${options.join(", ")}.`);
    if (type === "boolean" && typeof value !== "boolean") report(path, "Expected true or false.");
    if (type === "text" && typeof value !== "string") report(path, "Expected text.");
    if (type === "list" && (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim()))) report(path, "Expected an array of non-empty strings. An empty array is allowed.");
    if (type === "multi" && (!Array.isArray(value) || (required && !value.length) || value.some(item => !options.includes(item)) || new Set(value).size !== value.length)) report(path, `Choose distinct values from: ${options.join(", ")}.`);
    if (["number", "integer", "nullableInteger"].includes(type)) {
      const [min, max] = options;
      if (!Number.isFinite(value) || (type !== "number" && !Number.isSafeInteger(value)) || value < min || (max !== undefined && value > max)) {
        report(path, `Expected a ${type === "number" ? "number" : "whole number"} ${max === undefined ? "of at least " + min : "from " + min + " to " + max}.`);
      }
    }
  }
  for (const section of [...sections, ""]) {
    const record = section ? input[section] : input;
    if (!isRecord(record)) continue;
    for (const key of Object.keys(record)) {
      const path = section ? section + "." + key : key;
      if (key.includes(".") || (!sections.has(path) && !schemaFields.some(field => field.path === path))) report(path, "Unknown field. Use nested JSON objects for section fields.");
    }
  }
  return errors;
}
function warnings(x){const w=[]; const add=(code,severity,message,fields)=>w.push({code,severity,message,fields});
 if(x.requirements.availability==="99.99"&&!x.team.has_devops) {
   const soloBeginner = x.team.size === 1 && x.team.experience === "beginner";
   add("OPERATIONS_CAPACITY",soloBeginner ? "critical" : "warning",soloBeginner
     ? "A solo beginner without DevOps coverage cannot substantiate the 99.99% target. Add operational coverage or lower the target."
     : "99.99% availability needs operational coverage that the team has not declared.",["requirements.availability","team.has_devops","team.size","team.experience"]);
 }
 if(x.timeline.mvp_weeks<=4&&x.project.platforms.length>=3)add("TIMELINE_SCOPE_CONFLICT","critical","The engine cannot substantiate this MVP timeline across all requested platforms. Extend the timeline or explicitly defer platforms.",["timeline.mvp_weeks","project.platforms"]);
 if(x.infrastructure.deployment_model==="air_gapped"&&x.requirements.payments)add("AIR_GAP_PAYMENTS","critical","An air-gapped deployment cannot call a payment provider directly.",["infrastructure.deployment_model","requirements.payments"]);
 if(x.requirements.p95_latency_ms&&x.requirements.p95_latency_ms<=100&&!x.team.has_devops)add("LATENCY_OPERATIONS_RISK","warning","A 100 ms p95 target needs careful regional placement and performance operations.",["requirements.p95_latency_ms","team.has_devops"]);
 if(x.project.platforms.includes("api_only") && x.project.platforms.length > 1)
   add("PLATFORM_CONFLICT","critical","API-only cannot be combined with a client platform.",["project.platforms"]);
 const local = ["on_premise","air_gapped"].includes(x.infrastructure.deployment_model);
 const cloud = x.infrastructure.cloud_preference;
 if((local && ["aws","gcp","azure"].includes(cloud)) || (!local && cloud === "none"))
   add("DEPLOYMENT_CONFLICT","critical","The cloud preference conflicts with the deployment model.",["infrastructure.cloud_preference","infrastructure.deployment_model"]);
 if(x.compliance.includes("rbi_localisation") && !["none","india"].includes(x.infrastructure.data_residency))
   add("RESIDENCY_CONFLICT","critical","The selected residency conflicts with this scenario's India-localisation requirement.",["compliance","infrastructure.data_residency"]);
 const advanced = x.advanced || {};
 if(advanced.peak_requests_per_second >= 500)
   add("LOAD_TEST","warning","Load-test peak throughput with representative payloads and concurrency before sizing production.",["advanced.peak_requests_per_second"]);
 if(advanced.rpo_minutes !== undefined)
   add("RECOVERY_POINT","info",advanced.rpo_minutes === 0 ? "Validate synchronous durability and failover for the zero-data-loss target." : `Test that backup and replication keep data loss within ${advanced.rpo_minutes} minutes.`,["advanced.rpo_minutes"]);
 if(advanced.rto_minutes !== undefined)
   add("RECOVERY_TIME","info",`Time a full recovery drill against the ${advanced.rto_minutes}-minute target, including dependent services.`,["advanced.rto_minutes"]);
 if(advanced.data_sensitivity === "sensitive")
   add("SENSITIVE_DATA","warning","Require least-privilege access, audit logs, encrypted backups, and retention rules. Include offline copies where applicable.",["advanced.data_sensitivity"]);
 if(advanced.search_documents !== undefined && !x.requirements.full_text_search)
   add("SEARCH_SCOPE","info","Search corpus size has no effect until full-text search is enabled.",["advanced.search_documents","requirements.full_text_search"]);
 return w; }
const providers = {
  aws: {host:"Amazon ECS on Fargate", db:"Amazon RDS for PostgreSQL", storage:"Amazon S3", vm:"Amazon EC2", regions:{india:"ap-south-1",eu:"eu-west-1",us:"us-east-1"}, sources:["https://aws.amazon.com/fargate/pricing/","https://aws.amazon.com/rds/postgresql/pricing/","https://aws.amazon.com/s3/pricing/"]},
  azure: {host:"Azure App Service", db:"Azure Database for PostgreSQL", storage:"Azure Blob Storage", vm:"Azure Virtual Machines", regions:{india:"Central India",eu:"West Europe",us:"East US"}, sources:["https://azure.microsoft.com/pricing/details/app-service/linux/","https://azure.microsoft.com/pricing/details/postgresql/flexible-server/","https://azure.microsoft.com/pricing/details/storage/blobs/"]},
  gcp: {host:"Google Cloud Run", db:"Cloud SQL for PostgreSQL", storage:"Google Cloud Storage", vm:"Google Compute Engine", regions:{india:"asia-south1",eu:"europe-west1",us:"us-central1"}, sources:["https://cloud.google.com/run/pricing","https://cloud.google.com/sql/pricing","https://cloud.google.com/storage/pricing"]}
};

const lifecycleRules = [
  [/\bazure\s+database\s+for\s+mysql[\s-]+single[\s-]+server\b/i, "https://learn.microsoft.com/en-us/lifecycle/products/azure-database-for-mysql-single-server", "is retired"],
  [/\bazure\s+database\s+for\s+postgresql[\s-]+single[\s-]+server\b/i, "https://learn.microsoft.com/en-us/azure/backup/backup-azure-database-postgresql", "is retired"],
  [/\b(?:ms\s*sql|mssql|sql[\s-]*server)\s*(?:2008(?:\s*r2)?|2012)\b/i, "https://learn.microsoft.com/en-us/sql/sql-server/end-of-support/sql-server-end-of-support-overview"],
  [/\bwindows\s+server\s+(?:2008(?:\s*r2)?|2012(?:\s*r2)?)\b/i, "https://learn.microsoft.com/lifecycle/announcements/sql-server-2012-windows-server-2012-r2-end-of-support"]
];

function reviewRecords(entries = []) {
  const records = new Map();
  for (const entry of entries) {
    const separator = entry.indexOf("=>");
    if (separator < 0) continue;
    const key = entry.slice(0,separator).trim();
    const reference = entry.slice(separator + 2).trim();
    if (key && reference) records.set(key,reference);
  }
  return records;
}

function recommend(input) {
  const validation_errors = validate(input);
  const {x, assumptions} = cloneAndDefault(input);
  const result = {
    scenario_id: x.scenario_id || null, engine_version: "1.0.0", status: "invalid_input",
    summary: "Correct the listed fields and run again.", architecture_style: "other", stack: null,
    estimated_monthly_cost_usd: {min:0,max:0,assumptions:[]}, warnings: [], assumptions, validation_errors
  };
  if (validation_errors.length) return result;
  const {project:p, requirements:r, infrastructure:i, scale:s, team:t, priorities:q} = x;
  const advanced = x.advanced || {};
  const approvedIntegrations = new Set(advanced.approved_existing_integrations || []);
  const existingSupport = reviewRecords(advanced.existing_support_records);
  const w = result.warnings = warnings(x);
  const warn = (code, severity, message, fields) => w.push({code,severity,message,fields});
  const local = ["air_gapped","on_premise"].includes(i.deployment_model);
  const managed = i.deployment_model === "managed_cloud";
  const microsoft = i.existing_systems.some(value => /entra|azure ad/i.test(value));
  const gdprDefault = !local && i.data_residency === "none" && x.compliance.includes("gdpr") && !x.compliance.includes("rbi_localisation");
  const residency = x.compliance.includes("rbi_localisation") ? "india" : gdprDefault ? "eu" : i.data_residency;
  if (gdprDefault) assumptions.push("Selected EU hosting for this GDPR scenario because no residency was specified. Verify all processor and transfer paths before using real data.");
  if (x.compliance.includes("rbi_localisation") && i.data_residency === "none")
    assumptions.push("Applied India residency because RBI localisation was requested.");
  const providerKey = i.cloud_preference === "any" ? (microsoft ? "azure" : "aws") : i.cloud_preference;
  const provider = providers[providerKey];
  const region = provider?.regions[residency === "none" ? "us" : residency];
  const editing = advanced.realtime_interaction === "concurrent_editing"
    || (advanced.realtime_interaction === undefined && p.type === "realtime_collab");
  const ledger = advanced.ledger_model === "double_entry"
    || (advanced.ledger_model === undefined && p.type === "fintech" && /double[- ]entry|\bledger\b/i.test(p.description || ""));
  const queuedWrites = r.offline_support && advanced.offline_access !== "read_only";
  const resumeUploads = advanced.resumable_uploads ?? (queuedWrites && r.file_media_storage);
  if (editing && !r.realtime) warn("REALTIME_REQUIRED","critical","Concurrent live editing requires realtime support.",["advanced.realtime_interaction","requirements.realtime","project.type"]);
  if (advanced.offline_access && !r.offline_support) warn("OFFLINE_MODE_CONFLICT","critical","Enable offline support to select an offline access mode.",["advanced.offline_access","requirements.offline_support"]);
  if (resumeUploads && !r.file_media_storage) warn("UPLOAD_STORAGE_REQUIRED","critical","Resumable media uploads require file storage.",["advanced.resumable_uploads","requirements.file_media_storage"]);
  if (editing && advanced.realtime_interaction === undefined) assumptions.push("Inferred concurrent editing from the realtime collaboration project type.");
  if (ledger && advanced.ledger_model === undefined) assumptions.push("Inferred double-entry ledger from the fintech project description.");
  if (queuedWrites && advanced.offline_access === undefined) assumptions.push("Assumed offline users need to queue writes.");
  if (resumeUploads && advanced.resumable_uploads === undefined) assumptions.push("Assumed offline media uploads must resume after interruptions.");
  const staticSite = p.type === "content_site" && p.platforms.length === 1 && p.platforms.includes("web")
    && !ledger && !r.realtime && !r.payments && !r.multi_tenant && !r.file_media_storage && !r.offline_support
    && r.auth === "none" && r.ml_features === "none";
  const redundant = Number(r.availability) >= 99.95 || q.security === 5 || (advanced.rto_minutes ?? Infinity) <= 30;
  const freeStatic = staticSite && managed && i.cloud_preference === "any" && residency === "none" && !x.compliance.length && !redundant;
  if (s.users_12_months >= 100000 && x.budget.monthly_infra_usd === 0) {
    if (freeStatic) {
      warn("STATIC_FREE_TIER_REVIEW","warning","Validate traffic and free-tier limits before launch. If the site exceeds them, reduce scope or budget for hosting.",["scale.users_12_months","budget.monthly_infra_usd"]);
      assumptions.push("The zero-budget static recommendation assumes the site fits the hosting free tier at the expected traffic.");
    } else {
      warn("SCALE_BUDGET_CONFLICT","critical","Expected scale is high but the infrastructure budget is zero.",["scale.users_12_months","budget.monthly_infra_usd"]);
    }
  }
  if (!local && !freeStatic && residency === "none" && region)
    assumptions.push(`Used ${region} as the default region because no residency was specified.`);
  if (!local && !freeStatic && !region)
    warn("REGION_UNVERIFIED","critical","Provide a supported residency region before choosing cloud services.",["infrastructure.data_residency","infrastructure.cloud_preference"]);
  if (local && residency !== "none")
    warn("LOCAL_SITE_UNVERIFIED","critical","The physical locations of hosts and backups are unspecified. Verify them against the required residency.",["infrastructure.data_residency","infrastructure.deployment_model"]);
  if (local && ["phone_otp","social"].includes(r.auth))
    warn(i.deployment_model === "air_gapped" ? "AIR_GAP_AUTH" : "LOCAL_EXTERNAL_AUTH","critical","The requested SMS or social identity flow depends on a service outside the deployment boundary.",["requirements.auth","infrastructure.deployment_model"]);
  if (local && r.auth === "enterprise_sso")
    warn(i.deployment_model === "air_gapped" ? "AIR_GAP_SSO_UNVERIFIED" : "LOCAL_SSO_UNVERIFIED","critical",microsoft
      ? "Microsoft Entra ID requires a reachable external identity service."
      : "Enterprise SSO needs a verified identity provider inside the local deployment boundary. The scenario does not establish one.",
    ["requirements.auth","infrastructure.deployment_model","infrastructure.existing_systems"]);
  if (r.payments && (residency === "other" || local))
    warn("PAYMENT_BOUNDARY","critical","No verified payment integration is available for this deployment boundary.",["requirements.payments","infrastructure.deployment_model","infrastructure.data_residency"]);
  if (r.offline_support && p.platforms.includes("api_only"))
    warn("OFFLINE_CLIENT_MISSING","critical","Offline storage and synchronization need a client platform.",["requirements.offline_support","project.platforms"]);
  const integrationFields = ["advanced.approved_existing_integrations","infrastructure.existing_systems"];
  for (const system of approvedIntegrations) {
    if (!i.existing_systems.includes(system))
      warn("EXISTING_SYSTEM_NOT_DECLARED","critical",`Add "${system}" to existing systems before selecting it for integration.`,integrationFields);
  }
  if (i.existing_systems.length) {
    result.existing_systems_plan = [...new Set(i.existing_systems)].map(system => {
      const lifecycle = lifecycleRules.find(([pattern]) => pattern.test(system));
      const approved = approvedIntegrations.has(system);
      if (lifecycle) {
        warn("EXISTING_SYSTEM_END_OF_SUPPORT",approved ? "critical" : "warning",`${system} ${lifecycle[2] || "is past standard extended support"}. Migrate to a supported replacement before integration.`,["infrastructure.existing_systems"]);
        return {system,action:"migrate",guidance:"Keep the old system isolated if it is still running. Recover from an approved export or backup, validate counts and business invariants, and rehearse rollback before cutover.",source:lifecycle[1]};
      }
      if (approved && !existingSupport.has(system)) {
        warn("EXISTING_SUPPORT_UNVERIFIED","critical",`Provide a support review reference for the deployed version of "${system}" before selecting it for integration.`,[...integrationFields,"advanced.existing_support_records"]);
        return {system,action:"review",guidance:"Confirm the deployed version and current vendor support before reuse."};
      }
      if (/entra|azure ad|identity|sso|\b(?:ldap|keycloak|okta|saml|oidc)\b/i.test(system))
        return {system,action:r.auth === "enterprise_sso" ? "integrate" : "review",guidance:"If used for enterprise sign-in, verify that the provider is allowed inside the deployment boundary, then broker it through Keycloak over OIDC or SAML. Test role mapping and deprovisioning."};
      if (approved && (staticSite || local)) {
        warn("EXISTING_INTEGRATION_BOUNDARY","critical",`The engine cannot establish a runtime integration for "${system}" within the selected architecture or local network boundary.`,integrationFields);
        return {system,action:"review",guidance:"Confirm an approved data exchange path inside the deployment boundary before integrating."};
      }
      if (approved) {
        const database = /\b(?:database|postgres(?:ql)?|mysql|mariadb|oracle|sql[\s-]*server|mssql|sqlite|mongodb|db2)\b/i.test(system);
        assumptions.push(`The user approved "${system}" for reuse. The estimate excludes its operating costs and any dedicated connectivity or adapter infrastructure.`);
        return {system,action:"integrate",support_review_reference:existingSupport.get(system),guidance:database
          ? "Keep the existing database as the system of record for its current data. Connect through a read-only adapter with scoped credentials. Store new application records separately."
          : "Keep the legacy application running for its existing workflows. Connect through an authenticated API adapter with explicit timeouts, audit logging and contract tests."};
      }
      if (/\b(?:database|postgres(?:ql)?|mysql|mariadb|oracle|sql[\s-]*server|mssql|sqlite|mongodb|db2)\b/i.test(system))
        return {system,action:"review",guidance:"Check version, ownership, schema and residency. If approved, keep it as the system of record behind a read-only adapter initially. Reconcile exported records before any migration or cutover."};
      return {system,action:"review",guidance:"Inventory supported interfaces, ownership and deployment constraints. Keep the existing system behind an approved API or adapter where possible, and migrate one workflow at a time if reuse is unsafe."};
    });
  }
  const finishInfeasible = () => Object.assign(result, {status:"infeasible",summary:"No verified stack fits the stated constraints. Review the critical warnings."});
  if (w.some(note => note.severity === "critical")) return finishInfeasible();

  const layers = [];
  const pick = (choice, justification, driven, alternative, whyNot, tradeoff, source) =>
    ({...component(choice,justification,driven,[{choice:alternative,why_not:whyNot}],[tradeoff]), ...(source ? {sources:[source]} : {})});
  const support = (layer, ...args) => layers.push({layer,...pick(...args)});
  const clients = [];
  if (p.platforms.includes("web")) clients.push(staticSite ? "Astro" : r.seo_critical ? "Next.js" : "React");
  if (p.platforms.some(platform => ["android","ios"].includes(platform))) clients.push("React Native");
  if (p.platforms.includes("desktop")) clients.push("Electron");
  const frontend = pick(clients.join(" + ") || "None",
    clients.length ? `Covers the requested ${p.platforms.join(", ")} clients.${queuedWrites ? " Persist changes locally and synchronize queued writes after reconnecting." : r.offline_support ? " Cache the last synchronized view for offline reads." : ""}` : "API consumers provide their own client.",
    ["project.platforms","requirements.seo_critical","requirements.offline_support"], clients.length ? "Separate native client per platform" : "React",
    clients.length ? "Separate clients increase parallel implementation and testing work." : "A web interface is outside the requested platform scope.",
    r.offline_support ? "Test queue retries, conflicts and low-memory devices." : "Validate accessibility and platform-specific behavior separately.",
    r.offline_support ? "https://developer.android.com/topic/architecture/data-layer/offline-first" : undefined);

  const languages = new Set(t.languages.map(value => value.toLowerCase()));
  const realtimeLoad = r.realtime ? Math.min(3, s.peak_concurrent_users / 2000) : 0;
  const candidates = [
    {name:"FastAPI", languages:["python"], speed:3, throughput:1, source:"https://fastapi.tiangolo.com/"},
    {name:"Node.js (Fastify)", languages:["typescript","javascript"], speed:3, throughput:2, source:"https://fastify.dev/docs/latest/"},
    {name:"ASP.NET Core", languages:["csharp","c#","dotnet"], speed:2, throughput:3, source:"https://learn.microsoft.com/aspnet/core/"},
    {name:"Spring Boot", languages:["java","kotlin"], speed:1, throughput:3, source:"https://spring.io/projects/spring-boot"},
    {name:"Go (net/http)", languages:["go"], speed:2, throughput:3, source:"https://pkg.go.dev/net/http"}
  ].map(candidate => {
    const familiar = candidate.languages.some(language => languages.has(language));
    const delivery = q.time_to_market + (x.timeline.mvp_weeks <= 4 ? 2 : 0);
    const skillWeight = q.maintainability + (t.experience === "beginner" || t.size <= 2 ? 4 : 2);
    const performance = (q.performance + q.scalability) * realtimeLoad / 4;
    const microsoftFit = candidate.name === "ASP.NET Core" && familiar && microsoft && r.auth === "enterprise_sso";
    const parts = {
      language_fit: familiar ? skillWeight * 3 : 0,
      delivery: candidate.speed * delivery,
      realtime: candidate.throughput * performance,
      identity_ecosystem: microsoftFit ? 6 : 0
    };
    return {...candidate,familiar,parts,score:Object.values(parts).reduce((sum, points) => sum + points, 0)};
  }).sort((a,b) => b.score - a.score);
  const [best, second] = candidates;
  const describeScore = candidate => Object.entries(candidate.parts).filter(([, points]) => points > 0)
    .map(([factor, points]) => `${factor.replaceAll("_"," ")} ${points.toFixed(1)}`).join(", ");
  const backend = staticSite
    ? pick("None","Pre-rendered pages do not require a dynamic application API.",["project.type","requirements.auth","requirements.realtime"],best.name,"Adds an API runtime for a static workload.","Dynamic features require an API when introduced.")
    : pick(best.name,`Scored ${best.score.toFixed(1)} (${describeScore(best)}). ${best.familiar ? `Matches declared skills: ${best.languages.filter(language => languages.has(language)).join(", ")}.` : "Allow time to learn the framework."}`,
      ["team.languages","team.size","team.experience","timeline.mvp_weeks","requirements.realtime","scale.peak_concurrent_users","priorities.time_to_market","priorities.maintainability","priorities.performance","priorities.scalability",...(best.parts.identity_ecosystem ? ["requirements.auth","infrastructure.existing_systems"] : [])],
      second.name,`Scored ${second.score.toFixed(1)} (${describeScore(second)}). ${best.score === second.score ? "Catalog order breaks the tie." : "The winning stack has the higher weighted score."}`,"Ratings are planning heuristics. Benchmark application throughput with production-like payloads.",best.source);
  const platform = local ? (staticSite ? "Nginx on approved infrastructure" : "Docker Compose and Nginx on approved infrastructure") : freeStatic ? "Cloudflare Pages" : managed ? `${provider.host} (${region})` : `${provider.vm} (${region})`;
  const hosting = pick(platform,
    local ? "Serve locally using pre-staged packages and artifacts." : freeStatic ? "Publish static assets without operating an application server." : `Run the workload in ${region} using the selected deployment model.`,
    ["infrastructure.cloud_preference","infrastructure.deployment_model","infrastructure.data_residency"],local ? "Managed cloud" : "Self-hosted containers on separate infrastructure",
    local ? "Requires services outside the local boundary." : "Adds a separate operations and infrastructure footprint.",managed ? "Check regional quotas, service coverage and availability targets." : "The team owns patching, backups and recovery.",
    local ? "https://nginx.org/en/docs/" : freeStatic ? "https://developers.cloudflare.com/pages/platform/limits/" : provider.sources[0]);
  const database = staticSite ? pick("None","Content is built into published assets.",["project.type"],"PostgreSQL","No mutable application records are required.","Editors must rebuild to publish.")
    : pick(managed ? `${provider.db} (${region})` : "Self-hosted PostgreSQL",
      `Relational storage provides transactions and constraints for a ${s.workload.replaceAll("_"," ")} workload.`,
      ["scale.workload","infrastructure.deployment_model","infrastructure.data_residency"],"Document database","Would move relational consistency checks into application code.",
      "Index and load-test representative queries and rehearse restores.",managed ? provider.sources[1] : "https://www.postgresql.org/docs/current/");

  if (r.auth !== "none") support("auth","Self-hosted Keycloak",
    `Keep identity data on the chosen infrastructure.${r.auth === "phone_otp" ? " Add an SMS adapter and verify carrier terms." : r.auth === "enterprise_sso" ? " Broker the organization’s existing IdP over OIDC or SAML." : r.auth === "social" ? " Configure the requested external identity provider." : " Configure password recovery and MFA."}`,
    ["requirements.auth","infrastructure.deployment_model"],"Hosted authentication","Adds an external processor and separate data-location review.","Operate and patch the identity server.", "https://www.keycloak.org/documentation");
  if (r.file_media_storage) support("storage",managed ? `${provider.storage} (${region})` : "Filesystem volume on approved hosts",
    "Keep uploads and backups inside the chosen deployment boundary.",["requirements.file_media_storage","infrastructure.data_residency","infrastructure.cloud_preference"],
    "Database blobs","Large objects increase database backup and restore load.","Set access controls, retention and backup policies.",managed ? provider.sources[2] : undefined);
  if (r.realtime) support("realtime","Application WebSocket gateway","Host the connection and fan-out path with the application. Use a continuously available service and verify connection duration limits.",["requirements.realtime","scale.peak_concurrent_users"],
    "HTTP polling","Repeated requests add delay and traffic for live sessions.","Test reconnect, fan-out and concurrency. Collaborative editing also needs conflict resolution.", "https://www.rfc-editor.org/rfc/rfc6455");
  if (editing) support("other","Yjs with a self-hosted sync service",
    "Use a shared CRDT document per board to merge concurrent edits. Authorize board subscriptions, persist updates and compact snapshots in PostgreSQL. Send cursor presence separately and keep it ephemeral.",
    ["advanced.realtime_interaction","project.type","requirements.realtime"],
    "WebSockets with last-write-wins","A transport alone cannot merge concurrent changes without discarding edits.",
    "Budget for a JavaScript sync worker alongside a non-JavaScript API. Test reconnect, document growth, and contention on a single busy board.","https://docs.yjs.dev/");
  if (ledger) support("other","PostgreSQL double-entry journal",
    "Post balanced debit and credit entries atomically with a unique idempotency key. Reverse entries instead of editing them. Record provider event IDs and reconcile them against settlements.",
    ["advanced.ledger_model","project.type","project.description","requirements.payments"],
    "Mutable balance column","A mutable balance alone cannot explain or replay the movement of funds.",
    "Test concurrent posting, duplicate callbacks, reversals, and reconciliation breaks.","https://www.postgresql.org/docs/current/tutorial-transactions.html");
  if (r.offline_support) {
    const storage = [
      p.platforms.includes("web") && "Service Worker + IndexedDB",
      p.platforms.some(value => ["android","ios","desktop"].includes(value)) && "local SQLite"
    ].filter(Boolean).join(" / ");
    support("other",storage,`Use a local source of truth. ${p.platforms.includes("web") ? "Cache the web shell separately from user data. " : ""}${queuedWrites ? "Queue each mutation durably with an idempotency key, retry on reconnect, and use record versions to detect conflicts for user review." : "Expose a stale-data indicator and disable writes while offline."}`,
      ["requirements.offline_support","project.platforms","advanced.offline_access"],
      "Network-only data fetching","It fails during outages and cannot provide the requested offline access.",
      "Scope cached data by account, clear it on sign-out, and test disk pressure and reconnect behavior.",
      p.platforms.includes("web") ? "https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API" : "https://developer.android.com/topic/architecture/data-layer/offline-first");
  }
  if (resumeUploads) support("storage","Self-hosted tus upload endpoint",
    queuedWrites
      ? "Keep capture metadata in the durable local queue and upload media separately. Persist upload identifiers, resume from the server-confirmed offset, and finalize only after integrity checks."
      : `Start uploads while online and resume from the server-confirmed offset after a connection loss. ${r.offline_support ? "Creating or modifying records while offline stays disabled. " : ""}Persist upload identifiers and finalize only after integrity checks.`,
    ["advanced.resumable_uploads","requirements.offline_support","requirements.file_media_storage"],
    "Single-request uploads","An interruption can force a full retransmission.",
    "Expire abandoned uploads, enforce per-user limits, and test on slow connections and low-memory devices.","https://tus.io/protocols/resumable-upload");
  if (r.full_text_search) {
    const localIndex = !staticSite && (advanced.portability === "prefer_portable" || (advanced.search_documents ?? 0) <= 100000 || q.cost >= 4);
    support("search",staticSite ? "Pagefind" : localIndex ? "PostgreSQL full-text search" : "Self-hosted Meilisearch",
      staticSite ? "Build an index alongside published pages." : localIndex ? "Reuse the transactional database and avoid operating a second search service." : "Isolate indexing and text queries from transactional traffic.",
      ["requirements.full_text_search","project.type","advanced.search_documents","advanced.portability","priorities.cost"],
      localIndex ? "Self-hosted Meilisearch" : "PostgreSQL full-text search",localIndex ? "Needs a separate index and synchronization." : "Adds database workload or requires a database the static site does not use.",
      "Benchmark ranking and indexing with representative content.", staticSite ? "https://pagefind.app/docs/" : localIndex ? "https://www.postgresql.org/docs/current/textsearch.html" : "https://www.meilisearch.com/docs");
  }
  if (r.payments) support("payments",residency === "india" ? "Razorpay hosted checkout" : "Stripe Checkout",
    "Use hosted checkout and keep card entry outside the application.",["requirements.payments","infrastructure.data_residency","compliance"],
    "Direct card collection","Expands sensitive-data handling and audit scope.","Confirm processor eligibility, transfer terms and webhook verification.");
  if (r.ml_features !== "none") {
    const ml = {training:"PyTorch training job",inference_api:"ONNX Runtime inference service",llm_rag:"llama.cpp + pgvector"}[r.ml_features];
    support("ml",ml,"Run model processing inside the deployment boundary.",["requirements.ml_features","infrastructure.deployment_model"],
      "External ML API","Adds an external data path and may not support the requested workflow.","Model and accelerator sizing need a separate benchmark and budget.");
  }
  if (!staticSite && (s.workload === "read_heavy" || r.realtime) && (s.traffic_pattern !== "steady" || s.peak_concurrent_users >= 1000) && q.cost < 5)
    support("cache","Self-hosted Valkey","Cache hot reads or use ephemeral pub/sub for realtime fan-out.",["scale.workload","scale.traffic_pattern","scale.peak_concurrent_users","requirements.realtime","priorities.cost"],
      "No separate cache","Leaves hot reads or fan-out on application and database resources.","Set eviction policies and handle stale entries.", "https://valkey.io/topics/");
  support("ci_cd","Local build and release scripts","Keep builds portable and publish only approved artifacts.",["infrastructure.deployment_model"],"Hosted CI","Requires an external control plane.","Maintain build reproducibility and dependency provenance.");
  if (!staticSite) support("observability","OpenTelemetry with local collector","Collect telemetry without requiring a third-party endpoint.",["requirements.availability","infrastructure.deployment_model"],
    "Application logs only","Logs alone lack cross-request tracing.","Redact sensitive fields and bound retention.", "https://opentelemetry.io/docs/collector/");

  const verification = [];
  const productionReviews = reviewRecords(advanced.production_review_records);
  const verify = (area, affected, requirement, source) => {
    const review_key = [area,hosting.choice,residency,...affected].map(value => value.replaceAll("%","%25").replaceAll(",","%2C").replaceAll("=>","%3D%3E").replaceAll("|","%7C")).join(" | ");
    const reference = advanced.regulated_use === "production" ? productionReviews.get(review_key) : undefined;
    verification.push({area,status:reference ? "review_attested" : "unverified",blocking_before_production:!reference,
      affected,requirement,review_key,...(reference ? {review_reference:reference} : {}),...(source ? {source} : {})});
  };
  const dataServices = [hosting.choice,database.choice,...layers.filter(item => item.layer !== "ci_cd" && item.layer !== "payments").map(item => item.choice)].filter(choice => choice !== "None");
  for (const item of result.existing_systems_plan || []) {
    if (item.action === "integrate") dataServices.push(item.system);
  }
  const hipaa = x.compliance.includes("hipaa");
  if (hipaa) verify("HIPAA",dataServices,"Map all ePHI paths including logs and backups, confirm service eligibility, and establish any required business associate agreements.","https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html");
  if (x.compliance.includes("pci_dss")) verify("PCI DSS",[hosting.choice,...layers.filter(item => item.layer === "payments").map(item => item.choice)],"Confirm processor compliance for the services used, document responsibilities in writing, and confirm the assessment with the acquirer. Keep account data out of application requests, logs and backups.","https://www.pcisecuritystandards.org/faqs/1092/");
  for (const rule of x.compliance.filter(value => !["hipaa","pci_dss"].includes(value))) {
    const requirement = {
      rbi_localisation:"Verify the scope of the localisation obligation and document where primary records, replicas, backups and processor data are kept.",
      dpdp:"Document personal data and processors. Review applicable notice, retention, deletion and incident procedures.",
      gdpr:"Map processors, retention and deletion paths. Verify applicable processor agreements and international transfer safeguards.",
      soc2:"Define the system boundary and gather control evidence for access, changes, incidents and recovery.",
      iso27001:"Include the workload in the information security management scope and document applicable controls and owners."
    }[rule];
    verify(rule.toUpperCase().replaceAll("_"," "),dataServices,requirement);
  }
  if (residency !== "none") verify("Data residency",dataServices,`Verify that primary data, backups, logs and operational exports meet the ${residency} boundary. A compute region alone does not establish that.`);
  if (r.auth === "phone_otp") verify("SMS identity",["Keycloak","SMS gateway"],"Select a carrier and adapter. Verify number and message processing locations, retry limits, and unit cost.");
  if (["enterprise_sso","social"].includes(r.auth)) verify("External identity",["Keycloak",...i.existing_systems.filter(value => /entra|azure ad|identity|sso/i.test(value))],"Confirm that the upstream IdP is reachable, supports the chosen protocol, and meets retention and transfer requirements.");
  if (r.payments) verify("Payment processing",layers.filter(item => item.layer === "payments").map(item => item.choice),"Confirm merchant eligibility, payment method coverage, processing locations and webhook controls.");
  if (verification.length) {
    result.verification_checks = verification;
    const pending = verification.some(check => check.blocking_before_production);
    if (x.compliance.length || (advanced.regulated_use === "production" && residency !== "none")) {
      if (advanced.regulated_use === "production" || hipaa) {
        if (pending) {
          const code = hipaa && verification.some(check => check.area === "HIPAA" && check.blocking_before_production)
            ? "HIPAA_EVIDENCE_REQUIRED" : "REGULATED_PRODUCTION_UNVERIFIED";
          warn(code,"critical","Record the approved deployment review for each outstanding check before using real data or live payments.",["advanced.regulated_use","advanced.production_review_records","compliance","infrastructure"]);
          return finishInfeasible();
        }
        result.regulated_use = "production";
        assumptions.push("Production planning relies on the review references supplied by the user for this deployment. The engine does not independently authenticate those records or certify compliance.");
      } else {
        assumptions.push("Regulated workloads are limited to evaluation with synthetic data and sandbox payments until service eligibility, processor agreements, and data paths are verified. Production approval is pending.");
        result.regulated_use = "evaluation";
      }
    }
    if (pending)
      warn("PRODUCTION_VERIFICATION_REQUIRED","warning","This stack is conditional. Resolve the listed data and integration checks before production.",["compliance","infrastructure.data_residency","requirements.auth","requirements.payments"]);
  }

  const cost = [];
  const addCost = (layer,min,max,basis) => cost.push({layer,min,max,basis});
  const concurrency = input.scale?.peak_concurrent_users;
  const peak = advanced.peak_requests_per_second ?? (concurrency === undefined ? null : Math.ceil(concurrency / 20));
  if (!staticSite && peak === null) {
    warn("TRAFFIC_UNSPECIFIED","warning","Capacity and cost are provisional. Enter peak requests per second or peak concurrent users to size the rollout.",["advanced.peak_requests_per_second","scale.peak_concurrent_users"]);
  }
  const minimumReplicas = redundant ? 2 : 1;
  const provisionedReplicas = peak === null ? minimumReplicas : Math.max(minimumReplicas, Math.ceil(peak / 100));
  const plannedReplicas = redundant ? Math.max(minimumReplicas, provisionedReplicas + 1) : provisionedReplicas;
  const servingReplicas = staticSite ? minimumReplicas : plannedReplicas;
  const databaseGb = Math.max(20,Math.ceil(s.data_volume_gb_12_months * (r.file_media_storage ? .2 : 1) * 1.3));
  if (!staticSite) result.capacity_plan = {
    peak_requests_per_second: peak,
    request_rate_basis: peak === null
      ? "Peak traffic is unknown. Replica count is a provisional baseline until traffic is supplied."
      : advanced.peak_requests_per_second === undefined
        ? `Estimated from ${concurrency} concurrent users at one request per user every 20 seconds.`
        : "Supplied peak HTTP request rate.",
    app_replicas: plannedReplicas,
    per_replica_target_rps: 100,
    database_storage_gb: databaseGb,
    database_storage_basis: `20 GB floor, 30% headroom, and ${r.file_media_storage ? "20% of stored data allocated to database records" : "all supplied volume allocated to database records"}.`,
    failover: redundant ? (managed ? "Distribute application replicas across failure zones and configure a managed database standby in the selected region." : "Separate application replicas and a database standby across independently powered hosts.") : "Start with a primary database and rehearse restore from a backup.",
    verification: "Benchmark the 100 RPS planning target with actual request mix, connection pooling, and failure of one replica. Validate database IOPS, retention, and restore times."
  };
  if (freeStatic) addCost("Hosting",0,0,"Free-tier static hosting, conditional on fitting its limits and no paid add-ons.");
  else addCost("Hosting",local ? 0 : servingReplicas * 25,servingReplicas * (local ? 50 : 100),
    local ? "Existing hardware assumed. Excludes hardware acquisition and operations labor." : `${servingReplicas} serving replicas at a planning allowance of USD 25–100 each per month.`);
  if (staticSite && redundant) {
    support("other","Redundant static serving",
      "Serve identical build artifacts from two independent failure zones or hosts behind health-checked routing. Test an origin failure before claiming the availability target.",
      ["requirements.availability","advanced.rto_minutes","priorities.security"],"Single static origin","A single origin can fail without a healthy failover target.",
      "Verify provider zone support and routing failure modes. The configuration does not guarantee the requested SLO.");
    addCost("Traffic routing",local ? 0 : 15,50,"Planning allowance for health-checked routing.");
  }
  if (editing) addCost("Collaboration sync",0,75,"Reserve for the sync process, update retention, and snapshots.");
  if (resumeUploads) addCost("Resumable uploads",0,25,"Reserve for temporary upload storage and the upload process.");
  if (!staticSite) {
    const storageReserve = Math.ceil(databaseGb * .2);
    addCost("Database",managed ? (redundant ? 85 : 25) + storageReserve : 0,
      (managed ? redundant ? 280 : 90 : 35) + storageReserve,
      `${managed ? redundant ? "Primary plus standby" : "Managed primary" : "Self-operated database"}, with ${databaseGb} GB planned and a USD ${storageReserve} storage reserve.`);
  }
  if (r.file_media_storage) addCost("Storage",0,Math.max(5,Math.ceil(s.data_volume_gb_12_months * .1)),"Storage, backup and moderate egress reserve based on supplied volume.");
  if (r.auth !== "none") addCost("Identity",0,r.auth === "phone_otp" ? 45 : 25,"Identity capacity allowance; actual SMS volume and rates must be priced separately.");
  if (r.full_text_search && layers.some(layer => layer.choice === "Self-hosted Meilisearch")) addCost("Search",15,60,"Separate search process and index capacity.");
  if (r.realtime) addCost("Realtime",0,65,"Connection and fan-out capacity beyond baseline compute.");
  if (r.ml_features !== "none") addCost("ML",0,200,"Provisional CPU/model capacity allowance; excludes accelerator training and paid model fees.");
  const min = cost.reduce((total,row) => total + row.min,0);
  const max = cost.reduce((total,row) => total + row.max,0);
  result.estimated_monthly_cost_usd = {min,max,breakdown:cost,assumptions:[
    "Planning allowances are heuristics. Size instances and confirm regional quotes before procurement.",
    "Excludes taxes, engineering labor, payment transaction fees, separately metered SMS, and accelerator costs."
  ]};
  if (x.budget.monthly_infra_usd < min) {
    warn("BUDGET_BELOW_MINIMUM","critical",`The modeled minimum is USD ${min}/month against a USD ${x.budget.monthly_infra_usd} budget.`,["budget.monthly_infra_usd"]);
    return finishInfeasible();
  }
  if (x.budget.monthly_infra_usd < max) {
    warn("BUDGET_PRESSURE","warning",`The upper estimate of USD ${max}/month exceeds the USD ${x.budget.monthly_infra_usd} budget.`,["budget.monthly_infra_usd"]);
    const budget = x.budget.monthly_infra_usd;
    assumptions.push(
      `The USD ${budget}/month budget plan assumes a limited pilot cohort instead of the full 12-month forecast of ${s.users_12_months} users. The cost band remains the full-scope planning estimate. Keep the requested features and service targets for the pilot, and expand only after measured costs and load tests support it.`
    );
    const spendFraction = Math.min(1,(budget - min) / (max - min) * .8);
    const controls = {
      Hosting: `Keep the planned ${servingReplicas} serving replicas as the pilot baseline. Limit admission and approve scaling only after measuring peak load and availability.`,
      Database: "Keep backups and required redundancy. Review database utilization before increasing capacity.",
      Storage: queuedWrites ? "Compress media before sync, limit per-agent upload volume, and monitor storage and egress." : "Set per-account upload size and volume limits. Track storage and egress.",
      Identity: "Include carrier charges in this envelope where SMS is used. Limit retries and track cost per successful sign-in.",
      Realtime: "Limit concurrent sessions per rollout cohort and measure fan-out before opening enrollment.",
      "Resumable uploads": "Cap concurrent uploads and temporary bytes. Expire abandoned upload sessions without deleting queued client records."
    };
    const allocations = cost.map(row => ({
      layer:row.layer,
      target_usd:row.min + Math.floor((row.max - row.min) * spendFraction * 100) / 100,
      control:controls[row.layer] || "Measure usage against this allowance before scaling."
    }));
    const target = Math.round(allocations.reduce((sum,row) => sum + row.target_usd,0) * 100) / 100;
    result.budget_fit_plan = {
      status:"conditional_pilot", monthly_budget_usd:budget, target_usd:target,
      unallocated_usd:Math.max(0,Math.round((budget - target) * 100) / 100), allocations,
      rollout:queuedWrites
        ? "Start with one field cohort. Preserve offline capture and queued uploads. Defer onboarding when sync backlog or metered usage exceeds the pilot envelope."
        : r.realtime ? "Start with one rollout cohort. Preserve realtime and payment flows. Gate new enrollment on observed session and transaction costs."
        : "Start with a limited cohort and expand only after measuring usage.",
      acceptance:"Price every line in the required region, including omitted provider fees where applicable. Load-test the planned cohort against the requested SLOs. If it exceeds an envelope, reduce cohort size or raise the budget before launch.",
      tradeoff:"This is a spend allocation for a smaller rollout. It does not cover the full forecast or impose a provider billing cap."
    };
  }
  if (!freeStatic && (redundant || r.p95_latency_ms !== null))
    warn("SLO_TEST_REQUIRED","warning","Validate failover and end-to-end latency in the selected region. The stack and planning band do not guarantee either target.",["requirements.availability","requirements.p95_latency_ms"]);
  result.status = w.length ? "ok_with_warnings" : "ok";
  result.architecture_style = staticSite ? "static" : "modular_monolith";
  result.summary = staticSite ? "Publish a static build with no application server or database." : `Run a modular application with ${best.name} and regional relational storage or approved local infrastructure.`;
  if (result.regulated_use === "evaluation")
    result.summary += "Use synthetic data and sandbox payments until production eligibility is verified.";
  result.stack = {frontend,backend,database,hosting,supporting:layers};
  return result;
}
if (typeof module === "undefined") globalThis.stackSenseEngine = {recommend};
else module.exports = {recommend, validate};
}
