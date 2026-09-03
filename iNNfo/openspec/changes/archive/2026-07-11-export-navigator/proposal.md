# Proposal: Export Navigator

## Intent

Replace the ad-hoc "Copy Table MD" matrix export with a proper Export Navigator view that lists generated visualizers from `traNNsform/outputs/`, shows their version status against the current model, and surfaces regeneration prompts. Decouple the app from export generation — the app only discovers and displays; the AI agent creates.

## Scope

### In Scope
- Remove "Copy Table MD" button from MatricesGrid.vue
- Create `traNNsform/outputs/` as the convention for export files, with embedded `export-meta` JSON metadata in each HTML
- Create ExportNavigator.vue component that scans `traNNsform/outputs/` via FSA API, reads metadata, displays file list with version status
- Replace Navigator placeholder in WorkspaceView.vue with ExportNavigator
- Update AIGuidePanel.vue export prompt to reference `traNNsform/outputs/`
- Update traNNsform/README.md and templates to emit `export-meta` and output to `traNNsform/outputs/`

### Out of Scope
- No actual HTML generation — the app doesn't run Chart.js or build visualizers
- No iframe preview — exports open in new tab
- No deletion or management of exports beyond listing

## Capabilities

### New Capabilities
- `export-navigator`: List, inspect, and verify export files in `traNNsform/outputs/` against model version

### Modified Capabilities
- None

## Approach

1. Embed JSON metadata in each export HTML (`<script id="export-meta" type="application/json">`) so the app can read version info without parsing the full DOM
2. ExportNavigator.vue uses FSA API (`workspaceStore.handle.getDirectoryHandle('traNNsform')`) to scan outputs, reads first bytes of each HTML for metadata
3. Compares `modelVersion` from metadata against current model's version (via `parseFormatFilename`) — shows ✅ or ⚠️ badge
4. Click opens file in new tab via `URL.createObjectURL` or direct FSA URL
5. traNNsform templates updated to write `exports/` → `traNNsform/outputs/` and include metadata block

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/components/editor/MatricesGrid.vue` | Modified | Remove "Copy Table MD" button + handler |
| `apps/innfo-editor/src/components/editor/ExportNavigator.vue` | **New** | Export file browser with version status |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modified | Replace Navigator placeholder with ExportNavigator |
| `apps/innfo-editor/src/components/editor/AIGuidePanel.vue` | Modified | Update export prompt: `output/` → `traNNsform/outputs/` |
| `traNNsform/README.md` | Modified | Add `export-meta` convention, change output dir |
| `traNNsform/templates/*.md` | Modified | Add metadata block and new output path to each template |
| `traNNsform/snippets/chart-patterns.md` | Modified | Add metadata snippet reference |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| FSA API not supported in browser | Low | Graceful fallback: show link to repo |
| Export HTML has no metadata (older exports) | Med | Show "unknown version" with prompt to regenerate |
| traNNsform templates out of sync with app | Low | Templates ship with the repo; AIGuidePanel auto-downloads |

## Rollback Plan

Revert MatricesGrid.vue changes, delete ExportNavigator.vue, revert WorkspaceView.vue, revert AIGuidePanel.vue, revert traNNsform/ files.

## Dependencies

None.

## Success Criteria

- [ ] "Copy Table MD" button removed from MatricesGrid
- [ ] Navigator view shows exports from `traNNsform/outputs/` when workspace has them
- [ ] Each export shows version badge (✅ current / ⚠️ outdated / ❓ unknown)
- [ ] Clicking an export opens the HTML in a new tab
- [ ] traNNsform templates document the `export-meta` convention
- [ ] All existing tests pass
