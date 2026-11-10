"""Build the challenge report from captured browser runs and generated JSON."""
import json
import os
import re
import subprocess
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Image, PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle

root = Path(__file__).resolve().parent
out = root / "output" / "pdf"
out.mkdir(parents=True, exist_ok=True)
ink = colors.HexColor("#191a23")
lime = colors.HexColor("#b9ff66")
muted = colors.HexColor("#555661")
body = ParagraphStyle("Body", fontName="Helvetica", fontSize=11, leading=15, textColor=ink, spaceAfter=9)
heading = ParagraphStyle("Heading", parent=body, fontName="Helvetica-Bold", fontSize=19, leading=23, spaceBefore=13, spaceAfter=9)
title = ParagraphStyle("Title", parent=heading, fontSize=52, leading=56)
caption = ParagraphStyle("Caption", parent=body, fontSize=10, leading=13)
reference = ParagraphStyle("Reference", parent=caption, spaceAfter=3)
story = []


def p(text, style=body):
    story.append(Paragraph(escape(text), style))


def link(label, url):
    story.append(Paragraph(f'<link href="{escape(url)}" color="#134e75">{escape(label)}</link>', reference))


def h(text):
    p(text, heading)


def shot(identifier, description):
    p(description, caption)
    story.append(Image(str(root / "report-evidence" / f"{identifier}.png"), width=480, height=300))
    story.append(Spacer(1, 12))


def page():
    story.append(PageBreak())


def furniture(canvas, doc):
    width, height = A4
    canvas.setFillColor(lime)
    canvas.rect(48, height - 40, width - 96, 5, fill=1, stroke=0)
    canvas.setFillColor(muted)
    canvas.setFont("Helvetica", 9)
    canvas.drawString(48, 32, "StackSense / Synergy '26")
    canvas.drawRightString(width - 48, 32, str(doc.page))


story.append(Spacer(1, 84))
p("Synergy '26 / StackSense Challenge")
p("StackSense", title)
h("Intelligent Tech Stack Recommendation Engine")
p("A deterministic architecture workbench for evaluating project constraints.")
story.append(Spacer(1, 55))
p("Shinjan Sarkar")
p("C.V. Raman Global University")
email = os.environ.get("STACKSENSE_REPORT_EMAIL")
p(f"Unstop-registered email: {email}" if email else "Public repository copy. Entrant email appears in the submission copy.")
link("github.com/shinjan-2006/StackSense", "https://github.com/shinjan-2006/StackSense")
p("10 November 2026")
page()
h("1. Abstract")
p("StackSense converts a structured project scenario into an architecture recommendation, cost band, trade-offs and warnings. It runs offline in a browser or through a dependency-free Node CLI. The engine validates the shared schema, selects the deployment boundary and scores compatible backend options. Supporting services and cost are evaluated alongside the core stack. Generated JSON preserves the drivers, alternatives and planning assumptions used in the decision.")
h("2. Problem understanding")
p("The useful result is a stack a team can investigate within its constraints. The engine rejects explicit deployment conflicts and estimates budget fit before returning a stack. Delivery speed, language fit, workload and operating burden guide selection. Unknown regions and external data paths are surfaced for review. Provider products are design candidates, not compliance certifications.")
h("3. System architecture")
story.append(Preformatted("Browser form / JSON file / HTTP request\n    -> shared schema and validation\n    -> constraints, region and provider\n    -> backend scores and supporting layers\n    -> capacity, cost and budget gates\n    -> recommendation JSON and browser results", ParagraphStyle("Diagram", parent=body, fontName="Courier", fontSize=10, leading=13, spaceAfter=12)))
p("schema.js defines field types and ranges. engine.js applies defaults, validates, and generates the same result in both runtimes. app.js maps form controls to the JSON scenario and presents cost, conflicts and component details. cli.js supports individual and batch exports. The optional HTTP server provides the same engine over a local endpoint.")
h("4. Input design and research")
p("Project type and requested platforms drive architecture shape and client coverage. Name identifies the project and description provides context. User counts, concurrency, traffic pattern, workload and volume inform scale warnings, backend scoring, caching and storage. Team size, languages, experience and DevOps capacity inform framework fit and operational warnings. Budget and delivery horizon set the cost gate and delivery weighting.")
p("Cloud, deployment model, residency and existing systems resolve the provider and region. Requirements cover identity, realtime, offline behavior, search, storage, payments, tenancy, ML, SEO and service targets. Compliance flags require control and contract review. Priorities steer scoring, search and cache selection, and resilience allowances.")
p("Optional inputs cover throughput, recovery, sensitivity, portability, search size, concurrent editing, ledger model, offline writes and resumable uploads. They change sizing, safeguards or selected components. The shared schema rejects malformed sections, unknown fields and values, missing required inputs and invalid numeric ranges.")
p("The browser uses HTML5, CSS and JavaScript. The CLI and optional HTTP server use Node.js 18 or later and were tested on Node.js 24. Both entry points use the same dependency-free engine.")
page()
h("4. Input design and research (continued)")
fields = json.loads(subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('./schema')))"], cwd=root, text=True))
effects = {
    "scenario_id":"labels JSON and batch filenames", "compliance":"adds applicable scope checks and can restrict production",
    "name":"labels the project in the form", "description":"can infer ledger needs in fintech",
    "type":"selects architecture and can infer live editing", "platforms":"selects clients and rejects API-only combinations",
    "users_at_launch":"records launch context", "users_12_months":"drives zero-budget scale checks and pilot scope",
    "peak_concurrent_users":"estimates request load and informs scoring or cache rules", "data_volume_gb_12_months":"sizes storage allowances",
    "traffic_pattern":"informs cache selection", "workload":"informs cache and relational storage reasoning",
    "size":"weights skill fit and flags solo operations risk", "experience":"weights skill fit and flags beginner operations risk",
    "languages":"scores backend familiarity", "has_devops":"informs operations and latency warnings",
    "monthly_infra_usd":"gates the stack or yields a limited pilot", "mvp_weeks":"weights delivery and checks platform scope",
    "cloud_preference":"selects the provider ahead of ecosystem hints", "deployment_model":"sets managed, VM or local hosting",
    "data_residency":"restricts data placement", "existing_systems":"informs provider fit, integration and lifecycle warnings",
    "realtime":"adds live transport", "offline_support":"adds local persistence and sync", "full_text_search":"selects an index",
    "file_media_storage":"adds upload storage", "payments":"adds hosted checkout within the allowed boundary",
    "multi_tenant":"keeps the workload on an application stack", "seo_critical":"favors pre-rendered or server-rendered web output",
    "auth":"selects identity and checks external dependencies", "ml_features":"selects an inference, retrieval or training runtime",
    "availability":"sets redundancy and operations checks", "p95_latency_ms":"adds latency verification",
    "cost":"steers search and cache", "time_to_market":"weights delivery", "scalability":"weights realtime backend capacity",
    "performance":"weights realtime throughput", "maintainability":"weights familiarity", "security":"adds resilience at the highest setting"
}
def field_rule(field):
    kind, options = field["type"], field.get("options")
    if kind in ("enum", "multi"):
        return ("one of " if kind == "enum" else "unique values from ") + ", ".join(options)
    if kind in ("integer", "number", "nullableInteger"):
        base = "number" if kind == "number" else "safe integer"
        return base + (f" {options[0]}–{options[1]}" if len(options) == 2 else f" ≥ {options[0]}") + (" or null" if kind == "nullableInteger" else "")
    return {"text":"string", "boolean":"true/false", "list":"list of non-empty strings"}[kind]
