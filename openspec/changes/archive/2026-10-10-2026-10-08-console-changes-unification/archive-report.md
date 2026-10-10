# Archive Report: 2026-10-08-console-changes-unification

**Archived**: 2026-10-10
**Mode**: openspec

## Specs Synced
None — this change carried no delta spec folder.

## Verification
- Implemented in PR #156 (merged). The legacy JSON review export was removed from the console runtime: hidden `[data-innfo="download"]` / `[data-innfo="copy"]` buttons and their wiring, plus the `downloadFeedbackExport` / `copyExport` / `downloadExport` handlers and exports. The preview textarea is `data-innfo="changeset-preview"`; instructions/agent-prompt copy and `fallbackCopy` are changeset-based. `composeExport` API retained.
- Console bundle rebuilt (`build:console`); `check:console-bundle` and the generated shells are fresh.
- Tests repointed to the changeset hooks (`console-review-export.test.ts`, `console-dom.test.ts`, `console-feedback-ui.test.ts`, `test/console-export-filename.test.mjs`); the two legacy-JSON assertions were removed/repointed. CI green.
