# Technical Design: Domain State Probe & Single Gate Owner

## 1. Architecture Decisions

| Decision | Chosen Approach | Rationale |
|---|---|---|
| **Probe Architecture** | 100% local Node script (`domain-probe.js`) | Avoids overengineering, time-budget timeouts, and fragile hybrid parallel network calls. Executes in <100ms. |
| **Session Marker** | In-context conversation state (no `.cognnitive/session.json` disk writes) | Eliminates side effects on read-only starts and prevents stale disk caches. |
| **Gate Ownership** | `nn` / `nn-start` is the single owner | Runs `preflight-check.js --workspace-dir .` once; downstream skills skip duplicate execution. |
| **Exit Code 1 Handling** | Non-blocking warning banner + menu display | Keeps developer unblocked while surfacing outdated components. |

## 2. Probe Contract Structure
```json
{
  "version": "1.0.0",
  "layout": "current",
  "preflight": {
    "status": "ok",
    "exitCode": 0,
    "warnings": []
  },
  "knowledge": {
    "count": 3,
    "items": ["AppSchema_V_1-0-0_model_NN.md"]
  },
  "sources": {
    "pending_count": 0
  },
  "procedures": {
    "domain_count": 1,
    "blueprint_count": 2
  }
}
```
