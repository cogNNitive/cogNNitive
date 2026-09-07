# Verify Report: Template Pin ↔ Main Coherence Gate

## Verification Report

**Change**: 2026-09-07-template-pin-main-coherence-gate
**Version**: N/A (delta spec `specs/monorepo-release-manifest.md` — main spec merge deferred to sdd-archive)
**Mode**: Strict TDD (`openspec/config.yaml` → `strict_tdd: true`; scripts runner `node scripts/manifest/validate-manifest.test.js` + aggregate gate `node scripts/verify.js`)
**Branch**: `feat/template-pin-main-coherence-gate`
**Date**: 2026-09-07

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 20 |
| Tasks complete | 20 |
| Tasks incomplete | 0 |

All 20 tasks in `tasks.md` are marked `[x]` (Phase 1: 1.1–1.8 TDD-red, Phase 2: 2.1–2.6 implementation, Phase 3: 3.1–3.2 wiring, Phase 4: 4.1–4.4 global verification). No unchecked implementation task → no CRITICAL blocker from task completion.

### Build & Tests Execution

**Aggregate gate**: ✅ Passed
```text
node scripts/verify.js
✅ Template Inventory Guard: all 11 template folders are registered in manifest.
▶ Line-Count Guard: scripts/manifest/validate-manifest.js (179 lines < 200).
✅ [check-parity] All 8 skills, 10 templates, and 1 mcp bundles in sync.
▶ Typecheck Scripts (tsc --noEmit -p tsconfig.scripts.json)...          (clean, no errors)
OK: [stable] 8 skills, 10 templates, and 1 mcp bundles validated        (coherence gate ran against real GitHub: main == templates-v0.2.3 → 0 violations)
OK: docs/use/manifest.md is up to date
✅ [cogNNitive Verify] All deterministic pre-checks passed.
```
Note: the `stable` validation above exercised `checkTemplateMainCoherence` over the live network for all 10 active stable templates (pin fetch + main fetch each) and produced zero coherence violations — real-network green condition confirmed.

**Tests**: ✅ 25/25 passed
```text
node scripts/manifest/validate-manifest.test.js
✔ (18 pre-existing assertions: legacy compat, structural, resolveRef, provenance, mcp-url-pinned, CLI, auth header, ...)
✔ template main coherence (identical) test passed            [case 16]
✔ template main coherence (main-ahead drift) test passed     [case 17]
✔ template main coherence (tag-ahead drift) test passed      [case 18]
✔ template main coherence (rate limit) test passed           [case 19]
✔ template main coherence (CRLF/BOM normalization) passed    [case 20]
✔ template main coherence (preview not evaluated) passed     [case 21]
✔ template main coherence (stable wiring) test passed        [case 22]
All validate-manifest unit tests passed successfully!
```
Exit code 0. 18 pre-existing cases still green (safety net intact) + 7 new coherence cases green.

**Coverage**: ➖ Not available — no coverage runner exists for the `scripts/` area (config coverage command is iNNfo-scoped; this change must not run `npm test` there). Informational, not a failure.

**Diff scope (vs HEAD `cc7f4a5`)**: ✅ Confirmed limited to the 3 intended files
```text
scripts/manifest/lib/manifest-rules.js     |  67 ++++++++   (normalizeTemplateText, coherenceFetchViolation, checkTemplateMainCoherence, gate line, export)
scripts/manifest/validate-manifest.js      |   2 ++        (re-export checkTemplateMainCoherence)
scripts/manifest/validate-manifest.test.js | 213 ++++++++++  (cases 16–22)
?? openspec/changes/2026-09-07-template-pin-main-coherence-gate/   (untracked change folder)
```
Untouched (verified via `git status --short` / `git diff --name-only HEAD`): `generate-manifest.js`, `iNNfo/scripts/check-spec-version.mjs`, `scripts/verify.js`, `scripts/lib/github-client.js`, `openspec/specs/monorepo-release-manifest/spec.md` (main spec untouched until archive), all frontmatter URLs, skills/MCP. `git status` clean apart from the files above.
Changed-line total: 282 insertions, 0 deletions — above the ~150–200 forecast but far below the 400-line review budget (single-pr strategy confirmed safe).

