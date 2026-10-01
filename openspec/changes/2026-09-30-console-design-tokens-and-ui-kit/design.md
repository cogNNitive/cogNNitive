# Design: Console design tokens and UI kit

## Technical Approach

Add one UMD source, `iNNfo/specs/bluepriNNts/console/ui-kit.js` (global `InnfoUI`). It owns three things: the token and component CSS, the icon set, and the pure component functions. It is concatenated into the bundle **before** its consumers. `InnfoConsole` and `InnfoModelViewer` receive it through UMD factory injection and delete their own builders. The build becomes a pure CommonJS lib with a `--check` mode and a drift test. Shells keep layout CSS only. The work ships as chained slices a -> e (see Slice Plan).

Verified baseline (2026-09-30):
- `renderConceptPill` and `renderElementPill` (`innfo-runtime.js:784/804`) have **no internal caller**. They are only exported (`:2823-2824`) and used by `test/console-review.test.mjs`.
- `svgIcon` (`:1295`) is used by the runtime timeline code and by the viewer through `window.InnfoConsole`.
- `.gitattributes` already has `*.bundle.js -diff` and `eol=lf`.
- The bundle is at `0.6.0` (`manifest/source.yaml:196`). The stable channel keys are `blueprints` (`0.19.1`) and `innfo-console` (derived from `console_assets`).

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D1 | Token injection | `ui-kit.js` runs `ensureTokens(document)` at load if `document` exists. This inserts one `<style data-innfo-tokens="<version>">` as the first child of `<head>` and is idempotent. `InnfoUI.ensureTokens` is exported. | Static `<link>` CSS file; tokens copied into each shell | A `<link>` breaks the offline double-click invariant (or adds a 4th vendored file). Copying tokens into shells is the drift we are removing. |
| D2 | Theme selectors | `:root,[data-theme=light]{light}` / `@media (prefers-color-scheme:dark){:root:not([data-theme=light]){dark}}` / `[data-theme=dark]{dark}` | Root-only `data-theme` | Custom properties inherit, so a subtree override works. The kitchen sink needs light and dark side by side. |
| D3 | Component CSS | Lives in the same `<style>`, scoped by `:where([data-innfo-component=...])` (zero specificity) | Leaving it in shells (`artifact_shell.html:503`, `model_console.html:145-166`) | One owner per primitive. Shells can still adjust layout without specificity fights. |
| D4 | Dependency wiring | Consumers become `factory(require('./ui-kit.js'))` in CommonJS and `factory(root.InnfoUI)` in a browser | Reading `window.InnfoUI` lazily | Explicit, testable, and load-order safe, because `ui-kit.js` precedes consumers in `SOURCES`. |
| D5 | Icons | Move `svgIcon` and its table into the kit as `InnfoUI.icon(name,size,cls)`. Delete `InnfoConsole.svgIcon`. `renderCitationDialog` stays in `InnfoConsole`. | Kit calls `InnfoConsole.svgIcon` | The kit loads first and must not depend upward. The dialog is behavior, not a primitive. |
| D6 | Q1 `ElementPill` | Keep as a component (the spec requires it). Its live consumers are the ref-field buttons (`innfo-runtime.js:954`) and the viewer relation links. `renderElementPill` itself is deleted. | Fold into `ElementCard` | Relation chips appear outside cards (relations list, dialogs). |
| D7 | Q2 theme persistence | Author-set `data-theme` only, no localStorage | Persisting the reviewer's choice | No live consumer (YAGNI). The spec marks it Deferred. |
| D8 | Q3 `design-presets` | Tokens stay independent | Derive tokens from the blueprint | No consumer, and it would couple a seam to an L2 blueprint. |
| D9 | Concept colors | 12 `--innfo-concept-N` tokens. The palette order doubles as the named-color index. Schema `color` (live: `compile_model_console_NN.md:154`) selects its slot. Otherwise the slot is `index mod 12`. `index` is the position in `schema.concepts` as declared, before any weight sort. | 8 positional tokens only; a separate `--innfo-color-<name>` family | Keeps author intent and satisfies "index mod N" with one token family. The `color` field is additive to the spec signature. |
| D10 | Q4 version | Next minor above the highest `console_assets` version at release time (`0.7.0`, or `0.8.0` if change 1 cut one) | Fixing it now | Change 1's release decision is not final. |
| D11 | Q5 specialized shells | `timeline.html` and `procedure_console.html` adopt tokens now, in slice d, last | Defer | Required by the spec requirement "Shells Own Layout Only". The 5 thin shells are already collapsed into `artifact_shell.html` by change 1, so no separate migration. |
| D12 | Stale vendored bundles | **Frozen**: `metrics/samples/`, `procedures/samples/export/Ghostbusters_V_0-2-0_procedures_console/`, `procedures/procedures/export/document_sop_console/` (all `0.4.0`) | Regenerate | Their HTML pins `innfo-console-v0.4.0` and styles `.chip`/`.el-head`. A new bundle under old markup breaks them. They are procedure outputs, refreshed only when the procedure reruns. The drift check targets only the canonical bundle. |
| D13 | Drift guard | CommonJS `scripts/lib/console-bundle.js` plus a `node:test` suite (auto-collected by `verify.js`). npm scripts `build:console` and `check:console-bundle`. | A Vitest test in innfo-core | Mirrors the `check:samples`/`check:versions` pattern, runs in the verify CI job, and keeps build code beside the build. |
| D14 | Card class names | Keep the `innfo-card*` classes on `ElementCard`. The contract is `data-innfo-component`. | New class names | `metrics/scripts/verify.harness.js:505` and `console-dom.test.ts` select `.innfo-card`/`h3`. |

