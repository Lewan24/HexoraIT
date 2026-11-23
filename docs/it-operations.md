# IT Operations & Changes: implemented vertical slice

Status: **partial implementation**, 2026-11-23. This document describes shipped behavior, not the complete requested MVP. See [implementation plan](it-operations-implementation-plan.md) and [delivery report](it-operations-delivery-report.md).

## Storage and deployment

Four tables are added: `OperationTemplates` (immutable published definitions), `OperationRecords` (organization-scoped changes and operational records), `OperationRevisions` (immutable full snapshots), and `OperationActivities` (append-only business events). Operational documents and changes share a record table in this slice. There are no new attachment, general entity-link, policy, or separate approval tables yet.

Values and schemas use PostgreSQL JSONB. Title, description, category, status, type, risk, priority, requester, implementer, owner, asset reference, dates, year, sequence and timestamps are relational columns. A GIN expression index covers `to_tsvector('simple', Title || ' ' || Description)`; record numbers are also searchable. Arbitrary JSON field contents are not full-text indexed. Unique organization/year/sequence and organization/number indexes protect numbering. A transaction-scoped PostgreSQL advisory lock serializes number allocation per organization. D02 uses `OPS`, changes use `CHG`; both share the organization/year sequence.

Records use both the existing PostgreSQL xmin and an explicit GUID revision token. PUT and transition requests require the token from the last read; stale requests return 409. Each successful save/action updates the token and server modification metadata and appends a snapshot and activity event atomically. Even draft saves have revisions. Published template and revision identities never change. UTC is stored; frontend times use the browser's locale/timezone. Organization-specific timezone preferences are not implemented.

Additive migrations:

- `20261123161518_AddOperationsSlice`
- `20261123162102_AddOperationHistoryProtection`

No pre-existing migration was changed. The second new migration adds the FTS index, sequence/date/status checks, and PostgreSQL triggers blocking UPDATE/DELETE of template versions, revisions and activities. The model snapshot is updated normally. Startup migrates then serializes built-in publication using a PostgreSQL advisory lock. Test hosts explicitly bypass production initialization.

Back up the **entire PostgreSQL database** with the existing application encryption keys and existing file volume. Existing organization ZIP export/import **does not include operations**; do not treat it as an operations backup. This module stores evidence references as text and creates no new attachment volume. Existing file references require backing up their existing storage separately. Use organization/record archive rather than deletion. Referential restrictions/history triggers may prevent hard-deleting memberships/organizations with evidence; no purge/retention mechanism is supplied.

## Supported template format

`OperationSchema` is a strict, bounded declarative subset, **not the full requested meta-schema**. JSON uses camelCase with `schemaVersion: 1`, stable `key`, localized `{en,pl}` name/description, `controls` string array, and `fields` array. Every field has a stable ASCII key, localized label, type, required flag, and maxLength; optional options, child fields and localized help.

Supported types: `text`, `multiline`, `date`, `datetime`, `select`, `url`, `table`. Only tables have children; nested tables are rejected. Dates require ISO date values; HTTP/HTTPS are the only permitted URL schemes. Text is encoded by React and the existing safe PDF/Markdown renderer; no rich HTML or code is evaluated. Defaults, numeric rules, regex, boolean, reference/file fields, multiselect and repeating groups are not implemented. **Conditions and all condition operators are currently unsupported and rejected** as unknown schema members. Sensitivity classifications are unsupported; do not use this slice for restricted/secret field workflows.

Definitions reject unknown JSON members, duplicate field keys, unsupported types, invalid metadata, >128,000 UTF-8 bytes, >60 fields per group, >50 choices, >10,000 characters per field limit, and excessive depth (JSON maximum depth 12, one table level). Values reject unknown/duplicate keys, wrong types, invalid options/date/URL, >128,000 bytes, >50 table rows, and excessive lengths. Required fields are enforced on submission and emergency bypass, with partial drafts permitted. D02 success requires recorded integrity and application-function verification. Frontend mirrors the supported validation rules and reports individual row/field errors.

To add/change a built-in definition: update `OperationCatalog` using its shared execution/recovery/table blocks; explicitly extend the allowed key set in `OperationSchemas.Parse`; add meaningful localized fields and tests; deploy. Seeding validates each definition and identifies it by key and SHA-256 content hash. A previously unseen hash appends `max(version)+1`; existing definitions are never overwritten. Documents read their exact stored version, even after a later version is published. Concurrent replica publication is serialized by startup locking. Organization cloning, imports, editing/publishing, enable/disable and editable control mapping are **not implemented**. The template UI is a read-only library/schema viewer with create-record action.

## Authorization

`operations` is added to `OrganizationResources`, frontend resource selection, custom/client permissions, module visibility and entity permission pickers. Record reads use the existing BaseEntity organization/individual read filter; snapshots, history and export first resolve the authorized parent. Foreign organization/hidden record IDs return 404. Lists/templates require module access. All endpoints require authentication. Archived organizations reject writes. No existing CORS/authentication/upload/header protections were weakened.

| Action | ReadOnly | Member | Admin / Owner | Custom role / client |
|---|---|---|---|---|
| View/list/history/PDF | Read | Read | Read | Explicit operations read rules |
| Create | No | Write | Write | Explicit module write; valid non-client implementer/owner |
| Edit own draft / submit / execute | No | Write | Write | Explicit record write, requester only |
| Edit another draft | No | No | Write | Not granted by default |
| Review / route to approval / approve / reject / close / archive | No | No | Write | Not granted (existing role resolver treats custom/client roles as ReadOnly) |
| Templates/policy management / restricted fields / attachments | Not available | Not available | Not available | Not available |

