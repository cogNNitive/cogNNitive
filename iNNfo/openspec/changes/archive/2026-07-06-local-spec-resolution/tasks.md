# Tasks: Local Spec Resolution

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~150 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | None |
| Delivery strategy | single-pr |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Phase 1: Foundation
- [x] 1.1 Define `SpecResolver` interface and error types in [resolver.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/packages/innfo-core/src/resolver.ts).
- [x] 1.2 Export `SpecResolver` from [index.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/packages/innfo-core/src/index.ts).

## Phase 2: Implementation
- [x] 2.1 Implement `NodeSpecResolver` with recursive search of `specs/` directory in [resolver-node.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/packages/innfo-mcp/src/tools/resolver-node.ts).
- [x] 2.2 Update `spec.ts` to use `NodeSpecResolver` with local spec fallback in [spec.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/packages/innfo-mcp/src/tools/spec.ts).
- [x] 2.3 Ensure tool mutation logic resolves local specs using the resolver in [mutate.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/packages/innfo-mcp/src/tools/mutate.ts).

## Phase 3: Verification / Testing
- [x] 3.1 Write Vitest unit tests for the recursive local spec search and fallback in [resolver-node.spec.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/packages/innfo-mcp/src/tools/resolver-node.spec.ts).
- [x] 3.2 Run ESLint and TypeScript compilation checks across packages to validate no bundle errors.
- [x] 3.3 Validate that core/browser builds are free of Node native module imports (like `fs`, `path`).

