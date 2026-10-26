# Proposal: Declarative Blueprint Nature — replace the hardcoded console-model rules

## Why

The domain console decides *is this document a model?* and *is it read-only?* by
**hardcoded blueprint-NAME rules**, and the surfacing of the core catalog blueprints
(`sources` / `artifacts` / `procedures`) is handled **ad hoc** (by a name allowlist)
rather than by a declared property:

- `NON_KNOWLEDGE_BLUEPRINT_RE` inside `roleOf`
  (`iNNfo/packages/nn-core/src/naming/contract.ts:117`) maps
  `cognnitive|workspace|procedures|sources|artifacts|sidecar|changes` prefixes to roles, and
  `isConsoleModel`/`isModelCandidate` (same file, `:230-251`) admit only `knowledge` (plus
  `procedure` outside `procedures/`).
- Because the core predicate filters the core catalogs out, surfacing them becomes a
  **per-blueprint exception** maintained outside the model (an in-flight `session/console-core-models`
  adds a `CONSOLE_CORE_BLUEPRINTS` name allowlist for exactly this).

The consequence is a **double standard**: `sources` surfaces only because an exception says
so, and each new collection blueprint needs another one. The nature of a document — its
collection structure, and whether its content is authored or derived (hence surfacing and
mutable or read-only) — is a property of its **blueprint**, but no blueprint declares it.

This change makes surfacing **declarative**, and because declaring `sources` / `artifacts` /
`procedures` as `catalog` surfaces them, it **supersedes** the in-flight name-allowlist
approach (that work should not be merged; this change subsumes it). It stands alone on `dev`.

## What Changes

- **Declare `nature` in the Level-2 blueprint frontmatter**, extending the capability
  pattern already used by `relationship_types:` (domaiNN) and `viewers:` (procedures):

  ```yaml
  nature:
    structure: catalog      # catalog | members | projection
    ownership: derived      # authored | derived
  ```

- **Compile a `blueprint -> nature` map into core** from the embedded
  `iNNfo/packages/nn-core/src/schema/canonical-registry.ts` (which already mirrors every core
  spec), so `roleOf` stays **pure and browser-safe** (no filesystem). Domain-local blueprints
  resolve their `nature` at runtime through the existing blueprint resolver.

- **The console materializes any declared collection** into the domain payload as ordinary
  elements (the standard element surface). `structure` says where the elements come from:
  `catalog` (the catalog document), `members` (the N member documents), `projection` (computed).
  **No new derived document is stored.**

- **`editability` stops being a concept.** The edit affordance derives from `ownership`:
  `authored` -> proposable, `derived` -> read-only. The apply engine remains the final guard.

- **`surface` is derived:** every declared collection appears as a console model.
  `NON_KNOWLEDGE_BLUEPRINT_RE` is **removed**; no name allowlist for surfacing remains.

- **Big-bang migration, no fallback.** Every core blueprint (`sources`, `artifacts`,
  `procedures`, `changes`, `cogNNitive`, `domaiNN`, `sidecar`) declares its `nature`; frozen
  blueprints are covered by the compiled registry map. There is exactly **one** mechanism.

- **Behavior-preserving** for the DOMAIN models already surfaced: a `knowledge` model keeps
  surfacing and behaving as today. The core catalogs (sources/artifacts/procedures), today NOT
  surfaced on `dev` by the core path, now surface by declaration — this is the intended
  unification, not a regression.

- **Out of scope (change B):** surfacing `changes` as a collection and retiring the builtin
  `Changes` tab.

## Capabilities

### New Capabilities

- `blueprint-nature`: the `nature` declaration (`structure` + `ownership`), the compiled
  `blueprint -> nature` map, the collection materializer, and the derived
  surfacing/editability rules.

### Modified Capabilities

- `console-architecture`: the console model notion (`roleOf`, `isConsoleModel`,
  `isModelCandidate`) is driven by the **declared nature**, never by the blueprint name.
- `console-payload-builder`: the builder/materializer emits collection units with **derived,
  stable ids** and read-only semantics under a declared `ownership`.
- `console-ui-kit`: `unitEditability` is **derived** from the model's declared `ownership`.
- `manifest-governance`: blueprint frontmatter gains the `nature` capability block.

## Impact

