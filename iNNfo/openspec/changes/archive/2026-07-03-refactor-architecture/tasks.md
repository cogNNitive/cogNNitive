# Tasks: refactor-architecture

## Phase 1 — Foundation/Infrastructure

- [x] **Dependency Updates**:
  - [x] Install the standard `yaml` parser package as a dependency in `packages/innfo-core`.
  - [x] Update `package.json` and lockfile.
- [x] **Core Drivers Interface (Ports/Adapters)**:
  - [x] Standardise `ModelDriver` interface as the abstract port in `packages/innfo-core/src/driver.ts`.
  - [x] Verify that Node-specific filesystem operations in `UnifiedDriver` are completely isolated from the browser bundle entrypoint (`packages/innfo-core/src/browser.ts`).
- [x] **Workspace Persistence Port & Adapter (Strict TDD)**:
  - [x] **RED**: Create `apps/innfo-editor/tests/unit/workspaceStore-repository.test.ts` to test that `workspaceStore` delegates loading, saving, and tree state persistence to an injectable `IWorkspaceRepository` instance.
  - [x] **GREEN**:
    - [x] Create the repository port interface `apps/innfo-editor/src/repositories/IWorkspaceRepository.ts`.
    - [x] Create the browser adapter class `apps/innfo-editor/src/repositories/IndexedDbWorkspaceRepository.ts` that implements `IWorkspaceRepository` using the browser's IndexedDB wrapper.
    - [x] Inject/provide this repository to `workspaceStore.ts` and refactor the store actions (`open()`, `saveActiveFile()`, `persistTreeState()`, `restoreTreeState()`) to consume the port.
  - [x] **REFACTOR**:
    - [x] Remove the hardcoded inline DB operations and helper functions from `workspaceStore.ts`.
    - [x] Ensure type safety and type checks pass.

## Phase 2 — Core/Services

- [x] **Standardizing Core Parser**:
  - [x] **RED**: Add parsing test assertions in `packages/innfo-core/tests/parser-standard.test.ts` to cover complex structures (matrices, frontmatter properties, bullet formatting, section boundaries).
  - [x] **GREEN**: Replace custom regex-based parsing and the manual `parseYaml` implementation in `packages/innfo-core/src/parser.ts` with standard parsing using the `yaml` package and standard AST-like markdown traversing.
  - [x] **REFACTOR**: Clean up obsolete regular expressions (`YAML_BLOCK_RE`, `YAML_FENCE_RE`, etc.) and dead utility methods.
- [x] **Validation Service (Strict TDD)**:
  - [x] **RED**: Create `apps/innfo-editor/tests/unit/ValidationService.test.ts` that mocks the `modelStore`, `validateFormatContent`, and toast notification system, asserting validation reports and user-facing notifications are generated correctly.
  - [x] **GREEN**: Implement `ValidationService` in `apps/innfo-editor/src/services/ValidationService.ts`, decoupling the orchestration logic from `WorkspaceView.vue`.
  - [x] **REFACTOR**: Align with monorepo design principles, typing all interfaces and responses.

## Phase 3 — UI/Views

- [x] **Dynamic Sub-Editor Views in WorkspaceView**:
  - [x] In `apps/innfo-editor/src/views/WorkspaceView.vue`, replace static imports for sub-editors (`TextEditor`, `TreeEditor`, `BlockFeed`, `GraphViewer`, `MatricesGrid`, `MetamatrixConfig`, `ModelInfoPanel`) with dynamic imports utilizing Vue 3's `defineAsyncComponent`.
  - [x] Implement a computed mapping to dynamically load components on-demand using `<component :is="..." />`.
- [x] **Connect Validation Service to WorkspaceView**:
  - [x] Replace the local validation functions in `WorkspaceView.vue` with a delegate call to `ValidationService`.
  - [x] Clean up unused imports and component declarations.

## Phase 4 — Testing/Verification

- [x] **Unit Tests Suite Run**:
  - [x] Run `npm --prefix packages/innfo-core run test` to verify parser and driver logic.
  - [x] Run `npm --prefix apps/innfo-editor run test` to verify stores, repositories, services, and dynamic rendering.
- [x] **Typecheck and Linting**:
  - [x] Run `npm run typecheck` across all monorepo packages.
  - [x] Run `npm run lint` and `npm run format:check` to ensure code style compliance.
- [x] **E2E Tests Verification**:
  - [x] Run `npm --prefix apps/innfo-editor run test:e2e` to confirm workspace, validation report, and edit/save functionalities operate correctly end-to-end.

## Review Workload Forecast

- **Estimated changed lines**: 500-700 lines
- **400-line budget risk**: High (large structural changes across core package, stores, views, and addition of new services and repository patterns)
- **Delivery strategy**: `single-pr`
- **Strategy exception/size**: `size:exception` approved by user (running all changes at once)
