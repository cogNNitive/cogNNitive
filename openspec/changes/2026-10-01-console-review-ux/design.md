# Design: Console review UX

Change C of `A 2026-10-01-console-feedback-roundtrip-completion -> B 2026-10-01-console-ui-kit -> C (this)`. Rebased from `archive/2026-09-30-console-review-ux/design.md` (D1-D15) onto HEAD `fc925f8a` plus the approved A and B designs. Paths: `CONSOLE` = `iNNfo/specs/bluepriNNts/console`, `CORE` = `iNNfo/packages/innfo-core`.

## Technical Approach

One new UMD source, `CONSOLE/review.js` (global `InnfoReview`, `factory(InnfoUI)`), owns the v2 draft store, the pure review math, `draftToItem` and a review controller. `InnfoConsole` owns the lifecycle: its boot (once per document, A14 guard) creates the store and controller and places the review toggle in A's `#innfo-feedback-banner`. Renderers stay review-agnostic: C adds one `innfo:rendered` dispatch at each of B's card-commit points, and the controller (re)decorates. All visuals are B kit components styled by `--innfo-*` tokens. Export extends A's `#innfo-feedback-modal`.

Verified at HEAD (source offsets in `CONSOLE/innfo-runtime.js` unless noted):
- Store: `getDraftKey` :447 (title+version), `readStore`/`writeStore` :549-569, `addDraft`/`updateDraftStatus`/`removeDraftItem` :730-779, `state.draftKey` :2651, `refresh` :2665 (re-renders cards, banner, rail, review tab).
- `prompt(` has TWO call sites: `suggestFor` :2750 and the reviewer-chip edit :863. Both must go (spec "No prompt").
- `renderReviewTab` :2132 reads the old store into `#innfo-tab-review` (`artifact_shell.html`), styled by shell `.innfo-review-*` CSS (:570-692).
- `render-model-viewer.js`: the rail is built once at boot (:165-191); `render()` (:206) wipes only `#content` (:208) on every search/concept change and ends with `applyHash()` (:247).
- `model_console.html` has `#innfo-config` (:311) and `#rail`/`#content`/`#search`, so both `InnfoConsole` and `InnfoModelViewer` boot there.
- `payload-builder.ts` emits `meta.modelId` (:234), element `hash` (:163) and `meta.feedbackState` (:239). A guarantees both producer paths.
- `SOURCES` is hard-coded in `scripts/build-console-bundle.mjs:33`; B moves it to `scripts/lib/console-bundle.js`.
- `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`: zero hits for `InnfoConsole|innfo-console.bundle`. No MCP release.

## Architecture Decisions

