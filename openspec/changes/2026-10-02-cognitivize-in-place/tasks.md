# Tasks: Cognitivize in Place

Inputs: `proposal.md`, `design.md` (authoritative, incl. "Clarifications"; decisions D1-D17), `specs/*/spec.md`.

## Conventions

- Strict TDD: every behavioural task is RED (failing test, run it, see it fail) then GREEN (minimal change, same command passes) then REFACTOR. Tests and code land in the same work-unit commit.
- Paths are repo-root relative. Core = `iNNfo/packages/innfo-core`, MCP = `iNNfo/packages/innfo-mcp`, Editor = `iNNfo/apps/innfo-editor`, Skill = `skills/nn-trannsform`.
- Test commands:
  - core: `npm --workspace=@cognnitive/innfo-core test`
  - MCP: `npm --workspace=@cognnitive/innfo-mcp test` (rebuild innfo-core dist first; stale dist gives false MCP failures)
  - editor: `npm --workspace=@cognnitive/innfo-editor test` (reset fake-indexeddb per test)
  - skills: `npm --prefix skills/nn-trannsform test`, `node --test skills/nn-preflight/scripts`, `node --test skills/nn-upgrade/scripts`
  - gates: `node scripts/verify.js`, `npm run check:integrity`, `npm run typecheck`, `npm run typecheck:scripts`, `npm run lint`, `node scripts/lib/legacy-ledger-guard.js`
- Skill/preflight reruns: set `USERPROFILE` and `HOME` to an empty dir under gitignored `temp/` (e.g. `temp/empty-home`) before trusting green.
- Relative imports in innfo-core carry `.js` (NodeNext). Fs adapters (`writeOnce/fs.ts`, `cognitivize/cognitivize.ts`, `lineage/fs-snapshot.ts`) are exported from `index.ts` only, never `browser.ts`.
- Generated files: when a bundled core file changes, regenerate IN THE SAME COMMIT or `verify.js` goes red:
  - core mirror `skills/nn-trannsform/scripts/lib/innfo-core.generated.cjs` (`node scripts/build-trannsform-core-mirror.mjs`)
  - preflight mirrors incl. new `skills/nn-preflight/scripts/lib/naming-contract.generated.cjs` (`node scripts/build-preflight-primitives.mjs`)
  - console payload mirror (`node scripts/build-console-payload.mjs`) and console bundle (`node scripts/build-console-bundle.mjs`)
  - canonical registry (`generate-canonical-registry`), `catalog.json` (`blueprint-catalog.mjs`), `config/samples.ts` and bumped versions (`npm run sync:versions`)
  - rendered vocabulary doc `docs/innfo/documentation/vocabulary.md` from `iNNfo/specs/vocabulary.json`
- Frozen content is never edited except where Resolved Question 1 allows (behavior-only, in place): published `_V_x-y-z_` specs, `docs/innfo/samples/`, `docs/cognitive_nn/use-cases/`, frozen samples, `iNNfo/specs/bluepriNNts/workspace/procedures/` names.
- New bluepriNNt folders must be added to `manifest/source.yaml` (template inventory guard). `manifest/source.yaml` `version:` is spec_version, not `template_version`.
- Never write a bare `cogNNitive/iNNfo` slug inside `openspec/specs/` (write split code spans; `check:spec-urls`).
- Every `legacy:cognitivize-in-place/<id>` marker has exactly one `legacy-ledger.yaml` entry (`id`, `what`, `paths`, `why`, `removal`, `owner`). Three markers: `layout-detect`, `layout-migrate`, `upgrade-flow` (design ledger table).
- Re-resolve every file:line ref at apply time (the base tree moves).
- Slice order is strictly sequential on `dev`: S-pre, S0, S1, S2, S3a, S3b, S4, S5, S6, S7. Each slice is an independently green work-unit commit range. Nothing goes to `main` before the release.

---

## S-pre: Sync with dev

