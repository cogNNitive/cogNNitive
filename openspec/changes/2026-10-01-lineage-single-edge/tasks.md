# Tasks: Lineage as a Single Citation Edge

Inputs: `proposal.md`, `specs/*/spec.md`, `design.md` (authoritative; slices S1-S6, decisions D1-D15).

Conventions:
- Strict TDD: each behavior task starts with a failing test (RED), then the minimal change (GREEN), then cleanup (REFACTOR). Tests and code land in the same commit.
- Paths are relative to the repo root. `iNNfo/` prefixes are spelled out. Core = `iNNfo/packages/innfo-core`, MCP = `iNNfo/packages/innfo-mcp`, Editor = `iNNfo/apps/innfo-editor`, Skill = `skills/nn-trannsform`.
- Test commands:
  - core: `npm --workspace=@cognnitive/innfo-core test`
  - MCP: `npm --workspace=@cognnitive/innfo-mcp test`
  - editor: `npm --workspace=@cognnitive/innfo-editor test`
  - skill: `npm --prefix skills/nn-trannsform test`
  - gates: `node scripts/verify.js`, `npm run check:integrity`, `npm run typecheck`, `npm run typecheck:scripts`, `npm run lint`
- Rule for every slice: when a bundled core file changes, regenerate every affected mirror in the SAME commit (`scripts/build-console-payload.mjs`, and from S3 the core mirror). `--check` gates in `verify.js` go red otherwise.
- Relative imports in innfo-core MUST carry `.js` (NodeNext).
- Never edit published `_V_x-y-z_` specs, `docs/innfo/samples/`, `_samples_nn/`, `tests/**/fixtures/` for `#slug` (frozen).
- Deletion before replacement: no parallel path may exist at the end of any slice.
- Dependencies: S1 -> S2 -> S3 -> S4; S1 -> S5 (parallel with S3/S4); S6 after S2-S4. Sequential across slices; tasks inside a slice are sequential unless marked `[P]`.

---

## S1: Core primitives + merged resolver

Spec links: `citation-parser-resolver`, `lineage-single-edge` (file-level citation), `document-citations`.

