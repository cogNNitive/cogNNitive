# Design: Domain Synchronizations

## Technical Approach

A `Synchronization` element in the domaiNN's sources catalog (`sources/sources_NN.md`) declares an origin. Running `nn-sources --sync [alias]` explicitly lands the origin in two places:

- **Models** (`_NN.md` files that the origin itself would discover) are mirrored in place under `sources/sync/<alias>/<origin-relative path>`.
- **All other files** become write-once members under `sources/import/<alias>/<origin-relative dir>/`. Their sidecars carry the origin keys.

The CLI does not apply the change record itself. It prints a ready `propose_changeset` payload (lineage-as-changes A9).

The consumer points at a mirrored element with a **`reference`** field whose value is a path address, `sources/sync/<alias>/<path>_NN.md@<slug>`. The workspace reference pass resolves that value against a per-alias `DomainIndex` built over the mirror folder.

All the old machinery is deleted: External Watch Roots, the watch digest, Imported Domain (`nn-core/src/imports`), and the alias resolver.

## Verification of blockers (A to J)

| # | Finding | Status |
|---|---|---|
| A1 | `parseAddress` classifies `sources/…_NN.md@x` as `{kind:'source'}`, because the `MODEL_CITED_BY_PATH` check is skipped under `sources/` (`address/parse.ts:45-66`). Parsing works. | VERIFIED |
| A2 | **`type:: address` is never resolved.** The per-file pass only checks the shape (`validator/references.ts:198-216`). The workspace pass only looks at `reference` and `knowledge` (`workspaceReferences.ts:141`). So a broken mirror link would **never** surface through an `address` field. | VERIFIED |
| A3 | A `reference` field holding a `source` address is rejected as `ADDRESS_MALFORMED`, both per file (`references.ts:316-325`) and workspace-wide (`workspaceReferences.ts:194-205`). `DomainIndex.resolve` rejects it as well (`domain/index.ts:194`). | VERIFIED |
| A4 | Citations: `.md@slug` without `#` is malformed (`sourceRef.ts:635-636`), and an unknown heading is only a warning, `KU_UNKNOWN_SLUG` (`workspaceSources.ts:468-476`). Citation semantics also mean evidence, not a relation. | VERIFIED |
| A5 | Console: `parseUnitAddress` returns `null` for `.md@slug` (`console/unit-address.ts:227-238`). | VERIFIED |
| **A** | **The blocker does NOT hold as assumed.** A small change makes it work (D1 to D3). | |
| B | `sync_domain_manifest` (`nn-mcp/src/server.ts:548`, `tools/workspace-sync.ts:195`) and "Workspace Manifest Synchronization" (`skills/nn-innfo/SKILL.md:798`) are the only uses of the name. `vocabulary.json` has no sync concept. A collision is possible in docs only. | VERIFIED |
| C | Discovery, `list_knowledge`, `DomainIndex`, duplicate ids, placement, version skew and drift all go through `isModelCandidate`. That function excludes root `sources/` (`naming/contract.ts:309`, `helpers.ts:111`, `nn-mcp/tools/provenance-models.ts:21`). Console models are excluded too (`contract.ts:329`). **Still leaking:** `readLineageSnapshot` takes `sources/**/_NN.md` (knowledge and changeset roles) (`lineage/fs-snapshot.ts:42-48`). From there it feeds `buildChangeLog`, `extractFileCitations` (the mirrored models' own citations would produce `KU_DANGLING_FILE`) and `query_units`. `recursiveParse` only follows `knowledge`/`path` fields (`recursiveParser/workspace.ts:179-216`). | VERIFIED / recursiveParse INFERRED |
| D | `isChangesetPath` checks only the stem (`changelog/load.ts:56-61`), and the snapshot never prunes `sources/`. | VERIFIED |
| E | `cognitivize` rejects `nn-document` (`cognitivize.ts:63`). `importRaw` rejects `_NN.md` (`:128`) and flattens everything into `IMPORT_DIR` (`:109,133-138`). `writeOnce` already accepts any `dir` (`writeOnce/fs.ts:135-147`). `importExternalFiles` throws on a rejection (`external-scanner.js:357-359`). | VERIFIED |
| F | Field definitions are keyed by name and take a concept list (`coNNtent/spec_NN.md:136`). `status` and `type` already exist on `Source` with other options (`sources/spec_NN.md:45-76`). The catalog role is `catalog` (`contract.ts:146`). The scaffold creates no catalog (`scaffold/domain.ts:73-80`). | VERIFIED |
| G/H | The deletion surface and the console payload are listed under File Changes. The runtime builds Origins from `watchRoots` (`nn-runtime.js:4133,4674,4798-4870`). | VERIFIED |

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D1 | Field type for `responsable` | `type:: reference` (optional `target_concepts`) | `type:: address` | `address` is shape-only today (A2). Making it resolve would also start resolving every historical change `target`. `reference` already has workspace resolution, error severity and concept checks. |
| D2 | Address form | Path form `sources/sync/<alias>/<path>_NN.md@<slug>[&field]` | Short form `organization@slug` searched through mirrors; a reserved `sync/` model-id head | The path form needs no grammar change (A1). A short form would shadow or collide with consumer ids and needs an ambiguity rule. A reserved head would touch the parser, `DomainIndex`, `RESERVED_MODEL_ID` and the console. |
| D3 | Resolver | New pure `sync/address.ts` (`parseMirrorAddress`). `checkToken` resolves through `MirrorLookup(alias) → DomainIndex`. nn-mcp builds the lookup lazily with the existing `buildNodeDomainIndex(<root>/sources/sync/<alias>)`. Resulting codes: `REF_MODEL_NOT_FOUND` (missing alias folder or file), `REF_ELEMENT_NOT_FOUND`, `REF_CONCEPT_MISMATCH` (warning) | Read the files ad hoc | Reuses the index and the ordinary broken-link codes. Lookup by path works even when declarations are unresolved. |
| D4 | Mirror filter | Mirror the files for which `isModelCandidate({path: relToOrigin, frontmatter})` holds | A hand-written skip list | This is exactly the set the origin itself discovers. It already excludes changesets, sidecars, catalogs, `domaiNN_NN.md`, the origin's `sources/`, hidden folders, archive and staging. |
| D5 | Domain origin | `kind: folder` and `<origin>/domaiNN_NN.md` exists → models only, raw files skipped. Plain folder → models are mirrored and other non-`_NN` files go to the import landing. | Configurable mode | Matches the proposal with no new field. |
| D6 | Mirror write | Plan (add, replace, remove), then write each file. Files missing at the origin are deleted. A partial failure is fixed by the next refresh. | Temporary dir + rename | Windows `EPERM` when a viewer holds a file. Keeps it simple. |
| D7 | Refresh record | The CLI prints a `propose_changeset` payload with one `comment` change: `target: sources/sync/<alias>` (no `@`, so target resolution is skipped, `propose-changeset.ts:351`), `evidence: decision`, and `notes` listing the per-file `path before→after` sha256 values (absent = added/removed). No difference → no payload. | `produce_artifact` (blocked on a second record, `apply-change.ts:1206`); a new op; the CLI writing `changes/` | A9: apply stays in nn-mcp. No new op and no change to the `changes` bluepriNNt. |
| D8 | Leak fix | `isChangesetPath` returns false under root `sources/` (export `isUnderRootSources`). `readLineageSnapshot` prunes the `sources/sync/` subtree. | Prune all of `sources/` | Raw sources and sidecars must stay in the lineage. `sources/sync/` only ever holds `_NN.md` files (D4/D5). |
| D9 | Naming | Concept `Synchronization`. Folder `sources/sync/`. CLI `--sync [alias]` (no value = all active). Sidecar keys `synchronization`, `origin_uri`, `origin_path`, `retrieved_at`. Rename `nn-innfo` §14 to "Workspace Manifest Reconciliation". | `Mirror`, `Feed` | The proposal's term is kept. The only collision is in docs. |
| D10 | Fields | New `alias` (string, slug charset), `kind` (`file`/`folder`), `state` (`active`/`paused`). `origin_uri` is reused with `concept:: [Source, Synchronization]`. | `status`, `origin` | `status` already exists on Source with other options (F). `origin_uri` already means "local path or URL". |
| D11 | Alias validation | `readSynchronizations(text)` returns `SYNC_ALIAS_INVALID` / `SYNC_ALIAS_DUPLICATE`. The diagnostics are surfaced by `collectWorkspaceDiagnostics` and by the CLI, which refuses invalid aliases. | A generic uniqueness rule | One small pure function, no new framework. |
| D12 | URL origin | `origin_uri` that starts with `https?://` → the CLI calls `webImport.downloadToImport(url, dir, {subdir: alias})`. Only `kind: file` is allowed. | Download in nn-core | `fetch` stays in the skill, and nn-core stays offline. |
| D13 | Self-loop guard | Refuse when the origin lies inside the consumer, or the consumer inside the origin. Symlinks are not followed (`lstat`). | — | Prevents recursive mirrors. |
| D14 | Catalog location | `init_domain` scaffolds `sources/sources_NN.md` (precedent: `test/ecosystem_NN/sources/sources_NN.md`). | Root `sources_NN.md` | The role is `catalog`, so it surfaces in the console and stays out of the DomainIndex. |

## Data Flow

    sources/sources_NN.md ──readSynchronizations──► Synchronization[] ──► CLI --sync [alias]
                                                                            │ state=paused → skip
                                                                            │ unreachable → warn, keep mirror, exit 1
          origin (path/share) ──refreshSynchronization (nn-core/sync)──────┤
            _NN.md ∧ isModelCandidate ──► sources/sync/<alias>/<rel>        (in-place replace/delete)
            other files (non-domain)  ──► importRaw{dir,origin} ──► sources/import/<alias>/<rel-dir>/x_<stamp>.ext + sidecar
          origin (URL) ──webImport──► sources/import/<alias>/… + sidecar origin keys
                                                                            ▼
                                     digest before/after ──► printed propose_changeset{comment} ──► agent applies
    validate: reference value ─parseMirrorAddress─► MirrorLookup(alias)=buildNodeDomainIndex(mirror dir) ─► REF_* errors
    console:  exporter ─Synchronization elements + sidecar origin keys─► files.origins[] ─► Origins stage (hidden if empty)

## Interfaces / Contracts

```ts
// nn-core/src/sync/address.ts (browser-safe)
export const SYNC_DIR = 'sources/sync'
export interface MirrorAddress { alias: string; path: string /* relative to the alias dir */; unit: Unit }
export function parseMirrorAddress(raw: string): MirrorAddress | null // only element/body/field units
export type MirrorLookup = (alias: string) => DomainIndex | undefined
// validateWorkspaceReferences(result, index, domain?, successor?, mirrors?: MirrorLookup)

// nn-core/src/sync/declarations.ts (pure)
export interface Synchronization { alias: string; origin: string; kind: 'file' | 'folder'; state: 'active' | 'paused' }
export function readSynchronizations(catalog: string): { synchronizations: Synchronization[]; diagnostics: ReferenceDiagnostic[] }

// nn-core/src/sync/refresh.ts (Node-only)
export interface RefreshResult {
  alias: string; status: 'refreshed' | 'unchanged' | 'unreachable' | 'skipped' | 'removed'
  files: Array<{ path: string; before: string | null; after: string | null }>
  digestBefore: string; digestAfter: string // sha256 of sorted "origin_path\tsha256\n" lines
}
export function refreshSynchronization(root: string, s: Synchronization, o?: { now?: () => Date }): Promise<RefreshResult>
export function removeOrphanMirrors(root: string, aliases: string[]): Promise<RefreshResult[]>

// console payload: files.watchRoots → files.origins
interface OriginDescriptor { id: string; alias?: string; origin: string; kind: 'file' | 'folder' | 'url'; state: 'active' | 'paused' | 'adhoc'; files: string[] }
// FileCategory = 'source' | 'asset' | 'evidence' | 'artifact' | 'unclassified'
```

`importRaw(root, abs, {dir?, origin?})`: `dir` defaults to `sources/import`. `origin` is merged into the sidecar as metadata: `synchronization`, `origin_uri`, `origin_path` and `retrieved_at` (the copy time).

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/packages/nn-core/src/sync/{address,declarations,refresh,index}.ts` | Create | D2 to D7, D11, D13 |
| `nn-core/src/address/parse.ts` | Modify | Export `parseUnit` |
| `nn-core/src/validator/references.ts` | Modify | `:316`: a mirror address passes on to the workspace pass |
| `nn-core/src/validator/workspaceReferences.ts` | Modify | `mirrors` parameter and mirror branch in `checkToken`. The `target_blueprint` check comes from the mirror model. |
| `nn-core/src/naming/contract.ts` | Modify | Export `isUnderRootSources` |
| `nn-core/src/changelog/load.ts` | Modify | D8 guard |
| `nn-core/src/lineage/fs-snapshot.ts` | Modify | Prune `sources/sync/` |
| `nn-core/src/cognitivize/{cognitivize,sidecar}.ts` | Modify | `importRaw` `dir`/`origin`; the `_NN.md` rejection stays (models never go through importRaw) |
| `nn-core/src/scaffold/domain.ts` | Modify | Add `sources/sources_NN.md` and the `sources/sync` dir |
| `nn-core/src/console/files-inventory.ts` | Modify | Drop `watch_root`/`imported_domain`; add `unclassified` (`:124-125`); `origins`; sidecar origin keys |
| `nn-core/src/console/unit-address.ts` | Modify | Mirror address → `kind:'source'` chip |
| `nn-core/src/console/fs-source-resolver.ts` | Modify | Delete the alias path (`:12-44,78-86`) |
| `nn-core/src/index.ts` | Modify | Remove `imports` export (`:212`); export `sync` |
| `nn-core/src/imports/*` (5 files), `tests/imports/cross-domain-imports.test.ts` | Delete | Imported Domain |
| `nn-mcp/src/tools/validate.ts` | Modify | Pass `MirrorLookup` and `readSynchronizations` diagnostics; delete the watch-roots entries (`:478-479,495`) |
| `nn-mcp/test/concept-drift-and-gate.test.ts` | Modify | Remove the watch-roots fixture (`:192,204`). The block now gets the generic concept-drift diagnostic. |
| `iNNfo/specs/bluepriNNts/sources/spec_NN.md` | Modify | Synchronization concept and fields; `blueprint_version` V_0-3-3 → V_0-4-0 |
| `iNNfo/specs/bluepriNNts/sidecar/spec_NN.md` | Modify | Four origin keys; V_0-1-3 → V_0-2-0 |
| `iNNfo/specs/vocabulary.json` | Modify | Add `synchronization` and `mirror` (regenerate the vocabulary doc) |
| `skills/nn-sources/scripts/index.js` | Modify | Add `--sync`; delete `--scan-external`, `--watch-digest`, `--digest-decide` (`:224-328`) |
| `skills/nn-sources/scripts/lib/external-scanner.js`, `test/unit/test-external-scanner.js` | Delete | Watch roots |
| `skills/nn-sources/scripts/lib/watch-digest-store.js` | Modify | Keep only the convergence functions (`getConvergence`, `recordConvergence`, `ignoredShas`, state I/O); delete the digest functions and their tests |
| `skills/nn-sources/scripts/lib/{bootstrap.js:125,normalizer.js:30}`, `webImport.js`, `scanner` meta | Modify | Drop the watch-roots heading; `source_url`/`downloaded_at` → `origin_uri`/`retrieved_at` |
| `skills/nn-sources/test/unit/{test-sidecar-discovery,test-s4a-record-removed,test-scanner}.js` | Modify | Drop the watch-roots fixtures and the legacy keys |
| `skills/nn-preflight/scripts/domain-probe.js` (+test) | Modify | Delete `watch_roots` (`:19,49-63,196,229`) |
| `skills/{nn,nn-innfo,nn-sources}/SKILL.md`, `scripts/skill-shared-rules.md`, docs (`cli.md:23`, `mental-model.md:152`), `TESTING.md:144`, `README.md:13` | Modify | Replace with the Synchronization instruction; rename §14 |
| `scripts/export-console.mjs` | Modify | Delete `describeRoot`/`watchRoots` (`:808-814,1040-1075,1566`); build `origins` |
| `iNNfo/specs/bluepriNNts/console/nn-runtime.js` | Modify | `FILES_CATEGORIES`; Origins built from `origins[].files`, hidden when empty |
| `*.generated.cjs`, `nn-console.bundle.js`, `nn-mcp.bundle.js` | Regenerate | Build scripts only |

## Testing Strategy (Strict TDD, red first, in this order)

| # | Test | Asserts |
|---|---|---|
| 1 | `nn-core/src/sync/address.spec.ts` | Parse and reject (`..`, missing `@`, matrix unit) |
| 2 | `nn-core/tests/sync-mirror-references.test.ts` | A `reference` resolves; `REF_ELEMENT_NOT_FOUND`; missing alias gives `REF_MODEL_NOT_FOUND`; concept-mismatch warning; the per-file pass is silent |
| 3 | `nn-core/tests/changelog/sources-exclusion.test.ts` | Copied changeset ignored; `sources/sync` pruned; `changes/` still loads |
| 4 | `nn-core/tests/sync-refresh.test.ts` | Domain filter, path preservation, deletion, unchanged → no files, unreachable keeps the mirror, self-loop refused, two `README.pdf` stay distinct and their sidecars carry `origin_path` |
| 5 | `nn-core/tests/sync-declarations.test.ts`, `scaffold` test | Alias diagnostics; the scaffolded catalog passes `check_domain` |
| 6 | `console-files-payload.test.ts`, `test/console-files-runtime.test.mjs` | `unclassified`; `origins`; Origins hidden when empty |
| 7 | `skills/nn-sources/test/unit/test-sync.js` | Paused skipped, payload printed, orphan removed |
| 8 | **E2E** `nn-mcp/test/domain-synchronization.e2e.test.ts` | Org-like domaiNN → Procedures-like domaiNN: `responsable:: sources/sync/org/organization_NN.md@gerente` validates; rename `gerente` at the origin, refresh → `REF_ELEMENT_NOT_FOUND` on `responsable`, and the payload records before/after sha |

## Migration / Rollout

No shipped domaiNN uses the deleted blocks, so no data migration is needed. Release keys affected: `blueprints-v*` (sources, sidecar), `skills-v*`, `nn-mcp-v*` and `nn-console-v*`. Versions are derived with `scripts/sync-versions.mjs`.

**Ordering risk:** `validate-manifest` byte-checks blueprint content on main against the pinned tag, so main stays red until the `blueprints-v*` tag is cut and repinned. Cut it in the same release run.

New relative imports need `.js`. Use `path.posix` for mirror keys. Every mirror path must pass `checkPathBudget`.

**Rollback:** revert the PR and restore the two `blueprint_version` values via `sync-versions.mjs`. Mirror folders are inert files.

## Spec alignment required (the parallel specs assume otherwise)

1. `address-to-mirrored-model`: `type:: address` → **`reference`** (D1). Drop the short form (D2).
2. `synchronization-concept`: fields `origin` → `origin_uri` and `status` → `state` (D10). The catalog lives at `sources/sources_NN.md`.
3. `synchronization-refresh-change`: "writes a change" means a printed payload that the agent applies (D7). Lineage prunes `sources/sync/`, not all of `sources/`. `isChangesetPath` excludes root `sources/` instead of requiring `changes/` (D8).

## Open Questions (recommended default; automation may proceed)

- [ ] D7: should the CLI print the payload (default) or write a draft changeset itself? Default: print, as A9 requires.
- [ ] Should orphan mirror removal run on `--sync` with no alias? Default: yes, reported, with one comment payload.
- [ ] Should `query_units` skip mirrored models? Default: yes (D8); the agent reads the mirror files directly.
- [ ] Nice-to-have, not designed: a relative link from the Origins node to `<origin>/domaiNN_console.html`.
