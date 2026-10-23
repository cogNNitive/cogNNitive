# Design: Declarative Blueprint Nature

## Technical Approach

A Level-2 blueprint declares its `nature` (`structure` + `ownership`) in frontmatter. Core
compiles a `blueprint -> nature` map from the embedded `canonical-registry.ts`, so `roleOf`
stays pure. The console materializes any declared collection into the standard element
surface. Surfacing and editability are derived; the hardcoded name predicate is removed.

This design stands alone on `origin/dev`: it does not depend on any in-flight branch. On
`dev` the only hardcode is `NON_KNOWLEDGE_BLUEPRINT_RE` + `isConsoleModel`/`isModelDocument`;
surfacing the core catalogs by declaration **supersedes** the in-flight name-allowlist
approach (that branch should not be merged).

## Verified facts

| Fact | Evidence |
|---|---|
| Nature is inferred from the name today. | `iNNfo/packages/nn-core/src/naming/contract.ts:117` (`NON_KNOWLEDGE_BLUEPRINT_RE`) |
| The core console model notion admits only `knowledge` (or `procedure` outside `procedures/`). | `naming/contract.ts:230-251` (`isConsoleModel`, `isModelCandidate`) |
| Blueprint capability declarations already exist. | `domaiNN/spec_NN.md` (`relationship_types:`), `procedures/spec_NN.md` (`viewers:`) |
| Core embeds every core spec. | `iNNfo/packages/nn-core/src/schema/canonical-registry.ts` |
| `buildConsolePayload` requires explicit slugs. | `console/payload-builder.ts:181-243` (`UNFROZEN_MODEL`) |
| `roleOf` is pure/browser-safe. | `naming/contract.ts:1-9` |

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| D1 Where | blueprint frontmatter `nature` | L1 vocabulary / per-document | Nature is a property of the kind; the blueprint is the declaration point |
| D2 Map | compiled into core from the registry | resolved at runtime always | `roleOf` stays pure/browser-safe; frozen specs covered |
| D3 Materialize | console at export, per `structure` | stored catalog docs | No derived docs; one console code path |
| D4 Editability | derived from `ownership` | declared `editability` table | `editability` is an effect; `ownership` is the cause |
| D5 Surface | derived (all declared collections show) | declared `hidden` / name allowlist | "If you declare it, it shows"; remove the hardcode |
| D6 Migration | big-bang, no fallback | incremental | Two mechanisms is the disease |
| D7 Supersession | core catalogs surface by declaration | merge the name-allowlist branch | A subsumes it; one mechanism |

## Data Flow

```
blueprint frontmatter ──(build time)──> compiled blueprint->nature map ──> roleOf / surfacing
domain blueprint ──runtime resolver──> nature
collection (catalog | members | projection) ──materialize──> standard elements ──> console payload
```

## `nature` shape

```yaml
nature:
  structure: catalog      # catalog | members | projection
  ownership: derived      # authored | derived
```

## File Changes

| File | Change |
|---|---|
| `iNNfo/packages/nn-core/src/schema/nature.ts` | new: parse `nature`, expose the compiled map + runtime seam |
| `iNNfo/packages/nn-core/src/naming/contract.ts` | `roleOf`/`isConsoleModel`/`isModelCandidate` consume the map; remove `NON_KNOWLEDGE_BLUEPRINT_RE` |
| `iNNfo/packages/nn-core/src/schema/canonical-registry.ts` | regenerated; also the map source |
| `iNNfo/packages/nn-core/src/console/` | collection materializer (`catalog`/`members`/`projection`) |
| `scripts/export-console.mjs` | drive discovery/surfacing from the declared nature; no name predicate |
| `iNNfo/specs/bluepriNNts/{sources,artifacts,procedures,changes,cogNNitive,domaiNN,sidecar}/spec_NN.md` | declare `nature`; version bump |
| `iNNfo/specs/bluepriNNts/console/{ui-kit.js,nn-runtime.js}` | editability derived from `ownership` |
| `manifest/source.yaml`, `catalog.json`, console bundle/mirrors | regenerated |

## Testing Strategy

| Layer | What | Where |
|---|---|---|
| Unit | `roleOf` reproduces today's decision for every core blueprint | nn-core vitest |
| Unit | the materializer emits standard elements for `catalog`/`members`/`projection` | nn-core vitest |
| Unit | `ownership: derived` ⇒ no pencil; `authored` ⇒ pencil | console jsdom |
| Integration | a `knowledge` model's behavior is unchanged on the same input | scripts suite |
| Integration | a domain-local `members` collection surfaces its member elements with derived ids | nn-mcp vitest |

## Migration / Rollout

Behavior-preserving for domain `knowledge` models. The core catalogs (sources/artifacts/
procedures) surface **by declaration** now, which is the intended unification and which makes
the in-flight name-allowlist branch unnecessary. Big-bang: the name predicate is removed in the
same change. Frozen blueprints are covered by the compiled map. No data migration.
