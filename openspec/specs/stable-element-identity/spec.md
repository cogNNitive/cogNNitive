# Stable Element Identity Specification

## Purpose

Establish immutable, explicit slug identities for semantic model elements, concepts, and matrices across cogNNitive. By decoupling node identity from display names, rename mutations preserve citations and references, cross-concept duplicate element names are permitted without destructive dropping (reversing R-IE-02), models carry stable frontmatter identities (`model_slug`, `workspace_id`), and models are safely frozen on mutation or via workspace upgrade commands.
## Requirements
### Requirement: Explicit and Immutable Slug Declarations

Elements, concepts, and matrices MAY declare an explicit `slug::` property. When declared, the slug MUST follow kebab-case lowercase alphanumeric and hyphen formatting (`^[a-z0-9]+(?:-[a-z0-9]+)*$`). The parser MUST set `element.slug` to the declared value and flag `element.slugExplicit = true`. Once assigned, an element's slug MUST be immutable; editing or renaming an element MUST NOT alter or clear its slug. The serializer MUST emit `slug:: <slug>` for any element where `slugExplicit` is true, or when the model is in a frozen state.

#### Scenario: Element declares an explicit slug
- GIVEN a kNNowledge model containing an element with `slug:: revenue-growth`
- WHEN the model is parsed by `recursiveParse`
- THEN `element.slug` equals `revenue-growth`
- AND `element.slugExplicit` is `true`

#### Scenario: Serializer preserves explicit slug
- GIVEN a parsed element with `slug:: customer-churn` and `slugExplicit: true`
- WHEN `serializeKnowledge` serializes the model
- THEN the output text contains `slug:: customer-churn` under the element declaration

#### Scenario: Concept and matrix declare explicit slugs
- GIVEN a Level-2 bluepriNNt template containing a concept and matrix with explicit `slug::` declarations
- WHEN the template is parsed
- THEN `concept.slug` and `matrix.slug` match the declared slug values

---

### Requirement: Model Frontmatter Identity Allow-List

The model frontmatter schema (`SpecFrontmatter`) MUST include optional `model_slug: string` and `workspace_id: string`. The `model_slug` MUST be an extension-less, path-free unique identifier within the workspace domain. When serializing a model (`serializeKnowledge`), the reconstructed frontmatter block MUST preserve `model_slug` and `workspace_id` without omission, regardless of whether `useRawFrontmatter` is true or false.

#### Scenario: Model frontmatter preserves model_slug and workspace_id
- GIVEN a model with frontmatter declaring `model_slug: domain-core` and `workspace_id: ws-primary-01`
- WHEN the model is parsed and re-serialized with `useRawFrontmatter: false`
- THEN the resulting frontmatter contains `model_slug: domain-core`
- AND the resulting frontmatter contains `workspace_id: ws-primary-01`

#### Scenario: Model slug conforms to format
- GIVEN a model frontmatter declaring `model_slug: financial-model-v1`
- WHEN the frontmatter is validated
- THEN the slug is accepted as a valid extension-less model slug

---

### Requirement: Slug Uniqueness per Model and DUPLICATE_SLUG Diagnostic

All element slugs within a model MUST be unique. If two or more elements declare or resolve to the same slug within the same model, the validator MUST emit a `DUPLICATE_SLUG` diagnostic with severity `error`. A model with duplicate slugs MUST NOT pass validation.

#### Scenario: Duplicate slug in same model triggers error
- GIVEN a model containing two elements declaring `slug:: target-metric`
- WHEN knowledge validation runs
- THEN a diagnostic with code `DUPLICATE_SLUG` and severity `error` is emitted
- AND validation fails

#### Scenario: Unique slugs across elements pass validation
- GIVEN a model containing multiple elements with distinct slugs
- WHEN knowledge validation runs
- THEN no `DUPLICATE_SLUG` diagnostic is emitted

---

### Requirement: Cross-Concept Same-Name Coexistence (Reversing R-IE-02)

Model normalization (`normalize.ts`) and identity management (`IdentityRegistry`) MUST permit elements under different concepts within the same model to share identical display names. The parser MUST NOT drop elements or fail parsing due to identical display names across distinct concepts (reversing R-IE-02). Sibling elements defined under the same concept MUST still possess unique display names. Graph node identities MUST be keyed by slug or concept-qualified path to ensure distinct node representation.

#### Scenario: Identical element names across concepts co-exist
- GIVEN a model defining concept `Product` with element `Name`
- AND concept `Vendor` with element `Name`
- WHEN the model is parsed and normalized
- THEN both `Product/Name` and `Vendor/Name` elements exist as distinct nodes in the resulting graph
- AND neither element is dropped or discarded

#### Scenario: Sibling elements with duplicate names are rejected
- GIVEN a concept defining two elements both named `Summary` without distinct slugs
- WHEN the model is parsed or validated
- THEN a collision error is reported for duplicate sibling elements under the same concept

---

### Requirement: Rename Element Preserves Slug

The `rename_element` mutation operation (`mutate.ts`) MUST update the element's display name (`element.name`) and cascade the name change to display references, matrix cells, and taxonomy edges, while preserving `element.slug` unchanged. `rename_element` MUST NOT clear or set `element.slug = undefined`. `rename_element` MUST NOT reject renames due to model-wide display name collisions with elements under different concepts.

#### Scenario: Renaming an element preserves its immutable slug
- GIVEN an element with name `Gross Margin` and `slug:: financial-margin`
- WHEN `rename_element` is executed with new name `Operating Margin`
- THEN `element.name` becomes `Operating Margin`
- AND `element.slug` remains `financial-margin`
- AND `slugExplicit` remains `true`

