# Basic documentation delivery

2026-11-23, branch `feature/it-operations-changes`.

## 1. Implemented

- Basic document creation: title, summary, content, optional asset/evidence references; no change-specific administrative inputs.
- Advanced creation keeps the existing 72 detailed templates and their validation. BASIC is an additional 73rd built-in definition, not a replacement or bypass for mandatory change evidence.
- Existing versioned persistence, draft reopening, revisions and document lifecycle are reused. Content is required at submission; incomplete drafts remain allowed. Closure retains administrator/reason requirements.
- Organization PDF options/counts/search/record selection now include operations. Both basic and advanced saved records, including drafts, are available; draft status is printed. Current saved values, original template/version, conditional sections and repeated rows are rendered with PL/EN labels, not raw JSON.
- Operations is selected by default when nonempty and not hidden. The UI explains that drafts are included and edits must be saved before generation. Existing PDF scope approval still applies.

## 2. Not implemented / limits

No conversion between already-created basic and advanced records. Create a new record with the desired template. Unsaved browser edits cannot appear in a server-generated report. Standalone record PDF still requires submission; the organization report deliberately permits drafts with explicit status. Organization report is current structured content, not the full audit-history export available in a standalone record PDF. Wider module gaps in the continuation report (attachments, general links, corrections, transfer) remain unchanged. No authenticated live-browser acceptance is claimed.

## 3. Architecture

BASIC is an idempotently seeded immutable JSON definition (`Kind=Record`, category E). No schema migration or parallel document store. The organization exporter batches selected templates, actors and asset names, retains organization/permission query filters and applies existing public-schema/value filters before formatting. Basic PDFs omit irrelevant default change risk/priority/implementer metadata. Existing PDFsharp-MigraDoc/embedded fonts are reused; no external service.

## 4. Migrations

None. Existing migrations were untouched. Existing databases receive BASIC through normal startup catalog seeding.

## 5. Components

Backend: OperationCatalog; DocumentationService/Models/Labels/DTO; new DocumentationOperations partial; application, endpoint and PostgreSQL tests. Frontend: Operations basic/advanced creation controls; OrganizationDocumentation section label/help; PL/EN catalogs; form/save and export-review tests. QA scripts and PL/EN/in-app guides updated.

## 6. Catalog

All 72 detailed catalog templates remain functional; additional BASIC is functional through the shared engine. [Complete catalog](it-operations-catalog.md). Catalog lifecycle loop validates/creates/submits/closes all 73; existing 21 required MVP PDF checks remain.

## 7. Verification

Baseline before edits:

- `dotnet build HexoraITApi/HexoraIT.slnx --no-restore`: passed, zero warnings/errors.
- `dotnet test HexoraITApi/HexoraIT.slnx --no-build --no-restore`: **334 passed, 3 skipped, 337 total** (PostgreSQL opt-ins unset).
- `npm run build --prefix HexoraITWeb`: passed.
- `npm test --prefix HexoraITWeb`: **79 passed**.

After implementation:

- Backend build: passed, zero warnings/errors.
- `dotnet test HexoraITApi/HexoraIT.slnx --no-restore` with disposable PostgreSQL opt-in: **337 passed, 2 skipped, 339 total**. Two new application facts; PostgreSQL operations test enabled. The remaining skips are the optional archive/PostgreSQL and >4 GiB tests.
- Extended PostgreSQL follow-up, `--filter FullyQualifiedName~PostgreSqlOperationTests`: **1 passed** after adding real report counts, scoped picker/search/pagination and PDF query assertions.
- Final focused `--filter "FullyQualifiedName~DocumentationTests|FullyQualifiedName~DocumentationEndpointTests"`: **20 passed** after omitting irrelevant basic-document change metadata. Covers basic save/reopen/submission/closure, current values, explicit selection, foreign organization IDs, hidden/secret fields and HTTP export authorization.
- Final frontend build passed; `npm test --prefix HexoraITWeb`: **81 passed**. New basic/advanced form save and organization-PDF selection tests.
- Targeted ESLint on Operations.tsx and OrganizationDocumentation.tsx: passed. Global lint was not rerun; unchanged AuthContext.tsx has the previously documented lint issue. Existing Vite native-loader warning remains.
- `node HexoraITWeb/scripts/preview-operations.mjs`: twelve offline component previews. Headless Edge capture script: eleven screens/overflow checks; basic dark 1280px and light 390px reviewed, no horizontal overflow.
- `py HexoraITWeb/scripts/render-operations-pdf.py basic-documentation`: six-page synthetic organization PDF; current basic content, GPO rows, draft labels and Polish text assertions passed. PDF pages rendered/reviewed. The final metadata-only simplification was regenerated and checked after the focused tests.
- `node HexoraITWeb/scripts/write-operations-catalog.mjs`: 73 actual definitions documented. Root/frontend Polish manuals synchronized. `git diff --check`: passed.

Intermediate failures were fixed: missing SortIndex projection in the new picker query, incomplete test fixture memberships/control metadata, old 72-template assertions and a PostgreSQL test missing its explicit pagination page. Sandboxed .NET execution stalled; successful unrestricted reruns provide the results above.

## 8. Dependencies

No new NuGet/npm dependencies. Existing MIT PDF library, permissively licensed embedded fonts and prior ignored PDF QA tooling reused. Package manifests/lockfiles unchanged.

## 9. Security

Export still requires organization Admin/Owner plus operations read permission. Explicit foreign selections are rejected; no foreign templates/assets/member names are loaded. Secret schema values never enter exported content; conditional visibility and restricted access rules are applied. Existing limits, download headers, rate limiting and scope confirmation remain. Drafts are evidence of saved work, not an approval. Database-local audit remains alterable by database/host administrators; no cryptographic immutability or compliance claim.

## 10. Next work

Continue secure attachments/general entity links and corrections; perform authenticated browser acceptance. No deployment or remote push performed.