for field in fields:
    path = field["path"]
    key = path.rsplit(".", 1)[-1]
    p(f"{path} · {'Required' if field['required'] else 'Optional'} · {field_rule(field)}. {effects.get(key) or field.get('help') or 'See the shared schema.'}", caption)
p("Research basis: official provider and framework documentation informs regional offerings, static rendering and database search. Android offline guidance informs local storage and sync. AWS recovery guidance distinguishes recovery time and recovery point. See §10 for links.")
h("5. Knowledge base and decision logic")
p("AWS, Azure and Google Cloud profiles bind hosting, database and object storage to the selected regional provider. Existing Microsoft identity influences provider selection only when the cloud choice is unrestricted. VM mode selects a provider VM and self-operated data services. Local mode uses local hosting, build scripts and telemetry. An unknown required region or incompatible air-gap dependency returns an infeasible result.")
p("The backend score sums language fit, delivery, realtime throughput and a bounded Microsoft identity ecosystem bonus when applicable. A small or beginner team increases the importance of language fit. A short MVP raises the delivery weight. Performance and scalability priorities raise the realtime term. Ratings are design heuristics. Stable catalog order settles ties. Outputs show winning and runner-up score contributions.")
p("A cost band sums compute, database, storage, identity and applicable supporting workloads. App replica count comes from peak requests and a load-test target of 100 requests per second per replica. Database sizing uses explicit storage assumptions. A minimum above budget blocks the stack. An overlapping band retains the warning and offers a smaller pilot with spending allocations. Taxes, labor, transaction fees, SMS and accelerators are excluded from the base band.")
p("The engine makes no model calls. No API key, network access or feature switch is needed to reproduce the output.")
for i in range(1, 7):
    if i in (1, 3, 5):
        page()
        h(f"6. Sample recommendations · P{i} and P{i+1}")
    result = json.loads((root / "outputs" / f"P{i}_output.json").read_text(encoding="utf-8"))
    stack = result["stack"]
    cost = result["estimated_monthly_cost_usd"]
    shot(f"P{i}", f"P{i} / {stack['frontend']['choice']} / {stack['hosting']['choice']} / USD {cost['min']}-{cost['max']} per month.")
