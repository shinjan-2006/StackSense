const example={scenario_id:"EXAMPLE",project:{name:"My project",type:"web_app",platforms:["web"]},scale:{users_at_launch:100,users_12_months:1000},team:{size:2,experience:"intermediate",languages:["typescript"]},budget:{monthly_infra_usd:50},timeline:{mvp_weeks:6}};
const $=s=>document.querySelector(s),input=$("#input"),output=$("#output"),error=$("#error"),generate=$("#go");
const jsonPanel = document.createElement("details");
jsonPanel.className = "json-panel";
jsonPanel.innerHTML = "<summary>Edit or import JSON</summary>";
const editorLabel = $('label[for="input"]');
$(".file-row").before(jsonPanel);
jsonPanel.append($(".file-row"), editorLabel, input);

const guidedForm = document.createElement("div");
guidedForm.className = "guided";
guidedForm.setAttribute("aria-label", "Guided scenario fields");
jsonPanel.before(guidedForm);
const groups = new Map();
const controls = new Map();
const labelFor = key => key.replaceAll("_", " ").replace(/^./, character => character.toUpperCase());


for (const field of fields) {
  const keys = field.path.split(".");
  const section = keys.length === 2 ? keys[0] : "metadata";
  if (!groups.has(section)) {
    const group = document.createElement("details");
    group.open = section === "project";
    const heading = document.createElement("summary");
    heading.textContent = labelFor(section);
    const fieldGrid = document.createElement("div");
    fieldGrid.className = "guided-fields";
    group.append(heading, fieldGrid);
    guidedForm.append(group);
    groups.set(section, fieldGrid);
  }
  const label = document.createElement("label");
  label.textContent = labelFor(keys.at(-1)) + (field.required ? " *" : "");
  const isSelect = ["enum", "multi", "boolean"].includes(field.type);
  const control = document.createElement(isSelect ? "select" : "input");
  control.className = "field-control";
  if (field.required) control.setAttribute("aria-required", "true");
  if (isSelect) {
    const values = field.type === "boolean" ? ["true", "false"] : field.options;
    control.multiple = field.type === "multi";
    if (!control.multiple) control.add(new Option(field.required ? "Select…" : "Use engine default", ""));
    values.forEach(value => control.add(new Option(labelFor(value), value)));
  } else if (field.options) {
    control.type = "number";
    control.min = field.options[0];
    if (field.options[1] !== undefined) control.max = field.options[1];
    control.step = field.type === "number" ? "any" : "1";
  } else if (field.type === "list") {
    control.placeholder = "Separate values with commas";
  }
  label.append(control);
  if (field.help) {
    const help = document.createElement("small");
    help.textContent = field.help;
    label.append(help);
  }
  groups.get(section).append(label);
  controls.set(field.path, control);
  control.addEventListener("change", () => {
    try {
      const scenario = JSON.parse(input.value);
      if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) throw new Error();
      const target = keys.length === 2 ? (scenario[section] ??= {}) : scenario;
      const key = keys.at(-1);
      const raw = control.value;
      if (field.type === "multi") target[key] = Array.from(control.selectedOptions, option => option.value);
      else if (field.type === "list") target[key] = raw.split(",").map(item => item.trim()).filter(Boolean);
      else if (!raw) delete target[key];
      else if (field.type === "boolean") target[key] = raw === "true";
      else target[key] = control.type === "number" ? Number(raw) : raw;
      input.value = JSON.stringify(scenario, null, 2);
      clearResult();
      clearError();
    } catch {
      showError("Correct the JSON or reset the example before editing guided fields.");
      jsonPanel.open = true;
    }
  });
}
function syncForm() {
  let scenario;
  try { scenario = JSON.parse(input.value); } catch { return; }
  for (const [path, control] of controls) {
    const value = path.split(".").reduce((record, key) => record?.[key], scenario);
    if (control.multiple) {
      for (const option of control.options) option.selected = Array.isArray(value) && value.includes(option.value);
    } else {
      control.value = Array.isArray(value) ? value.join(", ") : value ?? "";
    }
  }
}
input.addEventListener("input", () => {
  clearResult();
  clearError();
  syncForm();
});
const resultNotes = document.createElement("ul");
resultNotes.className = "result-notes";
resultNotes.setAttribute("aria-live", "polite");
$("#stack").after(resultNotes);
const showError=m=>{error.textContent=m;error.style.display="block"},clearError=()=>error.style.display="none",reset=()=>{input.value=JSON.stringify(example,null,2);clearError()};reset();
syncForm();
let scenarioRevision = 0;
let importSequence = 0;
function clearResult() {
  scenarioRevision++;
  window.stackSenseResult = null;
  output.textContent = "";
  $("#result").hidden = true;
  $("#empty").hidden = false;
}
$("#file").onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  clearResult();
  clearError();
  const revision = scenarioRevision;
  const sequence = ++importSequence;
  generate.disabled = true;
  try {
    const text = await file.text();
    if (revision !== scenarioRevision) return;
    input.value = text;
    syncForm();
  } catch {
    if (revision === scenarioRevision) showError("That file could not be read. Please choose a valid JSON file.");
  } finally {
    if (sequence === importSequence) generate.disabled = false;
  }
};
$("#reset").onclick = () => {
  clearResult();
  reset();
  syncForm();
};
generate.onclick = () => {
  if (generate.disabled) return;
  clearError();
  clearResult();

  let scenario;
  try {
    scenario = JSON.parse(input.value);
  } catch {
    showError("The scenario JSON is not valid. Check brackets, commas, and quotes.");
    return;
  }
  try {
    render(globalThis.stackSenseEngine.recommend(scenario));
  } catch (failure) {
    console.error(failure);
    showError("The recommendation could not be generated. Reload StackSense and try again.");
  }
};
function render(result) {
  const badge = $("#badge");
  badge.textContent = labelFor(result.status);
  badge.dataset.tone = result.status === "ok" ? "normal" : "attention";
  $("#style").textContent = result.stack ? labelFor(result.architecture_style) : "Scenario needs attention";
  $("#summary").textContent = result.summary;
  const cost = result.estimated_monthly_cost_usd;
  $("#cost").textContent = cost && result.stack && result.status !== "infeasible"
    ? `Estimated monthly cost: USD ${cost.min}–${cost.max}`
    : "";
  if (result.stack && cost?.breakdown?.length) {
    const breakdown = document.createElement("details");
    const label = document.createElement("summary");
    label.textContent = "Cost breakdown and assumptions";
    const entries = [...cost.breakdown.map(row => `${row.layer}: USD ${row.min}–${row.max}. ${row.basis}`), ...cost.assumptions];
    const list = document.createElement("ul");
    for (const entry of entries) {
      const item = document.createElement("li");
      item.textContent = entry;
      list.append(item);
    }
    breakdown.append(label, list);
    $("#cost").append(breakdown);
  }
  if (result.stack && result.capacity_plan) {
    const plan = result.capacity_plan;
    appendResultDetails("Capacity and failover assumptions", [
      plan.peak_requests_per_second === null ? plan.request_rate_basis : `${plan.peak_requests_per_second} peak RPS. ${plan.request_rate_basis}`,
      `${plan.app_replicas} application replicas at ${plan.per_replica_target_rps} target RPS per replica.`,
      `${plan.database_storage_gb} GB database storage. ${plan.database_storage_basis}`,
      plan.failover, plan.verification
    ]);
  }
  if (result.verification_checks?.length) {
    appendResultDetails("Required production verification", result.verification_checks.map(check =>
      `${check.area}: ${check.requirement}${check.affected.length ? ` Affected: ${check.affected.join(", ")}.` : ""}${check.review_reference ? ` Review reference: ${check.review_reference}.` : check.review_key ? ` Review key: ${check.review_key}` : ""}`));
  }
  if (result.existing_systems_plan?.length) {
    appendResultDetails("Existing systems plan", result.existing_systems_plan.map(item =>
      `${item.system} (${labelFor(item.action)}): ${item.guidance}`));
  }
  if (result.stack && result.budget_fit_plan) {
    const plan = result.budget_fit_plan;
    appendResultDetails("Budget-fit pilot", [
      `Target USD ${plan.target_usd} of USD ${plan.monthly_budget_usd} per month. USD ${plan.unallocated_usd} unallocated.`,
      plan.rollout,
      ...plan.allocations.map(row => `${row.layer}: USD ${row.target_usd}. ${row.control}`),
      plan.acceptance, plan.tradeoff
    ]);
  }

  const layers = result.stack
    ? [...["frontend", "backend", "database", "hosting"].map(layer => [layer, result.stack[layer]]),
       ...(result.stack.supporting || []).map(item => [item.layer, item])]
    : [];
  $("#stack").innerHTML = layers.map(([layer, item]) => {
    const alternatives = (item.alternatives || []).map(option =>
      `<li><strong>${escapeHtml(option.choice)}</strong> — ${escapeHtml(option.why_not)}</li>`).join("");
    const tradeoffs = (item.tradeoffs || []).map(escapeHtml).join(" ");
    return `<details><summary><span>${escapeHtml(labelFor(layer))}</span><strong>${escapeHtml(item.choice)}</strong></summary>
      <div class="decision-detail">
        <p>${escapeHtml(item.justification)}</p>
        ${item.driven_by?.length ? `<p><small>Driven by ${escapeHtml(item.driven_by.join(", "))}</small></p>` : ""}
        ${tradeoffs ? `<p><strong>Trade-offs</strong> ${tradeoffs}</p>` : ""}
        ${alternatives ? `<p><strong>Alternatives</strong></p><ul>${alternatives}</ul>` : ""}
      </div></details>`;
  }).join("");

  const notes = [
    ...(result.validation_errors || []).map(entry => `${entry.field}: ${entry.message}`),
    ...(result.warnings || []).map(entry => `${labelFor(entry.severity)}: ${entry.message}`)
  ];
  resultNotes.replaceChildren(...notes.map(message => {
    const item = document.createElement("li");
    item.textContent = message;
    return item;
  }));
  output.textContent = JSON.stringify(result, null, 2);
  window.stackSenseResult = result;
  $("#empty").hidden = true;
  $("#result").hidden = false;
}

function appendResultDetails(title, entries) {
  const disclosure = document.createElement("details");
  const label = document.createElement("summary");
  label.textContent = title;
  const list = document.createElement("ul");
  for (const entry of entries) {
    const row = document.createElement("li");
    row.textContent = entry;
    list.append(row);
  }
  disclosure.append(label, list);
  $("#cost").append(disclosure);
}
$("#download").onclick=()=>{const r=window.stackSenseResult;if(!r){showError("Generate a recommendation before downloading.");return}const url=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=`${r.scenario_id||"recommendation"}_output.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0)};function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
