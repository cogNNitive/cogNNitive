# prune_changesets Specification

## Purpose

Specify the `prune_changesets` MCP tool, which removes changeset files from `changes/` that are finished and no longer cited, without ever deleting a changeset that still holds pending work.

## Requirements

### Requirement: Only finished, unreferenced changesets are pruned

`prune_changesets` MUST scan `kNNowledge/*.md` and the root `domaiNN_NN.md` for references of the form `changes/<file>_NN.md` and treat every referenced changeset as kept. Of the remaining files in `changes/`, it MUST delete a file only when it parses as a changeset and its frontmatter `status` is terminal: `applied` or `rejected`.

It MUST NEVER delete a changeset whose status is `proposed`, `conflict` or `partially_applied` (pending work, or conflicts awaiting a new changeset), and it MUST NEVER delete a file it cannot parse as a changeset (its state cannot be proven finished). Every file it does not delete is reported in `kept`.

#### Scenario: Pending changesets survive
- GIVEN unreferenced changesets in `changes/` with statuses `proposed`, `conflict` and `partially_applied`
- WHEN `prune_changesets` runs
- THEN none of them is deleted
- AND all of them are listed in `kept`

#### Scenario: Finished unreferenced changesets are deleted
- GIVEN unreferenced changesets with statuses `applied` and `rejected`
- WHEN `prune_changesets` runs
- THEN both are deleted and listed in `deleted`

#### Scenario: A cited changeset is kept whatever its status
- GIVEN an `applied` changeset cited by `sources::` in a model under `kNNowledge/`
- WHEN `prune_changesets` runs
- THEN it is kept

#### Scenario: An unreadable file is kept
- GIVEN a file in `changes/` whose content is not a valid changeset
- WHEN `prune_changesets` runs
- THEN it is kept and listed in `kept`

### Requirement: Dry run

With `dryRun: true` the tool MUST compute and report the same `deleted` and `kept` sets and MUST NOT delete or write any file.

#### Scenario: Dry run deletes nothing
- GIVEN an unreferenced `applied` changeset
- WHEN `prune_changesets` runs with `dryRun: true`
- THEN the result lists it in `deleted` and the file still exists

### Requirement: Manifest refresh only

After a live run that deleted at least one file, the tool MUST reconcile the domain manifest (`syncDomainManifest`). It MUST NOT regenerate `index.md` or the domain console; a failure of the reconciliation MUST NOT change the result.

#### Scenario: Manifest reconciled after deletion
- GIVEN a live run that deleted a changeset
- THEN the domain manifest is reconciled
- AND no `index.md` or console file is written by the tool
