## Verification Report

**Change**: `validator-robustness`
**Mode**: Strict TDD (openspec persistence)
**Date**: 2026-09-09
**Branch**: `dev` — Units 1–4 committed (`40ca6ff`, `cb0823b`, `92c6b8b`, `660ce31`)
**Scope notes from maintainer**: `format:check` is NOT a gate (pre-existing drift; only zero-NEW-drift matters).
`innfo-editor` `vue-tsc` typecheck is environmentally broken pre-existing (unlinked workspace) — recorded, no repair attempted.

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 16 |
| Tasks complete | 15 |
| Tasks incomplete | 1 (`5.3` gate re-run — verify evidence below; NOT flipped by this report) |

`5.3` text: *Verify: `npm --prefix iNNfo run test`, `lint`, `typecheck` green; confirm zero NEW prettier drift
(format:check is NOT a gate).* Evidence status per leg: `lint` ✅ green (0 errors),
`typecheck` ✅ green for in-scope packages (core `tsc` build, mcp `tsc --noEmit`; editor `vue-tsc`
pre-existing broken, excluded), `test` ✅ green for in-scope suites (core 561, mcp 227) with ONE
environmental editor exclusion (proven below), zero-NEW-drift ✅ at file level (identical warn set
base→HEAD; see Build section). Whether this justifies flipping `5.3` is answered under Verdict —
this report does NOT flip it.

### Build & Tests Execution

**Lint** (`npm --prefix iNNfo run lint`): ✅ 0 errors, 498 warnings (all `no-explicit-any` /
`no-unused-vars` style warnings, pre-existing pattern; zero errors in change files).

**Typecheck**: ✅ `innfo-core` `npm run build` (`tsc`) clean; ✅ `innfo-mcp` `tsc --noEmit` clean.
➖ `innfo-editor` `vue-tsc` not attempted (maintainer-recorded pre-existing environmental breakage).

**Tests — innfo-core** (`npm --prefix iNNfo/packages/innfo-core test`): ✅ 45 files, **561 passed**,
1 skipped (`includes-composition`, pre-existing skip).

**Tests — innfo-mcp** (`npm --prefix iNNfo/packages/innfo-mcp test`): ✅ 24 files, **227 passed**.

**Tests — innfo-editor exclusion** (`tests/unit/shipped-template-versions.test.ts` only):
⚠️ 1 passed / **1 failed** — reproduced environmental failure (see Documented Exclusion).
Full editor suite NOT run (out of scope for this change; tree polluted by sibling untracked dirs).

**Format (non-gate, zero-NEW-drift check)**: `prettier --check` on the 15 change source files flags
7 files at HEAD. Base→HEAD comparison (same repo config, programmatic `prettier.format` diff):
every flagged file already drifted at base (`content.ts`, untouched by this change, drifts 430/483
lines — repo-wide pre-existing drift). File-level warn set is IDENTICAL base→HEAD (same 7 files;
the 8 other change files stay clean, incl. fresh modules `baseline.ts`, `validate.ts`, `server.ts`,
`diagnostics.ts`). Line-level: `document.ts` has **zero** drift on added lines; in 6 already-drifted
files the added lines follow the file's existing style. Per the scope rule this is not a gate;
recorded as a WARNING-level note (see Issues).

### TDD Compliance

No separate `apply-progress` artifact exists in openspec mode; TDD evidence is the RED/GREEN
task chain in `tasks.md` (every implementation task pairs a RED test task with a GREEN task),
cross-referenced below against files on disk and live suite results.

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | RED/GREEN per task in `tasks.md` (1.1–5.2); commit messages record suite counts |
| All tasks have tests | ✅ | 15/15 checked tasks map to test files that exist |
| RED confirmed (tests exist) | ✅ | 12/12 new/changed test files verified on disk |
| GREEN confirmed (tests pass) | ✅ | core 561/561, mcp 227/227 on execution |
| Triangulation adequate | ✅ | explicit pairs: init-model (inferred ×2 versions, override ×2), baseline (unit + MCP plumbing), validate (regression/suppressed/missing/info) |
| Safety Net for modified files | ✅ | full-suite runs recorded per unit (core 552→561, mcp 213→227); hermetic `INNFO_CACHE_DIR` isolation added to 3 suites when temp-dir default shared OS temp |

