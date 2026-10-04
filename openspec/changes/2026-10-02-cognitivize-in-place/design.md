# Design: Cognitivize in Place

Inputs: `proposal.md` (approved, including Resolved Questions 1-3 and the carried-over W4 follow-up), `exploration.md`, and the in-progress `specs/*` (read for alignment, not as a dependency). File:line facts were re-checked on 2026-10-02 against the `2026-10-01-lineage-single-edge` worktree. That tree is being edited concurrently (`scripts/verify.js:395` changed between two reads), so tasks MUST re-resolve line numbers at apply time.

## Technical Approach

Two new deep modules in innfo-core carry the change. Every other step is a cutover onto them.

1. **Naming contract** (`src/naming/`, browser-safe, pure). It owns the only `_NN.md` pattern, the name grammar `<name>[_<ts>][.<ext>][_<bp>]_NN.md`, role derivation, family key and ordering, the single UTC stamp, and path budgets. Everything else imports it.
2. **Write-once + cognitivize** (`src/writeOnce/`, `src/cognitivize/`). The planning parts are pure and browser-safe. The fs adapters are Node-only and exported from `index.ts` only, never from `browser.ts`. This is the same split as `lineage/project.ts` vs `lineage/fs-snapshot.ts` in the base change.

Consumers reach the core like this:

- **MCP:** imports `@cognnitive/innfo-core` directly.
- **Editor:** imports `browser.ts`.
- **nn-trannsform:** uses the existing esbuild mirror `skills/nn-trannsform/scripts/lib/innfo-core.generated.cjs` (entry `src/trannsformPrimitives.ts`, builder `scripts/build-trannsform-core-mirror.mjs`).
- **nn-preflight and nn-upgrade:** use `scripts/build-preflight-primitives.mjs`, which gets one new target.
- **`export-console.mjs`:** uses `console-payload.generated.cjs`.

No consumer re-implements a contract rule. A verify gate enforces this.

## Architecture Decisions

