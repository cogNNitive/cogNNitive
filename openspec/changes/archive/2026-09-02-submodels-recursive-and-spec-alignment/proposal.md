# Proposal: Submodels Recursive Traversal & Formal Spec Alignment

## Intent
Formalize the `type:: model` primitive in the Level 1 normative specification, enable robust recursive traversal and validation of submodels with cycle prevention, and enhance editor navigation and MCP discovery to fully support multi-level submodel architectures across the cogNNitive workspace.

## Scope
* **Formal Specification (`iNNfo/specs/iNNfo_V_0-1-0_NN.md`)**: Formalize `model` as the 10th primitive field type and concept type; define normative semantics for `target_template` and submodel path references; update the self-describing Metaschema.
* **Core Metamodel & Schemas (`innfo-core`)**: Extend `ConceptField` and schema extraction with `target_template?: string`; preserve configuration across template aliasing and canonical hashing.
* **Recursive Workspace Parser (`innfo-core`)**: Transform `recursiveParse` into an iterative queue-based traversal engine with cycle detection (`visitedPaths` Set), depth capping (`MAX_DEPTH = 10`), context-aware path resolution, and generalized reference extraction across domain concepts.
* **Reference & Submodel Validation (`innfo-core`)**: Replace blind validation bypass with file existence checks and `target_template` conformance checks, emitting `WARNING` diagnostics to permit draft/iterative creation without failing builds.
* **MCP Tooling (`innfo-mcp`)**: Upgrade `findModelFile` to locate nested submodels recursively; wire pluggable synchronous submodel resolution into `validateModel`.
* **Editor Integration (`innfo-editor`)**: Register `model` in the unified widget registry; provide editable input controls and informative target-template badges; maintain sidebar focus mode with hierarchical breadcrumb navigation (`Workspace > Parent Model > Submodel`).

## Capabilities

### New Capabilities
* `recursive-submodel-parsing`: Traverses nested submodels iteratively using a worklist queue, enforcing cycle prevention via normalized path tracking and a configurable depth limit (`MAX_DEPTH = 10`), resolving canonical workspace-relative paths with file-relative fallback.
* `submodel-conformance-validation`: Verifies submodel file existence and template conformance against declared `target_template` constraints, emitting non-breaking `WARNING` diagnostics for draft/unresolved references.

### Modified Capabilities
* `model-primitive-type`: Upgrades `model` from an experimental core type to a fully normative primitive in Level 1 specification, Metaschema, and schema extraction with `target_template`.
* `dual-mode-sidebar`: Enhances focus mode in `innfo-editor` with hierarchical breadcrumb navigation (`Workspace > Parent Model > Submodel`), displaying the active model's concept tree in the sidebar while keeping deep navigation effortless.

## Approach

1. **Formal Spec Alignment (`iNNfo_V_0-1-0_NN.md`)**:
   - Update the Field Definition primitive types table (§Root Primitives) to include `model` as the 10th type (`string | select | reference | markdown_inline | markdown_file | image | file | video | audio | model`).
   - Add property `target_template` (string) to Field Definition.
   - Document normative rules: values specify workspace-relative canonical paths (or file-relative `./...` paths) to target `*_NN.md` models; when `target_template` is specified, the referenced submodel must match the specified template name or URL.
   - Update Level 1 Metaschema definitions for `Concept Definition: type`, `Field Definition: type`, and declare `## NN Field Definition: target_template`.

2. **Core Types & Schema Extraction (`innfo-core`)**:
   - Add `target_template?: string` to `ConceptField` in `src/types.ts`.
   - Update `extractTemplateSchema` in `src/schema.ts` to parse `el.fields['target_template']`.
   - Update `applyAliasToSchema` and `canonicalValue` to handle `target_template`.

3. **Recursive Workspace Parsing Engine (`innfo-core`)**:
   - Refactor `recursiveParse` in `src/recursiveParser/workspace.ts` to use a queue/worklist (`Array<{ path: string; name: string; referringPath: string; depth: number }>`).
   - Implement `visitedPaths = new Set<string>()` with normalized lowercase POSIX paths to detect cycles and emit warning diagnostics.
   - Enforce `MAX_DEPTH = 10` boundary check.
   - Implement canonical path resolution: resolve workspace-relative paths (canonical standard) directly from workspace root, with fallback resolution relative to `dirname(referringPath)` for relative paths (`./...`, `../...`).
   - Generalize submodel extraction to inspect `ModelRef` path fields, domain element fields typed as `model` by template schemas, and file links.

