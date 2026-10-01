# Design: Console review UX

## Technical Approach

This change adds one UMD source, `iNNfo/specs/bluepriNNts/console/review.js`, with the global `InnfoReview` and the factory `factory(InnfoUI)`. It owns four things:

- the v2 draft store
- the pure review math (progress, changed, target-changed, verdict mapping)
- the review controller that decorates rendered cards
- `draftToItem`, moved from `InnfoConsole` (change 3 D15)

The new visual primitives go in `ui-kit.js` (change 2) and are styled only with `--innfo-*` tokens. `InnfoConsole` owns the lifecycle: it boots on `#innfo-config`, including in `model_console.html`, and creates the controller once inside change 3's `[data-innfo-feedback-root]`. The two renderers never learn about review state. After each render they announce `innfo:rendered`, and the controller re-decorates. The new `SOURCES` order is `uplot -> visuals -> ui-kit -> review -> innfo-runtime -> render-model-viewer -> stepper`.

Verified baseline (2026-09-30, source files, not bundle offsets):
- `innfo-runtime.js`:
  - `getDraftKey`: `:447`
  - store helpers: `:549-569`
  - `addDraft`, `updateDraftStatus`, `removeDraftItem`: `:730-779`
  - status `<select>`: `:2248-2264`
  - `suggestFor` with `prompt`: `:2748-2763`
  - `state.draftKey` (title+version): `:2651`
- The viewer's `render()` clears `#content` via `innerHTML = ''` on every search or concept change (`render-model-viewer.js:206-208`). Any decoration therefore has to be re-applied.
- `model_console.html` has `#innfo-config` (`:311`) and no `#innfo-rail`/`#innfo-content`, so `InnfoConsole.boot` runs there but renders no cards.
- The console assets are at `0.6.0` (`manifest/source.yaml:196`). The stable refs are `blueprints` `0.19.1` and `innfo-console` (derived).
- innfo-core has no default DOM environment. DOM suites use `// @vitest-environment happy-dom`.

## Architecture Decisions