| # | Decision | Rejected | Why |
|---|---|---|---|
| D1 | The contract lives in `innfo-core/src/naming/contract.ts` and is re-exported from `index.ts`, `browser.ts`, and `trannsformPrimitives.ts`. Preflight gets a 4th bundle target, `skills/nn-preflight/scripts/lib/naming-contract.generated.cjs`, in `build-preflight-primitives.mjs:30`. | A shared JS file copied into each skill. Putting it in the `legacy-detect` bundle. | One source with mirrors already guarded by `--check` (verify.js steps `core-mirror` and `preflight-primitives`). The `legacy-detect` bundle is ledgered legacy, so its lifetime differs. |
| D2 | `roleOf({path, parentSpecName?, hasSidecar?})` returns `entrypoint, spec, sidecar, lineage-record, catalog, procedure, knowledge, source, artifact`. It reads the basename only, never the folder. Scope exclusion is a separate predicate, `isExcludedPath`: the roots `IGNORED_DIRECTORIES` (`recursiveParser/workspace.ts:25`) plus any `staging` segment plus dot segments. | Role by folder (today). Folding staging into the role. | Spec `nn-naming-contract` requires roles to be folder-blind. Staging is a scope rule. It replaces 7 ad-hoc checks: `scanner-core.js:161,170,299,308,532`, `duplicate-guards.js:197`, `fs-snapshot.ts:49`. |
| D3 | `isModelCandidate(file)` is THE discovery predicate: `nn` name + role `knowledge` + `level === 3` + `parent_spec` present + not `isExcludedPath`. `NON_KNOWLEDGE_BLUEPRINTS` = cognnitive, workspace, procedures, sources, artifacts, sidecar. `discoverModels.ts` deletes `NN_FILENAME_RE` (:14) and `NON_KNOWLEDGE_SPEC_RE` (:40). `isReconcilableModel` keeps only its manifest self-reference check. | Adding `sidecar` to the existing regex. | The H6 note (`discoverModels.ts:46-57`) split "is a model" from "is reconcilable". The sidecar leak is a model-identity question, so identity moves into the contract. `list_models` and `## NN Models` then agree by construction. |
| D4 | Family = `(dir, key, ext)`. `key` is the stem minus only a terminal `_\d{8}T\d{6}Z(-\d+)?`. Order: the unsuffixed member first, then `(stamp, seq)` compared numerically. **Default confirmed**, amended to include `dir` and `ext` in the identity. | Key on the name alone. | `report.pdf` and `report.docx`, or the same name in two folders, are different histories. The existing readers already strip only a terminal stamp (`impact-checker.js:276`, `convergence-delta.js:26`). |
| D5 | One stamp: `formatUtcStamp` (`getUTC*`). `nextStamp(now, latest)` clamps to `max(now, latest.stamp)` and bumps `seq` on equality. `writeOnce` opens with flag `wx` (O_EXCL) and retries with `seq+1` on `EEXIST`. | Local time (4 implementations: `external-scanner.js:24-33`, `transformer.js:113-121`, `impact-checker.js:263`, `conversations.js:8`). | UTC removes DST and timezone skew. The clamp keeps a new write latest even on a slow clock. O_EXCL makes "never overwrite" an OS guarantee, not a convention. Ordering is still name-only, as the spec requires. |
| D6 | `writeOnce(root, target, bytes, {inputs, now})` steps: (1) budget check; (2) hash guard over `inputs` (each input's sidecar `sha256` must equal its raw bytes, otherwise `HASH_MISMATCH`); (3) dedup against `latestOfFamily` only, comparing the member's sidecar `sha256`, or hashing the member if it has none; (4) O_EXCL write. All hashing is over `Buffer` bytes, never utf8. | Guarding the target's own sidecar. Dedup against all members. | Matches spec `write-once-artifacts` (A,B,A writes a third member). Raw-byte hashing is the CRLF defense. |
| D7 | GC: `planGc({families, citedPaths})` is pure. It proposes non-latest, uncited members. `citedPaths` comes from every projection citation site, with a sidecar citation counting for its subject. `applyGc(root, confirmed)` recomputes the plan and deletes `confirmed ∩ plan`, each member together with its sidecar. CLI: `--gc` (dry run) and `--gc --apply --yes --paths <list>`. CI never passes `--apply`. | Deleting on plan-hash consent alone. | An explicit, user-confirmed list (spec) is stricter than a hash. Recomputing blocks stale confirmations. The lineage record is never a family member. |
| D8 | `cognitivize(root, rel, {normalizer?, now?})` is the only sidecar writer. Text-native formats (`md`, `csv`, `json`) get a bodyless sidecar. Anything else needs the injected normalizer; without one it returns `requires-normalizer` and writes nothing. Unchanged hash returns `unchanged`. Changed hash rewrites the sidecar and returns `refreshed`. It rejects `sidecar`/`nn` roles, excluded paths, and over-budget paths. `source_file` is the workspace-relative subject path. The projection checks it against the name-derived subject (`SIDECAR_SUBJECT_MISMATCH`). | A normalizer registry in core. Write-once sidecars. | Spec `cognitivize-in-place`. A sidecar is metadata bound to bytes, not an artifact. Write-once protects the raw files and artifacts. Injection keeps converters (`scanner-converters.js`, `process-images.js`) out of core. |
| D9 | MCP tool `cognitivize {path}`. It resolves inside the root (traversal rejected) and calls core without a normalizer. It maps `requires-normalizer` to the non-throwing `{status:'requires-cli', message:'... use the nn-trannsform CLI ...'}`. CLI: `--cognitivize <file\|dir>`, which recurses, skips sidecars and staging, and injects `lib/normalizer.js` (an adapter over the existing converters). `--scan` calls the same function. | Bundling converters into MCP. | Proposal rule 9. One core path, two adapters. |
| D10 | JSON Pointer unit `{kind:'pointer', pointer}` for `.json` targets: `data.json@/items/0/name`. The pointer must start with `/`. The empty pointer is the file-level citation. No subunits; a literal `&` is written `%26` (`decodeSegment` already decodes). New codes: `KU_UNKNOWN_POINTER`, `KU_INVALID_JSON`. Every `unit.kind` site becomes a `switch` with `assertNever`: `workspaceSources.ts:308`, `unitResolve.ts:100`, `sourceRef.ts:582`, `console/citations.ts:134,182`, `FilePreviewModal.vue:651`. The editor's duplicate serializer (`apps/innfo-editor/src/utils/sourceRef.ts:54`) is deleted in favor of core. | Encoding pointer tokens as `&` subunits. | RFC 6901 already escapes `/` and `~`. Exhaustive dispatch turns the next unit kind into a compile error. |
| D11 | `resolveUnitPath` takes any domaiNN-relative path to `md`/`csv`/`json`. There is no implicit `sources/nn/` prefix and no old-folder branches (`sourceRef.ts:89-139,485-499`). Citing a binary raw (`x.pdf@...`) returns `KU_BINARY_TARGET`, with a suggestion to cite `x.pdf_sidecar_NN.md@...`. `kind` is `model` iff the role is `knowledge`. | A `KU_MALFORMED` hint for `sources/nn/` (base D2 style). | No-compat rule. Old paths simply dangle, and the layout detector explains why. |
| D12 | Lineage re-key. `readLineageSnapshot` walks the whole domaiNN (`isExcludedPath` pruned), reads `md, csv, json, html, htm` as text, skips binaries (their sidecars represent them), and skips the record. Node types: **Source** = subject of each sidecar (`version` = `V<rank>` in its family, `superseded_by` = next member path, `derived_from` = the subject's declared `sources`, or the sidecar's `sources` for binaries). **Knowledge** = `isModelCandidate`. **Artifact** = role `artifact` that is a suffixed family member OR declares upstream. Removed fields: `archive_path`, `status`, `curated_csv`, `media_filename`. One `extractDeclaredCitations(file)` replaces the two copies in `project.ts:85-182` and `:449-530`. | Listing every non-NN file as an artifact. Duplicating a reused artifact in two sections. | Roles are exclusive, so a cognitivized artifact appears once (as a Source) with its upstream, and there is no duplicate edge. Producers always suffix, so terminal artifacts stay visible without folder rules. Loose hand-written md stays out of the record. |
| D13 | Drift gate in core. `lineage/record.ts` takes over `splitTopLevelSections`, `managedSections`, and `refreshExistingModel` from `provenance-knowledge.js:56-82,141`, so nn-trannsform has one definition of "managed". `lineage/drift.ts` `checkLineageDrift(record, rendered)` compares bytes per section with no EOL normalization (per spec). Run sites: `--lineage --check`, verify step `lineage-drift`, and the MCP `check-workspace.ts:256` diagnostic `LINEAGE_DRIFT`. `findLineageRecord(snapshot)` (role `lineage-record`, at most one) replaces `resolveLatestModelFile` (`provenance-knowledge.js:238`). | Three comparators. CRLF-normalized compare. | One comparator means three sites that agree. `* -text` makes byte compare safe. |
| D14 | Invariant: core `checkNameInvariant(path, bp)` (stem `=== bp` or ends with `_bp`, case-insensitive; structural exemptions in the contract). The validator rule `NN_NAME_INVARIANT` is a **warning** in user domaiNNs. The repo guard `scripts/lib/nn-name-invariant-guard.js` treats it as an **error** and reads the carve-out from `manifest/source.yaml` `frozen_blueprints` (:128) plus fixed globs (`docs/innfo/samples/**`, `docs/cognitive_nn/use-cases/**`, `iNNfo/specs/**/*_V_*_NN.md`, `iNNfo/specs/bluepriNNts/workspace/procedures/**`). | Error in user domaiNNs. | Unmigrated user domaiNNs get a migration hint, not a wall. The repo must be clean. |
| D15 | Regex gate `scripts/lib/nn-name-regex-guard.js` (verify step). It forbids `_NN\.md` / `'_NN.md'` / `` `_NN.md` `` and `\d{8}`-stamp builders outside `src/naming/`. It excludes generated files and tests. A per-file allowlist with reasons covers the published-spec URL tooling (`check-spec-version.mjs`, `tag-pin-freshness.js`, `migrate-spec-urls.mjs`, `legacy-write-guard.js`, `canonical-registry.ts:360`, `versionStatus.ts:124`) and `legacy/**`. | Plain `rg` in the PR checklist. | The success criterion has to be enforced, not remembered. Spec URLs are a different identity, the published L0-L2 specs. |
| D16 | Migration: `legacy/layout/{detect,plan}.ts`. `detectLegacy` gains one call that adds the signal `legacy-layout`, so preflight and the editor get it for free. `planLayoutMigration(reader, deps)` returns `move\|write\|delete` ops plus `planHash` (the Op type gains `delete`, limited to byte-identical duplicates and retired mirrors). nn-upgrade `migrate-domain.js` runs it as a second Flow A step after the nn-rename step, with backup, dry run, and the same `--plan-hash` consent. Post-apply it calls core `cognitivize` per subject with a **preserved-body normalizer** that reads the old mirror bodies from `staging/migration/`, then removes that staging dir. Existing `sources/archive/` snapshots are left in place as inert files, excluded from the family version chain; citations into them keep resolving as plain paths, and the migration report lists every citation whose target is under `sources/archive/` (citing file, citation, target) as a warning. The migration never deletes them. | Running the migration inside nn-trannsform. Letting the planner write sidecars. | Reuses the `models/`→`kNNowledge/` pattern (`language-map.ts:200-361`, `migrate-domain.js:9-21`). `cognitivize` stays the only sidecar writer. Preserving the bodies keeps `@Heading` citations valid. Staging is scratch by definition. |
| D17 | Defaults. **Re-import:** confirmed; every import is suffixed, cadence only sets re-check frequency, hand-dropped files stay unsuffixed (`external-scanner.js:359-385` today suffixes only `dynamic`). **Conversations:** confirmed; the transcript name follows spec `conversations-lifecycle`; existing `YYYY-MM-DD_*` transcripts stay as unsuffixed members, not renamed; the mirror `conversations.js:332` is deleted. **Staging:** confirmed; `staging_file` (`scanner-core.js:79,644,753`) is deleted. | | Evidence above. |

## Interfaces / Contracts

```ts
// naming/contract.ts (browser-safe; the ONLY `_NN.md` pattern)
export const ENTRYPOINT_FILENAME = 'domaiNN_NN.md', SPEC_FILENAME = 'spec_NN.md', SIDECAR_BLUEPRINT = 'sidecar'
export interface UtcStamp { stamp: string /* YYYYMMDDTHHmmssZ */; seq: number /* 1 = none */ }
export type ParsedName =
  | { kind: 'nn'; basename: string; stem: string; sidecarOf?: string /* subject basename */ }
  | { kind: 'file'; basename: string; key: string; ext: string; stamp?: UtcStamp }
export type Role = 'entrypoint' | 'spec' | 'sidecar' | 'lineage-record' | 'catalog'
  | 'procedure' | 'knowledge' | 'source' | 'artifact'
export function parseName(basename: string): ParsedName
export function formatNNName(stem: string, blueprint: string): string        // stem===bp -> `${bp}_NN.md`
export function formatMemberName(key: string, ext: string, stamp?: UtcStamp): string
export function sidecarPathOf(rawPath: string): string
export function rawPathOfSidecar(sidecarPath: string): string | null
export function roleOf(i: { path: string; parentSpecName?: string; hasSidecar?: boolean }): Role
export function isModelCandidate(f: { path: string; frontmatter: Record<string, unknown> }): boolean
export function isExcludedPath(path: string): boolean
export function familyOf(path: string): { dir: string; key: string; ext: string } | null
export function compareMembers(a: string, b: string): number
export function formatUtcStamp(at: Date): string
export function nextStamp(at: Date, latest?: UtcStamp): UtcStamp
export function checkNameInvariant(path: string, bp?: string): { expected: string } | null
export function checkPathBudget(absPath: string, platform: string): { ok: true } | { ok: false; limit: 259; length: number }
export function displayStem(basename: string): string                      // replaces 9 `.replace(/_NN\.md$/)` copies
export function procedureIdOf(basename: string): string

// writeOnce/plan.ts (browser-safe)
export interface FamilyMember { path: string; sha256?: string }
export function latestOfFamily(members: FamilyMember[]): FamilyMember | undefined
export function planGc(i: { families: FamilyMember[][]; citedPaths: ReadonlySet<string> }): { candidates: string[] }
// writeOnce/fs.ts (node)
export function writeOnce(root: string, t: { dir: string; key: string; ext: string }, bytes: Uint8Array | string,
  o?: { inputs?: string[]; now?: () => Date }): Promise<
  { status: 'written'; path: string } | { status: 'deduplicated'; path: string }>   // throws HASH_MISMATCH | PATH_TOO_LONG
export function applyGc(root: string, confirmed: string[]): Promise<{ deleted: string[] }>

// cognitivize (types browser-safe, fn node)
export type Normalizer = (i: { path: string; ext: string; bytes: Uint8Array }) =>
  Promise<{ body: string; normalizedBy: string; metadata?: Record<string, string | number> }>
export function cognitivize(root: string, rel: string, o?: { normalizer?: Normalizer; now?: () => Date }): Promise<
  | { status: 'written' | 'refreshed' | 'unchanged'; sidecar: string; sha256: string }
  | { status: 'requires-normalizer'; path: string }
  | { status: 'rejected'; path: string; reason: 'sidecar' | 'nn-document' | 'excluded' | 'path-too-long' | 'not-found' }>
export function importRaw(root: string, externalAbs: string, o?: { normalizer?: Normalizer; now?: () => Date }): Promise<unknown>

// sourceRef.ts
export interface PointerUnit { kind: 'pointer'; pointer: string }           // RFC 6901, raw (escaped) form
export type KnowledgeUnit = HeaderUnit | RowUnit | PointerUnit
// lineage/drift.ts
export function checkLineageDrift(record: string, rendered: RenderedSections):
  { ok: true } | { ok: false; diffs: { section: string; firstDiff: string }[] }
```

Sidecar frontmatter: `level: 3`, `parent_spec {name: sidecar}`, `source_file`, `sha256`, `size_bytes`, `source_format`, `normalized_at` (ISO UTC), `normalized_by?`, `sources?` (upstream of the subject), plus any normalizer metadata.

## Data Flow

    external file --importRaw--> writeOnce(sources/import/<key>_<ts>.<ext>) --cognitivize--> <file>_sidecar_NN.md
    any domaiNN file --------------------------------------------cognitivize(normalizer?)--^
    producer(inputs) --writeOnce: budget -> hash guard(inputs) -> dedup(latest) -> O_EXCL--> artifacts/<key>_<ts>.<ext>
    domaiNN --readLineageSnapshot--> FileSnapshot[] --projectLineage(roleOf, familyOf)--> projection
        projection --render--> --lineage writes managed sections (journal untouched)
                   \--checkLineageDrift(record) <-- CLI --check | verify.js | MCP check_workspace
        projection citation sites --> validateCitations / planGc(citedPaths) --> user confirms --> applyGc

## File Changes (by slice)

| Slice | Files | Action |
|---|---|---|
| S0 contract + discovery + stamp | Create `innfo-core/src/naming/{contract,index}.ts`. Core: `workspace/discoverModels.ts`, `recursiveParser/{paths.ts:6,knowledge.ts:58,workspace.ts:25}`, `validator/content.ts:421,433`, `console/{payload-builder.ts:156,168,feedback-ledger.ts:230,235}`, `lineage/{project.ts:379,fs-snapshot.ts:102}`, `index.ts`, `browser.ts`, `trannsformPrimitives.ts`. MCP `tools/{list-read.ts:51-58,spec.ts:78-83,154-159,validate.ts:81-91,566,716,init-knowledge.ts:128,workspace-sync.ts:33,preview-server.ts:55,build-console-payload.ts:57,apply-change.ts:468,resolver-node.ts:307,313,642,816,868,994}`. Editor `utils/{explorerClassify.ts:15,knowledgeMatching.ts:21,110,114,submodelPath.ts}`, `views/HomeView.vue:186,191,444`, `composables/useMediaScanner.ts:62`, `services/{WorkspaceSyncService.ts:18,WorkspacePersistenceService.ts}`, `components/editor/ConsoleHubView.vue:75,192`, `components/layout/ConceptTreeNode.vue:334`, `SaveWorkspaceModal.vue`, `KnowledgeInfoPanel.vue`. Scripts/skills: `export-console.mjs:147`, nn-trannsform `lib/{workspace-index.js:21,75-76,duplicate-guards.js:335,convergence-delta.js:26,74,external-scanner.js:9-47,316,impact-checker.js:276,conversations.js:6-20}`, `transformer.js:112-121`, `provenance.js:41`; preflight `preflight-check.js:670-684`, `upgrade-check.js:57`; `build-preflight-primitives.mjs` (+target). `sidecar` bluepriNNt: `iNNfo/specs/bluepriNNts/sidecar/spec_NN.md`, `manifest/source.yaml`, `generate-canonical-registry.mjs` MAP, `vocabulary.json`. Regex gate and verify step. Regenerate all mirrors, `canonical-registry.ts`, `catalog.json`, `config/samples.ts` | Create/Modify |
| S1 write-once, cognitivize, pointer | Create `writeOnce/{plan,fs,index}.ts`, `cognitivize/{sidecar,cognitivize,index}.ts`. Modify `sourceRef.ts`, `unitResolve.ts`, `validator/workspaceSources.ts`, `console/citations.ts`, editor `utils/sourceRef.ts` (delete dup serializer), `FilePreviewModal.vue`. Mirrors | Create/Modify |
| S2 `artifacts/` + detector | `fs-snapshot.ts:118-134`, `project.ts:85-182,436`, `render.ts:9`, `build-console-payload.ts:114`, `export-console.mjs:24,136,196,456-461`, `impact-checker.js:262-270`, `transformer.js:52-54`, `bootstrap.js:13,16` (+ `.gitattributes` `* -text`), `sources/original` sites (`scanner-core.js:206,238-251,593`, `webImport.js:5,144`, `process-images.js:18`, `index.js:688`, `preflight-check.js:330,464`, `workspaceSources.ts:99`), `upgrade-check.js:42`, editor `explorerClassify.ts:20`, `ConsoleHubView.vue` paths. Create `legacy/layout/{detect,plan}.ts`; modify `legacy/{detect,index}.ts`, `migrate-domain.js`, `legacy-ledger.yaml` | Create/Modify |
| S3a resolver + MCP tool | `sourceRef.ts` `resolveUnitPath` (any path, `KU_BINARY_TARGET`); create MCP `tools/cognitivize.ts` and register it in the server | Create/Modify |
| S3b ingest cutover + re-key | Core `lineage/{project,fs-snapshot,render}.ts`, `sourceRef.ts:89-139` (prefix removed). nn-trannsform: `scanner-core.js` (delete the mirror writer `:62-102,627-661,770`, archive `:390-486`, collision guard), `scanner.js:118-134`, `lineage-check.js:57-88`, `curate-csv.js:141-165`, `conversations.js:332,394-399`, `webImport.js:154-199`, `external-scanner.js:359-385`, `process-images.js`, create `lib/normalizer.js`, `duplicate-guards.js:197,355-359`, `impact-checker.js:62,230,373`, `transformer.js:49`, `index.js` (+`--cognitivize`), `provenance-knowledge.js:238`. Preflight `:334,352-363,463,496-501`. `cogNNitive/spec_NN.md` fields (in place, Resolved Q1). Extend `legacy/layout/plan.ts`. Fixtures migrated by the tool | Modify/Delete |
| S4 write-once producers | `export-console.mjs` through `buildConsolePayload` (W4) + `writeOnce` (the bundle is its own family per folder); `impact-checker.js`, `transformer.js`, `curate-csv.js` (`artifacts/curated/`), `workspace-index.js:305`, `scanner.js:160`; `ConsoleHubView.vue` (~40 paths replaced by `latestOfFamily`); `--gc`; `workspace/procedures/compile_*_NN.md` (in place) and `video/procedures/*`, plus `template_version` bumps | Modify |
| S5 drift gate | Create `lineage/{record,drift}.ts`; `provenance-knowledge.js` delegates; `index.js` `--lineage --check`; create `scripts/lib/lineage-drift-guard.js` + verify step; MCP `check-workspace.ts` | Create/Modify |
| S6 invariant + renames | `validator/content.ts` rule, create `nn-name-invariant-guard.js`; `helpers.ts:16,23,92`, editor `utils/version.ts:43-60`, `useBlueprintVersionNotice.ts:31` (version from frontmatter); 15 procedure renames (the 9 under `workspace/procedures/` are carved out) + `procedure_model::`; kNNowledge renames in `_samples_nn/`, `workspace_NN/`, `simulation/fixtures/`; extend the planner; bumps | Modify |
| S7 docs/release | ~45 docs, ~12 living specs, vocabulary prose, regenerated samples, `innfo-mcp.bundle.js`, console bundle, release notes (procedure renames, Resolved Q3) | Modify |

Ledger (`legacy-ledger.yaml`), owner maintainer:

| Marker | Where | What |
|---|---|---|
| `legacy:cognitivize-in-place/layout-detect` | `legacy/layout/detect.ts`, call site in `legacy/detect.ts` | Detection |
| `legacy:cognitivize-in-place/layout-migrate` | `legacy/layout/plan.ts` | Old-folder resolution, old `_YYYYMMDD-HHmmss` stamps converted via the injected `deps.localToUtc`, name renames, citation path map |
| `legacy:cognitivize-in-place/upgrade-flow` | `migrate-domain.js` | Step and preserved-body normalizer |

Removal condition for all three: every non-frozen repo domaiNN and fixture reports `current`, a `skills-v*` release shipping the migrator has been cut, and the maintainer signs off. `sources/archive/` data in user domaiNNs is left in place as inert files that still resolve as plain paths. It is reported, and only GC proposes deleting it.

## Testing Strategy (strict TDD, red first)

| Layer | What | Command |
|---|---|---|
| Core unit | Table tests for `parseName`/`formatMemberName` round trips (digits in the key, `-10` after `-2`, `.csv_sidecar`); `roleOf` folder-blindness; `isModelCandidate` excludes sidecars; `nextStamp` under `TZ=America/Santiago` and a skewed clock; `writeOnce` (A,B,A; O_EXCL race; **CRLF bytes generated at test time**; hash-guard block); `cognitivize` statuses; pointer parse/validate; projection families; `checkLineageDrift`; planner determinism (`planHash` stable) | `npm --workspace=@cognnitive/innfo-core test` |
| MCP | `cognitivize` tool: md written, pdf returns `requires-cli`, traversal rejected; `check_workspace` `LINEAGE_DRIFT`; `list_knowledge` without sidecars | `npm --workspace=@cognnitive/innfo-mcp test` |
| Skills | Each producer run twice gives no new file; `--cognitivize` dir; `--lineage --check` exit code; migrate-domain end to end on a legacy fixture; preflight with an empty `USERPROFILE`+`HOME` | `npm --prefix skills/nn-trannsform test`, `node --test skills/nn-upgrade/scripts`, `node --test skills/nn-preflight/scripts` |
| Editor | Discovery parity, explorer, ConsoleHub latest | `npm --workspace=@cognnitive/innfo-editor test` |
| Gates | Regex and invariant guards (each proven red first on a seeded violation), `lineage-drift`, all mirror `--check`s, legacy ledger, sync-versions, blueprint-catalog | `node scripts/verify.js`, `npm run check:integrity`, `node scripts/lib/legacy-ledger-guard.js`, `npm run typecheck`, `npm run lint` |

Every slice that touches a bundled core file regenerates `innfo-core.generated.cjs`, `console-payload.generated.cjs`, and the preflight/upgrade bundles in the same commit.

## Migration / Rollout / Rollback

- Release coupling: S0 (`sidecar` bluepriNNt), S3b (cogNNitive fields), S4 (procedure bumps), and S6 (renames) change `templates-v*` bytes. Keep S0-S7 on `dev`. Merge to `main` only together with the tag + repin + innfo-mcp release (separate change).
- Windows:
  - CRLF: raw-byte hashing, `* -text` written by bootstrap and by the migration.
  - MAX_PATH: `checkPathBudget` fails before any write on `win32`; elsewhere a domaiNN-relative path over 200 characters is a warning.
  - Monotonicity: UTC + clamp + O_EXCL (D5).
- Rollback: `git revert` per slice. S0, S1, S3a, and S5 are additive. S2, S3b, and S6 also need their regenerated fixtures and samples reverted. Write-once and consent-gated GC mean no user bytes are lost.

## Clarifications (orchestrator, 2026-10-02)

- **Staging citations (D2/D11):** a citation whose target is under `staging/` gets an explicit `KU_EXCLUDED_PATH` diagnostic, not a plain `KU_DANGLING_FILE`, so the author learns the target is scratch rather than missing.
- **`derived_from` (D12):** the projection field `derived_from` (rendered in the record view sections) is distinct from a sidecar frontmatter key. Sidecars MUST NOT declare `derived_from`; their upstream edge is `sources`. The projection derives its `derived_from` from `sources`.

## Open Questions / Spec Reconciliation

- [x] verify.js drift gate has no real target: the only `*_cogNNitive_NN.md` in the repo is the frozen `bluepriNNts/base/samples/Ghostbusters_cogNNitive_NN.md`, and `_samples_nn/` and `workspace_NN/` have no record. Should `_samples_nn` ship a record (more template bytes), or should verify run on a committed fixture only? Resolved: committed fixture only.
- [x] Spec `nn-naming-contract` uses frontmatter `model_version`. The canonical key is `knowledge_version`, and `legacy/detect.ts:28-35` flags `model_version` as legacy. The spec should be amended. Resolved: specs now use `knowledge_version`.
- [x] Spec `nn-naming-contract` cites `manifest/source.yaml` `frozen_templates`. The key is `frozen_blueprints` (:128). Resolved: specs and proposal now cite `frozen_blueprints` (`:128-140`).
- [x] Spec `cognitivize-in-place` names transcripts `<slug>_source_<ts>.md`. The `_source` token has no rule behind it; confirm or drop it. Resolved: `_source` dropped; transcripts are `<slug>_<ts>.md` with the contract UTC stamp.
- [x] Inert `sources/archive/` data (D16) is not moved. Confirm. Resolved: option (a) + citation warning.
