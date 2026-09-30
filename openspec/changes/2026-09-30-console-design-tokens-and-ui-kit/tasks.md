# Tasks: Console design tokens and UI kit

Paths are relative to the repo root; `BP` = `iNNfo/specs/bluepriNNts`, `CON` = `BP/console`, `CORE` = `iNNfo/packages/innfo-core`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,100-1,500 hand-written (about 55% tests/fixture/docs); the regenerated bundle adds about 2x the source diff but is hidden by `.gitattributes` (`*.bundle.js -diff`) |
| 400-line budget risk | High (total); each slice is sized Low-Medium |
| Chained PRs recommended | Yes |
| Suggested split | a -> b -> c1 -> c2 -> d -> e (6 chained PRs) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (recommendation: feature-branch-chain) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Recommendation: `feature-branch-chain`. Slices b-c2 leave the tree in an intermediate state (new kit unused, then one renderer migrated), and the release (e) needs the whole chain on `dev` -> `main` as one merge commit. A tracker branch gives rollback control and one integration point. `stacked-to-main` is viable for a and b only (each is standalone and green); c1 onward should not reach `main` alone.

### Suggested Work Units

| Unit | Goal | PR | Est. lines (no bundle) | Base / notes |
|------|------|----|-----|------|
| a | Build lib, drift guard, npm scripts, `ui-kit.js` tokens only | PR 1 | 350-420 | Base = tracker (or main). Depends on change 1 applied. |
| b | 5 components, icon move, kitchen sink | PR 2 | 380-450 | Base = PR 1 branch. Tight; if over 400, move the kitchen sink to its own commit range in PR 3. |
| c1 | CitationIcon, FieldRow, `InnfoConsole` migration and deletions | PR 3 | 300-400 | Base = PR 2 branch |
| c2 | `InnfoModelViewer` migration, `model_console.html` CSS removal | PR 4 | 250-350 | Base = PR 3 branch |
| d | 4 shells token migration, lint rule, docs | PR 5 | 250-350 | Base = PR 4 branch. Depends on change 1 lint. |
| e | Release: version bumps, tags, repin | PR 6 | <100 + generated | Base = PR 5 branch |

Work-unit commit rule: one Conventional Commit per numbered group below (tests live in the same commit as the behavior); the bundle is regenerated in the same commit as the source that changes it. No `git add -A` / `.`; stage explicit paths. Every child PR carries a dependency diagram marking the current PR.

### Cross-change dependencies

- Requires change 1 (`2026-09-30-console-cleanup-and-lint`) applied: the 5 thin shells are already collapsed, and its shell lint exists.
- Change 1's shell lint gains a rule in slice d: no color values (`#hex`, `rgb(`, `hsl(`) inside shell `:root` blocks. This is a modification of change 1's lint file, not a new lint.
- Change 3 reuses `StatusBadge`; change 4 builds on all components. Legacy `templates/console` URLs, pins and tier wording stay with the rename change.

## Slice a: Build guard and tokens (PR 1)

- [ ] a.1 RED: `scripts/lib/console-bundle.test.js` (node:test): fresh build equals checked-in bundle; one altered byte fails and names the file; a changed source in a tmp copy fails; `SOURCES` order puts `ui-kit.js` after `visuals.js` and before `innfo-runtime.js`. Run it and confirm it fails (lib missing).
- [ ] a.2 GREEN: create `scripts/lib/console-bundle.js` (`SOURCES`, `composeConsoleBundle`, `buildConsoleBundle`, `checkConsoleBundle`) extracted from `scripts/build-console-bundle.mjs`; make the `.mjs` a thin entry with `--check` exiting 1.
- [ ] a.3 Prove red: mutate one byte of the bundle in a tmp copy; the drift test must fail; revert.
- [ ] a.4 RED: `CORE/tests/console-ui-kit-tokens.test.ts` (happy-dom pragma): one `style[data-innfo-tokens]` after two `ensureTokens`; first child of `<head>`; four statuses distinct in light and dark; `data-theme` beats OS preference (`new Window({settings:{device:{prefersColorScheme}}})`); `TOKENS`/`VERSION` exported. Covers spec scenarios "Tokens injected once", "Every status has a token", theme scenarios.
- [ ] a.5 GREEN: create `CON/ui-kit.js` (UMD `InnfoUI`: `ensureTokens`, `TOKENS`, `VERSION`, token CSS per design table, D2 selectors, D1 injection at load). If happy-dom does not resolve custom properties, switch assertions to CSSOM rules (design open question 1) and record the result in a code comment.
- [ ] a.6 GREEN: add `ui-kit.js` to `SOURCES`; add `build:console` and `check:console-bundle` to root `package.json`; run `npm run build:console` (bundle regenerated in this commit).
- [ ] a.7 Offline guard: extend the bundle scan test (no `fetch(`, no `type=module`) to cover the new bundle.
- [ ] a.8 REFACTOR: tidy `console-bundle.js` naming; no behavior change; tests stay green.
- [ ] a.9 Verify: `npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/verify.js`, `node scripts/check-integrity.js`, `npm run check:console-bundle`. Commit: `feat(console): add token layer and bundle drift guard`.

