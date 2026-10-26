# Design: `type:: address`

## Technical Approach

Add the Level-1 field type `address`: a validated structural pointer. It is the base of the
address grammar; `citation` (evidence) and `knowledge` (traversal) are its semantic
specializations. Retype the change `target` and every structural address field.

## Verified facts

| Fact | Evidence |
|---|---|
| The shared parser `parseCitation` exists and dispatches `<target>@<unit>`. | `typed-source-references/spec.md:7-18` |
| Unit kinds: `header`, `row`, `pointer`, `element`, `matrix`. | same, `:9-14` |
| The change `target` is `type:: string`. | `changes/spec_NN.md:43-46` |
| `reference` resolves intra-model by name/slug. | `validator/references.ts:190+` |

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| D1 Type | new `type:: address` | reuse `citation` / `reference` | `citation` asserts derivation (evidence); `reference` is intra-model; `target` is neither |
| D2 Scope | every structural address field | only `target` | One mechanism for all pointers |
| D3 Taxonomy | `address` base; `citation`/`knowledge` specializations | orthogonal types | One grammar, three semantics |
| D4 Validation | dangling address = error | warn | Integrity guarantee |

## Data Flow

```
field value ──parseAddress (shared parser)──> { target, unit }
   │
   └─ resolve against the workspace resolver ──> exists? error : ok
```

## `address` grammar

`<target>@<unit>` — `<target>`: workspace-relative path or `knowledge_slug`; `<unit>`:
`## Heading` | `RowID&col` | `/json/pointer` | `element-slug` | `element-slug&field` | `matrix&row&col`.

## File Changes

| File | Change |
|---|---|
| `iNNfo/specs/iNNfo_V_0-5-0_NN.md` | add `address` to the field types + taxonomy |
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | `target` → `type:: address`; version bump |
| `iNNfo/packages/nn-core/src/types/parser.ts` | `FIELD_TYPES` gains `address` |
| `iNNfo/packages/nn-core/src/validator/` | existence validation for `address` fields |
| `iNNfo/packages/nn-core/src/schema/canonical-registry.ts` | regenerated mirror |
| `manifest/source.yaml`, `catalog.json` | version bumps |

## Testing Strategy

| Layer | What | Where |
|---|---|---|
| Unit | an `address` field whose value does not resolve → error | nn-core vitest |
| Unit | a valid `element-slug&field` address resolves | nn-core vitest |
| Schema | the `changes` blueprint validates a changeset with `target:: address` | nn-mcp vitest |
| Guard | `canonical-registry.ts` mirrors the L1 spec byte-for-byte | nn-core vitest |

## Migration / Rollout

Additive type. Retyping `target` is a blueprint version bump. Existing fields keep `string`
until retyped. L1 edit requires the registry mirror regeneration in the same commit.