- [x] P.1 Sync `session/cognitivize-in-place` with `dev` containing `lineage-single-edge` (merge or rebase; no stash). Run `npm ci`, `npm --prefix skills/nn-trannsform ci`, build innfo-core dist.
- [x] P.2 Re-verify every file:line ref in `design.md` File Changes against the synced tree (`rg`); record drifted refs in the S0 commit message. Confirm the base gates are green: `node scripts/verify.js`, `npm run check:integrity`, all four test commands.
- [x] P.3 Confirm `lineage-single-edge` ledger entries and `legacy-ledger-guard` pass before adding new markers.

## S0: Naming contract, sidecar bluepriNNt, one discovery predicate

Spec links: `nn-naming-contract`, `model-discovery-predicate`, `sidecar-blueprint`, `canonical-vocabulary`, `lineage-single-edge` ("Node role derives from the naming contract").

- [x] 0.1 RED: `innfo-core/tests/naming/contract.test.ts` table tests: `parseName`/`formatMemberName` round trips (digits in key, `-10` after `-2`, `.csv_sidecar`), `formatNNName` (stem===bp), `sidecarPathOf`/`rawPathOfSidecar`, `displayStem`, `procedureIdOf`. Run core test; must fail.
- [x] 0.2 GREEN: create `innfo-core/src/naming/{contract,index}.ts` (D1/D2/D4 grammar, the only `_NN.md` pattern). Export from `index.ts`, `browser.ts`, `trannsformPrimitives.ts`.
- [x] 0.3 RED: `roleOf` folder-blindness, `isExcludedPath` (IGNORED_DIRECTORIES + `staging` + dot segments), `familyOf`/`compareMembers` (unsuffixed first, numeric `(stamp, seq)`). GREEN: implement in `contract.ts`.
- [x] 0.4 RED: `formatUtcStamp`/`nextStamp` under `TZ=America/Santiago`, skewed clock, equality bumps `seq`; `checkPathBudget` (259 on win32). GREEN: implement (single UTC helper, D5).
- [x] 0.5 RED: `isModelCandidate` excludes sidecars, cognnitive/workspace/procedures/sources/artifacts/sidecar parent_specs, staging; `list_models` and `## NN Models` agree. GREEN: rewrite `workspace/discoverModels.ts` (delete `NN_FILENAME_RE`, `NON_KNOWLEDGE_SPEC_RE`; keep manifest self-reference in `isReconcilableModel`); update `recursiveParser/{paths,knowledge,workspace}.ts`, `validator/content.ts`, `console/{payload-builder,feedback-ledger}.ts`, `lineage/{project,fs-snapshot}.ts`.
- [x] 0.6 RED (MCP): `list_knowledge`, `spec`, `validate`, `init-knowledge`, `workspace-sync`, `preview-server`, `build-console-payload`, `apply-change`, `resolver-node` never list a seeded sidecar fixture. GREEN: move those MCP files to contract imports (design S0 row).
- [x] 0.7 RED (editor): discovery parity and `explorerClassify` with a seeded sidecar. GREEN: `explorerClassify.ts`, `knowledgeMatching.ts`, `submodelPath.ts`, `HomeView.vue`, `useMediaScanner.ts`, `WorkspaceSyncService.ts`, `WorkspacePersistenceService.ts`, `ConsoleHubView.vue`, `ConceptTreeNode.vue`, `SaveWorkspaceModal.vue`, `KnowledgeInfoPanel.vue` use contract exports.
- [x] 0.8 RED (skills/scripts): sidecar absent from `export-console.mjs` targets, `workspace-index.js`, `duplicate-guards.js`, `preflight-check.js:670-684`, `upgrade-check.js:57`, `convergence-delta.js`, `external-scanner.js`, `impact-checker.js`, `conversations.js`, `transformer.js`, `provenance.js`; one timestamp helper only. GREEN: swap in the mirror; delete the four local-time stamp implementations. Add the 4th preflight bundle target (`naming-contract.generated.cjs`) in `scripts/build-preflight-primitives.mjs`.
- [x] 0.9 RED: create `iNNfo/specs/bluepriNNts/sidecar/spec_NN.md` test (frontmatter shape, `level: 3`, `parent_spec.name: sidecar`, fields from design). GREEN: write the bluepriNNt; add folder to `manifest/source.yaml` (inventory guard) and to `generate-canonical-registry.mjs` MAP; add `sidecar` and `cognitivize` entries to `iNNfo/specs/vocabulary.json`.
- [x] 0.10 RED: `scripts/lib/nn-name-regex-guard.js` test, proven red on a seeded `_NN\.md` regex outside `src/naming/`; allowlist with reasons (D15). GREEN: implement guard and wire it as a `verify.js` step.
- [x] 0.11 Generated: run all mirror builds, `npm run sync:versions`, canonical registry, `blueprint-catalog.mjs`, vocabulary doc render; commit generated files with source.
- [x] 0.12 Gate: core, MCP, editor, skills (empty-home), `node scripts/verify.js`, `npm run check:integrity`, `npm run typecheck`, `npm run typecheck:scripts`, `npm run lint`.

