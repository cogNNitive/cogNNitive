# Apply progress: S2 (domain-console-views)

## S2a Registry core

Status: tasks 2a.1-2a.8 done, 2a.9 verification done except the fresh-context review (owned by the orchestrator). Not pushed.

### Commits

- `afcc5384` feat(console): add view registry with validation and id-bound registrar (2a.1-2a.3)
- `2588eb0c` feat(console): build tabs from the view registry with lazy mount, hash routing and error notice (2a.4-2a.8)

The bundle was rebuilt (`node scripts/build-console-bundle.mjs`) and committed with each runtime change.

### RED / GREEN per task

- 2a.1 `test/helpers/console-boot.mjs`: `bootConsole({ registry, model, url })`. `model` and `url` are extra options needed by the no-Matrices and `#hash` tests.
- 2a.2 RED: `registerView contract` suite, 10 tests, all failed with `TypeError: InnfoConsole.createViewRegistry is not a function`. 2a.3 GREEN: same 10 pass (`createViewRegistry`, `registerView`, `viewRegistrar`, `validateViewDef`).
- 2a.4 and 2a.6 RED (one combined run of the rest of the file after 2a.3): 8 of 11 failed (ordering, lazy mount, hash routing, duplicate keeps first, role=alert notice, invalid-definition notice, mount-throw isolation, built-in collision). The 3 that passed were trivially true before (no Matrices tab without matrices, no notice when nothing failed, never-activated view not mounted).
- 2a.5 and 2a.7 GREEN: `mountTabs`/`updateTabBadges`/`renderViewErrors`; all 21 tests in the file pass, 78 console tests pass, 3 repeated full runs stable.
- 2a.8 bundle rebuilt in both commits.

### Verification

- `node --test test/console-*.test.mjs`: 78 pass, 0 fail.
- `node scripts/check-integrity.js`: all gates passed (the two `dist` failures seen in S0/S1 are gone because `dist` is built).
- Size: `innfo-runtime.js` +312/-125 lines (hand-written, net +187), tests +214, helper +4/-4. The generated bundle is separate.

### Deviations from design

- Built-ins are NOT stored in the registry. `builtinViews()` builds them per boot and `mountTabs` merges them with `registry.list()`. Reason: the default registry is a module singleton, and booting twice (tests, `require` cache) would otherwise register built-ins twice. An external view whose id equals a built-in id is skipped and reported in the notice (duplicate), instead of reserving more ids.
- The legacy `canonical` (order -2) and `studio` (order -1) tabs stay as built-ins pointing at the existing `#innfo-tab-domain` / `#innfo-tab-studio` panels, so the metrics timeline keeps working until S2d removes them. They are existing behaviour, not new legacy, so no `legacy:` marker was added; S2d must delete `builtinViews()` entries for them.
- `renderViewTabs` is removed from the public API (no backwards compat); nothing outside the runtime used it.
- The view `ctx` in S2a is minimal: `{ id, container, doc, ui, payload: { schema, model, meta } }`. `store`/`modal`/`changeset`/`mountHtml` and `payload.models` belong to S2b.
- `onShow` is not called on the first mount, only on later switches (design: "later switches call onHide/onShow").
- A tab click now sets `location.hash` (history entries, back/forward) instead of the old `location.replace`. Initial activation does not write the hash, so `#q=` is preserved.
- 2a.6 and 2a.7 were implemented together with 2a.5 (the notice is part of `mountTabs`), so there is no separate GREEN step for 2a.7.

### Surprises

- The first commit (`afcc5384`) contains the whole test file, so it carries tests that fail until `2588eb0c` (the RED tabs/errors tests were committed ahead of their GREEN). Squash or reorder if a strictly green history is wanted.
- The hashchange test was flaky with a fixed 20 ms wait under the parallel test runner; it now polls up to 2 s.
- `mountTabs` runs before the first `refresh()` (panels and host moves first) while the first view mounts in `activateInitial()` after the review controller exists. A search query present at boot clicks the Explorer tab during that first refresh, which now also decides the initial tab.
- `renderViewTabs` used to rebuild the nav on every refresh; the new flow never rebuilds it, so a refresh cannot remount a view.

### S2a review follow-up

Fresh review of `afcc5384`, `2588eb0c`, `ceb6651a`. One commit per fix, bundle rebuilt each time.

1. Panel-id collision. RED: external `domain` / `studio` views mounted into the existing `#innfo-tab-<id>` panel (2 failures). GREEN: `mountTabs` rejects a view whose panel exists and lacks `data-innfo-view=<id>`; panels it creates carry that marker (so a re-boot recognises its own).
2. Icon injection. RED: `InnfoIcons.getSvg('x"><img onerror=1>')` emitted `class="lucide lucide-x"><img onerror=1>"` and `registerView` accepted it (2 failures). GREEN: icon must match `/^[a-z0-9-]+$/`; `getSvg`/`Icon` reduce the name to slug characters before the class attribute.
3. Missing `<main>`. RED: `Cannot read properties of null (reading 'appendChild')` out of boot. GREEN: a view with no panel is reported in the notice and its `mount` is not called; panel is non-null in the mount catch.
4. Hash. RED: 5 of 6 new tests in `test/console-hash-routing.test.mjs`. GREEN: hash is `#<tab>&q=<query>` (`#q=` alone still opens Explorer); `parseViewHash`/`buildViewHash`; refresh rewrites the hash with replaceState (also fixed: it used the bare `history` global, absent in tests, so that path was never exercised); Explorer is auto-selected only when the query changed and the hash did not name a tab, via `select(..., true)` (no history push); hashchange back/forward also follows the query.
5. Re-boot. RED: 3 failures (notices 2 -> 4, hashchange listeners 2 -> 4, 2 renders per input). GREEN: per-document teardown (WeakMap) removes the previous boot's hashchange and search-input listeners; mount/hook/collision reports are per-boot (`bootErrors`), the registry keeps registration errors only; owned panels are cleared before a re-mount. Not covered: the review controller's own listeners still stack on re-boot (pre-existing, out of scope).
6. Comments fixed. The reorder in `activateInitial` is kept: it buys that an initial `#q=` search picks Explorer without first mounting the default view (new test).
7. Tests added: skipped built-in is absent (tab count, no panel; mutation `if (clash)` -> `if (false)` turns it red), onShow/onHide throwing, no remount across search input, no default mount on initial search. These are characterization tests of existing behavior, so they were green on first run.


