# IT Operations & Changes

Basic creation and organization report integration: the additional `BASIC` template stores title,
summary, content and optional evidence/asset references with the existing document lifecycle.
The 72 detailed templates remain available under Advanced template. Both kinds, including saved
drafts with explicit status, are available in the organization PDF generator's operations section.
The report reads current saved values with original schema versions, conditional visibility and
sensitivity protection. Existing standalone record PDF export still requires submission.

Status: **catalog, template administration and organization policies implemented; complete module still partial**, 2026-11-23. All 72 templates have practical PL/EN schemas and use the common form, persistence and workflow engine. See [catalog](it-operations-catalog.md), [continuation report](it-operations-continuation-report.md), [continuation plan](it-operations-continuation-plan.md), and the [historical first-slice report](it-operations-delivery-report.md).

## Storage and deployment

Seven tables support the module: `OperationTemplates` (immutable global or organization-owned definitions), `OperationRecords` (organization-scoped changes and operational records), `OperationRevisions` (immutable full snapshots), `OperationActivities` (append-only business events), `OperationTemplateSettings` (organization-specific activation), `OperationPolicies` (approval/retention/reporting settings), and `OperationPolicyRevisions` (append-only administration history). Operational documents and changes share a record table. There are no operations attachment, general entity-link or separate approval tables yet.

Values and schemas use PostgreSQL JSONB. Title, description, category, status, type, risk, priority, requester, implementer, owner, asset reference, dates, year, sequence and timestamps are relational columns. A GIN expression index covers `to_tsvector('simple', Title || ' ' || Description)`; record numbers are also searchable. Arbitrary JSON field contents are not full-text indexed. Unique organization/year/sequence and organization/number indexes protect numbering. A transaction-scoped PostgreSQL advisory lock serializes number allocation per organization. D02 uses `OPS`, changes use `CHG`; both share the organization/year sequence.

Records use both the existing PostgreSQL xmin and an explicit GUID revision token. PUT and transition requests require the token from the last read; stale requests return 409. Each successful save/action updates the token and server modification metadata and appends a snapshot and activity event atomically. Even draft saves have revisions. Published template and revision identities never change. UTC is stored; frontend times use the browser's locale/timezone. Organization-specific timezone preferences are not implemented.

Additive migrations:

- `20261123161518_AddOperationsSlice`
- `20261123162102_AddOperationHistoryProtection`
- `20261123171844_AddOperationTemplateAdministration`

No pre-existing migration was changed. The second migration adds the FTS index, sequence/date/status checks, and PostgreSQL append-only triggers. The third widens template keys, adds nullable organization/publisher metadata and new administration tables, and protects policy history with the same trigger. It does not rewrite legacy definitions. Downgrade refuses to narrow keys while organization templates exist. The model snapshot is updated normally. Startup migrates then serializes built-in publication using a PostgreSQL advisory lock. Test hosts explicitly bypass production initialization.

Back up the **entire PostgreSQL database** with the existing application encryption keys and existing file volume. Existing organization ZIP export/import **does not include operations**; do not treat it as an operations backup. This module stores evidence references as text and creates no new attachment volume. Existing file references require backing up their existing storage separately. Use organization/record archive rather than deletion. Referential restrictions/history triggers may prevent hard-deleting memberships/organizations with evidence; no purge/retention mechanism is supplied.

## Supported template format

`OperationSchema` is a strict, bounded declarative format with a C# structural meta-schema validator (not an external JSON Schema execution library). JSON uses camelCase with `schemaVersion: 1`, stable `key`, localized `{en,pl}` name/description, `controls` string array, and `fields` array. `kind` chooses Change/Record; `requiresApproval` chooses document approval; optional `category` and `validationProfile` preserve categorization and restore-test validation when cloning. Every field has an ASCII key, localized label, type, required flag, maxLength and Normal/Restricted/Secret sensitivity; optional constraints, defaults, visibility, options, child fields and localized help.