| # | Decision | Choice | Rejected (tradeoff) |
|---|---|---|---|
| C1 | Code home and order | `review.js`, factory-injected like B D5 (`require('./ui-kit.js')` / `root.InnfoUI`, throws `InnfoUI missing` if absent). `SOURCES`: `uplot -> visuals -> ui-kit -> review -> innfo-runtime -> render-model-viewer -> stepper`. The runtime factory becomes `factory(UI, Review)`. `draftToItem` moves from A's runtime into `review.js` (the store owns the draft shape). | Growing the 2,850-line runtime (untestable in isolation). Kit-owned state (B D12 keeps the kit stateless). |
| C2 | `innfo:rendered` contract | C adds `doc.dispatchEvent(new CustomEvent('innfo:rendered',{detail:{root}}))` exactly once per commit: after `mountElementCards` + `renderRail` in `refresh`, and at the end of viewer `render()` after `applyHash`. `root` = the card container (`#innfo-content` / `#content`); not dispatched when the container is absent. The controller decorates cards under `root` and updates rail pills document-wide (the viewer rail is never re-rendered). Idempotent: injected nodes carry `data-innfo-review-ctl`; a card already holding them is skipped. On creation the controller also runs one pass over the document (covers a render that preceded it). | MutationObserver (fires on its own writes). Passing review opts into both renderers (duplication; breaks "off = nothing in DOM"). B dispatching (B D-hooks: no consumer in B). |
| C3 | Review mode | In-memory boolean, reflected as `html[data-innfo-review=on]`; never persisted, off on every load. Toggle = plain `button[data-innfo="review-toggle"][aria-pressed]` in A's banner (no kit component). Rendered only if `feedback-export` is declared AND `meta.modelId` is a non-empty string AND every element has a 16-hex `hash`; otherwise no toggle and no review control (no fallback). Off removes every `[data-innfo-review-ctl]` node and the changed filter. B D19's Suggest button and card draft-count badge are deleted. | Persisted mode (spec: off on load). Per-renderer flags. |
| C4 | Store v2 | Key `innfo-console:v2:<modelId>`; value `{v:2, modelId, drafts:Draft[], reviewed:{[element_id]: hash}}`, one `setItem` per mutation (atomic). Read: `v!==2`, `modelId` mismatch, or corrupt JSON gives empty; unknown fields are dropped. `addDraft` refuses input without `element_id` or `base_hash` (throws `TypeError`). Ids `fb-NNN` = max+1. Storage null or throwing gives an in-memory store with `persistent:false`, and the banner says "Not saved on this device". Old `innfo-console:drafts:*` keys are never read, migrated or deleted (no compat code, so no `legacy:` marker; rollback stays non-destructive). | Migration (maintainer: no backwards compat). Split keys (non-atomic). Title fallback (reintroduces orphaning). |
| C5 | Popover and anchors | Kit `AnnotationPopover` inserted inline after the anchor; one open at a time. Card anchor: `comment`/`delete`, no `target.field`. Field anchor (`[data-innfo-component=field-row][data-field]`): `comment`/`correction`, writes `field`, `original` prefilled from `element.fields[field]` in the payload (not DOM text). Enter saves, Shift+Enter is a newline, Escape cancels; focus returns to the anchor. If a re-render detaches the anchor, the popover is dropped unsaved and focus goes to the same element's new card if present. The reviewer-chip `prompt` is replaced by opening the feedback modal focused on its identifier field. | `<dialog>.showModal` (not anchored; weak happy-dom). Floating positioning (breaks narrow viewports). |
| C6 | Reviewed and progress | `reviewState(el, reviewed)` = `none` / `reviewed` (`reviewed[id] === el.hash`) / `changed`. Only `reviewed` counts. `ReviewedToggle` in the card head; `RailProgress({reviewed,total,pending})` appended to each concept pill's rail button in BOTH renderers; review bar shows overall `r/t`. Totals come from the payload (filter-independent); `pending` = drafts whose `concept` matches. Review mode only. | Counting drifted marks (progress lies after regeneration). |
| C7 | Verdict badges | `verdictsByElement(feedbackState)` gives `{status: count}` per existing `element_id`; orphans and unknown statuses are skipped silently. One `StatusBadge({status,count})` per status in `.innfo-card-head`, inside a `[data-innfo-review-badges]` container (not `review-ctl`), so badges show with review mode off. Drafts never produce badges. | Badges from drafts (spec forbids). |
| C8 | Changed filter | `changedIds` = `id in reviewed && reviewed[id] !== hash`; never-reviewed is not changed. The filter sets `html[data-innfo-filter=changed]` and `data-innfo-changed` on matching cards; kit CSS hides unmarked cards, so it composes with each renderer's own search/concept filter. Review bar shows the count and an empty state at 0. | Re-filtering data in each renderer (duplication, two wipes). |
| C9 | Target changed | Computed at render, never stored: element missing or `el.hash !== draft.base_hash`. Shown via `DraftList`'s `[data-target-changed]` label (stale tokens), not `StatusBadge`. The draft stays exportable with its original `base_hash`, so A's `evaluate_feedback_items` marks it `stale`. | Blocking export (loses work). |
| C10 | `base_hash` split | Confirmed against A13: the schema keeps `base_hash` optional (`^[0-9a-f]{16}$`) and the three validators stay in A's parity corpus. Console exports carry it by construction (C4 refuses drafts without it; `draftToItem` always emits it), proven by a test. `validateFeedback` is NOT tightened. | Making it required in the bundle validator (breaks A1 parity; DOCX-origin feedback has no hash). |
| C11 | Export preview | Extends A's `#innfo-feedback-modal` with `[data-innfo="preview"]` (kit `DraftList`), a read-only `textarea[data-innfo="export-json"]`, `[data-innfo="copy"]` and `[data-innfo="copy-status"][role=status]`. On open and on each identifier input: `buildExportDoc` (A) then `validateFeedback`, then the JSON string is held once (`serializeFeedback(doc) = JSON.stringify(doc,null,2)+'\n'`, beside `buildExportDoc` in the runtime). Download and copy both use that held string, so the bytes are identical (including `exported_at`). Invalid or empty identifier disables both and lists errors by item id in A's `[data-innfo="errors"]`. `renderReviewTab` is rewritten on the same `DraftList`; the shell `.innfo-review-*` CSS is deleted. | A separate preview screen. Two serializers. |
| C12 | Clipboard | `navigator.clipboard.writeText` when present; on absence or rejection, select the textarea and call `doc.execCommand('copy')` inside try/catch; if that returns false or throws, leave the text selected and say "Press Ctrl+C". Every outcome is announced in `copy-status`. No exception escapes. | Clipboard API only (absent/denied on `file://`). |
| C13 | Keyboard and a11y | One `keydown` listener on `document`, attached only while review mode is on. Ignored when the target is `input`/`textarea`/`select`/`[contenteditable]`, with Ctrl/Meta/Alt, or while a popover is open. `j`/`k` move focus across visible cards (`tabindex=-1`); `c` opens the field anchor if focus is inside a field row, else the card anchor. Popover traps Tab (kit). A's `[data-innfo="draft-count"]` gains `role=status aria-live=polite` and updates on add/delete. `@media (max-width:640px)` stacks the review bar and makes the popover full width. | Per-card listeners (leak on re-render). A second counter element. |
| C14 | Theme and contrast | C's CSS goes into B's `COMPONENT_CSS` in `ui-kit.js`, tokens only. Rules: review text uses `--innfo-text`; `--innfo-muted` is never placed on `--innfo-surface-2` in light mode (4.39, B table); the target-changed label is `--innfo-status-stale` on `--innfo-status-stale-bg` (6.87/5.71); the focus ring is `--innfo-focus`. A test asserts C's pairs from `TOKEN_VALUES` (text 4.5:1, focus ring 3:1 vs surface). | Manual checks. |
| C15 | Release | Same `innfo-console-v*` tag as B (B D14), cut in C's last slice. `blueprints-v*` is required: the guard forces shell pins to equal the manifest version, and `artifact_shell.html` loses `.innfo-review-*` CSS. No `innfo-mcp-v*` (verified), no `skills-v*`. | Separate B and C tags (B would ship 4 unconsumed components). |

