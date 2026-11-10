# changeset-apply-engine Delta Spec

The staleness check reads the change log once per apply, in the canonical order. Today it picks the "newest 50" changesets by filename, which is not time order because filename prefixes differ (workspace id, model slug, batch name), and it re-reads those files for every change of the batch.

## ADDED Requirements

### Requirement: Staleness reads the whole applied log once per apply

The staleness check of `partitionChangeset` MUST answer every change of one apply from one change log built once for that apply, ordered by `compareChanges`, and MUST NOT bound the log by a count of changesets or order changesets by filename.
Each changeset file under `changes/` MUST be read and parsed at most once per apply.
A deletion recorded in any applied changeset MUST be seen by the staleness check, whatever the changeset's filename and however many changesets the domaiNN holds.

#### Scenario: A deletion in an early-sorting changeset is seen
- GIVEN a domaiNN with 60 applied changesets where `remove_element` of `m@x` is recorded in `inntake-nn_lucas_20261110T120000Z_changes_NN.md` and the other 59 filenames sort after it
- WHEN a changeset with an `update_field` on `m@x&topics` and a `base_version` older than that removal is applied
- THEN the change is a conflict with `STALE_TARGET_DELETED`

#### Scenario: The log is parsed once per apply
- GIVEN a domaiNN with 20 changeset files and a changeset of 500 changes that each need the staleness check
- WHEN the changeset is applied
- THEN each of the 20 files is parsed at most once during that apply

#### Scenario: A re-added element is alive
- GIVEN `m@x` removed and later added again by applied changes in different changesets
- WHEN a change on `m@x&topics` is checked
- THEN it is not stale