| # | Decision | Choice | Rejected (tradeoff) |
|---|---|---|---|
| D1 | Review state home | An in-memory controller in `InnfoReview`, reflected as `data-innfo-review="on"` on `<html>`. The toggle (`aria-pressed`) sits in change 3's feedback root, so review exists only when `feedback-export` is declared. Review mode is not persisted, which keeps it off on a fresh load. | Persisting it in localStorage (the spec requires off by default). A per-renderer flag (duplicated in 2 modules). |
| D2 | Decoration contract | Both renderers call `doc.dispatchEvent(new CustomEvent('innfo:rendered',{detail:{root}}))` after each render: InnfoConsole `refresh`, and viewer `render` plus the rail build. The controller decorates `[data-innfo-component=ElementCard]`, `FieldRow` and `ConceptPill` under `root`. The pass is idempotent via `data-innfo-review-ctl` and is removed entirely when review mode is off. Change 3's ElementCard `suggest` opt is deleted. | MutationObserver (implicit, and it re-fires on its own writes). Passing review opts into both renderers (duplication; spec "off = no controls in DOM"). |
| D3 | Code home | New `review.js` (UMD, factory-injected like change 2 D4). `innfo-runtime.js` sheds its store, drafts and prompt code. | Growing the 2,850-line runtime (untestable in isolation). |
| D4 | Popover | `InnfoUI.AnnotationPopover(data,{onSave,onCancel})` returns `div[role=dialog][aria-modal=true]`. It is inserted inline after the anchor: in the card flow, with no absolute positioning and no shadow DOM. It traps Tab/Shift+Tab, closes on Escape and returns focus to the anchor. Only one popover is open at a time. | `<dialog>.showModal` (top layer, not anchored; weak happy-dom support). A floating popover (positioning math, breaks on narrow viewports). |
| D5 | Anchors and kinds | A card anchor offers `comment` and `delete`. A field anchor (`FieldRow [data-field]`) offers `comment` and `correction`, writes `target.field`, and prefills `original` from `element.fields[field]` in the payload, not from DOM text. | All kinds everywhere (a card-level `correction` has no defined `original`). |
| D6 | Store v2 | One key, `innfo-console:v2:<meta.modelId>`, holds `{v:2, drafts, reviewed:{[element_id]:hash}}`, so a single `setItem` is atomic. Drafts carry no `status`. Unknown fields are dropped on read. Corrupt JSON loads as empty. Old `innfo-console:drafts:*` keys are neither read nor deleted, which keeps a rollback non-destructive. If `modelId` is missing, or any element lacks `hash`, the toggle is not rendered. | Migrating old keys (no-compat preference). Split keys for drafts and reviewed (non-atomic). Falling back to the title (reintroduces orphaning). |
| D7 | No storage | `createDraftStore(storage, modelId)` takes a Storage-like object. When it is null or throws, drafts are kept in memory and the review bar shows "not saved on this device". | Silent loss (today's `readStore` behavior). |
| D8 | Reviewed and progress | "Reviewed" means `reviewed[id] === el.hash`. A recorded mark whose hash differs is shown as "changed" and does not count. The rail shows an `InnfoUI.ReviewProgress({reviewed,total,pending})` beside each `ConceptPill`. Totals come from the payload, so they do not depend on filters. `pending` is the draft count for the concept. | Counting stale marks as reviewed (progress would lie after a regeneration). |
| D9 | Verdict badges | `verdictsByElement(meta.feedbackState)` produces `{status:count}` per `element_id`, rendered as one `StatusBadge({status,count})` per status in the card head. Badges are shown with review mode off because they are information, not controls. `stale` is rendered too. Entries whose element no longer exists are not rendered. | Deriving badges from drafts (the spec forbids it). |
| D10 | Changed filter | The candidates are elements where `id in reviewed && reviewed[id] !== hash`. The filter adds `data-innfo-filter=changed` on `<html>` and marks cards with `data-innfo-changed`. Kit CSS hides the unmarked cards, so it composes with each module's own search and concept filter. The review bar shows the count and an empty state for 0. | Re-filtering data inside each renderer (duplication). |
| D11 | Target changed | Computed at render and never stored. It is true when the element is missing or `el.hash !== draft.base_hash`. The draft stays exportable with its original `base_hash`, so reconcile marks it `stale` (change 3 D8). It is shown as a text label with the stale token, not as a `StatusBadge`, because badges mean verdicts. | Blocking export (loses reviewer work). |
| D12 | Export preview | Extends change 3's `#innfo-feedback-modal`. One `exportDoc` is built per render and rebuilt on each identifier input. `validateFeedback` runs live. Download and copy are disabled while the export is invalid, and the errors are listed by item id. Both download and copy use `serializeFeedback(doc)`, so the bytes are identical. The shared `InnfoUI.DraftList` (kind, target, text, target-changed, delete) is used by the modal and by `renderReviewTab`. | A separate preview screen. |
| D13 | Clipboard | Uses `navigator.clipboard.writeText` when it exists. Otherwise the fallback selects the read-only JSON `<textarea>` in the preview and calls `execCommand('copy')`. If that also fails, the text stays selected and the message says "Press Ctrl+C". The outcome is announced in the `role=status` region. | Clipboard API only (it can be absent or denied on `file://`). |
| D14 | Keyboard | One `keydown` listener on `document` is attached only while review mode is on. It ignores events from `input`, `textarea`, `select` and `[contenteditable]`, events with Ctrl/Meta/Alt, and events while a popover is open. `j`/`k` move focus across visible cards (cards get `tabindex=-1`). `c` opens the field anchor when focus is inside a `FieldRow`, otherwise the card anchor. In the popover, Enter saves and Shift+Enter adds a newline. After a save, focus returns to the anchor. The counter `span[role=status][aria-live=polite]` lives in the review bar. | Per-card listeners (they leak on re-render). |
| D15 | Theme and contrast | All new CSS goes in the kit `<style>` and uses only tokens: focus ring `--innfo-focus`, and a narrow-viewport `@media (max-width:640px)` rule that stacks the review bar and makes the popover full-width. Contrast is enforced by a test over token pairs. This requires change 2 to expose `InnfoUI.TOKEN_VALUES = {light,dark}` and generate its CSS from it. | Manual checks only. |

## Data Flow

```
payload (change 3: meta.modelId, meta.feedbackState, element.hash)
  -> InnfoConsole.boot -> createDraftStore(localStorage, modelId) -> createReviewController
renderers (InnfoConsole | InnfoModelViewer) -> DOM (InnfoUI components) -> 'innfo:rendered'
  -> controller.decorate(root): badges | reviewed toggle | annotate buttons | progress | changed marks
popover save -> store.addDraft{base_hash} -> counter (aria-live) + re-decorate
export modal -> drafts.map(draftToItem) -> buildExportDoc -> validateFeedback -> download | copy
```

## Interfaces / Contracts

```js
// review.js -> InnfoReview
STORE_PREFIX = 'innfo-console:v2:'
createDraftStore(storage, modelId) -> { persistent, drafts(), reviewed(), addDraft(input), removeDraft(id),
  markReviewed(id, hash), unmarkReviewed(id) }
Draft = { id:'fb-NNN', element_id, concept, element, base_hash, kind:'comment'|'correction'|'delete',
  field?, original?, proposed?, comment?, created_at }
draftToItem(d) -> { id, kind, target:{element_id,concept,element,field?}, original?, proposed?, comment?, base_hash }
isTargetChanged(d, byId) ; reviewState(el, reviewed) -> 'none'|'reviewed'|'changed'
progressByConcept(elements, store) ; verdictsByElement(feedbackState) ; changedIds(elements, reviewed)
serializeFeedback(doc) -> JSON.stringify(doc, null, 2) + '\n'
createReviewController(doc, { meta, elements, store }) -> { enable(), disable(), decorate(root), destroy() }
// ui-kit.js additions (change 2 signature rules)
ReviewToggle({on}), ReviewedToggle({state}), ReviewProgress({reviewed,total,pending}),
AnnotationPopover({label, kinds, original?}, {onSave, onCancel}), DraftList({drafts, byId}, {onDelete})
```

Deleted from `InnfoConsole`: `getDraftKey`, `readStore`/`writeStore`, `addDraft`/`addComment`, `updateDraftStatus`/`updateStatus`, `removeDraftItem`/`removeComment`, `getDraftSummary`/`getSummary`, `suggestFor`, and the status `<select>`.

## File Changes

| File | Action | Description |
|---|---|---|
| `console/review.js` | Create | Store, math, controller |
| `console/ui-kit.js` | Modify | 5 components, CSS, `TOKEN_VALUES` |
| `console/innfo-runtime.js` | Modify | Deletions above; controller boot; `innfo:rendered`; preview and clipboard |
| `console/render-model-viewer.js` | Modify | `innfo:rendered` dispatch; drop `suggest` opt |
| `scripts/lib/console-bundle.js` | Modify | `SOURCES` adds `review.js` |
| `console/innfo-console.bundle.js` | Regenerate | Every slice |
| `innfo-core/tests/console-review-{store,math,mode,popover,badges,export,keyboard,contrast}.test.ts` | Create | happy-dom pragma |
| `innfo-core/tests/console-{dom,feedback,runtime}.test.ts`, bundle-globals check | Modify | Old APIs removed; `InnfoReview` global |
| `docs/innfo/documentation/reviewer-guide.md` | Modify | Review flow and shortcuts |

No innfo-core payload change, and no blueprint procedure change.

## Testing Strategy (strict TDD, literal expectations)

| Layer | What | Approach |
|---|---|---|
| Unit | Store: rebump keeps drafts (same `modelId`), old key ignored and untouched, unknown fields dropped, corrupt JSON gives empty, null storage gives `persistent:false` | Fake Storage object |
| Unit | Math: `2/4` + pending `2`; never-reviewed not changed; stale mark gives `changed`; missing element or hash gives target changed | Literal fixtures |
| DOM | Both shells booted with one payload: off gives zero `[data-innfo-review-ctl]`; on gives identical decorations in `artifact_shell` and `model_console`; decorations survive viewer search re-render | happy-dom |
| DOM | Popover: field correction gives `target.field`/`original:"A"`; Escape restores focus and leaves the count unchanged; Tab wraps | happy-dom; jsdom pragma only if focus diverges |
| DOM | Keyboard: `j`,`c`,type,Enter gives a draft on the next card and new counter text; `j` inside the textarea is inert | Dispatched `KeyboardEvent` |
| Export | Invalid draft gives disabled buttons naming its id; clipboard text === download blob text; fallback path when `navigator.clipboard` is undefined | Stubs proven red by first running them against the current `downloadReviewExport` |
| Contrast | WCAG AA (4.5:1 text, 3:1 UI) for every text/bg and status/status-bg pair, in both themes | `TOKEN_VALUES` |
| Regression | Offline scan (`fetch(`, `type=module`, `import(`) over the bundle; `check:console-bundle` | Existing |

## Slice Plan (chained; bundle is `-diff`)

| Slice | Scope | ~Lines | Done when |
|---|---|---|---|
| 1 | `review.js` store and math; `SOURCES`; the export reads v2 through `draftToItem`; status select, `updateDraftStatus` and the old store deleted; `suggestFor` writes v2 (prompt kept until slice 2) | 350 | Store and math suites green; `rg "updateDraftStatus\|getDraftKey" console/*.js` empty |
| 2 | Toggle, `innfo:rendered`, decoration, popover, anchors, `suggestFor` deleted, reviewed toggle and rail progress (may split into 2a popover / 2b progress) | 450 | Mode, popover and progress suites green in both shells |
| 3 | Badges and the changed filter | 250 | Badges suite green |
| 4 | Preview, clipboard, keyboard, aria-live, narrow CSS, contrast, docs, release | 400 | All suites green; `verify`, `check-integrity` |

## Migration / Rollout

Existing drafts under old keys are dropped (sole user, announced in the reviewer guide). Release happens after changes 2 and 3, in slice 4 on the `dev` -> `main` merge commit:

1. Bump all three `console_assets` versions to the next minor above the one current at release time (`0.6.0` today; changes 2 and 3 each take a minor).
2. Run `build:console`, `sync-versions`, `check:versions` and `check:console-bundle`.
3. Tag `innfo-console-vX.Y.Z` (derived).
4. Cut `blueprints-v*` (bump `channels.stable.refs` blueprints from its current value, `0.19.1` before 1-3) only if change 1's pin-coherence lint requires shell pins to move.

No `innfo-mcp-v*` or `skills-v*` tags are needed. Rollback is a revert; the previous tag stays pinnable.

## Departures from written specs (reconcile in sdd-tasks)

1. **Item `status`**: the `innfo-console-feedback` delta and the "No Reviewer Verdicts" requirement say exported items carry `status: "pending"`. Change 3 D10 removes item `status` from the schema. The rule becomes: console items carry **no** `status`.
2. **Meta names**: the delta lists `source_model*` and `session_label`. Change 3 D10 keeps `source_knowledge*`, deletes `session_label`, and adds `source_sha256`.
3. **Kinds per anchor** (D5): the spec lists kinds without saying which anchor offers which.
4. **`stale` badge** (D9): additive to the spec. Badges are also visible while review mode is off.
5. **Reviewed means a hash match** (D8): the spec is silent on this.
6. **Proposal Impact**: "innfo-core `buildConsolePayload` modified" is void, because change 3 already emits `modelId` and `hash`.
7. **Test environment**: the proposal says jsdom tests. The design uses happy-dom by default, with a jsdom pragma only on proven divergence.
8. **Change 3 D13**: the ElementCard `suggest` opt and the delegated suggest listener are replaced by D2.
9. **Change 2**: must expose `TOKEN_VALUES` (D15).
10. **Enter behavior**: Enter saves and Shift+Enter adds a newline (the spec's keyboard scenario).

## Open Questions

- [ ] Status token contrast: amber `#d97706` on `#fef3c7` looks below 4.5:1. If the test fails, change 2's token value has to change (coordinate before slice 4).
- [ ] Whether change 1's pin lint forces a shell repin (which decides the `blueprints-v*` tag).