## Data Flow

```
payload (A: meta.modelId, element.hash, meta.feedbackState)
  -> InnfoConsole.boot -> Review.createDraftStore(localStorage, modelId) -> createReviewController
InnfoConsole.refresh | InnfoModelViewer.render -> InnfoUI DOM -> 'innfo:rendered' {root}
  -> controller.decorate(root): badges (always) | toggle, annotate, reviewed, progress, changed (mode on)
popover save -> store.addDraft{base_hash} -> draft-count (aria-live) -> re-decorate
modal -> drafts.map(draftToItem) -> buildExportDoc -> validateFeedback -> serializeFeedback -> download | copy
```

## Interfaces / Contracts

```js
// review.js -> InnfoReview
STORE_PREFIX = 'innfo-console:v2:'
createDraftStore(storage, modelId) -> { persistent, drafts(), reviewed(), addDraft(input) -> Draft,
  removeDraft(id), markReviewed(id, hash), unmarkReviewed(id) }
Draft = { id, element_id, concept, element, base_hash, kind: 'comment'|'correction'|'delete',
  field?, original?, proposed?, comment?, created_at }
draftToItem(d) -> { id, kind, target: { element_id, concept, element, field? }, original?, proposed?, comment?, base_hash }
canReview(meta, elements, needs) ; reviewState(el, reviewed) ; isTargetChanged(d, byId)
progressByConcept(elements, drafts, reviewed) ; verdictsByElement(feedbackState, byId) ; changedIds(elements, reviewed)
createReviewController(doc, { meta, elements, needs, store }) -> { enable(), disable(), decorate(root), destroy() }
```

