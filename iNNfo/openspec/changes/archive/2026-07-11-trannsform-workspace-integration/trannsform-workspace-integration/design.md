# Design: traNNsform Workspace Integration

## Technical Approach

Move traNNsform from a lazy download inside AIGuidePanel to a first-class workspace citizen downloaded during SetupWizard. Extract Import and Export as standalone view components routed through `uiStore.activeView`. The AIGuidePanel becomes a pure "Steps" guide with no download logic.

---

## Architecture Decisions

### D3. ImportPanel / ExportPanel: Separate components

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Sections inside AIGuidePanel | 502-line panel grows further; proposal says "mantener solo la guía textual" | ❌ Rejected |
| **Separate components** | Clean separation of concerns; each panel has distinct data deps (input/ vs output/ vs model list); consistent with WorkspaceView routing pattern; requires adding 2 ActiveView values | **✅ Chosen** |

**Rationale**: The proposal explicitly aims to keep AIGuidePanel focused ("mantener solo la guía textual"). Each panel has independent data sources and refresh cycles — cramming them into AIGuidePanel adds complexity. The existing WorkspaceView pattern dispatches by `activeView`, making this a natural fit with zero extra routing infrastructure.

### Routing: ActiveView extension

`ActiveView` type in `uiStore.ts` gains `'import'` | `'export'`. WorkspaceView renders `<ImportPanel />` and `<ExportPanel />` via existing `v-if` chain.

### Download timing: SetupWizard initWorkspaceStructure()

`ensureTemplates()` moves from `AIGuidePanel.onMounted()` to `SetupWizard.initWorkspaceStructure()`. The function creates `traNNsform/` (visible), subdirectories `input/`, `output/`, `templates/`, `snippets/`, then fetches AGENT.md, README.md, and all templates/snippets. On fetch failure, directories are still created but `templatesReady` stays false — never blocks the wizard.

---

## Data Flow

```
SetupWizard.initWorkspaceStructure()
  └─→ create traNNsform/ (visible)
      ├── input/          (empty + .gitkeep)
      ├── output/         (empty + .gitkeep, replaces outputs/)
      ├── templates/      (fetched from GitHub)
      └── snippets/       (fetched from GitHub)
      ├── AGENT.md        (fetched)
      └── README.md       (fetched)

Header: [Import] ─→ uiStore.setActiveView('import')
        [Export] ─→ uiStore.setActiveView('export')

WorkspaceView:
  'import'  ─→ ImportPanel  ─→ scans traNNsform/input/ → file list + copiable prompt
  'export'  ─→ ExportPanel  ─→ scans .md models + traNNsform/output/ → selector + prompt

AIGuidePanel (simplified):
  onMounted → getDirectoryHandle('traNNsform') → templatesReady = true/false
  No fetch, no downloadError, no TRANSFORM_BASE_URL
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/components/editor/ImportPanel.vue` | Create | Scan `traNNsform/input/`, show file list + copiable agent prompt |
| `apps/innfo-editor/src/components/editor/ExportPanel.vue` | Create | Model selector + copiable export prompt + output status |
| `apps/innfo-editor/src/components/layout/SetupWizard.vue` | Modify | Add traNNsform download in `initWorkspaceStructure()`; change `.traNNsform/` → `traNNsform/`, `outputs/` → `output/`, add `input/` |
| `apps/innfo-editor/src/components/layout/Header.vue` | Modify | Add Import and Export buttons after "Use AI" |
| `apps/innfo-editor/src/components/editor/AIGuidePanel.vue` | Modify | Remove `ensureTemplates()`, `TRANSFORM_BASE_URL`, `downloadError`, Export section; add existence check only |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modify | Add `v-else-if` for `'import'` and `'export'` activeView |
| `apps/innfo-editor/src/stores/uiStore.ts` | Modify | Extend `ActiveView` type: `'import' \| 'export'` |
| `traNNsform/AGENT.md` | Modify | Add Import flow + defiNNe naming pointer + PLOM note; change `outputs/` → `output/` |
| `traNNsform/README.md` | Modify | Change `outputs/` → `output/`; add Import documentation |
| `traNNsform/outputs/` → `traNNsform/output/` | Rename | Singular consistency with CLI |
| `traNNsform/input/` | Create | New directory for raw documents |

---

## Interfaces / Contracts

### uiStore ActiveView type

```typescript
export type ActiveView = 'editor' | 'graph' | 'matrices' | 'info'
  | 'ai-guide' | 'navigator' | 'import' | 'export'
```

### ImportPanel props

None — reads `workspaceStore.handle` directly. Uses `getDirectoryHandle('traNNsform')` then `getDirectoryHandle('input')` to scan files.

### ExportPanel props

None — reads `workspaceStore.handle` + `modelStore` for available models. Scans `traNNsform/output/` for previous exports.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `initWorkspaceStructure()` creates correct dirs | Mock File System Access API; verify `getDirectoryHandle` calls use visible/singular paths |
| Unit | AIGuidePanel existence check on mount | Mount component with/without `traNNsform/`, assert `templatesReady` |
| Unit | Header buttons emit correct activeView | Click Import → `uiStore.activeView === 'import'` |
| Unit | ActiveView type includes new values | Compile-time type check |
| E2E | Full flow: create workspace → Import visible → Export visible | Playwright: complete SetupWizard, verify Header buttons, click each, verify panel content |
| E2E | traNNsform download failure | Stub network; verify directories created, error message shown in AIGuidePanel |

---

## Migration / Rollout

- **Backward compat**: Existing workspaces with `.traNNsform/` + `outputs/` are NOT migrated. SetupWizard only creates during new workspace creation.
- **AIGuidePanel**: Old AIGuidePanel will still work if user never creates a new workspace. Existing Export/Transform sections remain visible until the user opens a new workspace.
- **No data loss**: Existing `outputs/` dir is not deleted — it simply won't be recreated. New workspaces use `output/`.

## Open Questions

- None. All decisions documented. Ready for tasks.
