# Proposal: Silent Fallbacks Sweep

## Context
The cogNNitive project philosophy mandates **Fail-Fast: No silent fallbacks**.
During past iterative feature additions, several try/catch and .catch() blocks were introduced in `innfo-mcp` and `innfo-core` without standard classification.

## Objectives
1. Classify every `catch` site across `innfo-mcp` and `innfo-core` into one of 3 clear categories:
   - **Propagate**: Real parse/serialization/IO errors that should abort the operation.
   - **Log + Continue**: Optional side operations with structured `console.warn` (including path and error details).
   - **Deliberate Swallow**: File reads where ENOENT is an expected condition, explicitly checked via `err.code === 'ENOENT'` with a descriptive comment.
2. Eliminate all anonymous empty `catch {}` blocks.
3. Ensure all tests pass with 0 regressions.
