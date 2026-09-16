# Tasks: Silent Fallbacks Sweep

## Phase 1: Audit & Classify innfo-core catch blocks
- [x] 1.1 Classify catch blocks in `iNNfo/packages/innfo-core/src/resolver.ts` and `mutate.ts`
- [x] 1.2 Classify catch blocks in `iNNfo/packages/innfo-core/src/recursiveParser/workspace.ts` and `workspaceIndex.ts`
- [x] 1.3 Classify catch blocks in `iNNfo/packages/innfo-core/src/workspace/integrity/report.ts`
- [x] 1.4 Verify innfo-core unit tests pass

## Phase 2: Audit & Classify innfo-mcp catch blocks
- [x] 2.1 Classify catch blocks in `iNNfo/packages/innfo-mcp/src/tools/check-workspace.ts`
- [x] 2.2 Classify catch blocks in `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts`
- [x] 2.3 Classify catch blocks in `iNNfo/packages/innfo-mcp/src/tools/init-model.ts`
- [x] 2.4 Classify catch blocks in `iNNfo/packages/innfo-mcp/src/tools/list-read.ts`
- [x] 2.5 Classify catch blocks in `iNNfo/packages/innfo-mcp/src/tools/reachability.ts`
- [x] 2.6 Classify catch blocks in `iNNfo/packages/innfo-mcp/src/tools/spec.ts`

## Phase 3: Full Verification
- [x] 3.1 Run `npm --prefix iNNfo run test` (innfo-core + innfo-mcp)
- [x] 3.2 Run `npm --prefix iNNfo run typecheck`
- [x] 3.3 Run `node scripts/check-integrity.js`
