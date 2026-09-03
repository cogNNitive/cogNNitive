# Delta: Tree Navigation — Colored Pills, Counters, Popups, Ghost States, Virtual Grouping

## Purpose

Port legacy tree-navigation richness from the predecessor SPAs (file-format, folder-format) into the format-editor's `ConceptTreeNode`, `LeftSidebar`, and `VirtualGroupNode`. Adds colored PILL markers with YIQ-optimized text, instance counters, info popups/hover-cards, ghost states for empty nodes, and improved virtual grouping.

## Requirements

### R-TN-01: Colored Pills on Tree Nodes

Each tree node in `ConceptTreeNode.vue` MUST display a colored pill (small rounded badge) at the beginning of its row. The pill color MUST be derived from the node's resolved concept color (via `useConceptVisuals.resolveColor`). The pill MUST show:

- A small icon from the concept definition (or a fallback diamond for element nodes)
- The text label

The pill background MUST be the concept color at low opacity (`colorHex + '18'`), and the text MUST use YIQ-contrast logic: if the color's perceived luminance is above 0.55, text is dark (`#1e293b`); otherwise white (`#ffffff`).

#### Scenario: Node displays colored pill with YIQ-optimized text

- GIVEN a node whose resolved concept color is `purple` (`#a855f7`)
- WHEN the node renders in the tree
- THEN the pill background shows `#a855f718`
- AND the text color is `#ffffff` (luminance < 0.55)

### R-TN-02: Instance Counters on Concept Groups

A `VirtualGroupNode` header or a concept-type `ConceptTreeNode` MUST display an instance counter badge: a small rounded-pill number showing how many child elements the group contains. The counter MUST use the concept color as text with a matching low-opacity background.

#### Scenario: Concept group shows instance count

- GIVEN a concept group with 5 child elements
- WHEN the group header renders
- THEN a counter pill shows `5`
- AND the pill uses the concept color with `18`-alpha background

### R-TN-03: Info Popups on Hover/Click

A tree node that has a `blockId` (backed by a real model node) MUST show an info popup when the user clicks an `(i)` info icon that appears on hover. The popup MUST teleport to `<body>` and contain:

- Node name (as a clickable navigation link)
- Fields rendered as labeled chips (key-value pairs taken from visible fields with non-empty values)
- Description text (or "No content." placeholder)
- Marker cycling toolbar (when `showMarkers` is true)
- A close button (`X`) in the top-right corner

The popup MUST position itself below the trigger element, matching its left edge. A fade transition (`0.12s`) MUST animate appearance/disappearance.

#### Scenario: Info popup shows fields and markers

- GIVEN a node with 2 visible fields (`status: "active"`, `priority: "high"`) and 1 active marker (`completion: 3`)
- WHEN the user clicks the info icon on the tree node
- THEN the popup contains chips labeled `STATUS: active` and `PRIORITY: high`
- AND the `completion` marker icon renders with score-3 styling
- AND the popup closes when `X` is clicked

### R-TN-04: Ghost State for Empty Nodes

A node with no description, no non-empty fields, and no child instances (instance count === 0) MUST render in a "ghost" visual state: lowered opacity (`opacity: 0.45`), italicized name, and a muted "Empty" label appended to the row. Ghost nodes MUST still be interactive (clickable, collapsible).

#### Scenario: Empty node renders ghost

- GIVEN a node with no description, empty fields, and `instanceCount: 0`
- WHEN the tree renders
- THEN the node row has `opacity: 0.45` and an italic "Empty" label suffix
- AND clicking still selects the node

### R-TN-05: Improved VirtualGroupNode Styling

`VirtualGroupNode.vue` MUST render its header with:

- A colored left border (`borderLeft: '3px solid'` the concept color)
- A light background tint (`getHexColorLight(color)`)
- An expand/collapse chevron
- The concept icon from `IconRenderer`
- An uppercase, bold, tracking-wider concept name in the concept color
- The instance counter badge (R-TN-02)
- Recursive child rendering via `ConceptTreeNode`

The header MUST be clickable to toggle collapse. Collapse state MUST respond to the `expandedGeneration` prop (collapse when gen < 0, expand when gen >= 0).

#### Scenario: VirtualGroupNode header renders correctly

- GIVEN a VirtualGroupNode for concept `AILab` with color `indigo` and 3 children
- WHEN the node is expanded
- THEN the header shows a `>` chevron (pointing down), the `folder` icon in indigo, the text "AILAB" in indigo uppercase, and a counter `3` in indigo on tinted background
- AND clicking the header collapses the group

### R-TN-06: LeftSidebar Instance Counter Area

The `LeftSidebar.vue` model tree section MUST preserve its existing expand/collapse-all controls and the `groupByConcept` prop on `ConceptTreeNode`. The sidebar MUST pass through `selectedId` from `uiStore.selectedNodeId` and emit `select-node` events for downstream navigation.

### R-TN-07: Scope Guard — No Write-Path Changes

This slice MUST NOT introduce changes to the serializer, IndexedDB for tree state, or any model-mutation logic. Tree state (expansion, grouping) remains in-memory only.

#### Scenario: Tree expansion resets on page reload

- GIVEN nodes are collapsed/expanded interactively
- WHEN the page reloads
- THEN all nodes return to their default expanded state
- AND no IndexedDB write occurs for tree state
