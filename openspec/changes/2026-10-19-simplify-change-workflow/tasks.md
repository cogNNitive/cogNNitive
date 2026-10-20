# Tasks: Simplify the Change Workflow (reduced scope)

Authority: `design.md` (Decisions 1-11). Strict TDD: every GREEN task follows a RED task
that names the test file and the command, and the RED run must fail for the stated reason.
Work only in this worktree; never `npm install` or `npm ci` here.

Commands (from the worktree root):
- core: `npm --workspace=@cognnitive/innfo-core test -- <file>`
- mcp: `npm --workspace=@cognnitive/innfo-core run build`, then `npm --workspace=@cognnitive/innfo-mcp test -- <file>`
- root: `node --test <file>`
- gate: `node scripts/verify.js`

## Decisions needed

1. Whole-file rejection: a mutation, validation or citation failure rejects the whole file today. ACCEPTED: keep whole-file rejection (the documented default); the risk is logged in `deferred.md` (per-change skip).
2. Chain strategy: pending; recommended `stacked-to-main` (no release gate in this chain).

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines (hand-written, add + delete) | ~1,450: U1 ~420, U2 ~150, U3a ~470, U3b ~410. About 800 are deletions; written (added) lines ~650 |
| Generated lines | Excluded: console bundles, payload mirror, mcp bundles, testlab console, docs region |
| 400-line budget risk | Medium: U1 and U3a exceed 400 only through deletions |
| Chained PRs recommended | Yes |
| Suggested split | Four PRs: U1, U2, U3a, U3b. U1, U2 and U3a are independent; U3b builds on U3a (same files) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (recommended `stacked-to-main`) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

| Unit | Estimate | Confidence | Main uncertainty |
|---|---|---|---|
| U1 | +90 / -330 | High | Size of the prune blocks in the two greenfield tests |
| U2 | +130 / -20 | Medium-high | How many export assertions change with `author::` |
| U3a | +90 / -380 | Medium-high | How much of `console-review-badges.test.ts` (225 lines) survives |
| U3b | +330 / -80 | Medium | Card anatomy size |

## U1 Engine

- [x] 1.1 RED `iNNfo/packages/innfo-core/tests/mutate.test.ts`: `update_field` with `to: ''` removes the field line; an absent field is a no-op success; a number field does not fail the value check; other fields keep their raw text. Run: `npm --workspace=@cognnitive/innfo-core test -- tests/mutate.test.ts`.
- [x] 1.2 GREEN `iNNfo/packages/innfo-core/src/mutate.ts` `updateField` (design 1). Re-run 1.1 and `npm --workspace=@cognnitive/innfo-core test -- tests/roundtrip-fidelity.test.ts`.
- [x] 1.3 RED `iNNfo/packages/innfo-mcp/test/apply-change.test.ts`: an empty `to::` applies and removes the line; a mismatched `from` is still `status:: conflict` with `resolution::`; a validation failure in the batch rejects the whole file (`VALIDATION_FAILED`, no model written, so a sibling valid clear is not persisted either). Run: core build, then `npm --workspace=@cognnitive/innfo-mcp test -- test/apply-change.test.ts`.
- [x] 1.4 RED `iNNfo/packages/innfo-mcp/src/tools/propose-changeset.spec.ts`: `update_field` with `to: ''` is accepted; a missing `to` is still `INVALID_OPERATION`. Run: `npm --workspace=@cognnitive/innfo-mcp test -- src/tools/propose-changeset.spec.ts`.
- [x] 1.5 GREEN `propose-changeset.ts` `requiredKeyProblems`. Re-run 1.3, 1.4.
- [x] 1.6 RED `iNNfo/packages/innfo-mcp/src/server.spec.ts`: `prune_changesets` moves from the canonical to the retired list. Run: `npm --workspace=@cognnitive/innfo-mcp test -- src/server.spec.ts`.
- [x] 1.7 GREEN delete the prune tool and its tests and references (design 2). Re-run 1.6 and `npm --workspace=@cognnitive/innfo-mcp test`.
- [x] 1.8 REGEN: `npm run regen`; `npm --workspace=@cognnitive/innfo-mcp run build`. `rg prune_changesets` must have no hit outside `openspec/` except the retired-name list assertion in `iNNfo/packages/innfo-mcp/src/server.spec.ts`.
- [ ] 1.9 `openspec/specs/prune-changesets/` is deleted at archive (REMOVED delta).

