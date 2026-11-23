# Basic documents and organization PDF integration

2026-11-23, existing dedicated branch `feature/it-operations-changes`.

Baseline before edits: backend build passed with zero warnings/errors; backend tests 334 passed, 3 optional skips (337 total, PostgreSQL opt-in unset); frontend build passed and 79 tests passed. Existing Vite native-loader warning remains.

Implementation:

1. Seed an additional BASIC operational document with content and optional evidence. Keep all 72 detailed templates and their validation/workflows unchanged. Basic uses the existing draft/submitted/closed lifecycle and versioned persistence, without a migration.
2. Offer Basic document and Advanced template creation in the current operations screen. Hide change-specific administrative inputs on basic records; keep title, summary, content and an optional asset. Existing saved records reopen with their exact schema.
3. Add Operations & Changes to organization PDF options, counts, search and explicit record selection. Include saved drafts with explicit status; render current saved values and repeatable rows using original versioned field labels. Never output raw JSON, secrets or foreign organization records. Preserve existing export authorization and size limits.
4. Verify basic save/reopen/lifecycle and both modes in PDF, selection/isolation, conditional/protected values, existing regressions and responsive theme consistency. Document exact results.

No new dependency, migration or cloud processing is required.

Delivered and verified; see [delivery report](basic-documentation-report.md) for actual commands/results and limitations.
