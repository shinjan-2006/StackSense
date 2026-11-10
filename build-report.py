"""Build the challenge report from captured browser runs and generated JSON."""
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer

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
story = []


def p(text, style=body):
    story.append(Paragraph(escape(text), style))


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
p("Submission metadata pending: entrant name, college, Unstop email and optional repository URL.")
p("10 November 2026")
page()
h("1. Abstract")
p("StackSense converts a structured project scenario into an architecture recommendation, cost band, trade-offs and warnings. It runs offline in a browser or through a dependency-free Node CLI. The engine validates the shared schema, selects the deployment boundary and scores compatible backend options. Supporting services and cost are evaluated alongside the core stack. Generated JSON preserves the drivers, alternatives and planning assumptions used in the decision.")
h("2. Problem understanding")
p("The useful result is a stack a team can investigate within its constraints. The engine rejects explicit deployment conflicts and estimates budget fit before returning a stack. Delivery speed, language fit, workload and operating burden guide selection. Unknown regions and external data paths are surfaced for review. Provider products are design candidates, not compliance certifications.")
h("3. System architecture")
p("Browser form or CLI JSON  >  shared schema and validation  >  constraint checks  >  provider and region selection  >  scoring and capability rules  >  cost gate  >  decision and JSON export.")
p("schema.js defines field types and ranges. engine.js applies defaults, validates, and generates the same result in both runtimes. app.js maps form controls to the JSON scenario and presents cost, conflicts and component details. cli.js supports individual and batch exports. The optional HTTP server provides the same engine over a local endpoint.")
h("4. Input design and research")
p("Project type and requested platforms drive architecture shape and client coverage. Name identifies the project and description provides context. User counts, concurrency, traffic pattern, workload and volume inform scale warnings, backend scoring, caching and storage. Team size, languages, experience and DevOps capacity inform framework fit and operational warnings. Budget and delivery horizon set the cost gate and delivery weighting.")
p("Cloud, deployment model, residency and existing systems resolve the provider and region. Requirements cover identity, realtime, offline behavior, search, storage, payments, tenancy, ML, SEO and service targets. Compliance flags require control and contract review. Priorities steer scoring, search and cache selection, and resilience allowances.")
p("Optional inputs cover throughput, recovery, sensitivity, portability, search size, concurrent editing, ledger model, offline writes and resumable uploads. They change sizing, safeguards or selected components. The shared schema rejects malformed sections, unknown fields and values, missing required inputs and invalid numeric ranges.")
page()
h("5. Knowledge base and decision logic")
p("AWS, Azure and Google Cloud profiles bind hosting, database and object storage to the selected regional provider. Existing Microsoft identity influences provider selection only when the cloud choice is unrestricted. VM mode selects a provider VM and self-operated data services. Local mode uses local hosting, build scripts and telemetry. An unknown required region or incompatible air-gap dependency returns an infeasible result.")
p("Backend score = language fit bonus + delivery rating times delivery weight + throughput rating times realtime load weight. A small or beginner team raises the language-fit weight. A short MVP raises the delivery weight. Performance and scalability priorities raise the realtime term. Ordinal ratings are judgment-based, and catalog order settles ties. The winning and runner-up scores are returned.")
p("A cost band sums compute, database, storage, identity and applicable supporting workloads. App replica count comes from peak requests and a load-test target of 100 requests per second per replica. Database sizing uses explicit storage assumptions. A minimum above budget blocks the stack. An overlapping band retains the warning and offers a smaller pilot with spending allocations. Taxes, labor, transaction fees, SMS and accelerators are excluded from the base band.")
p("The engine makes no model calls. No API key, network access or feature switch is needed to reproduce the output.")
h("6. Sample recommendations")
for i in range(1, 7):
    if i in (1, 3, 5):
        page()
        h(f"6. Public scenarios P{i} and P{i+1}")
    result = json.loads((root / "outputs" / f"P{i}_output.json").read_text(encoding="utf-8"))
    stack = result["stack"]
    cost = result["estimated_monthly_cost_usd"]
    shot(f"P{i}", f"P{i} / {stack['frontend']['choice']} / {stack['hosting']['choice']} / USD {cost['min']}-{cost['max']} per month.")
