# IT Operations continuation

Continue on `feature/it-operations-changes`; do not edit previous migrations or add runtime dependencies.

Baseline before changes in this continuation: backend build passed (0 warnings/errors); `dotnet test HexoraITApi/HexoraIT.slnx --no-build --no-restore`: 319 passed, 3 skipped, 0 failed (322 total, optional PostgreSQL variables unset). Frontend build passed with the existing Vite warning; `npm test --prefix HexoraITWeb`: 78 passed.

1. Complete all 72 meaningful PL/EN built-in schemas using shared configuration, execution, evidence and review blocks; make change/document lifecycle declarative and test all definitions and lifecycles.
2. Extend bounded schema validation and renderer with closed conditions and useful typed fields; preserve old schemas and reject executable/oversized definitions.
3. Add organization template clone/version publication, activation and validated JSON import/export with isolated storage, immutable published versions and an integrated management UI.
4. Add configurable organization approval policy and retention/control metadata, conservative defaults, authenticated decisions and documented exceptions. Introduce sensitivity protection before accepting restricted template definitions.
5. Check real PostgreSQL upgrades, idempotent seeding, isolation, versions, workflow, PDF and frontend. Review actual UI against existing light/dark themes, record exact results and remaining requirements, commit logical phases.

Attachments/general entity links, correction workflows, archive transfer and remaining optional calendar/evidence-pack capabilities remain a separate following workstream if not completed in this continuation. Keep their status explicit.

Delivered: all 72 definitions, declarative lifecycles, conditions/typed fields, organization template management, policy settings and field sensitivity controls. Verified with PostgreSQL upgrade/concurrency tests, the full regression suites, catalog/PDF checks and light/dark/mobile component previews. See [continuation report](it-operations-continuation-report.md) for exact results and remaining scope.