- [x] 1.1 RED: add `iNNfo/packages/innfo-core/tests/parseCitation.test.ts` covering `@` md unit, CSV `data.csv@RowID&col`, file-level bare path (`kNNowledge/X_NN.md` -> `unit` undefined, no diagnostic), `#slug` -> `legacyHash: true`, `models/` rejected, line-range, `sources/export/` accepted. Run core test; must fail. Spec: "innfo-core exports one `parseCitation`", "A bare path is a valid file-level citation".
- [x] 1.2 GREEN: add `Citation` type and `parseCitation` in `iNNfo/packages/innfo-core/src/sourceRef.ts` wrapping `parseKnowledgeUnitRef`/`parseSourceRef`; `#slug` branch marked `legacy:lineage-single-edge/hash-slug-read`. Remove `parseSourceRef` and `parseKnowledgeUnitRef` from `index.ts` and `browser.ts` exports (keep module-internal); export `parseCitation` and `Citation` from both. Done when 1.1 passes and no external workspace import of the removed names remains (`rg "parseSourceRef|parseKnowledgeUnitRef" iNNfo --glob '!**/sourceRef.ts'`).
- [x] 1.3 RED: extend `tests/` for `resolveUnitPath`: accepts `sources/nn/`, `sources/export/`, `kNNowledge/`; `models/` returns null; validator emits `KU_MALFORMED` with message "`models/` was removed; use `kNNowledge/`"; bare path no longer emits `KU_DEPRECATED_HASH`. Spec: "`kNNowledge/` is the only model path prefix", "Malformed citations produce an explicit diagnostic".
- [x] 1.4 GREEN: update `iNNfo/packages/innfo-core/src/console/citations.ts` (`resolveUnitPath`, `classifyFromFrontmatter` unchanged), `validator/workspaceSources.ts:237` region, `recursiveParser/normalize.ts`, `parser/serializer.ts` (consumers of the old parsers move to `parseCitation`).
- [x] 1.5 RED: add `tests/fsSourceResolver.test.ts` for the merged resolver: existing-file resolution, `parentExists`, Levenshtein `suggestions` for a near-miss path/heading. Port the cases from MCP's current resolver tests. Spec: "One filesystem source resolver".
- [x] 1.6 GREEN: move MCP's superset (`parentExists` + `suggestions`, `iNNfo/packages/innfo-mcp/src/tools/validate.ts:293-380`) into core `console/fs-source-resolver.ts` `createFsSourceResolver`. Delete `createWorkspaceSourceResolver` from `validate.ts`. Point `validate.ts` (`collectWorkspaceDiagnostics`) and `resolve-sources.ts:25,71` at core. Done when `rg createWorkspaceSourceResolver` returns nothing and `resolve_sources` output shape is unchanged.
- [x] 1.7 RED (MCP): in `iNNfo/packages/innfo-mcp/tests/` assert `resolve_sources` snapshot output is unchanged (including suggestions) and `check_workspace` still passes existing cases. Run MCP test; confirm it exercises the core resolver.
- [x] 1.8 RED: add `tests/validateCitations.test.ts`: code parity with the old per-value loop (`KU_DANGLING_FILE`, `KU_UNKNOWN_SLUG`, `KU_UNKNOWN_ROW`, `KU_UNKNOWN_COLUMN`, `KU_MALFORMED`); `CitationDiagnostic.site` and `target` populated. Spec: "Artifact frontmatter and console meta citations are validated".
- [x] 1.9 GREEN: extract the per-value loop into exported `validateCitations(sites, resolver)` and `CitationSite`/`CitationDiagnostic` types in `validator/workspaceSources.ts`; `validateWorkspaceSources(result, resolver, snapshot?)` keeps its behavior when `snapshot` is omitted. Export from `index.ts`.
- [x] 1.10 Ledger: add entries to `legacy-ledger.yaml` for marker `legacy:lineage-single-edge/hash-slug-read` (fields `id`, `what`, `paths` = core files carrying the marker only, `why`, `removal` = "no `#slug` left outside frozen paths + maintainer sign-off", `owner`). Verify with `node scripts/lib/legacy-ledger-guard.js`. (The `hash-slug-migrate` entry is added in 6.x.) Spec: "`#slug` is a legacy read path inside innfo-core only".
- [x] 1.11 Mirrors: run `node scripts/build-console-payload.mjs` and `node scripts/build-trannsform-slug-mirror.mjs` (S3 renames it) to regenerate `iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs` and the slug mirror in this commit if their bundled core files changed.
- [x] 1.12 Gate: `npm --workspace=@cognnitive/innfo-core test`, `npm --workspace=@cognnitive/innfo-mcp test`, `npm run typecheck`, `npm run lint`, `node scripts/verify.js`. Rebuild innfo-core dist before trusting MCP failures.

Release note: none (no bluepriNNt change in S1).

## S2: Lineage projection + snapshot + console `meta.sources`

Spec links: `citation-parser-resolver` ("Lineage projection is an innfo-core export"), `lineage-record-sync`, `console-field-citations`, `lineage-single-edge`, `source-sidecar`.

