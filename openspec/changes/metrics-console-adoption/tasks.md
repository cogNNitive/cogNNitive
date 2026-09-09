# Tasks: Metrics Console Adoption

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600–800 (incl. ~700-line runtime deletion) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (see below) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Slot contract + gate probe | PR 1 | MODEL_DATA.template.json; base main; unit tests included |
| 2 | Thinned artifact + procedure | PR 2 | projections.html + create_projections_NN.md; depends on PR 1 |
| 3 | Harness + sample pilot | PR 3 | verify.harness.js + Ghostbusters console; depends on PR 2 |

## Phase 1: Foundation — Contract + Gate

- [ ] 1.1 RED: failing unit tests for meta→`innfo-model` map + pure-data series guard (Req: Series-as-Data)
- [ ] 1.2 RED: failing tests for gate probe open/closed paths, inline stays canonical (Req: Activation Gate)
- [ ] 1.3 GREEN: retarget `assets/MODEL_DATA.template.json` to `innfo-model` + `series{}` + months cap (Req: Series-as-Data, Artifact Shape)

## Phase 2: Core — Thin Artifact + Procedure

- [ ] 2.1 Thin `assets/projections.html` to `needs[]` + `innfo-schema`/`innfo-model` slots; delete inline runtime (Req: Artifact Shape)
- [ ] 2.2 Update `procedures/create_projections_NN.md`: gate step, console generation, snapshot rule, adopted/rejected record (Req: Generation Procedure, Resolution Record)
- [ ] 2.3 Replace Version-And-Archive with Apply Feedback: staleness check, diff preview, `apply_change`, `validate_model`, patch bump, stable-name regen (Req: Generation Procedure)

## Phase 3: Integration — Harness + Sample Pilot

- [ ] 3.1 Extend `scripts/verify.harness.js`: meta-key, pure-data, inline-runtime rejection + `file://` render check (Req: Harness Verification)
- [ ] 3.2 Regenerate Ghostbusters sample as thinned `*_console.html` via gated procedure (Req: Harness Verification)
- [ ] 3.3 Round-trip export→`--scan`→Apply Feedback with staleness block + patch bump on sample (Req: Generation Procedure)

## Phase 4: Verification + Cleanup

- [ ] 4.1 Run `npm --prefix iNNfo run lint`, `typecheck`, `format:check` (new drift only), `test` on sample console (Req: Harness Verification)
- [ ] 4.2 Confirm harness: zero pageerrors, malformed-slot fail-fast names key; remove scratch consoles/feedback JSONs
