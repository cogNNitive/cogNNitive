# Design: Monorepo Architecture Refactor

## Architecture Overview
The system will implement a clean Ports and Adapters (Hexagonal) pattern for infrastructure concerns, extract application-layer logic into services/Pinia actions, and standardise parsing logic in the core package.

## Components

### 1. Workspace Persistence (Hexagonal)
We will introduce an interface for workspace repositories and implement it using IndexedDB.

- **Port (`apps/innfo-editor/src/repositories/IWorkspaceRepository.ts`)**:
  ```typescript
  export interface IWorkspaceRepository {
    openWorkspace(name: string): Promise<any>;
    saveFile(path: string, content: string): Promise<void>;
    // ... other methods as needed
  }
  ```
- **Adapter (`apps/innfo-editor/src/repositories/IndexedDbWorkspaceRepository.ts`)**:
  Implements the browser-specific `IndexedDB` interaction.
- **Store Injection**: `workspaceStore.ts` will accept an `IWorkspaceRepository` instance instead of hardcoding `indexedDB` calls.

### 2. Validation Service
- **Service (`apps/innfo-editor/src/services/ValidationService.ts`)**:
  Refactor the validation orchestration logic out of `WorkspaceView.vue` and wrap it in a service or a Pinia action.

### 3. Decoupling WorkspaceView
- **Dynamic Component rendering**:
  In `WorkspaceView.vue`, replace:
  ```html
  <TextEditor v-if="uiStore.activeView === 'editor'" ... />
  <GraphViewer v-else-if="uiStore.activeView === 'graph'" ... />
  ```
  with:
  ```html
  <component :is="activeEditorComponent" ... />
  ```
  This reduces file bloat and imports.

### 4. Standardizing Parsers & Driver Cleanup
- Replace custom `parseYaml` and regexes with standardized YAML/Markdown AST parsers.
- Decouple `driver-browser` and `driver-unified` by ensuring the core package exposes abstract ports.
