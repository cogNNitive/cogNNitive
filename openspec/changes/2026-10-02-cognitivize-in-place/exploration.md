# Exploration: cognitivize-in-place

Input: `architectural-evolution-cognitivize.md` (raw idea, moved here from `2026-10-01-lineage-single-edge`) plus maintainer decisions of 2026-10-02 (below). Base: change `2026-10-01-lineage-single-edge` (implemented). File:line refs are against that post-change state.

## Maintainer decisions (2026-10-02, not reopened)

1. **Cognitivize in place.** `cognitivize(path)` is ONE core operation, exposed via nn-trannsform CLI and innfo-mcp. It writes a co-located sidecar (hash, size, metadata, normalized body for binary/non-markdown files so headings stay citable). Roles come from the `_NN` naming contract, not folders. Promotion into `sources/export/` and `sources/export/` itself disappear.
2. **Artifacts are write-once.** Producers never overwrite; each artifact gets a unique timestamp suffix. Hash guard (sidecar sha256 must still match), dedup (skip if equal to latest of family), latest-of-family resolved by name pattern (no moving `_latest` alias), retention only for versions nobody cites (lineage-driven GC).
3. **Raw imports.** External watch roots only observe; importing copies verbatim into `sources/import/` (canonical; the `sources/original/` fallback is removed), where the copy is cognitivized in place.
4. **Universal `_NN` invariant.** Every `*_NN.md` conforms to a bluepriNNt and its name precedes `_NN`: `<name>_<bluepriNNt>_NN.md`. Sidecars conform to a new sidecar bluepriNNt and keep the original extension: `balance_2026.csv` -> `balance_2026.csv_<sidecar-bp>_NN.md`. Existing kNNowledge names migrate.
5. **Citation grammar unchanged** (`path@Heading&subunit`, CSV `file.csv@RowID&column`), plus JSON Pointer (RFC 6901) units for JSON.
6. **`export/` -> `artifacts/`**, single rename, no fallback.
7. **Drift gate** for the persisted lineage projection (`*_cogNNitive_NN.md` view sections): fails when on-disk managed sections differ from a fresh projection.

## 1. Current-state map

### 1.1 Folder roles
- `sources/nn`: core `lineage/project.ts:194-201,263,271-274`, `lineage/fs-snapshot.ts:44-61`; grammar `sourceRef.ts:89,125-139` (default prefix), `:485-499` (`resolveUnitPath`); nn-trannsform `scanner-core.js:209,221-225`, `curate-csv.js:141-144`, `transformer.js:49`, `lineage-check.js:57-66`, `duplicate-guards.js:355-359`, `impact-checker.js:62,230,373`, `index.js:247,291,399,450,499`; preflight `preflight-check.js:334,352-363`.
- `sources/import` (canonical): `bootstrap.js:11,74,122-127`, `external-scanner.js:359-385` (verbatim copy; timestamp only for `dynamic` cadence), `webImport.js:144,154-199`, `index.js:96,162,449,731`; core `lineage/render.ts:7`, `project.ts:287`.
- `sources/original` (remove): `scanner-core.js:206,238-251,593`, `webImport.js:5,144`, `process-images.js:18`, `index.js:688`, `preflight-check.js:330,464`, `sourceRef.ts:130,485`, `workspaceSources.ts:99`.
- `sources/export` (remove): core `project.ts:165,219`, `fs-snapshot.ts:80-95`, `sourceRef.ts:101,490`; `scanner-core.js:208,270-284`, `bootstrap.js:13`, `index.js:773,800`, `preflight-check.js:463`.
- `sources/archive`: core `project.ts:229-247,316-370`, `fs-snapshot.ts:63-78`; `scanner-core.js:390-486`, `scanner.js:118-134`, `lineage-check.js:68-88`.
- `sources/conversations`: `scanner-core.js:254-268`, `conversations.js:332,394-399`, `bootstrap.js:12`.
- `export/`: core `fs-snapshot.ts:118-134`, `project.ts:90,437`, `build-console-payload.ts:114`; `scripts/export-console.mjs:24,136,196,456-461`, `impact-checker.js:262-270`, `transformer.js:52-54` (`artifacts/` legacy fallback), `bootstrap.js:16`, `upgrade-check.js:42`; editor `explorerClassify.ts:20`, `ConsoleHubView.vue:95,134-143,214-259,367-370,451-452,535-536` (~40 hand-written candidate paths).
- `artifacts/` (historical): frozen `bluepriNNts/workspace/procedures/compile_workspace_hub_NN.md:25,49,61,86,106`, `reconcile_artifact_feedback_NN.md:37,63,141-151`; `ConsoleHubView.vue:944`.