## S2b Mount context

Status: tasks 2b.1-2b.9 done. 2b.10 verification run (below); the fresh-context review is owned by the orchestrator. Not pushed.

### Commits

- `feat(console): give registered views a shared mount context and sandboxed readonly iframes (2b.1-2b.9)` (code, tests and rebuilt bundle in one commit, see Deviations)

### RED / GREEN

- RED (2b.1, 2b.4, 2b.5, 2b.7 in one new file `test/console-view-context.test.mjs`, 17 tests): 15 failed for the right reason (`Cannot read properties of undefined (reading 'propose' | 'onChange' | 'edit')`, ctx key list mismatch, no iframe, no notice). 2 passed by accident of the old behavior: "editable ctx has no mountHtml" and "editable view calling mountHtml throws and stays isolated" (the call hit `undefined`, a TypeError the S2a catch already isolates). Both are kept as guards.
- GREEN (2b.2, 2b.3, 2b.6, 2b.8): 17/17. `review.js` gains `openEdit(anchorData)` and `propose` (= `saveDraft`, now returning the saved draft or `null`). Runtime: `editableParts()` facades, `subscribeDrafts` listener list fired from `refreshDraftCounts`, `mountHtml`, `stripIframes` (synchronous, after mount, also after a throwing mount) plus a per-view `MutationObserver` created before mount and disconnected in `destroy`.
- 2b.9: bundle rebuilt (`node scripts/build-console-bundle.mjs`, 12 sources, 0.9.0).
- 2b.10: `node --test test/console-*.test.mjs` twice: 112 pass, 0 fail both runs. `node scripts/check-integrity.js`: all gates passed.

### Deviations and decisions

1. One code commit instead of one per 2b task pair: the facades, iframe code and tests touch the same two files and the bundle, so splitting would have meant artificial intermediate bundles.
2. `modal.comment` needs a comment-only target. `openEdit({ comment: true })` opens the shared `UI.EditModal` in comment mode; with no field it builds a synthetic `commentOnly` target (the kit modal has no element-level mode). If the user flips the modal to "Propose value", `commentOnly` forces a comment draft rather than a field-less correction.
3. `payload.models` is `meta.models` when an array, else `[]` (the design lists the key but not its source).
4. Without the `feedback-export` need there is no review controller: `store.propose` and `modal.*` throw `review is not enabled (feedback-export need missing)`; `drafts()`, `remove`, `onChange` and `changeset.*` still work on the draft store.
5. `store.propose` throws for an unknown `elementId` (the controller used to drop it silently).
6. An editable view's `ctx` has no `mountHtml`; "an editable view calling mountHtml" is covered as a TypeError isolated by the mount catch, and the iframe guard is covered by appending an iframe directly (sync, nested, and via the observer).
7. `ctx.mountHtml` replaces the panel's previous iframe, so a readonly view cannot stack frames; it returns the iframe.
8. `test/helpers/console-boot.mjs` gained a `runScripts` option (jsdom) for the script test.

### Surprises and known limits

- jsdom does not load `srcdoc` documents and does not enforce `sandbox`, so "an inline script in the srcdoc does not execute" is true in jsdom even without a sandbox. The test (booted with `runScripts: 'dangerously'`) is a regression guard against the html being evaluated in the parent; the actual guarantee is the exact sandbox value, asserted token by token. Browser behavior is not covered by any automated test.
- Readonly ctx still exposes `doc`, `ui` and `payload` (trusted view code per the spec); the iframe contents are what is isolated.
- The view listener list is per boot and not cleared on re-boot; a re-booted document gets a fresh list, stale listeners die with the old boot.
- Hand-written lines: about 175 added (runtime 142, review.js 33) plus 261 test lines.

### Review items for the fresh-context review (2b.10)

- `openEdit`/`commentOnly` path in `review.js` (`openModalFor`, `isComment` flag) and the lost `lastAnchor` focus restore when a view opens the modal.
- Whether `store.propose` throwing for a missing controller is acceptable versus exposing a draft-only store.
- Observer ordering: it is created before `t.mount`, and `stripIframes` is called after mount; check there is no double report for one iframe.
- `onChange` fires after the host surfaces refresh, inside `refreshDraftCounts`; confirm a listener that proposes again cannot loop.

## S2b review follow-up

A fresh-context review of a4ae234a and ca81ec4d raised eight items; each was fixed test-first (RED observed before the fix) in its own commit, with the console bundle rebuilt in every code commit.

