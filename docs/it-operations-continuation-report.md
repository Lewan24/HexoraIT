# IT Operations & Changes — continuation report

2026-11-23, branch `feature/it-operations-changes`. This continuation completes the catalog and adds template administration, policy controls and field protection. **The overall requested MVP is still not complete**; remaining work is listed below. No production deployment or remote push was performed.

## 1. Implemented features (requirements mapping)

- §4/§8: all **72 practical PL/EN built-in definitions**, composed from shared configuration, execution, recovery, checklist, follow-up and reporting blocks. All keys A01–A18, B01–B12, C01–C14, D01–D07, E01–E11 and F01–F10 are present. No empty/generic schema-only placeholders.
- §4/§12: bounded AND/OR visibility conditions, numeric/boolean/checkbox/radio/multiselect controls, scalar defaults, numeric bounds, text minima/maxima and named safe regex formats. Backend and renderer support the same closed vocabulary. Arbitrary code/regex remains rejected.
- §4: administrator template search/filter/pagination, clone to organization, JSON import/export, server validation with interactive form preview, edit/publish as a new immutable version, version inspection and activation/deactivation. Old records retain original definitions; new records require active/latest definitions. Restore-test validation profiles survive cloning.
- §6/§9: configurable organization approval policy with conservative defaults, standard preapproval, low/normal approval requirements, high-risk separation of requester/implementer, authorized low-risk self-approval and administrator exceptions with reason/actor/time. Assigned implementers can execute; drafts remain editable by their requester or administrators. Member references can be selected in the form.
- §9/§10: Normal/Restricted/Secret classifications; restricted fields omitted from ordinary API/PDF/revision views and preserved on ordinary edits. Mixed tables with protected cells are hidden as a whole. Secret values/defaults are rejected; secret keys are not persisted. Protected fields cannot drive conditional visibility, including ambiguous root/row shadowing. No automatic secret detection in ordinary text is claimed.
- §6/§10/§13: append-only administration/policy history, decision-time policy snapshots and organization-lock serialization of policy changes/decisions. Configurable retention day count and reporting criteria/deadlines JSON data; no automatic deletion/legal calculation.
- §6/§12: declarative change versus document lifecycles. Operational documents optionally require approval. Pending Approvals includes both awaiting changes and submitted approval-required documents.
- §8: A06 temporary-rule expiry is conditional and enforced server-side. A01/C08/C13 have classification, detection/awareness times and configurable reporting references, deadlines and repeatable authority/CSIRT submission evidence.
- §14/§15: full catalog lifecycle checks, PDF generation for all required MVP templates, upgrade/permission/isolation/version/policy/privacy tests, reviewed mobile/light/dark screens, updated technical documentation, PL/EN guides and synchronized in-app Polish help.

## 2. NOT implemented / partial

The following original requirements still need work:

- Operations attachment entities/endpoints/UI, file-signature/count/size/hash/AV handling and operations-specific attachment backup volume.
- General DocumentEntityLink integration and reverse tabs for networks/groups/incidents/tasks/documents; only the existing single validated asset link/tab is available.
- Corrections/superseding revisions and editing structured execution evidence after submission. Action notes/results are versioned separately; submitted structured fields remain frozen.
- Reference/file field types, separate repeating field groups, full rich-text editing and per-template export configuration. The declarative format uses its own structural validator, not a general executable/third-party JSON Schema dialect.
- Register full-text indexing of JSON key text and all advanced UI filters. Existing register search remains title/description/number; category/date/member API filters are not all exposed in UI.
- Operations ZIP organization transfer. Full database backups remain mandatory; existing organization ZIP export/import excludes operations. Retention is configurable data without a purge/deletion workflow or scheduler.
- Complete unsaved-change protection across sidebar/organization navigation, organization timezone preferences, operations mock/demo transport, and full authenticated browser acceptance.
- Optional phase 2: calendar/conflicts, evidence packs, CSV, retained PDF snapshots/custom branding and the reports/exports hub.
- Later: drag/drop designer, external audit export, hash chain and email notifications. No legal deadline/threshold or compliance-certification claim is introduced.

## 3. Architectural decisions

System definitions remain immutable global versions; organization copies receive generated `ORG_...` keys and authenticated publisher metadata. Mutable activation belongs to organization-specific settings rather than published versions. Policy/configuration history is separate from business activity and protected against ordinary edits/deletion. PostgreSQL advisory locks serialize publication, activation, creation availability checks, policy changes and workflow decisions per organization; tokens detect stale edits. Original organization/user/role permission patterns are retained.