Commits: (a) contract + tests (0.1-0.4); (b) discovery consumers core/MCP (0.5-0.6); (c) editor/scripts/skills (0.7-0.8); (d) sidecar bluepriNNt, vocabulary, guard, generated (0.9-0.12). Each under 400 lines excluding generated.

## S1: writeOnce, cognitivize, JSON Pointer (additive)

Spec links: `write-once-artifacts`, `cognitivize-in-place` (core op, sidecar, idempotence, injected normalizer), `citation-parser-resolver` ("JSON Pointer is a unit kind"), `document-citations`.

- [x] 1.1 RED: `tests/writeOnce/plan.test.ts`: `latestOfFamily`, `planGc` determinism (cited and latest never proposed; sidecar citation counts for subject; record exempt). GREEN: `src/writeOnce/plan.ts`.
- [x] 1.2 RED: `tests/writeOnce/fs.test.ts`: A,B,A writes a third member; O_EXCL race retries `seq+1`; CRLF bytes generated at test time hash raw; `HASH_MISMATCH`; `PATH_TOO_LONG`; dedup against latest only. GREEN: `src/writeOnce/{fs,index}.ts` (`writeOnce`, `applyGc` recompute plan, delete `confirmed ∩ plan` with sidecars).
- [x] 1.3 RED: `tests/cognitivize/cognitivize.test.ts`: `written`/`refreshed`/`unchanged`; md/csv/json bodyless; binary without normalizer `requires-normalizer`; rejects sidecar, `_NN.md`, excluded, too-long, not-found; `source_file` workspace-relative; sidecars never carry `derived_from` (Clarifications). GREEN: `src/cognitivize/{sidecar,cognitivize,index}.ts`, `importRaw` into `sources/import/` verbatim.
- [ ] 1.4 RED: pointer unit tests: `data.json@/items/0/name` parse/serialize, `%26`, empty pointer = file-level, `KU_UNKNOWN_POINTER`, `KU_INVALID_JSON`. GREEN: `PointerUnit` in `sourceRef.ts`, `unitResolve.ts`, `validator/workspaceSources.ts`.
- [ ] 1.5 RED: exhaustive `unit.kind` dispatch (compile error on a fake extra kind via `// @ts-expect-error` test). GREEN: `switch` + `assertNever` at `workspaceSources.ts`, `unitResolve.ts`, `sourceRef.ts`, `console/citations.ts`, editor `FilePreviewModal.vue`; delete editor duplicate serializer `utils/sourceRef.ts` in favor of core.
- [ ] 1.6 Generated: core mirror, preflight mirrors, console payload mirror. Gate: core, editor, MCP, `node scripts/verify.js`, typecheck, lint.

Commits: (a) plan+fs writeOnce; (b) cognitivize; (c) pointer unit + exhaustive dispatch + mirrors.

## S2: `export/` to `artifacts/`, drop `sources/original`, layout detector

Spec links: `workspace-directory-conventions`, `sample-workspaces`, `workspace-template-upgrade` (detect), `editor-lineage-ui`, `console-export-cli`.