Deleted from `InnfoConsole` (definitions and `PUBLIC_API`): `getDraftKey`, `readStore`, `writeStore`, `addDraft`/`addComment`, `removeDraftItem`/`removeComment`, `getDraftSummary`/`getSummary`, `suggestFor`, `draftToItem` (moved), the chip `prompt`, `slugify` if `getDraftKey` was its last caller (B D8). Status `<select>` and `updateDraftStatus` are deleted by A (A15); C only asserts absence.

## File Changes

| File | Action | Description |
|---|---|---|
| `CONSOLE/review.js` | Create | Store, math, controller |
| `CONSOLE/innfo-runtime.js` | Modify | Deletions above; controller boot; `innfo:rendered`; preview, clipboard, review tab |
| `CONSOLE/render-model-viewer.js` | Modify | `innfo:rendered` dispatch only |
| `CONSOLE/ui-kit.js` | Modify | Review CSS in `COMPONENT_CSS`; components only if B missed one |
| `scripts/lib/console-bundle.js` (+ `.test.js`) | Modify | `review.js` in `SOURCES`; order assertion |
| `CONSOLE/innfo-console.bundle.js` | Regenerate | Every slice |
| `CONSOLE/artifact_shell.html` | Modify | Delete `.innfo-review-*`/chip-edit CSS; pin |
| `BP/workspace/assets/model_console.html`, `BP/metrics/assets/timeline.html`, `BP/procedures/assets/procedure_console.html` | Modify | Pin only |
| `CORE/tests/console-review-{store,mode,popover,progress,badges,export,keyboard,contrast}.test.ts` | Create | happy-dom pragma |
| `CORE/tests/console-{dom,feedback,runtime}.test.ts`, `test/console-review.test.mjs`, `test/console-export.test.mjs` | Modify | Old APIs gone; `InnfoReview` global |
| `docs/innfo/documentation/reviewer-guide.md` | Modify | Flow, shortcuts, dropped old drafts |
| `manifest/source.yaml` | Modify | `console_assets` version, `blueprints` stable ref (release slice) |

No change to `payload-builder.ts`, `feedback.schema.json` or procedures.

## Testing Strategy (strict TDD; seams = `InnfoReview` API, booted shells, modal hooks, `TOKEN_VALUES`; literal expectations)

| Seam | RED test | Proven red by |
|---|---|---|
| Store | Rebump with same `modelId` restores drafts; old key unread and byte-unchanged; unknown fields dropped; corrupt JSON and `v:1` give empty; null/throwing storage gives `persistent:false`; draft without `base_hash` throws | `review.js` absent; then a store that keys on title |
| Math | `2/4` + pending `2`; never-reviewed not changed; drift gives `changed`; missing element and hash mismatch give target changed; orphan verdict skipped | Literal fixtures |
| Mode (DOM) | Both shells booted with one payload: off has zero `[data-innfo-review-ctl]`; no `modelId` or one hashless element gives no toggle; on gives identical `data-innfo-component` sets per element in both; viewer search re-render keeps exactly one decoration per card; reload is off | Removing the dispatch from the viewer |
| Popover | Field correction gives `target.field:"owner"`, `original:"A"`, `base_hash`; card comment has no field; Escape keeps count and restores focus; source scan finds no `prompt(` and no `innfo-review-status-select` | Run against A's state (`prompt` present) |
| Badges | `applied` and `stale` badges render with mode off; draft without verdict has none | Badges from drafts |
| Export | Invalid draft disables both buttons, names the id, `createObjectURL` not called; clipboard text === Blob text; `navigator.clipboard` undefined runs `execCommand`, message shown, no throw; every item has `base_hash`, none has `status` | A's validate-then-download modal |
| Keyboard | `j`, `c`, text, Enter saves on the next card and the live region text changes; `j` in the textarea is typed | Listener on per-card nodes |
| Contrast | C14 pairs in both themes | Independent luminance function |
| Regression | Offline scan (`fetch(`, `type=module`), `check:console-bundle`, guard | Existing |