## U2 Console export

- [x] 2.1 RED `iNNfo/packages/innfo-core/tests/console-review-export.test.ts`: every block has `author:: <identifier>`, default `reviewer`; CR, LF or U+2028 in the name yields one `author::` line; an emptied text field exports `op:: update_field` with an empty `to::`. Run: `npm --workspace=@cognnitive/innfo-core test -- tests/console-review-export.test.ts`.
- [x] 2.2 RED `iNNfo/packages/innfo-mcp/test/console-export-roundtrip.test.ts`: an exported `author::` resolves as `human`. Run: core build, then `npm --workspace=@cognnitive/innfo-mcp test -- test/console-export-roundtrip.test.ts`.
- [x] 2.3 RED `iNNfo/packages/innfo-core/tests/console-feedback-ui.test.ts`: no `Sealed`, `proposal_sha` or `PROPOSAL_TAMPERED` in the modal; the [P] flow paragraph is present; the agent prompt asks for skipped changes and reasons. `tests/console-review-progress.test.ts`: the toast body is the [P] copy.
- [x] 2.4 GREEN `innfo-runtime.js` (`draftToChange` author, ~:5581 paragraph, ~:6076 prompt) and `review.js` (~:554 toast) with [P] constants.
- [x] 2.5 Docs: `docs/innfo/documentation/reviewer-guide.md` export section: export -> agent -> skipped report -> retry as a new file.
- [x] 2.6 REGEN: `node scripts/build-console-bundle.mjs`; `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`; `npm run check:console-bundle`.

## U3a Model views show only Unsent

- [x] 3.1 RED `iNNfo/packages/innfo-core/tests/console-ui-kit-review.test.ts` and `tests/console-ui-kit-kitchen-sink.test.ts`: `StatusBadge` throws for `applied`, `proposed`, `conflict`; the `local` title says "Only in your browser. Export it and give it to the agent." [P]; an `ElementCard` with `history` renders no `.innfo-lineage-pill` (the modal Lineage tab assertion is covered by task F.5).
- [x] 3.2 GREEN `ui-kit.js`: `STATUSES`/`STATUS_HELP`/`STATUS_LABELS` reduced to `local`; delete the card meta-strip pill (~:1852-1868).
- [x] 3.3 RED `iNNfo/packages/innfo-core/tests/console-review-badges.test.ts` and `tests/console-review-math.test.ts`: a row with drafts shows one `Unsent` badge titled "N unsent"; a row with only applied, conflict or proposed history shows nothing; with an empty draft store no element shows any change signal; `badgesByElement`, `changeStateOf`, `changeTooltip` are no longer exported. `isAlreadyApplied` is true for a stale clear draft (`proposed: ''`, field absent).
- [x] 3.4 GREEN `review.js`: delete the payload-derived counting (design 4); `decorateChangeState` reads drafts only; extend `isAlreadyApplied` (design 5); drop the `changes` option and its runtime argument (~:6572).
- [x] 3.5 RED `test/console-review.test.mjs` (the suite that drives `createReviewController`): replace "offers to clear exported drafts and removes only those" (~:198) with: on controller start, already-applied drafts are removed from the store and the removal is persisted; a stale draft whose value differs, a comment, a new-element, a delete and a matrix-cell draft stay; no `[data-innfo="clear-exported"]` exists after an export. Run: `node --test test/console-review.test.mjs`.
- [x] 3.6 GREEN `review.js` controller start: `store.clearDrafts(ids)`; `innfo-runtime.js`: delete "Clear exported changes", `exportedDraftIds`, `markDraftsExported`, the already-applied export filter (~:5858); `ui-kit.js`: delete the "already applied" `DraftList` branch.
- [x] 3.7 Run `node --test test/console-draft-count-live.test.mjs` and `test/console-element-card.test.mjs`; update assertions that named retired badges.
- [x] 3.8 REGEN: `node scripts/build-console-bundle.mjs`; testlab export; `npm run check:console-bundle`.

