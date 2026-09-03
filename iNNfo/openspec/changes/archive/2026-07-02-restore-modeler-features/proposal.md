# SDD Proposal: Restore Modeler Features

## Intent
Restore key features from the archived file-format repository into the unified iNNfo workspace (apps/format-editor), while resolving a critical usability regression in the matrices selector.

## Problem
1. Users see "Select a matrix from the sidebar to begin" in the matrices view, but there is NO sidebar selector â€” a deadlock.
2. The right guidance panel shows a static placeholder instead of real metamodel-driven content.
3. The Save & Version Bump dropdown exists but `bumpVersion()` is a no-op placeholder.

## Scope
### In Scope
- LeftSidebar: Add "Relations" section listing configured matrices with MatrixPill and navigation to MetamatrixConfig
- MatricesGrid: Fix conditional rendering so dropdown is visible even when no matrix is selected
- RightGuidanceSidebar: Wire to metamodelStore, documentation parser, show methodology content, associated matrices, copyable prompts
- metamodelStore: Add documentation loading from workspace directory `docs/documentation/templates/{name}/{version}/documentation.md`, expose guidance helpers
- Header / workspaceStore: Implement `saveActiveFile` and `saveActiveFileWithVersionBump` using recursiveSerializer, version.ts helpers, and File System Access API

### Out of Scope
- Graph view improvements
- New matrix types or widgets
- Cross-workspace features

## Proposed Changes

### LeftSidebar.vue
- Import ChevronRight, BarChart2, Settings icons
- Add collapsible "Relations" section beneath the "Model" tree
- List configured matrices using MatrixPill.vue
- Add navigation buttons to "Metamatrix Config"
- Emit select-matrix and select-view events

### MatricesGrid.vue
- Fix conditional rendering: show the dropdown selector even if activeMatrixIndex < 0

### RightGuidanceSidebar.vue
- Wire to useModelStore, useUiStore, and metamodelStore
- Implement "Associated Matrices" listing
- Render copyable suggested prompts with code-copy buttons
- Parse and render methodology summary, description, related methodologies

### metamodelStore.ts
- Add documentation state and loading logic
- Add helper to parse documentation.md
- Expose getConceptGuidance(), getCleanPrompts(), getMatrixGuidance()

### Header.vue
- Wire version bump buttons to workspaceStore.saveActiveFileWithVersionBump
- Use version.ts helpers (bumpVersion, parseFormatFilename, buildFormatFilename)

### workspaceStore.ts
- Implement saveActiveFile and saveActiveFileWithVersionBump actions
- Call recursiveSerialize on dirty nodes
- Handle version bump by renaming source path, updating frontmatter modelVersion
