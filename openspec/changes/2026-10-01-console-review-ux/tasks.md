# Tasks: Console review UX

Change C of 3 (`A 2026-10-01-console-feedback-roundtrip-completion -> B 2026-10-01-console-ui-kit -> C (this)`). Strict TDD: every slice starts with RED tests, proven able to fail before GREEN. Default test environment is happy-dom (`// @vitest-environment happy-dom`); use a jsdom pragma only on a proven divergence (recorded in code comments). Paths: `CONSOLE` = `iNNfo/specs/bluepriNNts/console`, `CORE` = `iNNfo/packages/innfo-core`, `BP` = `iNNfo/specs/bluepriNNts`. Skills to load before PRs: `work-unit-commits`, `chained-pr`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,600 hand-written (additions + deletions, ~50% tests/docs); the regenerated bundle is `-diff` (`.gitattributes`) and excluded |
| Per slice (no bundle) | Slice 1 ~380, Slice 2 ~400, Slice 3 ~380, Slice 4a ~250, Slice 4b ~200 |
| 400-line budget risk | Medium-High (total); each slice within or right at the 400-line limit |
| Chained PRs recommended | Yes |
| Suggested split | Slice 1 (PR 1) -> Slice 2 (PR 2) -> Slice 3 (PR 3) -> Slice 4a (PR 4) -> Slice 4b (PR 5) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (recommendation: feature-branch-chain) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium-High

Recommendation: `feature-branch-chain` continuing from B's chain/tracker branch. PR #1 (Slice 1) base = B's final release branch or tracker; each subsequent PR targets the immediate parent branch; only the tracker merges to `dev`/`main`. Tags (`innfo-console-v*` and `blueprints-v*`) are cut in Slice 4b upon final integration.

### Suggested Work Units

| Unit | Goal | PR | Base / notes |
|------|------|----|------|
| Slice 1 | Store v2, pure math, `draftToItem`, `SOURCES` order, old store deletion in runtime | PR 1 | Base: B tracker / chain end |
| Slice 2 | Toggle, `innfo:rendered` in both renderers, controller decoration, popovers, `prompt` deletion | PR 2 | PR 1 |
| Slice 3 | Reviewed marks, rail progress in both renderers, verdict badges, changed filter, CSS | PR 3 | PR 2 |
| Slice 4a | Export preview, clipboard copy, review-tab `DraftList` rewrite, shell CSS cleanup | PR 4 | PR 3 |
| Slice 4b | Keyboard shortcuts, `aria-live` a11y, mobile CSS, contrast tests, docs, release prep | PR 5 | PR 4 (Final release) |

Conventions for every slice: work-unit commits (tests + code + docs of one behavior together; the regenerated bundle rides with its source in the same commit), conventional commits, no AI attribution.

**Standard gate (G)**, run at the end of every slice: rebuild innfo-core (`npm --workspace=@cognnitive/innfo-core run build`); `npm run lint`; `npm run typecheck`; `npm run test`; `npm run check:console-bundle` (after `npm run build:console`); `node scripts/verify.js`; `node scripts/check-integrity.js`. Never `git add -A`, `add .`, `commit -a`, `stash` or `clean`; stage explicit paths only (shared tree).

---

## Phase 0: Pre-apply gates (resolve before Slice 1)

- [x] 0.1 Confirm Changes A and B are completed and merged into the working branch (C depends on A's payload fields and feedback UI, and B's kit components/tokens).
- [x] 0.2 Confirm chain strategy with the maintainer (`feature-branch-chain` recommended).
- [x] 0.3 Verify baseline integrity: run standard gate G once and record pre-existing warnings/issues.
- [x] 0.4 Verify `CONSOLE/ui-kit.js` from B exports all review components: `DraftList`, `AnnotationPopover`, `ReviewedToggle`, `RailProgress`, `StatusBadge`, `ElementCard`, `FieldRow`, `TOKEN_VALUES`.
- [x] 0.5 Confirm `feedback-ledger.jsonl` location at the domaiNN root as locked in Change A.

---

## Phase 1: Slice 1 - Store v2, pure math, `draftToItem`, and runtime integration (PR 1, ~380 lines)

- [x] 1.1 RED: `CORE/tests/console-review-store.test.ts` (happy-dom). Tests:
  - Store keying: `innfo-console:v2:<modelId>`;
  - Versionrebump with identical `modelId` preserves drafts across sessions;
  - Old `innfo-console:drafts:*` keys are never read, modified or deleted;
  - Corrupted JSON or `v !== 2` returns empty drafts/reviewed;
  - Unknown fields dropped on read;
  - `addDraft` throws `TypeError` if `element_id` or `base_hash` is missing;
  - Null or throwing storage falls back to memory store with `persistent: false`;
  - `markReviewed(id, hash)` and `unmarkReviewed(id)` persist atomically.
  Prove RED by running against absent `review.js`.
