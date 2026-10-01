# Proposal: Harden nn-upgrade Migration Against Data Loss

## Intent

`nn-upgrade` Flow A (`skills/nn-upgrade/scripts/migrate-domain.js`) is the only supported path from the legacy layout until `2026-09-30-nn-quarantine-removal` closes the window. Today it can destroy user data four ways: it deletes non-empty legacy dirs, corrupts binaries, drops `specs/templates/` without migrating it, and its `--restore` deletes files the backup never contained. A migration tool must never lose bytes the user did not ask to change.

## Scope

### In Scope
- Legacy-dir cleanup removes only empty dirs, bottom-up; it reports and journals any leftovers.
- The planner never rewrites non-UTF-8 (opaque) files. They get a byte-preserving `move` only.
- `specs/templates/` is migrated, or kept untouched and reported. It is never deleted unmigrated (see question 1).
- The backup scope matches the spec. Only `.git` and `node_modules` are excluded, and `archive`, `backups`, `dist`, `coverage` and `.staging` are no longer skipped at any depth.
- Restore is journal-driven and copies before it removes. It deletes only paths the journal records as created, and it refuses a backup that belongs to another domain.
- Regression tests for every case, written first (strict TDD).

### Out of Scope
- Vocabulary migration of `specs/` content.
- Refactoring the duplicated rename maps.
- `--import-as-source` behaviour.
- The quarantine removal itself.

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `domain-layout-migration`: the requirements for cleanup, opaque files, `specs/templates` handling and journal-driven restore change. Note: no living spec exists under `openspec/specs/`, because the archived rename delta was never synced. The spec phase must decide whether to write the full spec or a delta against the archived version.

## Approach

1. **Cleanup** (`migrate-domain.js:318-327`): replace `rmSync({recursive, force})` with a recursive `rmdirSync` that removes only empty dirs. Leftover paths are collected, written to the journal and printed. The swallowed `catch {}` goes away.
2. **Opaque files** (`innfo-core/src/legacy/reader.ts`, `language-map.ts`): the reader decodes with fatal UTF-8. Files that fail to decode are marked opaque, and the planner emits `move` only for them. After that, regenerate `legacy-migrate.generated.cjs`.
3. **specs/templates**: leave `specs/templates/` untouched. The reader keeps ignoring root `specs`, cleanup never touches it, and both the dry-run and the apply report list it as not migrated.
4. **Backup**: give `backupWorkspace` an injectable skip-set. Flow A passes `{.git, node_modules}`.
5. **Restore**: the journal records the domain path plus the created paths. Restore first stages and verifies the copy-back, and only then removes the journaled creations. Any other non-manifest file is preserved and reported.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-upgrade/scripts/migrate-domain.js` | Modified | Cleanup, restore, journal |
| `skills/nn-upgrade/scripts/backup-workspace.js` | Modified | Injectable skip-set |
| `iNNfo/packages/innfo-core/src/legacy/{reader,language-map}.ts` | Modified | Opaque files, `specs/templates` |
| `skills/nn-upgrade/scripts/lib/legacy-migrate.generated.cjs` | Regenerated | Bundle |
| `skills/nn-upgrade/scripts/migrate-domain.test.js` | Modified | Regression cases |
| `skills/nn-upgrade/SKILL.md` | Modified | Leftover/restore reporting |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hardening code that will be deleted | Med | Keep the change minimal. The window is open and real users are still exposed |
| Skip-set change affects other `backupWorkspace` callers | Low | Default unchanged, opt-in parameter |
| Users already migrated with corrupted binaries | Med | Question 4 |

## Rollback Plan

Revert the change commits and regenerate the bundle from the reverted core. The persisted domain format is unchanged.

## Dependencies

- Must land before `2026-09-30-nn-quarantine-removal` is unblocked.

## Success Criteria

- [ ] Apply on a domain with an unmigrated file under `models/` leaves that file on disk and reports it.
- [ ] A `.png` under `models/` is byte-identical (same sha256) after apply.
- [ ] `specs/templates/*` content is never removed unless it has been migrated.
- [ ] Restore never deletes a file that is outside the journal's created set.
- [ ] A restore interrupted mid-copy leaves every original byte recoverable.

---

## Appendix: Exploration notes (verified 2026-09-30 by code reading)

| Claim | Verdict | Evidence |
|---|---|---|
| 1. `rmSync` deletes non-empty legacy dirs | CONFIRMED | `migrate-domain.js:319-324`. There is no emptiness check, the comment is wrong, and the error is swallowed. The delete is not journaled. |
| 1b. Backup mitigates it | PARTIAL | `backup-workspace.js:17,61` skips `archive`, `backups`, `dist`, `coverage` and `.staging` at every depth, while the reader skips these only at the root. So `models/archive/x.md` is migrated but never backed up. The spec (`domain-layout-migration`) allows excluding only `.git` and `node_modules`. |
| 2a. Binaries corrupted | CONFIRMED (mechanism) | `createFsDomainReader` reads `utf8` (`migrate-domain.js:36`). `language-map.ts:266-273` emits `write(content)` for every file whose path changes, so each invalid byte becomes U+FFFD (3 bytes). The 811KB to 1.46MB figure was not reproduced. |
| 2b. `specs/templates` deleted, never migrated | CONFIRMED | `reader.ts:5,18` ignores root `specs`, so no ops are emitted and the `migratePath` branch (`language-map.ts:33`) is dead. Line 319 then deletes the dir. It is recoverable only via backup. |
| 3. Restore loses files | CONFIRMED, refined | `cleanCreated` (`:71-89`) deletes every file not in the manifest, not the journaled creations the spec requires. That includes skip-dir contents that were never backed up (permanent loss) and files the user created after migrating. It runs before the copy, so a failure leaves the tree half-restored. Nothing checks that the backup belongs to this domain. Files that were backed up are not deleted. |

## Proposal question round (needs user review)

1. `specs/templates/`: migrate it into `specs/bluepriNNts/`, or leave it untouched and report it?
2. Leftover files in legacy dirs: finish as "success with warnings", or block the apply at dry-run?
3. Restore finds files that are not in the backup and not journaled: preserve and report (assumed), or ask the user?
4. Domains already migrated by the buggy version: ship a detection/advisory (U+FFFD scan plus the backup path), or treat it as out of scope?
5. Opaque detection: is UTF-8 validity enough, or should known text extensions also be forced to be move-only?
