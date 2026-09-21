# Concept Tree Navigation

## Purpose
Enforce pure hierarchical inline tree navigation for submodels, eliminating isolated root switching actions.

## Requirements

### Requirement: Pure Recursive Inline Submodel Exploration
`ConceptTreeNode.vue` MUST restrict submodel exploration exclusively to expandable/collapsible inline child branches.
- Submodel nodes MUST NOT render an `ArrowUpRight` or quick-open action button.
- Submodel nodes MUST NOT emit isolate-focus or model jump events.

#### Scenario: Rendering submodel node in concept tree
- GIVEN a concept node referencing an underlying submodel
- WHEN the node renders in the sidebar tree
- THEN it displays an expansion toggle chevron for inline exploration
- AND no `ArrowUpRight` or isolate action button is rendered

#### Scenario: Expanding submodel hierarchy
- GIVEN a collapsed submodel node in the sidebar tree
- WHEN the user clicks the node or expansion toggle
- THEN the node expands inline to display its child concepts and elements within the existing tree context
- AND the workspace root context remains unchanged