### Spec Compliance Matrix
Delta spec: `specs/monorepo-release-manifest.md` — Requirement "Stable Template Main Coherence" (1 requirement, 5 scenarios).

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| R1 Stable Template Main Coherence — stable content at pinned commit coherent with `main` at same path (empty diff after CRLF→LF + BOM strip) | Identical pinned and main content | `validate-manifest.test.js` case 16 | ✅ COMPLIANT |
| R1 | main ahead of the pinned commit (drift) | case 17 | ✅ COMPLIANT |
| R1 | tag released without being merged to main (drift, reverse fixture) | case 18 | ✅ COMPLIANT |
| R1 | rate limit during comparison → violation with `RATE_LIMIT_HINT`, no crash | case 19 | ✅ COMPLIANT |
| R1 | coherence not evaluated on preview | case 21 | ✅ COMPLIANT |
| R2 Violation names `path`, pinned commit, and both revisions | asserted by drift scenarios | cases 17 + 18 assert `path`, `commit`, `main`, `repo` in message | ✅ COMPLIANT |
| R3 Stable-only via `requireProvenance`; preview never evaluated | channel gating | cases 21 (preview skipped — no `/main/` fetch) + 22 (stable wiring, both raw URLs fetched) | ✅ COMPLIANT |
| R4 Reuse existing GitHub auth (`authHeaders`, `GITHUB_TOKEN`) | auth plumbing | case 4 (bearer on `fetchString`) + static: rule calls `fetchString` which merges `authHeaders()` (`github-client.js:73`); case 19 exercises real `fetchString` error path | ✅ COMPLIANT |
| R5 Rate-limit failure → `RATE_LIMIT_HINT`, MUST NOT crash | fail closed | case 19 (1 violation, `assert.match(... /set GITHUB_TOKEN to raise the rate limit/)`, no throw) | ✅ COMPLIANT |
| R6 No frontmatter URL rewritten (`spec_url`, `parent_spec.url`, `includes[].url`) | non-mutation | Static: gate is read-only (fetch + compare only, zero write paths); diff scope shows no frontmatter/skills/MCP file touched | ✅ COMPLIANT |

