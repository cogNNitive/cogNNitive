# Design: Lineage as a Single Citation Edge

Inputs: `proposal.md`, `exploration.md`, `specs/*`. File:line facts were re-checked against the worktree on 2026-10-01.

## Technical Approach

innfo-core owns the whole edge: one parser (`parseCitation`), one filesystem resolver (`createFsSourceResolver`), one validator entry point (`validateCitations`), and one pure lineage projection with its renderer. Every consumer delegates to these:

- **MCP** imports them directly.
- **Editor** uses the browser entry.
- **nn-trannsform** (CommonJS, distributed without innfo-core) gets them through the existing committed esbuild mirror, which grows from slugs-only to "trannsform primitives".
- **Consoles** get `meta.sources` from the single payload builder.

Deletion comes before replacement. No parallel path ever exists, and no legacy code is kept except the `#slug` read path and its one-shot migrator, both ledgered.

## Architecture Decisions

| # | Decision | Rejected | Why |
|---|---|---|---|
| D1 | `parseCitation(raw)` in `sourceRef.ts` wraps the two existing parsers. `parseSourceRef` and `parseKnowledgeUnitRef` leave the public exports (`index.ts`, `browser.ts`) and stay module-internal. A bare path with no anchor (`kNNowledge/X_NN.md`) is a valid **file-level** citation. Only `#slug` is legacy. | A new grammar module. Keeping both parsers public. | Smallest diff. One consumer entry. Today a bare path wrongly emits `KU_DEPRECATED_HASH` (`workspaceSources.ts:237`). |
| D2 | `resolveUnitPath` accepts `sources/nn/`, `sources/export/`, `kNNowledge/`. `models/` returns null, and the validator gives it a dedicated `KU_MALFORMED` message ("`models/` was removed; use `kNNowledge/`"). | Silent fallback. | Matches the `document-citations` delta (uniform identifier includes `sources/export/`). |
| D3 | One resolver: move MCP's superset (`parentExists` + Levenshtein `suggestions`, `validate.ts:293-380`) into core `createFsSourceResolver`. Delete the MCP copy. `resolve-sources.ts:25,71` and `collectWorkspaceDiagnostics` import core. | Keeping the two side by side. | The bodies are identical except for the suggestion tail. The output shape of `resolve_sources` is unchanged. |
| D4 | Extract the per-value loop of `validateWorkspaceSources` into exported `validateCitations(sites, resolver)`. `validateWorkspaceSources(result, resolver, snapshot?)` adds `validateCitations(extractFileCitations(snapshot))` for artifacts and promoted sources. | A second validator for artifacts. | `recursiveParse` follows `domaiNN_NN.md` and never visits `export/`, so artifacts need a file-snapshot input. Diagnostic codes stay identical. |
| D5 | Projection lives in `src/lineage/`. `projectLineage(files)` and `renderLineageSections(p)` are pure and browser-safe. `readLineageSnapshot(root)` is Node-only (`index.ts` only). kNNowledge fields are read with core `parseKnowledge` + `SOURCE_FIELD_NAMES` + `splitSourceFieldValue`, not regex. | Input = `RecursiveParseResult`, which misses `export/` and `sources/archive/`, and is async. | Uses the existing `FileSnapshot` (`queryUnits.ts:24`). Deterministic: sorted paths, no clock. |
| D6 | Mirror: generalize `scripts/build-trannsform-slug-mirror.mjs` into `build-trannsform-core-mirror.mjs`. Entry `src/trannsformPrimitives.ts` replaces `slugPrimitives.ts`. Output `skills/nn-trannsform/scripts/lib/innfo-core.generated.cjs` replaces `slug-mirror.generated.cjs`. Settings: `platform: 'node'`, `absWorkingDir: REPO_ROOT`, and the `(?:\.\./)+node_modules/` normalization copied from `build-console-payload.mjs:45`. The `--check` step at `verify.js:370` is renamed. | A third mirror script. Runtime import of innfo-core dist (absent at `~/.agents/skills`). | One script and one bundle per skill. The bundle now pulls in `yaml` (via `parseKnowledge`), so the junction-path normalization is mandatory. `--check` catches drift in both the primary checkout and worktrees. |
| D7 | Console `meta.sources = ["kNNowledge/<path>_NN.md"]` (file-level, D1), set once in `payload-builder.ts` (~line 304). `export-console.mjs` and the MCP `build_console_payload` tool inherit it through the payload mirror. The only `export-meta` reader (`provenance-knowledge.js:437`) is deleted. | The union of the document's element citations (as the spec scenario states). | A console's origin is the kNNowledge document. Copying its element edges would duplicate every kNNowledge→Source relationship (this violates rule 2). The file-level hop is already checked by `meta.sha256` (staleness principle). |
| D8 | Runtime slug comes from core. `build-console-payload.mjs` emits a second artifact, `console/innfo-slug.generated.js` (IIFE global `InnfoSlug`, built from `parser/slug.ts`). `build-console-bundle.mjs` concatenates it first. `innfo-runtime.js:33` delegates and keeps only the `'feedback'` empty fallback. | A parity test over a duplicated body. | The spec forbids a second implementation. Concatenation is the existing bundle mechanism. |
| D9 | **Artifacts catalog: KEEP as a discovery index.** Drop the `sources` and `produced_by` fields. `blueprint_version` V_0-3-0 → V_0-4-0. | Delete (proposal default). Merge into cogNNitive. | Evidence: it is a shipped `blueprints:` entry (`manifest/source.yaml:144`), it is embedded in `canonical-registry.ts` (`ARTIFACTS_SPEC_CONTENT`), and it is used by `workspace_NN/artifacts/artifacts_NN.md`, 4 use-case docs, `_samples_nn`, and core tests. Deleting it would 404 pinned `parent_spec` URLs. The duplication lives only in those two fields, so removing them leaves one PROV vocabulary. |
| D10 | cogNNitive bluepriNNt (in `frozen_blueprints`, edited in place under maintainer-approved Option B): `template_version` V_0-2-0 → V_0-3-0. The field set is aligned to what the projection writes (see Contracts). Deleted: `generated_by`, `produced_by`, `derived_from_inputs`, `location`, `artifact_version`, `artifact_hash`, `model_version`, `raw_file`, and the `Artifact-Source Lineage` matrix. Also delete the stale `:243-245` section and fix the `:249` `#slug` example. | Retyping the dead fields to `citation`. | Nothing writes those fields. Declaring them keeps a second edge alive. It is not in `SHIPPED_BLUEPRINT_VERSIONS` (`FROZEN_SLUGS`). |
| D11 | domaiNN: delete `kNNowledge.derived_from`. The real key is `blueprint_version` (V_0-1-0 → V_0-2-0), not `template_version`. Registration is generated (`npm run sync:versions` → `config/samples.ts`, gated by `sync-versions --check`). The manifest `version:` (spec_version V_0-3-0) is unchanged. | Hand-editing the map. | It is a generated file. The spec wording "template_version" is corrected here. |
| D12 | `is_synthetic` and sidecar `derived_from` are deleted. `scanner-core.js:661-662` already sets `source_type: 'feedback'` with it, and `classifyFromFrontmatter` (`citations.ts:114`) reads that. A promoted file's upstream is its own `sources:` in `sources/export/*.md`, read by the projection. | A feedback-only marker. | Nothing reads the flag. Authorship is covered. |
| D13 | `#slug`: read-only branch inside `parseCitation`, marked `legacy:lineage-single-edge/hash-slug-read`. One-shot `scripts/migrate-hash-citations.mjs` (marker `hash-slug-migrate`, uses the mirror) rewrites non-frozen content to `@` (`extractHeadings` + `serializeKnowledgeUnitRef`). It skips `_V_*` files, `docs/innfo/samples/`, `_samples_nn/`, and `tests/**/fixtures/`. | Running it automatically inside nn-trannsform. | Sole user. Ledger removal condition: no `#slug` left outside frozen paths + maintainer sign-off. Comments are stripped from the mirror (`legalComments: 'none'`), so the ledger lists core files only. |
| D14 | The CSV/JSON `sources` column is optional. Absent means a terminal artifact. CSV: header `sources` (`normalizeName`). JSON: a top-level array of objects whose `sources` is a string or string[]. No shipped procedure changes. | Mandating it. | Rule 3. Procedures journal gives run-level lineage. |
| D15 | Editor reverse lookup uses exact canonical `filePath` equality (normalized by `parseCitation`). | Fuzzy suffix match (`knowledgeStore.ts:226-230`). | `SourceResolver` answers path→content. The editor needs the reverse (path→citers), which only needs canonical identity. A bare name resolves to `sources/nn/<name>`, so ambiguity surfaces as unresolved. |

