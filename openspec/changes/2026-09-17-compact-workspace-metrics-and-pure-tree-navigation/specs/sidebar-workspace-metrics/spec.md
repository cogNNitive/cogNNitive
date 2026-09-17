# Sidebar Workspace Metrics

## Purpose
Provide a compact, non-intrusive model status indicator directly in the workspace sidebar header, replacing bulky banner panels.

## Requirements

### Requirement: Compact Status Pill in Workspace Header
`LeftSidebar.vue` MUST render active and draft model count badges directly within the "WORKSPACE" header section when a workspace is active.
- Active models MUST be indicated with a green counter badge.
- Draft models MUST be indicated with an amber counter badge.
- The sidebar MUST NOT render a standalone "Workspace Mode" card panel above the tree.

#### Scenario: Rendering workspace metrics in sidebar header
- GIVEN an active workspace with 3 active models and 1 draft model
- WHEN `LeftSidebar.vue` renders the workspace navigation section
- THEN the header displays "WORKSPACE" alongside active count `3` and draft count `1` badges
- AND no standalone "Workspace Mode" card panel is rendered

### Requirement: Workspace Metrics Hover Tooltip
The workspace metrics indicator MUST display a detailed breakdown tooltip on hover.
- The tooltip MUST show the total count of models, active model count, and draft model count.

#### Scenario: Hovering on workspace metrics
- GIVEN the workspace metrics badge in the sidebar header
- WHEN the user hovers over the metrics badge
- THEN a tooltip displays the breakdown of Total, Active, and Draft model counts
