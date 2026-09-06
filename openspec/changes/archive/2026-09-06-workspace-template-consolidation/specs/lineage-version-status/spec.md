# Delta for Lineage Version Status

## MODIFIED Requirements

### Requirement: New lineage records reference current spec versions

`provenance-model.js` MUST point new lineage records at the canonical fused workspace template: `TEMPLATE_URL` MUST reference `.../workspace_V_0-3-0_spec_NN.md` and `TEMPLATE_NAME` MUST be `workspace_V_0-3-0_spec_NN`. New records MUST use the filename suffix `_workspace_NN.md` instead of `_cogNNitive_NN.md`. New records MUST set `model_version: "V_0-2-0"` and MUST reference `iNNfo_V_0-2-1_NN.md` as the specification URL. The `cogNNitive_V_0-2-0_NN.md` template is frozen and legacy: it MUST remain byte-identical and MUST NOT be referenced by newly generated lineage records.
(Previously: new records pointed at `cogNNitive_V_0-2-0_NN.md` with `_cogNNitive_NN.md` filenames.)

#### Scenario: New record uses canonical workspace URLs and suffix
- GIVEN a project with no lineage record
- WHEN `buildProvenanceModel` runs
- THEN the record's `parent_spec.url` references `workspace_V_0-3-0_spec_NN.md`, `specification_url` references `iNNfo_V_0-2-1_NN.md`, and `model_version` is `V_0-2-0`
- AND the record filename ends in `_workspace_NN.md`

#### Scenario: Write-once templates untouched
- GIVEN the change is applied
- WHEN the git diff of `iNNfo/specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md` and `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md` is inspected
- THEN it is empty for both files

## ADDED Requirements

### Requirement: Workspace-Conforming Lineage Records Are Excluded from Manifest Reconciliation

`innfo-core` workspace discovery MUST classify model files whose name matches `/^(cognnitive|workspace)(_|$)/i` as workspace-conforming lineage records via a non-navigation exclusion matcher. Such records MUST NOT be treated as navigation candidates and MUST NOT be included in workspace manifest reconciliation.

#### Scenario: Lineage record stays out of manifest reconciliation
- GIVEN a lineage record named `<project>_V_0-2-0_workspace_NN.md` in the workspace
- WHEN `discoverModels.ts` scans the workspace
- THEN the record is matched by the non-navigation exclusion matcher
- AND it is not treated as a workspace manifest candidate