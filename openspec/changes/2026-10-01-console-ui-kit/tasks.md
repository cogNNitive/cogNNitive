# Tasks: Console UI kit and design tokens

Change B of `A 2026-10-01-console-feedback-roundtrip-completion -> B (this) -> C 2026-10-01-console-review-ux`. Strict TDD: every slice starts with RED tests, each proven able to fail before GREEN. Default test environment is happy-dom (`// @vitest-environment happy-dom`); use a jsdom pragma only on a proven divergence, recorded in a code comment. Paths: `BP` = `iNNfo/specs/bluepriNNts`, `CON` = `BP/console`, `CORE` = `iNNfo/packages/innfo-core`.

Gates at the end of every slice: `npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/verify.js`, `node scripts/check-integrity.js`, `npm run check:console-bundle` (after `npm run build:console`). `format:check` is informational: introduce zero new drift.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2,400-2,700 hand-written (additions + deletions, about 55% tests/fixture/docs); the regenerated bundle is `-diff` (`.gitattributes`) and excluded |
| Per slice (no bundle) | a1 ~230, a2 ~340, b ~350, c1 ~390, c2 ~340, d1 ~320, d2 ~330, f ~380, e ~40 |
| 400-line budget risk | High (total); each slice Medium (c1, f at the limit) |
| Chained PRs recommended | Yes |
| Suggested split | a1 -> a2 -> b -> c1 -> c2 -> d1 -> d2, with f branching from b, then e (9 chained PRs) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (recommendation: feature-branch-chain) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Recommendation: `feature-branch-chain` with a draft tracker PR. c1-d2 leave intermediate states (one renderer migrated, shells half-tokenized), B ships under ONE `innfo-console-v*` tag together with C (cut in C's release slice), and nothing past a2 should reach `main` alone. PR #1 (a1) base = tracker (or A's last chain branch); each later PR targets its parent branch. f's parent is b; if f is stacked after d2 for linearity, keep it a separate PR. `stacked-to-main` is viable only for a1 and a2.

### Suggested Work Units

| Unit | Goal | PR | Base / notes |
|------|------|----|------|
| a1 | Bundle lib, drift suite, npm scripts, `check-integrity` wiring | PR 1 | Tracker / A's chain. Standalone, green. |
| a2 | `ui-kit.js` tokens + theme, `SOURCES` order, token and contrast tests | PR 2 | PR 1 |
| b | ConceptPill, ElementPill, MarkerChip, StatusBadge, `icon` move, kitchen sink | PR 3 | PR 2 |
| c1 | ElementCard, FieldRow, CitationIcon; `InnfoConsole` migration | PR 4 | PR 3 |
| c2 | `InnfoModelViewer` migration | PR 5 | PR 4 |
| d1 | Guard rule; `artifact_shell.html`, `model_console.html` | PR 6 | PR 5. Needs A merged. |
| d2 | `timeline.html`, `procedure_console.html`, docs | PR 7 | PR 6 |
| f | DraftList, AnnotationPopover, ReviewedToggle, RailProgress | PR 8 | PR 3 (b). Split f1 popover / f2 rest if over 400. |
| e | Release prep; no tag | PR 9 | Last PR |

Commit rule (`work-unit-commits`): one Conventional Commit per slice-level work unit; tests live in the same commit as the behavior; the regenerated bundle rides with its source change; explicit paths only (no `git add -A`/`.`/`commit -a`; shared tree); no AI attribution. Each child PR carries a dependency diagram marking the current PR and states start, end and out-of-scope (`chained-pr`).

### Pre-apply gates (resolve before slice a1 unless noted)

