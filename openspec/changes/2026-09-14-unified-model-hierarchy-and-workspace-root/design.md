# Design: Unified Model Hierarchy & Workspace Root Architecture (Slice 1)

## Metamodel Topology

```
+-------------------------------------------------------------+
|               workspace_NN.md (Root Model)                  |
|                                                             |
|  - [[Models]]      -> models_NN.md (type:: model)           |
|  - [[Sources]]     -> sources_NN.md (type:: model)          |
|  - [[Procedures]]  -> procedures_NN.md (type:: model)       |
|  - [[Artifacts]]   -> artifacts_NN.md (type:: model)        |
+------------------------------+------------------------------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
+------v------+         +------v------+         +------v------+
| sources_NN  |         | procedures  |         | artifacts   |
| .md (Model) |         |_NN.md(Model)|         |_NN.md(Model)|
| * summary   |         | * summary   |         | * summary   |
+------+------+         +------+------+         +------+------+
       |                       |                       |
  source_model          procedure_model          artifact_model
 (type:: model)         (type:: model)          (type:: model)
       |                       |                       |
+------v--------------+ +------v--------------+ +------v--------------+
| sources/nn/doc1_NN  | | procedures/proc1_NN | | artifacts/models/   |
| (iNNfo Model)       | | (iNNfo Model)       | | rep1_NN (iNNfo Mod) |
| - sha256 (frontm.)  | | - FSM stepper       | | - W3C PROV frontm.  |
+---------------------+ +---------------------+ +---------------------+
```

## Layer 1: Core Engine & Topology (`innfo-core`)

1. **Lightweight Topology Scanner**:
   - Parses model references (`type:: model`) to construct a DAG of models.
   - Calculates in-degree per model. Identifies root models (`in_degree === 0`).
   - Recursion depth guard (`MAX_DEPTH = 10`) prevents circular loops.

2. **Recursive Path Resolution**:
   - Resolves submodels anywhere in the directory hierarchy (`sources/nn/`, `procedures/`, `artifacts/models/`).

## Layer 2: Template Specifications (`innfo/specs/templates/`)

1. **`workspace_spec_NN.md`**: Upgraded with explicit `type:: model` links for `Models`, `Sources`, `Procedures`, `Artifacts`.
2. **`sources_spec_NN.md`**: Level 2 template defining `Source` with `summary`, `source_model`, `raw_path`, `origin_uri`.
3. **`procedures_spec_NN.md`**: Level 2 template listing workflows with `summary`, `inputs_required`, `outputs_expected`, `procedure_model`.
4. **`artifacts_spec_NN.md`**: Level 2 template defining `Artifact` outputs, supporting `artifact_model`.
