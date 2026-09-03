# Tasks: Restore Modeler Features

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 370–430 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Store Foundation

- [ ] 1.1 **metamodelStore — add documentation state + loading action**: Add `documentation: Record<string, DocumentationEntry>`, `docsLoading: boolean`, `docsError: string | null` state. Implement `async loadDocumentation(handle, templateName, version)` that reads `docs/documentation/templates/{name}/{version}/documentation.md` via `workspaceStore.handle.getFileHandle()`, parses with `parseMetamodelDocumentation()`, and caches the result. File: `src/stores/metamodelStore.ts`
- [ ] 1.2 **metamodelStore — add guidance accessors**: Add `getConceptGuidance(name)` returning `DocumentationEntry | null`, `getCleanPrompts(name)` returning `string[]`, and `getMatrixGuidance(matrixDef)` returning matching entries. These trigger lazy `loadDocumentation()` on first access if not yet loaded. File: `src/stores/metamodelStore.ts`
- [ ] 1.3 **workspaceStore — add `saveActiveFile()` action**: Wire to `recursiveSerialize(handle, modelStore.nodes, modelStore.rootIds, modelStore.dirtyIds)` from `../model/recursiveSerializer`. Clear `dirtyIds` after successful write. Catch `DOMException` (permission revoked) — set `this.error` and do NOT clear dirtyIds. File: `src/stores/workspaceStore.ts`
- [ ] 1.4 **workspaceStore — add `saveActiveFileWithVersionBump(level)` action**: Parse current filename with `parseFormatFilename()`, compute new version with `bumpVersion()`, build new filename with `buildFormatFilename()`. Create new file via `handle.getFileHandle(newName, { create: true })`, write content, update root node `rawContent` frontmatter `version:` field. Leave original file intact. File: `src/stores/workspaceStore.ts`

## Phase 2: Component Implementation

- [ ] 2.1 **LeftSidebar — add collapsible Relations section**: Below the Model tree, add a collapsible section with chevron toggle for "Relations". Iterate `rootNode.fields.__matrix_defs` and render a `MatrixPill` for each (props: `name`, `source`, `target`, `label`, `interactive`, `fullWidth`, `showSourceTarget`). Add "Metamatrix Config" button in the section header that navigates to metamatrix config. Show "No relations defined" when empty. Emit `select-matrix(idx)` and `select-view('metamatrix-config')`. File: `src/components/layout/LeftSidebar.vue`
- [ ] 2.2 **RightGuidanceSidebar — wire to metamodelStore**: Accept `conceptType: string | null` prop. When concept changes, call `metamodelStore.getConceptGuidance(name)` to resolve the entry. Render summary, description, associated matrices from `metamodelStore.getMatrixGuidance()`. Render prompts with copy-to-clipboard buttons. Show fallback "No guidance available for this concept" when docs not found. Remove all placeholder text. File: `src/components/layout/RightGuidanceSidebar.vue`
- [ ] 2.3 **MatricesGrid — fix dropdown visibility conditional**: Ensure the matrix dropdown selector container uses `v-if="matrixDefs.length"` (visible when defs exist regardless of `activeMatrixIndex`). Add the italic hint "No relational matrices defined. Define them in Metamatrix Config." when `matrixDefs.length === 0`. The `selectMatrix(idx)` local handler must also dispatch to `uiStore.setActiveMatrixIndex(idx)`. File: `src/components/editor/MatricesGrid.vue`
- [ ] 2.4 **Header — wire save and version bump**: Replace `handleSave()` placeholder with `await workspaceStore.saveActiveFile()`. Replace `bumpVersion()` placeholder with `await workspaceStore.saveActiveFileWithVersionBump(level)`. Show success toast after save/bump. Handle errors from both actions. Close dropdown after successful bump. File: `src/components/layout/Header.vue`

## Phase 3: Integration

- [ ] 3.1 **WorkspaceView — wire LeftSidebar events**: Add `@select-matrix="onSelectMatrix"` handler that calls `uiStore.setActiveMatrixIndex(idx)` + `uiStore.setActiveView('matrices')`. Add `@select-view="onSelectView"` handler for routing to metamatrix config. File: `src/views/WorkspaceView.vue`
- [ ] 3.2 **WorkspaceView — pass guidance concept to RightGuidanceSidebar**: Add `concept-type` binding using `selectedNode.conceptBinding?.name` so the guidance panel knows which metamodel concept to load docs for. Ensure RightGuidanceSidebar receives the resolved concept type, not just the node name. File: `src/views/WorkspaceView.vue`
- [ ] 3.3 **WorkspaceView — wire Ctrl+S to workspaceStore**: Replace the placeholder Ctrl+S handler to call `workspaceStore.saveActiveFile()` instead of just clearing dirtyIds. File: `src/views/WorkspaceView.vue`

## Phase 4: Testing

- [ ] 4.1 **Unit: metamodelStore documentation loading**: Write test with fake `DirectoryHandleLike` that returns known documentation.md content. Assert `loadDocumentation()` populates `documentation` state correctly. Assert `getConceptGuidance(name)` returns parsed entry. Assert error path when file missing or handle missing. File: `tests/unit/metamodel.test.ts`
- [ ] 4.2 **Unit: workspaceStore save actions**: Mock `recursiveSerialize`. Call `saveActiveFile()` — verify dirtyIds cleared. Call `saveActiveFileWithVersionBump('patch')` — verify new file handle created and root frontmatter version updated. Test permission error path. File: `tests/unit/workspaceStore.test.ts`
- [ ] 4.3 **Component: LeftSidebar Relations section**: Mount LeftSidebar with stubbed stores having `__matrix_defs` on root node. Assert MatrixPill renders for each def. Assert navigation events emitted on click. Assert empty state when no defs. File: `tests/unit/LeftSidebar.test.ts`
- [ ] 4.4 **Component: Header save button**: Mount Header with workspaceStore stub. Click save — verify `saveActiveFile` called. Click version bump — verify `saveActiveFileWithVersionBump` called with correct level. File: `tests/unit/Header.test.ts`

## Hazards & Decisions Needed

1. **Documentation file path resolution** — The template name and version come from the root node's frontmatter. Need to confirm the exact path convention matches `docs/documentation/templates/{name}/{version}/documentation.md`. Fallback to `fetch()` if FS read fails.
2. **Root node frontmatter mutation** — `saveActiveFileWithVersionBump` must mutate `rootNode.rawContent` to update the `version:` field. This requires a raw string replacement, not a re-serialize, to preserve frontmatter byte fidelity.
3. **workspaceStore.handle type** — Currently `handle` is `DirectoryHandleLike | null`. All save actions must guard against `null` handle with early return and error state.
4. **MatrixPill click → uiStore sync** — The LeftSidebar emit pattern (1.4 → 3.1) must be mirrored inside MatricesGrid's own `selectMatrix()` dropdown handler so both sidebar and dropdown selection update uiStore consistently.

## Artifact Locations

- Engram: `sdd/restore-modeler-features/tasks` (topic_key)
- OpenSpec: `openspec/restore-modeler-features/tasks.md`
