# Delta for tree-navigation

## MODIFIED Requirements

### R-TN-04: Ghost State for Empty Nodes and Concept Groups

A leaf node with no description, no non-empty fields, and no child instances (instance count === 0) MUST render in a "ghost" visual state: lowered opacity (`opacity: 0.45`), italicized name, and a muted "Empty" label appended to the row. Ghost leaf nodes MUST still be interactive (clickable, collapsible).

A concept group node whose template concept has zero instances in the model MUST render as a ghost group with `opacity: 0.55`, a dashed left border (`2px dashed` in concept color), italicized name, and an "Add first element" indicator.
(Previously: only covered leaf-node ghost state for individual empty nodes)

#### Scenario: Empty leaf node renders ghost (unchanged)

- GIVEN a leaf node with no description, empty fields, and `instanceCount: 0`
- WHEN the tree renders
- THEN the node row has `opacity: 0.45` and an italic "Empty" label suffix
- AND clicking still selects the node

#### Scenario: Ghost concept group renders in sidebar

- GIVEN a template concept `Milestone` with zero instances in the model
- AND the filter mode is `All` or `Template only`
- WHEN the sidebar renders the concept group
- THEN the group header has `opacity: 0.55`, a `2px dashed` left border in the concept color, italicized name, and an "Add first element" indicator

## ADDED Requirements

### R-TN-08: Filter Toggle Control in Sidebar

The `LeftSidebar.vue` tree section MUST include a filter toggle control above the model tree that cycles through three view modes: `Model only`, `Template only`, and `All`. The current mode MUST be stored in `uiStore.ghostFilterMode`. Changing the mode MUST re-render the tree to show the corresponding subset of concepts.

#### Scenario: Filter toggle cycles through view modes

- GIVEN the sidebar filter toggle is set to `Model only`
- WHEN the user clicks the toggle
- THEN the mode changes to `Template only` — only ghost concepts visible
- AND a second click changes to `All` — both present and ghost concepts visible
- AND a third click returns to `Model only` — only present concepts visible