- [x] 1.2 RED: `CORE/tests/console-review-math.test.ts`. Tests:
  - `progressByConcept(elements, drafts, reviewed)` -> calculates `reviewed/total` and `pending` drafts per concept;
  - `reviewState(el, reviewed)` -> `none` / `reviewed` (hash match) / `changed` (hash drift);
  - `isTargetChanged(draft, elementsById)` -> true if element missing or `el.hash !== draft.base_hash`;
  - `verdictsByElement(feedbackState)` -> maps `{status: count}` per element, skips orphans;
  - `changedIds(elements, reviewed)` -> returns IDs in `reviewed` where `reviewed[id] !== element.hash`.
  Prove RED on absent functions.
- [x] 1.3 GREEN: create `CONSOLE/review.js` (UMD module, factory with `InnfoUI` dependency):
  - Implement `STORE_PREFIX = 'innfo-console:v2:'`;
  - `createDraftStore(storage, modelId)`;
  - Pure review math functions (`progressByConcept`, `reviewState`, `isTargetChanged`, `verdictsByElement`, `changedIds`);
  - `draftToItem(d)` converting Draft to schema feedback item with `base_hash` and `target.field`.
- [x] 1.4 Update `scripts/lib/console-bundle.js` `SOURCES` list to include `review.js` after `ui-kit.js` and before `innfo-runtime.js`. Update `scripts/lib/console-bundle.test.js` to assert the 6-file order and rebuild the bundle (`npm run build:console`).
- [x] 1.5 GREEN: modify `CONSOLE/innfo-runtime.js`:
  - Delete old store methods: `getDraftKey`, `readStore`, `writeStore`, `addDraft`/`addComment`, `removeDraftItem`/`removeComment`, `getDraftSummary`/`getSummary`;
  - Delete `slugify` if uncalled;
  - Wire `InnfoConsole.boot` to initialize `Review.createDraftStore(localStorage, payload.meta.modelId)`;
  - Update banner draft count and review tab to read from the v2 store;
  - Rebuild console bundle.
- [x] 1.6 REFACTOR: verify clean modular boundaries; ensure no residual references to old `getDraftKey` or `innfo-console:drafts:`.
- [x] 1.7 Run standard gate G (all tests pass, bundle drift clean). Commit: `feat(console): implement draft store v2 and review math`.

---

## Phase 2: Slice 2 - Review toggle, `innfo:rendered`, controller decoration, popovers (PR 2, ~400 lines)

- [x] 2.1 RED: `CORE/tests/console-review-mode.test.ts` (happy-dom). Tests:
  - Review toggle rendered only if `feedback-export` is declared, `meta.modelId` is present, and every element has a 16-hex `hash`;
  - Off by default on load (never persisted);
  - Off state: 0 `[data-innfo-review-ctl]` elements in DOM;
  - On state: `html[data-innfo-review="on"]`, `aria-pressed="true"`, decoration added to every card;
  - Toggle off cleans up all injected review controls;
  - Re-render / search filter in viewer dispatches `innfo:rendered` and controller idempotently re-decorates;
  - Both `InnfoConsole` and `InnfoModelViewer` produce identical decoration sets for the same payload.
  Prove RED.
- [x] 2.2 RED: `CORE/tests/console-review-popover.test.ts` (happy-dom). Tests:
  - Card anchor opens popover offering `comment` and `delete` (no `target.field`);
  - Field row anchor (`[data-innfo-component="field-row"][data-field]`) offers `comment` and `correction` (prefills `original` from payload, writes `target.field`);
  - Saving draft updates store with current element `hash` as `base_hash`;
  - Escape or Cancel closes popover without saving and restores focus to anchor;
  - Source scan: zero calls to `prompt(` across `CONSOLE/*.js`.
  Prove RED.
- [x] 2.3 GREEN: in `CONSOLE/review.js`, implement `createReviewController(doc, { meta, elements, needs, store })`:
  - `enable()`, `disable()`, `decorate(root)`, `destroy()`;
  - DOM decoration logic for card and field anchors;
  - Popover attachment using `InnfoUI.AnnotationPopover`;
  - Focus trap and Escape/Cancel management.
- [x] 2.4 GREEN: modify `CONSOLE/render-model-viewer.js` and `CONSOLE/innfo-runtime.js`:
  - Dispatch `doc.dispatchEvent(new CustomEvent('innfo:rendered', { detail: { root } }))` at card-commit points (after `mountElementCards` in runtime `refresh()`, and at end of viewer `render()`);
  - Remove all occurrences of `prompt(` (in `suggestFor` and reviewer-chip edit);
  - Remove B D19's temporary Suggest button and card draft-count badge;
  - Rebuild console bundle.