## Slice b: Components and kitchen sink (PR 2)

- [ ] b.1 RED: `CORE/tests/console-ui-kit-{concept-pill,element-pill,element-card,marker-chip,status-badge}.test.ts`: render and `data-*`, `<img onerror>` label inert, `TypeError` naming the component, purity and `shadowRoot === null`, concept slot wraps at 12, named `color` selects slot (violet -> 2, grey -> 12), `count` on ConceptPill, StatusBadge `count` + `aria-label`, unknown status throws, ElementCard with 3 fields vs `fields: []`, ElementPill origin present/omitted. Confirm all red.
- [ ] b.2 GREEN: in `CON/ui-kit.js` add `ConceptPill` (D9 slot rule), `StatusBadge`, `MarkerChip`, `ElementPill` (D6), `ElementCard` (D14 `innfo-card*` classes; `head`/`body` slots) and component CSS via `:where([data-innfo-component=...])` (D3).
- [ ] b.3 RED then GREEN: icon test (`InnfoUI.icon(name,size,cls)` returns the same SVG as today's `svgIcon` for one known name); move the `svgIcon` table from `CON/innfo-runtime.js` into the kit. Runtime export is deleted in slice c1.
- [ ] b.4 Prove red: delete `data-status` assignment in `StatusBadge`; the status-badge test must fail; revert.
- [ ] b.5 RED then GREEN: `CORE/tests/console-ui-kit-fixture.test.ts` asserts every `data-innfo-component` value appears under both `data-theme="light"` and `"dark"`; create `CORE/tests/fixtures/console-kitchen-sink/{index.html,kitchen-sink.js}` (light/dark side by side, three-tag offline boot, no `fetch`).
- [ ] b.6 REFACTOR: dedupe element-creation helpers in `ui-kit.js`; regenerate bundle (`npm run build:console`).
- [ ] b.7 Verify: lint, typecheck, `npm run test`, `node scripts/verify.js`, `node scripts/check-integrity.js`, `check:console-bundle`. Commit: `feat(console): add InnfoUI core components and kitchen sink`.

## Slice c1: CitationIcon, FieldRow, InnfoConsole migration (PR 3)

- [ ] c1.1 RED: `console-ui-kit-{citation-icon,field-row}.test.ts` (origin-typed variants per `console-field-citations`, field row with two citations, ref -> `ElementPill` with `onRef`, `onOpen` callback fires, TypeError cases).
- [ ] c1.2 GREEN: add `CitationIcon` and `FieldRow` to `CON/ui-kit.js`.
- [ ] c1.3 RED: re-point existing tests to `InnfoUI` and `data-*` selectors: `CORE/tests/console-{dom,citations-dom,citation-dialog,shell}.test.ts` and `test/console-review.test.mjs` (drop direct `renderConceptPill`/`renderElementPill`/`renderCards` imports; add `InnfoUI` to the bundle-globals check; selectors stay `.innfo-card`/`h3` per D14). Also update `metrics/scripts/verify.harness.js:505` only if a selector changes. Confirm red before the migration.
- [ ] c1.4 GREEN: `CON/innfo-runtime.js` becomes `factory(require('./ui-kit.js'))` / `factory(root.InnfoUI)` (D4); `renderRail` composes `ConceptPill` + `StatusBadge`; add private `mountElementCards` (`ElementCard` + `FieldRow` + `StatusBadge` in `head`, Suggest button in `body`).
- [ ] c1.5 GREEN: delete `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, their exports (`:2823-2824`) and the inline `innfo-ref-pill innfo-element-pill` builder. Regenerate bundle.
- [ ] c1.6 Verify slice goal: `rg "renderConceptPill|renderElementPill|renderCards|svgIcon" iNNfo/specs/bluepriNNts/console --glob "*.js"` finds only `ui-kit.js` (and the bundle's copy of it).
- [ ] c1.7 REFACTOR: remove now-unused helpers in `innfo-runtime.js`; tests stay green.
- [ ] c1.8 Verify: lint, typecheck, test, `verify.js`, `check-integrity.js`, `check:console-bundle`. Commit: `refactor(console): compose InnfoUI in InnfoConsole and delete duplicate builders`.

## Slice c2: InnfoModelViewer migration (PR 4)

- [ ] c2.1 RED: `CORE/tests/console-ui-kit-parity.test.ts`: the same concept in `InnfoConsole` and `InnfoModelViewer` yields identical `data-innfo-component` and `data-concept-id` (spec "Same concept, same markup"); viewer renders `element-card`, `marker-chip` and `citation-icon` through the kit. Confirm red.
- [ ] c2.2 GREEN: `CON/render-model-viewer.js`: UMD injection of `InnfoUI`; rail and headings use `ConceptPill`; `renderElement` -> `ElementCard({...},{domId:'el-'+id, collapsible:true, body:[relationsList]})`; markers -> `MarkerChip`; citations -> `CitationIcon` with `onOpen: InnfoConsole.renderCitationDialog`.
- [ ] c2.3 GREEN: delete `COLORS`, `conceptColor`/`getComputedStyle('--accent')`, `.chip`/`.el-head`/`.el-name`/`.dot` builders and `citationButtons`; remove component CSS at `BP/workspace/assets/model_console.html:145-166` (layout only remains). Regenerate bundle.
- [ ] c2.4 Verify slice goal: `rg "className = 'chip'|el-head" iNNfo/specs/bluepriNNts/console --glob "*.js"` finds nothing.
- [ ] c2.5 REFACTOR: drop dead viewer helpers; tests stay green.
- [ ] c2.6 Verify: lint, typecheck, test, `verify.js`, `check-integrity.js`, `check:console-bundle`; offline scan. Commit: `refactor(console): compose InnfoUI in InnfoModelViewer`.

## Slice d: Shell token migration and docs (PR 5)

- [ ] d.1 RED: extend change 1's shell lint tests with the rule "no color values (`#hex`, `rgb(`, `hsl(`) in a shell `:root` block" (spec "No shell color tokens"); run against the four shells and confirm red. Non-color layout variables must stay allowed (add a passing case).
- [ ] d.2 GREEN: implement the rule in change 1's lint module (wired already into `scripts/verify.js` and `scripts/check-integrity.js`).
- [ ] d.3 GREEN: migrate `BP/console/artifact_shell.html` (incl. component CSS at `:503`) and `BP/workspace/assets/model_console.html` to `var(--innfo-*)`; remove `:root` color vars.
- [ ] d.4 GREEN: migrate `BP/metrics/assets/timeline.html` and `BP/procedures/assets/procedure_console.html` last (D11); map per-shell variables to tokens, keep layout vars.
- [ ] d.5 Manual check: open the kitchen sink and each shell with `data-theme="dark"` and OS preference light; note results in the PR.
- [ ] d.6 Docs: create `docs/innfo/documentation/console-ui-kit.md` (all tokens, component signatures, `data-*` hooks, build/check commands, frozen vendored bundles per D12). Keep cited slugs as split code spans if any `cogNNitive/iNNfo` slug appears (`check:spec-urls`).
- [ ] d.7 Verify: lint, typecheck, test, `verify.js`, `check-integrity.js`, `check:console-bundle`. Commit: `refactor(console): move shells to semantic tokens and document the UI kit`.
- [ ] d.8 Bump `template_version` for workspace, metrics and procedures specs if the guard requires; register in the editor `SHIPPED_TEMPLATE_VERSIONS` (recurring gap). Shell edits under `BP/**` require the `blueprints-v*` release in slice e.

## Slice e: Release (PR 6; after the chain lands on `dev`, merged to `main` as a merge commit)

Note: the `nn-dev-release` skill text is stale (it says `templates-v*`). The REAL tags are `innfo-console-v*` and `blueprints-v*` (`manifest/source.yaml`: `console_assets` ref_key `innfo-console`, stable refs keys `blueprints`, `innfo-console`). Verify key names in the manifest before tagging.

- [ ] e.1 Choose the console version: next minor above the highest published `innfo-console-v*` tag (`0.7.0`, or `0.8.0` if change 1 cut one; D10). Bump all three `console_assets` entries (shared ref key).
- [ ] e.2 Run `npm run build:console`, then `sync:versions`, then `check:versions` and `check:console-bundle`. Never hand-edit refs computed by `scripts/lib/channel-refs.js`.
- [ ] e.3 Bump `channels.stable.refs[blueprints].version` (`0.19.1` -> next) because `BP/**` shells changed; confirm template content on `main` will match the pinned tag (validate-manifest byte-checks it).
- [ ] e.4 Run `node scripts/verify.js` and `node scripts/check-integrity.js` (from a detached worktree if the tree is dirty: `git worktree add --detach <tmp> <sha>`).
- [ ] e.5 Merge `dev` -> `main` as a merge commit; tag `innfo-console-vX.Y.Z` and `blueprints-vA.B.C`; push tags. Published tags are never deleted; rollback = revert slice commits, stable stays on `0.6.0` until repin.
- [ ] e.6 Post-release: confirm the Pages deploy republished the CDN bundle and the stable manifest resolves both new tags.

## Amendments from change 4 (console-review-ux)

- [ ] am.1 `ui-kit.js` MUST expose `InnfoUI.TOKEN_VALUES = {light, dark}` (token name -> value) and generate its token CSS from it, so change 4's contrast test reads the same values that ship. Add a test in slice a (e.g. the CSS contains every `TOKEN_VALUES` entry).
- [ ] am.2 The pending status pair (`#d97706` on `#fef3c7`) MUST pass WCAG 4.5:1 for text or the token is changed (hand estimate is about 2.9:1; other light status pairs may also fall short). Change 4's contrast test is authoritative; if it fails after this change is released, change 4 updates the token values and any literal-hex assertions here.
- [ ] am.3 Scope boundary: the new UI pieces `AnnotationPopover`, `ReviewedToggle`, `ReviewProgress`, `DraftList` and `ReviewToggle` are added to the kit by change 4, not by this change. Do not build them here.