- [ ] 2.1 RED: `rg`-based test that `export/` and `sources/original` appear in no live code path (marked-legacy lines excepted); `fs-snapshot` walks `artifacts/`; `explorerClassify` classifies `artifacts/` with no fallback. GREEN: `fs-snapshot.ts`, `project.ts`, `render.ts`, `build-console-payload.ts`, `export-console.mjs`, `impact-checker.js`, `transformer.js`, `bootstrap.js`, `scanner-core.js`, `webImport.js`, `process-images.js`, `index.js`, `preflight-check.js`, `workspaceSources.ts`, `upgrade-check.js`, editor `explorerClassify.ts`, `ConsoleHubView.vue` paths.
- [ ] 2.2 RED: bootstrap writes `.gitattributes` with `* -text` for the domaiNN; CRLF fixture hash stays stable. GREEN: `bootstrap.js`.
- [ ] 2.3 RED: `tests/legacy/layout/detect.test.ts`: `detectLegacy` reports `legacy-layout` for `sources/nn|original|export|archive`, `export/`. GREEN: `legacy/layout/detect.ts` (marker `legacy:cognitivize-in-place/layout-detect`), call in `legacy/detect.ts`, `legacy/index.ts`.
- [ ] 2.4 RED: `legacy/layout/plan.test.ts`: `planLayoutMigration` returns `move|write|delete` ops + stable `planHash`; `delete` only for byte-identical duplicates/retired mirrors; old `_YYYYMMDD-HHmmss` converted via `deps.localToUtc`; `sources/archive/` never moved. GREEN: `legacy/layout/plan.ts` (marker `layout-migrate`); add `delete` Op type.
- [ ] 2.5 RED: nn-upgrade end-to-end on a legacy fixture: backup, dry run, `--plan-hash` consent, preserved-body normalizer from `staging/migration/`, archive-citation warnings, staging removed. GREEN: `skills/nn-upgrade/scripts/migrate-domain.js` second Flow A step (marker `upgrade-flow`).
- [ ] 2.6 Ledger: add `layout-detect`, `layout-migrate`, `upgrade-flow` entries to `legacy-ledger.yaml`; run `node scripts/lib/legacy-ledger-guard.js`.
- [ ] 2.7 Migrate non-frozen sample workspaces/fixtures with the tool itself; regenerate mirrors (core, preflight/legacy-detect, console payload); `sync:versions` if bluepriNNt bytes changed.
- [ ] 2.8 Gate: core, MCP, editor, skills (empty-home), nn-upgrade, `verify.js`, `check:integrity`, typecheck, lint.

Commits: (a) rename `artifacts/` + drop `sources/original`; (b) detector; (c) planner + nn-upgrade + ledger; (d) fixture migration output.

## S3a: Resolver and MCP `cognitivize` tool (additive)

Spec links: `citation-parser-resolver` ("no implicit prefix"), `cognitivize-in-place` ("MCP never converts binaries", "CLI surface"), `workspace-sources-resolution`, `typed-source-references`.

- [ ] 3a.1 RED: `resolveUnitPath` accepts any domaiNN-relative md/csv/json path; binary raw returns `KU_BINARY_TARGET` with sidecar suggestion; `kind` is `model` iff role `knowledge`; staging target gives `KU_EXCLUDED_PATH` (Clarifications). GREEN: `sourceRef.ts`, `validator/workspaceSources.ts`, `unitResolve.ts`.
- [ ] 3a.2 RED (MCP): `cognitivize` tool: md written, pdf returns `{status:'requires-cli'}`, traversal rejected, sidecar/`_NN.md` rejected. GREEN: create `innfo-mcp/src/tools/cognitivize.ts`, register in the server.
- [ ] 3a.3 Generated: mirrors; rebuild core dist before MCP. Gate: core, MCP, `verify.js`, typecheck, lint.

## S3b: Ingest cutover and projection re-key (`size:exception`)

Spec links: `cognitivize-in-place` (imports, watch roots, retired folders, staging, conversations), `source-sidecar`, `source-normalization-pipeline`, `conversations-lifecycle`, `generic-source-integrity-audit`, `lineage-single-edge`, `lineage-record-sync`, `lineage-version-status`, `nn-trannsform-lineage-checks`, `dynamic-sources-impact-check`, `source-versioning-archive` (removed), `scanner-destination-collision-guard` (removed), `workspace-template-upgrade`.

