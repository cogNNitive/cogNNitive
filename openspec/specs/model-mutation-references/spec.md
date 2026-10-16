# Model Mutation References

## Purpose

Keep cross-model references valid across version bumps and resolve them slug-first. Versions live in frontmatter, never in filenames, so a bump needs no reference cascade.

## Requirements

### Requirement: A Version Bump Never Renames a Model, So References Stay Valid

`bump_version` on a Level-3 model is a changeset operation that only raises the frontmatter `knowledge_version`. The live filename (`kNNowledge/<model_stem>_NN.md`) is invariant, so a version bump MUST NOT rename a file, MUST NOT rewrite any reference in another model, and MUST NOT touch `index.md`. There is no cross-model reference cascade and no pre-mutation validation of referencing models; the model touched by the bump is validated like any touched model (see `changeset-apply-engine`). `bump_version` on a Level-2 bluepriNNt likewise sets `blueprint_version` in place.

#### Scenario: Bump leaves every reference untouched
- GIVEN a model `kNNowledge/strategy_NN.md` with `knowledge_slug: strategy` and another model citing `kNNowledge/strategy_NN.md@## Vision`
- WHEN a `bump_version` change with `to:: minor` is applied to `strategy`
- THEN `strategy_NN.md` keeps its name and its `knowledge_version` is raised
- AND the citing model and `index.md` are byte-identical to before

---

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
