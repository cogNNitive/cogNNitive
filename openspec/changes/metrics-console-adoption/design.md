# Design: Metrics Console Adoption

## Technical Approach

Pilot the Metrics template onto the deployed `innfo-console-feedback-loop` runtime. The procedure pre-computes all SERIES month values into pure-JSON `innfo-model` (series-as-data); the shared `innfo-runtime.js` only renders sheet, charts, and conditional `feedback-export` UI. Thinning is gated: no `*_console.html` until Pages + jsDelivr runtime is live and `file://` smoke passes. Maps directly to all six spec requirements; no console-runtime changes.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Series-as-data (pre-computed month arrays in `innfo-model`) | Bloats JSON on long horizons; needs months cap | ADOPTED — preserves two-slot contract, no `eval`, `file://`-safe |
| Executable-logic slot (FORMULAS/DEPS/SERIES JS in slot) | Breaks slot contract; needs `eval`; harms offline safety | REJECTED — recorded in procedure rationale |
| Minimal `needs[]` (`charts` + conditional `feedback-export`) | Extra export wiring only when needed | ADOPTED — keeps pilot surface small |
| Activation gate as procedure pre-step (runtime probe + smoke) | Blocks adoption if runtime slips | ADOPTED — inline `projections.html` stays canonical until gate opens |
| Stable-name regen (`{Model}_V_{v}_console.html`), timestamped copies archive-only | Follows feedback-loop convention | ADOPTED — matches Apply Feedback spec |

## Data Flow

```
L3 metrics model ──snapshot──→ innfo-model (meta + rows + pre-computed series)
                                      │
needs[] + innfo-schema/innfo-model ──→ *_console.html (slots only)
                                      │ file:// double-click
                         innfo-runtime.js (Pages/jsDelivr/vendored) ──→ sheet + charts
                                      │
reviewer export ──→ feedback JSON ──→ --scan ──→ Apply Feedback ──→ apply_change
   (feedback-export needs only)        staleness check → diff preview → validate_model → patch bump → regen console
```

Slot mapping: `MODEL_DATA.meta` (model, model_version, source_model, generated_at, months, historyMonths, charts, slug, title, startMonth/startYear) → `innfo-model.meta`; `rows[]` (incl. `history`, `colors`, `is_variable`/`is_formula`/`is_derived`, growth fixed/compound/additive) → `innfo-model.rows[]`; SERIES output → `innfo-model.series{chartId: number[]}`; FORMULAS/DEPS preserved as descriptive slot info, never executed from the slot.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/metrics/assets/projections.html` | Modify | Thin to blueprint shell: `innfo-config needs[]` + `innfo-schema`/`innfo-model` slots; delete ~700-line inline runtime; keep visual system via runtime renderer |
| `iNNfo/specs/templates/metrics/assets/MODEL_DATA.template.json` | Modify | Retarget meta/rows contract to `innfo-model` shape; add `series{}` pre-computed block + months cap note |
| `iNNfo/specs/templates/metrics/procedures/create_projections_NN.md` | Modify | Add gate step, console-generation steps, series snapshot rule, adopted/rejected record, Apply Feedback replacing Version-And-Archive |
| `iNNfo/specs/templates/metrics/scripts/verify.harness.js` | Modify | Slot validators (meta keys, pure-data series, inline-runtime rejection) + `file://` render check |
| `iNNfo/specs/templates/metrics/samples/Ghostbusters_V_0-1-0_metrics_NN.md` (+ generated console) | Modify | Regenerate sample as thinned `*_console.html` pilot |

Seams: template assets → shared runtime (`window.InnfoConsole`, UMD/IIFE, no `fetch`/`type=module`); procedure → `innfo-mcp apply_change` + `validate_model`; feedback JSON → `nn-trannsform --scan` feedback branch. No new package boundaries; no `business/` or `model_viewer.html` touch.

## Interfaces / Contracts

```json
innfo-model = { "meta": { "model","model_version","source_model","generated_at",
  "months","historyMonths","charts[]","slug","title","startMonth","startYear" },
  "rows": [{ "id","grp","label","metricType","source","variable?","formula?",
  "history?","colors?","growth": {"mode": "fixed|compound|additive"} }],
  "series": { "<chartId>": [12] } }
needs = ["charts"] // + "feedback-export" only when export UI required
```

Gate probe: runtime URL reachable (Pages + jsDelivr) AND `file://` smoke passes; else procedure stops with "gate closed" and inline stays canonical.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Slot builders (meta map, series pre-compute, pure-data guard) | Vitest / Node runner per `config.yaml` |
| Integration | Harness on sample console: zero pageerrors, valid CSV, slot checks | Extended `verify.harness.js` (Playwright-core, existing pattern) |
| E2E | `file://` double-click render + export→`--scan`→Apply Feedback round-trip | Manual + Playwright smoke on Ghostbusters console |

## Migration / Rollout

Gated single-shot pilot: keep inline `projections.html` canonical until gate opens; then generate `*_console.html` alongside, verify, flip procedure to console path. Rollback: delete `*_console.html` + feedback JSONs, revert procedure to inline, re-pin inline asset; model revert via `apply_change` patch only if Apply Feedback ran. No data migration; no flags beyond the gate.

## Open Questions

- None blocking — renderer `needs[]` vocabulary (`charts` capability name) confirmed with console owners at task time if runtime spec renames it.
