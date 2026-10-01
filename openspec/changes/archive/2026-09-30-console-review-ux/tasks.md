# Tasks: Console review UX

Change 4 of 4 (last in the chain). Requires changes 1 (`console-cleanup-and-lint`), 2 (`console-design-tokens-and-ui-kit`) and 3 (`console-feedback-roundtrip`) applied. Strict TDD: every slice starts with RED tests, each proven able to fail before GREEN. Default test environment is happy-dom (`// @vitest-environment happy-dom`); use a jsdom pragma only on a proven divergence (record it in a code comment). Paths: `CON` = `iNNfo/specs/bluepriNNts/console`, `CORE` = `iNNfo/packages/innfo-core`.

Gates run at the end of every slice: `npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/verify.js`, `node scripts/check-integrity.js`, `npm run check:console-bundle` (after `npm run build:console`). `format:check` is informational: introduce zero new drift.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,500-1,700 hand-written (about 55% tests/docs); the regenerated bundle is hidden by `.gitattributes` (`*.bundle.js -diff`) |
| Per slice (no bundle) | S1 ~350, S2a ~330, S2b ~200, S3 ~250, S4 ~400 (at the limit), S5 <100 |
| 400-line budget risk | High (total); each slice is Low-Medium, S4 is Medium |
| Chained PRs recommended | Yes |
| Suggested split | S1 -> S2a -> S2b -> S3 -> S4 -> S5 (6 chained PRs; design slice 2 is split into 2a/2b) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (recommendation: feature-branch-chain) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Recommendation: `feature-branch-chain`, the same strategy as changes 2 and 3. S1 leaves an intermediate state (status select deleted, `window.prompt` annotation still present), S2a-S3 add controls piecemeal, and the release (S5) needs the whole chain on `dev` -> `main` as one merge commit. A tracker branch gives one integration point and rollback control. `stacked-to-main` is not advised: S1-S3 should not reach `main` alone. PR #1 base = the tracker (or the last branch of change 3's chain); each later PR targets the previous PR branch.

### Suggested Work Units

| Unit | Goal | PR | Base / notes |
|------|------|----|------|
| S1 | `review.js` store v2 + math, `SOURCES`, export reads v2, old store and status select deleted | PR 1 | Base = tracker / change 3's last branch. Standalone, green. |
| S2a | Review toggle, `innfo:rendered`, controller decoration, annotation popover, anchors, `suggestFor` deleted | PR 2 | Base = PR 1. Depends on S1 store. |
| S2b | Reviewed toggle and rail progress/pending counts | PR 3 | Base = PR 2. Split point only if S2 measures over 400. |
| S3 | Verdict badges and changed-since filter | PR 4 | Base = PR 3 |
| S4 | Export preview, clipboard, keyboard, aria-live, narrow CSS, contrast, reviewer guide | PR 5 | Base = PR 4. If over 400 at PR time, split by commit group: 4-A (preview, clipboard, DraftList) / 4-B (keyboard, a11y, contrast, docs). |
| S5 | Release: version bump, tags, repin | PR 6 | Base = PR 5. Tags only after the merge to `main`. |

Work-unit commit rule (`work-unit-commits`): one Conventional Commit per numbered group below; tests live in the same commit as the behavior; the bundle is regenerated in the same commit as the source that changes it. No AI attribution. Stage explicit paths only (no `git add -A`, `.`, or `commit -a`; the tree is shared). Every child PR carries a dependency diagram marking the current PR with the pointer marker, states start/end/out-of-scope, and stays at or below 400 changed lines (`chained-pr`).

### Cross-change dependencies

- Change 2 (amended, see its tasks) must expose `InnfoUI.TOKEN_VALUES = {light, dark}` and generate its token CSS from it; new pieces `AnnotationPopover`, `ReviewedToggle`, `ReviewProgress`, `DraftList`, `ReviewToggle` are added to the kit by THIS change, not change 2.
- Change 3 (amended, see its tasks): its `suggest` option on `ElementCard` and delegated `[data-innfo-suggest]` listener are replaced by this change's controller. Console exports carry no `status`.
- Legacy `templates/console` URLs and pins stay with the nomenclature rename change.

## Phase 0: Pre-apply gates (manual; record each answer in apply-progress)

