# Design: Metrics Console Adoption

## Technical Approach

Pilot the Metrics template onto the shared `innfo-console-feedback-loop` console runtime through **two seams**:

**(a) Shared runtime extension (Option B):** `innfo-runtime.js` gains `renderCharts`, a uPlot renderer reading pure-data series from `innfo-model.series{chartId: number[]}`; `needs-registry.json` registers the `charts` capability so ANY template console can declare it. The single-file bundle (`innfo-console.bundle.js`) is regenerated via `scripts/build-console-bundle.mjs` (uPlot vendored into the composition) so the renderer ships wherever the blueprint loads it, keeping `file://` offline.

**(b) Metrics pilot consumption:** the procedure pre-computes all SERIES month values into pure-JSON `innfo-model` (series-as-data); the thinned timeline layout declares `charts` + minimal needs; `renderCharts` derives uPlot axes from `meta.months/historyMonths/startMonth/startYear`. Thinning stays gated: no `*_console.html` until Pages + jsDelivr runtime is live, `file://` smoke passes, AND `charts` is registered. Maps to all seven spec requirements (incl. Shared Console Charts Capability and Timeline Rename).

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Series-as-data (pre-computed month arrays in `innfo-model`) | Bloats JSON on long horizons; needs months cap | ADOPTED — two-slot contract, no `eval`, `file://`-safe |
| Executable-logic slot (FORMULAS/DEPS/SERIES JS in slot) | Breaks slot contract; needs `eval`; harms offline safety | REJECTED — recorded in procedure rationale |
| needs[] = `charts` + minimal set (`concept-rail`, `fulltext-search`, `matrix-grids`, `hash-routing`, `reference-popup`; `feedback-export` only when export UI required) | Each declared need adds pins/surface | ADOPTED — small pilot; `charts` capability now registered |
| Charts renderer shared in console runtime vs template-specific | Shared: one renderer, any template declares `charts`; template-specific: bespoke per artifact, no registry entry | ADOPTED shared in `innfo-runtime.js` + `needs-registry.json`; REJECTED template-specific |
| Timeline rename scope: artifact-only vs renaming `scenarioType` data vocabulary | Artifact-only: cosmetic, model data untouched; data rename: schema + models + docs churn | ADOPTED artifact-only (`projections.html`→`timeline.html`, `projections-layout`→`timeline-layout`, procedure rename); REJECTED renaming `scenarioType` (`historical`/`projection` stays) |
| Activation gate as procedure pre-step (runtime probe + smoke + registry check) | Blocks adoption if runtime slips | ADOPTED — inline `timeline.html` stays canonical until gate opens |
| Stable-name regen (`{Model}_V_{v}_console.html`), timestamped copies archive-only | Follows feedback-loop convention | ADOPTED — matches Apply Feedback spec |

## Data Flow

```
L3 metrics model ──snapshot──→ innfo-model (meta + rows + pre-computed series{chartId:number[]})
                                       │
   needs[] (incl. "charts") + slots ──→ *_console.html (slots only)
                                       │ file:// double-click
      needs-registry.json ──pins/resolves──→ innfo-runtime.js / innfo-console.bundle.js
                                       │ boot(): hasNeed(config, 'charts')
                             renderCharts(model.series, meta)
              uPlot series data ← series{chartId}; axes ← meta.months | historyMonths
                                                                | startMonth | startYear
                                       │
   future business-template console declaring "charts" ──→ same renderCharts path (no template code)
                                       │
reviewer export ──→ feedback JSON ──→ --scan ──→ Apply Feedback ──→ apply_change
```

