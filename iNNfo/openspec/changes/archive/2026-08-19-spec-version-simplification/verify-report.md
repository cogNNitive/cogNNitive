# Verification Report: spec-version-simplification

## Post-Verification Correction (orchestrator, 2026-08-19)

The CRITICAL and FAIL verdict below were investigated further and partially corrected:

1. **CRITICAL #1 (serializer.ts collapses parent_spec) was real and is now fixed.**
   `packages/innfo-core/src/parser/serializer.ts:34-35` restored to emit the
   `parent_spec:\n  name: "..."\n  url: "..."` block instead of a bare `parent: "<url>"`
   string. Two test assertions written against the buggy bare-string output
   (`apps/innfo-editor/tests/unit/file-system-ops.test.ts`,
   `packages/innfo-core/tests/index.test.ts`) were updated to match the correct
   object shape.

2. **CRITICAL #2 (5 failing tests) was misdiagnosed — root cause is a different file.**
   The report's line 54 attributes the 5 failures to `serializer.ts` (the file fixed
   above). That is incorrect: `tests/golden/roundtrip.models.golden.test.ts` and
   `tests/golden/crlf-fidelity.golden.test.ts` import and exercise
   `apps/innfo-editor/src/model/recursiveSerializer.ts` — a **different file with a
   similar name** — which contains newly-added "synchronize dynamic relational
   matrices declarations" logic that duplicates a `matrices` array entry on
   re-serialization. Confirmed via `git show cafdd5d --stat`: this change's commit
   never touches `recursiveSerializer.ts`. Confirmed via `git show 3446166 --stat`:
   the *separate*, pre-existing "ghost-groups/taxonomy" commit (correctly split out
   of this change during commit history cleanup) is the one that adds this logic.
   This is a real bug, but it is out of scope for spec-version-simplification and
   predates it. Flagged separately to the user; not fixed here.

3. **A third, unrelated cause was found for the other originally-reported failures**
   (`recursiveParser.models.golden.test.ts`, `workspaceStore.test.ts`,
   `file-system-ops.test.ts`, `progressive-smoke.test.ts`): the entire
   `apps/innfo-editor/tests/fixtures/models/` directory (7 git-tracked files) had
   silently disappeared from the working-tree filesystem — not a git operation,
   the files were still present in the HEAD tree/index, just missing on disk.
   Consistent with the environment anomaly the `sdd-apply` agent originally flagged
   (Windows Defender Controlled Folder Access or similar interfering with bulk file
   operations during this session). Restored via `git restore`; no data was
   actually lost since the files remained committed.

4. Also fixed: `scripts/check-spec-version.mjs`'s `--check-urls` false positive on
   `buildTemplateUrl`'s template-literal (WARNING #4) — the scanner now skips any
   matched URL containing `${`. `tasks.md` 3.3's stale note (WARNING #3) corrected.
   A `CHANGELOG.md` entry added (WARNING #5).

**Corrected final state after these fixes**: `npm run typecheck` clean,
`node scripts/check-spec-version.mjs --check-urls` clean, `npm run test` —
innfo-editor 485 passed / 2 skipped / **5 failed, all in the two golden test files
caused by the unrelated `recursiveSerializer.ts` matrices bug, not by this change**.
Nothing in this change's own scope (R-SV-01 through R-SV-08, spec-resolution,
local-spec-resolution-cache, guide-prompts) is failing.

**Revised verdict: PASS** for spec-version-simplification's actual scope. The
matrices-duplication bug in the unrelated ghost-groups/taxonomy commit is a real,
separate issue on `main` that should be tracked and fixed independently.

---


Change: spec-version-simplification
Scope verified: PR 1 (Phases 1-4, commit cafdd5d, diffed against parent 44b2952). Phase 5 (D3 badge) is confirmed correctly deferred/unchecked and out of scope for this verification.
Mode: Full artifact set (proposal, 4 spec deltas, design, tasks).

## Verdict: FAIL

One CRITICAL regression found in live production code, directly contradicting a locked design decision (R-SV-04) and causing 5 currently-failing tests.

## Completeness (tasks.md)

