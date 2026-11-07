# Tasks: Domain Synchronizations

Strict TDD is ACTIVE. Every behavior has a RED task (write the failing test, run it, see it fail for the stated reason) before its GREEN task (minimal code to pass). Never write GREEN first. `design.md` is authoritative; the delta specs were reconciled to it (see "Spec reconciliation" at the end). No backwards-compat code, YAGNI. Published `_V_x-y-z_` spec files are write-once; bump only `blueprint_version`.

Markers: `[P]` independent (parallel-safe if the lane owns disjoint files), `[S]` sequential (depends on the task listed in `after`).

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~3,800 hand-written (nn-core src ~900, tests ~1,500, skills ~500, console ~400, blueprints/docs/living specs ~500) plus ~1,800 deleted lines (`imports/*`, `external-scanner.js`, watch digest) plus regenerated non-reviewable output (bundles, `*.generated.cjs`, catalogs, testlab console) |
| 400-line budget risk | High |
| Chained PRs recommended | No. The no-backwards-compat rule forbids old blocks and Synchronization coexisting, and `validate-manifest` keeps main red until the `blueprints-v*` tag is cut, so the slices cannot land separately. |
| Suggested split | One PR, ordered by the lanes below (each lane is a work-unit commit with its own verification and rollback boundary) |
| Delivery strategy | `exception-ok`. Record `size:exception` on the PR. |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Lane A blueprints + vocabulary (Phase 1) | PR 1 (single, size:exception) | commit 1 |
| 2 | Lane B nn-core sync module, leak fixes, deletions (Phases 2-3) | same PR | commits 2-4 |
| 3 | Lane C nn-mcp wiring (Phase 4) | same PR | after lane B build |
| 4 | Lane D skills + preflight (Phase 5) | same PR | after B tasks 2.12 and 2.16 |
| 5 | Lane E console (Phase 6) | same PR | after B types |
| 6 | Lane F docs/wording (Phase 7) and G integration (Phases 8-9) | same PR | last |

## Key Paths

- `CORE`: `iNNfo/packages/nn-core/` (`src/`, `tests/`) ; `MCP`: `iNNfo/packages/nn-mcp/`
- `BP`: `iNNfo/specs/bluepriNNts/` ; `SK`: `skills/nn-sources/scripts/` ; `EXPORT`: `scripts/export-console.mjs`
- `RUNTIME`: `iNNfo/specs/bluepriNNts/console/nn-runtime.js` ; `LIVE`: `openspec/specs/`

## Lanes and ownership (parallel writers must not overlap)

| Lane | Phases | Exclusive files | after |
|---|---|---|---|
| A. Blueprints | 1 | `BP/{sources,sidecar}/spec_NN.md`, `iNNfo/specs/vocabulary.json`, docs vocabulary, catalogs, `manifest/source.yaml` | none |
| B. nn-core | 2, 3 | all `CORE/` except `src/console/{files-inventory,unit-address}.ts` and console tests | none (task 2.1 starts immediately; 2.9 needs 1.2) |
| C. nn-mcp | 4 | `MCP/` | B 2.8, 2.12 built |
| D. Skills | 5 | `skills/nn-sources/**`, `skills/nn-preflight/**` | B 2.12, 2.16 |
| E. Console | 6 | `CORE/src/console/{files-inventory,unit-address}.ts`, console tests, `EXPORT`, `RUNTIME`, `test/console-files-runtime.test.mjs` | B types (2.12) |
| F. Docs | 7 | `docs/**`, `skills/{nn,nn-innfo,nn-sources}/SKILL.md`, `scripts/skill-shared-rules.md`, `TESTING.md`, `README.md` | D |
| G. Integration | 8, 9 | `LIVE`, generated mirrors/bundles/fixtures, release checklist | A-F |

A, B, and E (tests) run in parallel; C and D start after B; F after D; G last.

## Phase 0: Baseline

- [x] 0.1 [S] In the session worktree run `node scripts/build-core-mirrors.mjs` and build nn-core; record baseline test status for nn-core, nn-mcp, nn-sources (preflight tests with empty `USERPROFILE`+`HOME`). Never `npm ci` from a worktree.

## Phase 1: Blueprints and vocabulary (Lane A)