## Interfaces / Contracts

```ts
// sourceRef.ts
export type Citation = SourceRef & { legacyHash?: true }   // unit undefined => file-level
export function parseCitation(raw: string): Citation | null
// validator/workspaceSources.ts
export interface CitationSite { value: string; referringPath: string; field: string; element?: string }
export interface CitationDiagnostic extends ReferenceDiagnostic { site: CitationSite; target?: string }
export function validateCitations(sites: CitationSite[], r: SourceResolver): CitationDiagnostic[]
export function validateWorkspaceSources(res: RecursiveParseResult, r: SourceResolver, snapshot?: FileSnapshot[]): ReferenceDiagnostic[]
// lineage/project.ts (browser-safe)
export interface LineageSource { name: string; raw_filename: string; media_filename?: string; raw_hash?: string
  size?: string; source_format: string; normalized_at?: string; normalized_by?: string
  normalized_content: string; curated_csv?: string; status?: 'archived'; version: string
  archive_path?: string; superseded_by?: string; derived_from: string[] }
export interface LineageKnowledge { name: string; model_ref: string; knowledge_version?: string
  model_template?: string; citations: CitationSite[] }
export interface LineageArtifact { name: string; artifact_ref: string
  artifact_format: 'document' | 'report' | 'board' | 'dataset'; citations: CitationSite[] }
export interface LineageProjection { sources: LineageSource[]; knowledge: LineageKnowledge[]; artifacts: LineageArtifact[] }
export function projectLineage(files: FileSnapshot[]): LineageProjection
export function extractFileCitations(files: FileSnapshot[]): CitationSite[]   // export/** + sources/export/**
export function renderLineageSections(p: LineageProjection): { sources: string; modelRecords: string; artifacts: string }
// lineage/fs-snapshot.ts (node)
export function readLineageSnapshot(root: string): FileSnapshot[]  // sources/{nn,archive,export}, kNNowledge, export
// console/payload-builder.ts
interface ConsolePayloadMeta { /* existing */ sources: string[] }
```