### 1.2 `_NN.md` identity (~25 independent encodings)
- Core: `workspace/discoverModels.ts:14` (`NN_FILENAME_RE`), `:40` (`NON_KNOWLEDGE_SPEC_RE = ^(cognnitive|workspace|procedures|sources|artifacts)(_|$)`), `:58-67`; `helpers.ts:16,23,92` (version from `_V_` in filename); `recursiveParser/paths.ts:6`; `workspace.ts:25,45-49`; `validator/content.ts:421-433`, `syntax.ts:24`; `integrity/versionStatus.ts:122`; `console/payload-builder.ts:156,168,307`; `legacy/detect.ts:46-78`, `language-map.ts:16-37`.
- MCP: `list-read.ts:55,66`, `spec.ts:78-83,154-159`, `validate.ts:81-91`, `init-knowledge.ts:128`, `resolver-node.ts:641-642,816,868,994`.
- Editor: `explorerClassify.ts:15`, `HomeView.vue:186,191,444`, `SaveWorkspaceModal.vue:74,148`, `KnowledgeInfoPanel.vue:672`, `WorkspacePersistenceService.ts:267`, `useMediaScanner.ts:62`, `utils/version.ts:43,59`, `submodelPath.ts:40`.
- Scripts: `export-console.mjs:147,175-179` (every non-L2 `*_NN.md` is a console target), `duplicate-guards.js:335`, `convergence-delta.js:74`, `workspace-index.js:21,75-76`, `external-scanner.js:316`, `provenance-knowledge.js:238-273` (`resolveLatestModelFile`), `provenance.js:30-47`; preflight `preflight-check.js:670-684`, `upgrade-check.js:57`.
- Current names follow no single rule: `_samples_nn/kNNowledge/Ghostbusters_<bp>_NN.md` (closest to target), `X_V_1-0-0_<bp>_NN.md` (use-cases), `Ghostbusters_Operations_V_1-0-0_NN.md`, `workspace_V_0-2-0_workspace_NN.md`, catalogs `sources_NN.md`/`artifacts_NN.md`/`procedures_NN.md`, 25 procedures `<verb>_<noun>_NN.md` (`parent_spec: procedures`, referenced by `procedure_model::` paths), `domaiNN_NN.md`, `spec_NN.md`.

### 1.3 Sidecars today
`scanner-core.js:62-102` (`source_file`, `sha256`, `size_bytes`, `normalized_at`), written to `sources/nn/<mirror>.md` (`:661`, `:770`); `curate-csv.js:146-165` (profile sidecar; curated CSV overwritten at `:144`). Not `_NN`; matched via `source_file`. Hash guard embryo: `preflight-check.js:496-501`, `scanner-core.js:618-622`.

### 1.4 Overwriting producers
| Producer | Evidence | Today |
|---|---|---|
| Console export | `export-console.mjs:456-461`, `build-console-payload.ts:114` | fixed `export/<stem>_console/<stem>_console.html`, overwritten; bundle copied per folder; staleness via `meta.sha256` (`:194-225`) |
| Impact report | `impact-checker.js:262-270` | date-only name, same-day overwrite |
| Transform | `transformer.js:83-87` | timestamped |
| Lineage record | `provenance.js:66,90`, `provenance-knowledge.js:141-187` | living document (managed sections + journal) |
| Curated CSV | `curate-csv.js:144` | overwritten |
| Sidecar re-normalization | `scanner-core.js:627-661` | archive snapshot then overwrite |
| Compile procedures / video | `compile_model_console_NN.md`, `compile_workspace_hub_NN.md`, `video/procedures/*`, `workspace-index.js:305`, `scanner.js:160` | fixed names |

Four timestamp implementations (`_YYYYMMDD-HHmmss`, local time): `external-scanner.js:9,24-47`, `impact-checker.js:276`, `convergence-delta.js:26,89`, `transformer.js:112-121`; `conversations.js:6` uses `YYYY-MM-DD_HHmmss`.

## 2. `sources/archive` vs write-once families
They unify; archive disappears. Archive exists because raw is mutable at a stable path. With write-once each version has a unique immutable path and co-located sidecar; the V-chain becomes the family sorted by timestamp (`version` = rank, `superseded_by` = next, `archive_path` dropped, snapshot idempotency = generic dedup). Also subsumed: collision guard, orphan archive-and-delete flow (`scanner.js:118-134`), `lineage-check.js:68-88`, projection archive branch. Living specs affected: `source-versioning-archive`, `scanner-destination-collision-guard`, `source-normalization-pipeline`, `generic-source-integrity-audit`, `lineage-version-status`, `dynamic-sources-impact-check`, `workspace-sources-resolution`, `typed-source-references`, `document-citations`, `sample-workspaces`.

## 3. bluepriNNt identity and the new sidecar bluepriNNt
Resolution: `schema/canonical-registry.ts:43-290,307-374` (`normalizeKey` strips `_nn`, `_format`, `_f`), `validator/blueprintMatching.ts:6-17` (loose `endsWith` at `:16`), `discoverModels.ts:17-44`, MCP `resolver-node.ts`, `validate.ts:716`.

New bluepriNNt checklist: `bluepriNNts/<name>/spec_NN.md` (`guard-template-immutability.js:97-104`); `manifest/source.yaml` entry (inventory guard `verify.js:54-64,296-307`); `canonical-registry.ts` entry + `MAP` in `generate-canonical-registry.mjs:37-51`; `blueprint-catalog.mjs`; `sync-versions.mjs`; vocabulary entries for "sidecar"/"cognitivize"; `templates-v*` tag + repin. Registry/spec version drift already exists (`sources` V_0-1-0 vs V_0-2-0).