- [x] 2.5 REFACTOR: ensure clean event listeners and teardown on controller `destroy()`.
- [x] 2.6 Run standard gate G. Commit: `feat(console): add review mode controller, innfo:rendered event and popover annotation`.

---

## Phase 3: Slice 3 - Reviewed marks, rail progress, verdict badges, changed filter (PR 3, ~380 lines)

- [x] 3.1 RED: `CORE/tests/console-review-progress.test.ts` (happy-dom). Tests:
  - Element card shows `ReviewedToggle`; marking reviewed persists `{ [element_id]: hash }` in store;
  - Hash match counts toward `reviewed`; hash drift marks toggle as `changed` and decrements count;
  - `RailProgress` attached to concept pills in both `InnfoConsole` and `InnfoModelViewer` rails, showing `r/t` and pending drafts;
  - Active search filter does not alter concept totals.
  Prove RED.
- [x] 3.2 RED: `CORE/tests/console-review-badges.test.ts` (happy-dom). Tests:
  - `meta.feedbackState` renders `StatusBadge` in `.innfo-card-head [data-innfo-review-badges]`;
  - Badges render with review mode OFF;
  - Badges derive strictly from `feedbackState`, never from local drafts;
  - Orphan feedback entries targeting deleted elements are silently ignored.
  Prove RED.
- [x] 3.3 RED: `CORE/tests/console-review-changed-filter.test.ts`. Tests:
  - Changed filter button sets `html[data-innfo-filter="changed"]`;
  - Cards matching `changedIds` carry `data-innfo-changed`;
  - Cards without changes are hidden via CSS;
  - Empty state when changed count is 0.
  Prove RED.
- [x] 3.4 GREEN: in `CONSOLE/review.js`:
  - Integrate `ReviewedToggle` and `RailProgress` decoration;
  - Implement `verdictsByElement` decoration into `.innfo-card-head [data-innfo-review-badges]`;
  - Wire changed filter toggle and class/attribute application;
  - Add review mode styles to `COMPONENT_CSS` in `CONSOLE/ui-kit.js` using `--innfo-*` tokens.
- [x] 3.5 Rebuild console bundle (`npm run build:console`).
- [x] 3.6 REFACTOR: verify CSS isolation and token conformance across light and dark themes.
- [x] 3.7 Run standard gate G. Commit: `feat(console): implement reviewed progress, verdict badges and changed filter`.

---

## Phase 4: Slice 4a - Export preview, clipboard copy, review-tab rewrite, shell CSS cleanup (PR 4, ~250 lines)

- [x] 4.1 RED: `CORE/tests/console-review-export.test.ts` (happy-dom / jsdom where needed). Tests:
  - Opening feedback modal renders export preview (`DraftList`);
  - `buildExportDoc` + `validateFeedback` run on open and on identifier change;
  - Invalid drafts disable download and copy buttons, display validation error list;
  - Serialized export JSON (`serializeFeedback`) is held once in memory; download and clipboard write exact same bytes;
  - Clipboard copy: tests `navigator.clipboard.writeText`, falls back to `execCommand('copy')`, announces status in `[data-innfo="copy-status"][role="status"]` without throwing;
  - Exported payload carries `base_hash` per item, no `status`.
  Prove RED.
- [x] 4.2 RED: `CORE/tests/console-review-tab.test.ts`. Tests:
  - `renderReviewTab` in `artifact_shell.html` renders using `InnfoUI.DraftList` from v2 store;
  - Legacy `.innfo-review-*` shell CSS rules are deleted.
  Prove RED.
- [x] 4.3 GREEN: in `CONSOLE/innfo-runtime.js`:
  - Extend `#innfo-feedback-modal` with `DraftList` preview, JSON textarea, copy button and copy status announcer;
  - Implement `serializeFeedback(doc)`;
  - Implement clipboard fallback handler;
  - Rewrite `renderReviewTab` to use `DraftList`.
- [x] 4.4 GREEN: in `CONSOLE/artifact_shell.html`:
  - Remove obsolete `.innfo-review-*` and chip-edit CSS styles;
  - Rebuild console bundle.
- [x] 4.5 REFACTOR: audit and clean modal DOM manipulation and event handlers.
- [x] 4.6 Run standard gate G. Commit: `feat(console): add export preview, clipboard copy and review tab migration`.

---

## Phase 5: Slice 4b - Keyboard access, a11y, mobile CSS, contrast tests, docs, release prep (PR 5, ~200 lines)

- [x] 5.1 RED: `CORE/tests/console-review-keyboard.test.ts` (happy-dom). Tests:
  - `j` and `k` navigate focus across visible element cards when review mode is on;
  - `c` opens field popover if focus is inside a field row, otherwise card popover;
  - Keystrokes ignored inside `input`, `textarea`, `select`, `[contenteditable]`, or when modifier keys (Ctrl/Meta/Alt) are pressed;
  - Popover traps Tab focus; Escape restores focus to previous anchor;
  - `[data-innfo="draft-count"]` has `role="status"` and `aria-live="polite"`.
  Prove RED.
