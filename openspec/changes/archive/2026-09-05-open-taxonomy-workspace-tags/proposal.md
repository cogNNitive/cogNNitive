# Proposal: Open Taxonomy with Progressive Enhancement (Workspace Tags & Views)

## Intent
Introduce the **Open Taxonomy with Progressive Enhancement** pattern across cogNNitive. This enables models and elements to use freeform `tags::` ad-hoc without schema friction (matching the flexibility of GitHub issue/PR labels), while allowing workspaces (`workspace_NN.md`) to define a centralized catalog of `Tag` entities with visual attributes (`color`, `icon`) and semantic `description`. Furthermore, upgrade the visual modeler's search popup (`Header.vue`) into a tabbed interface (Concepts vs. Tags) allowing users to select, filter, and project views across single or multiple strategic tags.

## Scope

### In Scope
1. **Workspace Template Package & Manifest**:
   - Update `workspace_V_0-2-0_spec_NN.md` and `workspace_spec_NN.md` with Concept `Tag` and Fields (`color`, `icon`, `description`).
   - Update `docs/workspace_NN.md` to define foundational workspace tags (`architecture`, `specification`, `tooling`, `strategy`).
2. **Visual Modeler (innfo-editor) Header Search Upgrade**:
   - Redesign `Header.vue` floating search popup with a tabbed selector: **Conceptos** and **Etiquetas**.
   - In **Etiquetas** tab, render an interactive picklist with checkboxes, selection count `(X/Y)`, "Todas" and "Ninguna" actions.
   - Display tags using their workspace-defined `color`, `icon`, and tooltip `description`, with graceful neutral fallback for ad-hoc tags.
   - Connect the tag selection reactively to `SearchResultsView.vue` for multi-tag filtering.
3. **Documentation Site Updates**:
   - Add new guide `docs/innfo/documentation/tags-and-taxonomy.md` explaining freeform tags, workspace catalogs, and view projection.
   - Register the new page in `docs/innfo/documentation/documentation_NN.md` and `_sidebar.md`.
4. **Validation & Verification**:
   - Run automated tests in `innfo-core` and `innfo-editor`.

### Out of Scope
- Modifying the core parser `tags::` grammar (already implemented in `innfo-core`).
- Enforcing closed/mandatory tag validation (tags remain open by design).

## Risks & Mitigations
| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| Ad-hoc tags causing visual clutter or breaking layouts | Low | Unregistered tags render with standardized neutral gray badges without breaking schema validation. |
| Tag selection performance in large models | Low | Tag list is derived reactively with memoized sets in Vue Pinia stores. |
