# Design: Console UI kit and design tokens

Change B of `A 2026-10-01-console-feedback-roundtrip-completion -> B (this) -> C 2026-10-01-console-review-ux`. Rebased from `archive/2026-09-30-console-design-tokens-and-ui-kit/design.md` (D1-D14) and, for the review primitives, `archive/2026-09-30-console-review-ux/design.md` (D4, D8, D12, D15).

## Technical Approach

Add one UMD source, `iNNfo/specs/bluepriNNts/console/ui-kit.js` (global `InnfoUI`). It owns:
- `TOKEN_VALUES` and the CSS generated from it (tokens plus component CSS), injected once as `<style data-innfo-tokens>`
- theme application (`data-theme`), including the `innfo:theme-change` message handler moved out of the runtime
- the icon table (moved from `InnfoConsole.svgIcon`) and the citation origin labels and order (deduplicated from runtime and viewer)
- pure components `(data, opts) -> HTMLElement`: 7 core plus 4 presentational review components for C

`ui-kit.js` sits in `SOURCES` before its consumers. `InnfoConsole` and `InnfoModelViewer` receive it by UMD factory injection and delete their own builders. The build moves into a CommonJS lib with a `--check` mode and a node:test drift suite. Shells keep layout CSS only, and a new `console-shell-guard` rule enforces this. Delivery is chained (see Slice Plan). B releases nothing on its own: B and C share one `innfo-console-v*` tag.

Verified baseline (HEAD `fc925f8a`, source files):
- `scripts/build-console-bundle.mjs` hard-codes `SOURCES` (:33-39, 5 files) and writes unconditionally. It has no `--check` mode, no npm script, and no step in `verify.js` or `check-integrity.js`. The bundle header embeds the `console_assets` version via `console-release-info.js`.
- `innfo-runtime.js`: `renderConceptPill` :784 and `renderElementPill` :804 have no internal caller (they are exported at :2823-2824 and used only by `test/console-review.test.mjs`). `renderCards` :910 is called from `refresh` :2676. `svgIcon` :1295 is used by the timeline grid (:1719-1942), the view tabs (:2119), `renderElementPill`, and by the viewer through `window.InnfoConsole`. The `innfo:theme-change` listener (:1131-1142) toggles `.dark`/`.light` classes. Its live sender is `workspace/assets/workspace_hub.html:226`.
- `render-model-viewer.js`: `COLORS` :13, `citationButtons` :76 (it reads `window.InnfoConsole` lazily and silently returns null when that is absent), `conceptColor` :260 (`getComputedStyle('--accent')`), `.el-head`/`.el-name`/`.chip` :295-303, fields rendered as a `<table>` :335, `applyHash` keyed on `.element` :407. Its `factory()` takes no dependencies.
- Shell `:root` color blocks: `artifact_shell.html:30-64`, `model_console.html:17-43`, `timeline.html:50-98` (adds `.dark`/`:root:not(.light)`), `procedure_console.html:17-71`. Component CSS lives in the shells: `.innfo-card*`/`.innfo-concept-pill`/`.innfo-element-pill` (`artifact_shell.html:196-523`, `timeline.html:230-263`) and `.el-head`/`.chip`/`.cite-icon.cite-*` hex colors (`model_console.html:145-207`).
- Guard: `console-shell-guard.js` is wired at `verify.js:298` and `check-integrity.js:118`. It discovers the 4 shells, skipping `/tests/`, `/samples/` and `/procedures/export/`. `verify.js` auto-runs every `scripts/**/*.test.{js,mjs}` (`collectTestSuites`, :211/:267).
- Vendored bundle copies (5): `metrics/samples/` (pins `v0.1.0`), `procedures/samples/export/Ghostbusters_V_0-2-0_procedures_console/` and `procedures/procedures/export/document_sop_console/` (both `v0.4.0`), `innfo-core/tests/fixtures/simulacro-refactorizacion/bluepriNNts/metrics/samples/`, and `innfo-core/tests/legacy/fixtures/legacy-domain/templates/metrics/samples/`. `sync-samples.mjs` does not touch bundles.
- `.gitattributes`: `* text=auto eol=lf` and `*.bundle.js -diff`.
- `guard-template-immutability.js` ignores `assets/` (:26, :100). Shell edits therefore need no `blueprint_version` bump, but they still ship only through a `blueprints-v*` tag.
- Selectors tests depend on: `.innfo-card h3` (`console-dom.test.ts:105`), `#innfo-content .innfo-card` and `#innfo-rail button` (`metrics/scripts/verify.harness.js:512-513`), `.innfo-rail-item` (`console-dom.test.ts:101`, `test/console-export.test.mjs:136`), `.el-head .cite-icon.cite-*` (`console-citations-dom.test.ts`), and the shell CSS classes `.cite-icon.cite-*` (`console-thinning.test.ts:90`).

