# Delta for Dual Mode Sidebar

## MODIFIED Requirements

### Requirement: Workspace Mode View Rendering

When `sidebarMode` is `'workspace'`, `LeftSidebar.vue` MUST render the workspace entrypoint (`workspace_NN.md`) or primary root model as the root node and display the submodel graph tree (`Workspace Root` -> `Submodels` (`type:: model` nodes) -> `Child Models`). It MUST display workspace-level summary metrics and submodel status indicators.

Furthermore, `visibleRootIds` in `LeftSidebar.vue` MUST exclude submodels that are referenced by domain elements via `type:: model` fields. Element-owned submodels MUST NOT be rendered as unattached top-level roots, preventing clutter and reflecting domain element ownership. Only unparented root models (such as the workspace entrypoint or standalone root models not owned by any element) SHALL be included in top-level `visibleRootIds`.

#### Scenario: Submodel tree rendering in Workspace Mode
- GIVEN `sidebarMode` is set to `'workspace'`
- AND the workspace contains `workspace_01.md` referencing submodels `auth_01.md` and `billing_01.md`
- WHEN `LeftSidebar.vue` renders
- THEN the sidebar presents a workspace hierarchy showing `workspace_01.md` as root with subnodes `auth_01.md` and `billing_01.md`

#### Scenario: Filtering element-owned submodels from top-level roots
- GIVEN a workspace containing root model `innovation_01.md`
- AND `innovation_01.md` contains element `initiative_01` with a `type:: model` field pointing to `business_01.md`
- WHEN `LeftSidebar.vue` computes `visibleRootIds`
- THEN `business_01.md` is excluded from top-level `visibleRootIds`
- AND `innovation_01.md` remains in `visibleRootIds`

#### Scenario: Workspace metrics display
- GIVEN a loaded workspace with multiple submodels
- WHEN `LeftSidebar.vue` renders in Workspace Mode
- THEN total model count, submodel completion status, and cross-model link counts are rendered in the workspace header panel

---

## ADDED Requirements

### Requirement: Hierarchical Submodel Nesting Under Owning Element in ConceptTreeNode

`ConceptTreeNode.vue` MUST support hierarchical nesting of submodels owned by domain elements:
1. When an element node possesses one or more fields of `type:: model` containing valid references to submodels in `modelStore.nodes`, `ConceptTreeNode.vue` MUST resolve those submodels as child items of the element node.
2. The nested submodel item MUST be rendered beneath the declaring element with a distinctive submodel visual treatment (e.g., submodel icon, model name, and template badge).
3. Clicking an element-nested submodel node MUST focus that submodel via `uiStore.focusModel(...)`, transitioning the editor view or breadcrumb ancestry accordingly.
4. Expanding and collapsing the element node MUST toggle visibility of its nested submodels along with any standard element children.
5. If an element references multiple submodels, each referenced submodel MUST appear as a distinct child node in the tree hierarchy.
6. If a submodel reference cannot be resolved in `modelStore.nodes` or the field value is empty, no phantom child submodel node SHALL be rendered.

#### Scenario: Element node renders referenced submodel as child item
- GIVEN an element `Ghostbusters` with a field `business_model` referencing `Ghostbusters_business_NN.md`
- WHEN `ConceptTreeNode.vue` renders the `Ghostbusters` element
- THEN `Ghostbusters` indicates that it has children
- AND expanding `Ghostbusters` displays `Ghostbusters_business_NN.md` nested beneath it

#### Scenario: Clicking nested submodel focuses model
- GIVEN an element `Ghostbusters` displaying nested child submodel `Ghostbusters_business_NN.md` in the tree
- WHEN the user clicks the nested submodel node
- THEN `uiStore.focusModel` is called with the submodel ID
- AND the editor focuses `Ghostbusters_business_NN.md` with appropriate breadcrumbs

#### Scenario: Collapsing parent element hides nested submodel
- GIVEN an expanded element node with a nested child submodel
- WHEN the user collapses the parent element node
- THEN the nested submodel node is hidden from view
