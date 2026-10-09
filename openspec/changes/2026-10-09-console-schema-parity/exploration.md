## Exploration: console-schema-parity

### Current State

The console payload has exactly one byte-level producer of the `schema` slot: the pure
`buildConsolePayload()` in `innfo-core` (`iNNfo/packages/innfo-core/src/console/payload-builder.ts:161`).
Everything downstream of the `schema` argument is already shared (canonical JSON, hashing,
`serializeConsoleSlot`, `buildConsoleSchemaSlot`). **Parity therefore reduces entirely to
"both callers hand `buildConsolePayload()` the same `schema` object."** They do not:

- **Producer A — CLI** (`scripts/export-console.mjs:485-496`): the `parent_spec` branch is a
  verified **no-op**. It computes `tier1Path`, calls `existsSync`, and then does nothing with
  `schema`; it stays `undefined` for every model. `buildConsoleSchemaSlot(undefined, elements)`
  then derives a minimal slot: for the golden fixture that is `concepts: [{name:"Mission"},{name:"Service"}]`,
  `fields: []`, `markers: []`, `matrices: []`.
- **Producer B — MCP** (`iNNfo/packages/innfo-mcp/src/tools/build-console-payload.ts:64-88`):
  resolves the parent via `resolveBlueprintWithCache` (`src/tools/spec.ts:295`) →
  `resolveParentChainNode` (`src/tools/resolver-node.ts:884`) → `resolveBlueprintPackage`
  (`resolver-node.ts:384`, 4 tiers) → on miss the canonical registry
  (`findCanonicalBlueprint`, `innfo-core/src/schema/canonical-registry.ts:339`); then builds the
  slot from `resolveBlueprintSchema` (`innfo-core/src/schema/compose.ts:280`) via
  `buildBlueprintSchemaResolverFromCache` (`src/tools/validate.ts:143`).

**Verified by running (this machine, Windows, worktree):**
`npx vitest run test/console-golden-parity.test.ts` → **RED** at
`console-golden-parity.test.ts:169`. The MCP `schema` slot carries the *real* business blueprint
(markers `> * ? ! + = ~`, `business-model`/`metrics` matrices, etc.); the CLI slot is the derived
two-concept stub. `npx vitest run src/tools/spec.spec.ts -t "ingest-visual-catalog"` → **PASS**
(the test currently passes through the `listBlueprints` fallback, not through `resolveBlueprintPackage`).

**Root cause (two independent defects):**
1. The CLI never resolves a schema at all, so it can only ever emit the derived slot.
2. Even if the CLI did resolve, `resolveBlueprintPackage` cannot see the fixture's blueprint.
   Canonical L2 packages are **unversioned** (`specs/bluepriNNts/<name>/spec_NN.md` + optional
   `procedures/ samples/ assets/`), but Tier 1 only accepts **version subdirs**
   (`resolver-node.ts:404`, `isVersionDirName` at :144) and Tier 2 only scans flat `./specs`
   (`:450-466`). The fixture writes `<tmp>/specs/bluepriNNts/business/spec_NN.md` — Tier 1 finds no
   version dir, Tier 2's `findLocalSpec` matches on filename base (`spec_NN` → base `spec`) and
   misses. Resolution falls to **Tier 3 global** and then the **canonical registry** — never the fixture.

**Environment sensitivity confirmed:** `C:\Users\lucas\.agents\bluepriNNts\business\spec_NN.md`
exists on this machine (flat global install), so the MCP path resolves the *global* business
blueprint here; on a machine without it, the canonical registry serves the same identity but
potentially different content. `resolveBlueprintPackage` reads `INNFO_GLOBAL_DIR` /
`INNFO_SKILLS_DIR` (`resolver-node.ts:390-393`), but the golden test isolates only
`INNFO_CACHE_DIR` (`console-golden-parity.test.ts:44-47,142`), leaving the user's global cache
in play.

