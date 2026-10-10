# Apply progress: S0 and S1 (domain-console-views)

Status: S0 and S1 (a, b, c) done. Not pushed.

## Commits

- `5dacf108` chore(console): remove orphan domaiNN_console.html iframe shell (S0)
- `17204bc0` fix(console): name exports after the model slug instead of the title (S1c)
- `036f8f12` fix(console): re-render every draft-count surface on draft changes (S1b)
- `83f46196` fix(console): give the Matrices tab its own panel (S1a)

## S0

`rg` for `domaiNN_console` found no reference to the asset file: only proposal/task prose, `scripts/export-console.mjs` (which writes its own output at the domain root, unrelated to the asset) and `test/console-export.test.mjs` (same output). `manifest/source.yaml` does not mention it. File deleted, no reference fixes needed.

## S1 (RED then GREEN per bug)

Tests: `test/console-tabs-matrices.test.mjs`, `test/console-draft-count-live.test.mjs`, `test/console-export-filename.test.mjs`, shared jsdom boot helper `test/helpers/console-boot.mjs`.

- S1a RED: `innfo-tab-matrices panel exists` assertion failed (panel absent). GREEN: `renderViewTabs` creates the panel and moves `#innfo-matrices` into it (sibling of the explorer panel); clicking the tab activates it and the matrix renders inside.
- S1b RED: review tab badge null (expected `1`); delete test could not find a delete control because no draft existed. GREEN: `createReviewController` takes `onDraftsChanged`; `refreshCount()` delegates to it and the runtime passes `refresh`, which re-renders banner, Review tab badge and pending-count text. The dead `[data-innfo="draft-count"]` regex update was removed.
- S1c RED: `composeExport` failed with `model must be a non-empty alphanumeric identifier` (title with spaces). GREEN: new `modelSlugOf(state)` (explicit `model_slug`/`modelSlug`, else slugified `modelId`, else slugified title, via the bundled core `slugify`). Used for the feedback filename and both changeset filenames. `boot()` now reads `meta.model_slug`. `test/console-review.test.mjs` regex updated to the lowercase slug.

Final run: `node --test test/console-*.test.mjs` = 51 pass, 0 fail.

## Bundle

`node scripts/build-console-bundle.mjs` (`npm run build:console`); bundle regenerated and committed with each fix. No other committed artifact embeds the bundle that the verify steps flagged (Console Payload Mirror, Generated Console Shells: fresh).

## check-integrity

`node scripts/check-integrity.js`: 140 of 142 steps pass, 2 fail, both environmental (worktree has no built `dist`):

- `skills/nn-upgrade/scripts/migrate-domain.test.js`: `iNNfo/packages/innfo-core/dist/index.js` not found.
- Docs-Derived Facts Drift Guard: `iNNfo/packages/innfo-mcp/dist/server.js` not found.

Neither touches console files. Console bundle freshness steps pass.

## Notes and surprises

- `composeExport` still builds changeset `target::` addresses from the model title (`draftToChange`); D5 wants the `model_slug` there. Out of S1 scope; belongs to the address-grammar slice.
- `meta.model_slug` is not yet emitted by `scripts/export-console.mjs` (D4 slice); the runtime falls back to slugified `modelId`.
- The controller's old `data-innfo="draft-count"` hook never existed in the DOM.
- A frozen testlab fixture bundle (`test/fixtures/testlab/artifacts/.../innfo-console.bundle_*.js`) contains an old copy of the code; left untouched.

## Review follow-up

A fresh review found three issues; each was fixed in its own commit with the bundle rebuilt (`node scripts/build-console-bundle.mjs`).

- `e994d51a` test(console): cover the Matrices panel against the real artifact shell. New helper `bootConsoleFromShell()` loads `artifact_shell.html` (where `#innfo-matrices` starts inside `#innfo-tab-explorer`) and asserts the sibling `#innfo-tab-matrices` panel, host relocation and tab switching. RED proof: temporarily skipping the host move in `renderViewTabs` failed both the toy and shell tests; restored. No source change, so no bundle change.
- `d4c5cbb5` fix(console): update draft counts without remounting the element cards. `onDraftsChanged` now maps to `refreshDraftCounts()` in `boot()`: it updates the banner count in place, the Review tab badge in place, and re-renders the review tab, stats bar and rail; cards are never remounted. `review.js` `refreshCount()` always re-applies decorations afterwards; the duplicate `refreshCount()` calls after `saveDraft` (tag remove, relation unlink) and in the reviewed toggle were removed. RED (fix reverted): card node identity not preserved, reviewed toggle remounted cards. GREEN: same node, focus retained on a sibling control, three counters correct, 54 console tests pass. Note: per-card "Has Comment"/"Draft Edit" badges and projected correction values are still only refreshed by a full refresh (search, reviewer change, review-tab delete); this matches the behaviour before `036f8f12`.
- `5465d525` fix(console): derive a stable hashed model slug for non-Latin titles. `modelSlugOf` falls back to `model-<8 hex FNV-1a of the title>` instead of the constant `model`, always matching `^[A-Za-z0-9-]+$`. Added the missing boot test (`meta.model_slug` -> `state.modelSlug` -> downloaded filename); RED proof by removing the mapping, restored. RED for the fallback: two non-Latin titles both produced `model`.

`node --test test/console-*.test.mjs`: 57 pass, 0 fail.