- [x] 1.1 [P] RED `CORE/tests/sync-blueprint.test.ts`: parse `BP/sources/spec_NN.md` and `BP/sidecar/spec_NN.md`; assert concept `Synchronization` with `alias`, `origin_uri`, `kind` (`file|folder`), `state` (`active|paused`), `origin_uri` on `[Source, Synchronization]`; sidecar declares `synchronization`, `origin_path`, `origin_uri`, `retrieved_at` and NOT `source_url`/`downloaded_at`. Fails: concept and keys absent. (specs: synchronization-concept, sidecar-blueprint)
- [x] 1.2 [S after 1.1] GREEN `BP/sources/spec_NN.md`: add `Synchronization`, new fields, `blueprint_version` V_0-3-3 to V_0-4-0 (not `template_version`).
- [x] 1.3 [S after 1.1] GREEN `BP/sidecar/spec_NN.md`: four optional origin keys, drop legacy keys, V_0-1-3 to V_0-2-0.
- [x] 1.4 [P] `iNNfo/specs/vocabulary.json`: add `synchronization` and `mirror`; regenerate `docs/documentation/content/vocabulary.md` with the repo generator (locate with `rg vocabulary scripts/`).
- [x] 1.5 [S after 1.2, 1.3] `node scripts/sync-versions.mjs`; confirm both `catalog.json` files and the canonical registry updated; `SHIPPED_TEMPLATE_VERSIONS` test green.

## Phase 2: nn-core sync module (Lane B)

- [x] 2.1 [P] RED `CORE/src/sync/address.spec.ts`: `parseMirrorAddress` accepts `sources/sync/org/organization_NN.md@gerente[&field]`; rejects `..`, missing `@`, matrix unit, non-`sources/sync/`. Fails: module missing.
- [x] 2.2 [S after 2.1] GREEN `CORE/src/sync/address.ts` (`SYNC_DIR`, `MirrorAddress`, `MirrorLookup`); export `parseUnit` from `CORE/src/address/parse.ts`. Relative imports carry `.js`.
- [x] 2.3 [P] RED `CORE/tests/sync-mirror-references.test.ts`: `reference` to mirror resolves; slug missing gives `REF_ELEMENT_NOT_FOUND`; missing alias/file gives `REF_MODEL_NOT_FOUND`; concept mismatch warns `REF_CONCEPT_MISMATCH`; per-file pass emits no `ADDRESS_MALFORMED`. Fails: `ADDRESS_MALFORMED` today.
- [x] 2.4 [S after 2.2, 2.3] GREEN `CORE/src/validator/references.ts` (`:316` mirror address passes to workspace pass) and `CORE/src/validator/workspaceReferences.ts` (`mirrors?: MirrorLookup` param, mirror branch in `checkToken`, `target_blueprint` from the mirror model).
- [x] 2.5 [P] RED `CORE/tests/sync-declarations.test.ts`: `readSynchronizations` returns entries; `SYNC_ALIAS_INVALID` (`../x`), `SYNC_ALIAS_DUPLICATE`. Fails: module missing.
- [x] 2.6 [S after 2.5] GREEN `CORE/src/sync/declarations.ts`; surface diagnostics in `collectWorkspaceDiagnostics`. (nn-core part done; the `collectWorkspaceDiagnostics` wiring lives in nn-mcp and is done in 4.2)
- [x] 2.7 [P] RED `CORE/tests/changelog/sources-exclusion.test.ts`: copied `sources/import/org/x_changes_NN.md` ignored; `sources/sync` pruned from `readLineageSnapshot`; sidecars under `sources/import` kept; `changes/` still loads. Fails: copied changeset loads.
- [x] 2.8 [S after 2.7] GREEN `CORE/src/naming/contract.ts` (export `isUnderRootSources`), `CORE/src/changelog/load.ts` (false under root `sources/`), `CORE/src/lineage/fs-snapshot.ts` (prune `sources/sync/`).
- [x] 2.9 [P, needs 1.3] RED `CORE/tests/cognitivize-origin.test.ts`: `importRaw(root, abs, {dir, origin})` writes under `dir`, preserves relative dirs, sidecar has the four origin keys; manual import has none; normalizer `source_url` never reaches the sidecar; `_NN.md` still rejected. Fails: no `dir`/`origin` option.
- [x] 2.10 [S after 2.9] GREEN `CORE/src/cognitivize/{cognitivize,sidecar}.ts`: `dir` (default `sources/import`) and `origin` merged as metadata; remove legacy-key handling.
- [x] 2.11 [P] RED `CORE/tests/sync-refresh.test.ts` (one case per task line below, all fail: module missing):
  - a) domain origin filter (`isModelCandidate`, only models mirrored, raw files skipped) and plain-folder split (models to `sources/sync`, others to `sources/import/<alias>/<dir>/`)
  - b) path preservation (`a/b_NN.md` and `c/b_NN.md` distinct), in-place replace without suffixed copies, vanished file deleted
  - c) unchanged returns `unchanged` with no files; `paused` returns `skipped`; unreachable keeps mirror and returns `unreachable`
  - d) self-loop refused both directions, symlinks not followed; origin never modified
  - e) two `README.pdf` stay distinct and sidecars carry `origin_path`; identical bytes dedup; changed bytes add a member
  - f) `RefreshResult.files` before/after sha256 and `digestBefore/After`; `removeOrphanMirrors` removes an alias without a Synchronization and keeps `sources/import`
