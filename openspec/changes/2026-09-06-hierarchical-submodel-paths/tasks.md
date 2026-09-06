# Tasks: Hierarchical Submodel Paths

Change: `2026-09-06-hierarchical-submodel-paths`
Status: Completed
Scope: `innfo-editor` (`src/utils/submodelPath.ts`, `FieldModel.vue`, tests) & OpenSpec `model-primitive-type`

---

## Batch 1: Path Derivation Logic & Unit Tests (TDD)

- [x] 1.1 **Create test-first unit tests for path derivation & slugification**:
  - Add test suite in `iNNfo/apps/innfo-editor/tests/unit/submodelPath.test.ts`.
  - Test `slugify`:
    - Normalization of Unicode diacritics / accents (`"Iniciativas Estratégicas"` → `"iniciativas-estrategicas"`, `"José Luis Olmo Mora"` → `"jose-luis-olmo-mora"`).
    - Lowercasing and whitespace / underscore replacement (`"  __initiative_01__  "` → `"initiative-01"`).
    - Special characters and symbols (`"Área de I+D & Innovación"` → `"area-de-id-innovacion"`).
    - Boundary trimming and collapsing consecutive hyphens.
    - Graceful handling of empty string, `null`, or `undefined`.
  - Test `deriveSuggestedSubmodelPath`:
    - Hierarchical path construction with parent stem, concept, element, and target template (`models/Company_V_0-1-0_NN.md`, concept `"Projects"`, element `"Alpha"`, target template `"business"` → `models/Company_V_0-1-0/projects/alpha/business_01.md`).
    - Sibling elements non-collision (`"Beta"` under `"Projects"` → `models/Company_V_0-1-0/projects/beta/business_01.md`).
    - Parent stem resolution with versioned template suffix (`models/Ghostbusters_V_0-2-0_innovation_NN.md` → `models/Ghostbusters_V_0-2-0/...`).
    - Parent stem resolution with simple `_NN.md` suffix (`models/Company_NN.md` → `models/Company/...`).
    - Leaf stem fallback precedence: `targetTemplate` (if not `"base"`) → `fieldName` → `"submodel"`, suffixed with sequential `_01.md`.
    - Partial hierarchy when only `elementSlug` is present (`models/{parent_stem}/{element_slug}/{leafStem}_01.md`).
    - Fallback path when concept and element context are missing (`models/System_NN.md`, template `"architecture"` → `models/System_architecture_01.md`).
    - Parent paths with and without directory prefixes.
  - **Files affected**:
    - `iNNfo/apps/innfo-editor/tests/unit/submodelPath.test.ts`
  - **Test command**:
    ```bash
    pnpm --filter @cognnitive/innfo-editor test tests/unit/submodelPath.test.ts
    ```

- [x] 1.2 **Implement `submodelPath.ts` utility**:
  - Create `iNNfo/apps/innfo-editor/src/utils/submodelPath.ts`.
  - Define and export `SuggestedSubmodelPathOptions` interface (`parentPath`, `conceptSlug`, `elementSlug`, `fieldName`, `targetTemplate`).
  - Implement and export `slugify(text: string): string`:
    - NFD normalization + diacritic stripping via `/[\u0300-\u036f]/g`.
    - Lowercase conversion and replacement of whitespace/underscores with hyphens.
    - Sanitization of non-alphanumeric characters except hyphens (`/[^a-z0-9-]/g`).
    - Collapse redundant hyphens (`/-+/g`) and trim boundaries (`/^-+|-+$/g`).
  - Implement and export `deriveSuggestedSubmodelPath(options: SuggestedSubmodelPathOptions): string`:
    - Extract directory prefix and base filename.
    - Extract `parentStem`, stripping versioned template pattern `/^(.*_V[_-][0-9.-]+)_[a-zA-Z0-9-]+(_NN)?$/i` or suffix `/_NN$/i`.
    - Resolve `leafStem` from `targetTemplate` (when !== `'base'`), `fieldName`, or fallback `'submodel'`.
    - Construct hierarchical path `${dir}${parentStem}/${cSlug}/${eSlug}/${leafStem}_01.md` when both slugs exist.
    - Fall back to `${dir}${parentStem}/${eSlug}/${leafStem}_01.md` or `${dir}${parentStem}_${leafStem}_01.md` when concept/element ancestry is missing.
  - **Files affected**:
    - `iNNfo/apps/innfo-editor/src/utils/submodelPath.ts`
  - **Test command**:
    ```bash
    pnpm --filter @cognnitive/innfo-editor test tests/unit/submodelPath.test.ts
    ```

