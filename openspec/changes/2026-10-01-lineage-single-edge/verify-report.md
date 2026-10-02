# Verify Report: lineage-single-edge

- Change: `2026-10-01-lineage-single-edge`
- Branch: `session/lineage-single-edge` (worktree), HEAD at verify time `1d9bd09a`
- Mode: openspec, Strict TDD active
- Date: 2026-10-02
- Verdict: **PASS WITH WARNINGS** (0 CRITICAL, 7 WARNING, 3 SUGGESTION)

Note: `architectural-evolution-cognitivize.md` in the change folder was ignored (not part of the contract).

## Completeness

| Item | Result |
|---|---|
| Tasks in `tasks.md` | 54/54 checked, 0 unchecked (S1 1.1-1.12, S2 2.1-2.12, S3 3.1-3.12, S4 4.1-4.5, S5 5.1-5.4, S6 6.1-6.9) |
| Artifacts read | proposal, design, tasks, 9 delta specs (headings), exploration present |
| Apply-progress artifact | NOT present in the change folder (openspec mode; engram unavailable) - see W1 |

## Commands run (exact) and results

| Command | Result |
|---|---|
| `npm --workspace=@cognnitive/innfo-core run build` | PASS (exit 0; rebuilt dist before MCP tests) |
| `npm --workspace=@cognnitive/innfo-core test` | PASS - 95 files passed, 1 skipped; 1032 tests passed, 6 skipped |
| `npm --workspace=@cognnitive/innfo-mcp test` | PASS - 35 files, 315 tests |
| `npm --workspace=@cognnitive/innfo-editor test` | PASS - 105 files, 728 tests |
| `USERPROFILE=<empty temp> HOME=<empty temp> npm --prefix skills/nn-trannsform test` | PASS - 604 passed, 0 failed (integration PowerShell suites skipped by the runner by design) |
| `npm run typecheck` | PASS (exit 0) |
| `npm run typecheck:scripts` | PASS (exit 0) |
| `npm run lint` | PASS with warnings - 0 errors, 881 warnings (baseline not compared, see S2) |
| `node scripts/verify.js` | PASS - "All deterministic pre-checks passed" (71 suites incl. core-mirror and console-payload `--check`, legacy-ledger guard, `migrate-hash-citations.test.mjs`, validate-manifest tests) |
| `node scripts/lib/legacy-ledger-guard.js` | PASS - 9 ledger entries, 15 code markers |
| `npm run check:integrity` | FAIL (exit 1) at Group 1c Tag/Pin Freshness only - EXPECTED / DEFERRED, see W5 |

## Strict TDD compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence table reported | WARNING | No apply-progress artifact in the change folder; the TDD Cycle Evidence table cannot be validated (W1) |
| Test files exist for behavior tasks | PASS | Verified present: core `tests/parseCitation.test.ts`, `fsSourceResolver.test.ts`, `validateCitations.test.ts`, `tests/lineage/{project,render,fsSnapshot,validateWorkspace}.test.ts`; skill `tests/{core-mirror,provenance-knowledge,lineage-check,impact-checker,scanner-sidecar}.test.js` (shims over `test/unit/*`); `test/console-slug.test.mjs`; `scripts/migrate-hash-citations.test.mjs`; editor tests updated |
| GREEN confirmed | PASS | All suites above pass on execution |
| RED-first checkable | NOT VERIFIABLE | Commits bundle tests and code together (per the tasks convention), so red-first cannot be proven from history alone |
| Assertion quality scan | PASS (spot check) | No tautologies or ghost loops found in the new core lineage / parseCitation / validateCitations tests (the only loop is fixture setup at `fsSnapshot.test.ts:35`). Not an exhaustive audit of all ~108 changed files |
| Coverage tool | Skipped | Not run (no coverage command in the requested runner list) |

## Spec compliance (requirement level, mapped to passing suites)

Mapping is by capability to passing test suite; I did not individually trace every scenario to a named test case (W7).

