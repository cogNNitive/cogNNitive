# Proposal: Metrics Console Adoption

## Intent

The Metrics template (`iNNfo/specs/templates/metrics/`, V_0-1-0, dev, unreleased) ships a working ~700-line inline dashboard (`projections.html`) duplicating runtime per artifact. Once `innfo-console-feedback-loop` deploys its runtime (specified, NOT built), thin `projections.html` onto `artifact_blueprint.html`, pilot Metrics as first console consumer, and replace manual Version-And-Archive with the feedback loop.

## Scope

### In Scope
- Thin `projections.html` onto the blueprint (`needs[]` + two JSON slots); map `MODEL_DATA.template.json` to `innfo-model`.
- Update `create_projections_NN.md`: console generation plus Apply Feedback replacing Version-And-Archive; extend `verify.harness.js`; migrate the Ghostbusters sample.
- Resolve the code-as-slot tension with the console owners (see Approach).

### Out of Scope
- Runtime implementation/deployment (owned by `innfo-console-feedback-loop`); ESM/`fetch`; server sync; auto-apply without agent review; touching business `master.html` or `model_viewer.html`.

## Capabilities

### New Capabilities
- `metrics-console-adoption`: console-thinned Metrics projections artifact, procedure, and verification.

### Modified Capabilities
- None — console behavior ships under `innfo-console-feedback-loop`; no `openspec/specs/` requirement changes.

## Approach

Series-as-data (RECOMMENDED): the procedure pre-computes SERIES into pure-JSON `innfo-model`; runtime only renders. Rejected: executable-logic slot with FORMULAS/DEPS/SERIES JS — breaks the two-slot contract, needs `eval`, harms `file://` safety. Preserves: FORMULAS/DEPS/SERIES slots, meta (model, model_version, source_model, generated_at, months, historyMonths, charts, slug, title, startMonth/startYear), domain-free engine, is_variable/is_formula/is_derived, fixed/compound/additive growth.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/metrics/assets/projections.html` | Modified | Thin onto blueprint; `needs[]` + slots only |
| `iNNfo/specs/templates/metrics/assets/MODEL_DATA.template.json` | Modified | Map meta contract to `innfo-model` |
| `iNNfo/specs/templates/metrics/procedures/create_projections_NN.md` | Modified | Console generation; feedback replaces Version-And-Archive |
| `iNNfo/specs/templates/metrics/scripts/verify.harness.js` | Modified | Validate slots + thinned artifact |
| `iNNfo/specs/templates/metrics/samples/` (Ghostbusters) | Modified | Regenerate sample as console |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Runtime never deploys, proposal stalls | Med | Activation gate; inline dashboard stays canonical until then |
| SERIES-as-data bloats JSON on long horizons | Low | Cap months window; paginate charts |
| Console owners reject Metrics renderer need | Low | Pilot with minimal charts `needs[]` |

## Rollback Plan

Keep inline `projections.html` + procedure intact until activation. On failure: delete `*_console.html` and feedback JSONs, revert procedure to inline generation, re-pin inline asset. Models untouched unless Apply Feedback ran (patch-revert via `innfo-mcp` `apply_change`).

## Dependencies

- `openspec/changes/innfo-console-feedback-loop` done, `innfo-runtime.js` live (Pages + jsDelivr), `file://` smoke passed.
- `iNNfo/packages/innfo-mcp` `apply_change` + validation; `actioNN/skills/nn-trannsform` `--scan` feedback branch.

## Success Criteria

- [ ] Activation gate: runtime deployed and `file://` smoke passed BEFORE any Metrics thinning begins.
- [ ] Thinned `projections.html` renders from slots only, zero inline runtime, via `file://` double-click.
- [ ] Reviewer export → `--scan` → Apply Feedback round-trips one correction with patch bump.
- [ ] `verify.harness.js` passes on slot payloads and the sample console.
