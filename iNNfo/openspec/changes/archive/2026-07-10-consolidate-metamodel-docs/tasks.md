# Tasks: Consolidate Metamodel Documentation

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

## Phase 1: Foundation
- [x] Migrate documentation into L2 spec files by copying content from legacy templates and formatting as H2 concepts with H3 sub-sections (Summary, Description, Methodologies, Prompts) in `specs/v0.1.0/level2/business/business_V_0-1-2_NN.md`, `specs/v0.1.0/level2/procedures/procedures_V_0-1-2_NN.md`, and `specs/v0.1.0/level2/catalog/catalog_V_0-1-3_NN.md`.
- [x] Bump Level-1 iNNfo spec to V_0-1-1 in `specs/v0.1.0/level1/iNNfo_V_0-1-1_NN.md`.
- [x] Sync latest Level-2 and Level-1 specifications under `specs/latest/level2/` and `specs/latest/level1/`.

## Phase 2: Core Implementation
- [x] Update `buildFormatFilename` in `apps/innfo-editor/src/utils/version.ts` to replace spaces with hyphens in the `baseName` parameter.
- [x] Implement concept documentation warning rules (R-MVW-01 and R-MVW-02) in `validateModel` at `packages/innfo-core/src/validator/model.ts` by checking if frontmatter concepts have H2 headings and H3 sections in the template `rawContent`.

## Phase 3: Integration
- [x] Implement `findLocalSpecInHandle` in `apps/innfo-editor/src/stores/modelStore.ts` to recursively scan the workspace's local `specs/` directory via the directory handle when resolving parents in `_resolveParentSpecs`.
- [x] Update `_resolveParentSpecs` in `apps/innfo-editor/src/stores/modelStore.ts` to assign spec `rawContent` to the synthetic root node `spec:${parentName}`.
- [x] Update `getConceptGuidance` in `apps/innfo-editor/src/stores/metamodelStore.ts` to parse the synthetic node's `rawContent` using `parseMetamodelDocumentation` into the reactive documentation store.
- [x] Add filename preview element and update tooltip title previews in `apps/innfo-editor/src/components/editor/ModelInfoPanel.vue` next to each bump button using `buildFormatFilename` (R-VM-04).

## Phase 4: Testing
- [x] Add unit tests in `packages/innfo-core/tests/` to verify `validateModel` concept and guidance documentation warnings.
- [x] Add unit tests in `apps/innfo-editor/tests/` to verify `buildFormatFilename` space-to-hyphen conversion.
- [x] Add unit/integration tests to verify local-first spec resolution using mocked directory handles.

## Phase 5: Cleanup
- [x] Delete legacy documentation files under `FORMAT/docs/documentation/templates/business/V_0-1-0/documentation.md` and `FORMAT/docs/documentation/templates/procedures/V_0-1-0/documentation.md`.
