# Delta for Recursive Submodel Parsing & Traversal

## MODIFIED Requirements

### Requirement: Cycle Detection and Normalized Visited Tracking

The recursive parser MUST maintain a `visitedPaths` set of normalized, lowercased POSIX paths of models that have already been fully parsed. Each `WorklistItem` MUST carry an `ancestorKeys: string[]` field recording the normalized path keys from the entrypoint to the referring model, inclusive, seeded with the entrypoint key. When resolving a submodel reference to normalized key `normKey`, the parser MUST evaluate, in order:

1. If `normKey` is present in `item.ancestorKeys`, the reference is a **true cycle** — the parser MUST NOT re-enqueue or re-parse the file and MUST record a non-fatal warning diagnostic (`Cycle detected`) in `ctx.issues`.
2. Otherwise, if `normKey` is present in `visitedPaths`, the reference is a **diamond** (a second, non-ancestor parent) — the parser MUST link the referring node as an additional parent of the already-parsed node without altering the node's primary `parentId`, MUST NOT re-parse or re-enqueue the file, and MUST NOT emit any diagnostic.
3. Otherwise the file is parsed fresh, added to `visitedPaths`, and its nested references are enqueued with `ancestorKeys` extended by `normKey`.

The first traversal path to reach a node determines its recorded depth.

(Previously: any re-encounter of a path already in `visitedPaths` was unconditionally treated as a cycle, emitting `Cycle detected` and dropping the second incoming edge, regardless of whether the reference came from an ancestor or an unrelated branch.)

#### Scenario: Mutual direct circular reference
- GIVEN model `models/service_a_NN.md` referencing `models/service_b_NN.md`
- AND model `models/service_b_NN.md` referencing `models/service_a_NN.md`
- WHEN `recursiveParse()` executes
- THEN both models are parsed exactly once
- AND a warning diagnostic is logged for the circular reference from `service_b_NN.md` back to `service_a_NN.md`
- AND parsing completes without an infinite loop or call stack exhaustion

#### Scenario: Diamond reached via two independent parents (not a cycle)
- GIVEN workspace entrypoint `W` referencing both `acme_business_NN.md` and `acme_portfolio_NN.md`
- AND `acme_portfolio_NN.md` also references `acme_business_NN.md` via a `type:: model` field
- WHEN `recursiveParse()` dequeues `acme_business_NN.md` a second time with ancestor chain `[w, acme_portfolio]`
- THEN `acme_business_NN.md` is recognized as already parsed and not an ancestor on this branch, so it is linked as an additional child of `acme_portfolio_NN.md` alongside `W`
- AND no `Cycle detected` issue is emitted
- AND the file is not re-parsed

#### Scenario: True cycle through an ancestor chain
- GIVEN `acme_portfolio_NN.md` references `acme_business_NN.md` (ancestors `[w, acme_portfolio]`)
- AND `acme_business_NN.md` in turn references `acme_portfolio_NN.md`
- WHEN `recursiveParse()` dequeues `acme_portfolio_NN.md` again with ancestor chain `[w, acme_portfolio, acme_business]`
- THEN `acme_portfolio_NN.md` is found in the current branch's `ancestorKeys`
- AND a `Cycle detected` warning diagnostic is recorded in `ctx.issues`
- AND the reference is skipped without re-parsing

## ADDED Requirements

### Requirement: Optional Template Schema Resolution for Traversal

`recursiveParse` MUST accept an optional synchronous `resolveTemplateSchema(node) => TemplateSchema | null` callback. When supplied, the composed (`includes`-merged) schema returned for a node MUST be threaded into both `extractSubmodelRefs` call sites so that fields typed `model` on any Level-2 concept — including fields inherited via `includes` — are followed during traversal. When the callback is absent, or returns `null` for a node, `extractSubmodelRefs` MUST behave exactly as it does without schema awareness (bare `path`/`file_ref` fields, WikiLinks, and markdown links only).

#### Scenario: Traversal follows a schema-typed model field
- GIVEN a Level-2 template `startup` whose `Startup` concept declares field `business_model` with `type:: model`
- AND a `resolveTemplateSchema` callback is supplied to `recursiveParse` returning the composed `startup` schema for nodes of that template
- WHEN `recursiveParse()` dequeues a node with `business_model:: [[startups/acme_business_NN.md]]`
- THEN `startups/acme_business_NN.md` is extracted and enqueued as a submodel reference

#### Scenario: Backward-compatible traversal without a schema resolver
- GIVEN no `resolveTemplateSchema` callback is supplied to `recursiveParse`
- WHEN traversal processes a node containing a `type:: model` field alongside `path::`/`file_ref::` properties and WikiLinks
- THEN only the `path`/`file_ref` properties, WikiLinks, and markdown links are extracted as submodel references
- AND the schema-typed field is not followed

#### Scenario: Composed schema from includes participates in traversal
- GIVEN a Level-2 template composed via `includes` that inherits a `type:: model` field from an included template
- AND `resolveTemplateSchema` returns the composed (post-`includes`) schema
- WHEN `recursiveParse()` processes a node of that template
- THEN the inherited `type:: model` field is followed and its target enqueued
