# Spec: Merkle Lineage, Distributed Submodels & Workspace Lifecycle (Slice 3)

## Specification Requirements

### Requirement 1: Merkle Invalidation Engine (`innfo-core`)
- **Leaf Hashes**: Every normalized source and artifact publishes its SHA-256 hash.
- **Merkle Aggregate**: Container models compute an aggregate SHA-256 hash.
- **Stale Detection**: The validator updates `Artifact.status` to `stale` if any input source's current hash differs from the hash recorded at artifact generation.

### Requirement 2: Distributed Model Resolver (`innfo-core`)
- **Remote URIs**: `type:: model` values matching `https://...` or `git://...` are fetched by the model driver and cached locally.
- **Template Includes**: Level 2 templates can compose base definitions via remote URIs.

### Requirement 3: Workspace Lifecycle & Coverage Gates (`workspace_spec_NN.md`)
- **Concept `Workspace.lifecycle_state`**: `[draft, ingesting, modeling, verified, ready]`.
- **Promotion Gates**: Automated check verifying that 100% of artifacts have valid `produced_by` procedures and un-stale inputs before allowing transition to `ready`.
