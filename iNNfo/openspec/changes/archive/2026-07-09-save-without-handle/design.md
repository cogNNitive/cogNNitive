# Design: Save Workspace Without Handle

## Technical Approach

Introduce a modal dialogue `SaveWorkspaceModal.vue` triggered when trying to save a virtual (URL-loaded) workspace. The modal guides the user to pick a local folder via the browser's File System Access API. It writes the model markdown file, an internet shortcut, and a README.md before transitioning the app state into a local folder workspace using Pinia store actions.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline modal in WorkspaceView vs. route change | Route change adds history noise; inline modal keeps edit context. | **Inline Modal**: Render `SaveWorkspaceModal` dynamically in `WorkspaceView.vue`. |
| Writing files inside component vs. store action | Keeping file-writing inside store keeps logic centralized, but directory picker is user-gesture bound. | **Component-level user gesture**: Trigger directory picker directly in component, write files, then call store. |

## Data Flow

```
Virtual Workspace (URL) ──[Ctrl+S / Save Button]──→ Intercept (no handle)
                                                         │
                                                         ▼
                                            Open SaveWorkspaceModal
                                                         │
                                                         ▼
                                             [showDirectoryPicker]
                                                         │
                                                         ▼
                                                Write 3 files to disk
                                                         │
                                                         ▼
                                          workspaceStore.open(handle)
                                                         │
                                                         ▼
                                               Workspace (Local Folder)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/components/layout/SaveWorkspaceModal.vue` | Create | New modal component with English/Spanish instructions, directory picker trigger, file writing logic, and state transition. |
| `apps/innfo-editor/src/stores/uiStore.ts` | Modify | Add `showSaveWorkspaceModal` state ref and its setter. |
| `apps/innfo-editor/src/components/layout/Header.vue` | Modify | Intercept `handleSave` and `bumpVersion` to open the modal if the workspace has no handle. |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modify | Render `SaveWorkspaceModal` and intercept `Ctrl+S` to open the modal if the workspace has no handle. |

## Interfaces / Contracts

No new public TypeScript interfaces are introduced. We extend `useUiStore` with:
```typescript
const showSaveWorkspaceModal = ref(false)
function setShowSaveWorkspaceModal(val: boolean): void
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Event Interception | Test that `handleSave` in Header and keydown in WorkspaceView open the modal if `hasHandle` is false. |
| Integration | Save Workspace Modal | Mount modal and mock `showDirectoryPicker` to return a fake folder handle, asserting that three files are written and `workspaceStore.open` is called. |

## Migration / Rollout

No database or file format migration required. Backward-compatible changes.

## Open Questions

- [ ] Does browser-mode `saveActiveFile()` properly save dirty nodes if `workspaceStore.driver` is null? (Investigate handle-based write fallback in `recursiveSerialize`).