Slot mapping: `MODEL_DATA.meta` (model, model_version, source_model, generated_at, months, historyMonths, charts, slug, title, startMonth/startYear) → `innfo-model.meta`; `rows[]` (incl. `history`, `colors`, `is_variable`/`is_formula`/`is_derived`, growth fixed/compound/additive) → `innfo-model.rows[]`; SERIES → `innfo-model.series{chartId: number[]}` (chartId keys = `meta.charts[].id`); FORMULAS/DEPS preserved as descriptive slot info, never executed.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/console/innfo-runtime.js` | Modify | Add `renderCharts` (uPlot) reading `innfo-model.series{chartId}`; boot gate `hasNeed(config,'charts')`; never executes slot JS |
| `iNNfo/specs/templates/console/needs-registry.json` | Modify | Register `charts` capability alongside existing needs |
| `iNNfo/specs/templates/console/innfo-console.bundle.js` | Regenerate | Rebuild via `scripts/build-console-bundle.mjs` with vendored uPlot so bundle = runtime (blueprint + generated consoles load the bundle) |
| `iNNfo/specs/templates/console/artifact_blueprint.html` | Verify | Reconcile registry `runtime` pin (`innfo-runtime.js`) vs blueprint bundle reference — one vendored artifact ships |
| `iNNfo/specs/templates/metrics/assets/projections.html` | Rename → `assets/timeline.html` | Timeline layout (`timeline-layout`); declare `charts` in needs[]; drop "charts backlog" comment |
| `iNNfo/specs/templates/metrics/procedures/create_projections_NN.md` | Rename → `create_timeline_NN.md` | Create Timeline procedure: gate step (runtime + smoke + charts registered), console generation, series snapshot rule, adopted/rejected record, Apply Feedback replacing Version-And-Archive |
| `iNNfo/specs/templates/metrics/spec_NN.md` | Modify | Frontmatter repoint: procedure id `create-timeline`, assets id `timeline-layout` (name "Timeline HTML Layout", path `assets/timeline.html`), harness name; body Projections→Timeline |
| `iNNfo/specs/templates/metrics/assets/MODEL_DATA.template.json` | Modify | Keep `series{}` + meta axis contract (already retargeted to `innfo-model`) |
| `iNNfo/specs/templates/metrics/scripts/verify.harness.js` | Modify | `charts` capability presence (declared in needs[] AND registered in registry), series shape per declared chartId, timeline-named artifact checks |
| `iNNfo/specs/templates/metrics/samples/Ghostbusters_V_0-1-0_metrics_NN.md` (+ generated console) | Modify | Regenerate sample as timeline console declaring `charts` |

Seams: template assets → shared runtime (`window.InnfoConsole`, UMD/IIFE, no `fetch`/`type=module`); procedure → `innfo-mcp apply_change` + `validate_model`; feedback JSON → `nn-trannsform --scan` feedback branch. No new package boundaries; no `business/` or `model_viewer.html` touch.

## Interfaces / Contracts

```json
innfo-model = { "meta": { "model","model_version","source_model","generated_at",
  "months","historyMonths","charts[]","slug","title","startMonth","startYear" },
  "rows": [{ "id","grp","label","metricType","source","variable?","formula?",
  "history?","colors?","growth": {"mode": "fixed|compound|additive"} }],
  "series": { "<chartId>": number[] } }

charts consumption: renderCharts maps series{chartId} → uPlot series; x-axis =
  months window from meta.months / historyMonths / startMonth / startYear.
needs = ["charts", "concept-rail", "fulltext-search", "matrix-grids",
         "hash-routing", "reference-popup"]   // pilot SHALL include "charts"
         // + "feedback-export" only when the export UI is required
```

The uPlot renderer reads pure data only and SHALL NOT execute slot JS (no eval, no serialized formulas) — same guarantee enforced by the harness `guardExecutablePayload`.

Gate probe: runtime URL reachable (Pages + jsDelivr AND `charts` registered in needs-registry) + `file://` smoke passes; else procedure stops with "gate closed" and inline stays canonical.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | series→uPlot data mapping (chartId→array, months axis from meta; missing series for a declared chartId degrades to warning) | Vitest / Node runner per `config.yaml` on a pure mapping helper exported from the runtime |
| Unit | needs resolution: `charts` declared in needs[] ↔ registered in needs-registry; series shape per chartId | Extended harness contract helpers (existing pattern) |
| Integration | Harness on sample console: zero pageerrors, charts capability, series shape, timeline naming | Extended `verify.harness.js` (Playwright-core, existing pattern) |
| E2E | `file://` double-click render (uPlot charts from series) + export→`--scan`→Apply Feedback round-trip | Manual + Playwright smoke on Ghostbusters timeline console |

## Migration / Rollout

Gated single-shot pilot: inline `timeline.html` (renamed) stays canonical until the gate opens (runtime live + smoke + `charts` registered); then generate `*_console.html` alongside, verify, flip procedure to console path. Coordinate bundle/registry pin reconciliation BEFORE flipping the procedure. Rollback: delete `*_console.html` + feedback JSONs, revert procedure to inline (rename revert at git level); model revert via `apply_change` patch only if Apply Feedback ran. No data migration; `scenarioType` vocabulary untouched.

## Open Questions

- None blocking — `charts` capability name confirmed (spec + registry).
- Verify during apply: bundle-vs-runtime reconciliation — needs-registry pins `innfo-runtime.js` while blueprint + generated consoles load `innfo-console.bundle.js`; regenerated bundle must embed uPlot + `renderCharts`, and the registry vendored pin must match what ships next to consoles for offline `file://`.