Hazards: a `source` bluepriNNt would differ from the existing `sources` (Sources Catalog) by one letter; `NON_KNOWLEDGE_SPEC_RE` would not match it, so L3 sidecars leak into `## NN Models`, `list_knowledge`, and `export-console` targets; no structural ignore of `sources/`.

## 4. Release and compat risks
- Frozen content vs "no compat": `docs/innfo/samples/lifecycle-ghostbusters/workspace`, `docs/cognitive_nn/use-cases/*`, published `_V_` specs, frozen bluepriNNts `cogNNitive`/`base`/`workspace` (`manifest/source.yaml:128-140`, `frozen_blueprints`). Tests `use-cases-workspaces.test.ts`, `workspace-v4-sources.test.ts`, `source-citations.test.ts` read them. Needs an explicit carve-out.
- bluepriNNt bumps and procedure/sample renames change `templates-v*` bytes; merging to `main` without tag + repin reddens `verify --release`.
- `skills-v*` and innfo-mcp release (new tool, new CDN bundle).
- Regenerate per slice: `innfo-core.generated.cjs`, `console-payload.generated.cjs`, `innfo-mcp.bundle.js`, `canonical-registry.ts`, `catalog.json`, `samples.ts`, console bundle.
- Concurrent changes touching the same files: `console-feedback-roundtrip-completion`, `console-review-ux`, `console-ui-kit`, `visual-catalog-blueprint`, `nn-quarantine-removal`, `decoupled-release-pipeline`.
- Windows: `autocrlf` breaks raw-byte hashing of md/csv/json; MAX_PATH with long sidecar names; local-time timestamps not monotonic (DST/timezones).
- ~100 test files, ~45 docs files, ~12 living specs.
- Migration vehicle: reuse the `models/` -> `kNNowledge/` pattern (`legacy/detect.ts`, `language-map.ts:11-60`, nn-upgrade Flow A), with a larger rewrite.

## 5. Open questions (orchestrator defaults proposed to maintainer, pending answer)
- **Q1 Citation target.** Binary: cite the sidecar body (`report.pdf_<bp>_NN.md@Heading`). md/csv/json: cite the raw. Curated CSV is a write-once artifact derived from the raw. JSON Pointer adds a third `unit.kind`; dispatch (`workspaceSources.ts:308-312`) must become exhaustive.
- **Q2 Name grammar and write-once.** Default: UTC `_YYYYMMDDTHHmmssZ` before the extension, `-2` tie-break for same second; lineage record exempt (living document); GC proposes only, deletes with consent (bootstrap AGENTS.md forbids unilateral delete/rename, `bootstrap.js:49`). Open: family key when names contain digits; whether static re-imports get timestamps.
- **Q3 Role derivation.** Pure function of name + `parent_spec` + sidecar presence; folders are write destinations only. Sidecars never appear as models (`list_knowledge`, `## NN Models`, console targets, `HomeView.vue:186`).
- **Q4 Sidecar bluepriNNt name.** Default: `sidecar` (not `source`) to avoid the one-letter clash with the `sources` catalog. Precise invariant: stem ends with `_<bp>` or equals `<bp>`.
- **Q5 Scope of the `_NN` invariant.** Default: procedures -> `<verb>_<noun>_procedures_NN.md`; drop `_V_` from kNNowledge names (version in frontmatter); structural exceptions `domaiNN_NN.md`, `spec_NN.md`, L0/L1; frozen content exempt.
- **Q6 Converter boundary and drift gate.** Default: core `cognitivize` takes an injected normalizer; MCP returns "use the nn-trannsform CLI" for binaries. Gate compares managed sections only; runs in `--lineage --check`, `verify.js`, MCP `check_workspace`. Conversations and `staging/` still unaddressed.

## 6. Approach
Contract-first chained slices (recommended over big-bang or rename-first):

| # | Slice | Depends on |
|---|---|---|
| S0 | Naming contract module + sidecar bluepriNNt + unified timestamp + discovery exclusion | none |
| S1 | Write-once core (`writeOnce`, hash guard, dedup, `latestOfFamily`, GC planner), `cognitivize()` with injected normalizer, JSON Pointer | S0 |
| S2 | Layout rename (`export/` -> `artifacts/`; remove `sources/export`, `sources/original`, `sources/archive`) + legacy detector | S0 |
| S3 | nn-trannsform scanner -> cognitivize, MCP `cognitivize` tool | S1, S2 |
| S4 | Write-once producers (console, impact, transformer, compile procedures) | S1, S2 |
| S5 | Projection re-key + drift gate | S3, S4 |
| S6 | Universal `_NN` invariant + migration | S5 |
| S7 | Editor, docs, specs, release | S3-S6 |

Rough size: 8-12k changed lines (3-4k generated). Chained PRs required; batch S2-S7 into `main` with the release.
