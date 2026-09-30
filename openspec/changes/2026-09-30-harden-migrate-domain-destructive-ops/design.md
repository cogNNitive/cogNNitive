# Design: Harden nn-upgrade Migration Against Data Loss

## Technical Approach

Keep the change small. The code sits inside `legacy:nn-rename/*` quarantine and `nn-quarantine-removal` will delete it. The goal is a set of local fixes, not a restructure.

Two layers change:
- **Core planner** (`innfo-core/src/legacy`): learns about *opaque* files through an optional reader capability and emits `move` only for them.
- **Flow A CLI** (`migrate-domain.js`): implements the new safety rules: empty-only cleanup, write-ahead `created` journal, journal-driven copy-then-delete restore, and an explicit backup skip-set.

Question round, resolved with the defaults:

| # | Decision |
|---|---|
| 1 | `specs/templates/` is left untouched and reported. The reader keeps ignoring root `specs`, and the cleanup stops touching it. |
| 2 | Leftovers mean success with warnings. They are never deleted. |
| 3 | Restore deletes only journaled creations, after the copy-back. Unknown files are kept and reported. |
| 4 | Domains already migrated by the buggy version are out of scope. |
| 5 | A file is opaque when strict UTF-8 decoding fails OR it has a known binary extension. Opaque files are moved byte-for-byte. |

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Opaque signal | Optional `DomainReader.isOpaque?(path)`. The reader collects `opaque: string[]` | Changing `read()` to return bytes. Having `read()` return `null` for binaries | `read()` is shared with `detectLegacy`, the MCP and the editor. Returning `null` makes the walker treat the file as a dir and silently skip it, so the file becomes a leftover and is never migrated. |
| Opaque classification | Lives in the adapter: exported `isOpaqueFile(buf, relPath)` in `migrate-domain.js` (`TextDecoder('utf-8',{fatal:true})` plus an ext set) | Putting it in core | Classification is I/O-boundary logic, and the core stays pure. It can be unit-tested without the bundle. |
| `specs/templates` | Untouched. Reported as `untouched` in dry-run and apply output | Migrating it (reviving the dead `migratePath` branch) | This is the default. It needs no collision logic with `templates/`. |
| Cleanup | `removeEmptyDirsBottomUp(root) -> leftovers[]` over `models` and `templates` only, using `rmdirSync`. There is no `catch {}` | `rmSync` guarded by an emptiness check | Removing bottom-up with `rmdirSync` cannot delete bytes, even under a race. |
| Journal | Write-ahead: push `created` and flush before each op. Also record `domainDir` and `leftovers` | Appending after the op (as today) | A crash between an op and its flush would otherwise leave an unjournaled creation. Restore tolerates recorded paths that were never created. |
| "Created" | The destination did not exist before the op | Treating every `move.to` and `write.path` as created | In-place rewrites of files in the manifest get restored by copy-back and are not deleted. |
| Backup scope | `backupWorkspace(ws, { skipDirs })`. The default set is unchanged. Flow A passes `new Set(['.git','node_modules'])` | Changing `SKIP_DIRS` globally | The proposal asks for an opt-in so other callers are unaffected (today only the standalone CLI and its test). |
| Restore without journal | Refuse | Copy-back only | Without a journal there is no ownership check and no created set. Flow A writes the journal before the first op, so no restorable state lacks one. |

## Data Flow

```
apply:  reader(isOpaque) -> planMigration -> ops (opaque: move only)
        backupWorkspace(skipDirs={.git,node_modules}) -> journal{domainDir,created:[],committed:false}
        for op: journal.created += dest if !exists; flush; execute
        removeEmptyDirsBottomUp(models, templates) -> journal.leftovers; warn
        report specs/templates untouched; committed=true

restore: journal exists? -> domainDir matches? -> verify backup sha256 vs manifest (no writes yet)
         for manifest file: copy -> <dest>.nn-restore-tmp -> verify sha -> rename over dest
         delete (journal.created - manifest) -> prune empty ancestors
         walk domain: files not in manifest and not in created -> preserved, reported
         journal.restored=true
```

