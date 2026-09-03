# Verify Report — complete-innfo-v0-2-0-adoption

Phase: sdd-verify (read-only)
Repo: iNNfo monorepo
Branch: feat/business-template-decomposition
Date: 2026-09-01
Verdict: PASS WITH WARNINGS — NOT READY for the 4-PR chain (1 CRITICAL).

---

## C1 RESOLVED (orchestrator, post-verify, 2026-09-01)

`specs/iNNfo_V_0-1-0_NN.md` reverted to `status: "Draft"` — it is now byte-identical to HEAD (`git diff` empty). Only `specs/iNNfo_V_0-2-0_NN.md` moves `Draft` → `Stable`, which R-SV-09 explicitly mandates for the adopted version. Docs (`specifications.md` L1 section + adoption blockquote) and `CHANGELOG.md` reworded: the "no longer current" signal for V_0-1-0 is carried by `DEFAULT_INNFO_VERSION` + `iNNfo_V_0-2-0` being `Stable`, not by editing the immutable file. `design.md` gained an "O1 amendment" section; `tasks.md` 1.2 updated. `check:spec-urls` (+`--with-skills`) still green; prettier clean.

**Revised R-SV-09 verdict: PASS** (all 3 scenarios). **Revised overall: READY for the 4-PR chain**, with the WARNINGs/SUGGESTIONs below carried as follow-ups (none blocking).

---

## Executive summary

Mechanical work is correct and complete. Frozen V_0-1-0 files are byte-unchanged; the 4 new V_0-2-0 templates and 2 new samples are verbatim copies with only version-identity re-points; check:spec-urls (with --with-skills) is literally green; the frozen-file allow-list fully covers the scan output; workspace_spec_NN.md is byte-identical across the two repos; all three test suites are at the documented baseline with ZERO new failures (core 230/230, mcp 130/130, editor 7 pre-existing fails / 522 passed).

One blocker (C1): task 1.2 (iNNfo_V_0-1-0_NN.md status Draft to Deprecated) contradicts this change delta spec R-SV-09, whose body says superseded L1 files keep whatever status they were published with and whose scenario 3 requires the file byte-identical, still status Draft. Inherited from design D1; design.md flags it as an unresolved Open Question needing user sign-off that was never recorded.

CRITICAL: 1 | WARNING: 5 | SUGGESTION: 4

## Spec-by-spec pass/fail

R-SV-09 Adopted L1 Version Invariant — FAIL (1 of 3 scenarios + requirement immutability clause)
  PASS: DEFAULT_INNFO_VERSION is V_0-2-0 (constants.ts:13, scalar).
  PASS: specs/iNNfo_V_0-2-0_NN.md exists, status Stable (git diff L9 Draft to Stable); inside defiNNe vocabulary Draft/Stable/Deprecated; not Active.
  FAIL: scenario "Superseded L1 spec is left untouched". specs/iNNfo_V_0-1-0_NN.md:9 changed Draft to Deprecated. Requirement body and scenario 3 both require it untouched. See C1.

R-SV-10 Template-Set Completeness at the Adopted L1 Version — PASS (with note)
  PASS: all 9 template folders have a file whose parent_spec.name is iNNfo_V_0-2-0. blank/cogNNitive/innovation/procedures/business/organization/projects via *_V_0-2-0_NN.md; analysis and business-model via first-revision _V_0-1-0_ file carrying spec_version V_0-2-0 + parent_spec.name iNNfo_V_0-2-0 (R-SV-03, scenario 3).
  PASS: every frozen _V_0-1-0_ template sibling byte-unchanged (git status shows none modified).
  NOTE: scenario 2 says the new file differs from its source only in the 5 named frontmatter fields. The new files also re-point in-body parent-chain / meta-template / canonical-sample-path lines (13/7/7/12 changed lines for blank/cogNNitive/innovation/procedures). Sanctioned by design D2 rule R1 and matches the shipped business_V_0-2-0_NN.md precedent; body re-points make the artifacts more correct and do not affect resolution semantics. Recorded as WARNING, not a failure.

