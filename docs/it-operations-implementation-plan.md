# IT Operations & Changes — implementation plan

## Evidence and baseline (2026-11-23)

Actual projects: `HexoraITApi/HexoraIT.slnx` (.NET 10 Minimal APIs, EF Core/Npgsql) and `HexoraITWeb` (React 19, Vite, Tailwind 4). Repository license: MIT. No repository AGENTS.md found. Existing migrations must remain unchanged.

Baseline before source changes:
- `dotnet build HexoraITApi/HexoraIT.slnx`: passed, 0 warnings/errors.
- `dotnet test HexoraITApi/HexoraIT.slnx --no-build`: 301 passed, 2 skipped, 0 failed (303 total).
- `npm run build --prefix HexoraITWeb`: passed; existing Vite native-loader warning.
- `npm test --prefix HexoraITWeb`: 74 passed, 0 failed.

## Existing integration points

JWT authentication, security stamps, authenticated user provider; organization memberships and OrgRole ReadOnly/Member/Admin/Owner; module/individual resource read/write overrides for custom roles and clients. BaseEntity query filters enforce membership, active organization and read rules, with PostgreSQL xmin concurrency. App services return ApiOperationResult; Minimal APIs use validation filters and Problem Details. Security audit is separate from business activity history.

Frontend uses AppProvider organization context, PermissionGate, lazy feature screens, permission-driven actions, shared navy/ink/edge theme tokens, responsive layouts, PL/EN i18next catalogs, safe Markdown and shared file preview/attachment controls. AssetDetails already has tabs. There is no general declarative template or approval engine. Existing SMTP notification services, local file storage and signature validation can be reused. PDFsharp-MigraDoc 6.2.4 and embedded DejaVu fonts are already shipped; reuse rather than add dependencies. Existing PDF renderer supports Unicode, long content and page numbering.

Tests: xUnit with SQLite service fixtures and WebApplicationFactory HTTP hosts; optional PostgreSQL and large archive tests; frontend Node test runner with renderer/contract tests. Startup applies migrations. Secrets come from environment; do not read or commit deployment secrets.

## Planned phases and permission matrix

1. Fix Perpetual license expiry control and server normalization; regression checks; commit.
2. Add operations storage, immutable template versions, bounded declarative schema/validation, GPO shared field blocks and idempotent seeding; additive migration.
3. Implement scoped register/detail/create/save, concurrency, revisions/activity, explicit workflow, authenticated approvals and separation of duties; asset links; PDF via existing renderer.
4. Add integrated localized register, GPO dynamic form with repeating old/new settings, draft reopen, workflow/history/export, related asset records, and tests. Commit a verified working slice before catalog expansion.
5. Extend templates and engine, template administration, attachment lifecycle, policy management and remaining MVP capabilities. Only proceed when the slice passes checks. Document any unimplemented requirements explicitly; do not describe schema-only work as completed features.

| Action | ReadOnly | Member | Admin/Owner | Custom roles/clients |
|---|---|---|---|---|
| View, search, PDF | read | read | read | operations read grant |
| Create, edit own draft, submit, execute | no | write | write | operations write grant |
| Edit others | no | no | write | no by default |
| Review, approve, close, archive | no | no | write | no by default |
| Manage templates/policy, restricted fields | no | no | write | no by default |
| Attachments | read download | own draft write | write | same record permission |

High risk approvals separate requester/implementer/approver. Low risk self-approval defaults off. Explicit policy exceptions need reason, actor and time. Sensitive values must never enter ordinary audit diffs. Do not enable unsupported field capabilities. No new dependencies planned. All processing remains self-hosted.

## Verification and scope gates

Verify GPO create → save → reopen → submit → review/approval → schedule/execution → verify → complete → close → history → PDF, with multiple old/new values. Test invalid transitions, cross-organization IDs, stale revisions, self-approval, required fields and Polish PDF generation. Repeat baseline suites plus repository-required lint and diff checks. PostgreSQL deployment and browser checks must be reported separately from SQLite/rendering tests.

Later work: drag/drop designer, external audit sink, hash chaining; no compliance certification claim or hardcoded legal deadlines. Existing SMTP alone does not authorize new notification behavior. Evidence retention and reporting thresholds belong in organization data.

## Delivered state

Phases 1–4 delivered as a scoped slice, with A02/A06/D02, server workflow/history, asset navigation, register and on-demand PDF. Phase 5 and the remainder of the requested MVP are not delivered. Detailed implementation/limitations: [technical documentation](it-operations.md); real test/visual results: [delivery report](it-operations-delivery-report.md).
