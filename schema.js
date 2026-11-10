// Shared by the browser form and the Node engine.
const fields = [];
function group(section, definitions) {
  for (const [key, type, options, required = false, help] of definitions) {
    fields.push({ path: section ? section + "." + key : key, type, options, required, help });
  }
}
const choices = values => values.split(" ");
group("", [["scenario_id", "text"], ["compliance", "multi", choices("gdpr dpdp hipaa pci_dss rbi_localisation soc2 iso27001")]]);
group("project", [
  ["name", "text"], ["description", "text"],
  ["type", "enum", choices("content_site web_app saas_b2b ecommerce marketplace social realtime_collab fintech healthtech data_analytics iot ai_ml_product internal_tool gaming api_platform other"), true],
  ["platforms", "multi", choices("web android ios desktop api_only"), true]
]);
group("scale", [
  ["users_at_launch", "integer", [0], true], ["users_12_months", "integer", [0], true],
  ["peak_concurrent_users", "integer", [0]], ["data_volume_gb_12_months", "number", [0, Number.MAX_SAFE_INTEGER]],
  ["traffic_pattern", "enum", choices("steady spiky seasonal")], ["workload", "enum", choices("read_heavy balanced write_heavy")]
]);
group("team", [["size", "integer", [1], true], ["experience", "enum", choices("beginner intermediate senior mixed"), true], ["languages", "list", null, true], ["has_devops", "boolean"]]);
group("budget", [["monthly_infra_usd", "number", [0], true]]);
group("timeline", [["mvp_weeks", "integer", [1], true]]);
group("infrastructure", [
  ["cloud_preference", "enum", choices("any aws gcp azure none")],
  ["deployment_model", "enum", choices("managed_cloud self_hosted_cloud_vm on_premise air_gapped")],
  ["data_residency", "enum", choices("none india eu us other")], ["existing_systems", "list"]
]);
group("requirements", [
  ...choices("realtime offline_support full_text_search file_media_storage payments multi_tenant seo_critical").map(key => [key, "boolean"]),
  ["auth", "enum", choices("none email_password social phone_otp enterprise_sso")],
  ["ml_features", "enum", choices("none inference_api llm_rag training")],
  ["availability", "enum", choices("99 99.9 99.95 99.99")], ["p95_latency_ms", "nullableInteger", [1]]
]);
group("priorities", choices("cost time_to_market scalability performance maintainability security").map(key => [key, "integer", [1, 5]]));
group("advanced", [
  ["regulated_use", "enum", choices("evaluation production"), false, "Evaluation uses synthetic data. Choose production when real regulated data or live payment processing is required."],
  ["production_review_records", "list", null, false, "Enter each review key shown in the results followed by => and your approved review reference. Use a comma between records."],
  ["approved_existing_integrations", "list", null, false, "Exact names from Existing Systems approved for reuse. Confirm support status, access, network placement and data handling before adding a name."],
  ["existing_support_records", "list", null, false, "Enter each approved system's exact name followed by => and the support review reference for its deployed version."],
  ["realtime_interaction", "enum", choices("notifications concurrent_editing"), false, "Choose concurrent editing when multiple people can change the same document at once."],
  ["ledger_model", "enum", choices("none double_entry"), false, "Choose double-entry when the app owns balances or posts financial entries."],
  ["offline_access", "enum", choices("read_only queued_writes"), false, "Choose queued writes if users must create or edit records without connectivity."],
  ["resumable_uploads", "boolean", null, false, "Enable when interrupted media uploads must continue without retransmitting the entire file."],
  ["peak_requests_per_second", "integer", [0], false, "Peak dynamic HTTP requests per second. Drives load-test and cost guidance."],
  ["rpo_minutes", "integer", [0], false, "Maximum tolerable data loss in minutes. Zero requires synchronous durability review."],
  ["rto_minutes", "integer", [1], false, "Maximum tolerable recovery time in minutes. Tight targets require failover drills."],
  ["data_sensitivity", "enum", choices("public internal sensitive"), false, "Sensitive records trigger access and storage safeguards."],
  ["portability", "enum", choices("flexible prefer_portable"), false, "Prefer a portable search implementation when PostgreSQL is already in the stack."],
  ["search_documents", "integer", [0], false, "Expected searchable records. Helps decide when to start with an in-database index."]
]);

if (typeof module !== "undefined") module.exports = fields;