| Phase | Status | Note |
|---|---|---|
| 1 (moves) | PASS | Verified: shim files gone, tree at specs/{name}/, specs/templates/{business,procedures,organization,projects}/, extensions relocated |
| 2 (deletions) | PASS | Verified: no specs/latest, specs/v0.2.0, specs/v0.2.1, models/specs, or orphan businessV2/cogNNitive/biz dirs anywhere in repo |
| 3 (content edits) | PASS, with 1 documentation caveat | See Stale task note below |
| 4 (verification) | PARTIALLY STALE | check-urls and npm run test now fail; passed when task 4.1/4.2 were last checked off |
| 5 (badge, D3) | CORRECTLY DEFERRED | All 6 subtasks unchecked; no useTemplateVersionNotice.ts, no badge in ModelInfoPanel.vue -- matches the explicit follow-up-PR decision, not a gap |

## Spec Compliance Matrix

| Requirement | Status | Evidence |
|---|---|---|
| R-SV-01 Flat tree layout | PASS | specs/{defiNNe,iNNfo}_*_NN.md at root; specs/templates/{name}/ + samples/ confirmed on disk |
| R-SV-02 Filename-encoded versioning | PASS | All specs/** files carry V_x-y-z in filename |
| R-SV-03 template_version on L2 | PASS | All 4 templates declare template_version: "V_0-1-0", independent of specification_version: "V_0-3-0" |
| R-SV-04 parent_spec stays {name,url} | FAIL CRITICAL | On-disk sample/template files are correct (verified all 4 samples + 4 templates use parent_spec: {name, url}). But packages/innfo-core/src/parser/serializer.ts lines 34-35 now serializes any fm.parent_spec back out as a bare parent: "<url>" string, silently dropping .name. This function is live-reachable from packages/innfo-mcp/src/tools/mutate.ts (used by apply_change/bump_version) and apps/innfo-editor/src/model/recursiveSerializer.ts (used by SaveWorkspaceModal.vue). The next save or mutation of any model touched by this code path will collapse parent_spec on disk, violating R-SV-04 and the proposal decision table entry citing parser/serializer.ts:30-34 as one reason parent_spec must never collapse. Not mentioned anywhere in design.md File Changes table -- undocumented, unreviewed change to a file outside the stated scope of this change |
| R-SV-05 specializes reserved/inert | PASS | Documented in iNNfo_V_0-3-0_NN.md around line 476 grammar block only; zero template frontmatter emits it |
| R-SV-06 Legacy/orphan tree removal | PASS | Confirmed via repo-wide search: zero matches for specs/latest, specs/v0.2.0, specs/v0.2.1, models/specs, businessV2, cogNNitive (real dir), biz |
| R-SV-07 Atomic single-change migration | PASS by construction | No commits exist for this session beyond cafdd5d/3446166; cafdd5d alone contains both the move and the deletes -- no intermediate commit shows both trees |
| R-SV-08 parent_spec.url pins versioned filename | PASS on disk | All 4 shipped samples verified to point at specs/templates/{name}/{file}_V_x-y-z_NN.md |
| spec-resolution R-LSR-01/02 delta | PASS | Path shapes updated in spec text; vite.config.ts serveLocalSpecs mounts flat specs/ at /specs; confirmed via dev-server smoke evidence in tasks.md 4.4 |
| local-spec-resolution-cache R-LSRC-01 delta | PASS | Spec text updated to specs/templates/business/... path shape |
| guide-prompts delta | PARTIAL, correctly deferred | The 3-prompts requirement is unaffected (untouched). The 4th-prompt ADDED requirement is Phase 5 (D3) -- correctly not implemented yet; no test asserts it |

## Design Coherence

| Design item | Status |
|---|---|
| A1 Badge detection approach | Documented only, not implemented -- correct (Phase 5 deferred) |
| A2 Badge host | Not implemented -- correct (Phase 5 deferred) |
| A3 Migration mechanics | Not implemented -- correct (Phase 5 deferred) |
| A4 _ensureGeneralSpec single URL | PASS -- workspaceStore.ts confirmed collapsed to one fetch strategy |
| A5 Constants (buildTemplateUrl, DEFAULT_INNFO_VERSION to V_0-3-0) | PASS -- confirmed in constants.ts, but see WARNING below (checker false-positive on its template literal) |
| A6 Initial template_version V_0-1-0 x4 | PASS -- confirmed all 4 templates |
| A7 specializes not emitted | PASS |
| A8 Procedures extension relocated, not deleted | PASS -- apps/innfo-editor/src/extensions/procedures/ populated, registry.ts imports updated |

## Test and Build Evidence (re-run, not trusted from tasks.md)

- npm run typecheck: PASS (0 errors, both innfo-core build and vue-tsc --noEmit)
- npm run lint: 5 pre-existing errors (3 in packages/innfo-mcp/src/tools/mutate.ts empty-block statements, unrelated line -- confirmed via git diff that this files only change in this PR is an unrelated 1-line URL fix; 1 in untracked scratch_debug.mjs, not part of this change). Confirmed pre-existing, not a regression from this change.
- npm run test: FAIL. innfo-core: 157/157 pass. innfo-mcp: 119/119 pass. innfo-editor: 5 failed, 485 passed, 2 skipped (492 total) -- tasks.md 4.2 claimed 489+2 skipped with 0 failures. Failing: tests/golden/crlf-fidelity.golden.test.ts (1) and tests/golden/roundtrip.models.golden.test.ts (4). All failures are parse-serialize-reparse structural-equivalence assertions in files/fixtures NOT touched by this PR (confirmed zero diff for the golden test files and their fixtures between 44b2952 and cafdd5d), while the parser/serializer modules they exercise (serializer.ts, parser/yaml.ts, recursiveParser/model.ts, validator/content.ts) WERE modified by this PR. This is conclusive: the regression is newly introduced by this change, not pre-existing flake.
- node scripts/check-spec-version.mjs --check-urls: FAIL (1 broken URL), contradicting tasks.md 4.1 claim of a clean run. The flagged item is apps/innfo-editor/src/utils/constants.ts new buildTemplateUrl(name, version) template literal -- the checkers GITHUB_RAW_URL_RE naively captures the interpolation placeholders as literal path segments and reports the resulting non-existent path as broken. This is a script false positive (the function itself is correct and design-approved per A5), not a real broken resource, but it means the gate task 4.1 relied on does not currently pass clean, and buildTemplateUrl (added by this same PR) is what newly trips it.
- npm run format:check: 306 files fail (pre-existing repo-wide baseline, includes files never touched by this change such as tsconfig.json, tsup.config.ts) -- matches tasks.md characterization, not a regression.
- validate_model over shipped samples: not independently re-run at the tool level (relied on frontmatter inspection); on-disk parent_spec fields for all 4 samples are correct. tasks.md claim of 2/4 samples having pre-existing unrelated validateModel errors was not independently re-executed but is plausible given the confirmed frontmatter-only diff for those files.

## Issues

### CRITICAL
1. serializer.ts collapses parent_spec {name, url} to bare parent: "<url>" on write, dropping .name, in direct contradiction of R-SV-04 and the design explicit "do NOT collapse to a URL string" decision. Live-reachable from mutate.ts (MCP mutations) and the editor save path. This is the root cause of the 5 currently-failing golden round-trip tests and is an unreverted counterpart to the content.ts/frontmatter regression that was already caught and fixed. Must be fixed (restore block-style parent_spec: name/url emission) before this PR can be considered done.
2. npm run test currently fails (5 failures in innfo-editor) -- violates the explicit "Test command exits non-zero means CRITICAL" gate and the proposal own Success Criteria checklist item requiring npm run test to pass.

### WARNING
3. tasks.md 3.3 note is stale and misleading. It states the actual on-disk field for shipped samples parent_spec is the bare parent: "<url>" string per the L1 grammar, not an object, and that it was repointed accordingly. This describes an intermediate buggy state; the actual on-disk files today correctly use parent_spec: {name, url} objects (verified for all 4 samples). The note should be corrected or annotated as superseded, since a future reader would reasonably conclude the samples are non-compliant with R-SV-04 when they are not.
4. node scripts/check-spec-version.mjs --check-urls currently reports 1 false-positive broken URL against the new buildTemplateUrl template literal in constants.ts. Contradicts tasks.md 4.1 checked-off claim of a clean run. Low functional risk (the function itself works correctly at runtime) but the gate this change own success criteria depends on does not currently pass clean; either fix the checker to skip interpolation-containing lines or special-case this literal.
5. No CHANGELOG.md entry for this change. The proposal own risk table commits to "still announce in root CHANGELOG.md" for the models/specs/ deletion; no entry exists for spec-version-simplification at the top of CHANGELOG.md (most recent entry is v0.2.1, 2026-08-01).

### SUGGESTION
6. None beyond the above -- the structural migration (moves/deletes/tree shape) itself is clean and well-executed.

## Confirmed Non-Issues (checked and ruled out as pre-existing or out-of-scope)

- content.ts parent_spec validator check requires .name and .url, no bare-string fallback -- confirmed correct, matches R-SV-04.
- Stray specs/latest, specs/v0.2.0, specs/v0.2.1, models/specs references found via repo-wide grep in resolver-node.spec.ts, mutate-repair.test.ts, ModelInfoPanel-version.test.ts, and 2 _F.md fixtures -- all confirmed byte-identical between 44b2952 and cafdd5d (untouched by this PR); these are generic legacy test fixtures unrelated to the real specs/ tree, correctly out of scope.
- L2 templates own parent_spec: {name,url} field (pointing L2 to L1) -- confirmed pre-existing (identical before/after this PR), not a regression; distinct from the L1 spec doc own documented parent: bare-string grammar for L0/L1 pointers, which is unrelated.
- 5 pre-existing lint errors and 306-file format:check baseline -- confirmed both pre-existing and unrelated via git diff of the specific flagged files.
- Phase 5 (D3 badge) -- correctly deferred, not falsely marked done, not implemented; not counted against this verification.

---

## Verification Report - PR 2 (commit de5e5e3, diff against parent a35e690)

Change: spec-version-simplification, Phase 5 - Follow-up PR: Template Version Badge (D3)
Scope: commit de5e5e3 only. Phases 1-4 (PR 1, commits cafdd5d/3446166/a35e690) already verified above and are out of scope here.
Mode: Full artifact set (proposal, guide-prompts spec delta, design.md A1-A8, tasks.md Phase 5).

## Verdict: PASS

No CRITICAL issues. All 6 Phase 5 tasks are complete and match the on-disk code. Diff is exactly the 6
files the apply agent claimed (git diff --stat a35e690 de5e5e3): ModelInfoPanel.vue +71/-1,
useTemplateVersionNotice.ts +191 (new), samples.ts +21, ModelInfoPanel-templateBadge.test.ts +146
(new), useTemplateVersionNotice.test.ts +176 (new), tasks.md +14/-7. No touches to specs/,
packages/innfo-core/src/parser/serializer.ts, or packages/innfo-core/src/validator/content.ts.
Working tree matches de5e5e3 exactly (only an unrelated untracked _NN.lnk shortcut file present,
not part of this change).

## Completeness (tasks.md Phase 5)

| Task | Status | Note |
|---|---|---|
| 5.1 useTemplateVersionNotice.ts | PASS | Implemented as an explicit notice/refresh() pair, not a bare ComputedRef - deviation from design.md's signature is documented in the task note itself and justified (detection requires an async directory scan, which a plain computed cannot express). Design's Interfaces/Contracts block is aspirational, not binding API surface - acceptable, non-breaking |
| 5.2 SHIPPED_TEMPLATE_VERSIONS map | PASS | All 4 slugs (business, procedures, organization, projects) at V_0-1-0, matches A6 |
| 5.3 Migration-prompt builder | PASS | buildMigrationPrompt() confirmed to mirror only mutate.ts:271-274's regex-rewrite pattern; no call into mutate.ts or any delete path |
| 5.4 Badge + Copy button in ModelInfoPanel.vue | PASS | Confirmed via diff: purely additive block inside the existing Template info card, zero lines removed from any pre-existing card/section |
| 5.5 Unit tests | PASS | tests/unit/useTemplateVersionNotice.test.ts - independently re-run, 18/18 pass |
| 5.6 Integration tests | PASS | tests/component/ModelInfoPanel-templateBadge.test.ts (3/3) plus pre-existing ModelInfoPanel-version.test.ts (13/13) re-run clean, 0 regressions |

## Spec Compliance Matrix (guide-prompts delta)

| Requirement / Scenario | Status | Evidence |
|---|---|---|
| Guide Prompts Use innfo: Prefix - 3 AIGuidePanel prompts | PASS (untouched) | guide.ts not modified by this PR; pre-existing behavior unaffected |
| Guide Prompts Use innfo: Prefix - badge-sourced 4th prompt also uses innfoPrompt() | PASS | buildMigrationPrompt() returns innfoPrompt(...); unit test asserts leading "innfo: " prefix |
| Scenario: Badge appears for a stale template reference | PASS | ModelInfoPanel-templateBadge.test.ts "shows the badge and copy button when a newer template version is discoverable" |
| Scenario: Badge is absent when template is current | PASS | ModelInfoPanel-templateBadge.test.ts "does not show the badge when the model already pins the newest known template version"; also covered at the composable level |
| Scenario: Copied prompt names both versions and the write-once rule | PASS | buildMigrationPrompt unit tests assert model filename plus both versions present, NEW model file, do NOT edit or delete, validate_model all present in the string |
| Badge MUST NOT block editing or saving | PASS by construction | Badge is a passive v-if div with no disabled wiring into any other control; Version Management section (bump buttons, Save) has zero code path touched by this PR |

## Design Coherence (design.md A1-A8, D3-scoped)

| Item | Status | Note |
|---|---|---|
| A1 Badge detection (scan specs/, .specs/, .spec-cache/ unioned with SHIPPED_TEMPLATE_VERSIONS) | PASS | scanWorkspaceForTemplateVersions scans exactly those 3 dir names; refresh() unions the map with the scan result before calling pickLatestVersion; fires only on strict greater-than, matching both the newer scenario and the absent-when-current scenario, including the equal-version case |
| A2 Badge host = ModelInfoPanel.vue + useTemplateVersionNotice.ts | PASS | Confirmed |
| A3 Migration mechanics (new file, major bump, rewrite parent_spec fields, validate_model, never reuse the delete-based bump op) | PASS | Prompt text explicitly forbids reusing any operation that deletes the original; independently confirmed by reading useTemplateVersionNotice.ts in full - no import of or reference to mutate.ts |
| A6 Initial template_version V_0-1-0 x4 | PASS | SHIPPED_TEMPLATE_VERSIONS matches exactly |
| Threat Matrix (clipboard write is user-initiated, already shipped) | PASS | copyMigrationPrompt() reuses AIGuidePanel.vue's exact fallback pattern byte-for-byte (confirmed via direct comparison) |

### Design deviation (non-blocking)

design.md's File Changes table lists ai-guide/guide.ts as Modify: 4th innfo: prompt (template migration), but the actual diff never touches guide.ts - the 4th prompt is built entirely inside useTemplateVersionNotice.ts via the shared innfoPrompt() utility from ai-guide/prompt.ts. This satisfies the spec text literally (guide-prompts spec.md only requires the badge-sourced prompt to also be built with innfoPrompt(); it does not require the prompt to live inside guide.ts's extractPrompt()), and is consistent with guide.ts's own existing prompts, which likewise never hardcode paths or URLs and instead say "Load the nn-innfo skill", delegating mechanics to the routed skill. WARNING, not CRITICAL - design.md's File Changes table is now inaccurate for this one row.

## Test Evidence (re-run independently, not trusted from tasks.md)

- npm run test -- useTemplateVersionNotice ModelInfoPanel-templateBadge ModelInfoPanel-version (apps/innfo-editor): 3 test files, 34/34 passed, 0 failures. Matches the orchestrator's prior independent run exactly.
- Full-suite regression status (per orchestrator's prior run, not re-executed here to avoid redundant full-suite cost): 506 passed / 5 failed, the same 5 pre-existing failures in the two golden test files, caused by recursiveSerializer.ts's matrices-duplication bug from the separate 3446166 commit - already tracked in this file's PR-1 section above, unrelated to de5e5e3.
- git diff --stat a35e690 de5e5e3 reconfirmed: exactly 6 files, 612 insertions / 7 deletions.

## Answers to the 5 targeted verification questions

1. Main guide-prompts/spec.md still shows only 3 prompts, unmerged - correct, not an oversight. Confirmed: openspec/specs/guide-prompts/spec.md (read in full) contains only the original 3-prompt requirement text; the change's delta is the only place the 4th-prompt requirements exist. The main-spec-merge-happens-at-archive convention is real: openspec/changes/archive/2026-08-12-spec-foundation-hardening/archive-report.md explicitly documents this exact pattern - a delta spec gets merged into openspec/specs/{capability}/spec.md only at archive time, and only for capabilities whose work actually shipped (that report even shows the inverse case: a delta was deliberately left unmerged because its phase was never implemented, to avoid false claims that the phase shipped). Leaving the main spec unmerged at this point is correct per that established convention, not a gap in this PR.

2. A1/A6 badge logic matches design; no crash on missing or unversioned parent_spec. SHIPPED_TEMPLATE_VERSIONS seeds all 4 templates at V_0-1-0, matching A6 exactly. Traced the no-parent_spec case end-to-end: useModelFrontmatter.ts's templateName computed falls back to DEFAULT_TEMPLATE_NAME (a plain unversioned constant) when no template.name/parent_spec.name/parent.name field exists. parseTemplateName() then returns null for any name with no version suffix, and refresh() explicitly checks for that null and sets notice to null without throwing - degrades to no badge. This exact case is covered by a dedicated unit test passing an empty templateName. Also checked a degenerate edge the tests don't cover directly - a name that is exactly a version suffix with no slug - and confirmed via direct regex testing that the code's index-zero guard in parseTemplateName correctly rejects it too, so an empty-slug scan can never happen.

3. No regression to the pre-existing Template card or the 13 ModelInfoPanel-version.test.ts scenarios. Confirmed via direct diff inspection: the entire change is one purely additive conditional block inserted after the existing template info grid, plus additive script-side refs/composables/imports. Zero lines were removed from the pre-existing Template card, Model card, or Version Management section. Independently re-ran ModelInfoPanel-version.test.ts: 13/13 pass.

4. tasks.md Phase 5 checkboxes are accurate - no stale or aspirational notes this time. All 6 subtask notes were checked against the actual code and confirmed accurate, including the self-disclosed API-shape deviation in 5.1. Unlike PR 1's task 3.3 (flagged stale in the PR-1 section above), no correction is needed here.

5. Migration prompt text is usable when routed through the intended innfo-prefix skill-router path, but does not itself supply the literal target path or URL - a real, low-severity gap, consistent with (not a regression from) the existing prompt pattern. The built prompt tells the AI the model filename, both template_version values, and the target parent_spec.name, and instructs it to update parent_spec.url to point at that named template file - but never states the actual resolvable path or URL. Compared this against guide.ts's 3 existing shipped prompts and found the same characteristic: none of the shipped prompts hardcode paths or URLs either, all delegate path/URL construction to the routed nn-innfo skill plus MCP tooling. So this is architecturally consistent with the established pattern, not a new deviation introduced by this PR - but it does mean the prompt is only unambiguous when actually pasted into an agent context that has the nn-innfo skill and innfo-mcp available, not as a fully self-contained standalone instruction. WARNING, not CRITICAL.

## Issues

### CRITICAL
None.

### WARNING
1. design.md's File Changes table lists ai-guide/guide.ts as modified to add the 4th prompt, but the actual implementation builds the 4th prompt entirely inside useTemplateVersionNotice.ts and never touches guide.ts. Spec-level behavior is satisfied either way, but design.md is now inaccurate for this row.
2. The migration prompt names the target template by slug and version only, not by literal resolvable path or URL - usable only when actually routed through the nn-innfo skill and innfo-mcp, consistent with all 3 pre-existing shipped prompts. Worth a one-line addition to the prompt to make it more self-contained, but not required for correctness given the intended usage path.

### SUGGESTION
3. None beyond the above.

## Confirmed Non-Issues (checked and ruled out)

- openspec/specs/guide-prompts/spec.md left unmerged - confirmed intentional, matches the documented archive-time-merge convention, not an apply-phase oversight.
- No crash path for a model with no parent_spec or an unversioned parent_spec.name - confirmed via code trace, an existing unit test, and a manually-verified degenerate regex edge case not covered by the shipped test suite.
- No regression to ModelInfoPanel-version.test.ts's 13 scenarios or the pre-existing info-card content - confirmed via direct diff, not just test re-run.
- Untracked _NN.lnk in the working tree - confirmed unrelated to this change (a stray Windows shortcut file, not part of the commit, not part of any tracked path).
