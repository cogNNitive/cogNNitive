# changes-collection Delta Spec

## ADDED Requirements

### Requirement: Changesets under `sources/` are excluded from the collection

The `changes` collection MUST NOT contain changesets located under the root `sources/` folder. A file named like a changeset (`*_changes_NN.md`) found under `sources/` (including `sources/sync/` and `sources/import/`) MUST NOT produce `Change` units, MUST NOT be loaded by the change log, and MUST NOT be classified as an instance model. The path-based decision MUST be made by `isChangesetPath`. See `synchronization-refresh-change` for the scenarios on lineage pruning.

#### Scenario: Copied changeset yields no units
- GIVEN `sources/sync/org/changes/x_changes_NN.md` containing 3 changes
- WHEN the console is exported
- THEN the `Change` units are exactly those of the domaiNN's own `changes/` folder
- AND none carries an id derived from `x_changes_NN`

#### Scenario: Own changesets are unaffected
- GIVEN a domaiNN with two batch documents under `changes/` holding 3 changes
- WHEN the console is exported
- THEN exactly 3 `Change` units exist