- [ ] 0.1 Confirm changes 1-3 are applied: `CON/ui-kit.js`, `scripts/lib/console-bundle.js`, `scripts/lib/console-shell-guard.js` exist; payload carries `meta.modelId`, `meta.feedbackState`, element `hash`; `ensureFeedbackUi` / `[data-innfo-feedback-root]` and `#innfo-feedback-modal` exist in `CON/innfo-runtime.js`. If change 3 slipped, STOP (hard dependency; the alternative is absorbing its export-conformance work here).
- [ ] 0.2 Re-baseline line references: design offsets are pre-change-2/3. Run `rg -n "getDraftKey|readStore|writeStore|updateDraftStatus|removeDraftItem|suggestFor|data-innfo-suggest|draftToItem|downloadReviewExport" CON --glob "*.js"` and note real locations.
- [ ] 0.3 Contrast gate (likely to force a token change): compute WCAG ratios for `TOKEN_VALUES` status text on status-bg. Hand estimates suggest `#d97706` on `#fef3c7` is about 2.9:1 and `#16a34a`/`#dc2626`/`#6b7280` on their light backgrounds are also below 4.5:1 (unverified; the S4 test is authoritative). If change 2 is not yet released, fix the values there (see its amendment); otherwise change them in S4 task 4.9.
- [ ] 0.4 Release gate: read change 1's pin-coherence lint. If it requires shell pins (`artifact_shell.html`, `model_console.html`, `timeline.html`, `procedure_console.html`) to equal the new console version, a repin edits `iNNfo/specs/bluepriNNts/**` and a `blueprints-v*` tag plus `template_version` bumps are required in S5; otherwise no blueprint tag.
- [ ] 0.5 Release gate: `rg "InnfoConsole|innfo-console.bundle" iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js iNNfo/packages/innfo-core/src/schema/canonical-registry.ts`. If the MCP bundle embeds console assets, S5 also needs an `innfo-mcp-v*` tag; expected result: no.
- [ ] 0.6 Run `npm --workspace=@cognnitive/innfo-core run build` before any `innfo-mcp` test; re-run preflight-touching tests with empty `USERPROFILE` and `HOME`.

## Slice 1: Durable draft store v2 (PR 1)

Seams under test (confirm with the maintainer before writing tests): `createDraftStore`, `draftToItem`, `isTargetChanged`, `reviewState`, `progressByConcept`, `serializeFeedback`, and the booted console export.

- [ ] 1.1 RED: `CORE/tests/console-review-store.test.ts` with a fake Storage. Cases: same `modelId` at two versions keeps drafts (rebump); old `innfo-console:drafts:*` key neither read nor deleted; unknown fields dropped; corrupt JSON loads empty; null or throwing storage gives `persistent:false` and in-memory drafts; ids `fb-001`, `fb-002`; `markReviewed`/`unmarkReviewed`; exactly one `setItem` per mutation; drafts carry no `status`. Literal expectations. Confirm red (module missing).
- [ ] 1.2 RED: `CORE/tests/console-review-math.test.ts`: `isTargetChanged` (hash differs, element missing, equal); `reviewState` none/reviewed/changed; `progressByConcept` (4 elements, 1 reviewed, 2 drafts gives `{reviewed:1,total:4,pending:2}`); `draftToItem` literal (field omitted for card anchors, `base_hash` present, no `status`); `serializeFeedback` equals a literal 2-space JSON plus `\n`.
- [ ] 1.3 RED: re-point `CORE/tests/console-{dom,feedback,runtime}.test.ts` and `test/console-review.test.mjs` to the new API: export items built via `InnfoReview.draftToItem`; no status `<select>` in the draft list; `InnfoReview` added to the bundle-globals check; bundle test asserts `SOURCES` order `uplot, visuals, ui-kit, review, innfo-runtime, render-model-viewer, stepper`. Confirm red.
- [ ] 1.4 GREEN: create `CON/review.js` (UMD, `factory(require('./ui-kit.js'))` / `factory(root.InnfoUI)`; `STORE_PREFIX = 'innfo-console:v2:'`; store, math, `draftToItem` moved from the runtime, `serializeFeedback`). New relative requires carry `.js`.
- [ ] 1.5 GREEN: `scripts/lib/console-bundle.js` `SOURCES` adds `review.js` between `ui-kit.js` and `innfo-runtime.js`.
- [ ] 1.6 GREEN: `CON/innfo-runtime.js` boot builds the store from `localStorage` and `meta.modelId`; export reads drafts from the store. Delete `getDraftKey`, `readStore`/`writeStore`, `addDraft`/`addComment`, `updateDraftStatus`/`updateStatus`, `removeDraftItem`/`removeComment`, `getDraftSummary`/`getSummary`, the status `<select>`, and the runtime `draftToItem`. `suggestFor` (prompt kept until S2a) writes through the v2 store; with no `modelId` the suggest control is not rendered (add a RED case first).
- [ ] 1.7 Prove red: make the store key use the title instead of `modelId`; the rebump test MUST fail; revert. Corrupt the `base_hash` mapping in `draftToItem`; the math test MUST fail; revert.
- [ ] 1.8 REFACTOR: tidy store helpers; no behavior change; tests stay green. Regenerate the bundle.
- [ ] 1.9 Slice goal: `rg "updateDraftStatus|getDraftKey" CON --glob "*.js"` is empty. Run the slice gates. Commit: `feat(console): add durable draft store v2 and review math`.

