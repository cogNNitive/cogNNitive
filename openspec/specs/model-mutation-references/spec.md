# Model Mutation References

## Purpose

Maintain reference consistency across all workspace models when performing version bump mutations.

## Requirements

### Requirement: Cross-Model Reference Cascading on Version Bump

When `bump_version` renames and increments the version of a model, the mutation handler MUST scan all other models and workspace manifest/index files within the workspace for references to the bumped model. Any fields referencing the old versioned filename (such as `derived_from_inputs::`, `business_model::`, file-based paths in `sources::`, and `index.md`) MUST be updated to reference the new versioned filename. However, cross-model references that address the model via its immutable `model_slug` (e.g. `model_slug@element-slug`) MUST remain unchanged, as model slug identities are stable and invariant across version bumps.

(Previously: All cross-model references and source citations were bound to versioned filenames like `models/strategy_V_0-1-0_NN.md@## Vision`, requiring cascading edits across all dependent workspace models whenever any model version was bumped.)

#### Scenario: Slug-based cross-model reference remains invariant on bump
- GIVEN a model with `model_slug: strategy` and filename `models/strategy_V_0-1-0_NN.md`
- AND another model `models/marketing_V_0-1-0_NN.md` containing `sources:: [strategy@vision]`
- WHEN `bump_version` bumps `strategy` to `models/strategy_V_0-2-0_NN.md`
- THEN `strategy` is renamed to `models/strategy_V_0-2-0_NN.md`
- AND the reference `strategy@vision` in `marketing_V_0-1-0_NN.md` remains unchanged

#### Scenario: File-based cross-model reference cascades on bump
- GIVEN a model `models/marketing_V_0-1-0_NN.md` containing `sources:: [models/strategy_V_0-1-0_NN.md@## Vision]`
- WHEN `bump_version` bumps `strategy` to `models/strategy_V_0-2-0_NN.md`
- THEN the reference in `marketing_V_0-1-0_NN.md` is updated to `models/strategy_V_0-2-0_NN.md@## Vision`

---

### Requirement: Pre-Mutation Workspace Reference Validation

Before applying and persisting version bump changes across referencing models, `bump_version` MUST validate the modified content of all affected models against their respective template schemas. If any affected model fails validation after the cascade, the entire mutation operation MUST abort without modifying any files on disk.

#### Scenario: Aborting bump when referencing model validation fails
- GIVEN a referencing model that contains a syntax or schema violation
- WHEN `bump_version` is executed on the target model
- THEN the validation check detects the error prior to writing
- AND the operation returns failure without altering files on disk

### Requirement: Slug-First Structural and Wikilink Reference Resolution

Structural references (such as schema reference fields, matrix row headers, matrix column headers, and cross-model element links) MUST be written using immutable element and concept slugs. When resolving wikilinks (`[[target]]`) and reference fields against elements in the model graph, the validator and reference resolver (`references.ts`) MUST apply the following precedence order:

1. **Exact Slug Match**: Target matches `element.slug`.
2. **Exact Name Match**: Target matches `element.name` (legacy fallback).
3. **Normalized Name Match**: Target matches normalized `element.name` with separator tolerance (legacy fallback).

When an exact slug match exists, the resolver MUST bind to that element immediately. If a target does not match any slug but matches an element display name, it MUST bind to that element using name fallback. If a display name matches multiple elements defined under distinct concepts within the same model, the resolver MUST emit an `AMBIGUOUS_ELEMENT_NAME` diagnostic and MUST NOT arbitrarily bind to one element.

#### Scenario: Wikilink resolves directly to element slug
- GIVEN an element with display name `Operating Margin` and `slug:: op-margin`
- AND prose containing `[[op-margin]]`
- WHEN references are resolved
- THEN the wikilink resolves directly to the element via slug match
- AND no legacy fallback is engaged

#### Scenario: Wikilink resolves via legacy name fallback
- GIVEN an element with display name `Customer Acquisition Cost` and `slug:: cac`
- AND prose containing `[[Customer Acquisition Cost]]`
- WHEN references are resolved
- THEN the wikilink resolves to the element via exact name match fallback

#### Scenario: Ambiguous display name emits diagnostic
- GIVEN two elements in different concepts sharing display name `Priority`
- AND prose containing `[[Priority]]`
- WHEN references are resolved
- THEN the resolver emits an `AMBIGUOUS_ELEMENT_NAME` diagnostic
- AND the link is flagged as ambiguous

#### Scenario: Matrix headers reference element slugs
- GIVEN a matrix definition in a model
- WHEN matrix row and column headers are specified
- THEN the headers use element slugs for row and column identities
