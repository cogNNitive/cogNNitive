# Archive Report: 2026-10-10-domaiNN-root-canonicalization

**Archived**: 2026-10-10
**Mode**: openspec

## Specs Synced
None — this change carried no delta spec folder (blueprint + content work).

## Verification
- **No tasks.md / verify-report.md existed**; archived with the reconciliation below.
- S1 (rename) present: the dogfooding root is `ecosystem_NN/` (tracked), `eslint.config.mjs:29` references `ecosystem_NN/**`, and `.gitignore` now carries the `ecosystem_NN/specs/**` cache rule. The stale untracked `workspace_NN/` cache dir was removed.
- S2 (blueprint `bluepriNNts` concept) present: `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md` defines it and `catalog.json` is regenerated.
- S3 (root canonicalization) present: `ecosystem_NN/domaiNN_NN.md` uses the canonical `# NN bluepriNNts` / `# NN kNNowledge` concepts; the four `docs/cognitive_nn/use-cases/*` roots are migrated.
- Follow-up: the last `CONCEPT_DRIFT_WARNING` on the dogfooding root clears only after the `domaiNN` blueprint ships via a `blueprints-v*` release — tracked as backlog item 32 (non-blocking).