Supported types: `text`, `multiline`, `date`, `datetime`, `select`, `radio`, `multiselect`, `url`, `table`, `integer`, `decimal`, `boolean`, `checkbox`. Only tables have children; nested tables are rejected. Dates require ISO date values; HTTP/HTTPS are the only permitted URL schemes. Text is encoded by React and the existing safe PDF/Markdown renderer; no rich HTML or code is evaluated. Numeric minimum/maximum, minimum/maximum text length, maxItems, scalar defaults and the named safe text patterns `guid`, `hostname`, `sha256` are supported. Arbitrary regex, reference/file fields, separate repeating groups and per-template export configurations remain unsupported and are rejected.

`visibleWhen` contains `match: "AND"|"OR"`, a `rules` array and optional nested `groups`. A rule contains `field`, `operator`, and, where needed, `value`. Closed operators: `equals`, `notEquals`, `in`, `notIn`, `empty`, `notEmpty`, `greaterThan`, `lessThan`. Greater/less comparisons are numeric. Choices for in/notIn are bounded primitive arrays; comparison is against the field value. Table-row rules resolve sibling values before root values. Restricted/secret fields cannot drive visibility, which prevents leaking protected values through conditional sections. No eval, scripts or dynamic expressions are accepted.

Example: `{"match":"AND","rules":[{"field":"temporary","operator":"equals","value":true}]}` makes a firewall expiry field required only for a temporary rule. C08/C13/A01 expose authority notification sections when classified as potentially reportable. Deadlines are user-maintained data, not legal business logic.

Definitions reject unknown/duplicate JSON members, duplicate/reserved field keys, unsupported types/operators, invalid defaults/metadata, >128,000 UTF-8 bytes, >60 fields per group, >50 choices, >10,000 characters per field limit, and excessive depth (JSON maximum depth 24, one table level; conditions maximum group depth 3 and 40 nodes). Values reject unknown/duplicate keys, wrong types, invalid options/date/URL/pattern, numeric range violations, >128,000 bytes, excessive rows/choices and lengths. Partial drafts are permitted. Required visible fields are enforced on submission/emergency bypass. D02 and its clones require integrity and application verification for success. Temporary A06 rules require expiry dates. Frontend mirrors the supported rules and reports individual row/field errors.

To add/change a built-in definition: update `OperationCatalog`/`OperationCatalog.Remaining` using shared execution/recovery/configuration/checklist/evidence blocks; add localized fields and tests; deploy. Seeding validates each definition and identifies it by key and SHA-256 hash. A new hash appends `max(version)+1`; old definitions are never overwritten. Documents retain exact versions. Concurrent replica publication is serialized at startup.

Administrators can clone/import into generated `ORG_...` keys, edit JSON as a new version, validate and preview it, export JSON, and activate/deactivate a template for their organization. Control references are editable in the versioned schema. Publishing requires the expected previous version ID; activation requires its revision token. Only active latest versions can create new records. Existing records remain readable/editable according to their own lifecycle, including when their template is disabled. The library provides search, category/scope filters, pagination and version inspection. Global definitions cannot be edited through organization endpoints. Public schema exports omit protected fields; their displayed content hash refers to the complete immutable published definition, not the filtered representation.

## Authorization

`operations` is added to `OrganizationResources`, frontend resource selection, custom/client permissions, module visibility and entity permission pickers. Record reads use the existing BaseEntity organization/individual read filter; snapshots, history and export first resolve the authorized parent. Foreign organization/hidden record IDs return 404. Lists/templates require module access. All endpoints require authentication. Archived organizations reject writes. No existing CORS/authentication/upload/header protections were weakened.

| Action | ReadOnly | Member | Admin / Owner | Custom role / client |
|---|---|---|---|---|
| View/list/history/PDF | Read | Read | Read | Explicit operations read rules |
| Create | No | Write | Write | Explicit module write; valid non-client implementer/owner |
| Edit own draft / submit / execute | No | Write | Write | Explicit record write, requester only |
| Edit another draft | No | No | Write | Not granted by default |
| Review / route to approval / approve / reject / close / archive | No | No | Write | Not granted (existing role resolver treats custom/client roles as ReadOnly) |
| Manage templates/policy / view restricted fields | No | No | Yes, subject to operations access; writes require active organization | Not granted by default |
| Operations attachments | Not available | Not available | Not available | Not available |

