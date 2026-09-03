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

The recursive parser MUST maintain a `visitedPaths` set containing normalized, lowercased POSIX paths of all visited models. If a submodel reference resolves to a path already present in `visitedPaths`, the parser MUST NOT re-enqueue or re-parse the file, and MUST record a non-fatal warning diagnostic in `ctx.issues`.

#### Scenario: Mutual direct circular reference
- GIVEN model `models/service_a_NN.md` referencing `models/service_b_NN.md`
- AND model `models/service_b_NN.md` referencing `models/service_a_NN.md`
- WHEN `recursiveParse()` executes
- THEN both models are parsed exactly once
- AND a warning diagnostic is logged for the circular reference from `service_b_NN.md` back to `service_a_NN.md`
- AND parsing completes without an infinite loop or call stack exhaustion

#### Scenario: Shared diamond dependency (DAG)
- GIVEN `workspace_NN.md` referencing both `models/billing_NN.md` and `models/shipping_NN.md`
- AND both `billing_NN.md` and `shipping_NN.md` reference a shared `models/common_NN.md`
- WHEN `recursiveParse()` executes
- THEN `models/common_NN.md` is parsed on its first encounter
- AND on the second encounter `models/common_NN.md` is recognized as already visited and skipped without an error

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