#### Scenario: Renaming to an existing name in another concept is permitted
- GIVEN an element `Status` under concept `Task`
- AND an element `Status` under concept `Project`
- WHEN `rename_element` renames an element under `Task` to `Status`
- THEN the mutation succeeds without error

---

### Requirement: Slug Freezing Operation (freeze_slugs) and Workspace Migration

The mutation pipeline MUST provide a `freeze_slugs` mutation operation. When invoked on a model, `freeze_slugs` MUST iterate over all elements lacking an explicit `slug::`, assign each a deterministic, collision-free slug derived from `uniqueSlugify(element.name)`, and set `element.slugExplicit = true` so all slugs are persisted on next serialization. When any mutation operation is executed against a model that has unfrozen elements, the mutation handler MUST automatically execute `freeze_slugs` before applying the requested mutation. The workspace upgrade tooling (`skills/nn-upgrade/scripts/migrate-domain.js`) MUST provide a command to freeze all Level-3 models across the workspace.

#### Scenario: Freezing an unfrozen model assigns explicit slugs
- GIVEN a model containing elements without `slug::` declarations
- WHEN `freeze_slugs` is executed on the model
- THEN every element receives a deterministic, unique slug
- AND every element has `element.slugExplicit = true`
- AND re-serializing the model emits `slug::` lines for all elements

#### Scenario: First mutation automatically freezes slugs
- GIVEN a model with unfrozen elements
- WHEN any mutation (such as `add_element` or `update_field`) is applied
- THEN `freeze_slugs` is automatically executed first
- AND all elements receive explicit slugs

#### Scenario: Workspace migration freezes all Level-3 models
- GIVEN a workspace containing multiple unfrozen Level-3 models
- WHEN the `nn-upgrade` domain migration script runs
- THEN all Level-3 models have their slugs frozen and persisted with explicit `slug::` declarations

---

### Requirement: Diagnostics for Unfrozen Models and Ambiguous Names

The validator MUST emit the following diagnostics:
1. `UNFROZEN_MODEL`: Emitted with severity `warning` for any Level-3 model containing elements without explicit `slug::` declarations. Unfrozen models remain valid for reading and evaluation, but tools MUST warn that mutation requires freezing.
2. `AMBIGUOUS_ELEMENT_NAME`: Emitted whenever a reference or wikilink resolves to an element by display name and more than one element of the model has that exact display name. For a reference-typed element field or a `[[…]]` wikilink the severity is `error` (the author MUST qualify the reference or use the element's unique slug). For a matrix cell row or column header the severity is `warning` and it is never blocking.

A reference, wikilink or matrix header MUST resolve by exact slug first, then by exact display name (both are iNNfo grammar). No other matching — separator-normalized, case-folded beyond the existing case-insensitive comparison, or fuzzy — MAY be applied; a value matching neither is unresolved. When a matrix cell row or column header matches more than one element by display name, the resolver MUST narrow the candidates by the containing matrix's declared `source` concept (for a row header) or `target` concept (for a column header), compared case-insensitively against each candidate element's owning concept: if exactly one candidate belongs to that concept, the header is resolved and no `AMBIGUOUS_ELEMENT_NAME` diagnostic is emitted for it. When the axis label is absent, empty, or does not narrow the match to exactly one element, the matrix header diagnostic is emitted with severity `warning` and remains non-blocking. This context step applies only to matrix headers; a reference-typed field or a `[[…]]` wikilink keeps severity `error` and MUST NOT use matrix context.

(Previously: matrix headers resolved by exact slug or exact display name only, and any matrix-header name-match of more than one element was an advisory `warning` regardless of the matrix's declared axes.)

#### Scenario: Unfrozen model emits UNFROZEN_MODEL warning
- GIVEN a Level-3 model containing elements without `slug::` declarations
- WHEN knowledge validation runs
- THEN a diagnostic with code `UNFROZEN_MODEL` and severity `warning` is emitted
- AND the model is marked readable

#### Scenario: Resolving ambiguous element name emits AMBIGUOUS_ELEMENT_NAME
- GIVEN two elements in different concepts named `Total Revenue`
- AND a reference or wikilink `[[Total Revenue]]`
- WHEN references are resolved
- THEN a diagnostic with code `AMBIGUOUS_ELEMENT_NAME` and severity `error` is emitted
- AND the resolver does not arbitrarily select one element

#### Scenario: A matrix header resolves via its declared axis concept
- GIVEN an element `Public Relations` under concept `Activities`
- AND an element `Public Relations` under concept `Communication`
- AND a matrix declaring `source: Activities` whose row header is `Public Relations`
- WHEN references are resolved
- THEN the row header resolves to `Activities`/`Public Relations`
- AND no `AMBIGUOUS_ELEMENT_NAME` diagnostic is emitted for that row

#### Scenario: A matrix header without a disambiguating axis stays an advisory warning
- GIVEN an element `Public Relations` under concept `Activities`
- AND an element `Public Relations` under concept `Communication`
- AND a matrix whose declared `source` concept contains no element named `Public Relations` (or whose axis label is empty) and whose row header is `Public Relations`
- WHEN references are resolved
- THEN a diagnostic with code `AMBIGUOUS_ELEMENT_NAME` and severity `warning` is emitted
- AND the model still validates because the matrix diagnostic is advisory, never blocking

#### Scenario: No separator-normalized match
- GIVEN an element named `Element 2A` with slug `element-2a`
- WHEN a reference `[[Element_2A]]` is resolved
- THEN it is unresolved
- AND `[[Element 2A]]` and `[[element-2a]]` both resolve to the element