- [x] 2.1 RED: create `iNNfo/packages/innfo-core/tests/lineage/project.test.ts` with fixture `FileSnapshot[]`: sources with archive versions and `superseded_by`; kNNowledge with body `sources::` citations; markdown artifact frontmatter `sources:`; console HTML `innfo-model.meta.sources`; CSV `sources` column and JSON `sources` string/string[]; terminal artifact (no sources, no diagnostic); legacy `export-meta` ignored; no model/`knowledge_version` fallback; promoted `sources/export/*.md` with its own `sources:`; no `is_synthetic`/sidecar `derived_from`. Spec: "View sections come from one innfo-core projection", "Consoles and artifacts appear with real upstream lineage", "CSV/JSON `sources` is optional".
- [x] 2.2 GREEN: create `iNNfo/packages/innfo-core/src/lineage/project.ts` (`projectLineage`, `extractFileCitations`, types `LineageSource|LineageKnowledge|LineageArtifact|LineageProjection`), reading kNNowledge via `parseKnowledge` + `SOURCE_FIELD_NAMES` + `splitSourceFieldValue` (no regex). Sorted paths, no clock. Browser-safe.
- [x] 2.3 RED: `tests/lineage/render.test.ts` for `renderLineageSections` (fields exactly: Sources `raw_filename, media_filename, raw_hash, size, source_format, normalized_at, normalized_by, normalized_content, curated_csv, status, version, archive_path, superseded_by, derived_from`; ModelRecords `model_ref, knowledge_version, model_template, derived_from`; Artifacts `artifact_ref, artifact_format, derived_from`) and determinism (two runs byte-equal). Spec: "View fields are typed `citation`".
- [x] 2.4 GREEN: create `src/lineage/render.ts`, `src/lineage/index.ts`; export from `browser.ts` (browser-safe subset) and `index.ts`.
- [x] 2.5 RED: `tests/lineage/fsSnapshot.test.ts` using a temp workspace: scope is `.md`/`.csv` under `sources/nn` (excluding `staging/`), `sources/archive/**/*.md`, `sources/export/**/*.md`, `kNNowledge/**/*_NN.md` (excluding the record with `parent_spec.name: cogNNitive`), `export/**/*.{md,html,csv,json}`. 
- [x] 2.6 GREEN: create `src/lineage/fs-snapshot.ts` (`readLineageSnapshot(root)`, Node-only; exported from `index.ts` only, NOT `browser.ts`).
- [x] 2.7 RED: `tests/lineage/validateWorkspace.test.ts`: `validateWorkspaceSources(res, r, snapshot)` reports a dangling artifact frontmatter citation and a dangling console `meta.sources`; no false positives on `ModelRecords.derived_from` (typed `citation`). Spec: "Artifact frontmatter and console meta citations are validated".
- [x] 2.8 GREEN: wire `validateCitations(extractFileCitations(snapshot))` into `validateWorkspaceSources`; pass `readLineageSnapshot` result from `collectWorkspaceDiagnostics` in `iNNfo/packages/innfo-mcp/src/tools/validate.ts`. MCP test: `check_workspace` reports a dangling artifact frontmatter citation.
- [x] 2.9 RED: add to console payload tests `meta.sources === ["kNNowledge/<path>_NN.md"]` (file-level, D7), including the MCP `build_console_payload` tool path. Spec: "Consoles emit `innfo-model.meta.sources`".
- [x] 2.10 GREEN: set `meta.sources` once in `iNNfo/packages/innfo-core/src/console/payload-builder.ts` (~line 304); `ConsolePayloadMeta` gets `sources: string[]`. Update stale tests that assert the old meta shape.
- [x] 2.11 Mirrors: regenerate `console-payload.generated.cjs` (`node scripts/build-console-payload.mjs`) and the slug mirror in the same commit; confirm `--check` passes.
- [x] 2.12 Gate: core + MCP tests, `npm run typecheck`, `npm run lint`, `node scripts/verify.js`.

Spec reconciliation (must be done before or inside this slice): amend `specs/console-field-citations/spec.md` so `meta.sources` is the file-level kNNowledge citation (design Open Question 1). Record the amendment in this commit.

## S3: Mirror + nn-trannsform migration

Spec links: `nn-trannsform-lineage-checks`, `lineage-record-sync`, `lineage-single-edge` ("Legacy edge mechanisms are removed"), `source-sidecar`, `citation-parser-resolver`.

