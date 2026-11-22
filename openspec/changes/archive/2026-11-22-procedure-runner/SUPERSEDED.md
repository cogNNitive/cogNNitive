# Superseded

Implemented by PRs #739, #740, #747, #750 and #751, then redesigned by
`2026-11-22-executions-state-model` (commit 7a2f66d08). The requirement that
append-only events are the only record of a run is no longer the contract: a run
is one model with Step Run and Run Artifact state. The `add-element-initial-fields`
delta still describes current behavior.