- [x] 2.12 [S after 2.4, 2.6, 2.10, 2.11] GREEN `CORE/src/sync/{refresh,index}.ts` (`refreshSynchronization`, `removeOrphanMirrors`; plan then write; `path.posix` keys; `checkPathBudget`); export `sync` from `CORE/src/index.ts`. Build nn-core.
- [x] 2.13 [P] RED scaffold test (extend the existing `planDomainScaffold` test in `CORE/tests/`): plan contains `sources/sources_NN.md` (no Synchronization element) and `sources/sync/`; scaffolded domain passes `check_domain`. Fails: absent.
- [x] 2.14 [S after 2.13, 1.2] GREEN `CORE/src/scaffold/domain.ts`.

## Phase 3: nn-core deletions (Lane B)

- [x] 3.1 [P] RED extend the `fs-source-resolver` test (locate with `fd fs-source-resolver CORE/tests`): citation `org>kNNowledge/org_NN.md@x` is treated as an ordinary workspace path and not found; no alias lookup. Fails: alias resolved today.
- [x] 3.2 [S after 3.1] GREEN `CORE/src/console/fs-source-resolver.ts`: delete alias path (`:12-44,78-86`).
- [x] 3.3 [S after 3.2] Delete `CORE/src/imports/*` (5 files) and `CORE/tests/imports/cross-domain-imports.test.ts`; remove `imports` export from `CORE/src/index.ts:212`. Verify: `rg "imports/|imported_domain|projectSnapshot" iNNfo` has no live hits.
- [x] 3.4 [S after 3.3] Remove the `RESERVED_STRUCTURAL_HEADINGS` External Watch Roots tolerance (locate with `rg RESERVED_STRUCTURAL_HEADINGS`); core typecheck and full nn-core tests green.

## Phase 4: nn-mcp wiring (Lane C)

- [x] 4.1 [S after 2.12] RED modify `MCP/test/concept-drift-and-gate.test.ts`: remove the watch-roots fixture (`:192,204`) and assert the block now gets the generic concept-drift diagnostic. Fails until `validate.ts` entries are deleted.
- [x] 4.2 [S after 4.1] GREEN `MCP/src/tools/validate.ts`: delete watch-roots entries (`:478-479,495`); pass `MirrorLookup` built lazily with `buildNodeDomainIndex(<root>/sources/sync/<alias>)`; surface `readSynchronizations` diagnostics.
- [x] 4.3 [S after 4.2] RED then GREEN: assert in the MCP tool-list test that no synchronization tool exists (guard test; passes immediately, keep as regression).

## Phase 5: Skills and preflight (Lane D)

