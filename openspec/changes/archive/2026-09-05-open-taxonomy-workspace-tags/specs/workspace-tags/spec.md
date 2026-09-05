# Specification: Open Taxonomy & Workspace Tags

## 1. Workspace Level 2 Template Specification Delta

Housed at `iNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md` and `workspace_spec_NN.md`:

### 1.1 Concept Definition: `Tag`
```markdown
## NN Concept Definition: Tag
icon:: tag
type:: category
color:: indigo
weight:: 50
```

### 1.2 Field Definitions for `Tag`
1. **color**:
   - `concept:: Tag`
   - `type:: string`
   - `description:: Hex color code (e.g. #10b981) or CSS token for tag badges and highlights.`
2. **icon**:
   - `concept:: Tag`
   - `type:: string`
   - `description:: Icon identifier (e.g. Lucide icon name) displayed with the tag badge.`
3. **description**:
   - `concept:: Tag`
   - `type:: string`
   - `description:: Semantic description, strategic intent, or scope of the tag.`

---

## 2. Open Taxonomy Contract

### 2.1 Ad-hoc Tags in Child Models
- Models at Level 3 can define `tags::` on any Concept or Element without requiring upfront schema registration.
- Syntax accepted:
  ```markdown
  ## NN Element: Feature X
  tags:: tag1, tag2, tag3
  # or
  tags:: [tag1, tag2, tag3]
  ```
- Normalized representation: trimmed lowercase array (`string[]`).

### 2.2 Progressive Enhancement Resolution
When an application (such as `innfo-editor` or an export procedure) encounters a tag string:
1. Lookup tag in the active workspace's `workspace_NN.md` under `# NN Tag` definitions.
2. If found:
   - Apply defined `color` to the badge container/border.
   - Render the `icon` alongside the tag label.
   - Render the `description` inside tooltip or popover preview.
3. If not found (ad-hoc / unregistered tag):
   - Fallback to neutral monochrome styling (slate/gray badge).
   - Render default tag icon.
   - Omit extended description.
   - Validation status remains completely valid (no warnings or errors).

---

## 3. Visual Modeler Search & Filter Contract

### 3.1 Tabbed Search Popup in `Header.vue`
- Two navigation tabs:
  - `Conceptos`: metalevel concept filter (as currently implemented).
  - `Etiquetas`: tag filter view.
- Header controls in `Etiquetas` tab:
  - Selection counter: `Etiquetas (selectedCount/totalCount)`.
  - Batch actions: `Todas` (select all tags in context) and `Ninguna` (clear tag selection).
- Item list in `Etiquetas` tab:
  - Checkbox reflecting selection state in `uiStore.selectedTagFilters`.
  - Workspace-styled badge with icon and color if defined in workspace; neutral badge otherwise.
  - Tooltip showing tag description.
  - Interactive row toggle: clicking anywhere on the item toggles the checkbox and filter.