**TDD Compliance**: 6/6 checks passed.

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | ~57 | 6 | vitest (pure functions, in-process) |
| Integration | ~70 | 7 | vitest + temp FS + mocked `fetch` (tool contracts, resolver I/O, MCP round-trip) |
| E2E | 0 | 0 | Playwright/editor path not executed |
| **Total new/changed** | **~127** | **13** | |

E2E gap is scoped: the only E2E-track items are the demoted skill-text scenarios (wizard/canonical
write), manually verified per task `5.1` labels. No critical business logic lacks automated coverage.

### Changed File Coverage (innfo-core, v8)

| File | Line % | Branch % | Uncovered Lines | Rating |
|------|--------|----------|-----------------|--------|
| `src/diagnostics.ts` | 100 | 100 | — | ✅ Excellent |
| `src/types.ts` | 99.27 | 100 | 245-248 | ✅ Excellent |
| `src/parser/index.ts` | 100 | 100 | — | ✅ Excellent |
| `src/parser/markdown.ts` | 100 | 89.47 | 39, 46 | ✅ Excellent |
| `src/validator/baseline.ts` | 97.05 | 86.20 | 82-83, 91-92 | ✅ Excellent |
| `src/validator/document.ts` | 100 | 83.33 | 20, 89 | ✅ Excellent |
| `src/validator/model.ts` | 93.41 | 69.23 | pre-existing branches (86-187, 208-220 ranges) | ✅ Acceptable |
| `src/validator/references.ts` | 97.24 | 80.24 | 109-114, 212 | ✅ Excellent |
| `src/validator/workspaceReferences.ts` | 98.45 | 86.81 | 290-295 | ✅ Excellent |

**Average changed file coverage**: ~98% lines. No file below 80%. (mcp coverage not re-run; mcp suite
fully green with 227 tests incl. 14 new + contract updates.)

### Assertion Quality

**Assertion quality**: ✅ All assertions verify real behavior (0 CRITICAL, 0 WARNING).
Automated scan of all 12 new/changed test files: 567 `expect()` calls, 0 tautologies,
0 type-only-without-value blocks, 0 ghost loops (the single `for` iterates a non-empty 5-case
literal table with per-case assertions), 0 mock-heavy files (max 14 `vi.spyOn` vs 107 expects,
all `fetch` isolation — legitimate). Value assertions pin codes, hints, versions, counts, and
validity flags throughout.

### Quality Metrics

**Linter**: ✅ 0 errors (498 pre-existing style warnings, none introduced as errors).
**Type Checker**: ✅ core `tsc` + mcp `tsc --noEmit` clean; editor `vue-tsc` excluded (pre-existing environmental).

### Spec Compliance Matrix

Legend: ✅ `COMPLIANT` (covering test passed at runtime) · ⚠️ `PARTIAL` · ❌ `UNTESTED`.

**validation-baseline-differential** (7/7 compliant):

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Versioned Baseline File | New error surfaces | `baseline.spec.ts` > surfaces a new error… + `validate.spec.ts` > Regression blocked… | ✅ COMPLIANT |
| Versioned Baseline File | Known error suppressed with backlog link | `baseline.spec.ts` > suppresses a known error… + `validate.spec.ts` > Known error suppressed… (asserts `suppressedCount`, `backlog`, summary) | ✅ COMPLIANT |
| Versioned Baseline File | Missing baseline means full output | `baseline.spec.ts` > returns full output… + `validate.spec.ts` > Missing baseline… | ✅ COMPLIANT |
| Baseline Entry Lifecycle | Stale entry reported without failure | `baseline.spec.ts` > reports a stale baseline entry… + `validate.spec.ts` > Regression blocked… (asserts `staleEntries`, `BASELINE_STALE`, still reports) | ✅ COMPLIANT |
| Baseline Entry Lifecycle | Baseline deleted restores full output | covered by missing-baseline mechanism (deleted file ≡ missing file; both layers tested) | ✅ COMPLIANT |
| Verify Gate Diffs the Baseline | Regression blocked by the gate | `validate.spec.ts` > Regression blocked… (`valid=false`, names error) | ✅ COMPLIANT |
| Verify Gate Diffs the Baseline | Clean run passes the gate | `validate.spec.ts` > Known error suppressed… (`errors=[]`, `valid=true`) | ✅ COMPLIANT |

