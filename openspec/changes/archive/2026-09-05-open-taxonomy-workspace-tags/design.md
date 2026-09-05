# Design: Open Taxonomy with Progressive Enhancement (Workspace Tags & Views)

## Architecture Overview

The design decouples **Instance-level Tagging** from **Template-level Schemas** through a two-tier taxonomy model:

```
+-------------------------------------------------------------+
|                Workspace Root: workspace_NN.md              |
|                                                             |
|  ## NN Tag: architecture      ## NN Tag: strategy           |
|  color:: #3b82f6              color:: #f59e0b               |
|  icon:: layers                icon:: compass                |
|  description:: Core patterns  description:: Growth plan     |
+-------------------------------------------------------------+
                               |
                               | (Progressive Visual Enhancement)
                               v
+-------------------------------------------------------------+
|              Child Models (*_NN.md)                         |
|                                                             |
|  ## NN Oferta: B2B Enterprise                               |
|  tags:: strategy, enterprise-pilot                          |
|             ^                ^                              |
|      (Workspace Tag)   (Ad-hoc Tag)                         |
|      [Color/Icon/Desc] [Neutral Badge]                      |
+-------------------------------------------------------------+
```

## Key Components

### 1. Centralized Workspace Catalog (`workspace_NN.md`)
- Conforms to `workspace_V_0-2-0_spec_NN.md`.
- Acts as the SSOT for organization-wide or project-wide taxonomy conventions.
- Each `Tag` element provides metadata (`color`, `icon`, `description`) without forcing constraints on which tags are allowed in child models.

### 2. UI Store (`uiStore.ts`)
- Manages state:
  - `selectedTagFilters: ref<string[]>([])`
  - `searchFilterTab: ref<'concepts' | 'tags'>('concepts')`
  - Helper functions: `toggleTagFilter(tag: string)`, `selectAllTags(tags: string[])`, `clearTagFilters()`
  - Computeds for active filters.

### 3. Header Search Popup (`Header.vue`)
- Replaces inline `TagInput` in the search dropdown with a structured tabbed interface:
  - Tabs: `[Conceptos]` and `[Etiquetas]`.
  - When in `[Etiquetas]`:
    - Displays list of all unique tags in the active model and workspace.
    - Resolves visual properties (`icon`, `color`, `description`) against the workspace root.
    - Checkboxes allow multiple selections.
    - Clicking updates `selectedTagFilters`.

### 4. Search Results Projection (`SearchResultsView.vue`)
- Filters `modelStore.nodes` matching the active query, active concept filters, and active tag filters.
- Supports multi-tag filtering (intersection of selected tags).
- Collapsible block sheet views for inspecting matching nodes.