| # | Item | Resolution |
|---|------|------------|
| 1 | commentOnly target could be flipped to "Propose value" and saved empty | `UI.EditModal` takes `commentOnly` (mode toggle not rendered, mode fixed) and rejects a blank comment with a visible `.innfo-edit-error`; `review.js` also refuses to store a blank comment draft |
| 2 | `store.propose` coerced unknown kinds and accepted empty input | Throws for an unknown kind, a blank comment, a correction without field or `proposed`; `original` for `name`/`description` now comes from the element, matching the modal path |
| 3 | `onChange` re-entrancy, swallowed errors, stale listeners | Nested notifications are coalesced (at most one extra pass, then a surfaces-only pass so counts show the final state); a throwing listener is reported in `#innfo-view-errors` under its view id; the listener list is cleared on destroy/re-boot |
| 4 | `openEdit` side effects and focus | Validation runs before `closePopover`; focus anchor is `document.activeElement` at call time (ignoring focus inside the modal being replaced) and Cancel restores it |
| 5 | Iframe guard gaps | Guard covers `iframe`, `object`, `embed`, `frame`; editable views are watched across `ctx.doc.body`, readonly views inside their panel; only frames created by `mountHtml` are exempt; `mountHtml` returns nothing |
| 6 | CSP | `base-uri 'none'` and `form-action 'none'` added; comment records that meta-refresh navigation in the frame is accepted |
| 7 | Stale decorations after `store.remove` | Controller exposes `refresh()` (count surfaces + decorations); `remove` uses it when a controller exists |
| 8 | Decorative srcdoc test | Rewritten to assert delivery via the attribute only plus the sandbox tokens; carries an honesty note that jsdom does not enforce the sandbox |

### Decisions and limits

- The embedding guard is an accident guard for trusted view code, not a security boundary: a MutationObserver reacts after insertion and shadow roots are out of scope (stated in a code comment).
- `store.propose` accepts every kind in `ITEM_KINDS` (including `new` and `delete`); only `comment` and `correction` have extra input rules.
- Editable views are watched across the whole body, so any non-`mountHtml` frame anywhere in the document is removed and reported while such a view is mounted. The console has no other frame producers today.
- Mutation checks (fix switched off, tests went RED, fix restored): fix 1 (toggle + blank-comment guard: 2 red), fix 2 (kind check + `name` original: 2 red), fix 3 (re-entrancy guard, listener cleanup, error reporting: 3 red), fix 6 (CSP string: 1 red), item 8 (html parsed into the parent: 1 red).
- Hand-written delta since ca81ec4d: runtime +126/-33, review.js +14/-2, ui-kit.js +15/-2, tests +295/-7.

## S2c1 Exporter lib

Status: tasks 2c1.1-2c1.5 done; 2c1.6 (verification) done except the fresh-context review (owned by the orchestrator). Not pushed. Branch `session/domain-console-views-s2c1`.

### Commits

- `49998822` feat(console): add view discovery, wrapping and inlining lib for the exporter (2c1.1-2c1.3)
- `ec43a2e0` feat(console): export --domain as one self-contained file with discovered views (2c1.4-2c1.5)
- fix(console): load the view lib lazily so the exporter still runs standalone (follow-up to `ec43a2e0`, found by check-integrity)

### TDD evidence

- RED 2c1.1-2c1.2: `node --test test/console-views-lib.test.mjs` failed with `ERR_MODULE_NOT_FOUND` for `scripts/console-views.mjs`; GREEN: 22 pass, 0 fail.
- RED 2c1.4: with the exporter untouched, 7 of the 8 new `--domain` tests failed (sibling bundle and CSS written, three bundle tags, no header, no view scripts, no early failure); the eighth (determinism) passed already and stays as a guard. GREEN: `test/console-export.test.mjs` 19 pass, 0 fail.
- Final: `node --test test/console-*.test.mjs test/*export*.test.mjs` run twice, 168 pass, 0 fail both times.

### Design as built

- `scripts/console-views.mjs` exports `parseSpecName`, `viewRootCandidates`, `discoverViews`, `assertClassicScript`, `escapeScript`, `wrapView`, `viewsHeader`, `inlineConsoleAssets`. S2c2 adds `CONSOLE_SIZE_BUDGET` and `evaluateSizeBudget` beside them; `inlineConsoleAssets` already receives bundle, css and views separately so the three sizes are measurable.
- The shell and the bundle are unchanged (`build-console-bundle.mjs --check` reports fresh), so nothing generated needed rebuilding. `inlineConsoleAssets` anchors on three existing shell patterns (CSS link, viewport meta, local bundle tag plus the `nn:console-shell` block) and throws if one is missing, so a shell edit cannot silently reintroduce a second bundle copy.
- ES module detection compiles the exact emitted wrapper with `vm.Script`, so comments and strings cannot fool it, and ordinary syntax errors are reported too (`<source>: syntax error: ...`). Dynamic `import()` still passes (legal in a classic script).
- Discovery runs before anything is written: a bad view, a duplicate or a missing `innfo-ui.css` exits 1 with no per-model consoles and no domain file.

### Deviations and decisions

1. Header `kind` is the origin (`bluepriNNt` or `domaiNN`). The editable/readonly kind is declared at runtime inside the view, so the exporter cannot know it.
2. "First existing root wins" is evaluated on the views directory itself (`.../assets/consoles/views`), not on the package directory, so a domain copy of a package without views falls through to the next root.
3. Several models sharing a base (`metrics_V_0-4-1`, `metrics_V_0-3-0`) read one package: the first spec name wins.
4. `--domain` no longer writes `innfo-console.bundle.js` and `innfo-ui.css` at the domain root; existing ones are left alone, never deleted.
5. Reserved ids and the id regex are duplicated from the UMD runtime (the lib is ESM); a lib test registers each reserved id against the runtime registry so drift fails.
6. No `innfo-views` header comment is written when there are no views.
7. Source labels are stable (`bluepriNNt:<base>/assets/consoles/views/<slug>.js`, `domaiNN:consoles/views/<slug>.js`), independent of which root resolved, so output does not vary by machine paths.

### Surprises and known limits

