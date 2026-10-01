# Spec: Single Activation Gate Owner

## ADDED Requirements

### Requirement: Single Front Controller Gate Execution
The entry controller (`nn` / `nn-start`) MUST be the sole runner of the preflight gate and domain probe at session start.
1. When entered via `/nn` or `nn-start`, the preflight runs once with `--workspace-dir .`.
2. Downstream skills (`nn-innfo`, `nn-trannsform`) invoked from the entry flow MUST NOT re-run preflight checks.
3. If preflight reports exit code 1 (outdated non-fatal components), the entry flow MUST display an informative notice and proceed to the job menu without blocking.

#### Scenario: Sub-skill skips redundant preflight
- GIVEN a session initialized via `/nn`
- WHEN the user selects `[m] Work on a model` and transitions to `nn-innfo`
- THEN `nn-innfo` consumes the session context and does not invoke `preflight-check.js` again.
