# Tasks: Template Concept Hierarchy via `parent::` Field

- [x] **1. Type Definitions & Core Model**
  - [x] 1.1 Add `parent?: string` to `Concept` interface in `packages/innfo-core/src/types.ts`.
- [x] **2. Template Schema Extraction**
  - [x] 2.1 Update `extractTemplateSchema` in `packages/innfo-core/src/schema.ts` to parse `parent::` field from `Concept Definition` (stripping WikiLinks if present).
  - [x] 2.2 Derive `taxonomy: TaxonomyEdge[]` from concepts when `parent` declarations are present, defaulting unparented concepts to root (`parent: ''`).
  - [x] 2.3 Preserve fallback to `parsed.taxonomy` from `# NN index` when no `parent::` fields exist.
- [x] **3. Validator Updates**
  - [x] 3.1 Update `packages/innfo-core/src/validator/content.ts` to emit error when a Level 2 template references a non-existent parent concept (`template-parent-not-found`).
  - [x] 3.2 Update `packages/innfo-core/src/validator/content.ts` to emit error when circular parent references exist in a Level 2 template (`template-parent-cycle`).
  - [x] 3.3 Update `packages/innfo-core/src/validator/content.ts` to emit warning when a Level 3 model contains an `# NN index` block (`l3-index-ignored`).
  - [x] 3.4 Update `packages/innfo-core/src/validator/hierarchy.ts` to prioritize `templateTaxonomy` over Level 3 model taxonomy.
- [x] **4. Automated Tests**
  - [x] 4.1 Write comprehensive test suite `packages/innfo-core/tests/template-concept-hierarchy.test.ts` covering extraction, fallback, validation errors, and Level 3 index warning.
  - [x] 4.2 Run test suite to verify 100% pass.