## Slice 2a: Review mode, popover, anchors (PR 2)

- [ ] 2a.1 RED: `CORE/tests/console-review-popover.test.ts`: `AnnotationPopover` is `div[role=dialog][aria-modal=true]`; kinds per anchor (card: comment, delete; field: comment, correction); correction shows prefilled `original` and a `proposed` input; Tab/Shift+Tab wrap; Escape calls `onCancel` and restores focus to the anchor; Enter saves, Shift+Enter inserts a newline; only one popover open; `TypeError` naming the component on bad data; `ReviewToggle` exposes `aria-pressed`.
- [ ] 2a.2 RED: `CORE/tests/console-review-mode.test.ts`, both `artifact_shell.html` and `model_console.html` booted with one payload: off gives zero `[data-innfo-review-ctl]`; toggle on gives identical decorations in both shells and `aria-pressed="true"`; toggle off removes them and `data-innfo-review` on `<html>`; decorations survive a viewer search re-render (`innfo:rendered`); field correction saves `target.field` and `original:"A"` taken from the payload element; card comment has no `field`; Escape leaves the count unchanged; no `modelId` or an element without `hash` renders no toggle; no `fetch(`, `type=module`, `import(` in the bundle.
- [ ] 2a.3 GREEN: `CON/ui-kit.js` adds `ReviewToggle` and `AnnotationPopover` (inline after the anchor, no absolute positioning) with token-only CSS in the kit `<style>`.
- [ ] 2a.4 GREEN: `CON/review.js` `createReviewController(doc, {meta, elements, store})` with `enable/disable/decorate/destroy`; idempotent via `data-innfo-review-ctl`; decorates `[data-innfo-component=ElementCard]` and `FieldRow`; sets `data-innfo-review` on `<html>`; one popover at a time.
- [ ] 2a.5 GREEN: `CON/innfo-runtime.js` dispatches `innfo:rendered` (`detail.root`) after each `refresh`, creates the controller once inside `[data-innfo-feedback-root]`, renders the toggle and a plain draft count in a review bar.
- [ ] 2a.6 GREEN: `CON/render-model-viewer.js` dispatches `innfo:rendered` after `render` and the rail build; drop the `suggest` ElementCard opt. Delete `suggestFor` (`window.prompt`) and change 3's delegated `[data-innfo-suggest]` listener from the runtime.
- [ ] 2a.7 Prove red: remove the `data-innfo-review-ctl` idempotence guard; the double-decoration assertion MUST fail; revert. Skip the `innfo:rendered` dispatch in the viewer; the search re-render test MUST fail; revert.
- [ ] 2a.8 REFACTOR; regenerate the bundle. Slice goal: `rg "suggestFor|window\.prompt|data-innfo-suggest" CON --glob "*.js"` is empty. Run the slice gates. Commit: `feat(console): add review mode and inline annotation popover`.

## Slice 2b: Reviewed marks and rail progress (PR 3)