R-SV-11 Frozen-Reference Allow-List — PASS
  PASS: allow-list defined in proposal.md rows 1-15 (row 15 added for cogNNitive_V_0-2-0_NN.md per task 1.9 / design D2 amendment).
  PASS: --version V_0-1-0 --by-type --with-skills (104 files) reviewed below; every entry maps to an allow-list row or is individually justified.
  PASS: no zero-match CI gate wired; check:spec-urls is the runnable gate.

R-SV-12 Cross-Repo Bundled-Template Fidelity — PASS
  PASS: diff -q iNNfo specs/templates/workspace_spec_NN.md vs actioNN/skills/nn-innfo/templates/workspace_spec_NN.md is identical. Both 196 lines, md5 4d3d96cf976ecb60eee16c572b571c3c. spec_version V_0-2-0, parent_spec.name iNNfo_V_0-2-0, no legacy pre-NN grammar.

R-LSR-05 Shipped Spec URL Integrity — PASS
  PASS: npm run check:spec-urls reports all hardcoded GitHub raw URLs point to existing files.
  PASS: node scripts/check-spec-version.mjs --check-urls --with-skills reports the same, 23 skill files scanned.
  PASS: new V_0-2-0 template/sample spec_url + parent_spec.url all resolve locally in-repo.

## CRITICAL

C1 — iNNfo_V_0-1-0_NN.md status edit contradicts the change delta spec R-SV-09
  What: specs/iNNfo_V_0-1-0_NN.md:9 changed from status Draft to status Deprecated (task 1.2, PR 1 / slice A).
  Conflict: delta openspec/changes/complete-innfo-v0-2-0-adoption/specs/spec-versioning/spec.md:
    - R-SV-09 body: "Superseded L1 spec files are immutable (R-SV-02) and keep whatever status they were published with."
    - R-SV-09 scenario 3: "THEN it is byte-identical, still status: Draft".
  Root cause: design decision D1 chose Deprecated and argued it is legal because status is inert (types.ts:96 status is optional string, no enum, no validator, no consumer in core/mcp/editor, not read by check-spec-version.mjs), so R-SV-02 resolution-semantics immutability is not breached. That reasoning was never propagated back into the delta spec, and design.md Open Questions still lists it as needing user confirmation, which was not recorded before task 1.2 was checked off.
  Impact: PR 1 as implemented ships a change that fails its own spec. Blocks a clean archive.
  Resolution options (either unblocks):
    1. Amend delta spec R-SV-09 — reword the immutability clause + scenario 3 to permit an inert lifecycle-metadata edit (status) on a superseded L1 file, citing the D1 rationale, AND record the user sign-off design.md asks for. Then Deprecated is compliant.
    2. Revert specs/iNNfo_V_0-1-0_NN.md:9 to status Draft (design.md notes this fallback costs nothing but leaves the vocabulary unused). Then R-SV-09 passes as written.
  Note: R-SV-09 other dimensions (adopted spec Stable, exists, in-vocabulary, not Active) already pass. Only the superseded-file clause fails.

## Frozen-file allow-list review — --version V_0-1-0 --by-type --with-skills

