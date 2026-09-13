# Tasks: innfo-mcp Lifecycle Integrity Fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (total, 7 commits) | ~650-950 |
| Largest single commit | Commit 4 (H2+H3), ~300-420 lines |
| 400-line budget risk | Medium (only Commit 4 approaches the budget; all others are well under) |
| Chained PRs recommended | No |
| Suggested split | No PR pipeline — local atomic commits to `dev`, review via `git log -p` per commit |
| Delivery strategy | Not applicable — no push/PR in this change's scope |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

Note: this change commits directly to `dev` with no push/PR, so the 400-line
guard is reframed as **per-commit reviewability**, not a PR diff limit. Six of
the seven commits are small and single-concern (est. 20-180 lines each).
Commit 4 (H2+H3) is the outlier at ~300-420 lines across 5 source files + 4
test files — it is the only one worth a deliberate read-through before
proceeding to Commit 5. I do **not** recommend splitting it further: design.md
explicitly requires the write-side (`addElement` sources propagation) and the
serializer fix to land together, since neither is independently verifiable
without the other closing the round-trip.

### Suggested Work Units (informational — no PR chain)

| Unit | Commit | Goal |
|------|--------|------|
| 1 | H4 | `conv-wikilinks` bypass for qualified refs |
| 2 | H5 | Level-2-only gate for template-authoring mutations |
| 3 | H6 | Unify model discovery predicate |
| 4 | H2+H3 | Citation write/read round-trip (largest, review carefully) |
| 5 | H1 | Self-valid `init_model` scaffold |
| 6 | H7 | Stale-cache remediation hint |
| 7 | H8 | Aggregate template-documentation warnings |

Full gate before every commit (both packages): `npx vitest run` +
`npx tsc --noEmit`, expecting `innfo-core` 706+N passed / 1 skipped / 1 known
failure (`tests/metrics-console-harness.test.ts`, unrelated) and `innfo-mcp`
263+N passed.

## Phase 1: H4 — conv-wikilinks qualified-reference bypass

Commit: `fix(innfo-core): bypass qualified cross-model refs in conv-wikilinks`

- [x] 1.1 RED — `iNNfo/packages/innfo-core/tests/workspaceReferences.test.ts`: add scenarios — valid `[[Model :: Element]]` yields no `conv-wikilinks` warning; invalid qualified ref yields the `workspaceReferences` diagnostic (never generic "N undefined reference(s)"); plain broken `[[Ghost]]` still warns; a value containing `::` but not matching `[[<text> :: <text>]]` is not bypassed. Done: `npx vitest run tests/workspaceReferences.test.ts` fails on the new assertions.
- [x] 1.2 GREEN — `iNNfo/packages/innfo-core/src/validator/content.ts` (`conv-wikilinks`, lines ~403-430): add the qualified-form bypass, mirroring `references.ts:210-225` exactly (precise `[[<text> :: <text>]]` match, not `includes('::')`).
- [x] 1.3 Verify — Done: `npx vitest run tests/workspaceReferences.test.ts` passes; `npx tsc --noEmit` clean in `innfo-core`.
- Spec: `cross-model-reference-validation` / Requirement: Convention Checker Bypasses Qualified Cross-Model References (4 scenarios above).

## Phase 2: H5 — level gate for template-authoring mutations

Commit: `fix(innfo-core): gate template-authoring mutations to level-2 models`

- [x] 2.1 RED — `iNNfo/packages/innfo-core/src/mutate.spec.ts`: `add_concept`/`add_field`/`set_marker` on a `level: 3` fixture return `success: false` with a level-explicit message and leave the file byte-identical; same ops on the existing `level: 2` TEMPLATE fixture still pass. Done: `npx vitest run src/mutate.spec.ts` fails on the new level:3 assertions.
- [x] 2.2 GREEN — `iNNfo/packages/innfo-core/src/mutate.ts` (`runMutation`, ~line 121): add `LEVEL2_ONLY_OPS = new Set(['add_concept','add_field','set_marker'])`; gate before handler dispatch, return `MutationResult` error naming the level mismatch.
- [x] 2.3 GREEN (surface only, no logic change expected) — `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts`: confirm the existing error pass-through (line ~383-385) surfaces the new message verbatim; adjust only if it currently swallows or rewraps the error text. Confirmed verbatim pass-through — no code change needed; updated the pre-existing `src/tools/mutate.spec.ts` test that asserted the OLD "not defined in template" downstream error to assert the new level-gate message instead (that test WAS exercising this exact H5 bug).
- [x] 2.4 Verify — Done: `npx vitest run src/mutate.spec.ts` passes; `npx tsc --noEmit` clean in `innfo-core`.
- Spec: `mutation-level-gating` / Requirement: Template-Authoring Ops Are Level-2 Only (all 5 scenarios).

## Phase 3: H6 — unified model discovery predicate

Commit: `fix(innfo-core): unify model discovery predicate in collectModels`