## Architecture Decisions

| # | Decision | Choice | Rejected (tradeoff) |
|---|---|---|---|
| D1 | Token injection | When `document` exists, `ui-kit.js` calls `ensureTokens(document)` at load. It inserts `<style data-innfo-tokens="<VERSION>">` as the first child of `<head>`. If a `style[data-innfo-tokens]` already exists with the same version, it does nothing. With a different version, it replaces the text (the last loaded copy wins, matching how the UMD globals are reassigned). Shells load the bundle up to 3 times (CDN, mirror, vendored), and the runtime has no re-execution guard, so this idempotency is required. | A `<link>` CSS file (breaks double-click offline, or adds a 4th vendored file). Tokens copied into every shell (the drift we are removing). |
| D2 | Theme selectors | `:root,[data-theme=light]{light}` + `@media (prefers-color-scheme:dark){:root:not([data-theme=light]){dark}}` + `[data-theme=dark]{dark}`. Because custom properties inherit, a subtree override works, which the kitchen sink needs. | Root-only overrides. |
| D3 | Theme application | `InnfoUI.setTheme(doc, 'light'\|'dark'\|null)` sets or removes `data-theme` on `<html>`. The `innfo:theme-change` listener moves from the runtime into the kit and calls `setTheme`. The `.dark`/`.light` class toggling and `timeline.html`'s `.dark`/`:root:not(.light)` blocks are deleted, with no alias. | Keeping class-based dark mode beside `data-theme` (two mechanisms, and the guard could not reason about either). |
| D4 | Component CSS | It lives in the same `<style>`, scoped with `:where([data-innfo-component=...])` for zero specificity. | Leaving it in the shells (4 owners per primitive). |
| D5 | Dependency wiring | `innfo-runtime.js`: `factory(require('./ui-kit.js'))` in CJS, `factory(root.InnfoUI)` in a browser. `render-model-viewer.js`: `factory(require('./ui-kit.js'), require('./innfo-runtime.js'))` and `factory(root.InnfoUI, root.InnfoConsole)`. Each factory throws `Error('InnfoUI missing: load ui-kit.js first')` if the kit is absent. The viewer's silent `citationButtons -> null` degrade path is deleted (it fails loudly; there is no fallback). | A lazy `window.*` lookup (order-dependent, silent). |
| D6 | Icons | `svgIcon` and its table move into the kit as `InnfoUI.icon(name, size?, cls?) -> string` (static, trusted SVG markup with no data interpolated). An unknown name throws `TypeError`; every call site passes a constant or a normalized variant. `InnfoConsole.svgIcon` is deleted, and the runtime's 12 call sites switch to `UI.icon`. `renderCitationDialog` and `renderRefDialog` stay in `InnfoConsole` (behavior, not primitives). | The kit calling `InnfoConsole.svgIcon` (upward dependency, since the kit loads first). |
| D7 | Concept colors | 12 `--innfo-concept-N` tokens. The palette order doubles as the named-color index (spec order, with `grey` mapped to gray). Schema `color` selects the slot. Otherwise the slot is `(index mod 12)+1`, where `index` is the position in `schema.concepts` as declared, captured **before** the viewer's weight sort. Concepts absent from the schema continue the index in order of first appearance. Both renderers pass the same index, so the same concept gets the same `data-concept-slot`. | Positional-only slots (lose author intent). A separate `--innfo-color-<name>` family. |
| D8 | Concept and element identity | `InnfoUI.slug` (lowercase, non-alnum runs to `-`, trimmed: the viewer's `slug` verbatim) is exported. Both renderers derive `data-concept-id` from it. The viewer deletes its private `slug`. The runtime `slugify` stays because it feeds `getDraftKey`, which C deletes. | Unifying `slugify` now (touches the draft key, which is C's scope). |
| D9 | Class names | `ElementCard` keeps `article.innfo-card`, `.innfo-card-head`, `h3.innfo-card-name` and `.innfo-card-fields`, because tests and `verify.harness.js` select on them. The rail keeps `button.innfo-rail-item[data-concept]` and wraps a `ConceptPill`. The contract is `data-innfo-component`; classes are compatibility hooks for existing selectors only. | New class names (churn in 4 suites and the metrics harness). |
| D10 | `data-innfo-component` values | kebab-case, per spec: `concept-pill`, `element-pill`, `element-card`, `marker-chip`, `status-badge`, `citation-icon`, `field-row`, `draft-list`, `annotation-popover`, `reviewed-toggle`, `rail-progress`. | PascalCase (archived C D2 used `ElementCard`; C must adopt kebab-case). |
| D11 | Citation icons per field | `FieldRow` renders one `CitationIcon` per **distinct variant** present, in the order `error, agent, human, reviewer, document`. This is the as-built viewer behavior and satisfies living spec `console-field-citations` (one visually distinct variant per origin). An `error` icon is shown beside the origin icons, as today. B changes markup, not behavior. | One icon per citation entry (behavior change, duplicate icons). |
| D12 | Review primitives home (Q2) | They live in B (`DraftList`, `AnnotationPopover`, `ReviewedToggle`, `RailProgress`). They are presentational only, with no storage and no state. | Moving them back to C (archived am.3, YAGNI). Rejected because B and C ship under one tag (D14), so B can never release them without their consumer, and B owns the kit contract and its contrast test. |
| D13 | Specialized shells (Q3) | `timeline.html` and `procedure_console.html` migrate now, in the last code slice (d2). | Deferring them (would leave the `:root` guard rule unenforceable, or exempt, which is a ledgered legacy marker for no reason). |
| D14 | Release (Q1) | B and C ship under one `innfo-console-v*` tag, the next minor above the highest `innfo-console-v*` tag that exists at release time (`0.8.0` if A shipped `0.7.0` alone, `0.7.0` if A batches too). The tag is cut in C's release slice. B's slice e only prepares it. | Shipping B alone (a kit with 4 unconsumed review components on the CDN). |
| D15 | Drift guard | CommonJS `scripts/lib/console-bundle.js` + node:test `scripts/lib/console-bundle.test.js` (auto-collected by `verify.js` step 0b) + an explicit `checkConsoleBundle` call in `check-integrity.js` next to :118. npm scripts `build:console` and `check:console-bundle`. Exact byte comparison: `eol=lf` makes the bytes deterministic. | A Vitest test in innfo-core (wrong layer, not in the verify job's script suites). |
| D16 | Vendored copies | All 5 are **frozen**. Their HTML pins `v0.1.0`/`v0.4.0` and styles `.chip`/`.el-head`, so a new bundle under old markup would break them. They refresh only when their procedure reruns. The drift check targets only the canonical bundle. They are not ledgered: they are permanent history (pinned outputs), not temporary legacy. | Regenerating them (breaks the samples and the fixtures' expectations). |
| D17 | Shell guard rule | `findRootColorDeclarations(html)` scans every `<style>` block for rule blocks whose selector list contains `:root` (including those nested in `@media`). It fails on any declaration value that matches `#[0-9a-f]{3,8}\b`, `rgba?\(` or `hsla?\(`. Errors name the shell, selector and line. Non-color layout custom properties stay allowed. | Banning every color literal in shells (false positives on inline SVG fills and data URIs). Banning all non-`--innfo-` custom properties (breaks legitimate layout variables). |
| D18 | Theme persistence and presets | Author or embedder `data-theme` only. No storage, no `design-presets` coupling. | Persisting (no consumer). Deriving from a blueprint (couples a seam to L2). |
| D19 | Card draft-count badge | During B, the runtime passes its existing `span.innfo-card-badge` (draft count) and the Suggest button into `ElementCard` via `opts.head`/`opts.body`. `StatusBadge` is reserved for verdicts. C deletes both. | Using `StatusBadge pending` for draft counts (conflicts with C's rule that badges mean verdicts). |

## Tokens

`TOKEN_VALUES = { light: {...}, dark: {...} }`. The CSS is `generateTokenCss(TOKEN_VALUES)`, and nothing is hand-written twice. Base surfaces come from the canonical `model_console.html`. Fonts are system stacks (no web-font fetch).

| Token | Light | Dark |
|---|---|---|
| `--innfo-bg` / `-surface` / `-surface-2` | `#f9fafb` / `#ffffff` / `#f3f4f6` | `#0f172a` / `#1e293b` / `#263549` |
| `--innfo-text` / `-muted` / `-border` | `#111827` / `#6b7280` / `#e5e7eb` | `#e2e8f0` / `#94a3b8` / `#334155` |
| `--innfo-accent` / `-link` / `-focus` | `#1f2937` / `#2563eb` / `#2563eb` | `#cbd5e1` / `#60a5fa` / `#60a5fa` |
| `--innfo-concept-1..12` | Tailwind 500: `#3b82f6 #8b5cf6 #14b8a6 #f59e0b #ec4899 #22c55e #f97316 #6366f1 #ef4444 #eab308 #a855f7 #6b7280` | Tailwind 400: `#60a5fa #a78bfa #2dd4bf #fbbf24 #f472b6 #4ade80 #fb923c #818cf8 #f87171 #facc15 #c084fc #9ca3af` |
| `--innfo-status-{pending,applied,rejected,stale}` | `#92400e #166534 #b91c1c #4b5563` | `#fbbf24 #4ade80 #f87171 #94a3b8` |
| `--innfo-status-*-bg` | `#fef3c7 #dcfce7 #fee2e2 #f3f4f6` | `#451a03 #052e16 #450a0a #1e293b` |
| `--innfo-origin-{agent,human,reviewer,document,error}` | `#7c3aed #2563eb #b45309 #4b5563 #dc2626` | `#a78bfa #60a5fa #fbbf24 #9ca3af #f87171` |
| `--innfo-radius-sm/-/-lg`, `--innfo-font`, `--innfo-mono`, `--innfo-shadow` | `6/8/10px`, the current Inter and SF Mono stacks, `0 1px 2px rgba(0,0,0,.06)` | shadow `0 1px 2px rgba(0,0,0,.4)` |

Concept tokens are decorative: they color a dot or border, and the label always uses `--innfo-text`. They carry no text-contrast requirement.

### Contrast (WCAG 2.x relative luminance; ratio = (L1+0.05)/(L2+0.05))

Status rule: in light mode, use the **lightest Tailwind step whose ratio against its `-bg` is at least 5.0**, which keeps 0.5 of margin above the 4.5 floor so a rounding difference cannot flip the test. The archived 600-step light values fail.

| Pair (fg on bg) | Archived light | Ratio | Chosen | Ratio |
|---|---|---|---|---|
| pending on `#fef3c7` (L 0.893) | `#d97706` (L 0.280) | **2.86 fail** | `#92400e` (L 0.098); amber-700 `#b45309` = 4.51, too tight | **6.37** |
| applied on `#dcfce7` (L 0.906) | `#16a34a` (L 0.269) | **3.00 fail** | `#166534` (L 0.097); green-700 `#15803d` = 4.57, too tight | **6.49** |
| rejected on `#fee2e2` (L 0.810) | `#dc2626` (L 0.167) | **3.95 fail** | `#b91c1c` (L 0.112) | **5.30** |
| stale on `#f3f4f6` (L 0.904) | `#6b7280` (L 0.167) | **4.39 fail** | `#4b5563` (L 0.089) | **6.87** |
| dark pending `#fbbf24` (L 0.579) on `#451a03` (L 0.020) | | | kept | **8.97** |
| dark applied `#4ade80` (L 0.553) on `#052e16` (L 0.020) | | | kept | **8.55** |
| dark rejected `#f87171` (L 0.330) on `#450a0a` (L 0.015) | | | kept | **5.84** |
| dark stale `#94a3b8` (L 0.360) on `#1e293b` (L 0.022) | | | kept | **5.71** |

Text pairs, also asserted by the test as `TEXT_PAIRS`: light text/bg 17.7; muted/surface 4.84; muted/bg 4.63; link/surface 5.17. Dark text/bg 14.5; muted/bg 6.96; muted/surface 5.71; muted/surface-2 4.85; link/surface 5.75. Light muted on `surface-2` is 4.39, so `--innfo-muted` MUST NOT be used on `--innfo-surface-2` in light mode (chips use `--innfo-text`). The test enumerates only the allowed pairs.

Origin icons (UI graphics, 3:1 required) on `--innfo-surface`: light 5.70 / 5.17 / 5.02 / 7.56 / 4.83; dark 5.38 / 5.75 / 8.76 / 5.76 / 5.29 (agent, human, reviewer, document, error). The as-built `#f59e0b` reviewer icon is replaced (about 2.1:1 on white).

## Interfaces / Contracts

Rules for every component:
- It creates elements via `opts.doc ?? document`, keeps no module state, and writes data only via `textContent`.
- Its root carries `data-innfo-component`, and it uses no shadow DOM.
- Invalid `data` throws `TypeError('InnfoUI.<Name>: <reason>')`.
- Callbacks are optional, and nothing else in `opts` mutates.

```js
InnfoUI = { VERSION, TOKEN_VALUES, TOKENS /* names */, generateTokenCss(values) -> string,
  ensureTokens(doc) -> HTMLStyleElement, setTheme(doc, 'light'|'dark'|null), icon(name, size?, cls?) -> string,
  slug(s) -> string, conceptSlot({ index, color? }) -> 1..12, ORIGIN_VARIANTS /* error,agent,human,reviewer,document */, ...components }

ConceptPill({ id, label, index, color?, count? }, { onSelect? })
//  span|button.innfo-concept-pill [data-concept-id][data-concept-slot] > i.innfo-concept-dot, text, span.innfo-concept-count " (n)"
ElementPill({ id, label, origin? }, { href?, onSelect? })
//  a|button|span.innfo-element-pill [data-element-id]; origin -> child span[data-origin] with icon('cite-'+variant)
ElementCard({ id, name, conceptId?, description?, fields: FieldRowData[], markers?: MarkerData[] },
            { domId?, collapsible?, open?, head?: Node[], body?: Node[], onRef?, onCite? })
//  article.innfo-card [data-element-id][data-concept-id][data-open]
//   > header.innfo-card-head > h3.innfo-card-name, marker-chip*, head[] (, button.innfo-card-toggle[aria-expanded] if collapsible)
//   > div.innfo-card-body > p.innfo-card-desc, dl.innfo-card-fields > field-row*, body[]
MarkerChip({ id, label, kind, value? })               // span [data-marker-id][data-kind] > text, b(value)
StatusBadge({ status, count? })                       // span [data-status] pending|applied|rejected|stale; text = count ?? status; aria-label "<count> <status>"
CitationIcon({ variant, field }, { onOpen })          // button.cite-icon [data-origin=variant][data-field]; aria-label "<Label>: <field>"; click stops propagation
FieldRow({ name, value, citations?, ref? }, { onRef?, onCite? })
//  div.innfo-field-row [data-field] > dt, dd (ElementPill when ref) + one CitationIcon per distinct variant (D11)
DraftList({ drafts, byId }, { onDelete })             // ul > li[data-draft-id] kind, target, text, [data-target-changed] label, delete button; no status control
AnnotationPopover({ label, kinds, original? }, { onSave, onCancel })  // div[role=dialog][aria-modal=true]; Tab wraps; Escape -> onCancel only
ReviewedToggle({ state })                             // button [data-state=none|reviewed|changed][aria-pressed]
RailProgress({ reviewed, total, pending })            // span [data-reviewed][data-total][data-pending] "r/t" + pending
```

`FieldRowData = { name, value, citations?: ResolvedCitation[], ref?: { id, label } }`. `MarkerData = { id, label, kind, value? }`. Renderers adapt their payload shapes (the viewer's `fields` and `markers` maps, the per-field `citations` map) into these arrays. The kit is agnostic to A's final citation shape: it only takes the entry list for one field.

### Consumption and exact deletion list

- **`InnfoConsole`** (`innfo-runtime.js`):
  - `renderRail` puts a `ConceptPill` (with `count`) inside each `button.innfo-rail-item`.
  - A private `mountElementCards(doc, elements, drafts, onSuggest, refs)` replaces `renderCards`. It uses `ElementCard` + `FieldRow` (ref -> `onRef: renderRefDialog`) and passes the D19 badge and Suggest button via `head`/`body`.
  - Icon call sites use `UI.icon`.
  - **Deleted** (definitions plus `PUBLIC_API` entries): `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon`, `CITATION_ORIGIN_LABELS`, the inline `innfo-ref-pill innfo-element-pill` builder (:954), and the theme-change listener (:1131-1142).
- **`InnfoModelViewer`** (`render-model-viewer.js`):
  - Rail buttons and concept headings use `ConceptPill`.
  - `renderElement` becomes `ElementCard(..., { domId: 'el-' + id, collapsible: true, head: headerCitationIcons, body: [relationsList] })`.
  - Markers use `MarkerChip`. Relation links use `ElementPill({ href: '#el-' + id })`. Citations use `CitationIcon` with `onOpen: InnfoConsole.renderCitationDialog`.
  - `applyHash` and the hashchange handler select `[data-innfo-component=element-card]` and set `data-open`.
  - **Deleted**: `COLORS`, `conceptColor`, the `getComputedStyle('--accent')` lookup, `slug`, `SOURCES_FAMILY`'s duplicate label tables (`ORIGIN_VARIANT_ORDER`, `CITATION_ICON_LABELS`, `citationVariant`), `citationButtons`, the `.el-head`/`.el-name`/`.chip`/`.dot` builders, and the fields `<table>`.
- `render-procedure-stepper.js` is **unchanged** (it has its own `vIcon` and inline colors). Migrating it has no live need in B and is a non-goal.

## Interface hooks for change C

B does not own rendering, so B does **not** dispatch `innfo:rendered` (it has no consumer in B). B guarantees what C decorates:
1. Each renderer has exactly one card commit point: `InnfoConsole` `refresh` -> `mountElementCards`, and viewer `render()`. C adds `doc.dispatchEvent(new CustomEvent('innfo:rendered', { detail: { root } }))` there, once per renderer.
2. Stable hooks: `[data-innfo-component=element-card][data-element-id]`, `[data-innfo-component=field-row][data-field]` inside it, `[data-innfo-component=concept-pill][data-concept-id]`, and the head/body containers `.innfo-card-head`/`.innfo-card-body`, where C appends nodes.
3. `TOKEN_VALUES`, `TEXT_PAIRS`, the 4 review components, and `StatusBadge` with `stale`.
4. Review CSS (the changed filter and the popover) is added by C to the kit's `COMPONENT_CSS` in `ui-kit.js`.

## Data Flow

```
manifest console_assets.version --> console-bundle.js (SOURCES) --> innfo-console.bundle.js (+ --check)
SOURCES: uplot -> visuals -> ui-kit (InnfoUI; ensureTokens; theme listener)
         -> innfo-runtime (InnfoConsole(UI)) -> render-model-viewer (InnfoModelViewer(UI, InnfoConsole)) -> stepper
shell JSON slots -> renderer boot -> InnfoUI.<Component>(data) -> DOM [data-innfo-component] styled by --innfo-*
workspace_hub postMessage innfo:theme-change -> InnfoUI.setTheme -> html[data-theme]
```

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` | Create | Tokens, CSS, theme, icons, 11 components |
| `console/innfo-runtime.js`, `console/render-model-viewer.js` | Modify | Injection, consumption, deletions above |
| `console/innfo-console.bundle.js` | Regenerate | In every code slice |
| `console/artifact_shell.html`, `workspace/assets/model_console.html`, `metrics/assets/timeline.html`, `procedures/assets/procedure_console.html` | Modify | Remove `:root` colors and component CSS; use `var(--innfo-*)` |
| `scripts/lib/console-bundle.js`, `scripts/lib/console-bundle.test.js` | Create | `SOURCES`, `composeConsoleBundle(parts, version)`, `buildConsoleBundle(repoRoot)`, `checkConsoleBundle(repoRoot) -> { ok, errors }`, plus the drift suite |
| `scripts/build-console-bundle.mjs` | Modify | Thin entry; `--check` exits 1 |
| `scripts/lib/console-shell-guard.js`, `.test.js` | Modify | `findRootColorDeclarations` plus a wired rule |
| `scripts/check-integrity.js` | Modify | `checkConsoleBundle` beside :118 |
| `package.json` | Modify | `build:console`, `check:console-bundle` |
| `innfo-core/tests/console-ui-kit-{tokens,contrast,pills,card,review,kitchen-sink,renderers}.test.ts`, `tests/fixtures/console-kitchen-sink/{index.html,kitchen-sink.js}` | Create | happy-dom |
| `test/console-review.test.mjs`, `test/console-export.test.mjs`, `innfo-core/tests/console-{dom,citations-dom,citation-dialog,shell,thinning}.test.ts` | Modify | Re-point to `InnfoUI` and `data-*`; the bundle-globals check adds `InnfoUI` and the order assertion |
| `docs/innfo/documentation/console-ui-kit.md` | Create | Tokens, signatures, `data-*` hooks, build/check, frozen copies |
| `.agents/skills/nn-dev-release/SKILL.md` | Modify (slice e, only if A has not already) | `templates-v*` -> `blueprints-v*` (:68, :149, :199, :218-219). Maintainer-only skill, so no `skills-v*` tag |

## Testing Strategy (strict TDD; happy-dom by default, jsdom pragma only on proven divergence)

| Layer | What | Approach |
|---|---|---|
| node:test | Drift: fresh build equals the bundle; one altered byte fails and names the file; an edited source in a tmp copy fails; `SOURCES` has `ui-kit.js` before `innfo-runtime.js` | tmp repo fixture plus a real-repo assertion |
| node:test | Guard rule: a `:root` hex value, an `rgb(` in `@media :root`, and a clean shell; the 4 real shells pass after d1/d2 | String fixtures (proven red first against the unmigrated shells) |
| Vitest | Tokens: one style after two `ensureTokens` calls; style text contains each `TOKEN_VALUES` value; 4 distinct statuses per theme; `setTheme`; the theme-change message sets `data-theme` | `new Window({ settings: { device: { prefersColorScheme } } })`; CSSOM-rule fallback if computed custom properties diverge |
| Vitest | Contrast: 8 status pairs >= 4.5, `TEXT_PAIRS` >= 4.5, origin icons >= 3; the failure names the status and theme | Independent luminance function in the test, literal thresholds only |
| Vitest | Per component: `data-*`, inert `<img onerror>` text, `TypeError`, purity/`shadowRoot === null`, slot wrap (13 -> 2), `violet` -> 2; popover Tab wrap and Escape | `require(ui-kit.js)` |
| Integration | Kitchen sink: every `data-innfo-component` under both `[data-theme]`; the same concept gives the same `data-innfo-component`/`data-concept-id`/`data-concept-slot` in both renderers; an `rg`-style scan of the deleted names over `console/*.js` | Fixture plus both shells booted with one payload |
| Regression | Existing console suites, `verify.harness.js`, offline scan (`fetch(`, `type=module`) | Unchanged commands |

## Slice Plan (chained; the generated bundle is `-diff` and excluded from the count)

The revised forecast counts deletions too (shell CSS): about 2,400-2,700 changed lines. The proposal's a/b/d are split to stay under 400. ElementCard moves to c1 with its first consumer.

| Slice | Scope | ~Lines | Done when |
|---|---|---|---|
| a1 | `console-bundle.js`, drift suite, thin build script, npm scripts, `check-integrity` wiring, absorb any pre-existing drift | 230 | `check:console-bundle` green and proven red |
| a2 | `ui-kit.js` tokens/theme only, `SOURCES` order, theme listener moved, token and contrast tests | 340 | Token and contrast suites green |
| b | ConceptPill, ElementPill, MarkerChip, StatusBadge, `icon` move (runtime call sites, `citation-dialog` test), kitchen sink | 350 | Component suites green |
| c1 | ElementCard, FieldRow, CitationIcon; `InnfoConsole` migration and deletions | 390 | Deleted names absent from runtime |
| c2 | `InnfoModelViewer` migration; same-markup test; citation DOM test rewrite | 340 | No `className = 'chip'`/`el-head` in sources |
| d1 | Guard rule; `artifact_shell.html` and `model_console.html` token migration | 320 | Guard green on 2 shells; `thinning` test updated |
| d2 | `timeline.html`, `procedure_console.html`, docs | 330 | Guard green on all 4; manual dark check in kitchen sink |
| f | DraftList, AnnotationPopover, ReviewedToggle, RailProgress; kitchen sink extended (splits f1 popover / f2 rest if over 400) | 380 | Review component suites green |
| e | Release prep: `nn-dev-release` text, checklist handed to C (no tag) | 40 | Docs merged |

Dependencies: a1 -> a2 -> b -> c1 -> c2 -> d1 -> d2. f depends only on b. d1 waits for A's injected `innfo-feedback-*` UI to be merged (B re-skins A's CSS there).

## Migration / Rollout

Executed in C's release slice, on the `dev` -> `main` merge commit:
1. Bump all three `console_assets` entries (shared `innfo-console` ref key) per D14.
2. Run `build:console`, `sync:versions`, `check:versions` and `check:console-bundle`. Bump the shell CDN pins (the guard requires pin == manifest version).
3. Bump `channels.stable.refs[blueprints]` to the next minor above its value at that time (`0.19.1` today; A plans `0.20.0`), because shells under `bluepriNNts/**` changed. No `blueprint_version` bump is needed (assets are ignored by the immutability guard).
4. Run `verify` and `check-integrity`, then tag `innfo-console-vX.Y.Z` and `blueprints-vA.B.C`. No `innfo-mcp-v*` or `skills-v*`.

The CDN is tag-addressed and published tags are never overwritten. Rollback: revert the slice commits; stable keeps the prior tags until the repin. The shells' CDN URL path still says `iNNfo/specs/templates/console/` (debt of the nomenclature rename, untouched here).

## Departures from the archived design

1. Four shells migrate (the 5 thin shells are gone). The guard rule extends `console-shell-guard.js`.
2. Status light tokens changed (all 4 archived values fail 4.5:1). New origin tokens.
3. Theme mechanism unified on `data-theme` (D3). This is new: archived missed the live `innfo:theme-change` handler.
4. Review primitives are in B. `ReviewProgress` is renamed `RailProgress`. `ReviewToggle` stays in C. `data-innfo-component` values are kebab-case.
5. Frozen copies grow from 3 to 5. The `metrics/samples` pin is `v0.1.0`, not `v0.4.0`. `blueprints-v*`, not `templates-v*`. No `template_version` bump for assets.
6. The viewer gets `InnfoConsole` injected (D5), and its silent degrade path is deleted.
7. Slices split into a1/a2, c1 with ElementCard, d1/d2. B has no tag of its own.

## Open Questions

- [ ] Whether the checked-in bundle is byte-identical to a fresh build today (no shell was available in design). Slice a1's first test answers it, and drift is absorbed per spec.
- [ ] Whether happy-dom resolves custom properties under `prefers-color-scheme`. The CSSOM fallback is defined.
- [ ] Spec reconciliation for sdd-tasks: the `CitationIcon` signature is `{ variant, field }` (spec: `{ origin, citationId }`); the "two citations -> two icons" scenario holds only for distinct origins (D11); ElementCard and ConceptPill carry additive opts.
- [ ] A's injected feedback UI CSS location (bundle string vs shell) decides whether d1 also edits A's runtime CSS.
