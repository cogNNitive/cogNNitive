# Design: Unified Samples Workspace SSOT & Distribution Pipeline

## Architectural Topology

```
+-------------------------------------------------------------------------+
| Single Source of Truth (SSOT): _samples_nn/                              |
|                                                                         |
| - workspace_NN.md (Level 3 Workspace Model)                             |
| - models/ (Ghostbusters_*.md canonical domain models)                   |
| - procedures/ (Workspace-level procedures)                              |
| - sources/ (Normalized sources / mock input data)                       |
+------------------------------------+------------------------------------+
                                     |
                       Deterministic Projection via
                         scripts/sync-samples.mjs
                                     |
+------------------------------------v------------------------------------+
| Template Distribution Packages: iNNfo/specs/templates/                  |
|                                                                         |
| - analysis/samples/Ghostbusters_V_0-2-0_analysis_NN.md                  |
| - business/samples/Ghostbusters_V_0-2-3_business_NN.md                  |
| - business-model/samples/Ghostbusters_V_0-2-1_business-model_NN.md      |
| - documentation/samples/Ghostbusters_V_0-2-0_documentation_NN.md        |
| - innovation/samples/Ghostbusters_V_0-2-0_innovation_NN.md              |
| - metrics/samples/Ghostbusters_V_0-1-0_metrics_NN.md                    |
| - organization/samples/Ghostbusters_V_0-2-0_organization_NN.md          |
| - procedures/samples/Ghostbusters_V_0-2-0_procedures_NN.md              |
| - projects/samples/Ghostbusters_V_0-2-0_projects_NN.md                  |
| - repository/samples/Ghostbusters_V_0-1-0_repository_NN.md              |
| - video-generator/samples/Ghostbusters_V_0-1-0_video-generator_NN.md    |
+------------------------------------+------------------------------------+
                                     |
                      Verification Gate (scripts/verify.js)
                         --check flag ensures 0 drift
```

## Mapping Table

| Template | SSOT Model (`_samples_nn/models/`) | Template Target (`iNNfo/specs/templates/<template>/samples/`) |
|---|---|---|
| `analysis` | `Ghostbusters_analysis_NN.md` | `analysis/samples/Ghostbusters_V_0-2-0_analysis_NN.md` |
| `business` | `Ghostbusters_business_NN.md` | `business/samples/Ghostbusters_V_0-2-3_business_NN.md` |
| `business-model` | `Ghostbusters_business-model_NN.md` | `business-model/samples/Ghostbusters_V_0-2-1_business-model_NN.md` |
| `documentation` | `Ghostbusters_documentation_NN.md` | `documentation/samples/Ghostbusters_V_0-2-0_documentation_NN.md` |
| `innovation` | `Ghostbusters_innovation_NN.md` | `innovation/samples/Ghostbusters_V_0-2-0_innovation_NN.md` |
| `metrics` | `Ghostbusters_metrics_NN.md` | `metrics/samples/Ghostbusters_V_0-1-0_metrics_NN.md` |
| `organization` | `Ghostbusters_organization_NN.md` | `organization/samples/Ghostbusters_V_0-2-0_organization_NN.md` |
| `procedures` | `Ghostbusters_procedures_NN.md` | `procedures/samples/Ghostbusters_V_0-2-0_procedures_NN.md` |
| `projects` | `Ghostbusters_projects_NN.md` | `projects/samples/Ghostbusters_V_0-2-0_projects_NN.md` |
| `repository` | `Ghostbusters_repository_NN.md` | `repository/samples/Ghostbusters_V_0-1-0_repository_NN.md` |
| `video-generator` | `Ghostbusters_video-generator_NN.md` | `video-generator/samples/Ghostbusters_V_0-1-0_video-generator_NN.md` |

## Pipeline CLI & Integrity Verification

1. `scripts/sync-samples.mjs`:
   - `node scripts/sync-samples.mjs`: Synchronizes all models from `_samples_nn/models/` to `iNNfo/specs/templates/*/samples/`.
   - `node scripts/sync-samples.mjs --check`: Validates that template sample files are identical to `_samples_nn/models/`. Returns exit code 1 if drift is detected.
2. `package.json`:
   - `"sync:samples": "node scripts/sync-samples.mjs"`
   - `"check:samples": "node scripts/sync-samples.mjs --check"`
3. `scripts/verify.js`:
   - Runs `check:samples` as part of the core verification suite.
