# Proposal: Workspace Single-Root Navigation & 3-Tier Progressive Disclosure (Slice 2)

## Context & Motivation

With Slice 1 providing unified Level 2/3 models and core topology, Slice 2 connects the user interface (`innfo-editor`) and AI agent skills (`nn-innfo`, `nn-trannsform`) to this model hierarchy.

## Proposed Changes

1. **UI Tree Navigation (`innfo-editor`)**:
   - Refactor `LeftSidebar.vue` to display exclusively top-level models (In-Degree = 0, default `workspace_NN.md`).
   - Implement lazy loading on node expansion for concepts with `type:: model`.
   - Provide reactive spinner feedback during asynchronous model fetching.
   - Retire ad-hoc navigation sidebars in favor of unified recursive tree navigation.

2. **3-Tier Progressive Disclosure for AI Skills**:
   - Update `.agents/skills/nn-innfo/` and `.agents/skills/nn-trannsform/` to query workspaces using the 3-Tier protocol:
     - **Tier 1 (Overview)**: Read `workspace_NN.md` (root topology).
     - **Tier 2 (Catalogs)**: Read `sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md` to evaluate indexed `summary` fields with zero file I/O overhead.
     - **Tier 3 (Deep Read)**: Read target leaf models on-demand only.