- [x] 1.3 **Run Batch 1 unit verification & type checking**:
  - Run the unit test suite to verify full coverage and correctness of path derivation logic.
  - Verify TypeScript type safety in `innfo-editor`.
  - **Test commands**:
    ```bash
    pnpm --filter @cognnitive/innfo-editor test tests/unit/submodelPath.test.ts
    pnpm --filter @cognnitive/innfo-editor run typecheck
    ```

---

## Batch 2: FieldModel.vue Integration & Component Tests

- [x] 2.1 **Update & add component tests in `FieldModel.test.ts` (TDD)**:
  - Update `iNNfo/apps/innfo-editor/tests/component/FieldModel.test.ts`:
    - Update existing prompt assertion to verify hierarchical suggested path when element and concept context are available (`models/Ghostbusters_V_0-2-0/initiatives/municipal-franchise-expansion/business_01.md`).
    - Add test for sibling element submodel creation verifying distinct non-colliding default paths (`models/Ghostbusters_V_0-2-0/initiatives/alpha/business_01.md` vs. `models/Ghostbusters_V_0-2-0/initiatives/beta/business_01.md`).
    - Add test for fallback flat path when field is rendered without element/concept node ancestry.
    - Verify prompt confirmation triggers `modelStore.scaffoldSubmodel`, emits `update:modelValue` with the chosen path, and invokes `uiStore.focusModel`.
    - Verify prompt cancellation aborts creation cleanly without side effects.
  - **Files affected**:
    - `iNNfo/apps/innfo-editor/tests/component/FieldModel.test.ts`
  - **Test command**:
    ```bash
    pnpm --filter @cognnitive/innfo-editor test tests/component/FieldModel.test.ts
    ```

- [x] 2.2 **Integrate hierarchical path derivation into `FieldModel.vue`**:
  - Update `iNNfo/apps/innfo-editor/src/shared/widgets/FieldModel.vue`:
    - Import `deriveSuggestedSubmodelPath`, `slugify` from `../../utils/submodelPath`.
    - Update `handleCreateSubmodel` to extract:
      - `elementNode`: `props.nodeId ? modelStore.getNode(props.nodeId) : undefined`.
      - `elementSlug`: `elementNode?.slug || (elementNode?.name ? slugify(elementNode.name) : undefined)`.
      - `conceptName`: resolve from `elementNode?.conceptBinding?.name`, `elementNode?.type`, or parent concept node via `elementNode?.parentId`.
      - `conceptSlug`: `conceptName ? slugify(conceptName) : undefined`.
      - `parentRootId`: `props.nodeId ? modelStore.getModelRootForNode(props.nodeId) : undefined`.
      - `parentPath`: `parentRootNode?.source?.path || 'models/model_NN.md'`.
    - Invoke `deriveSuggestedSubmodelPath({ parentPath, conceptSlug, elementSlug, fieldName: props.fieldKey, targetTemplate })`.
    - Display the hierarchical path in the prompt dialog.
    - Remove old flat `deriveSuggestedPath` helper function.
  - **Files affected**:
    - `iNNfo/apps/innfo-editor/src/shared/widgets/FieldModel.vue`
  - **Test command**:
    ```bash
    pnpm --filter @cognnitive/innfo-editor test tests/component/FieldModel.test.ts
    ```

- [x] 2.3 **Run Batch 2 component verification & type checking**:
  - Verify all component tests in `FieldModel.test.ts` pass cleanly.
  - Verify TypeScript compilation without errors.
  - **Test commands**:
    ```bash
    pnpm --filter @cognnitive/innfo-editor test tests/component/FieldModel.test.ts
    pnpm --filter @cognnitive/innfo-editor run typecheck
    ```

---

## Batch 3: Verification & Regression Checks

- [x] 3.1 **Run full `innfo-editor` test suite**:
  - Execute Vitest across all unit, component, and integration tests in `innfo-editor`.
  - Ensure zero regressions in existing editor workflows.
  - **Test command**:
    ```bash
    pnpm --filter @cognnitive/innfo-editor test
    ```

- [x] 3.2 **Run workspace type check & production build**:
  - Execute typecheck and Vite build to confirm clean packaging and tree-shaking.
  - **Test commands**:
    ```bash
    pnpm --filter @cognnitive/innfo-editor run typecheck
    pnpm --filter @cognnitive/innfo-editor run build
    ```

- [x] 3.3 **Run OpenSpec verification & repository integrity checks**:
  - Verify change specification conformity and parity guard consistency.
  - **Test commands**:
    ```bash
    node scripts/verify.js
    ```
