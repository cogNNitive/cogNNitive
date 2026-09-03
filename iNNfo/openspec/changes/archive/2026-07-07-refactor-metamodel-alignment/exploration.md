## Exploration: refactor-metamodel-alignment

### Current State
Today, three main areas in the codebase display duplicated, incomplete, or incorrectly resolved metamodel logic:
1. **URL Loader Duplication**: `useUrlDocLoader.ts` manually parses and normalizes Markdown files fetched from a URL, bypassing `@cognnitive/innfo-core`'s internal normalization logic. This leads to duplicate implementation of root and element nodes construction, lacks proper field type parsing, missing matrix definitions mapping, and missing relationship mapping.
2. **Hidden Empty Metamodel Fields**: Both `WorkspaceView.vue` and `TreeEditor.vue` derive the list of active fields for editing (`activeConceptFields`) by reading `Object.keys(node.fields)`. Because empty/unset fields defined in the metamodel are not instantiated in `node.fields` when parsed, they are hidden in the editor, preventing users from filling them.
3. **Redundant Header Parser**: `Header.vue` implements its own custom regex frontmatter parser (`parseFrontmatter`) to retrieve `format_version`, `template_name`, `template_version`, and `version` from the raw Markdown content. This duplicates parsing that `@cognnitive/innfo-core` already performs and stores in the root node's normalized `fields` dictionary.

### Affected Areas
- `apps/innfo-editor/src/composables/useUrlDocLoader.ts` — Houses duplicated single-model parsing and graph normalization logic.
- `packages/innfo-core/src/recursiveParser.ts` — Contains internal model normalization logic (`parseAndRegisterModel`) that needs to be exposed for single-model reuse.
- `packages/innfo-core/src/index.ts` — Needs to export the newly exposed single-model normalization API.
- `apps/innfo-editor/src/views/WorkspaceView.vue` — Generates `activeConceptFields` by mapping only existing node fields, causing empty metamodel fields to be hidden.
- `apps/innfo-editor/src/components/editor/TreeEditor.vue` — Also defines `activeConceptFields` strictly based on existing node fields, mirroring the field hiding issue.
- `apps/innfo-editor/src/components/layout/Header.vue` — Contains a custom regex frontmatter parser that should be replaced by reading root node store values.

### Approaches

#### 1. Reuse Graph-Normalization API in `useUrlDocLoader.ts`
- **Approach A**: Extract the single-model normalization logic from `parseAndRegisterModel` in `packages/innfo-core/src/recursiveParser.ts` into a public function `normalizeSingleModel`. Expose this function via `packages/innfo-core/src/index.ts`, and refactor `useUrlDocLoader.ts` to import and call it.
  - Pros: Completely eliminates duplication; ensures URL-loaded models gain all standard normalizations (e.g., relationships, matrix definitions, assets).
  - Cons: Requires exposing one new utility function from the core package.
  - Effort: Medium

#### 2. Fix Metamodel Field Rendering
- **Approach A**: In both `WorkspaceView.vue` and `TreeEditor.vue`, update `activeConceptFields` to resolve the concept's defined fields via `useMetamodelStore.getConceptFields(node.type)` (which internally resolves the effective metamodel). Merge these definitions with any custom fields found on the node.
  - Pros: Ensures all fields defined in the metamodel (even if empty) show up in the editor. Prevents data-loss of custom fields not in the metamodel.
  - Cons: None.
  - Effort: Low

#### 3. Clean up frontmatter parser in `Header.vue`
- **Approach A**: Delete the local `parseFrontmatter` helper and regex patterns in `Header.vue`. Retrieve `formatVersion`, `templateName`, `templateVersion`, and `modelVersion` directly from the `rootNode`'s normalized `fields` store (using `spec_version`, `parent_spec` object, and `model_version` fields).
  - Pros: Removes 35 lines of redundant code; adheres to the single source of truth in the store.
  - Cons: None.
  - Effort: Low

### Recommendation
Expose the internal single-model parsing/normalization logic from `packages/innfo-core` as `normalizeSingleModel` and reuse it in `useUrlDocLoader.ts`. Fix the field rendering in the Vue components by merging metamodel-defined fields from `useMetamodelStore` with the node's existing fields, and retrieve frontmatter metadata in `Header.vue` directly from the store-normalized fields.

### Risks
- **Core API Stability**: Exposing a new core utility increases core's API surface area, but since this is a mono-repo, the changes are local and low-risk.
- **Field Type Inferences**: When merging metamodel-defined fields with actual node fields, care must be taken to maintain type compatibility for the widget fields.

### Ready for Proposal
Yes — The codebase is well-prepared, and the refactoring plans for the three target files are highly cohesive, low-risk, and ready to be drafted in a detailed proposal.
