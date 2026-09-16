# Proposal: Merkle Lineage, Distributed Submodels & Workspace Lifecycle (Slice 3)

## Context & Motivation

Slice 3 introduces advanced capabilities built on top of the unified model hierarchy (Slice 1) and single-root navigation (Slice 2): Merkle-tree cryptographic invalidation, distributed remote URI resolution, and FSM-driven workspace lifecycle governance.

## Proposed Changes

1. **Merkle-Tree Lineage & Stale Invalidation (`innfo-core`)**:
   - Container models compute aggregate Merkle hashes from leaf model hashes.
   - When a source SHA-256 changes, all dependent artifacts are automatically flagged as `status: stale` in $O(1)$ time.

2. **Distributed Model Resolver & Reusable Includes**:
   - `type:: model` supports universal URI schemes (`https://`, `git://`).
   - Enables importing corporate standard procedure libraries and base templates as remote submodels.

3. **FSM Workspace Lifecycle & Matrix Coverage Gates**:
   - `workspace_NN.md` defines maturity stages: `[draft, ingesting, modeling, verified, ready]`.
   - Transitions are gated by mathematical coverage thresholds over relationship matrices (`Artifacts × Procedures`, `Artifacts × Sources`, `Models × Sources`).