An interrupted restore never modifies the backup, and nothing is deleted until every copy has been verified.

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/packages/innfo-core/src/legacy/detect.ts` | Modify | Add optional `isOpaque?` to `DomainReader` (type-only) |
| `iNNfo/packages/innfo-core/src/legacy/reader.ts` | Modify | Record opaque paths and do not read their content |
| `iNNfo/packages/innfo-core/src/legacy/language-map.ts` | Modify | Emit `move` only for opaque paths. Skip them in frontmatter, content and blueprint processing |
| `skills/nn-upgrade/scripts/lib/legacy-migrate.generated.cjs` | Regenerate | `node scripts/build-preflight-primitives.mjs`, then `--check` |
| `skills/nn-preflight/scripts/lib/legacy-detect.generated.cjs` | Verify | Expected byte-identical (type-only change). `--check` confirms |
| `skills/nn-upgrade/scripts/backup-workspace.js` | Modify | `options.skipDirs` |
| `skills/nn-upgrade/scripts/migrate-domain.js` | Modify | Adapter `isOpaque`, cleanup, journal, restore. Export the seams |
| `skills/nn-upgrade/scripts/{migrate-domain,backup-workspace}.test.js` | Modify | Regression cases |
| `iNNfo/packages/innfo-core/tests/legacy/plan-migration.test.ts` | Modify | Opaque planning cases |
| `skills/nn-upgrade/SKILL.md` | Modify | Document the leftover, untouched and restore reports |

## Interfaces / Contracts

```ts
interface DomainReader { list(d): Promise<string[]>; read(p): Promise<string|null>; isOpaque?(p): Promise<boolean> }
interface LegacyDomainFiles { files: Record<string,string>; opaque: string[] }
```
```js
// migrate-domain.js exports (testing seams)
module.exports = { main, createFsDomainReader, isOpaqueFile, removeEmptyDirsBottomUp, runRestore }
// journal.json
{ domainDir, backupTarget, committed, created: string[], leftovers: string[], appliedOps, restored? }
```

## Testing Strategy (Strict TDD, RED first)

| Layer | What | Approach |
|---|---|---|
| Unit (vitest, core) | An opaque path yields a single `move`, no `write`, and a stable planHash | Fake `DomainReader` with `isOpaque` |
| Unit (node:test) | `isOpaqueFile` (invalid UTF-8, `.png` holding valid UTF-8 bytes, plain `.md`); `removeEmptyDirsBottomUp` returns leftovers and keeps their bytes | Direct require of the seams on temp dirs |
| Unit | `backupWorkspace` with `skipDirs` includes `models/archive/x.md`, and the default is unchanged | Existing backup test file |
| Integration (CLI) | `.png` sha256 is equal after apply. A leftover `.txt` in `models/` survives and is journaled. `specs/templates/*` survives. Restore keeps a user file created after the migration. Restore refuses another domain's backup. A copy failure deletes nothing | `spawnSync` as in the existing suite. Inject the copy failure by making a backup file unreadable, or by adding a `--fail-restore-after` flag that mirrors `--fail-after` |

The bundle drift check (`build-preflight-primitives.mjs --check`, verify.js step 5) guards the regeneration.

## Migration / Rollout

No migration required. The persisted domain format is unchanged. Journals gain additive fields. Restore refuses any backup that lacks `domainDir`, including those written by the old version. This is acceptable because the tool is pre-release.

## Open Questions

- [ ] Should restore accept a pre-hardening journal (no `domainDir`) by prompting? The current design refuses.
- [ ] The exact binary extension set (proposed: png, jpg, jpeg, gif, webp, pdf, zip, ico, woff, woff2, mp3, mp4).