Approval is an authenticated workflow event, with actor/time and decision notes in the immutable revision. A requester or implementer cannot approve their own change. Standard and normal changes currently both require independent approval; risk does not relax this conservative fixed policy. Configurable organization policies, preapproval, low-risk self-approval and documented small-team exceptions are pending. Only the requester and organization admins can execute/edit a record; assigning another implementer is supported by API, but that alone does not authorize execution. UI defaults implementer/owner to requester and does not provide reassignment controls.

Asset links are validated against existence, organization and current asset read scope on create/save. Only a single asset link is supported. Export resolves the asset name through its own read filters. Other entity integrations and a general DocumentEntityLink mechanism are pending.

## Workflow matrix

All transitions require a fresh token; invalid transitions return 409 and missing prerequisites return 400. Write actions require requester write access or Admin/Owner; administrative actions require Admin/Owner plus module write.

| From | To | Permission / precondition |
|---|---|---|
| Draft | Submitted | Write; complete valid template |
| Draft, Submitted | Cancelled | Write |
| Submitted | Under Review, Awaiting Approval | Admin/Owner |
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

D02 is a non-change operational record: Draft → Submitted → Closed → Archived. Submission validates its complete data; closure needs an administrator and reason but no approval. Other templates in this slice use the change workflow. Closed records can only archive; Rejected/Cancelled are terminal. Superseding/correction workflows are pending. Template fields freeze at submission; execution/verification/closure notes are separate workflow-action revision content. Post-submission structured field corrections are not supported.

## API

Base: `/api/operations/{organizationId}` (frontend client uses `/operations/...` because its configured base already contains `/api`).

| Method | Path | Behavior |
|---|---|---|
| GET | `/templates` | Published versions, authorized library |
| GET | `/records` | Server-side register, total/page/pageSize |
| POST | `/records` | Create draft with exact templateVersionId |
| GET | `/records/{id}` | Record, schema, values, history, revision metadata, permitted transitions |
| PUT | `/records/{id}` | Save authorized draft; revisionToken required |
| POST | `/records/{id}/transitions` | `{revisionToken,target,reason}`; server actor/time |
| GET | `/records/{id}/revisions/{revisionId}` | Authorized immutable snapshot |
| GET | `/records/{id}/pdf?language=pl\|en` | On-demand authorized PDF; drafts return 409 |

Register query: `search`, `status`, `risk`, `type`, `assetId`, `requester`, `implementer`, `category`, `from`, `to`, `sort` (`modified`, `title`, `number`), `page` (1–100000), `pageSize` (1–100). UI exposes search/status/risk/type/sort and pagination, plus requester-filtered My Documents, Pending Approvals and asset-filtered Related Changes. Category/date/member filters are API-only for now.

## PDF and licenses

The existing **PDFsharp-MigraDoc 6.2.4 (MIT)** and existing embedded **DejaVu Sans / Sans Bold (Bitstream Vera/DejaVu permissive font license)** are reused. License notices remain under `Assets/ThirdParty` and `Assets/Fonts`. These existing permissive licenses suit the MIT repository and commercial self-hosted distribution with their notices retained. No revenue-based licensing, AGPL library, SaaS or external font service is added. Alternatives: QuestPDF would require assessing its revenue/community licensing; iText would require commercial licensing or AGPL obligations. Neither is added.

Exports include record/template version, identities, revision token, status, timestamps, filled values, per-row before/after fields, related asset, workflow history and decision/execution notes. Existing renderer supplies embedded fonts, pagination and content wrapping. Configuration rows use the existing report card layout. Export never saves/changes the business record. PDF snapshots/branding/retention and evidence packs are pending.

The review-only `pypdfium2 5.15.2` package is installed into ignored `output/pdf-qa`, not application manifests or Docker images. Its Apache-2.0 OR BSD-3-Clause licensing and PDFium's bundled notices are described by [upstream](https://github.com/pypdfium2-team/pypdfium2#licensing); preserve those notices if redistributing this QA environment. No new NuGet/npm dependency is introduced.

## Audit and limitations

Activities record action, authenticated actor, UTC time and from/to states, without form values or free-text reasons. Full document snapshots (including decision notes) are stored separately and require the same parent read authorization. Sensitive field types are not supported; users must store secrets in Passwords and reference them. There is no automatic secret detection, restricted-field redaction, or field-level audit diff in this slice. Do not claim support for sensitive evidence until those controls are implemented.

EF rejects editing/deleting published templates, revisions and activities, and deleting records. PostgreSQL triggers additionally protect templates/history from UPDATE/DELETE. No update/delete history API exists. DB owners and host administrators can disable triggers or alter backups: this is database-local audit history, **not cryptographic or legal immutability**. External audit export/hash chains remain future work. There are no legal deadlines, reporting thresholds or compliance certification claims in business logic.

## Synthetic examples and review

See [examples](examples/it-operations-synthetic.md), [Polish guide](user-guide/it-operations-pl.md) and [English guide](user-guide/it-operations-en.md). Production startup seeds definitions only, never example documents. Test fixtures optionally write output only when explicit `HEXORA_OPERATIONS_UI_FIXTURE` / `HEXORA_OPERATIONS_SAMPLE_PDF` variables are supplied. Those outputs and the temporary browser profile are ignored by Git.

Visual QA scripts render the real form/license components with compiled app CSS and synthetic props, check 390px/1280px viewport overflow and capture screenshots in installed headless Edge. These are isolated component previews, **not a browser click-through of an authenticated production deployment**. HTTP integration tests exercise the workflow independently. `render-operations-pdf.py` renders all sample pages and verifies Polish text and approval/closure content using local PDFium.
