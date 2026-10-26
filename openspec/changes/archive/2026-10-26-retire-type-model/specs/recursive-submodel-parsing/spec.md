## MODIFIED Requirements

### Requirement: Generalized Submodel Reference Extraction

The helper `extractSubmodelRefs` MUST extract submodel file references from:
1. `Models` concepts declaring `path::` or `file_ref::` properties.
2. Any domain concept element containing fields typed as `knowledge` by its template schema (a deprecated `type:: model` declaration normalizes to `knowledge` before extraction).
3. WikiLinks targeting markdown files (e.g. `[[models/subsystem_NN.md]]`).
4. Markdown hyperlinks targeting markdown files (e.g. `[Auth Subsystem](models/subsystem_NN.md)`).

References pointing to ignored directories (`specs/`, `backups/`, `archive/`) MUST be filtered out.

#### Scenario: Extracting submodel reference from domain element typed as knowledge
- GIVEN a domain element `## NN Subsystem: Payment` with field `submodel_file:: models/payment_NN.md`
- AND the field `submodel_file` is defined with `type:: knowledge` in the template schema
- WHEN `extractSubmodelRefs()` runs on the model content
- THEN `models/payment_NN.md` is extracted as a submodel reference

#### Scenario: Deprecated model declaration is still extracted
- GIVEN a domain element with field `submodel_file:: models/payment_NN.md`
- AND the field `submodel_file` is defined with the deprecated `type:: model` in the template schema
- WHEN `extractSubmodelRefs()` runs on the model content
- THEN the type normalizes to `knowledge`
- AND `models/payment_NN.md` is extracted as a submodel reference

#### Scenario: Ignoring spec references and non-model files
- GIVEN model content containing WikiLinks `[[specs/business_V_0-1-0_NN.md]]` and `[[diagram.png]]`
- WHEN `extractSubmodelRefs()` parses references
- THEN `specs/business_V_0-1-0_NN.md` is ignored because it resides in the `specs/` directory
- AND `diagram.png` is ignored because it lacks the `.md` suffix

### Requirement: Optional Template Schema Resolution for Traversal

`recursiveParse` MUST accept an optional synchronous `resolveTemplateSchema(node) => TemplateSchema | null` callback. When supplied, the composed (`includes`-merged) schema returned for a node MUST be threaded into both `extractSubmodelRefs` call sites so that fields typed `knowledge` on any Level-2 concept — including fields inherited via `includes` and fields declared with the deprecated `type:: model` — are followed during traversal. When the callback is absent, or returns `null` for a node, `extractSubmodelRefs` MUST behave exactly as it does without schema awareness (bare `path`/`file_ref` fields, WikiLinks, and markdown links only).

#### Scenario: Traversal follows a schema-typed knowledge field
- GIVEN a Level-2 bluepriNNt `startup` whose `Startup` concept declares field `business_model` with `type:: knowledge`
- AND a `resolveTemplateSchema` callback is supplied to `recursiveParse` returning the composed `startup` schema for nodes of that template
- WHEN `recursiveParse()` dequeues a node with `business_model:: [[startups/acme_business_NN.md]]`
- THEN `startups/acme_business_NN.md` is extracted and enqueued as a submodel reference

#### Scenario: Backward-compatible traversal without a schema resolver
- GIVEN no `resolveTemplateSchema` callback is supplied to `recursiveParse`
- WHEN traversal processes a node containing a `type:: knowledge` field alongside `path::`/`file_ref::` properties and WikiLinks
- THEN only the `path`/`file_ref` properties, WikiLinks, and markdown links are extracted as submodel references
- AND the schema-typed field is not followed

#### Scenario: Composed schema from includes participates in traversal
- GIVEN a Level-2 bluepriNNt composed via `includes` that inherits a `type:: knowledge` field from an included bluepriNNt
- AND `resolveTemplateSchema` returns the composed (post-`includes`) schema
- WHEN `recursiveParse()` processes a node of that bluepriNNt
- THEN the inherited `type:: knowledge` field is followed and its target enqueued