- [x] 3.1 RED: add `skills/nn-trannsform/tests/core-mirror.test.js` asserting the generated CJS exports `parseCitation`, `createFsSourceResolver`, `validateCitations`, `projectLineage`, `renderLineageSections`, `readLineageSnapshot`, slug primitives; slug parity with core. Also a mirror-determinism check (no absolute/junction paths embedded; `(?:\.\./)+node_modules/` normalized). Command: `npm --prefix skills/nn-trannsform test`.
- [x] 3.2 GREEN: rename `scripts/build-trannsform-slug-mirror.mjs` to `scripts/build-trannsform-core-mirror.mjs`; settings `platform: 'node'`, `absWorkingDir: REPO_ROOT`, `legalComments: 'none'`, path normalization copied from `scripts/build-console-payload.mjs:45`. Create `iNNfo/packages/innfo-core/src/trannsformPrimitives.ts`; delete `slugPrimitives.ts`; generate `skills/nn-trannsform/scripts/lib/innfo-core.generated.cjs`; delete `slug-mirror.generated.cjs`. Update `scripts/verify.js:370` (renamed `--check` step) and `markdown-utils.js` import. Run the `--check` from both a primary checkout path and this worktree.
- [x] 3.3 RED: `skills/nn-trannsform/tests/provenance-knowledge.test.js` rewritten: record view sections equal `renderLineageSections(projectLineage(readLineageSnapshot(root)))`; `# NN Procedures` journal and `## NN External Watch Roots` preserved byte-for-byte through `refreshExistingModel`; no `is_synthetic`; no `artifacts/` fallback; no `model`/`knowledge_version` fallback; legacy `# NN Models` / `[[Models]]` alias not honored; bare-array `toLineageData` removed. Spec: "Hand-authored blocks pass through", "Deprecated artifacts/ fallback and model fallback removed from generation".
- [x] 3.4 GREEN: in `skills/nn-trannsform/scripts/lib/provenance-knowledge.js` delete the seven scrapers (`scrapeSourceRefs`, `parseFrontmatterSources`, `parseArtifactMeta`, `collectSources`, `collectArchivedSources`, `collectModels`, `collectArtifacts`), `parseModelHeader`, `parseSourceFrontmatter`, `mapSourceFormat`, the `render*Section` functions, and the fallbacks at `:481-490` and `:498-503`. Keep `renderFrontmatter`, `splitTopLevelSections`, `emptySection`, `buildFreshModel`, `refreshExistingModel`, `appendProcedureRun`, `resolveLatestModelFile`, `walkFiles` (if still used). Sections come from the mirror. Remove the `Models` alias.
- [x] 3.5 RED: `tests/lineage-check.test.js`: canonical `@` and CSV citations produce no error (regression for `:81`); checks kept are (a) record exists, (b) `validateCitations` over projection sites, (c) CSV under `sources/nn` with no stem `.md` (rule 1), (d) orphan archive chain (old 4.4). Checks 1-3 and 4.1-4.3 are removed. Spec: "lineage-check delegates citation validation to innfo-core".
- [x] 3.6 GREEN: rewrite `skills/nn-trannsform/scripts/lib/lineage-check.js` accordingly (removes the `#.*` strip and `models/` skip).
- [x] 3.7 RED: `tests/impact-checker.test.js`: citations come from projection + `validateCitations`; code->reason map `KU_DANGLING_FILE`->`missing_file`, `KU_UNKNOWN_SLUG`->`missing_heading`, `KU_UNKNOWN_ROW`->`missing_row`, `KU_UNKNOWN_COLUMN`->`missing_column`; `findClosestSlugs` suggestion still works; `findSourceUnderNn` gone. Spec: "Automatic Impact Detection on Scan".
- [x] 3.8 GREEN: update `impact-checker.js` (`auditModelCitations`, `detectSourceFamilyEvolution`); delete `findSourceUnderNn` and `#slug`/heading-drift copies.
- [x] 3.9 RED: `tests/scanner-sidecar.test.js`: no `is_synthetic` or sidecar `derived_from` written; feedback docs still `source_type: feedback` (`scanner-core.js:661-662`); a curated CSV without a profile `.md` gets a sidecar (`source_file`, `sha256`, `size_bytes`, `normalized_at`) instead of null metadata (`provenance-knowledge.js:173-190`); a reused artifact is promoted to `sources/export/` with a sidecar. Spec: "Every citable Source has a normalized sidecar", "`is_synthetic` is not stored", "Synthetic Deliverable Ingestion", "Feedback JSON Ingestion".
- [x] 3.10 GREEN: edit `scanner-core.js`, `scanner-converters.js`, `curate-csv.js`, `duplicate-guards.js` (swap local parsing/slug code for the mirror, drop `is_synthetic`).
- [x] 3.11 Check `skills/nn-trannsform/package.json` is untouched except for needed devDeps; CI still uses `npm ci --prefix skills/nn-trannsform`.
- [x] 3.12 Gate: `npm --prefix skills/nn-trannsform test`, `node scripts/verify.js` (core-mirror `--check`), `npm run typecheck:scripts`, `npm run lint`.

Release note: the skill bundle is regenerated, not released (skill version bump out of scope).

## S4: Console runtime slug + bundle rebuild

Spec links: `console-field-citations` ("Console runtime slug parity with core", "Compile-time citation payload"), `lineage-single-edge` ("Legacy edge mechanisms are removed").