104 files. No file outside the allow-list treats a superseded version as current.

  Models (1): FORMAT_V_0-1-0_business_F.md -> row 8 (legacy FOLDER-mode _F.md fixture). OK.
  Tests (29): row 14 (backward-compat coverage; V_0-1-0 legit unless asserting the current default). High-suspicion files audited in design O3 + apply task 2.10. useTemplateVersionNotice.test.ts and ModelInfoPanel-templateBadge.test.ts re-pointed per the O5 amendment. sample-urls.test.ts (new) uses V_0-1-0 only in a negative assertion. OK — see W2 on audit-trail completeness.
  Source (23): 20 hand-written .ts/.vue + 3 generated packages/innfo-core/dist/*.d.ts. Hand-written -> covered by v0-1-0-source-audit.md: 18 KEEP (illustrative/historical/definitional/defensive/semantically correct), 5 KEEP-for-this-change + FOLLOW-UP (genuine current-default assumptions, out of scope — see S1). 3 dist/*.d.ts -> build artifacts, not in allow-list — see W3.
  Docs (27): CHANGELOG.md -> row 9. specs/defiNNe_V_0-1-0_NN.md -> row 1. specs/iNNfo_V_0-1-0_NN.md -> row 2. specs/iNNfo_V_0-2-0_NN.md (4 back-refs) -> row 3. 7 frozen _V_0-1-0_ templates -> row 4. business_V_0-2-0_NN.md includes URLs -> row 7. analysis_V_0-1-0 and business-model_V_0-1-0 -> row 6 (A1 confirmed, task 0.1). 6 _V_0-1-0_ samples -> row 5. docs/documentation/specifications.md and usage.md -> edited (task 3.2/3.3); all refs describe iNNfo_V_0-1-0 as Deprecated/frozen/first-revision, no current claim. docs/changesets/{innfo-repo,format-repo}.md and docs/repair-guide.md -> historical _FORMAT.md migration records / illustrative fictional model ids (task 3.3 KEEP) — justified. specs/templates/workspace_spec_NN.md -> deferred-rename first-revision file, out of scope (L2) — see W4.
  Skills (8): .agents/skills/nn-dev-spec-version-propagator/SKILL.md -> protected tooling file, V_0-1-0 only as command examples (W1). actioNN/nn-innfo/SKILL.md -> task 4.2, residuals are "new file starts at V_0-1-0" filename conventions + arch-example model names, justified. actioNN/nn-innfo/templates/workspace_spec_NN.md -> R-SV-12 canonical sync. nn-preflight/SKILL.md and nn-site-generator/SKILL.md -> row 11 (skill own version field). nn-trannsform/{SKILL,README,TESTING}.md -> row 12 (filename citations) for the glob/filename hits; the "iNNfo V_0-1-0" prose hits are a deferred follow-up (task 4.5) — see S2.
  Other (16): openspec/changes/complete-innfo-v0-2-0-adoption/** -> this change planning docs. openspec/changes/archive/** -> row 10. openspec/changes/graph-view-relationship-types/** -> separate active change, explicitly V_0-1-0-bounded. openspec/specs/{guide-prompts,opencode-innfo-agent,organization-template,spec-resolution,spec-versioning}/spec.md -> row 13 (illustrative worked examples, default leave). apps/innfo-editor/src/ai-guide/procedure_NN.md -> task 3.3 (FM re-pointed to V_0-2-0, model_version example kept). .atl/skill-registry.md -> tooling registry example text (W3).

Conclusion: R-SV-11 satisfied — every residual is allow-listed or individually justified.

## WARNING

W1 — Protected orchestrator-tooling files are dirty in the working tree. git status shows package.json, .github/workflows/ci.yml, scripts/check-spec-version.mjs, CONTRIBUTING.md, .agents/skills/nn-dev-spec-version-propagator/SKILL.md all modified (nothing staged). Diffs are unrelated prior tooling work: spec-integrity CI job, check:spec-* npm aliases, --with-skills flag + actioNN/skills classification, prettier reformatting, CONTRIBUTING checklist updates. No new hunk touches V_0-1-0 to V_0-2-0 version identity (only version literals added are V_0-1-2 command examples). Matches task 0.3. This change (PR 1-4) must not stage or commit these files.

W2 — Test-file allow-list audit only partially documented. design O3 named 4 high-suspicion test files; apply task 2.10 v0-1-0-source-audit.md covers source files, not the full 29-file test set. Residual V_0-1-0 literals in the other test files are very likely legitimate backward-compat assertions (row 14) and no test regressed, but a per-file test verdict table was never produced. Low risk; worth completing before archive.

W3 — Files outside the allow-list still matching V_0-1-0: packages/innfo-core/dist/{helpers,schema,types}.d.ts (generated build artifacts mirroring KEEP src doc-comments) and .atl/skill-registry.md (tooling registry example text). None is a current-default assertion. Not blocking; dist/ is committed and will keep matching forever — consider gitignoring packages/*/dist later.

W4 — specs/templates/workspace_spec_NN.md still carries a V_0-1-0 body reference and an unversioned filename. Explicitly out of scope (Locked Decision L2 — rename + redesign owned by workspace-taxonomy-and-submodels). The actioNN copy is synced as-is per R-SV-12. Flagged, not a defect for this change.

