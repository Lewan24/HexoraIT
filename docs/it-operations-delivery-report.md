# IT Operations & Changes — delivery report (2026-11-23)

Historical first-slice report. Current capabilities and verification are in the [continuation report](it-operations-continuation-report.md); the original results below are preserved as historical evidence.

Branch: `feature/it-operations-changes`. **Delivered: working three-template vertical slice. The complete requested MVP is not finished.** No deployment or remote push performed.

## 1. Implemented features (requirements mapping)

- License create/edit: Perpetual disables/clears the expiry control, removes required-date validation, and normalizes saves to the existing non-null `9999-12-31` date contract. Backend returns perpetual licenses as active, including legacy rows; expiry notifications skip them. Other license types keep date selection/validation.
- §2: repository analysis, pre-change baseline and saved [implementation plan](it-operations-implementation-plan.md).
- §4–5: database template versions, strict bounded schema subset, backend/frontend validation, shared field blocks, content-hash idempotent publication, exact version references, JSONB values, relational register fields, concurrency tokens, sequential numbers and PostgreSQL FTS.
- §6, §10: draft persistence/reopen, explicit change transitions, independent administrator approval/rejection, emergency bypass/review, closure/archive, server actor/timestamps, revision snapshots and append-only activity.
- §7: validated single-asset association and Related Changes tab on assets.
- §8: practical localized A02, A06 and D02 definitions with repeatable old/new settings/rules and restore-success verification.
- §11–12: authenticated server PDF export, existing embedded fonts/renderer, PL/EN labels, responsive form/register, My Documents, basic Pending Approvals, read-only template library, inline validation, row add/remove, draft/back/tab-close warnings and history.
- §14–15: service, HTTP, real PostgreSQL and frontend tests; technical/deployment limitations, PL/EN guides and synthetic GPO/firewall/restore examples.

Verified GPO path: create with two configuration settings → save → reopen → submit → route to approval → reject self-approval → approve as another administrator → execute → verify → complete → close → read history/revision → PDF. Invalid shortcuts, stale tokens and outsider read/export/revision access were rejected.

## 2. NOT implemented / partially implemented

- **69 remaining catalog templates are not seeded**. No schema-only placeholder templates are supplied.
- The complete schema/meta-schema, condition operators, numeric/boolean/multiselect/reference/file fields, defaults, repeating groups and regex rules are not implemented. Unsupported definition members/types are rejected.
- No organization template clone/edit/import/export/publish/disable UI/API; the current template library is read-only. Built-ins can evolve by deployment/seeding.
- No organization approval-policy editor/storage, standard preapproval, configurable low-risk self-approval or small-team policy exceptions. Fixed independent approval applies to all change types except emergency bypass; non-change D02 has no approval step.
- No field sensitivity classifications, restricted-field filtering or field-level audit diffs. **Do not use the slice for restricted/secret field workflows**; users must reference the existing password module instead. Ordinary text is not a secret-detection system.
- No operations attachments, signature/hash/count/size/AV lifecycle. Evidence is text references only. The existing file module remains separate.
- No general entity-link table or links to networks/groups/incidents/tasks/documents. One validated asset link is supported; no other Related Changes tabs.
- No superseding/correction workflow. Structured fields freeze on submission; execution/verification/result comments live in action revisions. UI member reassignment is absent.
- Register category/date/member filters exist in API but are not all exposed in the UI. Search covers title/description and numbers, not arbitrary JSON key text. No organization timezone preference.
- Navigation warning covers editor Back and browser unload, not all sidebar/organization switches.
- No configurable control mappings/retention; only built-in reference arrays and archive state. Existing organization ZIP transfer excludes operations. Full database backup is required.
- No calendar/conflict detection, CSV, evidence packs, PDF snapshots/retention, custom branding or Reports/Exports hub. Pending Approvals is a basic filtered register. No operations mock/demo transport or authenticated browser click-through test.
- Later work remains unimplemented: drag/drop designer, external audit export, hash chain, email notifications. No legal reporting thresholds/deadlines are hardcoded.

## 3. Key architectural decisions