- [x] 4.1 RED: add a test (core or script test, whichever hosts the console bundle tests) asserting `console/innfo-slug.generated.js` exposes global `InnfoSlug`, slug parity with core `parser/slug.ts` on a fixture corpus (accents, punctuation, empty -> runtime fallback `'feedback'` stays in `innfo-runtime.js`), and the bundle concatenates it first. Also assert no second `slugify` body exists in `innfo-runtime.js` (`rg slugify`). Spec: "Console runtime slug parity with core".
- [x] 4.2 GREEN: extend `scripts/build-console-payload.mjs` to emit `iNNfo/specs/bluepriNNts/console/innfo-slug.generated.js` (IIFE, global `InnfoSlug`, from `parser/slug.ts`). Update `scripts/build-console-bundle.mjs` to concatenate it first. `iNNfo/specs/bluepriNNts/console/innfo-runtime.js:33` delegates to `InnfoSlug` and keeps only the `'feedback'` empty fallback.
- [x] 4.3 RED/GREEN: delete the only `export-meta` reader (`parseArtifactMeta` already removed in S3; confirm `rg "export-meta"` finds no readers) and update the console contract example in `iNNfo/specs/bluepriNNts/business/spec_NN.md` to cite with `@` (bluepriNNt `blueprint_version` bump; run `npm run sync:versions`). Test: `node scripts/verify.js` (blueprint integrity) plus a check that the contract example parses with `parseCitation`.
- [x] 4.4 Rebuild `innfo-console.bundle.js` and all generated artifacts; run each `--check` (console-payload, console bundle, preflight). Commit generated files with the source change.
- [x] 4.5 Gate: core tests, `node scripts/verify.js`, `npm run check:integrity`, `npm run typecheck`, `npm run lint`.

Release coupling (S4 and S6): the bluepriNNt version bump and the regenerated console bundle make `main` red under `validate-manifest` unless a matching `templates-v*` tag + repin exists. Merge S4/S6 to `main` only together with that release. The release itself (tag, repin, console bundle version, skills/MCP version bump) is OUT OF SCOPE for this change.

## S5: Editor

Spec links: `editor-lineage-ui`. Depends on S1 only; can run in parallel with S3/S4 (separate PR branch).

- [x] 5.1 RED: `iNNfo/apps/innfo-editor/tests/` (follow existing layout): `sourceRef` tests that pills for `@` md, CSV, file-level, and legacy `#slug` all resolve through `parseCitation`; `explorerClassify` classifies `export/` as artifact and `artifacts/` is NOT a fallback; `getSourceCitations` uses exact canonical `filePath` equality (ambiguous bare name -> unresolved, no suffix match); `FilePreviewModal` renders English labels (no "Archivo Original", "Linaje", "normalizado", "cita"); shipped-version map includes the new bluepriNNt versions (this assertion is completed in S6). Command: `npm --workspace=@cognnitive/innfo-editor test`. Spec: "Pills and modal use the core parser and resolver", "Explorer classifies `export/` as artifact", "Preview modal UI strings are English", "Editor reverse lookup uses canonical path equality".
- [x] 5.2 GREEN: `iNNfo/apps/innfo-editor/src/utils/sourceRef.ts` (`parseForPill` -> core `parseCitation` from the browser entry; fix stale header comment `:8-13`), `utils/explorerClassify.ts:20` (`artifacts/` -> `export/`, no fallback; callers `FileTreeNode.vue:125`, `WorkspaceExplorer.vue:228` stay correct), `stores/knowledgeStore.ts:217-230` (`getSourceCitations`), `components/editor/FilePreviewModal.vue` (English strings, `@` citations), `shared/widgets/{FieldString,FallbackWidget}.vue` and `components/editor/FieldViewer.vue` (use `parseCitation`).
- [x] 5.3 Done criteria: `rg "parseForPill"` returns nothing; `rg "Archivo Original|Linaje|normalizado"` in `FilePreviewModal.vue` returns nothing; Lineage tab shows the single edge (`derived_from` citation, no `origin: 'source'` edge reintroduced).
- [x] 5.4 Gate: editor tests (remember: tests share one fake-indexeddb; reset per test), `npm run typecheck`, `npm run lint`, `node scripts/verify.js`.

## S6: bluepriNNts + docs + `#slug` migration