**Compliance summary**: 5/5 scenarios compliant (plus R2–R6 requirement prose verified). CRLF/BOM normalization risk-mitigation → case 20 ✅ (empty normalized diff between `\uFEFF`+CRLF body and bare-LF body).

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| `normalizeTemplateText` BOM strip + CRLF→LF | ✅ Implemented | `manifest-rules.js:222–224`, private (not exported — per D3/design contract) |
| `checkTemplateMainCoherence` two-fetch compare, never throws | ✅ Implemented | `manifest-rules.js:247–274`; per-fetch `try/catch`, violations array, drift/fetch messages match design contract verbatim |
| Rate-limit detection | ✅ Implemented | `coherenceFetchViolation` (`:234–238`) matches `/status:\s*(403|429)/` on `err.message`; real `fetchString` rejects with `Error("Failed to fetch <url>, status: <code>")` (`github-client.js:80`) → regex fires on real errors; `RATE_LIMIT_HINT` text verified |
| Gate line in `validateTemplate` under `requireProvenance` | ✅ Implemented | `manifest-rules.js:414–416`, appended after the version-parity block (end of validator) |
| Export + re-export | ✅ Implemented | `module.exports` (`:527`) + `validate-manifest.js:43/164`; line count 179 < 200 guard |
| JSDoc `@param`/`@returns` on new functions | ✅ Implemented | All new functions annotated; `tsc --noEmit -p tsconfig.scripts.json` (checkJs) clean |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 Gate inside `validateTemplate` under `if (policy.requireProvenance)`, not in `validateManifest` loop | ✅ Yes | Code `manifest-rules.js:414–416`; `validateManifest` remains a pure aggregator; tests 21/22 prove preview-skip + stable-run |
| D2 Drift message direction-agnostic (names path, pinned commit, main, repo) | ✅ Yes | Message `:269` — `content at <path> differs between pinned commit <commit> and main in <repo>`; cases 17/18 assert same shape across both drift directions |
| D3 Normalized text equality, no diff lib | ✅ Yes | `normalizeTemplateText(...) !== normalizeTemplateText(...)` at `:267`; case 20 (CRLF/BOM) green |
| D4 Fail closed — errors → violations, never throw | ✅ Yes | Both fetches individually wrapped (`:252–264`); case 19 proves 403 → violation + no crash |
| D5 `scripts/verify.js` NOT modified (deviation from proposal's affected-modules row, ratified in design) | ✅ Yes | Not in `git diff`; gate reaches aggregate verify via existing step 5 (`validate-manifest.js --channel stable`) — confirmed in verify.js run |
| D6 Tests extend `validate-manifest.test.js` reusing `stubHttpsGetSequence`/`freshValidatorModule` | ✅ Yes | Cases 16–22 in `validate-manifest.test.js:459–670`, same helpers as pre-existing cases; rule exercised via `validate-manifest.js` re-export |

Design deviation from proposal (not from design): proposal listed `scripts/verify.js` as Modified; design D5 explicitly deviates and implementation follows design — documented deviation, no spec breakage.

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ⚠️ | Reported upstream by apply (per orchestrator: 20/20 + TDD Cycle Evidence table); NOT persisted in the change root — no apply-progress artifact exists on disk (`changeRoot` contains only proposal/specs/design/tasks) |
| All tasks have tests | ✅ | 7/7 implementation tasks (Phases 2–3) covered by new cases 16–22 |
| RED confirmed (tests exist) | ✅ | Cases 16–22 present in `validate-manifest.test.js`; tasks.md Phase 1 is a test-first phase with task 1.8 `[x]` = "assert the new cases FAIL (rule not yet implemented)" |
| GREEN confirmed (tests pass) | ✅ | 25/25 pass on execution (7/7 new cases) |
| Triangulation adequate | ✅ | 7 distinct cases for 5 spec scenarios + CRLF/BOM mitigation + wiring proof; drift asserted in both directions (17/18) with divergent expected values |
| Safety Net for modified files | ✅ | `validate-manifest.test.js` is a modified (not new) file; all 18 pre-existing cases re-ran green in the same suite run |

**TDD Compliance**: 5/6 checks passed (1 ⚠️ — evidence-table persistence gap, see WARNING-1)

Temporal RED-before-GREEN ordering is corroborated indirectly (task structure + `[x]` on 1.8 + suite behavior) but not independently provable from repo state: the test file and the implementation are uncommitted in the same working set, with no intermediate RED commit or on-disk cycle log separating them.

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 25 (7 new) | 1 | `node:assert` self-running suite + stubbed `https.get` |
| Integration | 0 | 0 | not applicable (no iNNfo touch) |
| E2E | 0 | 0 | not applicable |
| **Total** | **25** | **1** | |

All coherence tests are unit-level, consistent with repo convention for orchestrator scripts. No flag: integration/E2E tooling exists only in the untouched iNNfo workspace.

### Changed File Coverage
Coverage analysis skipped — no coverage tool detected for the `scripts/` area (repo coverage command `npm --prefix iNNfo run test:coverage` is iNNfo-scoped and out of scope for this change).

### Assertion Quality
| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|
| — | — | — | none found | — |

**Assertion quality**: ✅ All assertions verify real behavior
- Empty-result assertions (`[]` in cases 16/20/21/22) all have non-empty companion tests (17/18/19 assert exactly 1 violation) — no orphan empty checks.
- No tautologies, no ghost loops, no smoke-only tests, no type-only assertions.
- Cases 17/18/19 assert on violation *content* (path/commit/main/repo/RATE_LIMIT_HINT), not just length.
- Case 16 additionally asserts fetch order (pin → main), an implementation-detail assertion but one that pins the documented data-flow contract; acceptable.
- Mock ratio healthy: 1 stub setup per case vs ≥2 behavioral assertions each.

### Quality Metrics
**Linter**: ➖ Not available for `scripts/` (repo linter is iNNfo-scoped, untouched)
**Type Checker**: ✅ No errors — `tsc --noEmit -p tsconfig.scripts.json` (checkJs) ran clean inside `node scripts/verify.js`
**Formatter**: ➖ Informational per `openspec/config.yaml` (format check not wired into CI; not reported)

### Issues Found

**CRITICAL**: None

**WARNING**:
1. **TDD cycle evidence not persisted in the change root** — `strict_tdd: true` but no apply-progress artifact (with its TDD Cycle Evidence table) exists on disk under `openspec/changes/2026-09-07-template-pin-main-coherence-gate/`; the table exists only in the apply report held by the orchestrator. RED-before-GREEN ordering therefore cannot be re-verified independently from repo artifacts (tests + implementation are uncommitted together; no intermediate RED commit). Corroborating evidence is strong (test-first task phase with `[x]` 1.8, 7/7 new tests existing and passing, 18/18 legacy safety-net cases green), so this is an audit-trail gap, not an implementation gap. Recommend the orchestrator persist the apply TDD evidence (Engram `sdd/{change}/apply-progress` or an apply-progress file) before archive for a complete audit trail.

**SUGGESTION**:
1. **Plain fetch-failure branch not directly covered** (the issue apply flagged): `coherenceFetchViolation`'s non-rate-limit path — `could not fetch <path> at <commit|main> (<message>)` without `RATE_LIMIT_HINT` — is never exercised. Case 19 covers the 403/rate-limit branch of the same helper, and the spec has no scenario requiring a plain 404/500 fetch failure, so this is not a compliance gap. A cheap case (stub one fetch as 404/500, assert the hint-free violation + no crash) would close the branch.
2. **Changed lines above forecast** (informational): 282 insertions vs the ~150–200 tasks.md forecast; still far under the 400-line review budget with delivery strategy single-pr — no action required.

### Verdict
**PASS WITH WARNINGS**
Implementation is complete and proven: 20/20 tasks done, 25/25 tests green (7/7 new coherence cases), aggregate `verify.js` gate green including typecheck and a real-network stable validation with zero coherence violations, spec 5/5 scenarios compliant, design D1–D6 all followed, and diff scope confined to the 3 intended files with all protected seams untouched. The single WARNING is a TDD evidence-persistence gap in the change folder, not a code or test deficiency.