W5 — design O5 was amended mid-apply, expanding test-fixture scope. The O5 amendment section in design.md sanctions re-pointing business to analysis fixtures in useTemplateVersionNotice.test.ts (x2) and ModelInfoPanel-templateBadge.test.ts (x3), which original O5 listed as run-do-not-rewrite. Edits are mechanical fixture maintenance forced by SHIPPED_TEMPLATE_VERSIONS flipping business to V_0-2-0; production code unchanged, diffs clean. Acceptable because design.md now records it, but it is scope growth on PR 2 that the PR body should call out.

## SUGGESTION

S1 — File the "propagate DEFAULT_INNFO_VERSION into scaffolding/serialization defaults" follow-up (with Phase 5.1). Covers the 5 deferred current-default assumptions: packages/innfo-core/src/parser/serializer.ts:28 (spec_version fallback V_0-1-0); packages/innfo-mcp/src/tools/mutate.ts:849/853/854 + doc mirror server.ts:213 (create_model scaffolds new models pinned to the now-Deprecated L1 — highest priority); apps/innfo-editor/src/views/StandaloneProcedureView.vue:71-77 (embedded demo doc pins procedures_V_0-1-0 + Deprecated L1); SetupWizard.vue:217 (blank-scaffold template pins business V_0-1-0); FilePreviewModal.vue:181 (hardcoded UI string iNNfo V_0-1-0).

S2 — actioNN/skills/nn-trannsform (SKILL.md lines 191/197/323, scripts/provenance.js:20) still names iNNfo V_0-1-0 / hardcodes iNNfo_V_0-1-0_NN.md. URL still resolves (not a check:spec-urls failure) but provenance.js stamps the Deprecated L1 into every transformed doc. Same class as S1. File alongside 5.1 (already noted in task 4.5).

S3 — eNNvironment/docs/use/manifest.md pin bump — post-merge coordinated step needing this change merge sha (task 5.1 / A5). File the ticket at archive time.

S4 — Complete the per-file test-fixture audit table (W2) so the allow-list review is fully reproducible.

## Task-list reality check

  0.1-0.3 pre-flight gates [x] — OK. A1 confirmed (analysis_V_0-1-0 + business-model_V_0-1-0 branch-new; both carry spec_version V_0-2-0 + parent_spec.name iNNfo_V_0-2-0). Protected files carry only tooling work (W1).
  1.1 iNNfo_V_0-2-0 to Stable [x] — OK (git diff L9).
  1.2 iNNfo_V_0-1-0 to Deprecated [x] — DONE but contradicts delta spec R-SV-09; see C1.
  1.3-1.6 four new _V_0-2-0_ templates [x] — OK. diff --unified=0 vs _V_0-1-0_ sibling = FM (5 lines) + parent-chain/meta-template/sample-path re-points only. Body verbatim. cogNNitive_V_0-2-0 has exactly 6 residual V_0-1-0 (lines 108/148/309/311/318/319), all illustrative L3 model_ref/model_version/artifact_version values, copied verbatim, per allow-list row 15.
  1.7-1.8 two new samples [x] — OK. diff = exactly 3 lines each (parent_spec.name, parent_spec.url, model_version). Body verbatim.
  1.9 allow-list row 15 [x] — OK (present in proposal.md).
  1.10-1.11 URL + freeze checks [x] — OK. check:spec-urls (+--with-skills) green; no frozen _V_0-1-0_ template/sample modified.
  2.1-2.12 constants / map / URLs / version.ts + TDD [x] — OK. constants.ts both scalars to V_0-2-0; SHIPPED_TEMPLATE_VERSIONS = 9 slugs, every value equals max on-disk template_version; version.ts comment-only; 3 new unit tests 9/9 green; O5-amendment fixture re-points clean. 2.12 pre-existing baseline claim confirmed.
  3.1-3.5 docs + CHANGELOG [x] — OK. In-flight blockquote removed; specifications.md tables describe iNNfo_V_0-1-0 as Deprecated; CHANGELOG Unreleased extended, cogNNitive-deleted claim corrected. check:spec-urls green.
  4.1-4.4 actioNN sync [x] — OK. workspace_spec_NN.md byte-identical (md5 match); skill prose/URLs to V_0-2-0; skill own version field untouched.
  4.5 / 5.1 follow-ups [ ] — correctly left open; see S2 / S3.