## Tokens

| Token | Light | Dark |
|---|---|---|
| `--innfo-bg` / `-surface` / `-surface-2` | `#f9fafb` / `#ffffff` / `#f3f4f6` | `#0f172a` / `#1e293b` / `#263549` |
| `--innfo-text` / `-muted` / `-border` | `#111827` / `#6b7280` / `#e5e7eb` | `#e2e8f0` / `#94a3b8` / `#334155` |
| `--innfo-accent` / `-link` / `-focus` | `#1f2937` / `#2563eb` / `#2563eb` | `#cbd5e1` / `#60a5fa` / `#60a5fa` |
| `--innfo-concept-1..12` (blue, violet, teal, amber, pink, green, orange, indigo, red, yellow, purple, gray; `grey` maps to 12) | Tailwind 500: `#3b82f6 #8b5cf6 #14b8a6 #f59e0b #ec4899 #22c55e #f97316 #6366f1 #ef4444 #eab308 #a855f7 #6b7280` | Tailwind 400: `#60a5fa #a78bfa #2dd4bf #fbbf24 #f472b6 #4ade80 #fb923c #818cf8 #f87171 #facc15 #c084fc #9ca3af` |
| `--innfo-status-{pending,applied,rejected,stale}` | `#d97706 #16a34a #dc2626 #6b7280` | `#fbbf24 #4ade80 #f87171 #94a3b8` |
| `--innfo-status-*-bg` (same order) | `#fef3c7 #dcfce7 #fee2e2 #f3f4f6` | `#451a03 #052e16 #450a0a #1e293b` |
| `--innfo-radius-sm/-/-lg`, `--innfo-font`, `--innfo-mono`, `--innfo-shadow` | `6/8/10px`, the current Inter and SF Mono stacks | shadow `0 1px 2px rgba(0,0,0,.4)` |

The base values are taken from the canonical `model_console.html`. Fonts use system stacks only, with no web-font fetch.

## Interfaces / Contracts

Every component has the signature `(data, opts?) -> HTMLElement`. It creates elements via `opts.doc ?? document`, uses no module state, and writes text via `textContent`. Invalid `data` throws `TypeError('InnfoUI.<Name>: ...')`. The root always carries `data-innfo-component`.