`size:exception` justification: sidecar location, projection keying, and the deletion of `sources/nn|export|archive` code are one atomic behaviour change; any partial landing leaves two parallel paths or a red `lineage --check`. Reviewed as four commits of coherent concern; the large diff is mostly deletions.

- [ ] 3b.1 RED: `tests/lineage/project.test.ts` re-keyed: Source = sidecar subject (`version` = rank, `superseded_by` = next member, `derived_from` from subject `sources` or sidecar `sources` for binaries), Knowledge = `isModelCandidate`, Artifact = suffixed family member or declares upstream; loose hand-written md excluded; removed fields `archive_path`, `status`, `curated_csv`, `media_filename`; `SIDECAR_SUBJECT_MISMATCH`; one `extractDeclaredCitations`. GREEN: `lineage/{project,fs-snapshot,render}.ts`; remove `sources/` prefix branches in `sourceRef.ts`.
- [ ] 3b.2 RED: scanner twice on unchanged input writes no new file; sidecar co-located; no `staging_file`; no `sources/nn` mirror; curated CSV derived artifact; no archive writes; collision guard gone. GREEN: `scanner-core.js`, `scanner.js`, `curate-csv.js`, `duplicate-guards.js`, create `lib/normalizer.js`, delete archive flow.
- [ ] 3b.3 RED: conversations promotion `<slug>_<ts>.md` cognitivized in place; existing `YYYY-MM-DD_*` stay unsuffixed. GREEN: `conversations.js`.
- [ ] 3b.4 RED: web/external import copies verbatim into `sources/import/`, every import suffixed, identical bytes dedupe, watch roots only observe, `process-images.js` uses cognitivize. GREEN: `webImport.js`, `external-scanner.js`, `process-images.js`.
- [ ] 3b.5 RED: `--cognitivize <file|dir>` recurses, skips sidecars/staging; `--scan` calls the same function. GREEN: `index.js`, `normalizer.js` adapter over converters.
- [ ] 3b.6 RED: `lineage-check` family validation (record exists, `validateCitations`, orphan sidecars), archive chain checks removed; `impact-checker` reads families + hash guard. GREEN: `lineage-check.js`, `impact-checker.js`, `provenance-knowledge.js`, `transformer.js`, preflight `:334,352-363,463,496-501`.
- [ ] 3b.7 Edit `iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md` in place (Resolved Q1: version/archive_path fields); `template_version` bump; `npm run sync:versions`, registry, `catalog.json`.
- [ ] 3b.8 Extend `legacy/layout/plan.ts` for `sources/nn` mirror deletion and sidecar relocation; migrate fixtures with the tool.
- [ ] 3b.9 Generated: core mirror, preflight mirrors, console payload + bundle. Verify the success-criterion `rg -n "sources/(nn|original|export|archive)/"` shows only marked lines.
- [ ] 3b.10 Gate: all test commands (skills with empty-home), `verify.js`, `check:integrity`, ledger guard, typecheck(s), lint.

Commits: (a) core re-key; (b) scanner/curate/collision/archive deletion; (c) conversations + import + CLI; (d) checks, bluepriNNt, fixtures, generated.

## S4: Write-once producers

Spec links: `write-once-artifacts` ("Producers adopt write-once"), `console-export-cli`, `dynamic-sources-impact-check`.

- [ ] 4.1 RED: `export-console.mjs` run twice writes nothing new; changed input writes a new suffixed file and leaves prior sha256 identical; output has `meta.sources` (W4: routed through core `buildConsolePayload`). GREEN: `scripts/export-console.mjs` via `console-payload.generated.cjs` + `writeOnce`.
- [ ] 4.2 RED/GREEN: same twice-run test for `impact-checker.js` report, `transformer.js`, `curate-csv.js` (`artifacts/curated/`), `workspace-index.js`, `scanner.js`.
- [ ] 4.3 RED: ConsoleHub resolves latest via `latestOfFamily` (no hand-written paths). GREEN: `ConsoleHubView.vue`.
- [ ] 4.4 RED: `--gc` dry run lists only non-latest uncited; `--gc --apply --yes --paths` deletes only confirmed intersect plan; CI never applies. GREEN: nn-trannsform `index.js`, wired to core `planGc`/`applyGc`.
- [ ] 4.5 Edit in place for behavior: `workspace/procedures/compile_*_NN.md` (names kept, Resolved Q1) and `video/procedures/*`; `template_version` bumps; `sync:versions`, registry, `catalog.json`.
- [ ] 4.6 Gate: nn-trannsform, editor, core, `verify.js`, `check:integrity`, typecheck, lint; regenerate console bundle and payload mirror.