for identifier in ("P2", "P5"):
    page()
    h(f"6. Component rationale · {identifier}")
    stack = json.loads((root / "outputs" / f"{identifier}_output.json").read_text(encoding="utf-8"))["stack"]
    components = [(key, stack[key]) for key in ("frontend", "backend", "database", "hosting")]
    components += [(item["layer"], item) for item in stack["supporting"]]
    for layer, component in components:
        p(f"{layer.title()} · {component['choice']}. {component['justification']}", caption)
    if identifier == "P2":
        for pilot_id in ("P2", "P6"):
            plan = json.loads((root / "outputs" / f"{pilot_id}_output.json").read_text(encoding="utf-8"))["budget_fit_plan"]
            p(f"{pilot_id} pilot · USD {plan['target_usd']:.2f} per month, with USD {plan['unallocated_usd']:.2f} unallocated. {plan['rollout']}", caption)
page()
h("7. Edge-case handling")
edge_cases = [
    ("Missing fields", "Required schema keys absent", "Return invalid_input with field errors. List applied defaults in assumptions.", "E-missing"),
    ("Invalid values", "Schema type, enum or range fails", "Return field errors. The capture uses a string where a Boolean is required.", "E-type"),
    ("Contradictions", "Budget below the modeled floor or incompatible hard constraints", "Return infeasible with a critical warning. Tests also cover solo availability and short multiplatform MVPs.", "E-budget"),
    ("Over-engineering", "Content-only web site without dynamic requirements", "Keep the site static even at high forecast traffic. Verify free-tier limits before launch.", "E-static"),
    ("Regulatory constraints", "Residency and compliance flags or a production request", "Filter regions, list affected services and block unreviewed production. Evaluation uses synthetic data.", "E-regulated"),
    ("Existing systems", "Declared system with matching reuse and support review records", "Keep existing records behind a read-only adapter. The capture uses a demonstration review reference.", "E-existing"),
    ("Restricted deployment", "On-premises or air-gapped boundary", "Serve and build locally. Reject dependencies that require external access.", "E-airgap"),
    ("Skill mismatch", "Declared skills differ from the default stack", "Weight language fit. The C# mutation selects ASP.NET Core and explains its score.", "E-skills"),
    ("Deprecated technology", "Known retirement matches the lifecycle catalog", "Warn and propose migration. Block explicit reuse of the retired service.", "E-retired"),
]
table = Table([[Paragraph(escape(cell), caption) for cell in row] for row in
               [("Category", "Detection", "Engine response", "Capture"), *edge_cases]],
              colWidths=[90, 112, 216, 72], repeatRows=1)
table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), lime), ("VALIGN", (0,0), (-1,-1), "TOP"),
                           ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.whitesmoke, colors.white]),
                           ("LINEBELOW", (0,0), (-1,0), 1, muted)]))
story.append(table)
p("Appendix A contains the corresponding unedited screenshots from the running browser engine.")
page()
h("8. Validation")
p("The Node suite checks deterministic output, cost totals, provider changes, feasibility, platform coverage, lifecycle and review gating. Chrome imported all six public inputs and nine edge cases, generated each recommendation, and compared each result with Node. The capture script verified the browser export filename and the generated JSON payload. The screenshots are raw browser captures.")
p("Scenario checks confirm that P1 stays static, P3 selects an EU region for GDPR evaluation, P4 retains India residency, P5 favors the declared C# skills, and P6 retains local capture and resumable upload support. These are behavior checks against the provided requirements and documented design patterns.")
h("9. Limitations and future work")
p("The catalog and ratings are curated rules. Throughput and cost require regional quotes and workload benchmarks. Production review references are supplied by users and require independent review. Availability and latency are targets to test. Expand lifecycle coverage, calibrate estimates and model tenant isolation and legacy migrations in more detail.")
h("10. References and third-party tools")
p("Sources include the organizer-supplied StackSense Challenge problem statement and public dataset. Runtime uses Node.js and browser APIs with zero third-party runtime libraries or external API calls. Python and ReportLab generate the PDF. Playwright and Chrome capture the browser evidence.")
link("Supplied public scenarios", "https://github.com/shinjan-2006/StackSense/blob/main/scenarios/stacksense_public_scenarios.json")
for label, url in [("Python", "https://www.python.org/"), ("Challenge listing", "https://unstop.com/hackathons/stacksense-challenge-synergy-26-international-institute-of-information-technology-iiit-bangalore-1762891")]:
    link(label, url)
sources = set()
for filename in ("engine.js", "INPUT-RESEARCH.md", "README.md"):
    sources.update(re.findall(r'https://[^\s"<>\x27)]+', (root / filename).read_text(encoding="utf-8")))
for url in sorted(sources):
    link(url.removeprefix("https://"), url)
h("11. AI assistance declaration")
p("OpenAI Codex assisted with implementation, interface changes, test design, report drafting and evidence capture. The runtime uses deterministic code and makes no model calls.")
for index, (category, _, _, identifier) in enumerate(edge_cases):
    if index % 2 == 0:
        page()
        h("Appendix A. Edge-case screenshots")
    shot(identifier, f"{identifier} · {category}")

filename = "StackSense_Report_Submission.pdf" if email else "StackSense_Report.pdf"
doc = SimpleDocTemplate(str(out / filename), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=55, bottomMargin=50, title="StackSense Challenge Report")
doc.build(story, onFirstPage=furniture, onLaterPages=furniture)
