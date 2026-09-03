# Proposal: Workspace Taxonomy and Submodels

## Intent
Modernize workspace structure and model hierarchy in iNNfo by establishing formal workspace models (`workspace_NN.md`), introducing `type:: model` primitives, eliminating redundant Level 3 index blocks, and providing a dual-mode sidebar in `innfo-editor`.

## Scope
* Update `innfo-core` types, schemas, validators, and parser logic.
* Update `innfo-mcp` directory scanning and mutation routines.
* Enhance `innfo-editor` navigation state, sidebar UI, and primitive renderers.
* Add `workspace_spec_NN.md` Level 2 template.

## Capabilities
* **Workspace Entrypoints**: First-class support for `workspace_NN.md` adhering to `workspace_spec_NN.md`, with backward compatibility for legacy `index.md` and root directory scans.
* **`type:: model` Primitive**: Declare submodels in concept types (`ConceptType`) and field types (`ConceptField.type`) across metamodel validation and UI components.
* **Implicit Level 3 Taxonomy**: Derive Level 3 concept trees directly from Level 2 parent specifications, removing required `# NN index` sections.
* **Dual-State Sidebar**: Toggle between Workspace Mode (workspace model & submodel tree) and Focused Model Mode (single model concept tree with breadcrumb back-navigation).

## Approach
1. **Metamodel Primitives (`innfo-core`)**: Add `'model'` to `ConceptType` and `ConceptField.type` in `src/types.ts`, `src/schema.ts`, and validator constants/references.
2. **Workspace Entrypoint & Parser (`innfo-core`, `innfo-mcp`)**: Update `recursiveParse()` in `recursiveParser/workspace.ts` to locate `workspace_NN.md` before falling back to `index.md`. Extract model references from `ModelRef` path fields.
3. **Template-Driven Taxonomy (`innfo-core`)**: Modify `normalizeElementsIntoGraph()` and `validator/hierarchy.ts` to inherit taxonomy from `parent_spec` when `# NN index` is absent in Level 3 models.
4. **Editor Dual-Mode UI (`innfo-editor`)**: Add `sidebarMode` state (`workspace` | `focused_model`) in `uiStore.ts`. Update `LeftSidebar.vue`, `IconRenderer.vue`, and `FieldViewer.vue` for submodel navigation and interactive model pills.

## Affected Areas
* `innfo-core`: `src/types.ts`, `src/schema.ts`, `src/validator/*`, `src/recursiveParser/*`
* `innfo-mcp`: `src/tools/list-read.ts`, `src/tools/mutate.ts`
* `innfo-editor`: `src/stores/uiStore.ts`, `src/stores/workspaceStore.ts`, `src/components/layout/LeftSidebar.vue`, `src/components/editor/*`
* `specs/templates`: `specs/templates/workspace_spec_NN.md`

## Risks
* Legacy workspaces lacking `workspace_NN.md` or parent taxonomy templates could trigger fallback parser warnings.
  * *Mitigation*: Maintain robust fallback logic to `index.md` and default fallback concept trees.

## Rollback Plan
Revert changes across `innfo-core`, `innfo-mcp`, and `innfo-editor` via Git commit revert. Legacy `index.md` files and existing Level 3 `# NN index` sections remain fully valid and unaffected.

## Success Criteria
* `workspace_NN.md` and submodels parse correctly with 100% backward compatibility for `index.md`.
* `type:: model` passes schema validation and renders interactive pills in editor field viewers.
* Level 3 models without `# NN index` inherit template taxonomy without validator errors.
* Editor sidebar toggles between Workspace and Focused Model modes seamlessly.