Spec links: `lineage-bluepriNNts-docs`, `lineage-record-sync` ("View fields are typed `citation`"), `editor-lineage-ui` ("New bluepriNNt versions are registered"), `citation-parser-resolver` (legacy read path), `lineage-single-edge`.

Pre-step: amend specs per design Open Questions 2 and 3 (`lineage-bluepriNNts-docs` no longer requires `derived_from_inputs`/`generated_by` typed `citation`: D10 deletes them, D9 keeps the artifacts catalog; `lineage-single-edge` grammar adds one line for file-level citations, D1; correct "template_version" to `blueprint_version` for domaiNN, D11).

- [ ] 6.1 RED: add a test (core `tests/bluepriNNts/` or the existing blueprint-spec test location) asserting the cogNNitive bluepriNNt: `template_version` V_0-3-0; the view field set matches the projection (Sources/ModelRecords/Artifacts fields listed in S2.3, `derived_from` typed `citation`); removed fields absent (`generated_by`, `produced_by`, `derived_from_inputs`, `location`, `artifact_version`, `artifact_hash`, `model_version`, `raw_file`, `Artifact-Source Lineage` matrix); stale cross-model claim section (`:243-245`) gone and `:249` example uses `@`. Also: domaiNN has no `kNNowledge.derived_from`, `blueprint_version` V_0-2-0; artifacts catalog `blueprint_version` V_0-4-0 without `sources`/`produced_by`. Also a validator run over a sample workspace shows no dangling-reference false positives on `ModelRecords.derived_from`.
- [ ] 6.2 GREEN: edit in place (maintainer-approved Option B, `frozen_blueprints`): `iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md` (V_0-2-0 -> V_0-3-0), `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md` (delete `:94` `derived_from`; `blueprint_version` V_0-1-0 -> V_0-2-0), `iNNfo/specs/bluepriNNts/artifacts/spec_NN.md` (drop `sources` and `produced_by`; V_0-3-0 -> V_0-4-0), `workspace_NN/artifacts/artifacts_NN.md` (and any `_samples_nn` / use-case docs referencing removed fields, excluding frozen paths).
- [ ] 6.3 Registration and generated files: `npm run sync:versions` (regenerates `config/samples.ts`; gated by `sync-versions --check`), regenerate `canonical-registry.ts` (`generate-canonical-registry`), regenerate `catalog.json` (`blueprint-catalog.mjs`). Confirm `manifest/source.yaml` `version:` (spec_version) is unchanged and `template_version` is not confused with it. Template inventory guard: no new folders, so no `manifest/source.yaml` addition expected.
- [ ] 6.4 RED: `iNNfo/apps/innfo-editor` test asserting shipped-version map includes the bumped versions (finishes 5.1). GREEN via `sync:versions` output. Command: editor test.
- [ ] 6.5 RED: `scripts/migrate-hash-citations.test.*` (follow `scripts/` test convention): the migrator rewrites `#slug` to `@` using `extractHeadings` + `serializeKnowledgeUnitRef` via the mirror, is idempotent, and SKIPS `_V_*` files, `docs/innfo/samples/`, `_samples_nn/`, `tests/**/fixtures/`. Spec: `citation-parser-resolver` legacy path.
- [ ] 6.6 GREEN: create `scripts/migrate-hash-citations.mjs` (marker `legacy:lineage-single-edge/hash-slug-migrate`; one-shot maintainer command, not run automatically by nn-trannsform). Add the ledger entry (`id`, `what`, `paths`, `why`, `removal`, `owner`) and run `node scripts/lib/legacy-ledger-guard.js`.
- [ ] 6.7 Run the migrator once on non-frozen content; review the diff; `rg "#" ` check that only frozen paths still contain `#slug` citations. Commit the migration separately from the script.
- [ ] 6.8 Docs: rewrite `docs/innfo/documentation/sources-citations-lineage.md` and `docs/skills/documentation/skills/citation-traceability.md` (`@` grammar incl. file-level citation, three rules, record = view + journal, staleness principle; no OKF, "canonical view", `sources/original/`); update `skills/nn-trannsform/SKILL.md`. Test: `node scripts/verify.js` docs/link checks and `check:spec-urls` (write `cogNNitive/iNNfo` slugs as split code spans inside `openspec/specs/`).
- [ ] 6.9 Final gate: `node scripts/verify.js`, `npm run check:integrity`, `npm run typecheck`, `npm run typecheck:scripts`, `npm run lint`, all four workspace test commands; rerun skill tests with empty `USERPROFILE`/`HOME` to avoid leaking the real home dir. Success-criteria sweep: `rg createWorkspaceSourceResolver|parseForPill|export-meta|is_synthetic` returns no live code; no second `slugify` outside core.

