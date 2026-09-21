# Proposal: Reorder Workspace Template Concepts

## Intent
Align the Level 2 Workspace template (`workspace_spec_NN.md`) with modern hierarchical navigation and qualified reference semantics by:
1. Reordering concepts to prioritize navigability and structure (`Models` first, down to `Tags`).
2. Pluralizing `Tag` to `Tags` across workspace templates and fixtures.
3. Setting concept badge colors to `grey` across supporting concepts while highlighting `Models` in `purple`.
4. Removing redundant macro-level lineage matrices (`Artifact-Source Lineage` and `Model-Source Lineage`) in favor of granular qualified references (`[[Model Title :: Element Name]]`).

## Scope
- **In Scope**:
  - Reorder concepts and adjust metadata weights/colors in `iNNfo/specs/templates/workspace_spec_NN.md` and synced copies (`skills/nn-innfo/templates/workspace_spec_NN.md`, test fixtures):
    - `Models` (weight 95, purple)
    - `Templates` (weight 90, grey)
    - `Specs` (weight 85, grey)
    - `Sources` (weight 80, grey)
    - `Procedures` (weight 75, grey)
    - `Artifacts` (weight 70, grey)
    - `Skills` (weight 65, grey)
    - `Tools` (weight 60, grey)
    - `Tags` (weight 50, grey, pluralized from `Tag`)
  - Remove macro-lineage matrix tables from workspace templates.
  - Update occurrences and sample tables referencing `Tag` to `Tags`.
  - Verify workspace template integrity and test suites (`npm --prefix iNNfo run test`, `node scripts/check-integrity.js`).
- **Out of Scope**:
  - Modifying other Level 2 domain templates (e.g., business, procedures, requirements).
  - Altering `innfo-core` qualified reference parser implementation.

## Capabilities
### Modified Capabilities
- `workspace-template-spec`: Updated concept ordering, pluralized `Tags` concept name, focused accent color scheme (`Models` highlighted in purple, others in grey), and eliminated redundant macro matrices in favor of model-level element references.

## Approach
1. **Template Restructuring**: Update `iNNfo/specs/templates/workspace_spec_NN.md` concept definitions, weights, and badge colors; rename section `### Tag` to `### Tags` and adjust sample references.
2. **Matrix Elimination**: Drop `### Artifact-Source Lineage` and `### Model-Source Lineage` tables from the template structure.
3. **Template Synchronization**: Mirror updates to `skills/nn-innfo/templates/workspace_spec_NN.md` and affected test fixtures.
4. **Validation**: Execute integrity checks and test suites to verify schema validity and clean parsing.

## Affected Areas
- `iNNfo/specs/templates/workspace_spec_NN.md`
- `skills/nn-innfo/templates/workspace_spec_NN.md`
- `iNNfo/apps/innfo-editor/tests/fixtures/**`
- `iNNfo/packages/innfo-core/tests/fixtures/**`

## Risks
- **Fixture Mismatch**: Existing parser/validator unit tests might expect `Tag` (singular) or macro matrix headers. *Mitigation*: Update all associated fixture specs and test assertions in lockstep.

## Rollback Plan
Revert changes to `workspace_spec_NN.md` and related fixtures via git.

## Dependencies
- None.

## Success Criteria
- [ ] `workspace_spec_NN.md` lists concepts in specified order (`Models` -> `Tags`) with designated weights and colors (`purple` for `Models`, `grey` for others).
- [ ] Concept `Tag` is renamed to `Tags`.
- [ ] Macro-lineage matrix sections are removed.
- [ ] Synced copies and test fixtures are updated and consistent.
- [ ] `npm --prefix iNNfo run test` and `node scripts/check-integrity.js` pass cleanly.
