# Recursive Submodel Parsing & Traversal

## Purpose

Provide a robust iterative parsing engine in `innfo-core` that recursively traverses multi-level nested submodels using a worklist queue, prevents infinite loops via canonical path cycle detection (`visitedPaths` Set), bounds recursion with a maximum depth limit (`MAX_DEPTH = 10`), resolves canonical workspace-relative paths with relative path fallback, and extracts submodel references across domain concepts and link formats.

## Requirements

### Requirement: Queue-Based Iterative Worklist Traversal

The workspace parsing engine in `innfo-core/src/recursiveParser/workspace.ts` (`recursiveParse`) MUST implement an iterative queue-based (worklist) traversal instead of a single-level pass. Each enqueued item MUST record the model's path, display name, referring model path, and current depth (`depth: number`).

#### Scenario: Traversing multi-level nested submodels
- GIVEN a workspace entrypoint `workspace_NN.md` referencing `models/system_NN.md`
- AND `models/system_NN.md` contains a field referencing nested submodel `models/subsystems/auth_NN.md`
- WHEN `recursiveParse()` is executed on the workspace root
- THEN `workspace_NN.md`, `system_NN.md`, and `auth_NN.md` are all parsed and registered into `ctx.nodes`
- AND `auth_NN.md` is registered with its parent relationship linked to `system_NN.md`

#### Scenario: Graceful handling of leaf submodels
- GIVEN a nested submodel `models/subsystems/auth_NN.md` containing no outgoing submodel references
- WHEN the worklist reaches `auth_NN.md`
- THEN `auth_NN.md` is parsed and registered
- AND the traversal terminates gracefully when the worklist queue is exhausted

---

### Requirement: Cycle Detection and Normalized Visited Tracking

The recursive parser MUST maintain a `visitedPaths` set of normalized, lowercased POSIX paths of models that have already been fully parsed. Each `WorklistItem` MUST carry an `ancestorKeys: string[]` field recording the normalized path keys from the entrypoint to the referring model, inclusive, seeded with the entrypoint key. When resolving a submodel reference to normalized key `normKey`, the parser MUST evaluate, in order:

1. If `normKey` is present in `item.ancestorKeys`, the reference is a **true cycle** — the parser MUST NOT re-enqueue or re-parse the file and MUST record a non-fatal warning diagnostic (`Cycle detected`) in `ctx.issues`.
2. Otherwise, if `normKey` is present in `visitedPaths`, the reference is a **diamond** (a second, non-ancestor parent) — the parser MUST link the referring node as an additional parent of the already-parsed node without altering the node's primary `parentId`, MUST NOT re-parse or re-enqueue the file, and MUST NOT emit any diagnostic.
3. Otherwise the file is parsed fresh, added to `visitedPaths`, and its nested references are enqueued with `ancestorKeys` extended by `normKey`.

The first traversal path to reach a node determines its recorded depth.

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

---

### Requirement: Maximum Traversal Depth Limit (MAX_DEPTH = 10)

The recursive parser MUST enforce a maximum traversal depth limit of `MAX_DEPTH = 10` where the root entrypoint is at depth 0. If a submodel reference occurs at `depth >= MAX_DEPTH`, the parser MUST NOT enqueue the target file and MUST record a warning diagnostic in `ctx.issues`.

#### Scenario: Submodel reference within allowed depth
- GIVEN a submodel chain nested 9 levels deep (`root` -> `m1` -> `m2` -> ... -> `m9`)
- WHEN `recursiveParse()` traverses the chain
- THEN all 9 intermediate models are successfully enqueued, parsed, and registered

#### Scenario: Submodel reference exceeding MAX_DEPTH boundary
- GIVEN a submodel chain reaching depth 10 referencing a child model `models/depth_11_NN.md`
- WHEN `recursiveParse()` encounters the reference at depth 10
- THEN `models/depth_11_NN.md` is not enqueued for parsing
- AND a warning diagnostic indicating traversal depth limit exceeded (`MAX_DEPTH = 10`) is logged in `ctx.issues`

---

### Requirement: Canonical Workspace-Relative Resolution with Relative Fallback

The recursive parser MUST resolve submodel reference paths according to canonical resolution rules:
1. Canonical workspace-relative paths (e.g. `models/subsystems/auth_NN.md`) MUST be resolved directly against the workspace root.
2. Relative paths starting with `./` or `../` (e.g. `./auth_NN.md`, `../shared/common_NN.md`) MUST be resolved relative to the directory of the referring model file (`dirname(referringPath)`).
3. All path comparisons and map keys MUST normalize Windows backslashes (`\`) to forward slashes (`/`) and be lowercased.

#### Scenario: Resolving canonical workspace-relative reference from deep submodel
- GIVEN a nested submodel at `models/subsystems/auth_NN.md`
- AND `auth_NN.md` references `models/common_NN.md`
- WHEN the parser resolves the reference
- THEN `models/common_NN.md` is resolved from workspace root `models/common_NN.md`

#### Scenario: Resolving relative path from nested directory
- GIVEN a referring model located at `models/subsystems/auth_NN.md`
- AND `auth_NN.md` contains a submodel reference `./tokens_NN.md`
- WHEN the parser resolves the reference
- THEN `./tokens_NN.md` is resolved relative to `models/subsystems/`, locating `models/subsystems/tokens_NN.md`

#### Scenario: Normalizing Windows backslash paths
- GIVEN a submodel reference written with Windows separators `models\subsystems\auth_NN.md`
- WHEN the parser processes the path
- THEN the path is normalized to `models/subsystems/auth_NN.md` for lookup, handle resolution, and `visitedPaths` tracking

---

### Requirement: Generalized Submodel Reference Extraction

The helper `extractSubmodelRefs` MUST extract submodel file references from:
1. `ModelRef` concepts declaring `path::` or `file_ref::` properties.
2. Any domain concept element containing fields typed as `model` by its template schema.
3. WikiLinks targeting markdown files (e.g. `[[models/subsystem_NN.md]]`).
4. Markdown hyperlinks targeting markdown files (e.g. `[Auth Subsystem](models/subsystem_NN.md)`).

References pointing to ignored directories (`specs/`, `backups/`, `archive/`) MUST be filtered out.

#### Scenario: Extracting submodel reference from domain element typed as model
- GIVEN a domain element `## NN Subsystem: Payment` with field `submodel_file:: models/payment_NN.md`
- AND the field `submodel_file` is defined with `type:: model` in the template schema
- WHEN `extractSubmodelRefs()` runs on the model content
- THEN `models/payment_NN.md` is extracted as a submodel reference

#### Scenario: Ignoring spec references and non-model files
- GIVEN model content containing WikiLinks `[[specs/business_V_0-1-0_NN.md]]` and `[[diagram.png]]`
- WHEN `extractSubmodelRefs()` parses references
- THEN `specs/business_V_0-1-0_NN.md` is ignored because it resides in the `specs/` directory
- AND `diagram.png` is ignored because it lacks the `.md` suffix

---

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

