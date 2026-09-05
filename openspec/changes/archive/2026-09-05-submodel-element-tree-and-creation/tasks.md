# Tasks: submodel-element-tree-and-creation

## Phase 1: Store & Component Types / Scaffolding (`modelStore.ts` & `WidgetField.vue`)
- [x] 1.1 **TDD: Add unit tests for `scaffoldSubmodel` in `apps/innfo-editor/tests/unit/modelStore.test.ts`**:
  - [x] Test scaffolding Level 3 starter markdown content with valid YAML frontmatter (`level: 3`, `parent_spec`, `model_version: "0.1.0"`, `title`).
  - [x] Test path normalization (convert backslashes to forward slashes for node `id` and `source.path`).
  - [x] Test registration in `modelStore.nodes` and insertion into `modelStore.rootIds`.
  - [x] Test dirty node tracking (`dirtyNodeIds.has(newModelId)` is true).
- [x] 1.2 **Update `fieldDefinition` type in `apps/innfo-editor/src/shared/widgets/WidgetField.vue`**:
  - [x] Add optional `target_template?: string` to `fieldDefinition` prop interface.
  - [x] Ensure `target_template` is preserved when forwarding `fieldDefinition` to resolved child widgets.
- [x] 1.3 **Implement `scaffoldSubmodel` action in `apps/innfo-editor/src/stores/modelStore.ts`**:
  - [x] Implement `scaffoldSubmodel(options: { path: string; template: string; title?: string; modelVersion?: string }): string`.
  - [x] Build starter Level 3 frontmatter string conforming to specification.
  - [x] Upsert new `ModelNode` into `nodes`, append `id` to `rootIds`, mark node dirty, and return new model `id`.
- [x] 1.4 **Phase 1 Verification**:
  - [x] Run `npm --prefix apps/innfo-editor run test tests/unit/modelStore.test.ts`.
  - [x] Run `npm --prefix apps/innfo-editor run typecheck`.

## Phase 2: `FieldModel.vue` Creation Button & Scaffolding UI
- [x] 2.1 **TDD: Add component tests for inline submodel creation in `apps/innfo-editor/tests/component/FieldModel.test.ts`**:
  - [x] Test that `[+ Create & bind new model]` (`data-testid="create-submodel-button"`) is rendered in edit mode (`!readonly`).
  - [x] Test that `target_template` badge is rendered inside the creation button when specified in `fieldDefinition`.
  - [x] Test that creation trigger is not displayed in `readonly` mode.
  - [x] Test click handler invoking `window.prompt` pre-filled with suggested path derived from parent model path and `target_template`.
  - [x] Test that confirming prompt invokes `modelStore.scaffoldSubmodel`, emits `update:modelValue` with new path, and calls `uiStore.focusModel`.
  - [x] Test that cancelling prompt aborts creation without emitting or focusing.
- [x] 2.2 **Expand props in `apps/innfo-editor/src/shared/widgets/FieldModel.vue`**:
  - [x] Declare `nodeId?: string`, `fieldKey?: string`, and `fieldDefinition?: FieldDefinitionLike` props in `defineProps`.
  - [x] Import `Plus` icon from `lucide-vue-next`.
- [x] 2.3 **Implement suggested path derivation and creation handler in `FieldModel.vue`**:
  - [x] Implement `deriveSuggestedPath(parentPath: string, template: string): string` to produce `<parent_stem>_<target_template>_NN.md`.
  - [x] Implement `handleCreateSubmodel` action handling path prompt, `modelStore.scaffoldSubmodel` call, `update:modelValue` emit, and `uiStore.focusModel` navigation.
- [x] 2.4 **Render creation button in `FieldModel.vue` template**:
  - [x] Add `[+ Create & bind new model]` action button below/alongside input in edit mode with `data-testid="create-submodel-button"`.
  - [x] Display `target_template` badge when present on `fieldDefinition`.
- [x] 2.5 **Phase 2 Verification**:
  - [x] Run `npm --prefix apps/innfo-editor run test tests/component/FieldModel.test.ts`.
  - [x] Run `npm --prefix apps/innfo-editor run typecheck`.