| Spec | Evidence | Status |
|---|---|---|
| citation-parser-resolver | core parseCitation / fsSourceResolver / validateCitations / lineage validateWorkspace tests; MCP suite; no live `createWorkspaceSourceResolver`; the old parsers are only referenced in core `sourceRef*.spec.ts` (module-internal) | COMPLIANT |
| lineage-single-edge | `lineage/project.test.ts` (export-meta ignored, no model fallback, CSV/JSON sources, terminal artifact); skill tests | COMPLIANT |
| lineage-record-sync | `lineage/render.test.ts`, skill `provenance-knowledge` tests; the seven scrapers are absent (only an unrelated `collectModels` remains in core `helpers.ts`) | COMPLIANT |
| nn-trannsform-lineage-checks | skill `lineage-check` and `impact-checker` tests (including the `@`/CSV regression) | COMPLIANT |
| source-sidecar | skill `scanner-sidecar` tests (no `is_synthetic`, curated CSV sidecar, feedback `source_type`) | COMPLIANT |
| console-field-citations | core payload tests (`meta.sources`), `test/console-slug.test.mjs`, console-payload `--check` in verify.js; `innfo-slug.generated.js` present and `innfo-runtime.js` delegates to `InnfoSlug` | COMPLIANT (see W4 for sample consoles) |
| document-citations | core citation/validator tests (`models/` rejected, line-range rejected) | COMPLIANT |
| editor-lineage-ui | editor suite (105 files); no live `parseForPill`; `FilePreviewModal.vue` has no Spanish labels | COMPLIANT |
| lineage-bluepriNNts-docs | bluepriNNt tests and sync-versions / catalog / registry gates in verify.js; the two rewritten pages contain no OKF, `sources/original/`, or canonical-view wording | COMPLIANT |

## Design coherence

D1-D15 are reflected in the code: single `parseCitation`, merged resolver in core, `validateCitations`, `src/lineage/*`, core mirror (`innfo-core.generated.cjs`, `--check` green), file-level `meta.sources` (D7), `InnfoSlug` IIFE (D8), artifacts catalog kept (D9), migrator plus ledger (D13). No design deviation found that breaks a spec.

## Success criteria checklist (proposal.md)

- [x] `provenance-knowledge.js` contains no scrapers; sections come from the core projection via the mirror
- [~] One citation parser and one resolver exist; no `createWorkspaceSourceResolver` / `parseForPill`. PARTIAL: a second `slugify` implementation still exists outside core (W3)
- [x] `lineage-check.js` reports no errors for canonical `@` and CSV citations (regression test passes)
- [x] cogNNitive validator: no dangling-reference false positives on `ModelRecords.derived_from` (task 6.1 test passes)
- [~] Every console in a sample workspace has non-empty upstream lineage. PARTIAL: the payload builder emits `meta.sources` and is tested, but the committed sample consoles carry no `sources` yet (W4)
- [~] No code reads `export-meta`, `is_synthetic`, an `artifacts/` folder fallback, or the model fallback. Code: met. Stragglers in docs/fixtures (W2)
- [x] Editor shows `export/` as artifact; no Spanish UI strings in `FilePreviewModal.vue`
- [x] Docs describe the `@` grammar and three rules; no OKF / `sources/original/` in the two rewritten pages
- [~] `node scripts/verify.js` PASS; legacy-ledger guard PASS; `npm run check:integrity` FAIL on release-coupled Group 1c only (expected/deferred, W5)

## Issues

### CRITICAL
None.

### WARNING
- W1. No apply-progress / TDD Cycle Evidence artifact exists in `openspec/changes/2026-10-01-lineage-single-edge/`. Strict TDD evidence (red-first) cannot be validated from artifacts; only the final green state is proven.
- W2. Leftover `is_synthetic` / `sources/original/` mentions: `skills/nn-trannsform/SKILL.md:72` and `:335` still document `is_synthetic: true`, and `:70` still says legacy `sources/original/` is supported via fallback. Task 6.8 said to update SKILL.md. (The `skills/nn-preflight/scripts/preflight-check.test.js:646` fixture and frozen `docs/innfo/samples/**` mentions are acceptable.)
- W3. Second `slugify` implementation outside core: `iNNfo/apps/innfo-editor/src/utils/submodelPath.ts:21` (differs from core: `_` becomes `-`). Pre-existing and used for submodel paths, but the success criterion says no second `slugify` outside core. Also local slug helpers in `skills/nn-trannsform/scripts/lib/conversations.js:160` and `skills/nn-trannsform/scripts/index.js:558` (conversation naming and delete matching; different purpose). Decide explicitly whether these are in or out of scope.
- W4. Committed sample consoles (`iNNfo/specs/bluepriNNts/procedures/{procedures,samples}/export/**/*.html`) carry no `innfo-model.meta.sources`; they need a re-export for the non-empty upstream lineage criterion. The design acknowledges this, but the criterion is not demonstrably met on shipped samples.
- W5. `npm run check:integrity` exits 1 at Group 1c (skills/ and bluepriNNt `spec_NN.md` changed without a `manifest/source.yaml` re-pin). This is the documented, out-of-scope release coupling (S4/S6 edit bluepriNNts in place). Because the gate aborts at the first failing group, later integrity groups were NOT evaluated. Re-run after the release/repin.
- W6. Running the skill test suite writes an untracked `skills/nn-trannsform/config.json` (`test/unit/test-config.js:10`), which is not gitignored and dirties the tree (flagged by check:integrity Group 0). Removed after the run; not part of this change, but it leaks.
- W7. Spec compliance was mapped at requirement/suite level, not via per-scenario tracing; coverage was not measured.

