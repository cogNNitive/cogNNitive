# Cross-Model Reference Validation

## Purpose

Validate qualified cross-model references (`[[Model Title :: Element Name]]`) across a parsed workspace, replacing the current per-file bypass of any `::`- or `[...]`-shaped value with a workspace-scope pass that checks target existence, concept and template membership, and workspace-wide title uniqueness.

## Requirements

### Requirement: Target Model and Element Existence

For each address in a `reference` or `model` typed field, `validateWorkspaceReferences(index)` MUST report an `error` diagnostic when the model part does not resolve to exactly one model by hierarchical id, and MUST report an `error` diagnostic when the element slug is not a known element of the resolved model. The diagnostic MUST name the address and the referencing location.
(Previously: the model part was a title resolved through `WorkspaceIndex.titleToNodeIds`, and the element part matched an element name.)

#### Scenario: Dangling target model
- GIVEN a reference value `villabotijos-today/no-such-video@00-gancho`
- WHEN `validateWorkspaceReferences()` runs
- THEN an `error` diagnostic is reported indicating the target model does not exist in the domaiNN

#### Scenario: Dangling target element
- GIVEN a reference value `villabotijos-today/pepper-mapache@no-such-scene` where the model exists
- WHEN `validateWorkspaceReferences()` runs
- THEN an `error` diagnostic is reported indicating the element does not exist in `villabotijos-today/pepper-mapache`

#### Scenario: Valid reference passes
- GIVEN a reference value `villabotijos-today/pepper-mapache@00-gancho` where both exist
- WHEN `validateWorkspaceReferences()` runs
- THEN no existence diagnostic is reported for that reference

#### Scenario: Stale reference after a move
- GIVEN a reference value `innteresante/intro` and that instance moved to `villabotijos-today/intro`
- WHEN `validateWorkspaceReferences()` runs
- THEN an `error` diagnostic names `innteresante/intro`

### Requirement: Concept and Template Membership Checks

When a field declares `target_concepts`, `validateWorkspaceReferences()` MUST report a `warning` diagnostic if the target element's owning concept, or the target instance model's root concept, is not among `target_concepts`. When a field declares `target_template`, it MUST report a `warning` diagnostic if the target model's resolved template is not among `target_template`.
(Previously: only the target element's owning concept was checked; an instance model target had no owning element concept.)

#### Scenario: Concept membership mismatch warns
- GIVEN a field `fundadores` declaring `target_concepts: [Founder]`
- AND a reference to an element whose concept is `Employee`
- WHEN `validateWorkspaceReferences()` runs
- THEN a `warning` diagnostic is reported for the concept mismatch, and no `error` is reported for it

#### Scenario: Instance model target of the wrong concept
- GIVEN a field declaring `target_concepts: [Video]` and a value addressing the Series instance `villabotijos-today`
- WHEN `validateWorkspaceReferences()` runs
- THEN a `warning` diagnostic is reported for the concept mismatch

#### Scenario: Template membership mismatch warns
- GIVEN a `model`-typed field declaring `target_template: business_V_0-2-0`
- AND the reference resolves to a model whose template is `procedures_V_0-2-0`
- WHEN `validateWorkspaceReferences()` runs
- THEN a `warning` diagnostic is reported for the template mismatch

### Requirement: Typed Fields Only in v1

`validateWorkspaceReferences()` MUST validate addresses only within `reference` and `model` typed field values. It MUST NOT scan prose/body content for reference syntax in v1.
(Previously: stated for the qualified form `[[Model Title :: Element Name]]`.)

#### Scenario: Prose containing an address is not validated
- GIVEN a model's body prose contains the text `villabotijos-today/pepper-mapache@no-such-scene` outside any typed field value
- WHEN `validateWorkspaceReferences()` runs
- THEN no diagnostic is reported for that prose occurrence

### Requirement: Host Wiring After Recursive Parse

The cross-model validation pass MUST run after a host's own `recursiveParse()` and `buildWorkspaceIndex()` calls, never in place of per-file `validateDocument`/`validateModel`. `nn-mcp`'s `validateModel` MUST expose an optional workspace-scope mode that builds the index and runs `validateWorkspaceReferences`.
(Previously: unchanged except that the index is keyed by hierarchical id instead of by title.)

#### Scenario: MCP workspace-mode validation
- GIVEN a workspace with a reference from one model to another by hierarchical id
- WHEN `validateModel` is invoked with workspace mode enabled
- THEN the response includes diagnostics produced by `validateWorkspaceReferences()` in addition to per-file diagnostics

### Requirement: Canonical multivalue form for address fields

The workspace-scope validator MUST re-scan raw field values for addresses rather than rely on per-file parsing. For multivalue reference fields, exactly ONE canonical multivalue syntax MUST be accepted in ALL reference fields of every model; any other multivalue form MUST fail with a stable diagnostic code plus an inline hint naming the canonical form and suggesting migration. The canonical syntax is a design decision. This carries over the multivalue rule of the removed requirement below.

#### Scenario: Canonical multivalue form accepted
- GIVEN a reference field holding `villabotijos-today/pepper-mapache` and `villabotijos-today/intro` in the canonical multivalue form
- WHEN the validator scans the field
- THEN each value resolves as an independent address

#### Scenario: Non-canonical multivalue fails with code and hint
- GIVEN the same two values joined in a non-canonical form
- WHEN the validator scans the field
- THEN a stable-code diagnostic is reported
- AND the hint names the canonical form
