# Design: Merkle Lineage, Distributed Submodels & Workspace Lifecycle (Slice 3)

## Merkle Tree & Distributed Graph Architecture

```
+-------------------------------------------------------------------------+
|                       workspace_NN.md (Root Model)                      |
|                                                                         |
|  * Merkle Root Hash: H(Models || Sources || Procedures || Artifacts)    |
|  * Lifecycle FSM: [draft -> ingesting -> modeling -> verified -> ready] |
|                                                                         |
|  - [[Models]]      -> models_NN.md (type:: model)                       |
|  - [[Sources]]     -> sources_NN.md (type:: model)                      |
|  - [[Procedures]]  -> procedures_NN.md (type:: model | https://...)     |
|  - [[Artifacts]]   -> artifacts_NN.md (type:: model)                    |
+------------------------------------+------------------------------------+
                                     |
       +-----------------------------+-----------------------------+
       |                             |                             |
+------v------+               +------v------+               +------v------+
| sources_NN  |               | procedures  |               | artifacts   |
| .md (Model) |               |_NN.md(Model)|               |_NN.md(Model)|
| * Merkle H_S|               | * Merkle H_P|               | * Merkle H_A|
+------+------+               +------+------+               +------+------+
       |                             |                             |
  source_model                 procedure_model              artifact_model
 (type:: model)               (type:: model | uri)          (type:: model)
       |                             |                             |
+------v--------------+       +------v--------------+       +------v--------------+
| sources/nn/doc1_NN  |       | Remote/Local Proc   |       | artifacts/models/   |
| (iNNfo Model)       |       | (iNNfo Model)       |       | rep1_NN (iNNfo Mod) |
| - sha256 (leaf)     |       | - FSM stepper       |       | - Stale invalidation|
+---------------------+       +---------------------+       +---------------------+
```

## Layer 1: Core Engine & Merkle Invalidation (`innfo-core`)

1. **Merkle Invalidation Engine**:
   - Compares artifact provenance input hashes with current source hashes.
   - Updates `Artifact.status` to `stale` on drift.
2. **Distributed Model Resolver**:
   - Handles network downloads and caching for remote `https://` / `git://` models.
3. **Coverage Engine**:
   - Calculates relationship matrix density to evaluate lifecycle gates.
