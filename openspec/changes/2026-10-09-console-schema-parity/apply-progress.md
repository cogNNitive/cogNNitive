# Apply Progress: console-schema-parity

**Mode**: Strict TDD
**Delivery strategy**: `size:exception` — single PR accepted (user decision)

## Completed Tasks

All tasks complete (Phases 1–3).

## Files Changed

| File | Action | What |
|------|--------|------|
| `iNNfo/packages/innfo-core/src/resolver.ts` | Modified | Relocated `resolveBlueprintPackage` + pure/fs leaves; added unversioned Tier-1 guard (`findSpecInPackageDir` + direct-entry check → `isPackageDir: true`, `packagePath = <root>/specs/bluepriNNts/<name>`) |
| `iNNfo/packages/innfo-core/src/index.ts` | Modified | Barrel export of relocated symbols |
| `iNNfo/packages/innfo-core/src/resolver.spec.ts` | Modified | +3 unit tests: unversioned shape, workspace-beats-global, empty dir not matched |
| `iNNfo/packages/innfo-core/src/console/schema-resolution.ts` | Created | `resolveConsoleSchema({rootDir,parentName,parentUrl,globalDir?,skillsDir?})` |
| `iNNfo/packages/innfo-core/src/console/schema-resolution.spec.ts` | Created | 4 unit tests: tier order, canonical fallback, recursive includes, graceful degradation |
| `iNNfo/packages/innfo-core/src/console/index.ts` | Modified | `export * from './schema-resolution.js'` (mirror entrypoint) |
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` | Modified | Deleted moved defs; re-exports relocated symbols from core; network/hydration stays |
| `iNNfo/packages/innfo-mcp/src/tools/build-console-payload.ts` | Modified | Dropped `resolveBlueprintWithCache`/`buildBlueprintSchemaResolverFromCache`; calls `resolveConsoleSchema` |
| `iNNfo/packages/innfo-mcp/test/console-golden-parity.test.ts` | Modified | Isolates `INNFO_GLOBAL_DIR`/`INNFO_SKILLS_DIR` (in-process + CLI env); non-derived guard assertions |
| `scripts/export-console.mjs` | Modified | Replaced no-op branch (and `--domain`) with awaited `resolveConsoleSchema` via mirror; prettier-clean |
| `iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs` | Regenerated | `node scripts/build-console-payload.mjs` |
| `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` + `dist/*` | Regenerated | `npm --workspace=@cognnitive/innfo-mcp run build` |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.2/1.4 | `innfo-core/src/resolver.spec.ts` | Unit | ✅ 10/10 pre-existing | ✅ `resolveBlueprintPackage is not a function` | ✅ 13/13 | ✅ 3 cases (shape, precedence, empty) | ✅ Clean (prettier) |
| 2.1/2.4 | `innfo-core/src/console/schema-resolution.spec.ts` | Unit | N/A (new file) | ✅ `Cannot find module './schema-resolution.js'` | ✅ 4/4 | ✅ 4 cases (tier, canonical, includes, degrade) | ✅ Clean |
| 3.1/3.4 | `innfo-mcp/test/console-golden-parity.test.ts` | Integration | ✅ Characterized RED at baseline | ✅ `expected 'derived' to be 'blueprint'` after isolation+guard | ✅ 1/1 | ✅ non-derived guard added (prevents trivial both-derived pass) | ✅ Clean |

## Characterization (issue #122 regression gate)

- `spec.spec.ts` BEFORE: 21/21 passed (incl. `listBlueprintProcedures` + real-package `visual-catalog`).
- `spec.spec.ts` AFTER: 21/21 passed. No 17→16 regression — the unversioned Tier-1 branch returns `isPackageDir: true` with `packagePath = <root>/specs/bluepriNNts/<name>`, so `procedures/` discovery still works.

## Verification Gates (exact results)

| Gate | Result |
|------|--------|
| `npm --workspace=@cognnitive/innfo-core test` | ✅ 146 files, 1551 passed, 6 skipped |
| `npm --workspace=@cognnitive/innfo-mcp test` | ✅ 39 files, 375 passed |
| `npx vitest run test/console-golden-parity.test.ts` | ✅ 1/1 (after RED) |
| `npx vitest run src/tools/spec.spec.ts` | ✅ 21/21 (after; baseline 21/21) |
| `npm run lint` | ✅ 0 errors, 993 warnings (pre-existing) |
| `npm run typecheck` | ✅ exit 0 (core/mcp/editor/video-parser) |
| `npm run typecheck:scripts` | ✅ exit 0 |
| `node scripts/verify.js` | ✅ all 142 steps passed |
| `node scripts/build-console-payload.mjs --check` | ✅ mirror fresh |

## Environment Note

The worktree's `node_modules/@cognnitive/innfo-core` symlink resolves to the **primary** checkout, so `tsc` initially read stale core types. A local (untracked) package-local junction `iNNfo/packages/innfo-mcp/node_modules/@cognnitive/innfo-core` → worktree core was added to make `npm run typecheck` resolve the worktree build. Vitest is unaffected (it aliases core `src/`).

## Deviations from Design

- None substantive. The golden test gained two extra non-derived guard assertions (`schemaSource === 'blueprint'`, `"type": "map"` present) beyond the design's parity assert, because fixture isolation alone let both producers degrade to the derived stub — a false green.
- `export-console.mjs` was brought fully prettier-clean (it had baseline drift); this adds a small formatting-only hunk beyond the logical change.
