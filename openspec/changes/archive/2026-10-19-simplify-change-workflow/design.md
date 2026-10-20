# Design: Simplify the Change Workflow (reduced scope)

Code read in this worktree on 2026-10-19. Line numbers are hints; re-check before editing.
Strings marked [P] come from the proposal's "Terminology (pending)" constants table.

## Decisions

| # | Topic | Decision and evidence |
|---|---|---|
| 1 | Clear a field (U1) | In `updateField` (`innfo-core/src/mutate.ts` ~:599) an empty string deletes `fields[name]` and `rawFields[name]` BEFORE the schema value check (~:679); an absent field is a no-op. The `from` guard (`changeset/conflicts.ts` ~:192) is unchanged; a cleared required field fails the existing validation. Untouched fields keep their raw text. Today `apply_change` writes `field:: ""`; only `propose_changeset` (`propose-changeset.ts` ~:163) rejects an empty `to`, and it will accept `''` for `update_field`. |
| 2 | Delete `prune_changesets` (U1) | Delete `tools/prune-changesets.ts`, `test/prune-changesets.test.ts`; remove its import, registration and handler in `server.ts` (~:54, ~:732, ~:893), its name in `server.spec.ts` (~:157), the prune blocks in `test/greenfield-improvements.test.ts` (~:121) and `test/e2e-greenfield-smoke.test.ts` (~:134), and the prose in `skills/nn-innfo/SKILL.md` (~:482, ~:498). Tool tables are the generated `mcp-tools` region. |
| 3 | `author::` (U2) | `draftToChange` (`innfo-runtime.js` ~:5722) writes `author:: <oneLine(author)>` per block, with `exportMeta.author` (modal identifier prefilled from `innfo_reviewer_name`, fallback `reviewer`). `oneLine` already folds line breaks; `readChangeAuthor` (`citations.ts` ~:85) already maps it to human. An emptied text field already exports `to:: ` (~:5771): pinned by a test. |
| 4 | Unsent-only model views (U3a) | `review.js`: delete `badgesByElement`, `CHANGE_STATE_ORDER`, `changeStateOf` and the `changes` controller option (~:341-433, ~:515); `decorateChangeState` (~:1374) renders one `local` badge from `store.drafts()` with an "N unsent" title. `StatusBadge` (`ui-kit.js` ~:746) accepts `local` only. Delete the card meta-strip pill "N applied changes" (`ui-kit.js` ~:1852-1868). Keep the modal Lineage tab (~:2405). The rail (`progressByConcept` ~:313) and unit pips (`setUnitChanges`) already count drafts only: no change. |
| 5 | Draft lifetime (U3a) | On controller start, drafts for which `isAlreadyApplied` (`review.js` ~:298) is true are removed with `store.clearDrafts(ids)`. `isAlreadyApplied` gains one case: `proposed === ''` and the field absent is applied (a clear; today it returns false because the current value is undefined). Comment, new, delete and matrix-cell drafts are never detected and stay Unsent until discarded. Delete "Clear exported changes", `exportedDraftIds` and `markDraftsExported` (`innfo-runtime.js` ~:4698-4714, ~:5944-5956, ~:5982), the export filter of already-applied drafts (~:5858) and the "already applied" label in `DraftList` (~:2045): both are unreachable once such drafts are removed at load. |
| 6 | Card: reuse (U3b) | `DraftList` (`ui-kit.js` ~:1949) keeps its signature (callers: tab ~:4744, export preview ~:6008); its row body becomes a private `changeCard`. New `ChangeHistory` maps payload entries to the same view; the two inputs share no fields, so a union input would be larger. |
| 7 | Card anatomy and states (U3b) | Op title [P]; `previous -> new`; `author - date - state`; note; `sources` citation; "Go to element" (`focusElementCard` ~:4761). State is card text, not a `StatusBadge`: Unsent cards reuse the `local` badge; applied blocks read "Applied" [P]; `status:: conflict` or `rejected` blocks read "Not applied" [P] with the block `resolution::` (written at `apply-change.ts` ~:917, ~:429), else the changeset `resolution`; other blocks are not listed. Footer: Unsent = Discard; applied `update_field` = Revert. |
| 8 | Payload (U3b) | `loadChangesetRecords` (`element-history.ts` ~:93) also copies `from`, `to`, `name`, `concept`, `fields`, `resolution`. The domain payload already sorts `changes` newest first (`export-console.mjs` ~:1109). |
| 9 | Revert (U3b) | `store.addDraft` (`review.js` ~:222): `kind: correction`, current `hash`, `original` = current value, `proposed` = `from`, or `''` when absent. |
| 10 | One tab and banner (U3b) | `renderReviewTab` (~:4660) keeps id `review`. A [P] banner tops the Unsent list while it has items, and is a one-line note in its empty state. Applied section from `state.changes` (`model.changes` ~:6572). Delete `changes/assets/console-view-changes.js`; keep the nav filter for id `changes` (~:4255), since installed domains still carry it. |
| 11 | CSS | No CSS file edits. `export-console.mjs` (~:798) prefers `nn-ui.css`, an ungenerated copy 18 lines behind `innfo-ui.css`. |

## Decisions needed

- Whole-file rejection on mutation, validation or citation failure: open; default = keep.
- Chain strategy: recommended `stacked-to-main`.

## Regeneration

Never hand-edit generated files; on conflict take either side and regenerate.
`npm run regen` (core + mcp `dist`, payload mirror, both console bundles, registry,
catalog, versions, shells, docs `mcp-tools` region); `npm --workspace=@cognnitive/innfo-mcp
run build` for the committed `bin/innfo-mcp.bundle.js` and `bin/nn-mcp.bundle.js` (U1);
`node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`;
`npm run check:console-bundle`. Not `stage:mcp-bundle` (release step).