```js
InnfoUI.ConceptPill({ id, label, index, color?, count? }, { onSelect? })
//  -> span|button.innfo-concept-pill [data-concept-id][data-concept-slot=1..12]; button when onSelect
InnfoUI.ElementPill({ id, label, origin? }, { href?, onSelect? })
//  -> a|button|span.innfo-element-pill [data-element-id]; origin -> child [data-origin]
InnfoUI.ElementCard({ id, name, conceptId?, description?, fields: FieldRowData[], markers?: MarkerData[] },
                    { domId?, collapsible?, open?, head?: Node[], body?: Node[], field? })
//  -> article.innfo-card [data-element-id][data-concept-id][data-open]
//     > header.innfo-card-head > h3.innfo-card-name, marker chips, head[]
//     > div.innfo-card-body > p, dl.innfo-card-fields (one row per field), body[]
InnfoUI.MarkerChip({ id, label, kind, value? })       // [data-marker-id][data-kind]
InnfoUI.StatusBadge({ status, count? })               // [data-status]; unknown status -> TypeError;
//  text = count ?? status; aria-label "<count> <status>"
InnfoUI.CitationIcon({ origin, citationId, field }, { onOpen })  // button [data-origin][data-citation-id]
InnfoUI.FieldRow({ name, value, citations?, ref? }, { onRef?, onCite? })
//  -> div.innfo-field-row [data-field] > dt, dd (ElementPill if ref) + CitationIcon per origin variant
InnfoUI.icon(name, size, cls) ; InnfoUI.ensureTokens(doc) ; InnfoUI.TOKENS (names) ; InnfoUI.VERSION
```

Consumption:
- **`InnfoConsole`**:
  - `renderRail` composes `ConceptPill` and `StatusBadge` (the pending-draft count).
  - A private `mountElementCards` replaces `renderCards`, using `ElementCard` + `FieldRow` (ref -> `ElementPill`, onRef -> `renderRefDialog`) + a `StatusBadge` in `head`. The Suggest button goes in `body`.
- **`InnfoModelViewer`**:
  - The rail and concept headings use `ConceptPill`.
  - `renderElement` becomes `ElementCard({...},{domId:'el-'+id, collapsible:true, body:[relationsList]})`.
  - Markers use `MarkerChip`.
  - Citations use `CitationIcon` with `onOpen: InnfoConsole.renderCitationDialog`.

## Data Flow