Approval is an authenticated workflow event, with actor/time, decision notes and the policy snapshot in the immutable revision. Defaults require independent approval, separate high-risk requester/implementer, and no self-approval/exception. Policy can preapprove standard changes, change low/normal approval requirements, allow low-risk self-approval, and allow documented administrator exceptions. High risk always requires approval; self-approval otherwise remains prohibited unless an enabled exception records reason, actor and UTC time. Approval permissions remain administrator-only regardless of the self-approval policy. Exception events contain no free-text values; the authorized revision contains the reason.

Requester and assigned implementer can execute with record write access; only requester/Admin/Owner can edit a draft. UI exposes organization member pickers for implementer/owner (bounded to 250 non-client members). Policy updates, publication, activation, creation and workflow decisions serialize through the same organization advisory lock on PostgreSQL; revision tokens reject stale edits. Retention days and reporting criteria/deadlines JSON are configurable data. No automatic deletion or legal deadline calculation is performed.

Asset links are validated against existence, organization and current asset read scope on create/save. Only a single asset link is supported. Export resolves the asset name through its own read filters. Other entity integrations and a general DocumentEntityLink mechanism are pending.

## Workflow matrix

All transitions require a fresh token; invalid transitions return 409 and missing prerequisites return 400. Write actions require requester write access or Admin/Owner; administrative actions require Admin/Owner plus module write.

| From | To | Permission / precondition |
|---|---|---|
| Draft | Submitted | Write; complete valid template |
| Draft, Submitted | Cancelled | Write |
| Submitted | Under Review, Awaiting Approval | Admin/Owner |
| Submitted, Under Review | Approved | Admin/Owner; only if change policy does not require approval |
| Under Review | Awaiting Approval | Admin/Owner |
| Awaiting Approval | Approved | Admin/Owner; separate requester and implementer |
| Awaiting Approval | Rejected | Admin/Owner; decision reason |
| Approved | Scheduled | Write; planned start and end |
| Approved, Scheduled | In Progress | Write |
| Scheduled | Cancelled | Write |
| In Progress | Verification | Write |
| In Progress, Verification | Failed, Rolled Back | Write; result reason |
| Verification | Completed | Write; verification/result reason |
| Completed, Failed, Rolled Back | Closed | Admin/Owner; closure reason; emergency retrospective review if applicable |
| Closed | Archived | Admin/Owner |
| Emergency: Draft, Submitted, Under Review, Awaiting Approval | In Progress | Write; complete template and bypass reason |
| Bypassed open emergency | RetrospectiveReview (status unchanged) | Independent Admin/Owner; review reason |

Templates with Record kind use Draft → Submitted → Closed → Archived when no approval is required, or Draft → Submitted → Approved/Rejected → Closed → Archived when approval is required. D02 remains non-approval, including legacy definitions and clones. Pending Approvals includes both awaiting changes and submitted approval-required documents. Closure requires an administrator and reason. High-risk changes require separate requester/implementer before submission/execution unless an enabled administrator exception is documented. Closed records can only archive; Rejected/Cancelled are terminal. Superseding/correction workflows remain pending. Structured fields freeze on submission; execution/verification/closure notes remain workflow revision content.

## API

Base: `/api/operations/{organizationId}` (frontend client uses `/operations/...` because its configured base already contains `/api`).

| Method | Path | Behavior |
|---|---|---|
| GET | `/templates` | Published versions, authorized library |
| POST | `/templates/{id}/clone` | Clone visible definition into organization key (admin) |
| POST | `/templates/import` | Validated JSON import as an organization template (admin) |
| POST | `/templates/validate` | Validate definition and return preview schema (admin) |
| POST | `/templates/{key}/versions` | Publish immutable new organization version with expectedVersionId (admin) |
| PUT | `/templates/{key}/activation` | Organization activation with revisionToken (admin) |
| GET / PUT | `/settings` | Read policy / administrator policy update |
| GET | `/members` | Bounded organization member references |
| GET | `/records` | Server-side register, total/page/pageSize |
| POST | `/records` | Create draft with exact templateVersionId |
| GET | `/records/{id}` | Record, schema, values, history, revision metadata, permitted transitions |
| PUT | `/records/{id}` | Save authorized draft; revisionToken required |
| POST | `/records/{id}/transitions` | `{revisionToken,target,reason,exceptionReason?}`; server actor/time |
| GET | `/records/{id}/revisions/{revisionId}` | Authorized immutable snapshot |
| GET | `/records/{id}/pdf?language=pl\|en` | On-demand authorized PDF; drafts return 409 |