| Area | Impact | Description |
|---|---|---|
| `iNNfo/packages/nn-core/src/naming/contract.ts` | Modified | `roleOf`/`isConsoleModel`/`isModelCandidate` consume the compiled nature map; `NON_KNOWLEDGE_BLUEPRINT_RE` removed |
| `iNNfo/packages/nn-core/src/schema/nature.ts` (new) | New | Parse `nature`; expose the compiled map + runtime resolution seam |
| `iNNfo/packages/nn-core/src/schema/canonical-registry.ts` | Regenerated | Also the source of the compiled `blueprint -> nature` map |
| `iNNfo/packages/nn-core/src/console/` | New/Modified | Collection materializer (`catalog`/`members`/`projection`) producing standard elements |
| `scripts/export-console.mjs` | Modified | Discovery/surfacing driven by the declared nature instead of the name |
| `iNNfo/specs/bluepriNNts/{sources,artifacts,procedures,changes,cogNNitive,domaiNN,sidecar}/spec_NN.md` | Modified | Declare `nature` (structure + ownership); `blueprint_version` bump |
| `iNNfo/specs/bluepriNNts/console/{ui-kit.js,nn-runtime.js}` | Modified | Edit affordance derived from `ownership`; no kind table |
| `manifest/source.yaml`, `catalog.json`, console bundle/mirrors | Regenerated | Blueprint version bumps + rebuilt generated artifacts |
| `openspec/specs/**` | Modified | Delta specs for the capabilities above |

## Approach

One coherent change in ordered work units, TDD-first, all landing together on `dev`.

| Unit | Content | Why this position |
|---|---|---|
| A. Nature seam | Parse `nature` + compiled map + `roleOf`/surfacing consuming it, with unit tests first | The contract every later unit depends on |
| B. Materializer | `catalog`/`members`/`projection` materializer producing standard elements with derived ids | Needs the nature contract frozen |
| C. UI + migration | Derived editability; declare `nature` on all core blueprints; remove the name predicate; regenerate mirrors/bundle | Needs A+B; the removal is the point |
| D. Specs/bookkeeping | Delta specs, catalog/manifest regeneration, verification | Trails the frozen vocabulary |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Declaring `sources`/`artifacts`/`procedures` as surfacing changes what appears in a console not previously showing them | Med | This is the intended unification; the change documents it. `knowledge` models are unaffected |
| A frozen blueprint without a declared `nature` breaks discovery | Med | The map is derived from the embedded registry, which already mirrors frozen specs — no frozen file is edited |
| Moving `roleOf` from name-only to a compiled map changes behavior for a domain-local blueprint | Low | The map reproduces today's decisions for the core set; unit tests pin each blueprint's role before/after |
| `canonical-registry.ts` desyncs from disk after editing the L2 specs | High | `canonical-registry.test.ts` asserts byte-for-byte equality; regenerate in the same commit |
| Blueprint version bump without regenerating `catalog.json` / `SHIPPED_BLUEPRINT_VERSIONS` | Med | `npm run sync:versions` in the same commit |

## Rollback Plan

- Revert the merge commit. The nature seam is additive; the compiled map reproduces today's
  decisions, so reverting restores the name predicate unchanged.
- No data is migrated and nothing is published: no tag is cut and no `nn-upgrade` migration runs.

## Dependencies

- **Independent of any unmerged branch.** Written against `origin/dev` as-is. It **supersedes**
  the in-flight `session/console-core-models` name-allowlist surfacing (that work should not be
  merged; this change subsumes it) — confirm with the maintainer.
- None beyond the repository gates (`node scripts/verify.js`).

## Success Criteria

- [ ] Every core blueprint declares `nature`; `rg "NON_KNOWLEDGE_BLUEPRINT_RE"` returns 0.
- [ ] No blueprint-name allowlist governs console surfacing anywhere in the repository.
- [ ] A `knowledge` model surfaces and behaves exactly as before (byte-level behavior on the same input).
- [ ] A domain-local blueprint declaring `structure: members` + `ownership: derived` surfaces its member elements with derived, unique ids and no edit affordance.
- [ ] `iNNfo/packages/nn-core/src/schema/canonical-registry.ts` mirrors the edited specs byte-for-byte (`canonical-registry.test.ts` green).
- [ ] `node scripts/verify.js` and CI are green on `dev`.

## Assumptions

1. The `nature` block extends the existing blueprint-capability frontmatter
   (`relationship_types`, `viewers`); it is not a new document primitive.
2. `roleOf` stays pure/browser-safe; the map is compiled into core, not read at runtime.
3. `ownership: derived` (never renamed) legitimizes derived ids; the console's "no id from a
   display name" rule keeps applying to `authored` models.
4. Surfacing the core catalogs by declaration supersedes the in-flight name-allowlist branch.
5. Changes becoming a collection is **change B**, not this one.

## Review Workload Forecast

| Work unit | Est. changed lines (excluding generated) |
|---|---|
| A. Nature seam + tests | ~250 |
| B. Materializer + tests | ~300 |
| C. UI + core-blueprint declarations + name-predicate removal | ~200 (+ generated mirrors/bundle) |
| D. Specs / bookkeeping | ~300 |

- Chained PRs recommended: Yes (A+B, then C+D).
- 400-line budget risk: Medium. Bind the generated artifacts to their sources.
- Decision needed before apply: No.