```
SOURCES: uplot -> visuals -> ui-kit (InnfoUI, injects <style data-innfo-tokens>)
         -> innfo-runtime (InnfoConsole(UI)) -> render-model-viewer (InnfoModelViewer(UI)) -> stepper
shell JSON slots -> renderer boot -> InnfoUI.<Component>(data) -> DOM with data-innfo-component
```

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` | Create | Tokens, CSS, icons, 7 components |
| `console/innfo-runtime.js` | Modify | UMD injection. Delete `renderConceptPill`, `renderElementPill`, `renderCards`, `svgIcon` and their exports, plus the inline `innfo-ref-pill innfo-element-pill` builder. |
| `console/render-model-viewer.js` | Modify | Delete the `COLORS` map, `conceptColor`/`getComputedStyle('--accent')`, `.chip`/`.el-head`/`.el-name`/`.dot` builders and `citationButtons` |
| `console/innfo-console.bundle.js` | Regenerate | Generated in every slice |
| `console/artifact_shell.html`, `workspace/assets/model_console.html`, `metrics/assets/timeline.html`, `procedures/assets/procedure_console.html` | Modify | Remove `:root` color vars and component CSS; use `var(--innfo-*)` |
| `scripts/lib/console-bundle.js` | Create | `SOURCES`, `composeConsoleBundle(parts, version)`, `buildConsoleBundle(repoRoot)`, `checkConsoleBundle(repoRoot)` |
| `scripts/lib/console-bundle.test.js` | Create | Drift suite |
| `scripts/build-console-bundle.mjs` | Modify | Thin entry; `--check` exits 1 |
| `package.json` | Modify | `build:console`, `check:console-bundle` |
| change 1's console shell lint | Modify | Rule: no color values in shell `:root` blocks |
| `iNNfo/packages/innfo-core/tests/console-ui-kit-*.test.ts`, `tests/fixtures/console-kitchen-sink/{index.html,kitchen-sink.js}` | Create | Component tests and fixture |
| `test/console-review.test.mjs`, `tests/console-{dom,citations-dom,citation-dialog,shell}.test.ts` | Modify | Re-point to `InnfoUI` and `data-*` selectors; add `InnfoUI` to the bundle-globals check |
| `docs/innfo/documentation/console-ui-kit.md` | Create | Token list, signatures, `data-*` hooks, how to build/check the bundle, frozen samples |

## Testing Strategy (strict TDD)

| Layer | What | Approach |
|---|---|---|
| Unit (node:test) | Drift: fresh build equals the checked-in bundle. One altered byte fails and names the file. Changing a source in a tmp copy fails. | Tmp fixture dirs; real-repo assertion |
| Unit (Vitest, happy-dom pragma) | One file per component: render, `data-*`, inert `<img onerror>` text, `TypeError`, purity/`shadowRoot === null`, concept slot wraps at 12 | `require(ui-kit.js)` |
| Unit | Tokens: one `<style>` after two `ensureTokens` calls; all four statuses distinct in both themes; `data-theme` beats OS preference | `new Window({settings:{device:{prefersColorScheme}}})` from happy-dom. Fallback if computed custom properties diverge: assert on the CSSOM rules |
| Integration | Kitchen sink: every `data-innfo-component` appears under both themes. Same concept renders the same `data-*` in `InnfoConsole` and `InnfoModelViewer`. | Fixture + the two shells booted with one payload |
| Regression | Existing console suites, `verify.harness.js`, offline scan (`fetch(`, `type=module`) | Unchanged commands |

jsdom is planned only if happy-dom diverges. None is known. The existing jsdom `node:test` suite stays as-is.

## Slice Plan (chained; generated bundle excluded from the 400-line count via `-diff`)

Slices c1 and c2 fold CitationIcon/FieldRow into the migration. This avoids a regression window where viewer citations would drop.

| Slice | Scope | Done when |
|---|---|---|
| a | Build lib, drift test, npm scripts, `ui-kit.js` with tokens only, `SOURCES` order | `check:console-bundle` green; token tests green |
| b | ConceptPill, ElementPill, ElementCard, MarkerChip, StatusBadge, icon move, kitchen sink | Component tests green |
| c1 | CitationIcon, FieldRow, `InnfoConsole` migration and deletions | `rg "renderConceptPill\|renderElementPill\|renderCards\|svgIcon" console/*.js` finds only `ui-kit.js` |
| c2 | `InnfoModelViewer` migration; `model_console.html` component CSS removal; same-markup test | No `className = 'chip'`/`el-head` in sources |
| d | 4 shells: token migration plus the lint rule | Lint green; `data-theme=dark` checked manually via the kitchen sink |
| e | Release | Tags pushed, manifests valid |

## Migration / Rollout

Release sequence for slice e (after the chain merges `dev` -> `main` as a merge commit):
1. Bump all three `console_assets` versions (they share the `innfo-console` ref key) to the version chosen under D10.
2. Run `npm run build:console`, then `sync:versions`, then `check:versions` and `check:console-bundle`.
3. Bump `channels.stable.refs[blueprints].version` (`0.19.1` -> next), because shells under `bluepriNNts/**` changed. Bump `template_version` for workspace, metrics and procedures if the spec guard requires it, and register them in the editor's `SHIPPED_TEMPLATE_VERSIONS`.
4. Run `verify` and `check-integrity`, then tag `innfo-console-vX.Y.Z` and `blueprints-vA.B.C`.

The CDN URL is tag-addressed, so the new tag is the new CDN file. There is no versioned filename. Rollback: revert the slice commits; the stable channel keeps `0.6.0` until the repin.

## Open Questions

- [ ] Whether happy-dom resolves custom properties under `prefers-color-scheme` (validated by the first red test; the CSSOM fallback is defined).
- [ ] The spec's ConceptPill signature lacks `color`/`count`, and StatusBadge lacks `count`. These are additive; sync them in the spec before tasks.