## S5: Lineage drift gate

Spec links: `lineage-drift-gate`, `lineage-record-sync`, `lineage-version-status`.

- [ ] 5.1 RED: `tests/lineage/drift.test.ts`: edit of a managed section gives `{ok:false}` with section + `firstDiff`; journal and hand-authored edits pass; no EOL normalization; absent record tolerated; read-only. GREEN: `lineage/{record,drift}.ts` (move `splitTopLevelSections`, `managedSections`, `refreshExistingModel`; `findLineageRecord`).
- [ ] 5.2 RED: `--lineage --check` exits non-zero on drift. GREEN: `provenance-knowledge.js` delegates to core; `index.js`.
- [ ] 5.3 RED: `scripts/lib/lineage-drift-guard.js` over a committed core-tests fixture domaiNN only, proven red on a seeded edit. GREEN: guard + `verify.js` step `lineage-drift`.
- [ ] 5.4 RED (MCP): `check_workspace` emits `LINEAGE_DRIFT`. GREEN: `check-workspace.ts`.
- [ ] 5.5 Generated: core mirror, preflight mirrors. Gate: core, MCP, skills (empty-home), `verify.js`, typecheck, lint.

## S6: `_NN` invariant, renames, `_V_` dropped (`size:exception`)

Spec links: `nn-naming-contract` (invariant, exceptions, carve-out, procedure names, kNNowledge names), `template-procedures-manifest-and-discovery`, `workspace-template-upgrade`.

`size:exception` justification: mechanical file renames and `procedure_model::` rewrites in git count as large deleted+added diffs; reviewed as rename-only commits separate from logic.

- [ ] 6.1 RED: `checkNameInvariant` table (stem equals bp or ends `_bp`, case-insensitive, structural exemptions). GREEN: `naming/contract.ts`; validator rule `NN_NAME_INVARIANT` as warning (`validator/content.ts`).
- [ ] 6.2 RED: `scripts/lib/nn-name-invariant-guard.js` is an error in the repo, proven red on a seeded violation; carve-out reads `manifest/source.yaml` `frozen_blueprints` (:128-140) plus fixed globs naming `iNNfo/specs/bluepriNNts/workspace/procedures/**` explicitly. GREEN: guard + verify step.
- [ ] 6.3 RED: version read from frontmatter, not filename (`helpers.ts`, editor `utils/version.ts`, `useBlueprintVersionNotice.ts`). GREEN: those files.
- [ ] 6.4 Extend `legacy/layout/plan.ts` (renames, citation path map, `procedure_model::` rewrite); RED test on a legacy fixture, then GREEN.
- [ ] 6.5 Rename the 15 non-frozen procedure files and rewrite `procedure_model::`; the 9 frozen `workspace/procedures/` keep names. Rename kNNowledge in `_samples_nn/`, `workspace_NN/`, `simulation/fixtures/` (drop `_V_`) using the migration tool. Bump `template_version`; `npm run sync:versions`, registry, `catalog.json`.
- [ ] 6.6 Generated + gate: all mirrors, all test commands (empty-home), `verify.js`, `check:integrity`, ledger guard, typecheck(s), lint.

Commits: (a) contract rule + guard + version-from-frontmatter; (b) planner extension; (c) rename-only commit; (d) generated.

## S7: Docs, living specs, vocabulary, release handoff (`size:exception`)

Spec links: `canonical-vocabulary`, all modified capabilities (living-spec sync).