- [ ] 2b.1 RED: `ReviewedToggle` and `ReviewProgress` kit tests (state attributes, literal text `2/4`, pending count, `TypeError`).
- [ ] 2b.2 RED: extend `console-review-mode.test.ts`: 4 elements, 1 reviewed, 2 drafts, mark another gives `2/4` and pending `2`; reviewed survives a reload (new store over the same fake Storage); a mark with a differing hash shows "changed" and does not count; totals unchanged while a search filter is active; adding/removing a draft updates pending; progress appears beside each `ConceptPill` in both shells.
- [ ] 2b.3 GREEN: add `ReviewedToggle` and `ReviewProgress` to `CON/ui-kit.js`; the controller decorates a reviewed toggle per card and rail progress after each `innfo:rendered`, using `progressByConcept` and `store.markReviewed/unmarkReviewed`.
- [ ] 2b.4 Prove red: count stale marks as reviewed; the stale-mark test MUST fail; revert.
- [ ] 2b.5 REFACTOR; regenerate the bundle; run the slice gates. Commit: `feat(console): add reviewed marks and rail progress`.

## Slice 3: Verdict badges and changed filter (PR 4)

- [ ] 3.1 RED: extend `console-review-math.test.ts`: `verdictsByElement` literal `{applied:1,pending:1}` per `element_id` (including `stale`); `changedIds` (never-reviewed not changed; `h1` then `h2` changed; unchanged reviewed not listed).
- [ ] 3.2 RED: `CORE/tests/console-review-badges.test.ts`: `feedbackState` `{id:"fb-001",status:"applied"}` gives one `applied` StatusBadge on that element; a local draft with no entry gives no badge; badges visible with review mode off; `stale` rendered; count shown for repeated status; an entry for a missing element renders nothing. Changed filter: `data-innfo-filter=changed` on `<html>` and `data-innfo-changed` marks; unchanged reviewed cards hidden (assert the kit CSS rule exists, since happy-dom may not compute it); composes with the module search and concept filter; count and empty state for 0.
- [ ] 3.3 GREEN: `CON/review.js` adds `verdictsByElement` and `changedIds`; the controller renders one `StatusBadge({status,count})` per status in the card head and owns the filter toggle and the review-bar count.
- [ ] 3.4 GREEN: `CON/ui-kit.js` CSS for `[data-innfo-filter=changed]` hiding unmarked cards (token-only).
- [ ] 3.5 Prove red: derive badges from drafts instead of `feedbackState`; the "draft is not a verdict" test MUST fail; revert.
- [ ] 3.6 Regenerate the bundle; run the slice gates. Commit: `feat(console): add verdict badges and changed-since-review filter`.

## Slice 4: Export preview, keyboard, accessibility (PR 5)

Commit group 4-A (tasks 4.1, 4.2, 4.5, 4.6) and 4-B (tasks 4.3, 4.4, 4.7-4.10) are separable PRs if the slice measures over 400 lines.

