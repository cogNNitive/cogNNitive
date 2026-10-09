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

