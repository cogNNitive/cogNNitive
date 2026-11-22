# Superseded

Implemented by PRs #759 and #760, then replaced by `2026-11-22-executions-state-model`
(commit 7a2f66d08). The per-run lock `changes/.lock.procedure-<run>` was removed on
purpose; `RUN_BUSY` now comes from the `seq` guard in
`iNNfo/packages/nn-mcp/src/tools/procedure-record.ts`. Do not read these requirements
as the current contract.