`size:exception` justification: docs/spec bulk edits (about 45 pages, 12 living specs) with no code; reviewable by search-and-replace diff.

- [ ] 7.1 Update `iNNfo/specs/vocabulary.json` prose and regenerate `docs/innfo/documentation/vocabulary.md`. Test: `node scripts/verify.js`.
- [ ] 7.2 Rewrite the ~45 docs pages (layout, `artifacts/`, sidecars, write-once, drift gate); skip frozen use-cases/samples. Test: `verify.js` docs/link checks.
- [ ] 7.3 Sync delta specs into `openspec/specs/` (about 12 living specs); no bare `cogNNitive/iNNfo` slug (split code spans). Test: `npm run check:spec-urls`.
- [ ] 7.4 Regenerate samples, `innfo-mcp.bundle.js` source inputs, console bundle; release notes list procedure and layout renames (Resolved Q3).
- [ ] 7.5 Final success-criteria sweep:
  - `rg -n "sources/(nn|original|export|archive)/" iNNfo/packages iNNfo/apps skills scripts -g '!*.generated.*' -g '!**/fixtures/**'` returns only marked lines
  - `_NN.md` regex only in `src/naming/`
  - one timestamp helper
  - zero sidecars in `list_knowledge`, `## NN Models`, console targets, editor detection
  - record managed-section edit fails all three gate sites; journal edit passes
  - ledger markers map 1:1
- [ ] 7.6 Final gate: `node scripts/verify.js`, `npm run check:integrity`, `node scripts/lib/legacy-ledger-guard.js`, `npm run typecheck`, `npm run typecheck:scripts`, `npm run lint`, all four workspace test commands plus preflight and upgrade (empty `USERPROFILE`/`HOME` under `temp/`).

Release coupling (out of scope): S0 (`sidecar`), S3b (cogNNitive), S4 (procedures), S6 (renames) change `templates-v*` bytes, and the MCP tool needs an innfo-mcp release. Merging S0-S7 to `main` without a new `templates-v*` tag + repin turns `verify --release` red. Keep the whole chain on `dev`; batch to `main` only with the release (tags, manifest repin, CDN bundle, skills-v*, innfo-mcp version are a separate change).

---

## Review Workload Forecast

| Slice | Est. changed lines (excl. generated) | Generated churn | Handling |
|---|---|---|---|
| S-pre | ~0 | 0 | sync only |
| S0 | ~1,100 | ~1,500 | 4 commits under 400 |
| S1 | ~1,000 | ~800 | 3 commits |
| S2 | ~800 | ~600 | 4 commits |
| S3a | ~250 | ~300 | single unit |
| S3b | ~1,800 (mostly deletions) | ~2,500 | `size:exception`, 4 commits |
| S4 | ~800 | ~1,500 (bundle) | 3 commits |
| S5 | ~450 | ~400 | 2 commits |
| S6 | ~1,000 | ~300 | `size:exception` (renames) |
| S7 | ~1,200 (docs) | ~800 | `size:exception` (docs) |
| Total | ~8,400 | ~8,700 | |

| Field | Value |
|-------|-------|
| Estimated changed lines | 8,000-12,000 (3-4k generated per proposal) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main (adapted: slices land in order on `dev`; `main` receives the batch with the release) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Notes |
|------|------|-------|
| S-pre | Sync with dev; re-verify refs | prerequisite |
| S0 | Contract, sidecar bluepriNNt, one predicate | base `dev`; additive exclusion lands first |
| S1 | writeOnce, cognitivize, pointer | after S0; additive |
| S2 | `artifacts/`, detector, nn-upgrade step | after S0 |
| S3a | Resolver + MCP tool | after S1, S2; additive |
| S3b | Ingest cutover + re-key | `size:exception` |
| S4 | Write-once producers, GC | after S3b |
| S5 | Drift gate (3 sites) | after S3b, S4 |
| S6 | Invariant + renames | `size:exception` |
| S7 | Docs, living specs, release handoff | `size:exception` |

Pre-flagged `size:exception`: S3b, S6, S7. S0, S1, S2, S4 exceed 400 per slice but split into work-unit commits each at or under 400 reviewable lines.