**model-scaffold-robustness** (6 compliant, 3 partial, 1 untested):

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Version-Aware Frontmatter Inference | Version inferred | `init-model.spec.ts` > Version inferred… (+triangulation) + `includes-and-scaffold` / `mutate-repair` version assertions | ✅ COMPLIANT |
| Version-Aware Frontmatter Inference | Override wins | `init-model.spec.ts` > Override wins… (+triangulation) | ✅ COMPLIANT |
| Version-Aware Frontmatter Inference | Mismatch refused | `init-model.spec.ts` > Mismatch refused… (`VERSION_MISMATCH`, writes nothing) | ✅ COMPLIANT |
| BOM Tolerance with Warning | BOM warns | `bom.test.ts` > BOM warns with a stable info code… + `validate.spec.ts` > Info diagnostics surface… (`severity=info`, still valid) | ✅ COMPLIANT |
| BOM Tolerance with Warning | No BOM, no warning | `bom.test.ts` > No BOM, no warning | ✅ COMPLIANT |
| Canonical Markdown Write Path | Clean validation | skill text (`SKILL.md` Canonical `.md` write path); manual label in task `5.1`; no automated test | ⚠️ PARTIAL |
| Canonical Markdown Write Path | Accents preserved | same as above (byte-identical round-trip asserted only as skill instruction) | ⚠️ PARTIAL |
| Explicit Procedures Block per Template | Empty block declared | NO template declares an explicit empty block (`organization`/`procedures` specs lack the key; discovery is dynamic via `list_template_procedures`) | ❌ UNTESTED |
| Explicit Procedures Block per Template | Wizard announces it | wizard line present in `SKILL.md` (A2a); manual label in task `5.1`; no automated test | ⚠️ PARTIAL |

**cross-model-reference-validation** (4/4 compliant):

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Qualified Cross-Model Reference Syntax | Qualified reference recognized | `workspaceReferences.test.ts` > qualified-ref-parsing… (5-case table incl. `[[Acme Org :: Jane Doe]]` shape) | ✅ COMPLIANT |
| Qualified Cross-Model Reference Syntax | Positional path-anchor not recognized | null-mechanism (`[[A]]`/`A :: B`→null, anchored regex) + AD-06 per-file bypass test (`recursive-parser.test.ts`, passing) | ✅ COMPLIANT |
| Qualified Cross-Model Reference Syntax | Canonical multivalue accepted everywhere | `workspaceReferences.test.ts` > Canonical multivalue accepted ×2 (YAML sequence + newline-separated) | ✅ COMPLIANT |
| Qualified Cross-Model Reference Syntax | Non-canonical fails with code + hint | `workspaceReferences.test.ts` > Non-canonical fails… (`MULTIVALUE_SYNTAX` + migration hint) | ✅ COMPLIANT |

**submodel-conformance-validation** (6 compliant, 1 partial):

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Actionable Diagnostic Severity and Clarity | Info keeps validity | `diagnostics.spec.ts` > info() records… + `info-passthrough.spec.ts` (3 mapping tests) | ✅ COMPLIANT |
| Actionable Diagnostic Severity and Clarity | Both misuse classes distinguished | behavior present (R-MM-02 message names class; L3-schema message names class + move-to-template fix); pre-existing `index.test.ts` R-MM-02 tests pass; NO new test asserts fix-example per class, no stable codes on these two diagnostics | ⚠️ PARTIAL |
| Submodel File Existence | Missing submodel warns | `references.spec.ts` > Missing submodel… (`SUBMODEL_NOT_FOUND`, path `elements.Docs.Guide.fields.submodel`, hint) | ✅ COMPLIANT |
| Submodel File Existence | Existing submodel passes | `references.spec.ts` > Mismatch… setup asserts `[]` with `exists:true` (no dangling diagnostic) | ✅ COMPLIANT |
| Target Template Conformance | Match by name passes | `references.spec.ts` > Match by name… | ✅ COMPLIANT |
| Target Template Conformance | Match by URL passes | `references.spec.ts` > Match by URL… | ✅ COMPLIANT |
| Target Template Conformance | Mismatch warns with code and hint | `references.spec.ts` > Mismatch warns… (`SUBMODEL_TEMPLATE_MISMATCH`, both names, hint) | ✅ COMPLIANT |