## Test evidence

  innfo-core: npm --prefix packages/innfo-core test -> 230 / 230 pass. Matches baseline.
  innfo-mcp: npm --prefix packages/innfo-mcp test -> 130 / 130 pass. Matches baseline.
  innfo-editor: NODE_OPTIONS=--max-old-space-size=8192 npm --prefix apps/innfo-editor run test -- --pool=forks --poolOptions.forks.singleFork=true -> 7 failed / 522 passed / 2 skipped. Matches pre-existing baseline exactly.

Editor failures (all PRE-EXISTING, unrelated to version identity):
  tests/golden/roundtrip.models.golden.test.ts x4 — FORMAT_V_0-1-0_business_F.md, Ghostbusters_V_0-1-1_business_F.md, iNNv0_Innovation_Process_V_1-0-0_procedures_F.md, mini-file_V_0-0-1_business_F.md (legacy _F.md parse/serialize/re-parse structural equivalence).
  tests/unit/recursiveSerializer.test.ts x2 — writes through driver when provided; preserves node identity after round-trip.
  tests/golden/crlf-fidelity.golden.test.ts x1 — CRLF round-trip.

All 7 live in recursiveSerializer / legacy _F.md / CRLF territory. This change touches NO serializer, parser, fixture, or golden-snapshot code (changed .ts/.vue: constants.ts, samples.ts, version.ts, HomeView.vue, SetupWizard.vue, useWorkspaceScaffolding.ts, 2 test files). Apply phase already confirmed the identical 7-fail baseline via git stash (apply-progress-phase2.md task 2.12). Zero new failures.

recursiveParser.models.golden.test.ts.snap — git status clean, zero-line diff (design D4 prediction holds).

Pre-existing branch redness (OUT OF SCOPE — present at HEAD, confirmed):
  npm run lint -> 14 errors: packages/innfo-core/src/resolver.ts x11 (no-empty L86-203, no-require-imports L147-149), packages/innfo-mcp/src/tools/spec.ts x3 (no-empty L273/284/299). Neither file in this changeset.
  npm run typecheck -> 3 errors: apps/innfo-editor/src/components/editor/SearchResultsView.vue x2 (TS2339 activeModelRootId), src/model/recursiveSerializer.ts x1 (TS2353 widgetType). Neither file in this changeset.
  npm run format:check -> 266 unformatted files repo-wide.

Per proposal, --version V_0-1-0 --check can never exit 0 (frozen files); the gate is the allow-list review, which passes.

## Answers to the required questions

1. Do R-SV-09..R-SV-12, R-LSR-05 pass? R-SV-10, R-SV-11, R-SV-12, R-LSR-05 PASS. R-SV-09 FAILS on the superseded-file clause: iNNfo_V_0-1-0_NN.md status was changed to Deprecated, contradicting the requirement body and scenario 3 (see C1). Its adopted-spec dimensions (Stable, exists, in-vocabulary, not Active) pass.
2. Is the frozen-file allow-list complete? Yes. All 104 files from --version V_0-1-0 --by-type --with-skills map to an allow-list row (1-15) or are individually justified above. No uncovered current-default assertion. Minor unallow-listed matches (dist/*.d.ts, .atl/skill-registry.md) are generated/example text, not defects.
3. Are the 5 frozen _V_0-1-0_ templates + 6 frozen samples byte-unchanged? Yes. git status -- specs/templates/ lists only the 6 new _V_0-2-0_ files; no _V_0-1-0_ template or sample is modified.
4. Is the editor test suite at exactly the pre-existing baseline? Yes — 7 failed / 522 passed / 2 skipped, same files and counts as the documented baseline. No new failure.
5. Is workspace_spec_NN.md byte-identical across the two repos? Yes — identical, 196 lines, md5 4d3d96cf976ecb60eee16c572b571c3c.
6. Overall READY / NOT READY for the 4-PR chain? NOT READY. One blocking item: resolve C1 (the iNNfo_V_0-1-0 status edit vs delta spec R-SV-09) by either amending R-SV-09 + recording user sign-off on the design.md Open Question, or reverting specs/iNNfo_V_0-1-0_NN.md:9 to Draft. Everything else is ready; the fix is a 1-line change or a spec-text amendment, contained to PR 1 / slice A.