- [x] 5.1 [S after 2.12] RED `skills/nn-sources/test/unit/test-sync.js`: `--sync` all active; `--sync org` only org; `paused` skipped; unreachable exits 1 and keeps mirror; invalid alias refused; payload printed (one `comment` change, `target: sources/sync/<alias>`, `evidence: decision`, per-file `before->after` sha256 notes) and `changes/` untouched; no payload when unchanged; orphan removed with one payload; removed flags `--scan-external`, `--watch-digest`, `--digest-decide` are unknown options. Fails: flag absent.
- [x] 5.2 [S after 5.1] GREEN `SK/index.js`: add `--sync [alias]`; delete the three flags (`:224-328`).
- [x] 5.3 [S after 5.2] RED then GREEN webImport: test in `test-sync.js` (stubbed global `fetch`, assert stub can go red) that an `https://` origin (`kind: file` only) downloads via `webImport.downloadToImport(url, dir, {subdir: alias})` with sidecar `origin_uri`/`retrieved_at`; GREEN `SK/lib/webImport.js`; `source_url`/`downloaded_at` become `origin_uri`/`retrieved_at`.
- [x] 5.4 [S after 5.2] Delete `SK/lib/external-scanner.js` and `skills/nn-sources/test/unit/test-external-scanner.js`; trim `SK/lib/watch-digest-store.js` to convergence functions (`getConvergence`, `recordConvergence`, `ignoredShas`, state I/O) with their tests; drop the watch-roots heading in `SK/lib/{bootstrap.js:125,normalizer.js:30}`; drop fixtures and legacy keys in `test-sidecar-discovery.js`, `test-s4a-record-removed.js`, `test-scanner.js`.
- [x] 5.5 [P] RED update `skills/nn-preflight/scripts/domain-probe` test: output has no `watch_roots` key; run with empty `USERPROFILE`+`HOME` and `--mcp-dir`. Fails: key present.
- [x] 5.6 [S after 5.5] GREEN `skills/nn-preflight/scripts/domain-probe.js`: delete `watch_roots` (`:19,49-63,196,229`).

## Phase 6: Console (Lane E)

- [x] 6.1 [P] RED `CORE/tests/console-files-payload.test.ts`: unknown file is `unclassified` (never `source`); no `watch_root`/`imported_domain` in categories or `stats`; `origins` from Synchronization elements (`id/alias/origin/kind/state/files`) and sidecar origin keys (`adhoc`); empty `origins` when none; no `watchRoots`; folder name never makes an origin; `unclassified` counts as neither uncited nor missing sidecar; files under `sources/sync/` are `source` and exempt from the missing-sidecar gap (mirrors have no sidecar by design). Fails: legacy categories.
- [x] 6.2 [S after 6.1] GREEN `CORE/src/console/files-inventory.ts` (`:124-125`, `origins`, sidecar origin keys, KPI changes).
- [x] 6.3 [P] RED unit-address test (locate `fd unit-address CORE/tests`): mirror address `sources/sync/org/x_NN.md@slug` yields a `kind:'source'` chip. Fails: `null`.
- [x] 6.4 [S after 6.3] GREEN `CORE/src/console/unit-address.ts`.
- [x] 6.5 [P] RED `test/console-files-runtime.test.mjs`: `FILES_CATEGORIES` has `unclassified` shown only when non-empty; Origins stage built from `origins[].files` and hidden when empty; Files tab shown for origins-only; no Watch Folders/Imported Domains. Fails: legacy categories.
- [x] 6.6 [S after 6.5, 6.2] GREEN `RUNTIME` (`FILES_CATEGORIES`, Origins from `origins`, `nn-runtime.js:4133,4674,4798-4870`).
- [x] 6.7 [S after 6.2] GREEN `EXPORT`: delete `describeRoot`/`watchRoots` (`:808-814,1040-1075,1566`); build `origins` from the sources catalog (`readSynchronizations`) + sidecars. Test: export of a fixture with folder `external` and no Synchronization has empty `origins`.

## Phase 7: Docs and wording (Lane F)

- [x] 7.1 [S after Phase 5] `skills/{nn,nn-innfo,nn-sources}/SKILL.md`, `scripts/skill-shared-rules.md`: replace watch-root/scan/digest wording with the Synchronization instruction (`--sync [alias]`, when to run, apply printed payload via `propose_changeset`); rename `nn-innfo` section 14 to "Workspace Manifest Reconciliation"; remove watch menu/Help entries from `nn`.
- [x] 7.2 [P] Docs: `docs/documentation/content/cli.md:23`, `mental-model.md:152`, `TESTING.md:144`, `README.md:13`; add a Synchronization guide noting `--freeze-slugs` at the origin and the path-form `reference` convention.
- [x] 7.3 [S after 7.1, 7.2] Gate: `rg -i "External Watch Roots|Imported Domain|source_url|downloaded_at|watch_roots|watchRoots" --glob '!openspec/changes/archive/**'` returns no live hits (excluding this change folder).

