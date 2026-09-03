# Design: Restore Modeler Features

## Technical Approach

Four independent but reinforcing changes to restore modeler features by wiring existing primitives (recursiveSerializer, documentationParser, version.ts, MatrixPill) into their respective consumers. No new external dependencies.

---

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|----------|
| Docs loading | workspaceStore handle → read file → cache in metamodelStore | Fetch from CDN always | Works offline, matches existing FS pattern (`recursiveParser`), avoids network dependency |
| Version bump | workspaceStore action that renames file handle + updates frontmatter | In-memory reroute | FS Access API supports rename via `move()` on handles; prevents stale file references |
| Matrix nav | LeftSidebar emits `select-matrix(index)` → uiStore.setActiveMatrixIndex + setActiveView('matrices') | Route params | Existing pattern: LeftSidebar already emits events handled in WorkspaceView; no routing needed |
| Guidance doc path | `docs/documentation/templates/{name}/{version}/documentation.md` with fallback to `fetch()` | Single fixed path | Template + version gives version-correct docs; fallback keeps it working without a full workspace |

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ LeftSidebar Relations                                               │
│  rootNode.fields.__matrix_defs ──→ MatrixPill[].click               │
│       ↓                                                              │
│  emit('select-matrix', idx) ──→ WorkspaceView.onSelectMatrix(idx)    │
│       ↓                                                              │
│  uiStore.setActiveMatrixIndex(idx) + setActiveView('matrices')       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ RightGuidanceSidebar                                                │
│  selectedNode.type/conceptBinding.name ──→ metamodelStore            │
│       ↓                                                              │
│  metamodelStore.loadDocumentation(handle, templateName, version)     │
│    → workspaceHandle.getFileHandle('docs/.../documentation.md')      │
│    → parseMetamodelDocumentation(markdown)                           │
│    → cache in metamodelStore.documentation                          │
│       ↓                                                              │
│  getConceptGuidance(conceptName) → DocumentationEntry                │
│  getMatrixGuidance(matrixName) → matrices referencing this concept   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ Header → Save & Version Bump                                        │
│  bumpVersion(level) → workspaceStore.saveActiveFileWithVersionBump   │
│       ↓                                                              │
│  parseFormatFilename(currentPath) → SemVer                           │
│  bumpVersion(semver, level) → newSemVer                              │
│  buildFormatFilename(base, template, newSemVer) → newFileName        │
│  handle.move(newFileName)  (File System Access rename)               │
│  update root node rawContent frontmatter `version:`                  │
│  recursiveSerialize → writes to new file                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/stores/metamodelStore.ts` | Modify | Add `documentation`, `loadDocumentation()`, `getConceptGuidance()`, `getCleanPrompts()`, `getMatrixGuidance()` |
| `src/stores/workspaceStore.ts` | Modify | Add `saveActiveFile()`, `saveActiveFileWithVersionBump()` actions |
| `src/components/layout/LeftSidebar.vue` | Modify | Add "Relations" collapsible section, MatrixPill list, emit `select-matrix` and `select-view` |
| `src/components/layout/RightGuidanceSidebar.vue` | Modify | Wire to `metamodelStore`, `uiStore`; render methodology, prompts, associated matrices |
| `src/components/editor/MatricesGrid.vue` | Modify | Fix empty-state conditional rendering so dropdown shows when defs exist even if `activeMatrixIndex < 0` |
| `src/components/layout/Header.vue` | Modify | Wire `bumpVersion()` to `workspaceStore.saveActiveFileWithVersionBump`, handle error states |
| `src/views/WorkspaceView.vue` | Modify | Wire new LeftSidebar events, pass guidance concept to RightGuidanceSidebar |

---

## Interfaces / Contracts

### metamodelStore additions

```typescript
interface MetamodelStore {
  // Existing
  concepts: ComputedRef<MetamodelConcept[]>
  markers: ComputedRef<MetamodelMarker[]>
  getConceptByName(name: string): MetamodelConcept | undefined
  getConceptFields(name: string): MetamodelConcept['fields']

  // New
  documentation: Record<string, DocumentationEntry>  // parsed docs
  docsLoading: boolean
  docsError: string | null

  async loadDocumentation(handle: DirectoryHandleLike, templateName: string, templateVersion: string): Promise<void>
  getConceptGuidance(conceptName: string): DocumentationEntry | null
  getCleanPrompts(conceptName: string): string[]
  getMatrixGuidance(matrixName: string): DocumentationEntry | null
}
```

### workspaceStore additions

```typescript
interface WorkspaceStore {
  // Existing
  handle: DirectoryHandleLike | null
  // ...

  // New
  async saveActiveFile(): Promise<void>
  async saveActiveFileWithVersionBump(level: BumpLevel): Promise<void>
}
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Docs file not found at workspace path | Fall back to `fetch()` → if that fails, set `docsError: 'Documentation not available'`, show placeholder in sidebar |
| FS write fails (permission revoked) | Catch in `saveActiveFile`, set `workspaceStore.error`, show toast in Header |
| Version parsing fails (non-standard filename) | `bumpVersion()` catches, sets `bumpError`, dropdown stays open with error message |
| Version bump rename fails | Log error, revert `rawContent` version field, show `bumpError` toast |

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `loadDocumentation` with fake handle | Write a fake `DirectoryHandleLike` that returns known markdown; verify `documentation` state |
| Unit | `saveActiveFileWithVersionBump` | Mock `recursiveSerialize`, verify rename + frontmatter mutation |
| Unit | LeftSidebar "Relations" section | Mount with stubs, assert MatrixPill renders for each `__matrix_defs` entry |
| Integration | Guidance panel wired to metamodelStore | Select a concept node, verify guidance content updates |

---

## Open Questions

None.