- check-integrity caught a standalone-contract break: `scripts/export-console.mjs` is distributed as a lone file (manifest `innfo-console-export-cli`, `release-keys` `DISTRIBUTION_PATHS`) and `scripts/export-console.test.mjs` runs a lone copy. A static import of the lib broke 4 of those tests (`ERR_MODULE_NOT_FOUND`), and a `tsc` error in the lib (`RegExp` tuple typing) failed Typecheck Scripts. Fix: the lib is imported dynamically only for `--domain`, with a clear error when it is absent. Resolved below (see the decision on the distributed lib path): a lone distributed exporter cannot run `--domain` until `scripts/console-views.mjs` is also distributed (manifest entry, `DISTRIBUTION_PATHS`, `innfo-console` repoPaths, installer). Not done here: it touches release plumbing.
- `--domain` still writes the per-model consoles under `artifacts/` first (existing behaviour: `args.domain` selects every model). Only the domain file is single-file.
- The shell config JSON still carries `runtime.cdn` and `runtime.fallback` URL strings; they are data, not script tags, and nothing loads them in the inlined page. Left as is.
- Only `</script` and `</style` are escaped. A view with `<!--` followed by `<script` inside a string could still confuse the HTML parser; the spec does not cover it.
- Determinism holds apart from `meta.generated` (the domain payload uses `new Date()`); the test strips that stamp.
- Hand-written lines: lib 167, exporter +34/-10, tests 358 (232 lib, 126 export).

### Review items for the fresh-context review (2c1.6)

- Anchors in `inlineConsoleAssets` versus the generated `nn:console-shell` block (does `console-shell-sync` ever change its shape?).
- `assertClassicScript` message matching on other Node versions' SyntaxError wording.
- First-wins base dedupe and views-dir-level root selection (deviations 2 and 3).
- The jsdom boot test relies on `load` and the default tab mounting; it exercises no click or hash route.

## S2c1 review follow-up

A fresh-context review of S2c1 (49998822, ec43a2e0, 08abd2a4) found one HIGH and several MEDIUM/LOW issues. All are fixed, one commit each, tests first (mutation-checked: the fix was reverted and the matching tests went red).

### A. The lib is distributed (3113eaaa)

- The installer (`installConsoleAssetAtCommit`) places every `console_assets` file flat in one folder, keyed by basename, so `lib/console-views.mjs` cannot exist after an install without reworking the installer, the state file keys, the manifest schema and the bundled `skills-manager.js`. Decision: the lib moved from `scripts/lib/console-views.mjs` to `scripts/console-views.mjs`, which resolves identically in the repo and in an installed folder (`./console-views.mjs`). Folding it into the exporter was rejected: the exporter runs `main()` on import, so the lib could no longer be unit tested.
- Added to `manifest/source.yaml` `console_assets`: `console-views.mjs`, `innfo-ui.css` and `console-payload.generated.cjs`. The last two are read by the exporter (`--domain` inlines the CSS; every mode loads the payload mirror) and were never listed, so an installed set could not run at all outside a repo checkout. The payload mirror gap also contradicts the `console-export-slots-and-standalone-pin` spec ("MUST ship as a console_assets entry").
- `release-keys.js`: `scripts/console-views.mjs` in the `innfo-console` repoPaths and in `DISTRIBUTION_PATHS`.
- Tests: `scripts/export-console.test.mjs` rebuilds an installed folder from the manifest `console_assets` list (flat, by basename) and runs `--domain` from it with no repo tree; the lib absent gives the clear error; a missing module imported from inside the lib is not turned into that message (`err.url` must be the lib itself); non-domain modes still work without the lib.
- `docs/use/manifest-next.md` and `docs/update/manifest-next.md` are pin-resolved previews regenerated by the release/deploy flow; they were not edited by hand. `validate-manifest.js` needs the network and fails against `main` for pre-existing pin drift unrelated to this change.

### B. Fixes

1. HIGH, escape (9ba4a93e): `<!-- <script>` in a view or the bundle put the HTML tokenizer in the script-data double-escaped state and swallowed the rest of the page. `escapeScript` now rewrites `</script` and `<script` followed by whitespace, `/` or `>` (any case) to `\x3C`, the same character in a string, template (cooked value), regex (also `u`) and comment. Decision: `<!--` itself is not rewritten. The state needs both `<!--` and `<script`, so neutralizing `<script` is sufficient; rewriting `<!--` is unsafe (a comment start in code position, `\!` is an error in a `u` regex). A sequence in code position (`1 <script >2`) cannot be escaped and fails the export naming the view or the bundle. jsdom tests prove the following script and markup survive, for comments, strings, mixed case and a `u` regex.
2. Atomicity (e43fffe1): `assertInlinable` (anchors, bundle, css, view and bundle embeddability) runs before the first write. Tests: a shell missing each anchor, a missing bundle, a missing css, an unembeddable view; each exits non-zero and leaves no `artifacts/` and no domain file.
3. parent_spec (62b1bfdd): the base must match `/^[A-Za-z0-9_-]+$/` before it is a path segment (`../../x_V_0-1-0` and others are refused).
4. Selection (56515d8b): spec names and bases are sorted by code unit; an existing but empty candidate folder counts as absent. Decision where the spec and design are silent: when several models share a base on different versions and their lookups resolve to different view folders, the export fails naming both spec names and folders, instead of picking the highest version. Reason: two folders mean two different sets of code for the same blueprint, and any pick hides one silently, the same stance as the duplicate id rule. Versions that resolve to the same folder (typically the shared package) are fine. Not "highest wins" because a newer model version does not imply its views are the intended ones for older models in the same domain.
5. No silent skips (2f665653): a symlinked `*.js` throws naming the file (default; the spec does not allow following); `readdir` errors other than ENOENT/ENOTDIR throw (tested with a mocked EACCES). The symlink test falls back to a junction where file symlinks need a privilege and skips with a reason only if neither can be created.
6. Module detection (0c772521): `findModuleSyntax` is a token scanner (strings, nested template `${}`, regex literals, comments) that names `import`, `export`, `import.meta` and top-level `await` after the compile fails; it no longer reads V8 message text. The `'use strict'` wrapper rejecting sloppy-only code (`with`, legacy octals) is documented and tested. The reserved-ids drift test now parses the runtime's list and pattern and compares both ways, plus 29 probe ids against the runtime registry.
7. Bundle block (b67af9b2): exactly one `nn:console-shell` bundle block is required and a bundle script tag outside it fails the export. Decision on stale root files: nothing is removed; `--domain` warns once on stderr naming `innfo-console.bundle.js` and/or `innfo-ui.css` left in the workspace root, and stays silent when there are none.

