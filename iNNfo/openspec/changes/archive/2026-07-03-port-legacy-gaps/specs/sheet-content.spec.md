# Delta: Sheet Content — Full Markdown, Graph, Relationships, Matrix Summary, Media, Field Viewer, Detail Tabs, Attachments

## Purpose

Overhaul `BlockSheet.vue` and `BlockFeed.vue` to match the richness of predecessor apps: full Markdown rendering (via `marked`), an inline GraphViewer for the active node, BlockRelationships component, BlockMatrixSummary chips, NodeMedia with lightbox, a FieldViewer backed by real widgets, four detail tabs (View, Visual, History, Compliance), and file attachments.

## Requirements

### R-SC-01: Full Markdown Rendering

The read-mode body of `BlockSheet.vue` MUST render the node's raw content using the `marked` library instead of the current `renderInlineMarkdown` utility. The rendered HTML MUST be sanitized (strip scripts, event handlers) before insertion via `v-html`. Code blocks MUST render with a monospace font and a subtle background. Images MUST be limited to `max-width: 100%` and `max-height: 480px`. Tables MUST be scrollable horizontally on overflow.

#### Scenario: Markdown renders headings, lists, code blocks

- GIVEN a node's description contains `# Heading`, `- list item`, and ``` `code` ```
- WHEN the sheet renders in read mode
- THEN `<h1>Heading</h1>`, `<ul><li>list item</li></ul>`, and `<code>code</code>` appear in the rendered output
- AND no raw markdown syntax is visible

### R-SC-02: Inline GraphViewer in Sheet

`BlockSheet.vue` MUST support an inline mode for `GraphViewer` within the body area. When a node has relationships and the graph tab is active (see R-SC-06), the sheet MUST render a compact `GraphViewer` instance (height: `320px`) focused on `localNodeId` = the current block's node ID. The inline GraphViewer MUST use the existing d3-based component but constrain its height and remove the full-page layout chrome (no layout selector — it uses the last-selected layout from the full GraphViewer view).

#### Scenario: Inline GraphViewer shows relationships for the active node

- GIVEN the active node has 3 relationships to other nodes
- WHEN the user switches to the "Visual" tab on the sheet
- THEN a compact GraphViewer renders at 320px height
- AND the graph is centered on the active node's relationships only

### R-SC-03: BlockRelationships Component

A new `BlockRelationships.vue` component MUST display all relationships for a node as labeled pills with navigable targets. Each relationship row shows:

- Relationship label (e.g., "depends_on")
- Target node name (as a clickable link that triggers `navigate-to-node`)
- Relationship value (if present)

The component MUST accept a `relationships` array and an `onNavigate` callback. Empty state shows "No relationships defined." in italic.

#### Scenario: BlockRelationships renders rows with clickable targets

- GIVEN a node has relationships `[{targetId: "Task/Review", label: "depends_on", value: "high"}]`
- WHEN BlockRelationships renders
- THEN a row shows "depends_on: Task/Review [high]"
- AND clicking "Task/Review" navigates to that node

### R-SC-04: BlockMatrixSummary Chips

A new `BlockMatrixSummary.vue` component MUST display matrix participation for a node as compact chips. For each matrix definition on the root node, if the node appears as either a row (`source`) or column (`target`) concept instance, a chip renders:

- Matrix name (shortened)
- The node's position: either "row" or "col"
- A count of related cells that have non-dash values

Chips MUST use the matrix's source or target concept color as the accent.

#### Scenario: BlockMatrixSummary shows chips

- GIVEN root node defines matrix "M1" from ConceptA→ConceptB
- AND the current node is an instance of ConceptA with 4 non-empty cells in M1
- WHEN BlockMatrixSummary renders
- THEN a chip shows "M1 · row (4)" with ConceptA color accent

### R-SC-05: NodeMedia with Lightbox

A new `NodeMedia.vue` component MUST display assets (images, files) attached to a node. Assets are resolved from the node's `assetMode` and `assets[]` array. Images MUST render as a gallery grid (2–3 columns) with click-to-expand lightbox. The lightbox overlay MUST show the full-resolution image with a dark backdrop and a close button. Non-image files MUST render as a download link list with file-type icons.

