# Design: Reorder Workspace Template Concepts

## Technical Approach
Restructures the Level 2 Workspace specification template (`workspace_spec_NN.md`) and synchronizes downstream templates, fixtures, and sample manifests across the repository:

1. **Concept Hierarchy & Weights**: Reorder `# NN index` and concept definitions so `Models` (weight 95) immediately follows `Workspace` (weight 100), followed by `Templates` (90), `Specs` (85), `Sources` (80), `Procedures` (75), `Artifacts` (70), `Skills` (65), `Tools` (60), and `Tags` (50).
2. **Visual Styling**: Set `Models` badge color to `purple` (visual accent for primary entity) and all supporting concepts (`Workspace`, `Templates`, `Specs`, `Sources`, `Procedures`, `Artifacts`, `Skills`, `Tools`, `Tags`) to `grey`.
3. **Pluralization of `Tags`**: Standardize taxonomy concept name from singular `Tag` to plural `Tags` across index entries (`* [[Tags]]`), concept definitions (`## NN Concept Definition: Tags`), field bindings (`concept:: Tags`), and template sample snippets (`# NN Tags`, `## NN Tags: <TagName>`).
4. **Macro-Lineage Matrix Elimination**: Remove `# NN Matrix Definition` blocks (`Artifact-Source Lineage`, `Model-Source Lineage`) from the workspace spec template.
5. **Multi-Store Synchronization**: Mirror changes across canonical spec, skill bundled templates, test fixtures, and sample workspace files.

## Architecture Decisions

| Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| **Concept Prioritization** | Place `Models` at weight 95 right under `Workspace` (100) | Domain models are the primary semantic and navigational entities; prioritizing them matches user workflow and hierarchical navigation needs. | Retain compiler-centric order with `Specs` / `Templates` at the top |
| **Focused Accent Styling** | `Models:: purple`, all other concepts `grey` | Prevents cognitive overload and visual clutter in navigation sidebars and DAG graphs by highlighting primary domain assets while muting infrastructure nodes. | Rainbow palette with distinct colors per concept |
| **Concept Pluralization** | Pluralize `Tag` to `Tags` | Enforces naming consistency with other collection concepts (`Models`, `Templates`, `Specs`, `Sources`, `Procedures`, `Artifacts`, `Skills`, `Tools`). | Retain singular `Tag` |
| **Lineage Strategy (Micro vs Macro)** | Eliminate root-level matrices; rely on granular qualified references (`[[Model Title :: Element Name]]`) | Workspace root matrices are coarse, high-maintenance, and prone to drift. Granular qualified references within domain models and artifact specifications provide exact, parseable provenance without duplication. | Retain macro matrix projection tables in workspace spec |

## File Changes

| File Path | Action | Description |
|---|---|---|
| `iNNfo/specs/templates/workspace_spec_NN.md` | Modify | Reorder concepts/weights/colors, pluralize `Tag` $\rightarrow$ `Tags`, remove macro matrices, update Level 3 sample snippet. |
| `skills/nn-innfo/templates/workspace_spec_NN.md` | Modify | Synchronize bundled copy with canonical workspace spec. |
| `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/templates/workspace_spec_NN.md` | Modify | Synchronize fixture copy of workspace spec. |
| `_samples_nn/workspace_NN.md` | Modify | Update index and section headers from `Tag` to `Tags`. |
| `docs/workspace_NN.md` | Modify | Update index and section headers from `Tag` to `Tags`. |
| `iNNfo/specs/templates/base/samples/workspace_NN.md` | Modify | Align concept structure and references with updated template. |
| `workspace_NN/workspace_NN.md` | Modify | Update root manifest to `# NN Tags` and `* [[Tags]]`. |
| `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/workspace_NN.md` | Modify | Update fixture manifest to `# NN Tags` and `* [[Tags]]`. |

## Testing Strategy

| Layer | Target | Approach |
|---|---|---|
| **Monorepo Test Suite** | `npm --prefix iNNfo run test` | Run full test suite across `innfo-core`, `innfo-editor`, and MCP packages to verify parsing, AST creation, and fixture compatibility. |
| **Repository Integrity** | `node scripts/check-integrity.js` | Validate repository parity, immutability guards, template inventory, line counts, and script typechecks. |
| **Template Parity** | `scripts/manifest/check-parity.js` | Ensure bundled templates and manifest registrations match canonical specs with zero drift. |

## Migration / Rollout

1. Update canonical template `iNNfo/specs/templates/workspace_spec_NN.md`.
2. Sync bundled copies in `skills/nn-innfo/templates/` and test fixtures.
3. Update sample manifests and documentation files to use `Tags`.
4. Run verification gates (`npm --prefix iNNfo run test` and `node scripts/check-integrity.js`).
5. **Rollback**: Revert modified files via git if regressions occur during testing or validation.