## U3b One Changes tab

- [x] 4.1 RED `iNNfo/packages/innfo-core/tests/console-element-history.test.ts`: entries carry `from`, `to`, `name`, `concept`, `fields`, `resolution`, and the changeset `resolution`. Run: `npm --workspace=@cognnitive/innfo-core test -- tests/console-element-history.test.ts`.
- [x] 4.2 GREEN `iNNfo/packages/innfo-core/src/console/element-history.ts` (design 8).
- [x] 4.3 RED `tests/console-ui-kit-review.test.ts`: `DraftList` cards have the anatomy and a Discard control (none without `onDelete`); `ChangeHistory` shows "Applied" [P] state text, a muted "Not applied" card with the reason for `conflict`/`rejected` blocks and no `StatusBadge`, skips other blocks, Revert only on `update_field`, `onGoTo(elementId)`; hostile text is inert.
- [x] 4.4 GREEN `ui-kit.js`: private `changeCard`, `DraftList` uses it, add `ChangeHistory` (design 6, 7).
- [x] 4.5 RED `iNNfo/packages/innfo-core/tests/console-review-tab.test.ts`: heading "Changes" [P]; the [P] publication banner tops the Unsent list when it has items and is a one-line note when it is empty; Unsent above Applied; Applied newest first; empty states; Revert adds one Unsent draft with the current hash and `proposed` = `from` (or `''`); "Go to element" focuses the card.
- [x] 4.6 GREEN `innfo-runtime.js` `renderReviewTab` (~:4660) and `state.changes` from `model.changes` (design 9, 10).
- [x] 4.7 RED `test/console-views.test.mjs` (~:64-66): no `console-view-changes` inlined. Run: `node --test test/console-views.test.mjs`.
- [x] 4.8 GREEN delete `iNNfo/specs/bluepriNNts/changes/assets/console-view-changes.js` and the empty folder; run `node scripts/manifest/validate-manifest.js` and `npm run check:integrity`.
- [x] 4.9 REGEN: `npm run regen`; testlab export; `npm run check:console-bundle`.

## Before each PR

- [ ] V.1 `npm run typecheck`, `npm test`, `node scripts/verify.js`, `npm run check:specs`.
- [ ] V.2 Fresh-context review of the diff (repo PR rule).

## Follow-up from verification

Source: the independent verification report (findings W1-W5, S1-S5). One work-unit commit per group.

- [x] F.1 W1 RED/GREEN `console-ui-kit-review.test.ts`, `console-review-tab.test.ts`: evidence `sources` render through the kit `CitationIcon` and open the citation dialog (`onCitation`); `ui-kit.js`, `innfo-runtime.js`.
- [x] F.2 W2 Applied cards carry the "Recorded in the domain." help as the state `title` (`COPY.appliedHelp`).
- [x] F.3 W4 The context line reads `author - date - state`; the applied title shows the element display name (`byId[slug].name`), with the slug as fallback.
- [x] F.4 W3 Tests: "Revert of an added field becomes a clear" (`console-review-tab.test.ts`); clear-one-field loop over the shipped corpus (`tests/roundtrip-fidelity.test.ts`). The loop compares against the post-`freeze_slugs` baseline, because every mutation freezes slugs; the "Round trip is unaffected" scenario in the engine delta spec now says so.
- [x] F.5 S2 `console-ui-kit-review.test.ts`: an element with history shows no lineage pill, and the modal Lineage tab (`startTab: 'history'`) lists the history.
- [x] F.6 S3 `console-feedback-ui.test.ts`: the full `UI.COPY.exportFlow` paragraph is in the modal.
- [x] F.7 S4 `iNNfo/packages/innfo-mcp/test/console-export-roundtrip.test.ts`: a console-exported raw `to::` clear applies through `applyChange`.
- [x] F.8 S1 `server.spec.ts` test title says 22 canonical tools.
- [x] F.9 S5 The retired-status badge CSS rules are removed from `ui-kit.js`, guarded by a test.
- [x] F.10 W5 "Decisions needed 1" recorded as accepted (whole-file rejection).
