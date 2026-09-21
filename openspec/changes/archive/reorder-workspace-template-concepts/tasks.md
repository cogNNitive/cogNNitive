# Tasks: Reorder Workspace Template Concepts

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~150–200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |
| Chain strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

---

## Phase 1: Foundation / Preparation

- [x] 1.1 Verify baseline test and integrity status by running `npm --prefix iNNfo run test` and `node scripts/check-integrity.js`.
- [x] 1.2 Review `iNNfo/specs/templates/workspace_spec_NN.md` structure and catalog references to singular `Tag` and macro lineage matrices.

## Phase 2: Core Implementation

- [x] 2.1 Update canonical template `iNNfo/specs/templates/workspace_spec_NN.md`:
  - Reorder `# NN index` and `# NN Concept Definition` sections to: `Workspace` (weight 100), `Models` (weight 95), `Templates` (weight 90), `Specs` (weight 85), `Sources` (weight 80), `Procedures` (weight 75), `Artifacts` (weight 70), `Skills` (weight 65), `Tools` (weight 60), `Tags` (weight 50).
  - Set badge colors: `color:: purple` for `Models`, `color:: grey` for all other concepts.
  - Pluralize `Tag` to `Tags` across index (`* [[Tags]]`), concept header (`## NN Concept Definition: Tags`), field definitions (`concept:: Tags`), and sample snippet (`# NN Tags`).
  - Remove macro lineage matrices (`Artifact-Source Lineage` and `Model-Source Lineage`).
- [x] 2.2 Synchronize bundled templates and test fixtures:
  - Copy updated template to `skills/nn-innfo/templates/workspace_spec_NN.md`.
  - Copy updated template to `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/templates/workspace_spec_NN.md`.
- [x] 2.3 Update sample workspace models and manifests from `Tag` to `Tags`:
  - Update `_samples_nn/workspace_NN.md` (`* [[Tags]]`, `# NN Tags`, `## NN Tags:`).
  - Update `docs/workspace_NN.md` (`* [[Tags]]`, `# NN Tags`, `## NN Tags:`).
  - Update `iNNfo/specs/templates/base/samples/workspace_NN.md`.
  - Update `workspace_NN/workspace_NN.md`.
  - Update `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/workspace_NN.md`.

## Phase 3: Verification / Testing

- [x] 3.1 Run Vitest test suites via `npm --prefix iNNfo run test` across `innfo-core`, `innfo-editor`, and `innfo-mcp`.
- [x] 3.2 Run repository integrity checks via `node scripts/check-integrity.js`.
- [x] 3.3 Validate template parity with `node scripts/manifest/check-parity.js`.
- [x] 3.4 Confirm no regressions or broken references across sample workspace models.
