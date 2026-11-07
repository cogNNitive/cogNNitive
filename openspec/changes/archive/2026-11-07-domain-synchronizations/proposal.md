# Proposal: Domain Synchronizations

## Intent

A Procedures domaiNN must use the job positions defined in an Organization domaiNN as the value of `responsable`, without copying data by hand. Organization stays the single source of truth. When the manager asks, Procedures pulls a fresh copy, and broken references show what needs updating. Today there is no supported way to do this:

- **External Watch Roots** (`## NN External Watch Roots:`, parsed in `skills/nn-sources/scripts/lib/external-scanner.js:85-142`) are not declared in any bluepriNNt. No shipped domaiNN uses them.
- Import rejects `_NN.md` models (`cognitivize.ts:63,128`; `importExternalFiles` throws, `external-scanner.js:347-370`). It also flattens folders into `sources/import/`, so files with the same name collapse into one family (`writeOnce/fs.ts:135-168`).
- **Imported Domain** (`nn-core/src/imports/*`) is effectively dead code: only tests call `projectSnapshot`.

**Synchronization** replaces all three with one concept: a declared origin that is refreshed only on explicit demand.

## Scope

### In Scope
- A `Synchronization` concept in the core `sources` bluepriNNt (`iNNfo/specs/bluepriNNts/sources/spec_NN.md`). Its fields are `alias`, `origin` (a local path, network share or URL), `kind` (`file`|`folder`) and `status` (`active`|`paused`). `init_domain` scaffolds `sources_NN.md` (`scaffold/domain.ts`).
- **Landing by file type:**
  - `_NN.md` models are mirrored in place under `sources/sync/<alias>/`. Relative paths are kept, and a refresh replaces the files.
  - Every other file goes to `sources/import/` as a write-once timestamped copy with a sidecar. The sidecar records `synchronization`, `origin_path`, `origin_uri`, `retrieved_at` and `sha256`. The `sidecar` bluepriNNt declares these keys.
- **Domain origin:** when the origin folder contains `domaiNN_NN.md`, only its knowledge models are mirrored. The following are skipped: `*_changes_NN.md`, sidecars, console HTML, backups, the origin's own `sources/`, and hidden folders.
- **Refresh history:** each refresh prints a ready `propose_changeset` payload (one change with the per-file hashes before and after) that the agent applies in the consumer domaiNN; the CLI never applies it.
- **Broken links:** a refresh never blocks. If a slug was renamed or removed at the origin, any consumer `type:: reference` field (path form `sources/sync/<alias>/<model>_NN.md@<slug>`) that pointed to it fails validation as an ordinary broken link. (`type:: address` fields only get a shape check, so they are not used; see `design.md`.)
- **Engine fixes:**
  1. Allow mirroring `_NN.md` files.
  2. Keep relative paths in the mirror.
  3. Keep copied changesets out of the consumer's change log. Today `isChangesetPath` checks only the stem (`changelog/load.ts:56-61`), and `lineage/fs-snapshot.ts:14-27` does not prune `sources/`.
- **Console:** the Origins column comes from Synchronization elements and sidecar origins, and is hidden when empty. Unknown files are labelled `unclassified` instead of `source` (`files-inventory.ts:124-125`).
- **Deleted (no compatibility layer):**
  - the External Watch Roots block, its parsing and its tolerance (`external-scanner.js`, CLI `index.js:224-328`, `nn-preflight/scripts/domain-probe.js`);
  - `nn-core/src/imports/*`;
  - alias resolution in `console/fs-source-resolver.ts`;
  - the folder-name `watchRoots` synthesis in `scripts/export-console.mjs`;
  - the sidecar keys `source_url` and `downloaded_at`.

### Out of Scope
- Viewing another domaiNN's change history, and links to its console.
- Polling, schedules, pins, git sources, read-only `reference` mode, and cross-domain lineage.
- Filtering a synchronization down to specific concepts.
- The `source-package` bluepriNNt and the contradiction in the sidecar `sources` key (follow-ups).

