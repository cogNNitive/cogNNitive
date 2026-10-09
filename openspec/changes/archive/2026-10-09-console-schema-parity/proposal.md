# Proposal: console-schema-parity

## Intent

The CLI (`scripts/export-console.mjs`) and MCP `build_console_payload` emit different `innfo-schema` slots for one model → `console-golden-parity.test.ts` RED (`:169`). Causes: (1) the CLI `parent_spec` branch (`export-console.mjs:485-496`) is a no-op, so `schema` stays `undefined` and a derived stub is emitted; (2) canonical L2 packages are unversioned (`specs/bluepriNNts/<name>/spec_NN.md`), but MCP `resolveBlueprintPackage` (`resolver-node.ts:384`) matches only version subdirs (Tier 1) or flat `./specs` (Tier 2), so the fixture blueprint is invisible and resolution falls to global cache / canonical registry. Fallbacks hide the bug.

## Scope

**In:** one pure resolver+derivation helper in `innfo-core` (`src/console/schema-resolution.ts`) owning the tier chain (workspace unversioned package → version dirs / flat specs → global cache → canonical registry) plus recursive `includes`, returning `resolveBlueprintSchema(...).schema`; export via `console/index.ts` (mirror → CLI) and the core barrel (MCP); wire the CLI and MCP `build-console-payload.ts:64-88`; unversioned Tier-1 guard gated by `findSpecInPackageDir(base, base)` returning `isPackageDir: true`, `packagePath=<base>`, `specFilePath=<base>/spec_NN.md` so `listBlueprintProcedures` keeps `procedures/`/`samples/`; rebuild mirror `console-payload.generated.cjs` (`verify.js:415`); isolate fixture `INNFO_GLOBAL_DIR`/`INNFO_SKILLS_DIR`.

**Out:** versioned-fixture rewrite (masks the gap); derived-only consoles (product regression); full `resolveParentChainNode` / backlog #25 dedup; viewer/runtime changes.

## Capabilities

**New:** `console-schema-resolution` — single shared core resolver+derivation for the `schema` slot.
**Modified:** `console-payload-builder` (`Single Payload Builder` → byte-identical parity); `template-package-structure` (Tier 1 accepts an unversioned package dir).

## Approach

Approach 1 (exploration). One function owns resolution+derivation; the Tier-1 fix lands once inside it. Both producers use the same `rootDir`, so slots match even through fallback. Reuse `resolveBlueprintSchema` (`compose.ts:280`) and `findCanonicalBlueprint` (`canonical-registry.ts:339`); MCP drops `resolveBlueprintWithCache` + `buildBlueprintSchemaResolverFromCache`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `innfo-core/src/console/schema-resolution.ts` | New | Shared resolver+derivation |
| `innfo-core/src/console/index.ts` | Modified | Export to mirror/CLI |
| `scripts/export-console.mjs:485-496` | Modified | Replace no-op |
| `innfo-mcp/src/tools/build-console-payload.ts:64-88` | Modified | Converge on shared call |
| `innfo-mcp/src/tools/resolver-node.ts:384` | Modified | Unversioned Tier-1 guard |
| `innfo-mcp/src/tools/spec.ts:686/764/910` | At-risk | `listBlueprintProcedures` surface |
| `console-payload.generated.cjs` | Regenerated | Drift-checked mirror |
| `console-golden-parity.test.ts` | Modified | Env isolation; parity assert |

## TDD Strategy (`strict_tdd: true`)

RED → GREEN → REFACTOR: characterize `spec.spec.ts` `listBlueprintProcedures` (visual-catalog) before touching the resolver; add core unit tests (unversioned Tier-1, tier order, `includes`, canonical fallback) and fixture isolation; implement + rebuild the mirror; remove MCP glue; re-run `spec.spec.ts` and the golden suite.

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `spec.spec.ts` regresses (#122: 17→16) | Med | Tier-1 returns package-dir shape; before/after characterization |
| Mirror drift fails `verify.js:415` | High if forgotten | Rebuild mirror; run `verify.js` |
| Golden suite skipped on Linux CI | High | CI gates = mirror-drift + `spec.spec.ts`; validate both |
| Env non-determinism (global install) | Med | Isolate `INNFO_GLOBAL_DIR`/`INNFO_SKILLS_DIR` |
| MCP imports core `dist/` in prod | Med | Core build before MCP packaging |
| Backlog #25 overlap | Med | Helper scoped to console need |

## Rollback Plan

Revert the commit(s): restores the CLI no-op, MCP path, and committed mirror. No migration or persisted state; fixture changes are test-only.

## Dependencies

- Backlog item 25 (`refactor/contract-deduplication`) — overlapping, kept scoped.
- `openspec/config.yaml` engines/vitest; `scripts/verify.js`; `spec.spec.ts` as the CI gate.

## Open Questions

- Confirm the 17→16 mechanism in design/apply (full `spec.spec.ts` before/after).
- Relocate `resolveBlueprintPackage` into core vs. mirror its tier chain — decide in design.

## Success Criteria

- [ ] Golden parity passes; CLI and MCP `schema` slots byte-identical.
- [ ] `spec.spec.ts` `listBlueprintProcedures` (incl. `visual-catalog`) green.
- [ ] `node scripts/verify.js` passes; mirror not stale.
- [ ] Core unit test covers the unversioned Tier-1 hit.
- [ ] No new dependency; helper is the only schema-slot resolution path.