## Phase 3: `LeftSidebar.vue` & `ConceptTreeNode.vue` Submodel Filtering & Nesting
- [x] 3.1 **TDD: Add component tests for sidebar filtering and tree nesting**:
  - [x] Create `apps/innfo-editor/tests/component/LeftSidebar-submodel-tree.test.ts`:
    - [x] Test that `visibleRootIds` in Workspace Mode excludes submodels referenced by domain elements via `type:: model`.
    - [x] Test that standalone root models not owned by any element remain visible in `visibleRootIds`.
    - [x] Test that switching to Focused Model mode retains standard focused model display.
  - [x] Add tests in `apps/innfo-editor/tests/component/ConceptTreeNode.test.ts`:
    - [x] Test that an element node with a `type:: model` field renders nested child submodel node (`data-testid="nested-submodel-node"`).
    - [x] Test that nested submodel displays model name, `Boxes` icon, and `target_template` badge (`data-testid="nested-submodel-badge"`).
    - [x] Test that clicking nested submodel node invokes `uiStore.focusModel`.
    - [x] Test that collapsing parent element hides nested submodels.
    - [x] Test that empty or unresolved submodel references do not render phantom child nodes.
- [x] 3.2 **Implement `submodelParentMap` and filter `visibleRootIds` in `apps/innfo-editor/src/components/layout/LeftSidebar.vue`**:
  - [x] Compute `submodelParentMap`: scan element nodes for `type: model` fields, resolve matching target model nodes in `modelStore.nodes`, and map target ID/path to declaring element ID.
  - [x] In `visibleRootIds` computed property (Workspace Mode), filter out any root model whose ID or path is registered in `submodelParentMap`.
- [x] 3.3 **Implement element-owned submodel resolution and nesting in `apps/innfo-editor/src/components/layout/ConceptTreeNode.vue`**:
  - [x] Import `Boxes` from `lucide-vue-next`.
  - [x] Compute `elementSubmodels`: inspect element node fields for `type: model` references matching `modelStore.nodes`, extracting `submodelId`, `submodelName`, `targetTemplate`, and `path`.
  - [x] Update `hasChildren` computed property to include `elementSubmodels.length > 0`.
  - [x] Render nested submodel items beneath the element node with `data-testid="nested-submodel-node"`, `Boxes` icon, name, template badge, and `@click.stop="uiStore.focusModel(sub.submodelId)"`.
- [x] 3.4 **Phase 3 Verification**:
  - [x] Run `npm --prefix apps/innfo-editor run test tests/component/LeftSidebar-submodel-tree.test.ts`.
  - [x] Run `npm --prefix apps/innfo-editor run test tests/component/ConceptTreeNode.test.ts`.
  - [x] Run `npm --prefix apps/innfo-editor run typecheck`.

## Phase 4: Documentation in `docs/innfo/documentation/relationships.md`
- [x] 4.1 **Update relationship levels overview**:
  - [x] Update ASCII diagram and introductory text in `docs/innfo/documentation/relationships.md` to show 5 formal relationship levels, adding Level 5: Composición de Submodelos (`type:: model`).
- [x] 4.2 **Add "5. Composición de Submodelos (`type:: model`)" section**:
  - [x] Document characteristics, schema origin (`type:: model`, `target_template`), and field syntax (`campo:: [[ruta/al/submodelo_NN.md]]`).
  - [x] Document canonical Ghostbusters sample:
    - [x] Metamodel definition in `innovation_V_0-2-0_NN.md`.
    - [x] Instantiation in parent model `Ghostbusters_V_0-2-0_innovation_NN.md`.
    - [x] Scaffolded submodel `Ghostbusters_V_0-2-0_business_NN.md` with Level 3 frontmatter.
  - [x] Document visual treatment (📦 `Boxes` icon, pill badges) and sidebar hierarchy behavior (unattached root filtering, element nesting, breadcrumb navigation).
- [x] 4.3 **Phase 4 Verification**:
  - [x] Run `npm --prefix iNNfo run format:check` on `docs/innfo/documentation/relationships.md`.

## Phase 5: Verification & Quality Gates
- [x] 5.1 **Run linters and formatters**:
  - [x] Run `npm --prefix iNNfo run lint`.
  - [x] Run `npm --prefix iNNfo run format:check`.
- [x] 5.2 **Run workspace typecheck**:
  - [x] Run `npm --prefix iNNfo run typecheck`.
- [x] 5.3 **Run full test suite**:
  - [x] Run `npm --prefix iNNfo run test`.
- [x] 5.4 **Run spec verification scripts**:
  - [x] Run `npm --prefix iNNfo run check:specs`.
