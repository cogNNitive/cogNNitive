# changes-collection Specification

## Purpose
TBD - created by archiving change changes-as-collection. Update Purpose after archive.
## Requirements
### Requirement: Changes is a declared collection

The `changes` blueprint MUST declare `nature: { structure: members, ownership: derived }`. The console MUST materialize exactly one unit per `Change` across all batch documents, each carrying `op`, `target`, `from`, `to`, `author`, `status`, `evidence` and `applied_at`; the batch document MUST be the grouping, not a separate unit.

#### Scenario: One unit per change
- GIVEN a domain with two batch documents holding 3 changes total
- WHEN the console is exported
- THEN exactly 3 `Change` units exist
- AND each carries its `op`, `target`, `from`, `to`, `author`, `status` and `evidence`

#### Scenario: Stable unique ids
- GIVEN a change `c-01` in batch `testlab_lucas_20261012T173127Z`
- WHEN its unit id is built
- THEN it is `testlab_lucas_20261012T173127Z#c-01` and is unique site-wide

### Requirement: No builtin Changes tab

The console MUST NOT ship a builtin `review`/`Changes` tab. Change units MUST be reachable through the standard rail, search and facets, and MUST render in the standard element sheet with a `status` badge.

#### Scenario: Tab absent
- GIVEN a domain with changesets
- WHEN the console renders
- THEN no builtin tab titled `Changes` exists

#### Scenario: Unit opens in the standard sheet
- GIVEN a `Change` unit
- WHEN it is selected
- THEN the standard element sheet opens with its fields and a read-only affordance (no edit pencil)

### Requirement: Pending drafts are runtime units

A local (unsent) draft MUST render as a `pending` unit of the collection, injected by the runtime from the draft store, with a discard action; it MUST NOT expose an edit pencil. Applied units MUST be read-only.

#### Scenario: Draft is a pending unit
- GIVEN a reviewer draft on an element
- WHEN the console renders
- THEN a `pending` unit for that draft appears with a discard action and no edit pencil

### Requirement: Per-element history is preserved

The per-element change history (`el.history`) MUST remain available and unchanged by this change.

#### Scenario: History intact
- GIVEN an element with recorded changesets
- WHEN the console renders
- THEN its element history is present as before

### Requirement: The `changes` collection is unaffected by the storage declaration

The `changes` bluepriNNt MUST keep `nature: { structure: members, ownership: derived }`. Existing `nature` declarations of `sources`, `artifacts`, `procedures` and `changes` MUST parse and mean what they mean today, whether or not design reuses `nature.structure` for storage. A `Change` unit MUST keep its address and rendering (`<batch>#<change-id>`). The changeset documents under `changes/` MUST NOT be classified as instance models.

#### Scenario: Changes declaration unchanged
- GIVEN the `changes` bluepriNNt after this change
- WHEN its `nature` is parsed
- THEN it is `structure: members`, `ownership: derived` and no diagnostic is emitted

#### Scenario: One unit per change
- GIVEN a domaiNN with two batch documents holding 3 changes in total
- WHEN the console is exported
- THEN exactly 3 `Change` units exist, with ids of the form `<batch>#<change-id>`

#### Scenario: Changeset is not an instance model
- GIVEN a changeset under `changes/`
- WHEN models are classified against declared placements
- THEN it is not an instance model and no placement finding is reported

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