- [x] 3.1 RED — `iNNfo/packages/innfo-core/tests/helpers.test.ts`: temp tree with one `_NN.md` level-3 model, one `_F.md` fixture, one README, one level-2 `spec_NN.md`; assert only the model is returned and `root` is still honored. Done: `npx vitest run tests/helpers.test.ts` fails.
- [x] 3.2 GREEN — `iNNfo/packages/innfo-core/src/workspace/discoverModels.ts`: extract and export `isDiscoverableModel(file: CandidateFile): boolean` (level===3, `parent_spec` present, `_NN.md` filename via `NN_FILENAME_RE`, `!isIgnoredPath`); redefine `isReconcilableModel` as `isDiscoverableModel(file) && notTheManifest && !isCogNNitiveTemplate(...)`.
- [x] 3.3 GREEN — `iNNfo/packages/innfo-core/src/helpers.ts` (`collectModels`, lines ~46-64): import `isDiscoverableModel`; new per-file order: extension → `index.md` skip → `_NN.md` name check (cheap) → read + `parseFrontmatter` → `isDiscoverableModel`; keep existing walk-level directory pruning (`node_modules`, `.git`, dot-dirs, `IGNORED_DIRS`) unchanged.
- [x] 3.4 Verify — Done: `npx vitest run tests/helpers.test.ts tests/reconcile-manifest.test.ts` both pass (the latter proves the extraction is behavior-preserving for manifest reconciliation); `npx tsc --noEmit` clean. Also updated pre-existing fixtures in `tests/helpers.test.ts` (bare-content `_NN.md` files with no frontmatter), `innfo-mcp/src/tools/list-read.spec.ts`, and `innfo-mcp/src/server.spec.ts` (`list_models` suite) that relied on the old loose (extension-only) predicate; one fixture (`workspace_01.md`) was renamed to `workspace_NN.md` to match the actual iNNfo naming convention for workspace manifests. Rebuilt `innfo-core` dist before running `innfo-mcp` tests (dist consumption, not source aliasing).
- Spec: `model-discovery-predicate` / Requirement: Single Shared Discoverable-Model Predicate + Requirement: list_models Honors root and Returns Only Discoverable Models.

## Phase 4: H2+H3 — citation write/read round-trip

Commit: `fix(innfo-core): round-trip sources:: citations through write and read`

- [x] 4.1 RED — `iNNfo/packages/innfo-core/src/sourceRef.spec.ts`: assert `SOURCE_FIELD_NAMES` is exported from `sourceRef.ts` and matches the set used by `workspaceSources.ts`/`normalize.ts` (parity, single definition). Done: failed on missing export before the fix (`Cannot find name/export 'SOURCE_FIELD_NAMES'` at import), then confirmed GREEN after 4.5.
- [x] 4.2 RED — `iNNfo/packages/innfo-core/tests/source-citations.test.ts` (already existed for `attachSourceCitations`; extended, not replaced): parse→serialize→parse byte-identical for `sources` (array, scalar, empty, comma-containing→fallback) AND for `options`/`values`/`applies_to`/`target_concepts`/`needs`/a plain scalar field (zero drift); corpus round-trip (field-level, not whole-document text, since prose/description formatting is out of H2/H3 scope) over `iNNfo/specs/templates/**/samples/*_NN.md` (16 real sample files). Done: failed on the `sources` scalar-quoting and empty-list cases before the fix (bracket-list case coincidentally already matched); GREEN after 4.5-4.8.
- [x] 4.3 RED — `iNNfo/packages/innfo-core/src/mutate.spec.ts`: `add_element` with `sources` (array and scalar) persists a `sources::` field; omitting `sources` behaves exactly as before. Done: failed (H3a not fixed yet — `sources` was silently dropped), GREEN after 4.8.
- [x] 4.4 RED — `iNNfo/packages/innfo-core/tests/workspaceSources.test.ts`: added an integration describe block driving the real mutate→serialize→normalize→`validateWorkspaceSources` pipeline (the engine `collectWorkspaceDiagnostics` calls) — a valid citation resolves cleanly, a nonexistent-file citation yields `KU_DANGLING_FILE` naming the target, and a line-range-anchor citation yields `KU_MALFORMED`; never reached via per-file `validateModel`. Done: the two malformed-citation scenarios failed (0 diagnostics — nothing was written to diagnose) before the fix, GREEN after 4.8.
- [x] 4.5 GREEN — `iNNfo/packages/innfo-core/src/sourceRef.ts`: export `SOURCE_FIELD_NAMES = new Set(['sources', 'source'])` as the single definition.
- [x] 4.6 GREEN — `iNNfo/packages/innfo-core/src/validator/workspaceSources.ts` and `iNNfo/packages/innfo-core/src/recursiveParser/normalize.ts`: replaced each local `SOURCE_FIELD_NAMES` redeclaration with an import from `sourceRef.ts`.
- [x] 4.7 GREEN — `iNNfo/packages/innfo-core/src/parser/serializer.ts`: changed `serializePropertyValue(value, fieldName?)`; added a citation branch (`serializeCitationValue`/`isSafeCitationItem`) gated on `SOURCE_FIELD_NAMES.has(fieldName.toLowerCase())` emitting the bare/bracket grammar from design.md (comma/bracket-guard fallback to `JSON.stringify` when any item contains `,`/`[`/`]`/is non-string); updated the call site to pass the field key (`serializePropertyValue(v, k)`) and fixed the pre-existing wikilink-array recursive call (`value.map(serializePropertyValue)`) to an explicit single-arg wrapper so `Array.map`'s index is never mistaken for `fieldName`.
- [x] 4.8 GREEN — `iNNfo/packages/innfo-core/src/mutate.ts` (`addElement`): read `args.sources` and include it (as the reserved `sources` key) in the written fields alongside `args.fields`; omitting it leaves behavior unchanged.
- [x] 4.9 Verify (fast) — Done: `npx vitest run tests/source-citations.test.ts src/mutate.spec.ts src/sourceRef.spec.ts tests/workspaceSources.test.ts` — 83/83 passed.
- [x] 4.10 Verify (mandatory full gate) — Done: `innfo-core` 752 passed / 1 skipped / 0 failed (`tests/metrics-console-harness.test.ts` passed in this run, not the known environment-dependent failure — no regression either way), `innfo-mcp` 263/263 passed, `npx tsc --noEmit` clean in both packages. `innfo-core` dist rebuilt (`npm run build`) before running `innfo-mcp` tests, per the dist-consumption gotcha from Phase 3.
- Spec: `document-citations` / Requirement: Citation List Values Round-Trip Through Write and Read; Requirement: add_element Accepts and Persists sources; Requirement: Malformed Citations Produce an Explicit Diagnostic.

