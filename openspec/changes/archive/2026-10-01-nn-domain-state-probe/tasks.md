# Tasks: Domain State Probe & Single Gate Owner

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 lines |
| 400-line budget risk | Low |
| Delivery strategy | single-pr / direct batch |

---

## Phase 1: Probe Implementation & Tests (TDD)
- [x] 1.1 **RED — test domain probe script**: Add tests in `skills/nn-preflight/test/` asserting fast JSON output for layout, model counts in `kNNowledge/`, watch digest state, and procedures. `[domain-state-probe:Requirement:Fast Deterministic Domain State Probe]`
- [x] 1.2 **GREEN — implement `domain-probe.js`**: Implement fast local probe reading filesystem facts and calling preflight with `--workspace-dir .`. `[domain-state-probe:Requirement:Fast Deterministic Domain State Probe]`

## Phase 2: Skill Gate Wiring
- [x] 2.1 **Update `nn-start`**: Wire `domain-probe.js` into §0 as sole gate owner. `[single-gate-owner:Requirement:Single Front Controller Gate Execution]`
- [x] 2.2 **Update `nn-innfo` & `nn-trannsform`**: Add gate-bypass check when invoked within an established session. `[single-gate-owner:Requirement:Single Front Controller Gate Execution]`

## Phase 3: Verification
- [x] 3.1 Run unit tests in `nn-preflight`.
- [x] 3.2 Verify preflight runs once and emits probe JSON.
