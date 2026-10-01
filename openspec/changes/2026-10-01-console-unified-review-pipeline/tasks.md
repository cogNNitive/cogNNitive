# Tasks: Console Unified Review Pipeline

## Work Breakdown

### Phase 1: Shell Consolidation & Guard
- [x] 1.1 Delete `business/assets/model_viewer.html` and remove its `assets:` entries.
- [x] 1.2 Collapse orphan thin shells (`analysis`, `documentation`, `innovation`, `organization`, `projects`) to config-driven `artifact_shell.html`.
- [x] 1.3 Create `scripts/lib/console-shell-guard.js` and test suite `console-shell-guard.test.js`.
- [x] 1.4 Wire `console-shell-guard.js` into `scripts/verify.js` and `scripts/check-integrity.js`.

### Phase 2: Core Payload Builder & Schema Conformity
- [x] 2.1 Implement `buildConsolePayload` in `iNNfo/packages/innfo-core` with unit tests for stable model ID, SHA-256 calculation, and relations/citations.
- [x] 2.2 Wire `buildConsolePayload` into `scripts/export-console.mjs` and `workspace/procedures/compile_model_console_NN.md`.
- [x] 2.3 Update `feedback.schema.json` to enforce `source_knowledge` / `source_knowledge_version` and remove deprecated aliases.
- [x] 2.4 Update console bundle feedback export to emit validated `feedback.schema.json` documents and remove deprecated `buildReviewDoc`.

### Phase 3: Design Tokens & Injected Feedback UI
- [x] 3.1 Standardize design tokens (`--innfo-*`) across bundle CSS modules.
- [x] 3.2 Update `innfo-console` bundle to auto-inject feedback banner, button, and modal when `feedback-export` is declared.
- [x] 3.3 Implement `InnfoUI` components (`StatusBadge`, `MetricCard`, modal controls) with consistent styling.

### Phase 4: Unified Reconcile Procedure & Verdict Ledger
- [x] 4.1 Implement `feedback-verdict-ledger` module in `innfo-core` supporting `sources/import/feedback/ledger.jsonl`.
- [x] 4.2 Create canonical `reconcile_feedback_NN.md` procedure and deprecate blueprint-specific `apply_feedback_NN.md` copies.
- [x] 4.3 End-to-end integration test verifying full roundtrip: export -> save -> reconcile -> regenerate console.
- [x] 4.4 Run full verification gate (`scripts/verify.js` and `scripts/check-integrity.js`).

