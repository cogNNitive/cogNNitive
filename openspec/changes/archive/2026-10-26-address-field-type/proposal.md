# Proposal: `type:: address` — a validated structural address field type

## Why

No field type represents **"a pointer to an existing unit"** when that pointer is neither a
citation (evidence), nor a traversal edge (`type:: knowledge`), nor an intra-model reference
(`type:: reference`, resolved by name/slug within one model).

The change `target` (`model@element[&field]`, D5) is exactly that, and it is today an **untyped
`string`** validated only opportunistically by the apply engine. A dedicated type would let the
schema — and a generic integrity check — verify that **every** address field resolves to a unit
that exists (element, field, heading, CSV row, JSON pointer, matrix cell).

## What Changes

- **Add the Level-1 field type `type:: address`.** A value is one `<target>@<unit>` address:
  `<target>` is a workspace-relative path or a `knowledge_slug`; `<unit>` is
  `## Heading` | `RowID&col` | `/json/pointer` | `element-slug` | `element-slug&field` |
  `matrix&row&col`. Validation MUST report a dangling address as an **error**.
- **Scope: every structural address field**, not only `target`.
- **Retype** the change `target` (and other structural address fields) to `type:: address`.
- **Taxonomy, reconciled in one vocabulary:** `address` is the base; `knowledge` (a traversal
  edge) and `citation` (an address that asserts derivation / evidence) are the two **semantic
  specializations** of the same address grammar. A `citation` is an `address` that additionally
  claims provenance; a `knowledge` field is an `address` that is traversed. `reference` stays the
  intra-model reference and is **not** an address.
- **Level-1 change** → its own release and migration for existing address-typed fields.

## Capabilities

### New Capabilities

- `address-field-type`: the `type:: address` field type, its grammar, and its existence
  validation.

### Modified Capabilities

- `model-primitive-type` (Level 1): `address` joins the field-type list; `knowledge`/`citation`
  are documented as its semantic specializations.
- `typed-source-references`: the shared address parser backs `address`, `citation` and
  `knowledge` alike.
- `canonical-vocabulary`: records `address` and the specialization relationship.

## Impact

| Area | Impact | Description |
|---|---|---|
| `iNNfo/specs/iNNfo_V_0-5-0_NN.md` | Modified | Add the `address` field type + taxonomy |
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | Modified | `target` retyped `address` |
| `iNNfo/packages/nn-core/src/types/parser.ts` | Modified | `FIELD_TYPES` gains `address`; validation wiring |
| `iNNfo/packages/nn-core/src/validator/` | Modified | Existence validation for address fields |
| `iNNfo/packages/nn-core/src/schema/canonical-registry.ts` | Regenerated | Mirror of the edited L1 spec |
| `openspec/specs/**` | Modified | Delta specs for the capabilities above |

## Approach

Ordered work units, TDD-first.

| Unit | Content | Why this position |
|---|---|---|
| A. Type | `address` in the type lists + parser/validator, tests first | The contract |
| B. L1 spec + mirror | Spec text + taxonomy; regenerate the registry mirror | Documents A |
| C. Retype | `target` (+ other address fields) to `address`; version bumps | Needs A+B |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| An L1 type addition invalidates a live domain with an invented type name | Low | The type is additive; unknown types stay a warning |
| Retyping `target` changes validation strictness | Med | Dangling addresses were already rejected at apply; the schema check mirrors it |
| The `address`/`citation`/`knowledge` taxonomy churns vocabulary | Med | Record it once in `canonical-vocabulary`; no field renames beyond `target` |
| `canonical-registry.ts` desyncs from the L1 spec | High | `canonical-registry.test.ts` asserts byte-for-byte equality; regenerate in the same commit |

## Rollback Plan

- Revert the merge commit. `address` leaves the type lists; `target` reverts to `string`;
  regenerate the mirror and catalog.

## Dependencies

- Independent of A/B/C; runs in parallel. It touches the Level 1 spec, so it carries its own
  release.

## Success Criteria

- [ ] A field declared `type:: address` whose value does not resolve produces an error diagnostic.
- [ ] The change `target` is `type:: address`.
- [ ] `canonical-registry.ts` mirrors the edited L1 spec byte-for-byte.
- [ ] `node scripts/verify.js` and CI are green on `dev`.

## Assumptions

1. The address grammar is the existing `<target>@<unit>` dispatched by the shared citation parser.
2. `reference` is intentionally **not** folded into `address` (intra-model, name/slug based).

## Review Workload Forecast

| Work unit | Est. changed lines (excluding generated) |
|---|---|
| A. Type | ~200 |
| B. L1 spec + mirror | ~80 (+ generated) |
| C. Retype | ~120 |

- Chained PRs recommended: No.
- 400-line budget risk: Low.
- Decision needed before apply: No.
