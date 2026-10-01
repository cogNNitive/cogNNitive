# Spec: Domain State Probe

## ADDED Requirements

### Requirement: Fast Deterministic Domain State Probe
The system MUST provide a lightweight, deterministic domain state probe (`nn-preflight/scripts/domain-probe.js` or `--probe` on preflight) that inspects local workspace state without network blocking:
1. Model count and status in `kNNowledge/`.
2. Source watch digest state (unhandled external watch items).
3. Procedure counts across available scopes.
4. Preflight freshness and layout status via `preflight-check.js --workspace-dir .`.

#### Scenario: Probe executed in clean workspace
- GIVEN a canonical workspace
- WHEN the probe runs
- THEN it returns a structured JSON payload containing `{ layout: 'current', knowledge: { count }, sources: { pending_count }, procedures: { count } }` in <200ms.