## Phase 5: H1 — self-valid init_model scaffold

Commit: `fix(innfo-mcp): emit a self-valid scaffold from init_model`

- [x] 5.1 RED — `iNNfo/packages/innfo-mcp/tests/` (init-model suite): invariant test — for `business` and `blank` templates, `initModel()` output validates clean against its own template (no "No NN element markers found") and the file exists after the first call; a forced validation failure returns `success: false` with no `filePath`/`content`. Done: failed against worktree prior to fix.
- [x] 5.2 GREEN — `iNNfo/packages/innfo-mcp/src/tools/init-model.ts` (`scaffoldBodyFromSchema`, ~line 51): omit the placeholder for `type:: reference` fields with no concrete target instead of emitting `[[Target Element]]`; emit at least one `## NN Concept: Element` marker per markered `type:: text` concept.
- [x] 5.3 GREEN — `iNNfo/packages/innfo-mcp/src/tools/init-model.ts` (`initModel`): on pre-write validation failure, response omits `filePath`/`content` and `success` is `false`.
- [x] 5.4 GREEN — update the `business`/`blank` scaffold snapshot fixtures deliberately to match the new output.
- [x] 5.5 Verify — Done: `npx vitest run src/tools/init-model.spec.ts` passes; full 27 test files (265 tests) pass; `npx tsc --noEmit` clean in `innfo-mcp`.
- Spec: `model-scaffold-robustness` / Requirement: Scaffold Validity by Construction; Requirement: Failed Init Never Returns a Success-Shaped Payload.

## Phase 6: H7 — stale-cache remediation hint

Commit: `fix(innfo-mcp): point stale-cache hint at check_workspace self-heal`

- [x] 6.1 RED — `iNNfo/packages/innfo-mcp/tests/` (validate suite): `TEMPLATE_CACHE_STALE` warning's `message`/`promptHint` both name `check_workspace` and no longer instruct manual `specs/` file surgery. Done: failed against worktree prior to fix.
- [x] 6.2 GREEN — `iNNfo/packages/innfo-mcp/src/tools/validate.ts` (lines ~529-531): rewrite `message`/`promptHint` to point at `check_workspace`'s existing self-heal rehydration.
- [x] 6.3 Verify — Done: `npx vitest run test/freshness-warning.test.ts` passes; `npx tsc --noEmit` clean in `innfo-mcp`.
- Spec: `template-cache-staleness-detection` / Requirement: validateModel surfaces TEMPLATE_CACHE_STALE warning (both scenarios).

## Phase 7: H8 — aggregate template-documentation warnings

Commit: `fix(innfo-core): aggregate template documentation warnings`

- [x] 7.1 RED — `iNNfo/packages/innfo-core/tests/` (model-checks suite): a template with N undocumented concepts yields exactly ONE aggregated diagnostic naming the count and listing affected concepts; a single-occurrence case still yields one diagnostic; `valid` is unaffected. Done: failed against worktree prior to fix.
- [x] 7.2 GREEN — `iNNfo/packages/innfo-core/src/validator/model-checks.ts` (`checkTemplateDocumentation`, ~line 114): collapse per-concept warnings into one aggregated diagnostic (count + list); validation semantics unchanged.
- [x] 7.3 Verify — Done: `npx vitest run src/validator/model-checks.spec.ts` passes; updated assertions in `tests/index.test.ts` and `innfo-mcp/test/defects-d1-d9-regression.test.ts`; `innfo-core` (755 passed / 1 skipped) and `innfo-mcp` (265 passed) suites both green; `npx tsc --noEmit` clean in both packages.
- Spec: `diagnostic-signal-quality` / Requirement: Non-Actionable Repetitive Diagnostics Are Aggregated (all 4 scenarios).