- [ ] 4.1 RED: `CORE/tests/console-review-export.test.ts`: invalid draft leaves download and copy disabled and lists errors by item id; changing the identifier input rebuilds `exportDoc` and revalidates; clipboard text equals the download blob text (both via `serializeFeedback`); `navigator.clipboard` undefined uses the `execCommand('copy')` fallback; both failing leaves the text selected with a "Press Ctrl+C" message; the outcome lands in the `role=status` region. Prove the stubs can go red by running them first against the pre-change download path (guard disabled).
- [ ] 4.2 RED: `DraftList` kit tests (kind, target, text, "target changed" text label with the stale token, delete; no status control) and target-changed scenarios: hash mismatch and missing element both flag "target changed", stay exportable with their original `base_hash`; old-key drafts not shown.
- [ ] 4.3 RED: `CORE/tests/console-review-keyboard.test.ts` (dispatched `KeyboardEvent`): `j`, `c`, typing, Enter saves a draft on the next card and the counter text updates; `k` goes back; `c` inside a `FieldRow` opens the field anchor; `j` inside the popover textarea is inert; Ctrl/Meta/Alt ignored; listener attached only while review mode is on; focus returns to the anchor after save.
- [ ] 4.4 RED: `CORE/tests/console-review-contrast.test.ts` over `InnfoUI.TOKEN_VALUES` for light and dark: 4.5:1 for text/bg and status/status-bg pairs, 3:1 for UI pairs (focus ring). Guard the calculator against a tautology with independent literals: black on white is 21, `#767676` on white is about 4.54, `#777777` on white is about 4.48.
- [ ] 4.5 GREEN: `CON/ui-kit.js` adds `DraftList`; `CON/innfo-runtime.js` extends `#innfo-feedback-modal` into the preview: one `exportDoc` per render, live `validateFeedback`, errors by id, download and copy disabled while invalid, read-only JSON `<textarea>`, clipboard with fallback and status messages; `renderReviewTab` uses `DraftList`.
- [ ] 4.6 REFACTOR 4-A: single `serializeFeedback` path for download and copy; regenerate bundle; gates. Commit: `feat(console): add validating export preview with clipboard copy`.
- [ ] 4.7 GREEN: one `document` keydown listener in `CON/review.js` active only in review mode (skips `input`, `textarea`, `select`, `[contenteditable]`, modifiers, open popover); cards get `tabindex=-1`; draft counter `span[role=status][aria-live=polite]` in the review bar.
- [ ] 4.8 GREEN: kit CSS: `--innfo-focus` ring and `@media (max-width:640px)` stacking the review bar and making the popover full-width; tokens only.
- [ ] 4.9 GREEN: make 4.4 pass. If `TOKEN_VALUES` is missing, add it to `CON/ui-kit.js` and generate the token CSS from it. If gate 0.3 found failing pairs, change the status token values (light and dark); update every test or fixture that asserts the old hex literals (change 2's token tests, kitchen sink); record the new values in `docs/innfo/documentation/console-ui-kit.md`.
- [ ] 4.10 Docs: `docs/innfo/documentation/reviewer-guide.md` (review flow, shortcuts `j`/`k`/`c`/Enter/Escape, export preview, old-key drafts dropped); keep split code spans for any `cogNNitive/iNNfo` slug (`check:spec-urls`). Coordinate with change 3's edit at `:37`.
- [ ] 4.11 Offline and keyboard manual check: open the kitchen sink and `model_console.html` by double-click (no network), complete one review by keyboard only, toggle `data-theme="dark"`, resize below 640px; note results in the PR. Regenerate bundle; run the slice gates. Commit 4-B: `feat(console): add keyboard navigation, live counter and contrast guard`.

## Slice 5: Release (PR 6; after the chain lands on `dev`, merged to `main` as a merge commit)

Note: the `nn-dev-release` skill text is stale (it says `templates-v*`). REAL tags: `innfo-console-v*` (certain) and `blueprints-v*` (only per gate 0.4). No `innfo-mcp-v*` or `skills-v*` tag (design; confirm gate 0.5). Verify key names in `manifest/source.yaml` (`console_assets` ref key `innfo-console`; stable refs `blueprints`, `innfo-console`) before tagging.

- [ ] 5.1 Choose the console version: next minor above the highest published `innfo-console-v*` tag at release time (`0.6.0` before changes 2 and 3; each takes a minor). Bump all `console_assets` entries (shared ref key) in `manifest/source.yaml`.
- [ ] 5.2 Run `npm run build:console`, `node scripts/sync-versions.mjs`, then `check:versions` and `check:console-bundle`. Never hand-edit refs computed by `scripts/lib/channel-refs.js`.
- [ ] 5.3 Only if gate 0.4 requires a shell repin: update the pins under `iNNfo/specs/bluepriNNts/**` (via change 1's normalization, not by hand where it exists), bump `template_version` for the touched specs, register in the editor `SHIPPED_TEMPLATE_VERSIONS`, bump `channels.stable.refs[blueprints].version` (from `0.19.1` or the latest from changes 1-3).
- [ ] 5.4 Run `node scripts/verify.js` and `node scripts/check-integrity.js` from a detached worktree (`git worktree add --detach <tmp> <sha>`), including a `--release` rehearsal.
- [ ] 5.5 Merge `dev` -> `main` as a merge commit (`git push origin dev:main`); tag `innfo-console-vX.Y.Z` on `origin/main` (and `blueprints-vA.B.C` only if 5.3 ran); push tags; run `node scripts/verify.js --release`. Published tags are never deleted; rollback = revert slice commits (drafts under the v2 key are ignored by the old runtime).
- [ ] 5.6 Post-release: confirm the Pages deploy republished the CDN bundle and the stable manifest resolves the new tag(s).