### Known limits

- The token scanner is heuristic for regex versus division after `)` and for `await` in parenthesized arrow bodies; it only decides the wording of an error that has already been raised, never whether a script is accepted.
- `escapeScript` changes the raw (`String.raw`) value of an escaped template, not its cooked value; the previous `<\/` form had the same property.
- A `<script`/`</script` sequence in code position is rejected rather than rewritten.
- Pre-existing and untouched: `--domain` still writes the per-model consoles when it runs.

## S2c1 packaging follow-up

Packaging re-review of S2c1. Findings 1-5 and 7 fixed; finding 6 (escape semantics) accepted as is.

1. Release ordering (9886c1ce). Verified in `assemble-manifest.js`: on a non-console release a console asset with no previous pin got `ref`/`commit`/`url` of `undefined` and was rendered as `ref: "undefined"`; the new assets have no pin and `innfo-console-v0.9.0` does not contain `scripts/console-views.mjs`. Now `assembleManifest` throws an `AssembleManifestError` naming the asset and asking for an innfo-console release first (RED test first, plus a test that no `undefined` is ever rendered). tasks.md has 2c1.8 (cut an innfo-console release above the previous pin before any other release or main merge carrying the manifest change); design.md Rollback has the same constraint. The tracker must not reach main before that release.
2. Upgrade path (db3024f9). Chosen: `update` installs the missing members of a console set that is partly installed (the set is one unit; any present member makes the rest "outdated"). It does not start a set that was never installed (`install` owns that). Source `scripts/lib/skills-commands.js`; the bundled `skills-manager.js` was rebuilt. SKILL.md also documents it.
3. Installed bluepriNNt views (5de9b0b2). Chosen: resolve, and warn. `packagesDir` is `$INNFO_BLUEPRINTS_DIR`, else the parent of the console dir when it is the repo console dir, else `~/.agents/bluepriNNts` (where the installer places packages, `<name>/`). `discoverViews` takes `onWarning` and warns when a base has no package in the domain tier-1 folder or `packagesDir`; a package that exists without views stays silent. The installed-set tests now assert the bundle (once), the CSS, a domain view and a bluepriNNt view, the default home path, and the warning.
4. Lists in step (a7441d69). New `scripts/release/console-asset-lists.test.js` compares manifest `console_assets` with `RELEASE_TABLE['innfo-console'].repoPaths`, `DISTRIBUTION_PATHS` and freshness `SUBSYSTEM_PATHS['innfo-console']` (both directions where it applies) and requires unique basenames. Drift fixed: freshness watched only the console folder; it now also watches `scripts/export-console.mjs` and `scripts/console-views.mjs` (fixtures in `freshness.test.js` updated). Mutation checks: dropping the view lib from freshness, from repoPaths, from DISTRIBUTION_PATHS, or from `console_assets` each fails the guard.
5. Docs (9886c1ce for apply-progress paths; the docs commit for SKILL.md and README.md).
7. Single compile (1f33c370). `prepareAssets` escapes and compiles the bundle and views once; `assertInlinable` returns the prepared assets and `inlineConsoleAssets` accepts them, so the exporter pays once. A test counts `vm.Script` compiles of the bundle (2 for two raw calls, 0 for prepared).

Open: none. The real fix for finding 1 is operational (cut the release before merging to main); the code only turns a silent bad manifest into a loud failure.

## S2c2 Budget, --view, sample

Status: tasks 2c2.1-2c2.6 done; 2c2.7 verification done except the fresh-context review (owned by the orchestrator). Not pushed. Branch `session/domain-console-views-s2c2`.

### Commits

- `496bc469` feat(console): add the console size budget constant and pure evaluateSizeBudget (2c2.1-2c2.2 lib)
- `fec0fef4` feat(console): gate export size and add standalone --view <id> with a scoped draft store (2c2.3-2c2.4), bundle rebuilt
- `d778db31` feat(console): add the missing-descriptions sample custom view (2c2.5-2c2.6)
- docs(openspec) commit: tasks marked, this section

### TDD evidence

- RED 2c2.1: `test/console-views-lib.test.mjs` failed with `does not provide an export named 'CONSOLE_SIZE_BUDGET'`; GREEN: 68 pass.
- RED 2c2.3: all 9 tests of `test/console-export-view.test.mjs` failed against the untouched exporter (no gate, no `--view`). After the exporter change 8 passed; the scoped-key/title test stayed red until the runtime change. GREEN: 9 pass.
- RED 2c2.5: `test/console-sample-custom-view.test.mjs` 3 of 3 failed without the sample file; GREEN: 3 pass.
- Mutations (each reverted afterwards, bundle rebuilt and `--check` fresh): unscoped store key, built-ins kept when scoped, gate disabled (`budget.status === 'fail'` -> `false`), `--view` not narrowing the views, and the fail threshold raised by 5 MB in the lib. Each turned the matching tests red (1, 1, 2, 1 and 4 failures).

