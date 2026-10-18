# Tasks: Console Change Lifecycle

## 1. Kit (`iNNfo/specs/bluepriNNts/console/ui-kit.js`)

- [x] 1.1 Add `--innfo-status-unsent` / `--innfo-status-unsent-bg` tokens.
- [x] 1.2 `STATUSES`/`STATUS_HELP` gain `local`; add `STATUS_LABELS` + `statusLabel`.
- [x] 1.3 `StatusBadge({ status, count?, label?, title? })`.
- [x] 1.4 `RailProgress({ total, pending })` (text `pending/total`).
- [x] 1.5 Add `Toast({ title, body }, { onClose })` + `.innfo-change-toast` CSS.
- [x] 1.6 Delete `ReviewedToggle`, `applyReviewedState` and `.innfo-reviewed-toggle` CSS.

## 2. Controller (`iNNfo/specs/bluepriNNts/console/review.js`)

- [x] 2.1 Drop the `reviewed` map + `markReviewed`/`unmarkReviewed`/`reviewed()`.
- [x] 2.2 Replace `reviewState`/`changedIds`; `progressByConcept(elements, drafts)` → `{ total, pending }`.
- [x] 2.3 Add `changeCountsByElement` / `changeStateOf` / `changeTooltip`.
- [x] 2.4 `decorateChangeState` renders ONE badge per row; delete the reviewed toggle decoration.
- [x] 2.5 `showChangeToast` on every draft-save path (edit, new, tag/relation).
- [x] 2.6 Delete the changed-since-last-review filter and its keyboard short-circuit.

## 3. Runtime (`iNNfo/specs/bluepriNNts/console/innfo-runtime.js`)

- [x] 3.1 Remove the per-card "Draft Edit" chip; the table shows `Unsent`.
- [x] 3.2 Rename user-facing draft/changeset strings (banner, dock, export modal).
- [x] 3.3 Keep the exported `_changes_NN.md` artifact and apply contract unchanged.

## 4. Artifacts

- [x] 4.1 `node scripts/build-console-bundle.mjs`.
- [x] 4.2 `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`.
- [x] 4.3 Update `innfo-ui.css` (drop reviewed-toggle / changed-filter rules).

## 5. Specs & Docs

- [x] 5.1 `openspec/specs/console-review-mode/spec.md`.
- [x] 5.2 `openspec/specs/console-ui-kit/spec.md`.
- [x] 5.3 `openspec/specs/console-export-cli/spec.md`.
- [x] 5.4 Rewrite `docs/innfo/documentation/reviewer-guide.md`; touch `manual-editing-risks.md` and `console-ui-kit.md`.

## 6. Tests

- [x] 6.1 Delete `console-review-changed-filter.test.ts`.
- [x] 6.2 Rewrite `console-review-progress.test.ts` (change state + toast + rail).
- [x] 6.3 Update `console-review-badges/math/mode/store`, `console-ui-kit-review/kitchen-sink`, `console-dom`.
- [x] 6.4 Update root tests (`console-element-card`, `console-draft-count-live`, `console-export-view`, `console-sample-custom-view`, `console-view-context`).
- [x] 6.5 New coverage: toast appearance + one change-state signal per row.
