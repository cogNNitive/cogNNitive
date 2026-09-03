# Template Derived Taxonomy

## Purpose

Eliminate mandatory `# NN index` taxonomy blocks in Level 3 models by automatically deriving concept display hierarchy and parent-child edges from the referenced Level 2 template specification (`parent_spec`).

## Requirements

### Requirement: Index-Free Level 3 Models

Level 3 model files MUST NOT be required to contain a `# NN index` section. When `# NN index` is omitted in a Level 3 model, parser execution MUST NOT fail or report missing-index errors.

#### Scenario: Level 3 model without index section parses successfully
- GIVEN a Level 3 model file `user_service_01.md` containing `parent_spec:: user_service_spec_01.md` and no `# NN index` block
- WHEN `normalizeSingleModel()` parses the document
- THEN parsing completes with zero errors regarding missing index blocks

---

### Requirement: Inherited Hierarchy Resolution

When a model's parsed taxonomy (`parsed.taxonomy`) is empty or absent, `normalizeElementsIntoGraph()` and `resolveEffectiveMetamodel()` MUST derive concept ordering and parent-child hierarchy directly from the taxonomy defined in the Level 2 template file declared in `parent_spec`.

#### Scenario: Hierarchy resolution from Level 2 template
- GIVEN a Level 2 template `spec_01.md` defining taxonomy edges `Component -> Subcomponent -> Task`
- AND a Level 3 model `model_01.md` conforming to `spec_01.md` without an index block
- WHEN `normalizeElementsIntoGraph()` constructs the model element graph
- THEN `model_01.md` elements are ordered and nested according to `Component -> Subcomponent -> Task` derived from `spec_01.md`

#### Scenario: Local index override takes precedence when present
- GIVEN a Level 3 model `model_02.md` that explicitly includes a `# 99 index` block defining custom taxonomy edges
- WHEN `normalizeElementsIntoGraph()` constructs the model graph
- THEN the explicit local index taxonomy is applied instead of the template default

---

### Requirement: Validator Hierarchy Check Compatibility

`validateTaxonomyHierarchy()` in `innfo-core` (`src/validator/hierarchy.ts`) MUST evaluate Level 3 models without `# NN index` blocks cleanly against their parent template taxonomy without emitting missing-taxonomy or dangling-node warnings.

#### Scenario: Validating an index-free Level 3 model against parent template
- GIVEN a Level 3 model referencing parent template `architecture_spec_01.md` and containing no `# NN index` section
- WHEN `validateTaxonomyHierarchy()` is executed
- THEN elements matching concepts in `architecture_spec_01.md` pass validation without hierarchy errors

---

### Requirement: Sidebar Taxonomy Rendering

`LeftSidebar.vue` in `innfo-editor` MUST render concept tree groups and element display ordering for index-free Level 3 models by resolving taxonomy edges from the model's parent spec via `getConceptsForModel()`.

#### Scenario: Displaying concept tree in LeftSidebar for index-free model
- GIVEN an index-free Level 3 model active in `innfo-editor`
- WHEN `LeftSidebar.vue` renders the sidebar concept tree
- THEN concept headers and elements are structured according to the parent template taxonomy edges