Snapshot scope: `.md` and `.csv` files under `sources/nn` (excluding `staging/`), `sources/archive/**/*.md`, `sources/export/**/*.md`, `kNNowledge/**/*_NN.md` (excluding the record itself, i.e. `parent_spec.name: cogNNitive`), and `export/**/*.{md,html,csv,json}`.

Rendered fields:
- **Sources:** `raw_filename, media_filename, raw_hash, size, source_format, normalized_at, normalized_by, normalized_content, curated_csv, status, version, archive_path, superseded_by, derived_from`
- **ModelRecords:** `model_ref, knowledge_version, model_template, derived_from`
- **Artifacts:** `artifact_ref, artifact_format, derived_from`

`derived_from` is typed `citation`. The view sections are pure functions of the snapshot.

## Data Flow

    workspace files ──readLineageSnapshot──> FileSnapshot[]
         │                                      │
         │                       projectLineage ┤──> renderLineageSections ──> record view sections
         │                                      └──> CitationSite[] ──validateCitations(createFsSourceResolver)
         │                                                  │
    MCP check_workspace / lineage-check / impact-checker <──┘ (diagnostics)
    kNNowledge ──buildConsolePayload──> innfo-model.meta.sources ──> export/*.html ──> projection

nn-trannsform reaches every box through `innfo-core.generated.cjs`. The `# NN Procedures` journal and hand-authored blocks pass through `refreshExistingModel` untouched.

## File Changes (by slice)

| Slice | Files | Action |
|---|---|---|
| S1 core edge | `innfo-core/src/sourceRef.ts`, `validator/workspaceSources.ts`, `console/{fs-source-resolver,citations}.ts`, `recursiveParser/normalize.ts`, `parser/serializer.ts`, `index.ts`, `browser.ts`; `innfo-mcp/src/tools/{validate,resolve-sources}.ts`; `legacy-ledger.yaml`; regenerate `console-payload.generated.cjs` and the slug mirror | Modify |
| S2 projection + console meta | `innfo-core/src/lineage/{project,render,fs-snapshot,index}.ts` (Create); `console/payload-builder.ts`; `validate.ts` (snapshot into `collectWorkspaceDiagnostics`); regenerate payload mirror | Create/Modify |
| S3 nn-trannsform | `scripts/build-trannsform-core-mirror.mjs` (rename+extend), `src/trannsformPrimitives.ts` (Create), `slugPrimitives.ts` + `slug-mirror.generated.cjs` (Delete), `lib/innfo-core.generated.cjs` (Create), `markdown-utils.js`, `lib/{provenance-knowledge,lineage-check,impact-checker,duplicate-guards,scanner-core,scanner-converters,curate-csv}.js`, `scripts/verify.js:370` | Modify |
| S4 console runtime | `build-console-payload.mjs` (+IIFE output), `console/innfo-slug.generated.js` (Create), `build-console-bundle.mjs`, `innfo-runtime.js`, `innfo-console.bundle.js` (regen), `business/spec_NN.md` contract example `@` (blueprint bump) | Modify |
| S5 editor | `utils/{sourceRef,explorerClassify}.ts`, `stores/knowledgeStore.ts`, `components/editor/FilePreviewModal.vue`, `shared/widgets/{FieldString,FallbackWidget}.vue`, `components/editor/FieldViewer.vue` | Modify |
| S6 bluepriNNts, docs, migration | `bluepriNNts/{cogNNitive,domaiNN,artifacts}/spec_NN.md`, regenerate `canonical-registry.ts`, `catalog.json` (`blueprint-catalog.mjs`), `config/samples.ts` (`sync:versions`), `workspace_NN/artifacts/artifacts_NN.md`; `scripts/migrate-hash-citations.mjs` (Create, run, ledger); two docs pages; `skills/nn-trannsform/SKILL.md` | Modify |

What happens to the nn-trannsform modules:

- **`provenance-knowledge.js`:** keeps the constants, `renderFrontmatter`, `splitTopLevelSections`, `emptySection`, `buildFreshModel`, `refreshExistingModel`, `appendProcedureRun`, `resolveLatestModelFile`, and `walkFiles` if other callers still use it. Deleted:
  - the seven scrapers, `parseModelHeader`, `parseSourceFrontmatter`, `mapSourceFormat` (moved to core), and the `render*Section` functions (moved to core);
  - the bare-array path of `toLineageData`, and the legacy `# NN Models` / `[[Models]]` alias in `refreshExistingModel`;
  - the `artifacts/` fallback (`:481-490`) and the model fallback (`:498-503`).
- **`lineage-check.js`:** keeps three checks: the record exists, `validateCitations` over all projection sites, and a CSV under `sources/nn` with no stem `.md` (rule 1). Checks 1, 2, 3 and 4.1-4.3 are deleted because they re-verify generated output. Check 4.4 (orphan archive chain) is kept as a direct filesystem check.
- **`impact-checker.js`:** `auditModelCitations` and `detectSourceFamilyEvolution` now get their citations from the projection and `validateCitations`. Diagnostic codes map to reasons:

  | Code | Reason |
  |---|---|
  | `KU_DANGLING_FILE` | `missing_file` |
  | `KU_UNKNOWN_SLUG` | `missing_heading` |
  | `KU_UNKNOWN_ROW` / `KU_UNKNOWN_COLUMN` | `missing_row` / `missing_column` |

  `findClosestSlugs` stays (suggestion UX). `findSourceUnderNn` (fuzzy basename lookup) is deleted.

## Testing Strategy (strict TDD, red first)

| Layer | What | Command |
|---|---|---|
| Unit core | `parseCitation` (`@` md / CSV / file-level / `#slug` legacy / `models/` / line-range); resolver suggestions; `validateCitations` code parity; `projectLineage` on fixture snapshots (archive versions, `superseded_by`, console meta, CSV `sources` column, terminal artifact, export-meta ignored, model fallback absent); determinism (two runs byte-equal); `meta.sources` | `npm --workspace=@cognnitive/innfo-core test` |
| Unit MCP | `resolve_sources` output unchanged; `check_workspace` reports a dangling artifact frontmatter citation | `npm --workspace=@cognnitive/innfo-mcp test` |
| Unit skill | `@`/CSV regression for `lineage-check.js:81`; preservation of journal and Watch Roots; no `is_synthetic`; curated-CSV sidecar; slug parity against the new mirror | `npm --prefix skills/nn-trannsform test` |
| Unit editor | `explorerClassify` handles `export/` with no `artifacts/` fallback; `getSourceCitations` ambiguity; English labels in the modal; shipped-version map | `npm --workspace=@cognnitive/innfo-editor test` |
| Gates | mirror `--check` (core-mirror, console-payload, preflight), `sync-versions`, `blueprint-catalog`, `generate-canonical-registry`, immutability guard, legacy ledger, typecheck/lint | `node scripts/verify.js`, `npm run check:integrity`, `npm run typecheck`, `npm run typecheck:scripts`, `npm run lint` |

Every slice that touches a bundled core file regenerates all affected mirrors in the same commit. Otherwise `verify.js` goes red.

## Migration / Rollout / Rollback

- Existing records get one noisy regeneration diff (citations replace names; consoles get populated after `export-console` is rerun). The journal is never rewritten.
- Existing consoles lack `meta.sources` until they are re-exported. Until then they show empty upstream.
- Run `#slug` migration once in S6. Then the ledger entries stay until the removal condition is met.
- Release (a `templates-v*` tag + repin, and the console bundle version) is out of scope. **Merging S4/S6 to `main` without that release makes `main` red** (validate-manifest byte-check). Batch S4/S6 into `main` together with the release.
- Rollback: `git revert` per slice. S3 is regenerable: revert it, then rerun `--lineage`.

## Open Questions / Spec Reconciliation

- [x] The `console-field-citations` scenario expects transitive citations in `meta.sources`. D7 uses a file-level citation of the kNNowledge document instead. The spec must be amended. (Amended in S2)
- [x] `lineage-bluepriNNts-docs` requires `derived_from_inputs` / `generated_by` to be typed `citation`. D10 deletes them, and D9 keeps the artifacts catalog. The spec must be amended.
- [x] The `lineage-single-edge` grammar needs one line allowing file-level (anchorless) citations (D1).
