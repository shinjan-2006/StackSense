# Input design and research

The guided form and engine validator use the same schema. Required fields are marked in the form. Blank optional fields use engine defaults where defined. The JSON editor supports direct import and preserves explicit values such as a null latency target.

| Input group | Architectural use | Validation |
| --- | --- | --- |
| Project | Project type and target clients guide frontend and architecture shape. Name labels the output. Description provides context without automatic inference. | Known type and at least one unique platform. API-only and client platforms cannot be combined. |
| Scale | Peak concurrency affects realtime backend scoring and capacity reserves. Stored volume affects the storage allowance. Workload and traffic shape affect cache selection. Year-one users flag very high scale with no budget. Launch users are context. | Non-negative counts and storage. Known traffic and workload values. |
| Team, budget, timeline | Language fit and DevOps capacity guide implementation and operational trade-offs. Budget and delivery schedule surface feasibility risks. | Positive team size and timeline, non-negative USD, known experience, and a language list that may be empty. |
| Infrastructure and compliance | Deployment model, cloud, residency, and existing systems guide hosting and integration. Conflicting deployment choices and explicitly incompatible residency are flagged. | Known deployment, provider, residency and compliance values. Existing systems must be a list of names. |
| Requirements and priorities | Feature requirements activate supporting components. Availability influences redundancy allowance, and latency activates a verification warning. Time to market and maintainability weight backend scoring. Performance and scalability weight backend scoring for realtime load. Cost influences cache and search choices. Security at its highest setting adds a resilience allowance. | Typed booleans, known enums, positive latency or null, and priorities from 1 to 5. |

## Optional inputs and how they change the output

| Input | Effect |
| --- | --- |
| Peak requests per second | Sets app replica count using a planning target of 100 RPS per replica. If absent, the engine estimates one request every 20 seconds per concurrent user. The planning target must be load-tested. |
| Recovery point objective in minutes | Adds a recovery-point check, with a separate synchronous-durability review for zero tolerable loss. |
| Recovery time objective in minutes | Adds a recovery drill with a measurable time target. Targets of 30 minutes or less add a redundancy allowance. |
| Data sensitivity | Sensitive workloads receive safeguards for access, auditing, backup encryption and retention. |
| Portability preference | Can select PostgreSQL full-text search when the database is already PostgreSQL. |
| Search documents | Up to 100,000 documents can favor starting with PostgreSQL full-text search. This is a starting heuristic. Query mix, document size and ranking needs can change the result. |
| Realtime interaction | Distinguishes live notifications from concurrent editing. Editing adds Yjs, durable update snapshots, and a separate sync allowance. Defaults from the realtime collaboration project type. |
| Ledger model | Adds a double-entry journal with atomic posting, idempotency, reversals, and reconciliation. Older fintech inputs may infer the need from the description. |
| Offline access | Read-only caches the last view and disables offline writes. Queued writes add durable mutations, retries and conflict handling. |
| Resumable uploads | Adds a tus endpoint and temporary storage allowance. Defaults on for queued offline media and requires file storage. Online-only and read-only offline workflows resume transfers after reconnect without enabling offline edits. |

If the modeled range overlaps the budget, the engine keeps the full-rollout estimate and offers a conditional pilot. It starts from the modeled minimum, allocates up to 80% of the remaining budget across variable cost lines in proportion to their estimated headroom, and leaves the balance unallocated. The pilot lists operating controls and a rollout gate. These are spending targets to validate with quotes and measurements.

## Technology profiles

- **Astro.** Static HTML with selective hydration fits content sites with a small interactive surface. Request-time personalization introduces a server-rendering requirement. [Astro islands architecture](https://docs.astro.build/en/concepts/islands/)
- **PostgreSQL full-text search.** Indexed matching and built-in ranking can keep an early search feature alongside transactional data. Search still competes with transactions for database resources. Benchmark representative queries before choosing between an embedded index and a dedicated service. [PostgreSQL full-text search](https://www.postgresql.org/docs/current/textsearch.html)
- **Offline-first Android.** A local source of truth and eventual synchronization are a better fit for unreliable connections than network-only writes. Sync still needs retry, conflict resolution and duplicate-write handling. This informs the existing offline Android recommendation. [Android offline-first architecture](https://developer.android.com/topic/architecture/data-layer/offline-first)
- **Disaster recovery.** Availability targets and recovery objectives address different failure modes. Use RPO and RTO to set testable recovery goals. Deployment feasibility still depends on the backup and replication setup, and recovery must be tested. [AWS Well-Architected disaster recovery guidance](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/plan-for-disaster-recovery-dr.html)

These profiles document selected decision rules. Provider-specific pricing, regional service availability, and compliance controls require separate verification before deployment.

## Provider evidence and scoring

The engine keeps hosting, the primary database and object storage in the same provider and region for managed deployments. A VM deployment switches the database and storage to self-operated options. Restricted deployments keep build, serving and telemetry local. Each regional product row carries a source URL in JSON. The cost breakdown distinguishes compute, database, storage, identity, search, realtime and ML allowances where applicable.

- AWS pricing references for [Fargate](https://aws.amazon.com/fargate/pricing/), [RDS for PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/) and [S3](https://aws.amazon.com/s3/pricing/).
- Azure pricing references for [App Service](https://azure.microsoft.com/pricing/details/app-service/linux/), [PostgreSQL Flexible Server](https://azure.microsoft.com/pricing/details/postgresql/flexible-server/) and [Blob Storage](https://azure.microsoft.com/pricing/details/storage/blobs/).
- Google Cloud references for [Cloud Run locations](https://cloud.google.com/run/docs/locations), [Cloud SQL pricing](https://cloud.google.com/sql/pricing) and [Cloud Storage pricing](https://cloud.google.com/storage/pricing).
- Keycloak supports configuring external identity providers. An SMS flow needs an adapter and carrier review. [Keycloak server administration guide](https://www.keycloak.org/docs/latest/server_admin/)

Backend scores combine declared language fit, delivery preference, and a realtime-load term. ASP.NET Core receives a bounded integration-fit bonus when C# skills, Microsoft Entra ID, and enterprise SSO are all present. The ordinal weights are design heuristics. Catalog order resolves ties. The result shows both candidates' nonzero score contributions.

Dynamic stacks expose a capacity plan with peak request rate, replica count, database storage, and failover assumptions. The estimates are provisional until benchmarked and priced. Regulated workloads also list affected services and open verification checks for contracts, retention, regional data flows and external integrations. An air-gapped enterprise SSO request is infeasible when a reachable local upstream identity provider cannot be established from the scenario.