**template-cache-staleness-detection** (5/5 compliant):

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Resolver Cache Defaults to OS Temp | Default run leaves repo tree clean | `resolver-node.spec.ts` > Tree clean… + `defaultCacheDir points at the OS temp directory` | ✅ COMPLIANT |
| Resolver Cache Defaults to OS Temp | Cached temp entry reused | `resolver-node.spec.ts` > Temp entry reused… | ✅ COMPLIANT |
| Resolver Cache Defaults to OS Temp | Concurrent workspaces isolated | `resolver-node.spec.ts` > Concurrent isolated… | ✅ COMPLIANT |
| In-Place Writes Require Explicit Flag | Explicit flag restores in-tree caching | `resolver-node.spec.ts` > Explicit flag… | ✅ COMPLIANT |
| In-Place Writes Require Explicit Flag | No flag means no in-tree writes | same mechanism as Tree clean (default opts write nothing in-tree; asserted) | ✅ COMPLIANT |

**Compliance summary**: 28/33 scenarios compliant, 4 partial, 1 untested.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|-------------|--------|-------|
| `info` severity envelope | ✅ Implemented | `types.ts` union extended; `diagnostics.ts` `info()` + code/hint/meta preservation; `valid = errors.length === 0` unchanged |
| Baseline diff module | ✅ Implemented | `validator/baseline.ts`: `loadBaseline`/`fingerprint`/`diffNewOnly` + stale report; fingerprint `path::code::message`, slash-normalized |
| Seeded baseline | ✅ Implemented | `iNNfo/validation-baseline.json`: `version:1`, backlog link, **163 entries**, 0 malformed |
| Stable codes + hints (references) | ✅ Implemented | `SUBMODEL_NOT_FOUND`, `SUBMODEL_TEMPLATE_MISMATCH` with hints + meta |
| BOM tolerance | ✅ Implemented | `hasBom` export; `BOM_WARNING` info diagnostic; parse path unchanged |
| Canonical multivalue | ✅ Implemented | `splitCanonicalMultivalue` + `isCommaJoinedMultivalue`; `MULTIVALUE_SYNTAX` + migration hint |
| Scaffold inference | ✅ Implemented | override wins, mismatch refuses (`VERSION_MISMATCH`); contracts updated in `server.ts` |
| Temp cache + `inPlace` | ✅ Implemented | default `join(os.tmpdir(), 'innfo-specs')`; flag plumbed through resolver/spec/validate/init/server |
| Baseline-aware validate | ✅ Implemented | `baselinePath` + `suppressedCount`/`backlog`/summary + `BASELINE_STALE` |
| Skill canonical-write + wizard line | ✅ Implemented | `SKILL.md` mandatory write path + A2a empty-procedures announcement |
| Misplaced-field codes | ⚠️ Partial | class naming + fix directives present in messages; no stable codes/hints attached (ADDED req text does not demand codes) |
| Explicit empty procedures block | ❌ Missing | no template declares one; discovery is dynamic (`[]` when absent) |

### Coherence (Design — 8 decisions + 2 orchestrator follow-ups)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 `info` as 3rd severity (not `notices[]`) | ✅ Yes | union extended; validity unchanged by construction; tested |
| D2 pure `validator/baseline.ts` in core | ✅ Yes | pure module, MCP thinly passes `baselinePath`; unit + MCP tests |
| D3 fingerprint = path + code + message, slash-normalized | ✅ Yes | pinned by test (`pins path, code, and message…`, backslash test) |
| D4 infer version, explicit wins, mismatch refuses | ✅ Yes | tested all three incl. triangulation; `VERSION_MISMATCH` |
| D5 strip BOM + `BOM_WARNING` info | ✅ Yes | existing BOM parse tests stay green; new warn tests added |
| D6 YAML sequence OR newline-separated; comma fails | ✅ Yes | `MULTIVALUE_SYNTAX` + hint naming canonical form |
| D7 temp-dir default, `inPlace` restores writes | ✅ Yes | reads untouched (4 tiers); only fetch-and-save paths take cache dir |
| D8 no rollout flag; grandfather via baseline + hints | ✅ Yes | seeded 163-entry baseline; migration hints attached |
| F1 check-workspace `inPlace` self-heal | ✅ Yes | `resolveTemplateForModel` passes `inPlace:true`; test asserts hydrate + untouched specs |
| F2 info→warning adapter demotion | ✅ Implemented, ⚠️ untested | `toIntegrityDiagnostics` demotes `info`→`warning` keeping path/message/code; no dedicated test |