### Design as built

- `CONSOLE_SIZE_BUDGET` (frozen) and the pure `evaluateSizeBudget({ bundle, models, views, total })` live in `scripts/console-views.mjs`; no new distributed file. It returns `{ status, total, breakdown, message }`. The exporter prints the breakdown on stdout on every `--domain`/`--view` export, warns on stderr above 5,000,000 B and exits 1 above 15,000,000 B. The only knob is the constant (no env flag); the tests build real 6 MB and 16 MB views.
- The domain/standalone HTML is now rendered and measured before the per-model loop, so a failing budget leaves the workspace untouched (previously the per-model consoles were written first). Bundle = inlined bundle script + CSS, models = schema + model JSON, views = wrapped scripts.
- `--view <id>` reuses the `--domain` aggregate payload and discovery, narrows the views to the one id (unknown id: error listing the available ids, or `(none)`, before any write), adds `meta.consoleScope = { view }` and writes only `artifacts/<id>_view/<id>_view_<stamp>.html` (write-once family, bundle inlined, no per-model consoles, no domain file). `--view` with `--domain` exits 2.
- Runtime: `consoleScopeOf(meta)`. When scoped: no built-in tabs, only that view is listed, the explorer panel is not active, the draft store key is `<modelId>::view:<id>`, the export slug is `<slug>-<id>`, and the title (`state.modelTitle` and the changeset `meta.title`) becomes `<domain title> - <view title>`. The changeset schema is untouched.
- Sample: `_samples_nn/consoles/views/missing-descriptions.js` (the sample domaiNN is the `_samples_nn` root). Editable, one row per element without a description (25 in the sample), an input plus a "Propose description" button calling `ctx.store.propose` with a `correction` on `description`.

### Deviations and decisions