page()
h("6. Decision walkthroughs")
p("P2, FixIt Now. Next.js covers discoverable web pages and React Native covers Android. Fastify matches the declared JavaScript and TypeScript experience. Regional PostgreSQL supports transactions and search, avoiding a separate search service. Fargate and S3 stay in the selected Indian region. The app owns the WebSocket gateway. Keycloak is deployed in the same boundary, while the SMS and payment integrations need their own data-flow review. The upper band exceeds budget, so the result warns.")
p("P5, PeopleDesk. React covers the web client. ASP.NET Core matches C# experience. Azure App Service, managed PostgreSQL and Blob Storage share the Azure deployment region. Keycloak can broker enterprise sign-in, subject to IdP configuration and data review. Validate any required SQL Server integration separately. Verify latency and backup retention with representative HR records.")
for identifier in ("P2", "P6"):
    result = json.loads((root / "outputs" / f"{identifier}_output.json").read_text(encoding="utf-8"))
    plan = result["budget_fit_plan"]
    p(f"{identifier} pilot. The monthly target is USD {plan['target_usd']:.2f}, with USD {plan['unallocated_usd']:.2f} unallocated. {plan['rollout']} Confirm regional pricing, metered usage and service targets before launch.")
h("7. Edge-case handling")
for row in [
    "Missing fields and invalid values: reject before selection and return per-field errors.",
    "Contradictions: return infeasible for incompatible platforms, deployment and identity choices or a modeled minimum above budget.",
    "Over-engineering: P1 stays static and needs no API or database. Search can reuse the main database.",
    "Regulatory constraints: select a supported region and flag external processing paths, contracts and configuration.",
    "Existing systems and skill mismatch: use identity hints only when permitted and score declared skills explicitly.",
    "Restricted deployment: serve and build inside the boundary with local tooling.",
    "Retired technology: the catalog requires manual lifecycle review. Existing-system end-of-life detection is not automated."
]:
    p(row)
for left, right, label_left, label_right in [
    ("E-missing","E-type","Missing required fields","Invalid boolean field"),
    ("E-budget","E-airgap","Zero budget with a positive modeled minimum","Air-gapped portfolio with local serving"),
    ("E-cloud",None,"GCP override with an Indian region",None)
]:
    page()
    h("7. Captured edge cases")
    shot(left, label_left)
    if right:
        shot(right, label_right)
page()
h("8. Validation")
p("The Node suite checks all six public outputs for determinism and reconciles cost line items with totals. Mutations cover explicit provider selection, cloud storage consistency, VM mode, air-gap isolation, budget rejection, unsupported residency, platform coverage, malformed input and cost-priority sensitivity. Chrome ran the public and selected edge cases through file import, verified results against the Node engine and tested JSON download. Screenshots are from those runs.")
h("9. Limitations and future work")
p("The catalog and ratings are curated rules. Throughput and cost require calibration with regional quotes and workload benchmarks. Unsupported residency is treated conservatively. Legal eligibility, identity contracts, payment processing, licenses, and third-party retention require manual review. Availability and latency are targets to test. Legacy system migration, tenant isolation design and end-of-life detection need deeper profiles.")
h("10. References and third-party tools")
for item in [
    "StackSense Challenge problem statement and public scenario JSON, supplied with Synergy '26.",
    "AWS Fargate, RDS and S3 pricing: aws.amazon.com/fargate/pricing/; aws.amazon.com/rds/postgresql/pricing/; aws.amazon.com/s3/pricing/.",
    "Azure regional service reference: azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/.",
    "Cloud Run regions: cloud.google.com/run/docs/locations. Cloud SQL pricing: cloud.google.com/sql/pricing.",
    "PostgreSQL search: postgresql.org/docs/current/textsearch.html. Offline Android: developer.android.com/topic/architecture/data-layer/offline-first.",
    "Keycloak identity: keycloak.org/docs/latest/server_admin/. Recovery: docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/plan-for-disaster-recovery-dr.html.",
    "Runtime: Node.js and browser APIs. Report and capture tooling: ReportLab, Playwright and Chrome. See INPUT-RESEARCH.md and component source fields for additional references."
]:
    p(item)
h("11. AI assistance declaration")
p("OpenAI Codex assisted with implementation, interface changes, test design, report drafting and evidence capture. The runtime uses deterministic code and makes no model calls.")

doc = SimpleDocTemplate(str(out / "StackSense_Report_Draft.pdf"), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=55, bottomMargin=50, title="StackSense Challenge Report")
doc.build(story, onFirstPage=furniture, onLaterPages=furniture)