Register query: `search`, `status`, `risk`, `type`, `assetId`, `requester`, `implementer`, `category`, `from`, `to`, `pendingApprovals`, `sort` (`modified`, `title`, `number`), `page` (1–100000), `pageSize` (1–100). UI exposes search/status/risk/type/sort and pagination, plus My Documents, Pending Approvals and asset-filtered Related Changes. Register category/date/member filters remain API-only.

## PDF and licenses

The existing **PDFsharp-MigraDoc 6.2.4 (MIT)** and existing embedded **DejaVu Sans / Sans Bold (Bitstream Vera/DejaVu permissive font license)** are reused. License notices remain under `Assets/ThirdParty` and `Assets/Fonts`. These existing permissive licenses suit the MIT repository and commercial self-hosted distribution with their notices retained. No revenue-based licensing, AGPL library, SaaS or external font service is added. Alternatives: QuestPDF would require assessing its revenue/community licensing; iText would require commercial licensing or AGPL obligations. Neither is added.

Exports include record/template version, identities, revision token, status, timestamps, filled values, per-row before/after fields, related asset, workflow history and decision/execution notes. Existing renderer supplies embedded fonts, pagination and content wrapping. Configuration rows use the existing report card layout. Export never saves/changes the business record. PDF snapshots/branding/retention and evidence packs are pending.

The review-only `pypdfium2 5.15.2` package is installed into ignored `output/pdf-qa`, not application manifests or Docker images. Its Apache-2.0 OR BSD-3-Clause licensing and PDFium's bundled notices are described by [upstream](https://github.com/pypdfium2-team/pypdfium2#licensing); preserve those notices if redistributing this QA environment. No new NuGet/npm dependency is introduced.

## Audit and limitations

Activities record action, authenticated actor, UTC time and from/to states without form values or free-text reasons. Full snapshots (including decision notes and decision-time policy) require the same parent read authorization. Normal fields follow record read rules. Restricted values/definitions are omitted from non-administrator reads, PDFs and revision responses; a table containing any restricted child is hidden as a whole. Hidden data is preserved during authorized ordinary draft edits, while attempted protected-field writes are rejected. Secret fields render vault instructions only: supplied values/defaults are rejected and keys are never persisted. There is no automatic detection of secrets pasted into ordinary text, and no field-level value diff. Store credentials in Passwords and reference them.

EF rejects editing/deleting published templates, revisions and activities, and deleting records. PostgreSQL triggers additionally protect templates/history from UPDATE/DELETE. No update/delete history API exists. DB owners and host administrators can disable triggers or alter backups: this is database-local audit history, **not cryptographic or legal immutability**. External audit export/hash chains remain future work. There are no legal deadlines, reporting thresholds or compliance certification claims in business logic.

## Synthetic examples and review

See [examples](examples/it-operations-synthetic.md), [Polish guide](user-guide/it-operations-pl.md) and [English guide](user-guide/it-operations-en.md). Production startup seeds definitions only, never example documents. Test fixtures optionally write output only when explicit `HEXORA_OPERATIONS_UI_FIXTURE` / `HEXORA_OPERATIONS_SAMPLE_PDF` variables are supplied. Those outputs and the temporary browser profile are ignored by Git.

Visual QA scripts render the real form/license components with compiled app CSS and synthetic props, check 390px/1280px viewport overflow and capture screenshots in installed headless Edge. These are isolated component previews, **not a browser click-through of an authenticated production deployment**. HTTP integration tests exercise the workflow independently. `render-operations-pdf.py` renders all sample pages and verifies Polish text and approval/closure content using local PDFium.
