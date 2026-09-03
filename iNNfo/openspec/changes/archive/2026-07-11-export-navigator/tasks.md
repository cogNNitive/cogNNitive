# Tasks: export-navigator

## Task 1: Remove "Copy Table MD" from MatricesGrid.vue

**Files:** `apps/innfo-editor/src/components/editor/MatricesGrid.vue`

- Remove the `copyTableMd()` function (lines 668-683)
- Remove the button calling it from the template
- **Verify:** `npm run typecheck && npm run lint`

## Task 2: Create ExportNavigator.vue component

**Files:** `apps/innfo-editor/src/components/editor/ExportNavigator.vue` (new)

- Component scans `traNNsform/outputs/` via workspaceStore FSA handle
- Reads first 2048 bytes of each .html file
- Extracts `export-meta` JSON via regex
- Compares version against current model via `parseFormatFilename` + `formatVersionString`
- Renders: filename, version badge (✅/⚠️/❓), export date, "Regenerate" button for outdated
- Click → opens file in new tab via `URL.createObjectURL(Blob)` or direct
- Empty/missing states per spec
- **Verify:** `npm run typecheck && npm run lint`

## Task 3: Wire ExportNavigator into WorkspaceView.vue

**Files:** `apps/innfo-editor/src/views/WorkspaceView.vue`

- Replace Navigator placeholder (`v-else-if="uiStore.activeView === 'navigator'") block
- Import and render `<ExportNavigator />`
- **Verify:** `npm run typecheck && npm run lint`

## Task 4: Update AIGuidePanel.vue export prompt

**Files:** `apps/innfo-editor/src/components/editor/AIGuidePanel.vue`

- Change `output/` → `traNNsform/outputs/` in `exportPrompt` computed
- Update filename convention: `<TemplateName>_Visualizer_V_0-1-0.html` → `<ModelBaseName>_V<version>_<templateName>_visualizer.html`
- Add instruction about `export-meta` block
- **Verify:** `npm run typecheck && npm run lint`

## Task 5: Update traNNsform templates with export-meta + new output path

**Files:** `traNNsform/README.md`, `traNNsform/templates/business.md`, `traNNsform/templates/procedures.md`, `traNNsform/templates/catalog.md`, `traNNsform/templates/_generic.md`

- README.md: document export-meta block requirement, change output dir
- Each template: add `<script id="export-meta">` block to base HTML structure
- **Verify:** templates are markdown, no code verification needed

## Task 6: Final verification

- `npm run typecheck`
- `npm run lint`
- `npm run test`