### Documented Exclusion (environmental — PROVEN, not counted against the change)

`innfo-editor` `tests/unit/shipped-template-versions.test.ts` > *every on-disk template slug with a
versioned filename is a map key* fails: `expected [ 'videoscript' ] to deeply equal []` (reproduced
2026-09-09 by running the file: 1 failed / 1 passed).
Evidence it is foreign to this change:
- The failing slug `videoscript/` under `iNNfo/specs/templates/` is entirely UNTRACKED sibling work
(`git status`: `?? iNNfo/specs/templates/videoscript/`; 16 untracked files via `git ls-files --others`).
- The test's inputs (`apps/innfo-editor/src/config/samples.ts`,
`src/composables/useTemplateVersionNotice.ts`, the test file itself) are untouched in
`40ca6ff~1..HEAD` (empty `git log` for those paths).
- The four validator-robustness commits touch ZERO files under `iNNfo/apps/innfo-editor/` and ZERO
under `iNNfo/specs/templates/` (per-commit file lists verified; the `metrics/*` files in range
belong to sibling commit `3f948b8`). Recorded as WARNING/environmental.

### Issues Found

**CRITICAL**: None (no in-scope test fails; no core task incomplete — `5.3` is the gate task whose
evidence is this report; see WARNING-1).

**WARNING**:
1. `5.3` unchecked — gate re-run pending. Archive is blocked until it flips. Flip criteria: re-run
`npm --prefix iNNfo run test` in a tree clean of sibling untracked dirs (expect the editor
exclusion to pass once the sibling lands `videoscript` + its map entry, or the dir is removed).
2. Editor exclusion above (environmental, proven, sibling-owned).
3. Skill-text scenarios without automated tests: `Clean validation`, `Accents preserved`,
`Wizard announces it` (⚠️ PARTIAL — text implemented, manual labels in task `5.1`), and
`Empty block declared` (❌ UNTESTED — template half not implemented; wizard condition references a
state no template exhibits). Demoted P1 scope per proposal; acceptable to land, follow-up recommended.
4. `Both misuse classes distinguished` (⚠️ PARTIAL) — behavior present + pre-existing R-MM-02 tests
green, but no new test pins fix-examples per class and no stable codes attached.
5. F2 info→warning adapter has no dedicated test (implemented, suite green around it).
6. Format note (non-gate): added lines in 6 already-drifted files follow existing file style;
`document.ts` zero new drift; file-level warn set identical base→HEAD.
7. Editor `vue-tsc` typecheck pre-existing environmental breakage (not attempted, per instruction).

**SUGGESTION**:
1. Triangulate the positional literal: add `acme_org.md#jane-doe` → `null` case to the
`parseQualifiedRef` table.
2. Add an automated skill-text assertion (canonical-write section + wizard line presence) and an
accent round-trip test through the `init_model` write path.
3. Resolve the procedures-block semantic: either declare explicit `procedures: []` in
`organization`/`procedures` specs or amend the spec to define "empty" as empty discovery result.
4. Add a dedicated `toIntegrityDiagnostics` info-demotion test.
5. Attach stable codes/hints to R-MM-02 and L3-schema-components diagnostics for codes-everywhere consistency.

### Verdict

**PASS WITH WARNINGS** — all P0 executable scope fully implemented and proven green at runtime
(core 561, mcp 227, lint/typecheck clean, ~98% changed-file coverage, assertion audit clean);
remaining items are demoted-scope skill-text gaps, one untested follow-up adapter, and a proven
environmental editor exclusion.

**On task `5.3`**: the gate evidence justifies flipping `5.3` to checked **only after** a clean-tree
re-run shows the full `npm --prefix iNNfo run test` green (the sole blocker is the sibling-owned
`videoscript` exclusion, plus maintainer acceptance of the file-level zero-NEW-drift reading and
the pre-existing `vue-tsc` exclusion). Until that re-run, `5.3` stays unchecked and archive is
blocked. This report does NOT mark it.
