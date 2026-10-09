# Tasks: console-schema-parity

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,400–1,900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base / notes |
|------|------|-----------|--------------|
| 1 | Relocate `resolveBlueprintPackage` + leaves to `innfo-core`; unversioned Tier-1 guard | PR 1 | base `dev`; pure move dominates diff (+~500/−~500) |
| 2 | Add `resolveConsoleSchema` + `console/index.ts` & barrel exports; rebuild mirror | PR 2 | base PR1; mirror rebuild rides here |
| 3 | Wire CLI + converge MCP; fixture isolation; golden parity | PR 3 | base PR2; both producers land together |

## Phase 1: Foundation — resolver relocation (innfo-core)

- [x] 1.1 Characterize first: run `npx vitest run src/tools/spec.spec.ts` (MCP), record `listBlueprintProcedures` incl. `visual-catalog` (#122 baseline).
- [x] 1.2 RED: add `src/resolver.spec.ts` — unversioned match returns `isPackageDir:true`, `packagePath=<root>/specs/bluepriNNts/<name>`, `specFilePath=<found>`; empty dir not matched.
- [x] 1.3 Move `resolveBlueprintPackage` + leaves (`normalizeVersion`, `isVersionDirName`, `parseSpecName`, `getMarkdownFiles`, `versionFromFrontmatter`, `blueprintVersionFromFrontmatter`, `compareVersions`, `matchSpecPath`, `preferHighestVersion`, `findLocalSpec`, `findSpecInPackageDir`) into `innfo-core/src/resolver.ts`; export via `src/index.ts`.
- [x] 1.4 GREEN: add unversioned Tier-1 guard before version-dir matching, gated on a direct spec file.
- [x] 1.5 Update `innfo-mcp/src/tools/resolver-node.ts` to re-export relocated symbols; keep network/hydration there.
- [x] 1.6 Verify: `npm --workspace=@cognnitive/innfo-core test`; `npm --workspace=@cognnitive/innfo-mcp test`; re-run `spec.spec.ts`; `npm run typecheck`.

## Phase 2: Core console helper + mirror

- [ ] 2.1 RED: add `src/console/schema-resolution.spec.ts` — tier order (workspace pkg beats global), canonical fallback, recursive `includes`, graceful `derived` on miss.
- [ ] 2.2 Implement `resolveConsoleSchema({rootDir,parentName,parentUrl,globalDir?,skillsDir?})` in `src/console/schema-resolution.ts` (pre-collect includes → sync map → `resolveBlueprintSchema(...).schema`).
- [ ] 2.3 Export from `src/console/index.ts` (`export * from './schema-resolution.js'`).
- [ ] 2.4 GREEN: `npm --workspace=@cognnitive/innfo-core test`.
- [ ] 2.5 Rebuild mirror `iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs` (`node scripts/build-console-payload.mjs`).
- [ ] 2.6 Verify: `node scripts/verify.js` (mirror drift); `npm run lint`; `npm run format:check`; `npm run typecheck`.

## Phase 3: Producers + fixture

- [ ] 3.1 RED: isolate `INNFO_GLOBAL_DIR`/`INNFO_SKILLS_DIR` in `console-golden-parity.test.ts` (`beforeEach` + `runCli` env, restore `afterEach`); parity assert at `:169` fails first.
- [ ] 3.2 Replace CLI no-op `scripts/export-console.mjs:485-496` (+ `:554`) with awaited `resolveConsoleSchema`.
- [ ] 3.3 Converge MCP `build-console-payload.ts:64-88` on `resolveConsoleSchema`; drop `resolveBlueprintWithCache` + `buildBlueprintSchemaResolverFromCache`.
- [ ] 3.4 GREEN: `npx vitest run test/console-golden-parity.test.ts` (Windows); `npm --workspace=@cognnitive/innfo-mcp test`.
- [ ] 3.5 Verify (CI gates): `npx vitest run src/tools/spec.spec.ts`; `node scripts/verify.js`; `npm run lint`; `npm run typecheck`; `npm run format:check`.
