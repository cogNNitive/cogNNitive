# Design: console-schema-parity

## Technical Approach

Parity reduces to "both producers hand `buildConsolePayload` the same `schema` object". Instead of patching the CLI no-op and the MCP path independently, we route **both** through one async, read-only helper `resolveConsoleSchema` in `innfo-core/src/console/schema-resolution.ts`. It owns resolution *and* derivation: it resolves the parent blueprint through one tier chain, resolves `includes` transitively, and calls the existing `resolveBlueprintSchema`. The unversioned Tier-1 defect is fixed **once**, inside the relocated package resolver, so `listBlueprintProcedures` inherits the fix.

## Architecture Decisions

| Decision | Option chosen | Alternatives / trade-off | Rationale |
|---|---|---|---|
| Resolver home | **Relocate `resolveBlueprintPackage` + leaf helpers into `innfo-core/src/resolver.ts`; MCP re-exports** | *Mirror tier chain in core*: smaller diff, but two chains + two Tier-1 guards that drift; exactly the duplication backlog #25 exists to kill. *Fix Tier-1 in place + parallel core resolver*: same drift. | Spec requires "exactly one such path, in `innfo-core`"; relocation makes the guard singular and automatically protects `listBlueprintProcedures`. |
| Move boundary | Move **only** the package resolver and its pure/fs leaves (`parseSpecName`, `normalizeVersion`, `isVersionDirName`, `compareVersions`, `versionFromFrontmatter`, `blueprintVersionFromFrontmatter`, `findSpecInPackageDir`, `findLocalSpec`, `matchSpecPath`, `preferHighestVersion`, `getMarkdownFiles`). Keep network/hydration in MCP. | Move the whole `resolver-node.ts` — drags `resolveParentChainNode`, `fetchSpecContent`, staging writes; out of scope (#25). | Bounds the diff to resolution; `resolveParentChainNode` only imports the relocated `resolveBlueprintPackage`. |
| Helper shape | `async`; pre-collect the transitive `includes` into a `Map`, then call sync `resolveBlueprintSchema` with a sync `resolveInclude` closure | Make the resolver sync with `node:fs` sync APIs — duplicates the tier chain. | `resolveBlueprintSchema`'s `IncludeResolver` is sync; mirrors the existing `buildBlueprintSchemaResolverFromCache` cache pattern. |
| Schema absent | Return `schemaSource: 'derived'`, `schema: undefined`; caller passes `undefined` to `buildConsolePayload` | Throw — breaks graceful degradation. | Spec: "Graceful Degradation". |

## Data Flow

```
model frontmatter.parent_spec {name,url}
      │
      ▼
resolveConsoleSchema({rootDir,parentName,parentUrl})
      │
      ├─ resolveBlueprintPackage(rootDir, name, version)   (RELOCATED, unversioned Tier-1 first)
      │        tiers: 1 unversioned pkg → 2 version dir → 3 flat specs → 4 global → 5 skills
      │        └─ miss → findCanonicalBlueprint(name||url).specContent   (tier 6)
      ├─ BFS includes through the SAME chain → Map<lowerName,content>
      └─ resolveBlueprintSchema(rootContent, ref => map.get(...) ?? null).schema
      │
      ▼ {schema, schemaSource, warnings}
      ├── CLI  export-console.mjs  ──await──► schema ─► buildConsolePayload(...)
      └── MCP  build-console-payload.ts ────► schema ─► buildConsolePayload(...)
```

## Interfaces / Contracts

```ts
export interface ResolveConsoleSchemaOptions {
  rootDir: string
  parentName: string
  parentUrl?: string
  globalDir?: string   // default INNFO_GLOBAL_DIR ?? ~/.agents/bluepriNNts
  skillsDir?: string   // default INNFO_SKILLS_DIR ?? ~/.agents/skills
}
export interface ConsoleSchemaResolution {
  schema: BlueprintSchema | undefined
  schemaSource: 'blueprint' | 'derived'
  warnings: string[]
}
export async function resolveConsoleSchema(
  opts: ResolveConsoleSchemaOptions,
): Promise<ConsoleSchemaResolution>
```

**Unversioned Tier-1 guard** (inside relocated `resolveBlueprintPackage`): before version-dir matching, if `findSpecInPackageDir(join(rootDir,'specs','bluepriNNts',base), base)` returns a file whose direct-entry name is `spec_NN.md` / `<base>_NN.md` / `<base>_V_*`, return
`{ name: base, version: <frontmatter ?? 'V_0-1-0'>, packagePath: <rootDir>/specs/bluepriNNts/<base>, specFilePath: <found>, isPackageDir: true, tier: 'workspace-package' }`.
Fires only on a direct spec file (subdirs like `procedures/` are ignored), never on directory existence alone. Reuses the existing `ResolvedBlueprintPackage` shape (`innfo-core/src/types/parser.ts:69`).

## File Changes

| File | Action | Description |
|---|---|---|
| `innfo-core/src/console/schema-resolution.ts` | Create | `resolveConsoleSchema` helper |
| `innfo-core/src/resolver.ts` | Modify | Relocate `resolveBlueprintPackage` + leaves; unversioned Tier-1 guard |
| `innfo-core/src/console/index.ts` | Modify | `export * from './schema-resolution.js'` (mirror entrypoint) |
| `innfo-core/src/index.ts` | Modify | Export relocated symbols from `./resolver.js` (barrel → MCP) |
| `innfo-mcp/src/tools/resolver-node.ts` | Modify | Delete moved defs; `export { … } from '@cognnitive/innfo-core'`; import leaves back for `resolveParentChainNode` |
| `innfo-mcp/src/tools/build-console-payload.ts` | Modify | Drop `resolveBlueprintWithCache` + `buildBlueprintSchemaResolverFromCache`; call `resolveConsoleSchema` |
| `scripts/export-console.mjs` | Modify | Replace no-op `:485-496` (and `--domain` `:554`) with awaited helper call |
| `console-payload.generated.cjs` | Regenerate | `node scripts/build-console-payload.mjs` (`verify.js:415` drift gate) |
| `innfo-mcp/test/console-golden-parity.test.ts` | Modify | Isolate `INNFO_GLOBAL_DIR`/`INNFO_SKILLS_DIR` in-process + CLI subprocess |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (core) | Tier order; unversioned Tier-1 hit shape (`isPackageDir`, `packagePath`, `specFilePath`); empty dir not matched; canonical fallback; recursive `includes` | New `schema-resolution.spec.ts` |
| Characterization | `spec.spec.ts` `listBlueprintProcedures` (visual-catalog + count) green before and after | Run full `spec.spec.ts` before the resolver edit, re-run after (#122 17→16) |
| Integration | Golden parity (Windows-only) | Fixture isolation diff; assert `schema` slots equal at `:169` |
| CI gates | Mirror drift + `spec.spec.ts` (Linux) | `node scripts/verify.js`; `npx vitest run src/tools/spec.spec.ts` |

Fixture isolation diff: set `process.env.INNFO_GLOBAL_DIR = join(tempDir,'global-bluepriNNts')` and `INNFO_SKILLS_DIR = join(tempDir,'global-skills')` in `beforeEach`, pass the same in `runCli`'s env, restore in `afterEach`.

## Migration / Rollout

No data migration. `resolveBlueprintPackage` moves as-is (plus the guard); consumers reach it via re-export. Rebuild the committed mirror in the same commit; run `scripts/verify.js` and `spec.spec.ts`. Rollback = revert commit(s).

## Open Questions

- [ ] Confirm the 17→16 mechanism empirically (full `spec.spec.ts` before/after) — carried from proposal.
- [ ] Does relying on relocated symbols from core's `dist/` for MCP production packaging need a core build step in the release pipeline? (Existing pattern for other core imports.)