Reuse existing JWT/user context, organization/individual permissions, error/validation patterns, BaseEntity filters, localization, theme tokens and **PDFsharp-MigraDoc 6.2.4 (MIT)** with existing embedded **DejaVu fonts (Bitstream Vera/DejaVu permissive license)**. No SaaS, telemetry or new runtime network service was added. Existing repository license is MIT. License notices are already bundled; no revenue-based/copyleft PDF dependency was added. Details and alternatives: [technical documentation](it-operations.md#pdf-and-licenses).

Changes/non-change documents share OperationRecord in this slice. Authenticated transition events serve as approval decisions. Full revisions accompany every save/action. An organization-scoped transaction advisory lock plus unique constraints protect number generation. PostgreSQL FTS uses a GIN expression index. No new attachment volume exists.

EF application guards and PostgreSQL triggers prevent ordinary UPDATE/DELETE of template versions/history. DB/host administrators can disable those protections; this is database-local audit, not cryptographic/legal immutability.

## 4. Migrations created

- `20261123161518_AddOperationsSlice`
- `20261123162102_AddOperationHistoryProtection`

Both were applied successfully to a fresh disposable PostgreSQL database during automated testing. The model snapshot matches the model. **No pre-existing migration was modified.** Existing tables/data are not rewritten by these migrations.

## 5. Backend and frontend components

Backend additions: `Domain/Entities/Operations.cs`, `Application/Operations/{OperationSchema,OperationCatalog,OperationRecordView,OperationService,OperationWorkflow}.cs`, `Api/App/OperationEndpoints.cs`, migrations and operations tests. Integration changes: AppDbContext, Program, AppInitializer, organization permission resource/pickers and RecordOrderService exclusion. LicenseService and expiry notifications were fixed.

Frontend additions: `Operations.tsx`, `OperationForm.tsx`, `api/operations.ts`, `lib/operationForm.ts`, operations tests and offline visual QA scripts. Integration changes: App navigation, Layout, AssetDetails tabs, permissions, PL/EN catalogs and Licenses. No new design system. Existing unrelated AuthContext lint failure remains unchanged.

## 6. Seeded template status (complete list)

| Key | Template | Status |
|---|---|---|
| A02 | Active Directory Group Policy Change | Functional in the supported slice: dynamic form, multiple settings, validation, persisted workflow/history/PDF; global limitations above apply |
| A06 | Firewall Rule Change | Functional in the supported slice: repeatable rules, validation, persisted change lifecycle and common export path; global limitations apply |
| D02 | Backup Restore Test | Functional in the supported slice: restore verification rule, persisted simple document lifecycle and common export path; global limitations apply |

**Schema-only seeded templates: none.** Not seeded: A01, A03–A05, A07–A18; B01–B12; C01–C14; D01, D03–D07; E01–E11; F01–F10. This explicitly falls short of the requested full catalog/MVP.

## 7. Tests executed and baseline comparison

| Command / check | Baseline | Final real result |
|---|---|---|
| `dotnet build HexoraITApi/HexoraIT.slnx` (final with `--no-restore`) | Pass, 0 warnings/errors | Pass, 0 warnings/errors |
| `dotnet test HexoraITApi/HexoraIT.slnx --no-build` (final additionally `--no-restore`, PostgreSQL operations variable set) | 301 pass, 2 skipped, 0 fail; 303 total | **320 pass, 2 skipped, 0 fail; 322 total** |
| `npm run build --prefix HexoraITWeb` | Pass | Pass; same existing Vite native-loader warning |
| `npm test --prefix HexoraITWeb` | 74 pass, 0 fail | **78 pass, 0 fail** |
| `npm run lint --prefix HexoraITWeb` | Not run before source changes | Fails: one error in unchanged `src/context/AuthContext.tsx:86`, `react-refresh/only-export-components` |
| `node_modules/.bin/eslint.cmd src/components/Operations.tsx src/components/OperationForm.tsx src/lib/operationForm.ts src/api/operations.ts` (cwd HexoraITWeb) | N/A | Pass, no output/errors |
| `git diff --check` | Clean starting worktree | Pass (only normal line-ending notices) |

Focused runs actually performed:

- `dotnet test ... --no-restore --filter FullyQualifiedName~ContentModuleServiceTests`: 17 passed, including the perpetual regression.
- `dotnet test ... --no-restore --filter "FullyQualifiedName~OperationTests|FullyQualifiedName~OperationEndpointTests"`: final PostgreSQL-enabled run **18 passed**, no skips/failures. This includes real PostgreSQL migration/number/search/concurrency/trigger checks.
- `dotnet test ... --no-restore --filter FullyQualifiedName~PostgreSqlOperationTests`: 1 passed when run separately.

The PostgreSQL test creates/drops its own randomly named database in a **temporary local `postgres:17-alpine` container from an already cached image**. It applies migrations, checks model consistency/idempotent seeding, races 12 creates, verifies numbers 1–12, searches/paginates, rejects a genuinely stale xmin write, and verifies UPDATE/DELETE history triggers. Final complete suite enabled this test using `HEXORA_OPERATIONS_TEST_POSTGRES` pointing only to that container. The original PostgreSQL archive and >4 GiB archive tests remain skipped because their opt-in variables were not set. The test container was stopped/removed after checks.

Earlier verification failures were fixed: missing localization keys, the new resource leaking into generic record-order metadata, and test-harness assumptions about source quote formatting. One incorrect expected revision count in the new HTTP test was corrected (9 persisted successful actions/saves). Some sandbox runs failed to spawn Node workers (EPERM), and one backend invocation stalled; successful reruns outside the sandbox produced the results above. An intermediate EF1002 warning in a test was removed by using literal SQL command strings; final build has zero warnings.

Visual checks actually performed:

- Offline SSR of actual GPO/license components with compiled app CSS, synthetic props and no external fonts. Headless installed Edge captures at 1280px and 390px. No horizontal overflow in the mobile GPO form; date is disabled/blank for Perpetual and enabled for Subscription. Light/dark images inspected. This is component visual QA, not an authenticated app browser journey.
- Synthetic on-demand PDF from the HTTP workflow test: **7 pages**, all rendered and inspected. Polish glyphs, row content, pagination and approval/closure notes checked; Polish labels corrected after inspection. Local PDFium extraction asserts `ąćęłńóśźż`, independent approval and closure text. `py HexoraITWeb/scripts/render-operations-pdf.py` passed.
- `node HexoraITWeb/scripts/preview-operations.mjs` and `node HexoraITWeb/scripts/capture-operations-preview.mjs` passed; output is under ignored `output/`.

## 8. New dependencies and licenses

- **New NuGet/npm/application dependencies: none.** No package/lock manifests changed.
- Review-only **pypdfium2 5.15.2**: Apache-2.0 OR BSD-3-Clause; bundled PDFium BSD-style license and its shipped third-party notices. Installed only into ignored `output/pdf-qa` to inspect PDFs, not shipped in application/Docker images. License checked against [upstream licensing](https://github.com/pypdfium2-team/pypdfium2#licensing) before installation. Python standard-library code writes the rendered PNGs; no Pillow package was installed.
- Existing reused libraries/fonts: PDFsharp-MigraDoc MIT; DejaVu fonts with bundled permissive Bitstream/DejaVu notices. Existing Node, Edge, Docker and cached PostgreSQL were used for verification.

## 9. Security considerations and known limitations

Organization filtering, explicit parent authorization for history/PDF, validated asset scope, authenticated approval identities, server timestamps, stale token conflicts, closed schema types, URL restrictions, encoded output, ordinary history protections and existing security settings are retained. No history mutation/deletion endpoint exists. No production secrets/example records were seeded.

Restricted-field redaction, secret classifications, attachments, policy exceptions and legal reporting support are **not implemented**. Store only ordinary documentation in this slice, reference secrets from Passwords, and do not claim compliance certification. DB/host administrators retain control over database-local history. ZIP organization transfer is incomplete for operations; use full database backups. No automatic retention deletion is implemented. Full authenticated browser acceptance and production deployment/upgrade review remain outstanding.

## 10. Suggested next steps

1. Implement sensitivity/redaction, attachment security/storage/backup and configurable approval policies before expanding evidence use.
2. Complete the schema/meta-schema and template management/version-publishing API/UI, then seed the remaining 69 meaningful definitions and cover the required 21-template MVP.
3. Generalize entity links, add remaining Related Changes tabs, corrections/superseding revisions, searchable key fields and complete register controls.
4. Integrate organization transfer/retention, finish browser workflow acceptance and deployment review, then optional calendar/evidence packs/PDF snapshots.
5. Fix the existing AuthContext lint issue in a separate focused change. External audit export/hash chaining and the designer remain later work.
