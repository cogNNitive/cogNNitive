# Delta: Session Persistence — IndexedDB for Last File, Tree State, Sidebar Widths

## Purpose

Port session-persistence from the predecessor apps. The format-editor currently stores only the directory handle in IndexedDB (via `workspaceStore`). This slice extends IndexedDB persistence to include: last opened file path, tree expansion state (which nodes are collapsed/expanded), and sidebar widths. The goal is seamless session recovery on page reload.

## Requirements

### R-SP-01: IndexedDB Schema

A new `utils/db.ts` module MUST provide a generic IndexedDB wrapper with versioned schema. The database name MUST be `'format-editor'` (matching the existing `workspaceStore` usage). Schema version MUST be bumped to `2` (current is `1`).

The schema on upgrade MUST create/upgrade the following object stores:

| Store Name | Key Path | Purpose |
|------------|----------|---------|
| `handles` | (keyPath, manually set) | Existing — stores directory handles |
| `session` | `key` | General session state key-value store |
| `treeState` | `nodeId` | Per-node expansion state |
| `sidebarWidths` | `panelId` | Per-panel sidebar/collapsible width |

The upgrade MUST NOT drop or modify the existing `handles` store.

#### Scenario: Schema upgrades without data loss

- GIVEN IndexedDB already contains a handle in the `handles` store at version 1
- WHEN the schema upgrades to version 2
- THEN the `handles` store persists with its existing data
- AND the new `session`, `treeState`, and `sidebarWidths` stores are created

### R-SP-02: Session State Store

The `session` object store MUST support the following keys:

| Key | Value Type | Purpose |
|-----|-----------|---------|
| `lastFile` | `string` | The path/URL of the last opened/active file |
| `lastOpenedAt` | `string` (ISO-8601) | Timestamp of the last workspace open |
| `activeView` | `string` | Last active view ('editor', 'graph', 'matrices', 'info') |
| `selectedNodeId` | `string` | Last selected node ID |

On workspace open or node selection change, these values MUST be persisted within 500ms debounce.

On app boot (when `workspaceStore.recoverHandle()` succeeds), the session values MUST be restored to `uiStore` and modelStore if the handle is still valid.

#### Scenario: Session state restores after reload

- GIVEN the user was editing node "Process/Phase/Task" in "editor" view
- WHEN the page reloads and the handle is recovered successfully
- THEN `uiStore.selectedNodeId` is "Process/Phase/Task"
- AND `uiStore.activeView` is "editor"

### R-SP-03: Tree State Persistence

The `treeState` object store MUST persist per-node expansion state. Each record has:

- `nodeId`: the node's qualified ID (key)
- `collapsed`: `boolean` — whether the node is collapsed

On tree expand/collapse toggles, the state MUST be persisted within 300ms debounce. When the tree initializes on workspace load, the stored expansion state MUST be applied to `ConceptTreeNode` instances. Nodes not present in the store default to expanded.

#### Scenario: Tree expansion survives reload

- GIVEN the user collapsed nodes "AILab" and "Process"
- WHEN the page reloads and workspace reopens
- THEN "AILab" and "Process" are collapsed in the tree
- AND all other nodes are expanded

### R-SP-04: Sidebar Width Persistence

The `sidebarWidths` object store MUST persist the width of each resizable panel. Each record has:

- `panelId`: the panel identifier string (key) — e.g., `'format.leftSidebarWidth'`, `'rightSidebarWidth'`
- `width`: `number` — the panel width in pixels

On panel resize (via `useResizablePanel`'s `onPointerUp`), the width MUST be persisted. On app boot, the `useResizablePanel` composable MUST load the stored width as its initial value, falling back to the default width if no stored value exists.

The `useResizablePanel` composable already accepts a `storageKey` parameter. This slice MUST add IndexedDB read/write in addition to the existing in-memory state.

#### Scenario: Sidebar width restored after reload

- GIVEN the user resized the left sidebar to 520px
- WHEN the page reloads
- THEN `useResizablePanel` loads 520px from IndexedDB for key `'format.leftSidebarWidth'`
- AND the sidebar renders at 520px width

### R-SP-05: Persistence API (`utils/db.ts`)

The `db.ts` module MUST export:

```typescript
// Generic operations
async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined>
async function dbSet(storeName: string, key: IDBValidKey, value: unknown): Promise<void>
async function dbDelete(storeName: string, key: IDBValidKey): Promise<void>
async function dbGetAll<T>(storeName: string): Promise<T[]>
async function dbClear(storeName: string): Promise<void>

// Convenience session operations
async function getSessionState(): Promise<Record<string, unknown>>
async function setSessionState(key: string, value: unknown): Promise<void>
async function getTreeState(): Promise<Map<string, boolean>>
async function setTreeState(nodeId: string, collapsed: boolean): Promise<void>
async function getSidebarWidth(panelId: string): Promise<number | undefined>
async function setSidebarWidth(panelId: string, width: number): Promise<void>
```

All functions MUST handle the case where IndexedDB is unavailable (private browsing, storage quota exceeded) by failing gracefully (returning `undefined` or `false` without throwing).

#### Scenario: IndexedDB unavailable

- GIVEN IndexedDB is not available (e.g., private browsing mode)
- WHEN `dbGet('session', 'lastFile')` is called
- THEN it returns `undefined` (no error thrown)
- AND the app continues without persistence

### R-SP-06: Workspace Store Integration

`workspaceStore` MUST integrate session persistence:

- `open()` MUST call `setSessionState('lastFile', currentPath)` and `setSessionState('lastOpenedAt', new Date().toISOString())` after successful parse
- `recoverHandle()` MUST also call `getSessionState()` and restore `uiStore` state from it
- A new `persistTreeState(nodeId, collapsed)` action MUST call `setTreeState(nodeId, collapsed)`
- A new `restoreTreeState()` action MUST call `getTreeState()` and return the map

### R-SP-07: Scope Guard — No Cloud Sync or Multi-Tab Support

This slice MUST NOT introduce cloud sync, multi-tab coordination, or any server-side persistence. All state lives in the browser's IndexedDB.

#### Scenario: No cloud sync

- GIVEN two browser tabs open the same workspace
- WHEN state changes in tab A
- THEN tab B does NOT see the update until page reload
- AND no network request is made for session state
