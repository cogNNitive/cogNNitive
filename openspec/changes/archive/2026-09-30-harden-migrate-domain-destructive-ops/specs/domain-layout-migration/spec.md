# Delta for domain-layout-migration

## Archive handling

No living spec exists at `openspec/specs/domain-layout-migration/spec.md`. The full spec lives only in `openspec/changes/archive/2026-09-29-nn-level-nomenclature-rename/specs/domain-layout-migration/spec.md`, and it was never synced.

This delta is standalone. On archive:

1. Create `openspec/specs/domain-layout-migration/spec.md` with a `## Purpose` and a `## Requirements` section.
2. Treat every MODIFIED block below as a full requirement, because there is no baseline to replace, and copy it in as written.
3. Copy the ADDED blocks in as written.
4. Do NOT copy the other requirements of the archived delta from this change. Syncing them is a separate housekeeping task.

This code is removed by `nn-quarantine-removal`, which will delete the living spec together with it.

## ADDED Requirements

### Requirement: Legacy directory cleanup never deletes content

After the migration moves content, it MUST remove only legacy directories that are empty, bottom-up. It MUST NOT delete any file. Every legacy path that still holds content MUST be reported and recorded in the journal as a leftover. A run that only has leftovers MUST finish as success with warnings, and the leftovers MUST stay on disk.

#### Scenario: Unmigrated file survives
- GIVEN a legacy domain with an unmigrated file under `models/`
- WHEN the migration is applied
- THEN that file is still on disk with identical bytes
- AND its path is printed and journaled as a leftover
- AND the run exits as success with warnings

#### Scenario: Empty legacy dirs are removed
- GIVEN a legacy directory tree whose content was all moved
- WHEN cleanup runs
- THEN those directories no longer exist
- AND no leftover is reported

### Requirement: Opaque files are moved byte-for-byte

A file MUST be treated as opaque (binary) if strict UTF-8 decoding of its bytes fails, or if it has a known binary extension. The planner MUST emit only a `move` for an opaque file, and MUST NOT rewrite its content.

#### Scenario: Binary by extension
- GIVEN a `.png` file under `models/` whose bytes happen to be valid UTF-8
- WHEN the migration is applied
- THEN the file sits at its migrated path with the same sha256

#### Scenario: Binary by invalid encoding
- GIVEN a file with an unknown extension and invalid UTF-8 bytes
- WHEN the migration is applied
- THEN its sha256 is unchanged and no U+FFFD is introduced

### Requirement: specs/templates is reported, never deleted

The migration MUST leave `specs/templates/` untouched and MUST report it as not migrated in the dry-run and in the apply report. Cleanup MUST NOT remove it.

#### Scenario: specs/templates kept
- GIVEN a legacy domain with `specs/templates/x_NN.md`
- WHEN the migration is applied
- THEN `specs/templates/x_NN.md` is byte-identical afterwards
- AND the reports list `specs/templates/` as not migrated

### Requirement: Restore refuses a foreign backup

Restore MUST read the domain path recorded in the journal and MUST refuse, without writing, a backup that belongs to a different domain.

#### Scenario: Backup of another domain
- GIVEN a backup whose journal names domain A
- WHEN `--restore <backup>` runs against domain B
- THEN it aborts with an error and domain B is unchanged

## MODIFIED Requirements

### Requirement: The backup is out-of-tree and verified

Before the first write, the migration MUST create a timestamped backup of the full domain tree outside the domain directory, together with a sha256 manifest, and MUST verify the backup against that manifest. Only `.git` and `node_modules` MAY be excluded, at any depth. Directories named `archive`, `backups`, `dist`, `coverage` and `.staging` MUST be included. If automated backup fails, the manual fallback instruction MUST be shown and the migration MUST NOT continue until the backup is confirmed.
(Previously: also barred reuse of the partial `backup-workspace.js` scope, and did not pin the skip set or the depth.)

#### Scenario: Backup precedes writes
- GIVEN an accepted migration
- WHEN the backup step finishes
- THEN the backup path is outside the domain
- AND it contains every domain file, including `workspace_NN.md` and the other root documents, and its sha256 manifest verifies

#### Scenario: Nested skip-named dirs are backed up
- GIVEN a file at `models/archive/x.md`
- WHEN the backup step finishes
- THEN the backup contains `models/archive/x.md`

#### Scenario: Backup failure stops the run
- GIVEN the automated backup fails
- WHEN the manual fallback is not confirmed
- THEN no domain file is written

### Requirement: Validation gates success and failure restores the backup

After both migration layers are applied, the agent MUST run `validate_knowledge` with `domain: true` through the MCP, and every migrated document MUST round-trip through the serializer. On any failure, the migration MUST restore the domain from the backup so that no partial state remains, and MUST report the backup path and the failing document.

Each applied op MUST be journaled to `<backup>/journal.json`, together with the domain path, the paths the migration created, and its leftovers. The journal MUST carry `committed: true` only after validation passes. Restore MUST first copy the backup back and verify sha256 equality, and only then remove paths the journal records as created and that are not in the backup. Restore MUST keep any other file that is in neither the backup nor the journal, and MUST report it. The migration is applied in place (not by directory swap), because the domain may be a git root, open in the editor or held by a sync client.
(Previously: restore removed every file absent from the manifest before copying, and the journal did not carry the domain path, created paths or leftovers.)

#### Scenario: Failure restores the pre-migration state
- GIVEN a document that fails validation after schema migration
- WHEN the run ends
- THEN every file from the backup is byte-identical to its pre-migration state
- AND the report names the failing document and the backup path

#### Scenario: Interrupted run leaves no partial domain
- GIVEN a run interrupted after language migration and before validation (a journal without `committed: true`)
- WHEN nn-upgrade runs again on the domain
- THEN it offers `--restore` before doing anything else
- AND the domain is never accepted as migrated

#### Scenario: Restore is verified
- GIVEN a failed run with a journal
- WHEN `--restore <backup>` completes
- THEN the sha256 of every restored file equals the backup manifest
- AND every journal-created path absent from the backup is gone

#### Scenario: Foreign files survive restore
- GIVEN a file in the domain that is in neither the backup nor the journal
- WHEN `--restore <backup>` completes
- THEN that file is still on disk
- AND the restore report lists it

#### Scenario: Interrupted restore loses nothing
- GIVEN a restore that fails mid-copy
- WHEN the run ends
- THEN no journal-created path has been removed
- AND every original byte is still in the backup or the domain

## Out of scope (decided)

- Domains already migrated by the previous version are not detected or repaired.
- Vocabulary migration of `specs/`, and the `--import-as-source` behaviour.
