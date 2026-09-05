# Cross-Model Reference Validation

## Purpose

Validate qualified cross-model references (`[[Model Title :: Element Name]]`) across a parsed workspace, replacing the current per-file bypass of any `::`- or `[...]`-shaped value with a workspace-scope pass that checks target existence, concept and template membership, and workspace-wide title uniqueness.

## Requirements

### Requirement: Qualified Cross-Model Reference Syntax

Cross-model references MUST use the qualified form `[[Model Title :: Element Name]]` exclusively. Positional or anchor-based syntax (e.g. `path#slug`) MUST NOT be supported. The workspace-scope validator MUST re-scan raw field values for the qualified form rather than relying on per-file parsing; `references.ts` keeps its existing per-file bypass for any `::`/`[...]` value.

#### Scenario: Qualified reference recognized for workspace validation
- GIVEN a field value `fundadores:: [[Acme Org :: Jane Doe]]`
- WHEN the workspace-scope validator scans the field
- THEN the value is parsed as a qualified reference with model title `Acme Org` and element name `Jane Doe`

#### Scenario: Positional path-anchor syntax is not recognized
- GIVEN a field value using positional syntax such as `acme_org.md#jane-doe`
- WHEN the workspace-scope validator scans the field
- THEN the value is not recognized as a qualified cross-model reference and is left to existing per-file handling

### Requirement: Target Model and Element Existence

For each qualified reference in a `reference` or `model` typed field, `validateWorkspaceReferences(index)` MUST report an `error` diagnostic when `Model Title` does not resolve to exactly one node in `WorkspaceIndex.titleToNodeIds`, and MUST report an `error` diagnostic when `Element Name` is not a known element of the resolved node in `WorkspaceIndex.nodeElementConcepts`.

#### Scenario: Dangling target model
- GIVEN a qualified reference `[[Nonexistent Model :: Jane Doe]]`
- WHEN `validateWorkspaceReferences()` runs
- THEN an `error` diagnostic is reported indicating the target model does not exist in the workspace

#### Scenario: Dangling target element
- GIVEN a qualified reference `[[Acme Org :: Nonexistent Person]]` where `Acme Org` resolves to a known node
- WHEN `validateWorkspaceReferences()` runs
- THEN an `error` diagnostic is reported indicating the target element does not exist in `Acme Org`

#### Scenario: Valid qualified reference passes
- GIVEN a qualified reference `[[Acme Org :: Jane Doe]]` where `Acme Org` resolves to one node and `Jane Doe` is a known element of it
- WHEN `validateWorkspaceReferences()` runs
- THEN no existence diagnostic is reported for that reference

### Requirement: Concept and Template Membership Checks

When a field declares `target_concepts`, `validateWorkspaceReferences()` MUST report a `warning` diagnostic if the target element's owning concept is not among `target_concepts`. When a field declares `target_template`, it MUST report a `warning` diagnostic if the target model's resolved template is not among `target_template`.

#### Scenario: Concept membership mismatch warns
- GIVEN a field `fundadores` declaring `target_concepts: [Founder]`
- AND a qualified reference `[[Acme Org :: Jane Doe]]` where `Jane Doe` belongs to concept `Employee`, not `Founder`
- WHEN `validateWorkspaceReferences()` runs
- THEN a `warning` diagnostic is reported for the concept mismatch, and no `error` is reported for it

#### Scenario: Template membership mismatch warns
- GIVEN a `model`-typed field declaring `target_template: business_V_0-2-0`
- AND the qualified reference resolves to a model whose template is `procedures_V_0-2-0`
- WHEN `validateWorkspaceReferences()` runs
- THEN a `warning` diagnostic is reported for the template mismatch

### Requirement: Workspace-Wide Model Title Uniqueness

`validateWorkspaceReferences(index)` MUST report an `error` diagnostic for every model title that resolves to more than one node in `WorkspaceIndex.titleToNodeIds`, since qualified references assume a unique title per workspace.

#### Scenario: Duplicate model titles reported as errors
- GIVEN two parsed models that both declare frontmatter `title: "Acme Org"`
- WHEN `validateWorkspaceReferences()` runs
- THEN an `error` diagnostic is reported naming the duplicate title and both source paths, independent of whether any reference currently targets that title

### Requirement: Title Resolution — Exact Match with Normalized Fallback

Model title resolution for qualified references MUST attempt an exact, case-preserving match against `WorkspaceIndex.titleToNodeIds` first. If no exact match is found, the validator MUST attempt a normalized fallback match (`normalizeSeparators`, lowercase) and, when a normalized match succeeds, MUST report a `warning` diagnostic noting the inexact match.

#### Scenario: Exact title match resolves without a warning
- GIVEN a qualified reference `[[Acme Org :: Jane Doe]]` matching a node's frontmatter `title: "Acme Org"` exactly
- WHEN `validateWorkspaceReferences()` runs
- THEN the reference resolves with no title-matching diagnostic

#### Scenario: Normalized fallback match warns
- GIVEN a qualified reference `[[acme-org :: Jane Doe]]` where no node's title matches exactly, but normalizing separators and case matches a node titled `"Acme Org"`
- WHEN `validateWorkspaceReferences()` runs
- THEN the reference resolves to that node
- AND a `warning` diagnostic is reported noting the inexact title match

### Requirement: Typed Fields Only in v1

`validateWorkspaceReferences()` MUST validate qualified references only within `reference` and `model` typed field values. It MUST NOT scan prose/body content for qualified reference syntax in v1.

#### Scenario: Prose containing bracket-and-colon text is not validated
- GIVEN a model's body prose contains the literal text `[[Acme Org :: Jane Doe]]` outside any typed field value
- WHEN `validateWorkspaceReferences()` runs
- THEN no diagnostic is reported for that prose occurrence

### Requirement: Host Wiring After Recursive Parse

The cross-model validation pass MUST run after a host's own `recursiveParse()` and `buildWorkspaceIndex()` calls, never in place of per-file `validateDocument`/`validateModel`. `innfo-mcp`'s `validateModel` MUST expose an optional workspace-scope mode that builds the index and runs `validateWorkspaceReferences`.

#### Scenario: MCP workspace-mode validation
- GIVEN a workspace with a qualified reference from one model to another
- WHEN `validateModel` is invoked with workspace mode enabled
- THEN the response includes diagnostics produced by `validateWorkspaceReferences()` in addition to per-file diagnostics