- [x] 5.2 RED: `CORE/tests/console-review-contrast.test.ts`. Tests:
  - Contrast ratios for all C14 token pairs (text vs surface >= 4.5:1, focus ring >= 3:1) in both light and dark modes.
  Prove RED.
- [x] 5.3 GREEN: in `CONSOLE/review.js` & `CONSOLE/ui-kit.js`:
  - Attach global keyboard listener during review mode;
  - Implement `j`/`k`/`c` card navigation;
  - Add `@media (max-width: 640px)` styles for stacked review bar and full-width popovers;
  - Ensure all contrast pairs satisfy WCAG AA;
  - Rebuild console bundle.
- [x] 5.4 GREEN: update `docs/innfo/documentation/reviewer-guide.md` with:
  - Review mode toggle instructions;
  - Keyboard shortcut references;
  - Explanation that drafts under v1 keys are not migrated;
  - Export preview and clipboard copy workflows.
- [x] 5.5 Release preparation:
  - Bump `console_assets` version in `manifest/source.yaml`;
  - Repin console asset references in `artifact_shell.html`, `model_console.html`, `timeline.html`, `procedure_console.html`;
  - Bump `channels.stable.refs.blueprints` in `manifest/source.yaml`;
  - Run `npm run build:console`, `npm run sync:versions`, `npm run check:versions`, `npm run check:console-bundle`;
  - Run `node scripts/verify.js` and `node scripts/check-integrity.js`.
- [ ] 5.6 (deferred to nn-dev-release) Tag release rehearsal in detached worktree (`git worktree add --detach temp/rehearsal`). Verify clean `--release` integrity check.
- [x] 5.7 Run standard gate G. Commit: `feat(console): complete keyboard a11y, contrast guarantees, reviewer docs and release prep`.

## Hand-off from Change B (release checklist, D14)

Change B (`2026-10-01-console-ui-kit`) ships **no tag of its own**; it releases
together with C under **one** `innfo-console-v*` tag. At release time:

- Next **minor** above the highest existing `innfo-console-v*` tag.
- Bump **all three** `console_assets` entries in `manifest/source.yaml` (shared
  ref key) — assets are ignored by the immutability guard, so there is **no**
  `blueprint_version` bump.
- Run `npm run build:console`, `npm run sync:versions`, `npm run check:versions`,
  `npm run check:console-bundle`.
- Bump the shell CDN pins (`artifact_shell.html`, `timeline.html`,
  `procedure_console.html`, `model_console.html`) to the new tag.
- Bump `channels.stable.refs[blueprints]` (`0.19.1` currently; A plans `0.20.0`).
- Run `node scripts/verify.js` and `node scripts/check-integrity.js` (use a
  detached worktree if the tree is dirty).
- Merge `dev` -> `main` as a **merge commit**, then tag `innfo-console-vX.Y.Z`
  and `blueprints-vA.B.C`. **No** `innfo-mcp-v*` or `skills-v*` tag.

## Apply session notes (Change C)

All slices 1-4b are implemented on `session/console-review-ux` (chained on B's
`8cc1dd06`). Commits: `c3ea9a40` (1), `f4af9ffe` (2), `74c29398` (3), `424e1723`
(4a), `8c7b21a7` (4b), `5cf110ec` (kitchen-sink lint fix). Gate green at every
slice (`innfo-core` 1162+ tests, `verify.js` 100%, `check-integrity` OK,
`check:console-bundle` fresh).

Release-prep state on the branch:

- `iNNfo/specs/bluepriNNts/console/package.json` bumped `0.7.3` -> `0.8.0`
  (next minor above the highest `innfo-console-v0.7.3` tag).
- `node scripts/build-console-shells.mjs` repinned 4 generated shells to
  `@innfo-console-v0.8.0`; bundle rebuilt at `0.8.0`.
- `sync:versions` / `check:versions` / `check:console-bundle` all green.
- The `manifest/source.yaml` `console_assets` entries carry **no** version field
  (source.yaml sync was removed under tag-driven release AD-6), so D14's "bump
  all three `console_assets`" is a no-op in this repo: the pin derives from
  `console/package.json` via `console-release-info.js`.
- **5.6 rehearsal deferred**: `check-integrity.js --release` runs the full CI
  mirror including `innfo-editor`'s `vitest`, which is not resolvable through the
  session worktree's `node_modules` junctions. Run it in the primary checkout
  during `nn-dev-release`, before tagging.
- The `0.8.0` CDN URL only resolves after the tag is cut; until then the pin is
  intentionally ahead of the published tag.