#### Scenario: NodeMedia shows image gallery with lightbox

- GIVEN a node has `assets: ["photo.jpg", "diagram.png"]`
- WHEN the sheet renders the media section
- THEN two thumbnail images appear in a grid
- AND clicking "photo.jpg" opens a full-screen lightbox overlay
- AND clicking the backdrop or close button dismisses the lightbox

### R-SC-06: FieldViewer with Widget-Based Field Rendering

A new `FieldViewer.vue` component MUST render node fields using the widget registry. It accepts a list of field definitions (from the resolved metamodel concept) and the node's `fields` record. Each field renders via `WidgetField.vue` (which resolves the correct widget component from the registry). The FieldViewer MUST support two modes:

- **Read mode**: renders fields as non-interactive display widgets (text, badges, etc.)
- **Edit mode**: renders fields with interactive widgets (inputs, selects, toggles) bound via `v-model` and committed with provenance

#### Scenario: FieldViewer renders widgets in read mode

- GIVEN a node has field `status: "active"` with field type `select`
- WHEN the FieldViewer renders in read mode
- THEN a `FieldSelect` widget renders showing "active" as a read-only badge
- AND the field label is shown as `STATUS` (uppercase tracking)

### R-SC-07: Four Detail Tabs (View, Visual, History, Compliance)

`BlockSheet.vue` MUST add a tab bar below the header with four tabs:

1. **View** (default): renders the full Markdown body, relationships, matrix summary, media, field viewer, and attachments — the main content area
2. **Visual**: renders the inline GraphViewer (R-SC-02)
3. **History**: renders a provenance/change log section showing `last_saved` timestamp from the node's raw frontmatter, node name, and file path
4. **Compliance**: renders a new `ComplianceTab.vue` showing validation results from the existing `ValidationReport.vue` component, scoped to this node's concept type

Tabs MUST have underline-style active indicator. Tab content MUST be lazy: only the active tab's content renders.

#### Scenario: Tabs switch content without re-mounting the header

- GIVEN a sheet with 4 tabs, currently on "View"
- WHEN the user clicks "Visual"
- THEN the inline GraphViewer renders
- AND the header (name, markers, controls) stays unchanged
- AND "Visual" tab gets the active underline

### R-SC-08: File Attachments Section

A file attachments section MUST render at the bottom of the View tab. It lists all asset files from the node's `assets[]` array with:

- File name (truncated if > 40 chars)
- File type icon (image/file/video/audio based on extension)
- Download/open link

When a node has `assetMode: 'centralized'`, asset paths are relative to the workspace root's `assets/` directory. When `assetMode: 'per-element'`, paths are relative to the node's own directory. If no assets exist, a muted "No attachments." placeholder renders.

#### Scenario: Attachments section lists files

- GIVEN a node with `assets: ["report.pdf", "screenshot.png"]` and `assetMode: 'centralized'`
- WHEN the View tab renders
- THEN two attachment links appear: a file icon with `report.pdf` and an image thumbnail with `screenshot.png`
- AND clicking `report.pdf` opens it in a new tab

### R-SC-09: BlockFeed Adapts to Revised BlockSheet

`BlockFeed.vue` MUST pass the new props through to `BlockSheet` and wire the `navigate-to-node` event. The concept sheet at the top MUST be rendered with `disableExpand` set to `false` (collapsible). The instance sheets below MUST respect `selectedItemName` for auto-expansion.

### R-SC-10: Scope Guard — No Relationship Editor or Cross-Boundary Wikilinks

This slice MUST NOT introduce a relationship editor UI, cross-boundary wikilink rendering, or any AI/LLM functionality. The relationships section is display-only.

#### Scenario: No relationship editor UI

- GIVEN a node with relationships
- WHEN the sheet renders the relationships section
- THEN there is no add/edit/delete control for relationships
- AND relationships display as read-only labeled links
