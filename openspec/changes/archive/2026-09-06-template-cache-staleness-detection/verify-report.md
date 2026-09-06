# Verify Report — 2026-09-06-template-cache-staleness-detection

Phase: sdd-verify
Date: 2026-09-06
Verdict: **PASS WITH WARNINGS**
Mode: Strict TDD (per `openspec/config.yaml`, `strict_tdd: true`)
Branch: main (commit `fa74d3e`, PR #50)

## Scope Verified

- **A — innfo-mcp staleness detection**: opt-in `checkFreshness` on `resolveParentChainNode` (default OFF, R-LSR-01 preserved byte-for-byte), content-hash (sha256) freshness verdict `fresh | stale | unknown`, `[TEMPLATE_CACHE_STALE]` warning from `validateModel` (default ON, never downgrades `valid`).
- **B — versioned template immutability guard**: `scripts/guard-template-immutability.js` (`M` → error with bump-and-rename remediation, `A` → `template_version` vs filename cross-check), wired into `scripts/verify.js` steps 7–9.
- **C — nn-preflight workspace freshness**: `--workspace-dir` opt-in scan (`spec_url`/`parent_spec.url`, Node native fetch, sha256 compare, stale → exit 1 + ACTION_REQUIRED, offline → warning only), no-flag behavior unchanged.

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 24 |
| Tasks complete | 20 |
| Tasks incomplete | 4 (commit tasks 1.4, 2.6, 3.4, 4.4 — fulfilled by PR #50 landing on `main`; checkboxes not updated) |

All implementation tasks (1.1–1.3, 2.1–2.5, 3.1–3.3, 4.1–4.3, 5.1–5.6) are checked. The 4 unchecked tasks are commit tasks whose purpose (landing the change) was achieved by PR #50.

## Automated Verification Results (Gates)

| # | Gate | Result |
|---|------|--------|
| 1 | `npm --prefix iNNfo run test` | ✅ PASS — **602 passed / 2 skipped** (604 total), **86 files passed / 1 file skipped** (87), exit 0, 15.15s |
| 2 | `npm --prefix iNNfo run typecheck` | ✅ PASS — exit 0 (innfo-core build + `vue-tsc --noEmit`) |
| 3 | `node scripts/guard-template-immutability.test.js` | ✅ PASS — **7/7** checks, exit 0 |
| 4 | `node actioNN/skills/nn-preflight/scripts/preflight-check.test.js` | ✅ PASS — **8/8** checks, exit 0 |
| 5 | `node scripts/verify.js` | ✅ PASS — all 9 steps green (steps 7–9: guard test, guard vs real git, preflight test), exit 0 |

```text
# Gate 1 tail
 Test Files  86 passed | 1 skipped (87)
      Tests  602 passed | 2 skipped (604)
# Gate 5 tail
✅ [cogNNitive Verify] All deterministic pre-checks passed.
```

## Spec Compliance Matrix

Spec IDs map to requirement order in `specs/template-cache-staleness-detection/spec.md` (A1–A4, C1–C4) and `specs/template-immutability-guard/spec.md` (B1–B6).

| Requirement | Scenario | Evidence (code) | Covering test | Result |
|-------------|----------|-----------------|---------------|--------|
| A1 — Freshness check is opt-in | Freshness disabled: local cache resolves without fetch or warning | `resolver-node.ts:22-26` (`ResolverOptionsWithFreshness`), `:557` (default `{}`), `:646-657` (guard: `checkFreshness === true`), `:675` (map attached only when ON); `spec.ts:269,278`; `validate.ts:266,272` (default `true` at validateModel) | `resolver-node.spec.ts:30-59, 61-88, 217-238` (R-LSR-01: fetch NOT called, default options); `freshness-warning.test.ts:96-105` (explicit `{ checkFreshness: false }` → no fetch) | ✅ COMPLIANT |
| A2 — Local resolutions content-hash compared to remote | Local copy diverged from remote | `resolver-node.ts:103-105` (`sha256`), `:113-124` (`freshnessVerdict`), `:646-657` (depth-0 + local-tier + http(s) only) | `resolver-node.spec.ts:471-488` (differing remote → `stale`, fetch once), `:490-504` (equal → `fresh`) | ✅ COMPLIANT |
| A3 — Freshness check non-fatal and offline-tolerant | Offline fetch fails during validation | `resolver-node.ts:121-123` (throw → `unknown`, resolution continues); read-only (no `saveSpecOnce`) | `resolver-node.spec.ts:506-517` (`unknown` + resolution succeeds); `freshness-warning.test.ts:87-94` (fetch reject → no warning, `valid` true) | ✅ COMPLIANT |
| A4 — validateModel surfaces TEMPLATE_CACHE_STALE warning | Stale template still validates | `validate.ts:403-409` (warning push: severity `warning`, path `parent_spec`, URL + remediation; `valid` untouched — flipped only by errors at `:385-389,441-443`) | `freshness-warning.test.ts:55-74` (warning emitted, severity/path/message/filePath asserted, `valid` true), `:76-85` (fresh → no warning) | ✅ COMPLIANT |
| C1 — preflight accepts --workspace-dir | No flag: global-env audit unchanged | `preflight-check.js:458` (`getArg`), `:220,270-276` (scan only when `workspaceDir` present) | `preflight-check.test.js:386-429` (test 8: no flag → exit 0, `specsStale/Fresh/Offline` = 0) | ✅ COMPLIANT |
| C2 — Workspace scan reports stale specs as ACTION_REQUIRED | Stale spec blocks preflight / All-fresh workspace passes | `preflight-check.js:164-211` (scan: `spec_url ?? parent_spec.url`, sha256), `:294-297` (manifest-offline early return folds staleness → exit 1), `:391-395` (exit logic), `:408-417,432` (report section + pending list) | `preflight-check.test.js:251-295` (test 5: stale → exit 1, ACTION_REQUIRED, `specsStale` 1, item carries path + URL); `:297-341` (test 6: all-fresh → exit 0, `specsFresh` 1) | ✅ COMPLIANT |
| C3 — Unresolvable/unreachable remotes are non-blocking | Spec without canonical URL skipped | `preflight-check.js:186-187` (no URL → `continue`) | `preflight-check.test.js:343-384` (test 7: skipped silently, zero items) | ✅ COMPLIANT |
| C3 — Unresolvable/unreachable remotes are non-blocking | Remote unreachable: warning | `preflight-check.js:193-199` (fetch throw → `offline` status), `:201-203` (offline count), exit code never flips on `offline` (`:391` reads `specsStale` only) | (none found) | ⚠️ UNTESTED — static evidence only; design Testing Strategy promised a "Remote unreachable warning" test that was not delivered |
| C4 — Staleness scan uses Node native fetch | In-process fetch | `preflight-check.js:127-137` (`fetchWithTimeout`: global `fetch` + AbortController; no `curl`/`Invoke-WebRequest`) | `preflight-check.test.js` tests 5/6 exercise the fetch path end-to-end against a local http server (would fail without it) | ✅ COMPLIANT |
| B1 — In-place modification of versioned templates is an error | Modified versioned template fails the guard | `guard-template-immutability.js:101-105` (`M` → error + bump-and-rename remediation) | `guard-template-immutability.test.js:46-62` (test 1: exit 1, names file, remediation text) | ✅ COMPLIANT |
| B2 — Added templates must declare a matching template_version | Mismatch fails / Match passes | `guard-template-immutability.js:108-129` (`A` → frontmatter `template_version` vs filename version via `yaml-lite`) | `guard-template-immutability.test.js:64-78` (test 2: mismatch → exit 1), `:80-92` (test 3: match → exit 0) | ✅ COMPLIANT |
| B3 — Renames are not treated as errors | Renamed versioned template passes | `guard-template-immutability.js:65-71` (rename → new path = last token), only `M`/`A` handled (`R`/`D` pass) | `guard-template-immutability.test.js:94-102` (test 4: `R100` → exit 0), `:104-112` (test 5: `D` → exit 0) | ✅ COMPLIANT |
| B4 — Guard is runnable without a real git repository | Fixture-driven run without git | `guard-template-immutability.js:82-84,91` (`--diff-file`; default `git diff --name-status HEAD -- <root>`) | all guard tests use `--diff-file` fixtures (tests 1–7) | ✅ COMPLIANT |
| B5 — Guard exit codes | Clean diff exits zero / violations exit 1 | `guard-template-immutability.js:132-138` (exit 0/1) | `guard-template-immutability.test.js` tests 1–3 (exit 1), 3/6 (exit 0), 7 (samples/ M not flagged) | ✅ COMPLIANT |
| B6 — verify.js includes the immutability guard | verify runs the guard | `verify.js:118-125` (steps 7–9 appended after step 6; existing 1–6 numbering untouched) | `node scripts/verify.js` run green — steps 7–9 executed (guard test, guard vs real git, preflight test) | ✅ COMPLIANT |

**Compliance summary**: 13/14 scenarios compliant at runtime, 1 scenario untested (C3 — remote-unreachable/offline branch, static evidence only).

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| A1 opt-in (resolver OFF default) | ✅ Implemented | R-LSR-01 tests byte-untouched: 0 `R-LSR` lines in `git show fa74d3e` diff of `resolver-node.spec.ts`; only additive `checkFreshness: true` lines |
| A2 content-hash comparison (never `spec_version`) | ✅ Implemented | `sha256` over UTF-8 both sides (`resolver-node.ts:103-105,113-124`) |
| A3 offline-tolerant | ✅ Implemented | any throw → `unknown`; freshness fetch read-only |
| A4 warning severity/path/remediation | ✅ Implemented | `validate.ts:403-409` — `[TEMPLATE_CACHE_STALE]`, severity `warning`, path `parent_spec` (D8-decorated to template file), URL + "Delete/replace the local copy under specs/" hint |
| B1–B6 guard | ✅ Implemented | zero-dep CJS, `yaml-lite` reuse (`guard-template-immutability.js:30`), `--diff-file`/`--root`/`--staged` |
| C1–C4 preflight | ✅ Implemented | scan after Node check before manifest fetch; early-return fold; `summary.specsStale/Fresh/Offline`; native fetch |
| No innfo-core change | ✅ Confirmed | `git show --stat fa74d3e` lists no `innfo-core` files |
| `validate-workspace-schema-cache.test.ts` hermetic | ✅ Confirmed | both `validateModel` calls pass `{ checkFreshness: false }` (`:143-155`) |

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 — freshness on the cache (intersection type, no core change) | ✅ Yes | `resolver-node.ts:28` `ResolvedCache = SpecCache & { freshness? }`; `:674-676`; no innfo-core edit |
| D2 — freshness mechanics (depth-0 + local-tier + http(s), `download()` + sha256, throw → unknown, read-only) | ✅ Yes | `resolver-node.ts:91-101,113-124,646-657`; `resolvedFromLocalTier` set only in step 1 (`:596`) |
| D3 — validateModel default ON, warning before D8 decoration, `valid` untouched | ✅ Yes | `validate.ts:272,403-409` (placed after `!template` block, before decoration at `:411`) |
| D4 — verify.js steps 7–9 appended; guard API (`--diff-file`/`--root`/`--staged`); yaml-lite reuse | ✅ Yes | `verify.js:118-125`; `guard-template-immutability.js:86-91,30` |
| D5 — preflight scan placement + early-return fold + summary fields + report section | ✅ Yes | `preflight-check.js:267-276,294-297,246-248,408-417` |

## TDD Compliance (Strict TDD)

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported (apply-progress) | ⚠️ N/A | No `apply-progress` artifact exists — change landed via parallel developer activity (PR #50), not the sdd-apply flow. All substantive RED/GREEN claims independently re-derived below |
| All tasks have tests | ✅ 20/20 implementation tasks | RED tasks' test files all exist on disk |
| RED confirmed (tests exist) | ✅ 5/5 test files | `resolver-node.spec.ts` (freshness block), `freshness-warning.test.ts`, `validate-workspace-schema-cache.test.ts`, `guard-template-immutability.test.js`, `preflight-check.test.js` |
| GREEN confirmed (tests pass) | ✅ 100% | All suites executed green in Gates 1/3/4 |
| Triangulation adequate | ✅ | A2: 2 cases (stale/fresh); A3: 2 cases (resolver + validator); B2: 2 cases (match/mismatch); C2: 2 cases (stale/fresh) |
| Safety net for modified files | ✅ | R-LSR-01/02/03/04 tests untouched (0 diff hits); existing preflight tests untouched |

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 37 (6 freshness + 4 warning + 4 cache-hermetic + 7 guard + 16 pre-existing freshness-area) | 4 | Vitest + plain node |
| Integration | 8 (preflight spawn + local http server) | 1 | Node (plain) |
| E2E | 1 (guard against real git state) | 1 | `verify.js` step 8 |
| **Total (change-specific)** | **~28 new** | **5** | |

## Changed File Coverage (informational)

innfo-mcp coverage run (`npm --prefix iNNfo/packages/innfo-mcp run test:coverage`): **178 tests pass**; changed files:

| File | Lines % | Branches % | Rating |
|------|---------|-----------|--------|
| `src/tools/resolver-node.ts` | 87.85 | 84.14 | ⚠️ Acceptable |
| `src/tools/spec.ts` | 81.02 | 66.88 | ⚠️ Acceptable |
| `src/tools/validate.ts` | 93.78 | 81.46 | ✅ Excellent |

**Aggregate**: package-wide ratchet thresholds not met (lines 86.63 < 90, branches 77.3 < 85, functions 88.99 < 95). Pre-existing drift — thresholds were set in commit `67f8753` (2026-08-07 baseline) and `fa74d3e` does not touch `vitest.config.ts`; coverage is not a gate in tasks 5.1–5.6 or `verify.js`.

## Quality Metrics

**Linter**: ✅ No errors — repo-wide `npm --prefix iNNfo run lint` exit 0 (480 pre-existing warnings, 0 errors); scoped eslint on the 6 changed innfo-mcp files: **0 problems**.
**Type Checker**: ✅ No errors — Gate 2 exit 0.
**Formatter**: ➖ Not evaluated (informational per config; change introduces no prettier drift — no format-relevant edits beyond code style consistent with surrounding files).

## Assertion Quality

✅ All assertions verify real behavior — exit codes, freshness verdicts, warning severity/path/message content, `valid` flags, fetch-call-counts (mapped directly to spec requirements R-LSR-01/A2/C2, not implementation noise). No tautologies, no ghost loops, no smoke-only tests, no orphan empty-checks.

## Issues Found

**CRITICAL**: None.

**WARNING**:
1. **C3 "Remote unreachable: warning" scenario has no runtime test.** Design Testing Strategy (`design.md` testing table) promised a "Remote unreachable warning" integration test; `preflight-check.test.js` (8 tests) covers stale/fresh/no-URL/no-flag but never simulates an unreachable spec remote. Implementation is correct by static evidence (`preflight-check.js:193-199`: fetch failure → `offline` status, warning-only, exit code structurally never flips on `offline`). Deviation is between design testing strategy and delivered tests — not between code and spec.
2. **`bin/innfo-mcp.bundle.js` was rebuilt and committed** (`fa74d3e`, 500926 → 501730 bytes; contains `TEMPLATE_CACHE_STALE`/`checkFreshness` symbols), contradicting `design.md` File Changes ("NOT rebuilt... see Open Questions") and `tasks.md` 5.6 ("NOT rebuilt (deferral accepted)"). This resolves Open Question #1 in favor of immediate CDN availability — functionally positive, but `tasks.md` 5.6's assertion is factually inaccurate and should be corrected during archive.

**SUGGESTION**:
3. `apply-progress` artifact absent (Strict TDD evidence table) — inherent to parallel PR landing; evidence re-derived and confirmed by execution.
4. PR #50 bundles an unrelated editor feature (tag selection persistence) into the same commit — scope mixing, no spec impact.
5. innfo-mcp package-wide coverage below ratchet thresholds — pre-existing drift; changed files individually healthy (≥81%).

## Deviations Summary

- **Code vs spec**: none found. All 12 requirements are implemented as specified.
- **Design vs implementation**: one — bundle rebuilt (WARNING 2, resolves Open Question #1 positively).
- **Design testing strategy vs delivered tests**: one — C3 offline-scenario test missing (WARNING 1).

## Verdict

**PASS WITH WARNINGS** — all 5 gates green with exact expected counts (602 passed / 2 skipped; 7/7 guard; 8/8 preflight; typecheck and verify.js exit 0), 13/14 spec scenarios proven by passing runtime tests, all design decisions D1–D5 followed, no code-vs-spec deviations. Warnings are non-blocking: one untested offline branch (static evidence confirms correct non-blocking behavior) and a bundle rebuild that contradicts a design note but delivers the feature immediately. Archive-ready once `tasks.md` 5.6's bundle claim is corrected.