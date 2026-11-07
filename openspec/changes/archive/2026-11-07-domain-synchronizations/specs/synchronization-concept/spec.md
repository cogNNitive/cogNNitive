# synchronization-concept Delta Spec

## ADDED Requirements

### Requirement: The `sources` bluepriNNt declares the Synchronization concept

The core `sources` bluepriNNt (`iNNfo/specs/bluepriNNts/sources/spec_NN.md`) MUST declare a concept `Synchronization` with the fields `alias`, `origin_uri`, `kind` and `state`. `alias` is a short name that identifies the synchronization inside the domaiNN. `origin_uri` (reused from `Source`, now declared for both concepts) is a local path, a network share path or a URL. `kind` MUST be one of `file` or `folder`. `state` MUST be one of `active` or `paused` (`status` is not used: it already exists on `Source` with other options). The domaiNN's sources catalog is `sources/sources_NN.md`. The bluepriNNt MUST bump only its `blueprint_version` (V_0-3-3 to V_0-4-0), and the bump MUST be propagated through `scripts/sync-versions.mjs`.

#### Scenario: Concept and fields are declared
- GIVEN the `sources` bluepriNNt after this change
- WHEN its schema is parsed
- THEN concept `Synchronization` exists with fields `alias`, `origin_uri`, `kind` and `state`
- AND `kind` accepts exactly `file` and `folder`
- AND `state` accepts exactly `active` and `paused`

#### Scenario: Invalid kind is rejected
- GIVEN a Synchronization element with `kind:: directory`
- WHEN the sources model is validated
- THEN a validation error names the `kind` field

#### Scenario: Version bump is propagated
- GIVEN the `sources` bluepriNNt with a bumped `blueprint_version`
- WHEN `node scripts/verify.js` runs
- THEN no version-square or registry check fails

### Requirement: Synchronization aliases are unique path-safe names

Within one domaiNN, each Synchronization `alias` MUST be unique and MUST be usable as a single folder name (no path separators, no `.` or `..`). The allowed character set is the slug character set. `readSynchronizations(text)` MUST return `SYNC_ALIAS_INVALID` and `SYNC_ALIAS_DUPLICATE` diagnostics; they are surfaced by `collectWorkspaceDiagnostics` and by the CLI, which refuses invalid aliases. A violating alias MUST NOT be used to build a mirror path.

#### Scenario: Duplicate alias is rejected
- GIVEN two Synchronization elements with `alias:: org`
- WHEN the sources model is read
- THEN a `SYNC_ALIAS_DUPLICATE` diagnostic reports the alias `org`

#### Scenario: Path-unsafe alias is rejected
- GIVEN a Synchronization element with `alias:: ../x`
- WHEN the sources model is read
- THEN a `SYNC_ALIAS_INVALID` diagnostic names the `alias` field
- AND no folder is created for it by a refresh

### Requirement: `init_domain` scaffolds the sources model

`planDomainScaffold` (and therefore `init_domain`) MUST create the domaiNN's sources catalog `sources/sources_NN.md` (a Level-3 document of the `sources` bluepriNNt, role `catalog`) and the `sources/sync/` directory in addition to the existing scaffold, so a Synchronization can be declared without first creating the model. The scaffolded model MUST contain no Synchronization element. A fresh domaiNN MUST remain accepted by `check_domain`.

#### Scenario: Fresh domain contains the sources model
- GIVEN an empty directory
- WHEN `init_domain` runs with `name: ACME`
- THEN `sources/sources_NN.md` exists and conforms to the `sources` bluepriNNt
- AND it has no Synchronization element
- AND `check_domain` reports no errors

### Requirement: Synchronization refreshes only on explicit demand

A Synchronization MUST be refreshed only when a user or agent explicitly asks for it. The system MUST NOT poll, schedule, watch the origin, or refresh as a side effect of opening, validating, exporting or scanning the domaiNN. Every other read operation MUST work from the existing mirror without contacting the origin.

#### Scenario: Validation does not touch the origin
- GIVEN an active Synchronization whose origin has changed since the last refresh
- WHEN `check_domain` or a console export runs
- THEN the mirror is unchanged
- AND the origin is not read

### Requirement: The origin is read-only

A refresh MUST only read the origin. It MUST NOT create, change or delete any file at the origin.

#### Scenario: Origin is untouched by a refresh
- GIVEN an origin folder with files
- WHEN a refresh completes
- THEN no file under the origin was created, changed or deleted

### Requirement: A paused Synchronization keeps its mirror

A refresh MUST skip a Synchronization whose `state` is `paused` and MUST report it as skipped. The existing mirror under `sources/sync/<alias>/` and the files already copied to `sources/import/` MUST remain in place, so references that point into the mirror continue to resolve.

#### Scenario: Paused synchronization is skipped
- GIVEN a paused Synchronization `org` with an existing mirror
- WHEN a refresh of `org` is requested
- THEN the refresh reports `org` as skipped
- AND the mirror files are unchanged
- AND no change payload is printed

#### Scenario: References into a paused mirror still resolve
- GIVEN a paused Synchronization `org` and a `reference` field pointing at a model in its mirror
- WHEN the consumer is validated
- THEN the reference resolves with no error

### Requirement: An unreachable origin keeps the previous mirror

When the origin of a Synchronization cannot be read during a refresh, the refresh MUST keep the previous mirror and previously copied files unchanged, MUST report a warning that names the alias and the origin, MUST NOT fail the refresh of other Synchronizations, and MUST make the command exit with code 1. It MUST NOT print a change payload for the unreachable Synchronization.

#### Scenario: Offline origin
- GIVEN an active Synchronization `org` whose origin path does not exist
- WHEN a refresh of all Synchronizations runs
- THEN a warning names `org` and its origin
- AND `sources/sync/org/` is unchanged
- AND the other Synchronizations are refreshed normally

### Requirement: Deleting a Synchronization removes its mirror

When a Synchronization element has been deleted, the next `--sync` run without an alias MUST remove the orphan mirror folder `sources/sync/<alias>/` (`removeOrphanMirrors`), report the removal, and print one `comment` change payload for it (applied by the agent, like any refresh payload). Files already copied to `sources/import/` are write-once artifacts and MUST be kept.

#### Scenario: Mirror removed on delete
- GIVEN a Synchronization `org` with a mirror and one copied PDF in `sources/import/`
- AND the Synchronization element is then deleted
- WHEN `--sync` runs without an alias
- THEN `sources/sync/org/` no longer exists
- AND the run prints a change payload recording the removal
- AND the copied PDF and its sidecar still exist

#### Scenario: Dangling references are ordinary errors after delete
- GIVEN a `reference` field pointing at a model in the removed mirror
- WHEN the consumer is validated
- THEN an ordinary broken-reference error is reported for that field