jsdom pragma only on proven divergence (focus, `execCommand`). Per slice: `npm run lint`, `typecheck`, `test`, `build:console`, `node scripts/verify.js`, `node scripts/check-integrity.js`.

## Slice Plan (chained; bundle is `-diff`, excluded)

| Slice | Scope | ~Lines | Done when |
|---|---|---|---|
| 1 | `review.js` store + math + `draftToItem`; `SOURCES`; runtime export, banner count and review tab read v2; old store deleted (`suggestFor` writes v2, `prompt` kept) | 380 | Store/math green; `rg "getDraftKey\|readStore" CONSOLE/*.js` empty |
| 2 | Toggle, `innfo:rendered` in both renderers, controller decorate, popover, anchors; both `prompt` calls and B D19 Suggest/badge deleted | 400 | Mode/popover green in both shells |
| 3 | Reviewed marks, rail progress (both), badges, changed filter, CSS | 380 | Progress/badges green |
| 4 | Preview, clipboard, review-tab `DraftList`, shell CSS deletion, keyboard, aria-live, narrow CSS, contrast, docs, release | 450 -> split 4a (export/review tab, 250) / 4b (a11y, docs, release, 200) | All green; tags cut |

## Migration / Rollout

Old drafts are dropped (sole user; reviewer guide says so). Archive order: A, then B, then C (C's `innfo-console-feedback` delta's "Previously" lines are A's text). Release in slice 4b, on the `dev` -> `main` merge commit: bump all `console_assets` to the next minor above the highest existing `innfo-console-v*`, run `build:console`, `sync-versions`, `check:versions`, `check:console-bundle`, repin all four shells, bump `channels.stable.refs.blueprints` to the next minor, `verify.js` + `check-integrity.js` + a detached-worktree `--release` rehearsal, then tag `innfo-console-vX.Y.0` and `blueprints-vA.B.0`. Rollback: revert; prior tags stay pinnable; v2 keys are ignored by old runtimes.

## Departures from the archived design

1. Status `<select>`/`updateDraftStatus` removal is A's (A15); C asserts absence. This supersedes proposal departure 5 and Impact.
2. Kit names are kebab-case; `ReviewProgress` is `RailProgress`; the review toggle is a plain button, not a kit component; components come from B.
3. Feedback ids are A's (`#innfo-feedback-*`, `[data-innfo-feedback-root]`).
4. `innfo:rendered` is fired at B's single commit points; the viewer rail is updated document-wide, not via a rail dispatch.
5. New: the reviewer-chip `prompt` (:863), `renderReviewTab` and shell `.innfo-review-*` CSS are in scope.
6. The store value carries `modelId` and refuses hashless drafts; `serializeFeedback` lives in the runtime, `draftToItem` in `review.js`.
7. `base_hash` is a console-export guarantee, not a validator rule (C10).
8. Release always cuts `blueprints-v*` (archived Q2 resolved); no MCP release (verified).

## Spec amendments for sdd-tasks

- `console-review-mode`: add "Shift+Enter inserts a newline" to the keyboard requirement; state that the viewer's rail progress updates on `innfo:rendered` without a rail re-render; state that the export-open button is not a "draft control" and stays with mode off; add a scenario for the reviewer chip (no `prompt`).
- `innfo-console-feedback`: name the preview hooks (C11) and that copy and download share one held string.
- Proposal: Impact row "`<select>` deleted" moves to A.

## Open Questions

- [ ] Does B's `mountElementCards` replace or patch `#innfo-content`? Decoration is idempotent either way; the test fixes the behavior.
- [ ] Once A16 makes the CDN path live, the bundle executes up to 3 times and the viewer boots 3 times (3 `#search` listeners, 3 dispatches per keystroke). Harmless under C2 idempotency, but a viewer boot guard belongs in A or B.
- [ ] Hidden empty concept sections under the changed filter in the viewer: accepted as-is unless the maintainer objects.