## Phase 8: End-to-end and regeneration (Lane G)

- [x] 8.1 [S after 4.2, 2.12] RED `MCP/test/domain-synchronization.e2e.test.ts`: Organization-like domaiNN synced into a Procedures-like one; `responsable :: reference` with `sources/sync/org/organization_NN.md@gerente` validates (nn-core built first); rename `gerente` at origin, refresh, `check_domain` gives `REF_ELEMENT_NOT_FOUND` on `responsable`; printed payload records before/after sha; restored slug clears the error; consumer models untouched; copied changeset not in the change log. Fails until all wiring exists, then GREEN with no further code.
- [x] 8.2 [S after 8.1] `node scripts/build-core-mirrors.mjs`, `node scripts/build-console-bundle.mjs`, `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`; commit regenerated output separately.
- [x] 8.3 [S after 8.2] `node scripts/verify.js` green (suites auto-discovered, template inventory guard, versions).

## Phase 9: Living specs and release

- [x] 9.1 [S after 8.3] Sync deltas into `LIVE` by hand: create living specs for the 6 new capabilities; merge MODIFIED/REMOVED into `external-watch-roots`, `router-governance`, `sidecar-blueprint`, `source-sidecar`, `cognitivize-in-place`, `scanner-destination-collision-guard`, `changes-collection`, `console-files-view`, `console-payload-builder`, `innfo-console-runtime`, `domain-initialization`. Verify each by `diff` and `wc -l` against the delta; do not trust a summarizer. Run `check:spec-urls` (no bare `cogNNitive/iNNfo` slug).
- [x] 9.2 [S after 9.1] Archive the change under `openspec/changes/archive/` (verify copies with diff and `wc -l`).
- [ ] 9.3 NON-AGENT release checklist (maintainer confirmation required; agents never cut tags): cut `blueprints-v*` first and repin in the same release run (main stays red on `validate-manifest` until then); then `nn-mcp-v*`, `nn-console-v*`, `skills-v*`; versions derived by `scripts/sync-versions.mjs`.

## Spec reconciliation (edits made to the delta specs)

1. `address-to-mirrored-model`: rewritten to `type:: reference` path form `sources/sync/<alias>/<path>_NN.md@<slug>`; short form requirement and ASSUMPTION removed; codes `REF_ELEMENT_NOT_FOUND`, `REF_MODEL_NOT_FOUND`, `REF_CONCEPT_MISMATCH`; per-file silence scenario added.
2. `synchronization-concept`: `origin`/`status` to `origin_uri`/`state`; catalog `sources/sources_NN.md`; blueprint bump V_0-4-0; alias diagnostics `SYNC_ALIAS_INVALID/DUPLICATE`; paused/unreachable/delete wording (exit 1, no payload, orphan removal on `--sync` without alias, printed payload); ASSUMPTIONs removed; scaffold adds `sources/sync/`.
3. `synchronization-refresh-change`: rewritten: `--sync [alias]` CLI, printed `comment` payload (not written), `isChangesetPath` false under root `sources/`, lineage prunes only `sources/sync/`, `reference` errors; extra scenarios (CLI does not write, other sources stay in lineage).
4. `synchronization-landing`: model = `isModelCandidate` set, other `_NN.md` skipped; self-loop and plan-then-write; layout and URL origin ASSUMPTIONs resolved; domain origin only for `kind: folder`.
5. `synchronization-sidecar-origin`: `origin_uri` ASSUMPTION replaced by design meaning.
6. `source-sidecar`: dropped the missing-`origin_path` validator scenario (not in design).
7. `synchronization-legacy-removal`: leftover block gets the generic concept-drift diagnostic, not a dedicated message.
8. `cognitivize-in-place`: refresh prints a payload (does not write a change).
9. `changes-collection`: "excludes root `sources/`" instead of "only `changes/`".
10. `domain-initialization`: `sources/sources_NN.md` and `sources/sync/`.
11. `console-payload-builder`: `OriginDescriptor` shape (`state`, `files`, `adhoc`), `lastRefresh` dropped; `sources/sync` ASSUMPTION resolved.
12. `console-files-view`: Origins card state `active|paused|adhoc`.
13. Not edited: `proposal.md` still says `responsable :: address` and `nn-sources sync`; design supersedes it.