### SUGGESTION
- S1. Other docs still mention OKF / `sources/original/` (`docs/innfo/documentation/ecosystem.md`, `documentation_NN.md`, `ai-index.yaml`, `docs/skills/documentation/skills/{nn-trannsform,interaction-flows}.md`). Outside the two pages in scope; consider a follow-up docs sweep.
- S2. Lint reports 881 warnings (0 errors); compare against the `main` baseline to confirm this change did not add warnings.
- S3. Add `skills/nn-trannsform/config.json` to `.gitignore` or make `test-config.js` use a temp path.

## Next recommended
`sdd-apply` for a small remediation pass (W2, W3 decision, W4 re-export, W6) if the maintainer wants every success criterion fully met; otherwise `sdd-archive` is viable once the maintainer accepts W1-W7 and the release coupling (W5) is handled at release time. No CRITICAL blockers.

## Post-verify fixes

Small remediation pass on the same session branch. Re-run after the fixes: innfo-core (1032 passed), innfo-editor (726 passed), nn-trannsform with empty USERPROFILE/HOME (604 passed), `npm run typecheck`, `node scripts/verify.js` (PASS).

| Warning | Outcome |
|---|---|
| W2 | FIXED for `is_synthetic`: `skills/nn-trannsform/SKILL.md` (export/ tree line and `_synthetic.md` bullet) now say a promoted file carries its own `sources:` and that no `is_synthetic` flag is stored. The `sources/original/` mentions (lines 70, 93, 109, 124-126, 201-210, 342) were intentionally LEFT: `scanner.js`, `scanner-core.js#walkSourceTrees` and `index.js` still read `sources/original/` as an ingestion fallback, so the docs match the code. Only the lineage projection dropped it. Skill version not bumped. |
| W3 | FIXED for the editor: `submodelPath.ts` no longer defines `slugify`; it and `FieldKnowledge.vue` import core `slugify`, now exported from the `innfo-core` browser entry (`browser.ts`). Red-first test `tests/unit/submodelPath.slug-source.test.ts` (failed before: no browser export, local copy present); the old local-slugify cases were removed from `submodelPath.test.ts` (core owns that contract). Behaviour is equivalent for strings (core adds a `.trim()` first; null/undefined are no longer tolerated, and no caller passes them). LEFT by design: `conversations.js:160` and `index.js:558` slugify conversation titles and match filename stems when deleting conversation files; they do not produce citation heading slugs, so the mirror's heading slug primitive would be the wrong contract. |
| W4 | DEFERRED. `scripts/export-console.mjs` does a direct model scan and never calls `buildConsolePayload`, so a re-export does not emit `innfo-model.meta.sources` at all. A trial export into a scratch dir also rewrote `innfo-console.bundle.js` (differs from the committed vendored bundle; export prefers `INNFO_CONSOLE_DIR` / `~/.agents/console` over the repo console dir), which is release-coupled churn. The Ghostbusters sample also has no `sources` to cite. Follow-up: make `export-console.mjs` use the core payload builder, then regenerate samples together with the console bundle at release time. Nothing committed for W4. |
| W6 | FIXED: `test/unit/test-config.js` writes `skills/nn-trannsform/config.json` as an untracked byproduct; added to the root `.gitignore`. |

W1, W5 and W7 are unchanged (W5 remains deferred to release). Success criteria: "no second slugify outside core" is now met for the editor; the sample-console criterion stays PARTIAL (W4).
