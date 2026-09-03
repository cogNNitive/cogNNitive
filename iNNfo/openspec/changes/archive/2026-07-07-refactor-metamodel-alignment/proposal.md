# Proposal: Refactor Metamodel Alignment

## Intent
Align metamodel rendering with actual metamodel definitions to show empty fields, unify URL document parsing using the standard recursive parser normalization, and clean up duplicate frontmatter parsing in the Header.

## Scope

### In Scope
- Extract `normalizeSingleModel` from `parseAndRegisterModel` in `recursiveParser.ts` and expose it.
- Replace custom normalization in `useUrlDocLoader.ts` with `normalizeSingleModel`.
- Merge metamodel-defined fields from `useMetamodelStore.getConceptFields` with node fields in `WorkspaceView.vue` and `TreeEditor.vue` so empty fields are rendered.
- Delete custom regex frontmatter parser in `Header.vue` and fetch format, template, and model versions directly from root node fields.

### Out of Scope
- Modifying AST parsing or serialized output format.
- Introducing new editing widgets or metamodel storage layers.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach
1. Refactor `packages/innfo-core/src/recursiveParser.ts`:
   - Move parser logic into `normalizeSingleModel` returning `{ nodes, issues }`.
   - Update `parseAndRegisterModel` to delegate to `normalizeSingleModel`.
2. Update `apps/innfo-editor/src/composables/useUrlDocLoader.ts`:
   - Remove manual node/element instantiation and delegate to `normalizeSingleModel`.
3. Update `WorkspaceView.vue` and `TreeEditor.vue`:
   - Import `useMetamodelStore`.
   - Implement `getConceptFieldsForNode` helper to merge defined metamodel fields with node-defined fields.
   - Pass merged definitions to child components.
4. Update `Header.vue`:
   - Remove `parseFrontmatter` regex.
   - Use `rootNode.fields` values directly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/innfo-core/src/recursiveParser.ts` | Modified | Extract `normalizeSingleModel` |
| `packages/innfo-core/src/index.ts` | Modified | Export `normalizeSingleModel` |
| `apps/innfo-editor/src/composables/useUrlDocLoader.ts` | Modified | Call `normalizeSingleModel` |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modified | Merge concept fields & render empty fields |
| `apps/innfo-editor/src/components/editor/TreeEditor.vue` | Modified | Merge concept fields per node/child |
| `apps/innfo-editor/src/components/layout/Header.vue` | Modified | Remove regex, use root node fields |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| URL loader misses customized fields | Low | Unify tests to verify URL loading creates same node structure |
| Empty fields update fails | Low | Ensure `FieldViewer` handles missing fields gracefully in edit mode |

## Rollback Plan
Revert changes using git:
`git checkout HEAD -- packages/innfo-core/ apps/innfo-editor/`

## Dependencies
- None

## Success Criteria
- [ ] No regression in model parser / validator tests.
- [ ] Metamodel-defined fields with empty values render correctly in `BlockSheet` under both tree and sheet views.
- [ ] Custom regex parser in `Header.vue` is removed and header metadata values are read from root node fields.