4. **Reference & Submodel Validation (`innfo-core`)**:
   - Introduce `SubmodelResolver` synchronous callback contract in `src/validator/references.ts` and `document.ts`.
   - When validating fields of `type:: model`:
     - Clean WikiLink formatting: `[[path/to/model.md]]` -> `path/to/model.md`.
     - Check file existence using `resolveSubmodel`. If unresolved, emit a `WARNING` diagnostic: `Dangling submodel reference: field "${fieldName}" references file "${value}" which does not exist`.
     - When `target_template` is declared, verify that the resolved submodel's frontmatter (`parent_spec.name`, `parent_spec.url`, or `title`) matches. If mismatched, emit a `WARNING` diagnostic.

5. **MCP Server Integration (`innfo-mcp`)**:
   - Update `findModelFile` in `src/tools/spec.ts` and `list-read.ts` to leverage recursive scanning via `listModels(rootDir)` when direct path matches fail.
   - Implement synchronous file and frontmatter resolution in `validateModel` (`src/tools/mutate.ts`) to feed `SubmodelResolver`.

6. **Editor UI & Navigation (`innfo-editor`)**:
   - Add `'model'` to `WidgetType` and register `FieldString` in `UNIFIED_WIDGET_REGISTRY` in `src/shared/widgets/registry.ts` to support interactive editing.
   - Enhance `FieldViewer.vue` to display `target_template` metadata in tooltip/badge on model navigation pills.
   - Maintain focus mode in `LeftSidebar.vue` (displaying active model concept tree) and enrich `WorkspaceBreadcrumb.vue` or header navigation with full hierarchical ancestry: `Workspace > Parent Model > Submodel`.

## Affected Areas

| Component / Package | Files Affected | Description of Changes |
|---|---|---|
| **Normative Spec** | `iNNfo/specs/iNNfo_V_0-1-0_NN.md` | Formalize `model` primitive type, `target_template` property, and Metaschema updates. |
| **innfo-core** | `src/types.ts` | Add `target_template?: string` to `ConceptField`. |
| **innfo-core** | `src/schema.ts` | Extract and preserve `target_template` in template schemas. |
| **innfo-core** | `src/recursiveParser/workspace.ts`, `paths.ts` | Queue-based recursive traversal, cycle detection, depth cap, and path normalization. |
| **innfo-core** | `src/validator/references.ts`, `document.ts`, `model.ts` | Submodel existence and template conformance checks emitting `WARNING` diagnostics. |
| **innfo-mcp** | `src/tools/spec.ts`, `src/tools/list-read.ts`, `src/tools/mutate.ts` | Recursive submodel resolution in `findModelFile` and submodel resolver in `validateModel`. |
| **innfo-editor** | `src/shared/widgets/registry.ts`, `src/components/editor/FieldViewer.vue` | Register `model` widget, interactive editing, submodel badges, and breadcrumb ancestry. |

## Risks & Mitigations

* **Circular Submodel References**:
  * *Risk*: Circular references between submodels causing infinite loops or heap exhaustion during parsing.
  * *Mitigation*: Track normalized canonical paths in a `visitedPaths` Set, abort duplicate traversal with a warning diagnostic, and enforce `MAX_DEPTH = 10`.
* **Path Resolution Across OS Environments**:
  * *Risk*: Windows backslashes (`\`) vs POSIX slashes (`/`) causing path comparison failures in visited sets or handle lookups.
  * *Mitigation*: Normalize all path keys to forward slashes and lowercase before set insertions and handle lookups.
* **Draft Model Validation Breakage**:
  * *Risk*: Strict error diagnostics failing builds when users create submodel references before creating target files.
  * *Mitigation*: Emit diagnostics for missing submodel files and template mismatches with `WARNING` severity rather than fatal errors.
* **Metaschema Self-Conformance**:
  * *Risk*: Metaschema syntax changes causing bootstrap validation failures.
  * *Mitigation*: Validate Level 1 self-conformance and verify with existing Level 2 template validation tests.

## Rollback Plan
Revert changes across `iNNfo/specs/iNNfo_V_0-1-0_NN.md`, `innfo-core`, `innfo-mcp`, and `innfo-editor` via Git commit revert. Previous shallow parsing, bypass of submodel reference validation, and Level 2 templates remain backwards compatible.

## Success Criteria
* `iNNfo_V_0-1-0_NN.md` documents `model` as the 10th primitive field type and `target_template` property, passing self-describing Metaschema validation.
* `recursiveParse` successfully traverses multi-level nested submodels, correctly identifies cycles, and enforces `MAX_DEPTH = 10`.
* Missing submodels or `target_template` mismatches emit actionable `WARNING` diagnostics without halting document validation.
* Nested submodels located anywhere in workspace subdirectories are discoverable via `innfo-mcp` tools (`findModelFile`, `readModel`).
* `innfo-editor` renders editable model fields, supports navigation to nested submodels, and displays hierarchical breadcrumbs (`Workspace > Parent Model > Submodel`).