1. The sample proposes through `ctx.store.propose` with an inline input, not `ctx.modal.edit` as the File Changes row in design.md says: it is directly testable under jsdom and the maintainer brief named `ctx.store`.
2. Changeset title: the changeset uses `meta.title` verbatim, so a scoped export has `title: "<domain> Domain - <view title>"` (no "Review Changes:" prefix; that string is only the JSON feedback's own meta title). The view title is read from the registry at boot, so the exporter does not run the view.
3. The stem test checks `changesetFilename` (`<slug>-<id>_<reviewer>_<stamp>_changes_NN.md`); the JSON feedback filename shares the same slug.
4. Unlike `--domain`, `--view` writes nothing besides its single file.
5. The sample test drives the final changeset through the runtime's `composeExport` with a state built from the stored drafts, because the page does not expose its state.

### Surprises and limits

- The working copy of `innfo-runtime.js` is CRLF while git stores LF; edits were made with a CRLF-preserving script.
- A scoped page still shows the rail and the search toolbar (they belong to the explorer). Only the explorer panel is deactivated; hiding the chrome is not specified.
- `--view` output is never deduplicated (the payload carries a fresh `meta.generated`), like the `--domain` file.
- Not done here: the docs (`offline-consoles.md`, SKILL.md) do not yet mention `--view`; S2d repoints those.

### Review items for the fresh-context review (2c2.7)

- The reorder in `export-console.mjs` (aggregation moved above the per-model loop) against the old `--domain` behaviour.
- `mountTabs` filtering the registry by scope and the explorer panel left in the DOM.
- Draft-store key and slug when a modelId already contains `::view:`.

## S2c2 review follow-up

A fresh review of S2c2 found seven points. Resolution:

1. `--view` is now strictly the whole-domain scoped export. Combined with `--all`, `--stale`, `--filter` or a model name it exits 2 before anything is written, like `--view` + `--domain`. This also removes the draft-key mixing between filtered and unfiltered exports. Usage text updated.
2. `--view` with no value (last argument, or followed by another flag) exits 2 with "--view needs a view id".
4. A scoped console removes the search toolbar, concept rail and stats bar (removed, not `[hidden]`, because the rail's `display:flex` would override the attribute), ignores URL search queries, and `focusElementCard` is a no-op (the `<html>` element carries `data-innfo-scope`). The export button, banner and changeset are unchanged. The unscoped console is unchanged (tested).
5. The `--view` branch reports a deduplicated write as `= <file> unchanged` and counts it as unchanged. Tested end to end by freezing `Date.prototype.toISOString` through `NODE_OPTIONS=--import` so two runs produce identical bytes.
6. (a) The sample test boots the real generated `--view missing-descriptions` page, proposes, and downloads the changeset through the console's own export modal (the old hand-built state test is replaced). (b) A two-view test proposes through `ctx.store` in one domain console (one store, one changeset), then boots scoped alpha and beta consoles in the same jsdom window over the same real `localStorage` and asserts three distinct keys with the expected drafts. (c) The sample locks a row with a pending description draft (disabled input and button, "Proposed") and unlocks it when the draft is removed; repeated clicks create one draft.
7. `skills/nn-innfo/SKILL.md` documents `--view <id>` and the size budget next to the `--domain` notes. No page under `docs/` describes the exporter's flags (`offline-consoles.md` does not), so nothing else changed.

Skipped by decision: stale draft keys across same-named roots (pre-existing, out of scope).

Mutation checks (fix reverted, RED seen, restored): view/selection guard, missing view id, runtime scoped chrome removal, `focusElementCard` guard, scoped draft key, scoped changeset title, sample lock.

## S2d Timeline view

Status: tasks 2d.1-2d.9 done, 2d.10 verified (node --test green, innfo-core green except one pre-existing failure, check-integrity green except a worktree-only dist-provenance guard), fresh-context review done and its findings fixed. Branch `session/deepseek-s2d` (5 commits, pushed). 2d.11 (templates release + sample regeneration + MCP restage) is operational, pending the maintainer.

### Commits

- `664b93af` feat(console): flatten bluepriNNt view discovery and project timeline rows into meta.models[]
- `a4612317` feat(console): make timeline renderers host-scoped and ship the metrics timeline view
- `ff87fcb5` feat(console): retire the metrics timeline shell, point consumers at the view, bump metrics to V_0-4-2
- `d7950672` chore(versions): sync metrics V_0-4-2 across samples, catalog and editor shipped versions
- `2e6d9f2a` fix(console): align S2d spec paths, harness timeline probe and chart claims with the flat view

### 2d.1 (verified fork 4)

`fetchSubdir('assets')` in `resolver-node.ts` iterates the GitHub contents API and takes only `entry.type === 'file'`, so nested `assets/consoles/views/` never survives an install. Decision taken: bluepriNNt views are FLAT at `<pkg>/assets/console-view-<slug>.js`; the domaiNN root stays `<domainRoot>/consoles/views/<slug>.js`. `scripts/console-views.mjs` walks the `/assets` roots and filters `console-view-*.js`; source labels stay `bluepriNNt:<base>/assets/console-view-<slug>.js`.

### Design as built

- `deriveProjection(elements)` (in `console-views.mjs`) turns a metrics model's `Metrics`/`Variables` elements into timeline rows (growth from `Evolution` relations via element id, formula unless `<placeholder>`, `months` from the widest `Scenario.scenarioMonths`), and returns `null` without a scenario horizon. `export-console.mjs` adds `blueprint` (parent_spec base) and `projection` to each `meta.models[]` entry only when non-null.
- `renderCharts(host, ...)`, `renderStudioView(host, ...)`, `renderTimelineGrid(container, model, meta, hooks)` take elements (no `getElementById`); `renderTimelineGrid` creates its own grid and studio hosts and renders an edit-row action when `hooks.onEditRow` is given. `builtinViews` loses the `canonical`/`studio` pair; boot loses the `renderCharts`/`renderTimelineGrid` calls; `artifact_shell.html` drops `#innfo-charts`, `#innfo-tab-domain`, `#innfo-tab-studio`.
- `metrics/assets/console-view-timeline.js`: order 10, editable, reads `ctx.payload.models[].projection`, calls `InnfoConsole.renderTimelineGrid(host, {rows}, {months}, { onEditRow: (id) => ctx.modal.edit({ elementId: id }) })`, empty state when no projection.

### Deviations and decisions

1. `projection.rows` is an array derived by the EXPORTER (maintainer chose option A), so the view stays thin and the derivation is unit-testable in the lib.
2. `renderStudioView` stays internal to the runtime; the timeline view renders the grid, and `renderTimelineGrid` mounts the studio into its own child host, preserving the old canonical+studio behaviour inside one tab.
3. Charts do not render in the domain timeline: the aggregate payload has no per-model `series`, and the change is a non-goal on the schema. `renderCharts` keeps its host-element signature for the reference shells; the metrics procedure text no longer claims charts render.
4. The metrics blueprint bumps to `V_0-4-2`; `sync-versions`/`blueprint-catalog`/`sync-samples` regenerated `samples.ts`, `catalog.json` and the versioned sample (`Ghostbusters_V_0-4-2_metrics_NN.md`).

### Surprises and limits

- `metrics-console-slot.test.ts` and `console-thinning.test.ts` read `timeline.html`; repointed to the view file. `console-shell-guard.test.js` asserted four live shells and a `.dark` check on `timeline.html`; both removed (three shells now).
- `console-dom.test.ts` "emits a file named by the feedback contract" fails with `acme_...` vs `Acme_...` — reproduced on the chain tip (`8b0a4cdf`), so it is pre-existing, not S2d. Its feedback export filename is unchanged by this slice.
- `check-integrity` is green except `Docs-Derived Facts Drift Guard`; the worktree has no built `dist`, so `innfo-core`/`innfo-mcp` dist was copied from the primary (which is on `dev`), and the guard compares the primary's MCP tool facts against this chain's HEAD — a worktree/artifacts-provenance artifact, not an S2d regression.
- The Ghostbusters sample console (`metrics/samples/Ghostbusters_V_0-1-0_console.html`) is a frozen fixture (the thinning guard asserts its legacy inline colors); regenerating it to carry the timeline view is deferred to 2d.11 with the templates release.
- The tracked `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` still embeds the pre-S2d metrics spec; restage it (`stage-mcp-bundle.mjs`) before release.

## S2e Procedure view

Status: tasks 2e.1-2e.4 done, 2e.5 verified (node --test green, innfo-core green except the pre-existing `console-dom` failure, check-integrity green except the worktree-only dist guard), fresh-context review done and its 3 HIGH findings fixed. Branch `session/deepseek-s2d`. 2e.6 (templates release + repin) is operational, pending the maintainer.

### Commits

- `2ab46cb0` feat(console): make the procedures stepper a scoped console view and retire its shell
- `bc9884c1` fix(console): scope the procedure view DOM, wire its lifecycle hooks and repoint the procedures sample

### Design as built

- `render-procedure-stepper.js` exposes `mount(container, payload, hooks)` (the UMD factory returns `{ version, RENDERER_VERSION, mount }`). It builds the procedures-view DOM inside `container` (header, procedure tabs, wizard/document subtabs, progress, step body, scoped ref/log dialogs) and shadows `document` with `container.ownerDocument`, so every node it creates lives in the view tree. No `document.getElementById`; no `id` at all. `autoBoot` and the rail/matrices/concept views are gone.
- The stepper's execution-log dialog is now created inside the container (no `#innfo-export-modal`, no `#audit-log-container`, no `#run-timer`).
- The stepper returns lifecycle hooks `{ onHide, onShow, unmount }`; the `procedure` view returns the stepper handle so the registry's `onHide`/`onShow` pause and restart the run timer.
- `procedures/assets/console-view-procedure.js`: order 20, editable, delegates to `InnfoProcedureStepper.mount(ctx.container, { schema, model })`.
- The stepper CSS (~700 lines) moved from the deleted shell into `innfo-ui.css`, with the id-keyed selectors converted to classes (`#proc-tabs` -> `.proc-tabs`, `#doc-body.hidden`/`#wizard-body.hidden` -> a generic `.hidden`).
- `procedures` blueprint bumps to `V_0-3-2`; `sync-versions`/`blueprint-catalog`/`sync-samples` regenerated the sample, catalog and editor shipped versions; `canonical-registry.ts` and `metaplantilla-specs.test.ts` repointed.

### Deviations and decisions

1. The stepper CSS moved to `innfo-ui.css` (the shared console stylesheet the exporter inlines) rather than staying with a shell: the shell is deleted and the exporter only inlines one CSS file plus the view scripts.
2. The stepper's `matrices` RACI lookup stays (it feeds the step RACI box); only the matrices/concept *views* and the rail are dropped.
3. The dead-view CSS (rail, matrix, concept-card rules) is still present in `innfo-ui.css`; trimming it is a follow-up, kept now to avoid a fragile hand-trim.

### Surprises and limits

- `console-dom.test.ts` "emits a file named by the feedback contract" fails with `acme_...` vs `Acme_...`; it reproduces on the chain tip, so it is pre-existing, not S2d/S2e.
- `check-integrity` stays green except `Docs-Derived Facts Drift Guard` (worktree dist provenance, see S2d).
- The bundle was rebuilt after every stepper edit; `build-console-bundle.mjs --check` is fresh.
- The stepper file is eslint-ignored (`iNNfo/specs/bluepriNNts/**`), so the now-unused `hooks` parameter of `mount` is not flagged.

## S3 Hub retirement

Status: tasks 3.1-3.8 done. Branch `session/deepseek-s2d`. The reviewer-guide was left unchanged (it carries no hub reference). The templates release/repin (task 2d.11/2e.6) and `sdd-verify`/`sdd-archive` remain.

### Commits

- `c0222b86` feat(console): retire the Workspace Hub and its editor view; guard against hub references
- `9e3854bf` fix(console): tighten the hub guard, drop dead consoleArtifacts helpers and relabel the [d] menu entry

### What changed

- New guard `test/no-workspace-hub-references.test.mjs`: requires the 7 hub files deleted and scans every tracked file for `workspacehub` / `workspaceconsoleshub` / `workspaceconsolehub` / `consolehubview` / `compileworkspacehub` / `compilehub` (normalized, case- and separator-insensitive), allowlisting the SDD archive, this change folder, `openspec/specs/`, the legacy/refactor fixtures, the testlab fixture, `simulation/FINDINGS.md`, `simulation/results/` and `openspec/backlog.md`.
- Deleted: `workspace/assets/workspace_hub.html`, `workspace/procedures/compile_workspace_hub_NN.md`, `_samples_nn/procedures/compile_workspace_hub_procedures_NN.md`, `docs/.../workspace-console-hub.md`, `innfo-core/tests/workspace-hub.test.ts`, editor `ConsoleHubView.vue` + `ConsoleHubView-open-external.test.ts`, and the now-dead `consolePrompt.ts(+test)` and `utils/consoleArtifacts.ts(+test)`.
- Repointed: `_samples_nn/procedures_NN.md`, `_samples_nn/artifacts_NN.md`, the executive report `prov:wasGeneratedBy`, `skills/nn-innfo/SKILL.md` (prose + the `[d]` menu label), docs `innfo-editor.md`/`_sidebar.md`/`ai-index.yaml`/`documentation_NN.md`/`llms.txt`, the testlab-coverage hub subtest, and the two naming tests (gap 8 -> `compile_model_console`).
- Editor wiring removed: `WorkspaceView.vue` (async import + consoles branch), `Header.vue` (Consoles button, `selectView` union, `Layers` import, `activeViewIcon`), `stores/uiStore.ts` (`activeView` union), `composables/useViewSync.ts` (valid-views list); the affected tests (`Header.test.ts`, `LeftSidebar-navigation.test.ts`, `uiStore-selectNode.test.ts`, `safe-url.test.ts`) updated.

### Deviations and decisions

1. `consolePrompt.ts` and `utils/consoleArtifacts.ts` were deleted, not merely edited: after `ConsoleHubView.vue` was gone they had no non-test consumer, so editing them would have left dead code.
2. `openspec/specs/**` is allowlisted in the guard: the canonical SDD spec store is synced from the delta specs at `sdd-archive`, so it legitimately still names the hub until then. The `console-architecture` delta scenario now says "outside the reference guard's allowlist" to match.
3. `simulation/results/**` and the testlab fixture are allowlisted as frozen/generated history; the orphan `test/fixtures/testlab/artifacts/workspace_hub_*.html` stays as a frozen fixture.

### Surprises and limits

- The editor suite passes in full (753 tests); `vue-tsc` is not installed in this worktree (partial install), so the editor typecheck ran only via CI/the pre-push hook in non-worktree checkouts. The affected editor tests were run directly and pass.
- `check-integrity` stays green except `Docs-Derived Facts Drift Guard` (worktree dist provenance, see S2d).
- `workspace` has no parseable `blueprint_version` and `_samples_nn` is unversioned, so S3 needed no version bump.