## Capabilities

### New Capabilities
- `domain-synchronization`: the concept, both landings, the domain-origin filter, the refresh change record, and broken-link behaviour.

### Modified Capabilities
- `external-watch-roots`: removed; replaced by Synchronization.
- `sidecar-blueprint`, `source-sidecar`: add the origin keys and drop the legacy keys.
- `cognitivize-in-place`, `scanner-destination-collision-guard`: accept models and keep relative paths.
- `changes-collection`: changesets under `sources/` are excluded.
- `console-files-view`: Origins comes from Synchronization, and unknown files become `unclassified`.
- `domain-initialization`: scaffolds the sources model.

## Approach

The consumer reads mirrored models through the existing address grammar (`address/grammar.ts`). Mirrored models stay out of the consumer's own graph through `isUnderRootSources` (`naming/contract.ts:296-298`, used at :309 and :329). Refreshes are triggered from the CLI (`nn-sources --sync <alias>`) together with an agent instruction. No new MCP tool is added.

| Alternative | Verdict |
|---|---|
| Registry in the `domaiNN` manifest | Rejected: `sources` already holds origin concepts, and the manifest would grow another invisible block. |
| Reference/pin design (`external-locations-registry`) | Rejected: pins, git and re-pinning add machinery that no use case needs. Explicit refresh is enough. |

## Affected Areas

| Area | Impact |
|---|---|
| `iNNfo/specs/bluepriNNts/{sources,sidecar}/spec_NN.md` | Modified (`blueprint_version` bump) |
| `nn-core/src/{cognitivize,changelog,lineage,scaffold,console}` | Modified |
| `nn-core/src/imports/*` | Removed |
| `skills/nn-sources`, `skills/nn-preflight` | Modified |
| `scripts/export-console.mjs` | Modified |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `type:: address` does not validate targets (verified by design) | Resolved | Consumer fields use `type:: reference` in the path form, resolved by the workspace pass per alias |
| A slug rename at the origin breaks many consumer fields | Med | Broken links stay visible; documentation recommends `--freeze-slugs` at the origin |
| "sync" collides with `sync_domain_manifest` | Low | Design checks the naming |

## Rollback Plan

Revert the PR, then restore the previous `blueprint_version`s through `scripts/sync-versions.mjs`. No shipped domaiNN uses the deleted blocks, so no data migration is needed.

## Dependencies

- A templates release after merge. Delivery is `exception-ok`, and the estimate is above 400 lines, so the PR is recorded as **`size:exception`**.

## Success Criteria

- [ ] End-to-end: an Organization-like domaiNN is synchronized into a Procedures-like domaiNN, and `responsable :: reference` (`sources/sync/organization/<model>_NN.md@<puesto>`) validates.
- [ ] After a position is renamed at the origin and a refresh runs, the consumer shows a broken-link error, and the refresh appears as a change with before/after hashes.
- [ ] Two `README.pdf` files in different subfolders stay distinct, and each sidecar records its origin.
- [ ] No code, spec or documentation mentions `External Watch Roots` or Imported Domain.
- [ ] A copied `*_changes_NN.md` never enters the consumer's change log.

## Open Questions (recommended default)

1. Fate of the `source-package` bluepriNNt: out of scope, handled as a follow-up.
2. The contradiction in the sidecar `sources` key: out of scope, handled as a follow-up.
3. Command surface: CLI in `nn-sources` plus an agent instruction, with no MCP tool.

## Proposal question round

- If a synchronization is `paused`, should its mirror stay in place for the consumer's addresses to resolve? Assumed: yes.
- If the origin is unreachable during a refresh, should the previous mirror be kept and a warning reported? Assumed: yes.
- Deleting a Synchronization: should its mirror be removed too? Assumed: yes, recorded as a change.