Template content hashes identify the definition serialized at publication. JSONB storage, filtering and JSON reformatting may change byte representation; exported JSON bytes are not claimed to reproduce the stored hash. Existing published versions and hashes are preserved.

Restricted access maps to existing Admin/Owner roles with operations read permission; template/policy writes additionally require operations write access and an active organization. Policy settings never grant the approver role. High-risk approval remains mandatory; low-risk self-approval and documented exceptions only work when enabled and invoked by an authorized administrator. Requester, publisher, decision actor and system timestamps are server-controlled.

PDF export reuses PDFsharp-MigraDoc 6.2.4 (MIT) and existing embedded DejaVu fonts/license notices. Existing local storage remains unchanged; no new attachment service/volume is claimed. No SaaS/cloud processing or telemetry was added.

## 4. Migration created

`20261123171844_AddOperationTemplateAdministration` adds template organization/publisher columns, widens keys, creates OperationTemplateSettings/OperationPolicies/OperationPolicyRevisions, and adds retention checks and the policy-history append-only trigger. The EF model snapshot was updated. Previous migrations were not edited.

The real PostgreSQL test first migrated only through the previous operations migration, inserted an immutable legacy GPO definition, applied the new migration, and seeded twice. It retained the legacy version/hash and appended new definitions. The model has no pending changes. Downgrade refuses to narrow keys while organization templates with extended keys exist; take backups and review rollback rather than silently truncating keys.

## 5. Components added/modified

Backend: `OperationCatalog.Remaining.cs`, `OperationSchema.Features.cs`, `OperationAdministrationService.cs`, new administration entities/mapping/migration, extended OperationSchema/OperationCatalog/OperationService/OperationWorkflow, new endpoints/DI registration, and administration/HTTP/PostgreSQL/catalog tests.

Frontend: `OperationAdministration.tsx`; extended Operations/OperationForm, typed API/validation helpers, localized templates/policy/member actions, QA scripts and tests. Technical docs, catalog, PL/EN guides and both copies of the in-app Polish manual are updated. No unrelated authentication/CORS/header/upload settings were changed.

## 6. Complete seeded catalog and status

The [catalog table](it-operations-catalog.md) lists **all 72 actual keys and PL/EN names**, lifecycle and status, generated from backend fixture definitions. Every template is functional through the shared form/persistence/workflow engine; none is an empty or schema-only placeholder. Module-wide missing features from section 2 still apply.

All 72 were created, submitted and closed in automated tests. All **21 required MVP templates** additionally generated PDFs: A01–A08, A13; B03–B05; C01–C04; D01–D03; E01; F07. This does not claim a separate full browser/layout acceptance test for every template.

## 7. Tests executed: real commands/results

Baseline before continuation:

- `dotnet build HexoraITApi/HexoraIT.slnx --no-restore`: passed, 0 warnings/errors.
- `dotnet test HexoraITApi/HexoraIT.slnx --no-build --no-restore`: **319 passed, 3 skipped, 0 failed, 322 total** (optional PostgreSQL variables unset).
- `npm run build --prefix HexoraITWeb`: passed, existing Vite native-loader warning.
- `npm test --prefix HexoraITWeb`: **78 passed, 0 failed**.

Post-change verification:

| Command / check | Actual result |
|---|---|
| `dotnet build HexoraITApi/HexoraIT.slnx --no-restore` | Pass, 0 warnings/errors |
| `dotnet test HexoraITApi/HexoraIT.slnx --no-restore` with `HEXORA_OPERATIONS_TEST_POSTGRES` set to disposable local PostgreSQL | **335 passed, 2 skipped, 0 failed, 337 total** |
| Focused operations/admin/HTTP filter after privacy/profile changes | **32 passed, 1 skipped, 0 failed** (PostgreSQL opt-in unset for that focused run) |
| `dotnet test ... --filter FullyQualifiedName~PostgreSqlOperationTests` with opt-in set | **1 passed**; upgrade, seeding, 12 concurrent numbers, search, stale writes and history trigger checks |
| `dotnet test ... --filter FullyQualifiedName~OperationAdministrationEndpointTests` | **4 passed**, covering existing ReadOnly/Member/Admin/Owner roles |
| Follow-up `dotnet test ... --filter FullyQualifiedName~OperationEndpointTests` | **1 passed** with explicit distinct old/new GPO values preserved through draft reopening and the complete workflow/PDF |
| Follow-up `dotnet test ... --filter FullyQualifiedName~OperationAdministrationTests` | **9 passed** after adding protected-field visibility-shadowing rejection |
| `npm run build --prefix HexoraITWeb` after user-guide sync | Pass |
| `npm test --prefix HexoraITWeb` after user-guide sync | **79 passed, 0 failed** |
| `npm run lint --prefix HexoraITWeb` | One pre-existing failure in unchanged AuthContext.tsx:86, react-refresh/only-export-components |
| Targeted ESLint on OperationAdministration/Operations/OperationForm/operationForm/API files | Pass, no output/errors |
| `git diff --check` | Pass; normal CRLF notices only |