- [ ] G1 Change A is applied and merged into the chain base (B tokenizes A's injected UI).
- [ ] G2 Find where A puts the injected `innfo-feedback-*` UI CSS (bundle string in `innfo-runtime.js` vs a shell). If in the runtime, d1 also edits it (task d1.5).
- [ ] G3 Whether the committed bundle drifts from a fresh build is answered by test a1.1; do not assume.
- [ ] G4 Confirm the chain strategy with the user (Decision needed before apply).

## Slice a1: Bundle lib and drift guard (PR 1)

- [ ] a1.1 RED: `scripts/lib/console-bundle.test.js` (node:test). First test: `checkConsoleBundle(repoRoot)` on the real repo (does the committed bundle equal a fresh build?). Record the answer in the PR. Add: one altered byte fails and names the file; a changed source in a tmp copy fails; `SOURCES` lists the 5 current files; bundle has no `fetch(` and no `type=module`. Run it; confirm it fails (lib missing).
- [ ] a1.2 GREEN: create `scripts/lib/console-bundle.js` (`SOURCES`, `composeConsoleBundle(parts, version)`, `buildConsoleBundle(repoRoot)`, `checkConsoleBundle(repoRoot) -> { ok, errors }`) extracted from `scripts/build-console-bundle.mjs` (:33-39 `SOURCES`). Make the `.mjs` a thin entry; `--check` exits 1 on drift.
- [ ] a1.3 If a1.1 found pre-existing drift, run `npm run build:console` and commit the regenerated `CON/innfo-console.bundle.js` here (absorb it; note it in the PR body).
- [ ] a1.4 Prove red: mutate one byte of the bundle in a tmp copy; the drift test fails; revert.
- [ ] a1.5 Add `build:console` and `check:console-bundle` to root `package.json`; call `checkConsoleBundle` in `scripts/check-integrity.js` next to :118. `verify.js` auto-collects the `.test.js` (`collectTestSuites`); confirm it runs.
- [ ] a1.6 REFACTOR: naming only; tests stay green.
- [ ] a1.7 Verify (all gates). Commit: `feat(console): add bundle drift guard and build scripts`.

## Slice a2: Tokens and theme (PR 2)

- [ ] a2.1 RED: `CORE/tests/console-ui-kit-tokens.test.ts`: one `style[data-innfo-tokens]` after two `ensureTokens` (first child of `<head>`; same version no-op, different version replaces text); style text contains every `TOKEN_VALUES` value; four distinct statuses per theme; `setTheme(doc,'dark'|'light'|null)`; dark via `data-theme` without OS preference, light override under dark OS, no attribute follows OS (`new Window({ settings: { device: { prefersColorScheme } } })`); the `innfo:theme-change` message sets `data-theme`.
- [ ] a2.2 RED: `CORE/tests/console-ui-kit-contrast.test.ts`: an independent WCAG luminance function in the test; ratios computed from `TOKEN_VALUES` (never from literal ratios, only literal thresholds): 8 status pairs >= 4.5, `TEXT_PAIRS` >= 4.5 (allowed pairs only; light muted never on surface-2), origin icons on surface >= 3. Failure message names status and theme. Confirm red.
- [ ] a2.3 GREEN: create `CON/ui-kit.js` (UMD `InnfoUI`: `VERSION`, `TOKEN_VALUES` per the design table incl. the contrast-checked status and origin values, `TOKENS`, `generateTokenCss`, `ensureTokens` called at load when `document` exists, `setTheme`, theme-change listener, D2 selectors). The consumer-side `InnfoUI missing` error is added with the first consumer (b.3).
- [ ] a2.4 If happy-dom does not resolve custom properties under `prefers-color-scheme`, switch assertions to CSSOM rules (assert the generated rules text) and record the result in a code comment. This is the dark-mode fallback.
- [ ] a2.5 Prove red: change `pending` light to `#d97706`; the contrast test fails naming `pending` and `light`; remove `data-theme` handling; the dark-override test fails; revert both.
- [ ] a2.6 Move the `innfo:theme-change` listener (`CON/innfo-runtime.js` :1131-1142) into the kit calling `setTheme`; delete the `.dark`/`.light` class toggling there, no alias. Add `ui-kit.js` to `SOURCES` between `visuals.js` and `innfo-runtime.js` (extend the drift-suite order assertion); regenerate the bundle.
- [ ] a2.7 Verify (all gates; bundle scan still has no `fetch(`/`type=module`). Commit: `feat(console): add InnfoUI token layer and unified data-theme`.

## Slice b: Core pills, badges, icon, kitchen sink (PR 3)

- [ ] b.1 RED: `CORE/tests/console-ui-kit-{pills,status}.test.ts`: `data-*` for ConceptPill/ElementPill/MarkerChip/StatusBadge; `<img onerror>` label inert; `TypeError` naming the component (`ConceptPill(null)`); purity and `shadowRoot === null`; slot wrap (index 13 -> 2); `color: 'violet'` -> 2, `grey` -> 12, `chartreuse` -> index slot; count suffix; StatusBadge `count` + `aria-label "4 pending"`, unknown status throws; ElementPill origin present/omitted, `href`/`onSelect` root element; `conceptSlot`, `slug`, `ORIGIN_VARIANTS` exports. Confirm red.
- [ ] b.2 GREEN: add the four components, `slug`, `conceptSlot`, `ORIGIN_VARIANTS`, and component CSS (`:where([data-innfo-component=...])`) to `CON/ui-kit.js`; kebab-case names.
- [ ] b.3 RED then GREEN: `InnfoUI.icon(name,size,cls)` returns the same SVG as today's `svgIcon` for a known name; unknown name throws `TypeError`. Move the table from `CON/innfo-runtime.js` :1295; switch the runtime's 12 call sites to `UI.icon` (UMD factory injection with the D5 missing-kit error); delete `InnfoConsole.svgIcon`; update `CORE/tests/console-citation-dialog.test.ts` if it calls it.
- [ ] b.4 Prove red: remove the `data-status` assignment; the status test fails; revert.
- [ ] b.5 RED then GREEN: `CORE/tests/console-ui-kit-kitchen-sink.test.ts` asserts every implemented `data-innfo-component` appears under both `data-theme="light"` and `"dark"`; create `CORE/tests/fixtures/console-kitchen-sink/{index.html,kitchen-sink.js}` (side by side, offline boot, no `fetch`). Later slices extend it (c1, f).
- [ ] b.6 REFACTOR: dedupe element-creation helpers; regenerate bundle.
- [ ] b.7 Verify (all gates). Commit: `feat(console): add InnfoUI pills, badges, icons and kitchen sink`.

## Slice c1: ElementCard, FieldRow, CitationIcon, InnfoConsole migration (PR 4)

- [ ] c1.1 RED: `CORE/tests/console-ui-kit-card.test.ts`: ElementCard with 3 fields vs `fields: []`, `markers` -> `marker-chip`, `description`, `opts.head`/`opts.body` land in `.innfo-card-head`/`.innfo-card-body`, `collapsible` toggle + `aria-expanded`, `h3.innfo-card-name`; FieldRow one `CitationIcon` per distinct origin in order `error, agent, human, reviewer, document` (two same-origin citations -> one icon; two different -> two), `ref` -> `ElementPill` with `onRef`; CitationIcon `onOpen` fires and propagation stops; TypeErrors. Confirm red.
- [ ] c1.2 GREEN: add `ElementCard`, `FieldRow`, `CitationIcon` to `CON/ui-kit.js`; move the origin labels and order out of the runtime into the kit.
- [ ] c1.3 RED: re-point existing suites to `InnfoUI` and `data-*`: `CORE/tests/console-{dom,citations-dom,shell}.test.ts`, `test/console-review.test.mjs`, `test/console-export.test.mjs` (drop imports of the deleted pill/card builders); bundle-globals check gains `InnfoUI` plus the order assertion. Keep selectors `.innfo-card h3`, `.innfo-rail-item`, `#innfo-content .innfo-card` (`metrics/scripts/verify.harness.js:512-513`). Confirm red.
- [ ] c1.4 GREEN: `renderRail` wraps a `ConceptPill` (with `count`) in each `button.innfo-rail-item[data-concept]`; private `mountElementCards(doc, elements, drafts, onSuggest, refs)` replaces `renderCards` (ref -> `onRef: renderRefDialog`; D19: draft-count `span.innfo-card-badge` and Suggest button through `opts.head`/`opts.body`; A's injected feedback UI unaffected).
- [ ] c1.5 GREEN: delete `renderConceptPill`, `renderElementPill`, `renderCards`, `CITATION_ORIGIN_LABELS`, the inline `innfo-ref-pill innfo-element-pill` builder (:954) and their `PUBLIC_API` entries (:2823-2824). `slugify` stays (feeds `getDraftKey`; C deletes). Regenerate bundle.
- [ ] c1.6 Goal check: `rg "renderConceptPill|renderElementPill|renderCards|svgIcon" iNNfo/specs/bluepriNNts/console --glob "*.js"` matches nothing outside `ui-kit.js` and the bundle; add this scan as a test in the kitchen-sink/renderers suite (proven red before c1.5).
- [ ] c1.7 Extend the kitchen sink with the three components. REFACTOR: drop unused runtime helpers.
- [ ] c1.8 Verify (all gates; `metrics/scripts/verify.harness.js` still green). Commit: `refactor(console): compose InnfoUI in InnfoConsole and delete duplicate builders`.

## Slice c2: InnfoModelViewer migration (PR 5)

- [ ] c2.1 RED: `CORE/tests/console-ui-kit-renderers.test.ts`: one payload booted through both renderers; the same concept gives identical `data-innfo-component`, `data-concept-id` and `data-concept-slot` (slot index from `schema.concepts` as declared, before the viewer's weight sort); viewer emits `element-card`, `marker-chip`, `citation-icon`; scan of `console/*.js` for `className = 'chip'` and `el-head`; viewer throws the D5 error without the kit. Rewrite `console-citations-dom.test.ts` selectors (`.el-head .cite-icon.cite-*` -> `[data-innfo-component=citation-icon]`) and update `console-thinning.test.ts:90`. Confirm red.
- [ ] c2.2 GREEN: `CON/render-model-viewer.js`: `factory(root.InnfoUI, root.InnfoConsole)` / CJS equivalent; rail and headings use `ConceptPill`; `renderElement` -> `ElementCard(..., { domId: 'el-'+id, collapsible: true, head: headerCitationIcons, body: [relationsList] })`; markers -> `MarkerChip`; relation links -> `ElementPill({ href: '#el-'+id })`; citations -> `CitationIcon` with `onOpen: InnfoConsole.renderCitationDialog`; `applyHash`/hashchange select `[data-innfo-component=element-card]` and set `data-open`. Fields no longer a `<table>`.
- [ ] c2.3 GREEN: delete `COLORS`, `conceptColor` and its `getComputedStyle('--accent')`, private `slug` (use `InnfoUI.slug`), `ORIGIN_VARIANT_ORDER`, `CITATION_ICON_LABELS`, `citationVariant`, `citationButtons` (and its silent null path), `.chip`/`.el-head`/`.el-name`/`.dot` builders. Remove the matching component CSS at `BP/workspace/assets/model_console.html:145-207` (layout only remains). `render-procedure-stepper.js` is untouched. Regenerate bundle.
- [ ] c2.4 Goal check: the scan from c2.1 is green.
- [ ] c2.5 REFACTOR: drop dead viewer helpers.
- [ ] c2.6 Verify (all gates; offline scan). Commit: `refactor(console): compose InnfoUI in InnfoModelViewer`.

## Slice d1: Shell guard rule and artifact/model shells (PR 6; requires A merged)

- [ ] d1.1 RED: `scripts/lib/console-shell-guard.test.js`: `findRootColorDeclarations(html)` fails on a `:root` hex value, on `rgb(`/`hsla(` inside `@media ... :root`, names shell, selector and line; passes a clean shell and non-color layout custom properties (`--sidebar-w: 280px`); real `artifact_shell.html` and `model_console.html` fail now (proven red against unmigrated shells).
- [ ] d1.2 GREEN: implement `findRootColorDeclarations` in `scripts/lib/console-shell-guard.js` and wire the rule (already invoked at `verify.js:298`, `check-integrity.js:118`). The 2 timeline/procedure shells stay allowed-red only until d2: gate the rule per shell list in this slice, widened to all four in d2.
- [ ] d1.3 GREEN: migrate `BP/console/artifact_shell.html` (`:root` colors at :30-64, component CSS :196-523) and `BP/workspace/assets/model_console.html` (:17-43) to `var(--innfo-*)`; keep layout CSS only. The 3 bundle `<script>` tags and CDN pins are unchanged (bumped in C's release slice).
- [ ] d1.4 Remove the theme class mechanism from these shells; `data-theme` is the only mechanism.
- [ ] d1.5 If G2 found A's `innfo-feedback-*` CSS in the runtime bundle string, re-skin it with `var(--innfo-*)` in `CON/innfo-runtime.js` and regenerate the bundle; add a test asserting no hard-coded color in that CSS. If it is in a shell, migrate it here.
- [ ] d1.6 Update `CORE/tests/console-thinning.test.ts` for the removed shell CSS classes (assert they live in the kit instead).
- [ ] d1.7 Verify (all gates). Commit: `refactor(console): move artifact and model shells to semantic tokens and add the root-color guard`.

## Slice d2: Specialized shells and docs (PR 7)

- [ ] d2.1 RED: widen the guard test to all four shells; `timeline.html` (:50-98) and `procedure_console.html` (:17-71) fail. Add a test that `timeline.html` has no `.dark`/`:root:not(.light)` block.
- [ ] d2.2 GREEN: migrate `BP/metrics/assets/timeline.html` (delete the `.dark`/`:root:not(.light)` blocks and the `.innfo-card*`/pill CSS at :230-263) and `BP/procedures/assets/procedure_console.html`; map per-shell variables to tokens, keep layout variables.
- [ ] d2.3 Verify the 5 frozen vendored bundles are byte-unchanged: `metrics/samples/`, `procedures/samples/export/Ghostbusters_V_0-2-0_procedures_console/`, `procedures/procedures/export/document_sop_console/`, `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/bluepriNNts/metrics/samples/`, `iNNfo/packages/innfo-core/tests/legacy/fixtures/legacy-domain/templates/metrics/samples/`. Add a test (hash list) proving they are untouched and not covered by the drift check.
- [ ] d2.4 Manual check: kitchen sink and each of the 4 shells with `data-theme="dark"` under a light OS preference, plus the `workspace_hub` theme message; record results in the PR.
- [ ] d2.5 Docs: create `docs/innfo/documentation/console-ui-kit.md` (every token, component signature, `data-*` hook, build/check commands, frozen copies, C hand-off hooks). Write any `cogNNitive/iNNfo` slug as split code spans (`check:spec-urls`).
- [ ] d2.6 Verify (all gates; `node scripts/verify.js` template inventory guard unaffected). Commit: `refactor(console): move timeline and procedure shells to tokens and document the UI kit`.

## Slice f: Review components (PR 8; depends on b only)

- [ ] f.1 RED: `CORE/tests/console-ui-kit-review.test.ts`: DraftList two rows with delete and no status control, "target changed" on hash mismatch and on missing `byId` element (stale token); AnnotationPopover `role=dialog`/`aria-modal`, Tab wraps last -> first and Shift+Tab, Escape calls `onCancel` once and not `onSave`, `kinds: ['comment','delete']` has no `correction` option or `proposed` input, correction shows `original` read-only; ReviewedToggle `state: 'changed'` -> `data-state="changed"` `aria-pressed="false"`; RailProgress `{2,4,2}` shows `2/4` and pending `2`, `RailProgress({ reviewed: 'x' })` throws `TypeError` naming it; `<img onerror>` inert; purity. Confirm red.
- [ ] f.2 GREEN: add the 4 components and their CSS to `COMPONENT_CSS` in `CON/ui-kit.js` (no storage, no state, callbacks only); extend the kitchen sink; regenerate bundle.
- [ ] f.3 Prove red: break the Escape handler (calls `onSave`); the popover test fails; revert. Split into f1 (popover) / f2 (rest) if the diff passes 400.
- [ ] f.4 Verify (all gates). Commit: `feat(console): add presentational review components to InnfoUI`.

## Slice e: Release prep (PR 9; no tag in B)

- [ ] e.1 `.agents/skills/nn-dev-release/SKILL.md`: `templates-v*` -> `blueprints-v*` (:68, :149, :199, :218-219) only if A has not already (maintainer-only skill; no `skills-v*`).
- [ ] e.2 Hand off the release checklist to C's release slice (D14), written into C's tasks or this PR body: next minor above the highest `innfo-console-v*` tag at release time; bump all three `console_assets` entries (shared ref key); `build:console`, `sync:versions`, `check:versions`, `check:console-bundle`; bump shell CDN pins; bump `channels.stable.refs[blueprints]` (`0.19.1` today; A plans `0.20.0`); no `blueprint_version` bump (assets are ignored by the immutability guard); `verify` and `check-integrity` (detached worktree if dirty); merge `dev` -> `main` as a merge commit, then tag `innfo-console-vX.Y.Z` and `blueprints-vA.B.C`; no `innfo-mcp-v*`/`skills-v*`.
- [ ] e.3 Verify (all gates). Commit: `docs(release): correct the blueprints tag prefix and hand off the console release`.

## Hand-off hooks for change C (acceptance, asserted by the c1/c2/f tests)

- [ ] h.1 Exactly one card commit point per renderer: `InnfoConsole.refresh -> mountElementCards` and viewer `render()`. B does NOT dispatch `innfo:rendered`; C adds `doc.dispatchEvent(new CustomEvent('innfo:rendered', { detail: { root } }))` there.
- [ ] h.2 Stable hooks: `[data-innfo-component=element-card][data-element-id]`, `[data-innfo-component=field-row][data-field]` inside it, `[data-innfo-component=concept-pill][data-concept-id]`, containers `.innfo-card-head`/`.innfo-card-body`.
- [ ] h.3 `InnfoUI.TOKEN_VALUES`, `TEXT_PAIRS`, `StatusBadge` with `stale`, and the 4 review components exported; C adds review CSS to `COMPONENT_CSS` and `ReviewToggle` itself.

## Dependency order

a1 -> a2 -> b -> c1 -> c2 -> d1 -> d2; f needs only b; e last. Parallel candidates: f alongside c1-d2 only in a separate worktree (single writer thread by default, so treat as sequential).
