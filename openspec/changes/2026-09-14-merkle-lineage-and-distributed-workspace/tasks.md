# Tasks: Merkle Lineage, Distributed Submodels & Workspace Lifecycle (Slice 3)

- [ ] 1. Merkle Engine & Stale Invalidation (`innfo-core`)
  - [ ] 1.1 Implement Merkle hash calculation across models in `innfo-core`.
  - [ ] 1.2 Implement automatic `stale` invalidation in `validator/workspaceReferences.ts`.
  - [ ] 1.3 Add unit tests for Merkle invalidation in `innfo-core/tests/`.

- [ ] 2. Distributed URI Model Resolver
  - [ ] 2.1 Implement URI scheme handler (`https://`, `git://`) in model driver with caching.
  - [ ] 2.2 Add unit tests for remote model fetching and schema includes.

- [ ] 3. Workspace Lifecycle & Matrix Coverage Gates
  - [ ] 3.1 Implement matrix coverage calculator in `innfo-core`.
  - [ ] 3.2 Add FSM lifecycle gate checks in `workspace_spec_NN.md`.

- [ ] 4. UI Indicators
  - [ ] 4.1 Render `stale` badges on invalidated artifacts in `LeftSidebar.vue`.
  - [ ] 4.2 Display workspace lifecycle state indicator in `WorkspaceView.vue`.
