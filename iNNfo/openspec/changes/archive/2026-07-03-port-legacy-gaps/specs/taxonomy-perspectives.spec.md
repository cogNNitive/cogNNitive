# Delta: Taxonomy Perspectives — Edges from Frontmatter, Concept Tree, Perspective Neighborhoods

## Purpose

Port taxonomy-perspective navigation from the predecessor apps. Taxonomy edges (`parent→child` concept relationships) are parsed from the root node's frontmatter `taxonomy` field. A concept tree is built from these edges, and `ConceptPerspectivePanel.vue` provides neighborhood navigation (show parents and children of a concept).

## Requirements

### R-TP-01: Taxonomy Edge Parsing from Frontmatter

The `metamodelStore.ts` MUST parse taxonomy edges from the root node's frontmatter. The frontmatter `taxonomy` field is an array of `{ parent, child }` objects:

```yaml
taxonomy:
  - parent: Industry
    child: AILab
  - parent: AILab
    child: Anthropic
  - parent: AILab
    child: OpenAI
```

Each edge MUST be normalized into a `PerspectiveEdge` record (`{ parent: string; child: string }`). The edges MUST be available via a computed property `taxonomyEdges` on `metamodelStore`.

If no `taxonomy` field exists in the frontmatter, `taxonomyEdges` MUST return an empty array (not crash).

#### Scenario: Taxonomy edges parsed from frontmatter

- GIVEN the root node's rawContent frontmatter includes the taxonomy above
- WHEN `metamodelStore.taxonomyEdges` is accessed
- THEN it returns 3 PerspectiveEdge records: `{parent:"Industry", child:"AILab"}`, `{parent:"AILab", child:"Anthropic"}`, `{parent:"AILab", child:"OpenAI"}`

### R-TP-02: Concept Tree Built from Taxonomy Edges

A computed property `conceptTree` on `metamodelStore` MUST build a hierarchical tree from `taxonomyEdges`. The tree MUST be a list of `TreeNode` objects where:

- Root concepts are those that appear as `parent` but never as `child`
- Children are nested under their parent
- A concept that appears as both parent and child is placed under its parent and contains its own children
- A concept that appears only as `child` (no children of its own) is a leaf node

The tree structure:

```typescript
interface ConceptTreeNode {
  name: string
  children: ConceptTreeNode[]
}
```

#### Scenario: Concept tree groups edges into hierarchy

- GIVEN taxonomy edges: (Industry→AILab), (AILab→Anthropic), (AILab→OpenAI)
- WHEN `metamodelStore.conceptTree` is accessed
- THEN the tree is `[{name: "Industry", children: [{name: "AILab", children: [{name: "Anthropic", children: []}, {name: "OpenAI", children: []}]}]}]`

### R-TP-03: ConceptPerspectivePanel with Neighborhoods

`ConceptPerspectivePanel.vue` MUST display a perspective navigation panel. When a concept name is selected (from the tree or from an element's type), the panel shows:

- **Perspective label**: the active concept name with its icon and color
- **Parents section**: list of parent concepts (concepts that have this concept as a `child` in taxonomyEdges), each shown as a clickable pill
- **Children section**: list of child concepts (concepts that have this concept as a `parent`), each shown as a clickable pill
- **Sibling count**: number of sibling concepts (concepts sharing the same parent)

Clicking a parent or child pill MUST switch the active perspective to that concept and update the tree selection.

The panel MUST use the existing `useConceptVisuals` composable to resolve icons and colors for each concept name.

#### Scenario: Perspective panel shows neighborhood for "AILab"

- GIVEN the taxonomy tree above and selected concept "AILab"
- WHEN the panel renders
- THEN it shows:
  - `Parents: [Industry]`
  - `Children: [Anthropic, OpenAI]`
  - `Siblings: 0`
- AND clicking "Industry" selects that concept and updates the tree

### R-TP-04: Perspective Neighborhood Data Structure

`metamodelStore` MUST expose a `getNeighborhood(conceptName: string)` function that returns a `PerspectiveNeighborhood`:

```typescript
interface PerspectiveNeighborhood {
  perspective: Perspective
  parents: string[]
  children: string[]
}
```

Where `Perspective` is defined as:

```typescript
interface Perspective {
  id: string
  name: string
  icon: string
  edges: PerspectiveEdge[]
}
```

The `id` for a perspective is `taxonomy-{conceptName}`. The `icon` is resolved from the concept's metamodel definition (or defaults to `"layers"`).

#### Scenario: getNeighborhood returns correct structure

- GIVEN the taxonomy tree above
- WHEN `metamodelStore.getNeighborhood("AILab")` is called
- THEN it returns `{ perspective: { id: "taxonomy-AILab", name: "AILab", icon: "cpu", edges: [...] }, parents: ["Industry"], children: ["Anthropic", "OpenAI"] }`

### R-TP-05: Active Perspective Integration with uiStore

When a perspective is selected in `ConceptPerspectivePanel`, it MUST update `uiStore.activePerspective` to the perspective's `id`. The `uiStore` already has `activePerspective` (currently defaulting to `'default'`). Selecting a taxonomy perspective sets it to `'taxonomy-{conceptName}'`.

Other components (e.g., graph viewer, tree) MAY react to the active perspective change by highlighting the relevant concept subtree.

#### Scenario: Selecting perspective updates uiStore

- GIVEN a concept "AILab" is selected in the perspective panel
- WHEN the selection happens
- THEN `uiStore.activePerspective` is set to `"taxonomy-AILab"`
- AND the active concept filter in the UI tree highlights AILab-related nodes

### R-TP-06: Scope Guard — No Cross-Boundary Wikilink or Relationship Editor

This slice MUST NOT introduce cross-boundary wikilink resolution, relationship editors, or AI/LLM functionality. The taxonomy perspective is purely a navigational overlay over existing concepts.

#### Scenario: No relationship editor

- GIVEN the taxonomy panel is visible
- WHEN the user interacts with the panel
- THEN there is no add/edit/delete control for taxonomy edges
- AND edges are entirely read-only (derived from frontmatter)