The catalog lifecycle/PDF checks are loops inside a test, not 72/21 extra test cases added to the xUnit count. The two final skips are the original >4 GiB archive and optional PostgreSQL archive tests. New PostgreSQL operations verification was enabled and passed. Tests use synthetic data and their own randomly named database; the temporary local cached `postgres:17-alpine` container is removed after verification.

Intermediate failures were corrected: a spread-expression syntax error, a test parenthesis, formatter-emitted invalid inline TypeScript member types, and a hook referring to a later declaration. Sandbox EPERM prevented some Node-worker runs; successful escalated reruns supply the results above. The existing EF tools 9/runtime 10 warning and previously known model-filter warnings appeared when scaffolding; ordinary final backend build has zero warnings.

Visual/QA commands actually run:

- `node HexoraITWeb/scripts/preview-operations.mjs`: generated ten offline previews from real components and actual schemas with synthetic props.
- `node HexoraITWeb/scripts/capture-operations-preview.mjs`: nine screenshots/overflow checks including GPO, template library, policy and license dialogs. Library/policy light/dark desktop/mobile images inspected. 390px views had no horizontal overflow; existing navy/ink/edge tokens and controls were retained.
- `py HexoraITWeb/scripts/render-operations-pdf.py`: **7 pages**, Polish text and approval/closure assertions passed. The GPO PDF was rendered again after distinct old/new fixture values were added.
- `node HexoraITWeb/scripts/write-operations-catalog.mjs`: documented 72 actual definitions.
- Root and frontend Polish manuals have identical SHA-256 hashes after synchronization.

These are component visual checks plus HTTP/service integration tests, not an authenticated browser click-through of a production deployment. No real example records were seeded at production startup.

## 8. Dependencies and licenses

**No new NuGet/npm/runtime dependencies in this continuation.** Package manifests/lockfiles are unchanged. Existing PDFsharp-MigraDoc MIT and bundled DejaVu permissive notices are reused. Review scripts use existing Node/Edge/Python and the previous phase's ignored QA-only pypdfium2 installation (Apache-2.0 OR BSD-3-Clause with bundled PDFium notices); no new QA package was installed here.

## 9. Security and known limitations

Template/policy mutation authorization, explicit organization scoping, immutable published versions, fresh tokens, authenticated decision identities, high-risk safeguards, bounded declarative validation and API/PDF/revision filtering are enforced server-side. Scope tests include visible membership in two organizations and reject another organization's template IDs/keys. Protected values are preserved, never echoed through ordinary revision export, and cannot be written by ordinary members. Secret field values are rejected. Policies, exception reasons and action snapshots record server identities/times; activity events contain no raw field values.

There is no automatic recognition of secrets pasted into ordinary text or policy JSON, and no field-level value diff. Store only non-secret policy/reporting data. DB/host administrators can disable triggers/alter backups: database-local audit is not cryptographic or legal immutability. Attachments/general entity links/transfer/corrections remain outstanding. Full database backup is required; organization ZIP transfer is incomplete. No compliance certification or legal-reportability guarantee is claimed.

## 10. Suggested next steps

1. Add secure operations attachments and general scoped entity links/reverse tabs.
2. Add corrections/superseding revisions and structured execution evidence updates with appropriate revision/privacy rules.
3. Include operations in organization backup/restore transfer, complete non-secret searchable text and remaining register controls, and perform authenticated browser acceptance.
4. Extend remaining declarative field capabilities and navigation warnings, then optional calendar/conflicts, evidence packs and retained PDF snapshots.