**CI relevance of the golden suite:** `console-golden-parity.test.ts` is listed in
`WINDOWS_ONLY_SUITES` (`iNNfo/packages/innfo-mcp/vitest.config.ts:15-20`) and is **excluded on
Linux CI**; the comment explicitly points at issue #122. So the "red in CI" from the prior attempt
(item 6 of the brief) cannot have come from this suite as configured today — it came from another
gate (most plausibly the committed mirror drift check and/or `spec.spec.ts`). Do not assume the
golden suite gates CI.

**Committed-build constraint:** the CLI loads `iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs`,
an esbuild CJS mirror of `innfo-core/src/console/index.ts` built by `scripts/build-console-payload.mjs`.
`scripts/verify.js:415` runs `build-console-payload.mjs --check` and **fails on drift**. Any core
change that must reach the CLI requires regenerating this committed mirror. The mirror currently
exports `buildConsolePayload`/`serializeConsoleSlot` etc. but **not** `resolveBlueprintSchema`,
`findCanonicalBlueprint`, `CANONICAL_BLUEPRINTS`, `resolveBlueprintPath`, or `getBlueprintSearchPaths`
— `console/index.ts` (`iNNfo/packages/innfo-core/src/console/index.ts:1-24`) re-exports none of them.

**Prior failed attempt (from issue #122):** adding an unversioned Tier-1 entry got the local suite
green but regressed `spec.spec.ts > listBlueprintProcedures reports ingest-visual-catalog` (reported
17→16) because "the early return dropped the package's `procedures/`". That suite **does run on CI**,
so this is the regression to protect. The exact 17→16 mechanism is unconfirmed (the named test asserts
membership, not a count), but the mechanism class is clear: any change to which tier serves a package,
or to the `isPackageDir`/`packagePath` returned, changes on-disk `procedures/` discovery in
`listBlueprintProcedures` (`src/tools/spec.ts:760-833`, resolution at `:686`, `:764`, `:910`).

### Affected Areas

- `iNNfo/packages/innfo-core/src/console/payload-builder.ts` — the single pure payload/schema builder;
  no change required if inputs are unified.
- `iNNfo/packages/innfo-core/src/console/slot.ts:34` — `buildConsoleSchemaSlot`; the derived vs
  blueprint branch that produces the visible diff.
- `iNNfo/packages/innfo-core/src/console/index.ts:1-24` — the mirror entrypoint; must re-export any new
  core resolver for the CLI to reach it.
- `scripts/export-console.mjs:485-496` — the no-op schema branch; the CLI defect.
- `scripts/build-console-payload.mjs` + `iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs`
  — the committed mirror; must be regenerated (`verify.js:415` enforces it).
- `iNNfo/packages/innfo-mcp/src/tools/build-console-payload.ts:64-88` — MCP schema resolution; must
  converge on the shared path.
- `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts:384` (`resolveBlueprintPackage`) — the 4-tier
  resolver; unversioned Tier-1 defect. `:884` `resolveParentChainNode` and `:1078` `fetchSpecContent`
  both route through it.
- `iNNfo/packages/innfo-mcp/src/tools/spec.ts:686/764/910` — `listBlueprintProcedures`; the regression
  surface (depends on the returned `isPackageDir`/`packagePath`).
- `iNNfo/packages/innfo-mcp/src/tools/validate.ts:143` — `buildBlueprintSchemaResolverFromCache`; the
  MCP-only derivation glue to be superseded/shared.
- `iNNfo/packages/innfo-core/src/schema/compose.ts:280` — `resolveBlueprintSchema`; the derivation both
  producers must share.
- `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts:339` — `findCanonicalBlueprint` /
  `CANONICAL_BLUEPRINTS`; deterministic offline fallback.
- `iNNfo/packages/innfo-core/src/resolver.ts:158` — `resolveBlueprintPath` / `getBlueprintSearchPaths`;
  core's existing flat-only resolver (no package dirs) — candidate reuse, insufficient as-is.
- `iNNfo/packages/innfo-mcp/test/console-golden-parity.test.ts:44-47,142` — fixture env isolation
  (only `INNFO_CACHE_DIR` set) and the red assertion at `:169`.
- `iNNfo/packages/innfo-mcp/vitest.config.ts:15-20` — `WINDOWS_ONLY_SUITES` / issue #122.

### Approaches

1. **One shared core resolution+derivation path (recommended)** — Add a single pure/sync resolver
   helper in `innfo-core` (e.g. `src/console/schema-resolution.ts`) that, given `{ rootDir, parentName,
   parentUrl, content }`, resolves the L2 blueprint content through one deterministic tier chain
   (workspace unversioned package dir **first**, then version dirs / flat specs, then global cache,
   then canonical registry), resolves `includes` recursively through the same chain, and returns
   `resolveBlueprintSchema(content, resolveInclude).schema`. Export it from `console/index.ts` (so the
   esbuild mirror carries it to the CLI) and from the core main index (so MCP imports it). MCP's
   `build-console-payload.ts` replaces `resolveBlueprintWithCache` + `buildBlueprintSchemaResolverFromCache`
   with this one call; the CLI replaces the no-op branch with it. Relocate/reuse the existing
   `resolveBlueprintPackage` logic (moved into core, or the helper's tier chain mirrors it) so the
   unversioned Tier-1 fix lands once.
   - Pros: byte parity is guaranteed *by construction* (one implementation of both resolution and
     derivation); fixes the unversioned Tier-1 defect once; removes the global-cache/canonical
     divergence because both producers read the same tier chain with the same root; advances backlog
     #25 (`refactor/contract-deduplication`).
   - Cons: largest diff — moving/duplicating `resolveBlueprintPackage` into core, new core module,
     MCP + CLI rewiring, rebuild the committed mirror; touches the `listBlueprintProcedures` shared
     resolver, so the regression surface must be covered by the existing real-package test.
   - Effort: High.

2. **Fix Tier-1 in place + a parallel core resolver for the CLI** — Add the unversioned package-dir
   match to `resolveBlueprintPackage` (guard: only match `<root>/specs/bluepriNNts/<base>` when
   `findSpecInPackageDir(base, base)` returns a spec; return `isPackageDir: true`, `packagePath: base`,
   `specFilePath: <base>/spec_NN.md` so `listBlueprintProcedures` still sees `procedures/`). Separately
   re-export `resolveBlueprintSchema`, `findCanonicalBlueprint`, `CANONICAL_BLUEPRINTS`,
   `resolveBlueprintPath`, `getBlueprintSearchPaths` from `console/index.ts` and add a small core
   helper the CLI calls; rebuild the mirror.
   - Pros: smaller, more localized diff; keeps MCP's mature 4-tier/network/includes resolver intact;
     the golden fixture resolves correctly because Tier 1 beats Tier 3/canonical.
   - Cons: **two** resolution+derivation paths must be kept byte-identical — exactly the duplication
     backlog #25 exists to kill. Parity is only guaranteed for fixtures/layouts both paths happen to
     resolve identically; a future tier change silently re-breaks parity. Higher long-term risk.
   - Effort: Medium.

3. **Derive in both producers (drop blueprint schema from the console)** — Make the MCP pass
   `schema: undefined` so both producers emit the derived slot.
   - Pros: trivial diff; parity guaranteed; no resolver work.
   - Cons: product regression — consoles lose the blueprint's fields/markers/matrices (the visible
     diff in the failing test is *all* of that content); `schemaSource` becomes meaningless. Only
     viable if the maintainer decides derived-only is the intended product. Not recommended.
   - Effort: Low.

4. **Change the fixture to a versioned package dir** — Rewrite `console-golden-parity.test.ts` to place
   the blueprint at `specs/bluepriNNts/business/<version>/spec_NN.md`.
   - Pros: sidesteps the unversioned Tier-1 defect.
   - Cons: masks a real resolver gap (the canonical L2 layout is unversioned — `visual-catalog`,
     `business`, `organization` all ship unversioned), and still leaves the CLI no-op unfixed; the real
     repo layout would keep failing. Reject as a fix; acceptable only as an *additional* isolation step.
   - Effort: Low.

### Recommendation

**Approach 1.** The topic is explicitly "unify the blueprint-schema resolution used by the two
console producers"; parity cannot be structurally guaranteed while two resolver/derivation paths
exist, and the observed failures (global cache on dev vs canonical registry elsewhere, plus the
CLI no-op) are both symptoms of that. Put ONE function in `innfo-core` that owns resolution **and**
derivation, export it through `console/index.ts` (mirror → CLI) and the core barrel (MCP), and make
the unversioned Tier-1 fix inside that single implementation. Because both producers then read the
same tier chain under the same `rootDir`/env, the schema slots match even when they both fall through
to the global cache or the canonical registry — determinism stops being a parity requirement.

Concrete guard for the `listBlueprintProcedures` regression: the unversioned Tier-1 branch must
return `isPackageDir: true` with `packagePath = <root>/specs/bluepriNNts/<base>` and
`specFilePath = <base>/spec_NN.md`, and only fire when `findSpecInPackageDir(baseDir, base)` actually
finds a spec (never merely because the directory exists). That preserves on-disk `procedures/`
discovery at `spec.ts:760-833`. Keep `src/tools/spec.spec.ts`'s real-package `visual-catalog` test
green (it runs on CI) as the regression gate.

Supporting (in scope for the proposal, but small):
- Rebuild the committed mirror after touching `console/index.ts` (`node scripts/build-console-payload.mjs`),
  or `verify.js:415` fails.
- Harden the golden fixture env: also set `INNFO_GLOBAL_DIR` (and `INNFO_SKILLS_DIR`) to temp paths,
  in `beforeEach` **and** in the CLI subprocess env, so the test exercises the fixture blueprint, not
  the developer's `~/.agents` install. This makes the test meaningful rather than accidentally green.
- Confirm the 17→16 claim empirically during design/apply (run `spec.spec.ts` fully before and after).

### Risks

- **MCP imports core from `dist/` in production but `src/` in vitest** (`vitest.config.ts:26-31`
  aliases `@cognnitive/innfo-core` → `../innfo-core/src/index.ts`; `dist/` is currently absent).
  A new core export that MCP uses will work in tests but requires a core build before MCP packaging;
  the mirror (`console-payload.generated.cjs`) is a *committed build* and is a separate rebuild step.
- **CLI/MCP divergence if the fix keeps two resolvers** (approach 2) — the exact failure being fixed.
- **`listBlueprintProcedures` regression** (issue #122 history): any change to what
  `resolveBlueprintPackage` returns for unversioned package dirs can alter on-disk `procedures/`
  discovery. Requires explicit before/after coverage of `spec.spec.ts`.
- **Non-deterministic resolution vs environment**: `resolveBlueprintPackage` reads
  `INNFO_GLOBAL_DIR`/`INNFO_SKILLS_DIR`; the golden test isolates only `INNFO_CACHE_DIR`. Without
  fixture isolation the suite can pass for the wrong reason on a machine with a real global install.
- **Golden suite does not gate CI** (`WINDOWS_ONLY_SUITES`): green locally does not prove CI green.
  The CI-facing gate is the mirror-drift check (`verify.js:415`) plus `spec.spec.ts`; both must be
  validated.
- **Moving `resolveBlueprintPackage` into core overlaps backlog #25** and may ripple into
  `resolver-node.spec.ts` and other suites that import it from the MCP path — scope this explicitly.
- Scope creep: `resolveParentChainNode` also serves network fetch/hydration and `includes`; the shared
  helper should cover exactly the console schema need, not re-implement the whole MCP resolver, to
  keep the diff reviewable.

### Ready for Proposal

Yes. The change is a `fix` with a clear root cause (CLI no-op + unversioned L2 packages invisible to
the resolver) and a clear target (byte-identical `schema` slots from one shared core path). The
proposal should state the chosen approach (1), the exact tier-order and the unversioned Tier-1 guard,
the mandatory mirror rebuild + `verify.js` green, the fixture env isolation, and the cross-platform CI
caveat (golden suite skipped on Linux; `spec.spec.ts` and the mirror check are the CI gates).