Release coupling: S6 edits bluepriNNt specs in place and bumps versions. `main` goes red (validate-manifest byte-check of template content vs the `templates-v*` pin) unless merged together with a new `templates-v*` tag + repin. Release is out of scope; keep S4+S6 on the session branch / chain until the maintainer cuts the release.

---

## Review Workload Forecast

| Slice | Scope | Est. changed lines (incl. tests, excl. generated) | Generated churn (mirrors, bundle, registry) |
|---|---|---|---|
| S1 | core parser/resolver/validator, MCP delete, ledger | ~450 | ~300 (payload + slug mirror) |
| S2 | projection, render, snapshot, meta.sources, MCP wiring | ~650 | ~200 |
| S3 | mirror script, nn-trannsform migration (mostly deletions) | ~700 (net negative code, large diff) | ~4,000 (`innfo-core.generated.cjs`) |
| S4 | slug IIFE, bundle, runtime, contract example | ~150 | ~1,500 (`innfo-console.bundle.js`) |
| S5 | editor | ~300 | 0 |
| S6 | bluepriNNts, docs, migrator, migration diff | ~600 (excl. migration diff) | ~500 |
| **Total** | | **~2,850** | **~6,500 (reviewable as generated)** |

- 400-line budget risk: High
- Chained PRs recommended: Yes
- Decision needed before apply: Yes (delivery strategy `ask-on-risk` fired: choose chained PRs or `size:exception`; if chained, choose `chain_strategy` = `stacked-to-main` or `feature-branch-chain`. S4/S6 cannot land on `main` without the out-of-scope `templates-v*` release, so `feature-branch-chain` is the safer fit.)

Suggested work-unit commits (tests with code; mirrors with their source change):

- S1
  1. `feat(innfo-core): add parseCitation and make bare paths file-level citations` (1.1-1.4)
  2. `refactor(innfo-core): move MCP source resolver into core createFsSourceResolver` (1.5-1.7)
  3. `feat(innfo-core): export validateCitations; regenerate mirrors; ledger entry` (1.8-1.12)
- S2
  1. `feat(innfo-core): add lineage projection and renderer` (2.1-2.4)
  2. `feat(innfo-core): add readLineageSnapshot and validate artifact/console citations` (2.5-2.8)
  3. `feat(innfo-core): emit console meta.sources; regenerate payload mirror` (2.9-2.12, spec amendment)
- S3
  1. `build(nn-trannsform): generalize slug mirror into core mirror` (3.1-3.2, with generated file)
  2. `refactor(nn-trannsform): generate record sections from core projection, delete scrapers` (3.3-3.4)
  3. `refactor(nn-trannsform): delegate lineage-check and impact-checker to core` (3.5-3.8)
  4. `feat(nn-trannsform): sidecars for curated CSVs; drop is_synthetic` (3.9-3.12)
- S4
  1. `refactor(console): derive runtime slug from core via generated IIFE; rebuild bundle` (4.1-4.5)
- S5
  1. `refactor(editor): use core parseCitation and canonical-path lookup` (5.1-5.2)
  2. `fix(editor): classify export/ as artifact and translate preview modal` (5.3-5.4)
- S6
  1. `docs(openspec): reconcile lineage-single-edge specs with design` (pre-step)
  2. `feat(bluepriNNts): single-edge lineage fields; bump versions and regenerate registry` (6.1-6.4)
  3. `feat(scripts): add one-shot #slug citation migrator with ledger entry` (6.5-6.6)
  4. `chore: migrate #slug citations to @ in non-frozen content` (6.7)
  5. `docs: rewrite lineage and citation documentation` (6.8-6.9)

Chained PR boundaries (if chosen): PR1 = S1, PR2 = S2, PR3 = S3, PR4 = S4, PR5 = S5 (branches from S1), PR6 = S6. S4 and S6 stay unmerged to `main` until the release.
