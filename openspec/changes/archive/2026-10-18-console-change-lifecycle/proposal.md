# Proposal: Console Change Lifecycle — One Concept, One Signal, One Toast

## Intent

The domain console's review surface had grown contradictory vocabulary and
duplicated signals. A single element row could show, at once: a "Mark reviewed"
toggle, an `N fields` count, a chevron, a "Draft Edit" chip and a set of
`applied` / `proposed` / `conflict` verdict badges. "Review mode", "draft" and
"changeset" were plumbing terms leaking to the user, and the reviewed mark was
local state with no effect on the domain.

The design narrative (`temp/change-lifecycle/mockup.html`, driven by the REAL
engine over a testlab copy) settles on ONE concept: **the change**, with three
states — **Unsent** (local, in the browser), **Proposed** (submitted; the engine
can apply it) and **Applied** (written into the model) — plus the terminal
`conflict`. This change implements that narrative.

## Scope

### In Scope

- **One change-state signal per row.** `review.js` collapses the multiple badges
  into a single kit `StatusBadge` per element row: status = the change state
  (`conflict > local > proposed > applied`), visible text = the state label
  (`Unsent` / `Proposed` / `Applied` / `Conflict`), and every count in the
  `title` tooltip. The field count and the chevron stay (they are neutral).
- **Terms collapsed to the change.** The runtime drops the per-card "Draft Edit"
  chip and the table's `Draft Edit` / `New Draft` labels (now `Unsent`), and the
  dock/banner/counters/export labels stop saying "draft" / "changeset"
  (banner `unsent: N`, dock `Unsent: N` / `Change` / `Copy change`).
- **Change recorded toast.** A new `InnfoUI.Toast` (bottom-right, temporary,
  dismissable) shown on every action that creates or modifies a change, with the
  fixed copy `Change recorded` /
  `It lives only in this console until you export it. Then apply it from cogNNitive to write it into the domain.`
- **Remove "Mark reviewed".** Delete the `ReviewedToggle` kit component, its
  decoration, the reviewed map in the draft store, the reviewed/session hash
  math (`reviewState`, `changedIds`), the changed-since-last-review filter and
  the `reviewed/total` rail readout. `progressByConcept` becomes
  `{ total, pending }` and drives a `RailProgress({ total, pending })` that
  reports unsent changes per concept.
- **Specs & docs.** Update the living specs `console-review-mode`,
  `console-ui-kit` and `console-export-cli`, and rewrite
  `docs/innfo/documentation/reviewer-guide.md` (which described a review-mode
  toggle that no longer exists) to the collapsed model + toast.

### Out of Scope

- The changeset APPLY engine (`proposal_sha` sealing, `apply_change`, verdicts,
  version bump). The console still only proposes.
- The `test/fixtures/testlab` domain content (only the exported console fixture
  is regenerated).
- Renaming internal identifiers, file names or the `_changes_NN.md` artifact.

## Capabilities

### Modified Capabilities

- `console-review-mode`: one change-state signal per row; rail progress over
  unsent changes; change-recorded toast; no reviewed marks and no changed filter.
- `console-ui-kit`: `StatusBadge` gains `label`/`title` and the `local` status;
  `RailProgress` reads `{ total, pending }`; `Toast` is added; `ReviewedToggle`
  is removed.
- `console-export-cli`: a legacy `reviewed` map is ignored and dropped on write
  (hash-contract requirement).

## Approach

1. Kit (`ui-kit.js`): add `--innfo-status-unsent(-bg)` tokens, `local` status +
   labels, `StatusBadge` `label`/`title`, `RailProgress({ total, pending })`,
   `Toast`, and the toast/CSS; delete `ReviewedToggle` / `applyReviewedState`.
2. Controller (`review.js`): drop the reviewed store map and math; add
   `changeCountsByElement` / `changeStateOf` / `changeTooltip`; `decorateChangeState`
   renders the single badge; `decorateRailProgress` uses the new progress; add
   `showChangeToast` fired from every draft-save path; delete the changed filter.
3. Runtime (`innfo-runtime.js`): remove the card/table draft chips; rename the
   user-facing draft/changeset strings; keep the export artifact unchanged.
4. Rebuild the bundle (`build-console-bundle.mjs`) and regenerate the testlab
   console fixture (`export-console.mjs --domain --no-open`).
5. Update specs, docs and tests (delete the changed-filter suite; rewrite the
   progress suite; new toast + single-signal coverage).

## Risk & Impact

- **Offline invariant preserved**: no new network call, no `type=module`; the
  toast is pure DOM.
- **Store shape**: the `reviewed` field is removed from the in-memory store and
  dropped on the next write; `STORE_VERSION` is unchanged so existing unsent
  changes survive an upgrade (a legacy reviewed map is simply ignored).
- **Visible change**: the rail readout and the row badges change meaning; the
  reviewer guide and the living specs are updated in step.
