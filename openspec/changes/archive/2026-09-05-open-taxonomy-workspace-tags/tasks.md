# Tasks: Open Taxonomy with Progressive Enhancement (Workspace Tags & Views)

## 1. Specification & Manifest
- [x] Update `iNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md` with Concept `Tag` and Fields (`color`, `icon`, `description`).
- [x] Update `iNNfo/specs/templates/workspace_spec_NN.md` with Concept `Tag` and Fields (`color`, `icon`, `description`).
- [x] Update `docs/workspace_NN.md` with `# NN Tag` definitions.

## 2. Documentation Site
- [x] Create `docs/innfo/documentation/tags-and-taxonomy.md`.
- [x] Update `docs/innfo/documentation/documentation_NN.md` to register the new guide.
- [x] Update `docs/innfo/documentation/_sidebar.md` to add navigation item.

## 3. Visual Modeler (innfo-editor) Header Search Upgrade
- [x] Update `uiStore.ts` with `searchFilterTab` (`'concepts' | 'tags'`), `selectAllTags()`, and `deselectAllTags()`.
- [x] Update `Header.vue` floating search popup with tabbed navigation (`Conceptos` vs `Etiquetas`).
- [x] Render styled tag items with checkboxes, workspace color/icon badges, and tooltips in `Header.vue`.
- [x] Verify reactive filtering behavior in `SearchResultsView.vue`.

## 4. Verification & Testing
- [x] Run test suite across `iNNfo` (`packages/innfo-core` and `packages/innfo-mcp`).
- [x] Run typecheck across `iNNfo`.
- [x] Verify docs generation and link integrity.
