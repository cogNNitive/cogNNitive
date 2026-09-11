# Verify Report: Dev→Main Process Gaps

- **Change**: `2026-09-11-dev-main-process-gaps`
- **Mode**: openspec (repo-local)
- **Phase**: sdd-verify (executor)
- **Date**: 2026-09-11
- **Baseline**: `dev` @ `97bdef0` (in sync with `origin/dev`), `origin/main` @ `918e43a`
- **Verdict**: **PASS WITH WARNINGS**

## Completeness

All 20 implementation checkboxes in `tasks.md` (Phase 0.1 → Phase 5.3) are
checked, and every one is backed by a re-run command or direct source evidence
below. No unchecked task remains.

| Phase | Tasks | Status |
|---|---|---|
| 0 Baseline | 0.1, 0.2 | ✅ complete |
| 1 Manifest suites | 1.1, 1.2, 1.3 | ✅ complete |
| 2 Scan/encoding guards | 2.1–2.5 | ✅ complete |
| 3 Local CI mirror | 3.1–3.3 | ✅ complete |
| 4 Release docs + helper | 4.1–4.4 | ✅ complete |
| 5 Close-out | 5.1–5.3 | ✅ complete |

## Build / Test / Coverage Evidence (re-run, not trusted from apply-progress)

| Command | Result |
|---|---|
| `node scripts/verify.js` | exit 0 — all deterministic pre-checks passed; all 3 manifest suites executed inline |
| `node scripts/check-integrity.js --pre-push` | exit 0 — `ALL INTEGRITY GATES PASSED` (lint · typecheck · core tests · mcp coverage 259 tests · editor 661 tests · spec-urls · full verify) |
| `npx vitest run src/tools/check-workspace.spec.ts src/tools/resolver-node.spec.ts test/helpers/fs-retry.test.ts` | exit 0 — 3 files, **52 tests passed** (11 + 38 + 3) |
| `node scripts/manifest/generate-manifest.test.js` | exit 0 — 12 assertions |
| `node scripts/manifest/validate-manifest.test.js` | exit 0 — 26 assertions incl. `tagShapeViolation` |
| `node scripts/manifest/check-parity.test.js` | exit 0 — 6 assertions |
| `node scripts/guard-text-encoding.js` | exit 0 — 1479 text files valid UTF-8, no U+FFFD |
| `node scripts/guard-text-encoding.test.js` | exit 0 — buffer classification, violation reporting, binary/generated skip, allowlist |
| `node scripts/lib/git-visible.test.js` | exit 0 — tracked + nonignored included, ignored excluded, no-git fallback null |
| `npm --prefix iNNfo run check:spec-urls` | exit 0 — all raw URLs resolve, no legacy refs |
| `npm run typecheck` (in `innfo-mcp`) | exit 0 — `tsc --noEmit -p tsconfig.json` |

Coverage: the pre-push run used `test:coverage` (v8) with ratchet thresholds
defined in `iNNfo/packages/innfo-mcp/vitest.config.ts`; measured
lines 87.44%, branches 78.68%, funcs 88.23% — gate passed.

## Spec Compliance Matrix

| Requirement | Scenario | Status | Runtime / source evidence |
|---|---|---|---|
| Manifest suites in deterministic verification | All manifest suites run | ✅ PASS | `verify.js` steps 0b invoke all three; observed in `node scripts/verify.js` output, exit 0 |
| | Existing suites are not replaced | ✅ PASS | `verify.js:107-109` invoke via `run()`; no assertions duplicated (source read, 223 lines) |
| Tracked-text encoding guard | Replacement character fails fast | ✅ PASS | `guard-text-encoding.test.js` asserts file + reason; `guard-text-encoding.js:53-59` returns `replacement-character (U+FFFD)`; `main()` exits 1 naming file |
| | Binary/fixture behavior explicit | ✅ PASS | NUL-binary skip and `*.bundle.js` skip tested; `DEFAULT_ALLOWLIST` carries reviewer note (comment at `guard-text-encoding.js:42-46`) |
| Coverage and spec URLs in local pre-push mirror | Coverage ratchet visible locally | ✅ PASS | `check-integrity.js:87-89` runs core/app tests + `test:coverage`; pre-push run executed them, exit 0 |
| | Spec-URL resolution visible locally | ✅ PASS | `check-integrity.js:90` runs `check:spec-urls`; pre-push run executed it, exit 0 |
| | Residual CI nonequivalence documented | ✅ PASS | `nn-dev-check-integrity/SKILL.md` diff adds the explicit paragraph naming core build, editor build, `build:docs`, and informational `--inventory` |
| Git-aware repository scans | Ignored caches are excluded | ✅ PASS | `git-visible.test.js` disposable `git init` fixture proves ignored excluded; `check-spec-version.mjs:281` filters via `collectGitVisible` |
| | No git metadata | ✅ PASS | `git-visible.test.js` injected-throw returns `null`; `check-spec-version.mjs:281` applies no filter when null |
| | Allowlist categories remain explicit | ✅ PASS | `ARCHIVE_DIRS`/`ACTIVE_IGNORE` and explicit rel skips retained (`check-spec-version.mjs:273-280`); git filter is additive |
| Shared temporary-cleanup helper | Transient Windows cleanup retries | ✅ PASS | `fs-retry.test.ts` retries EBUSY and EPERM/ENOTEMPTY |
| | Nontransient failures still fail | ✅ PASS | `fs-retry.test.ts` ENOSPC rethrows unmasked |
| | No duplicated cleanup logic | ✅ PASS | Diffs delete both local `rmWithRetry` loops; both specs import `../../test/helpers/fs-retry`; full mcp suite 259 tests passed |
| Console release documentation and tag shape | Console is a release option | ✅ PASS | `nn-dev-release/SKILL.md:122,141-149` names Console bundle + `console-assets` bump inside Option [c] |
| | Console stable tag shape is normative | ✅ PASS | `SKILL.md:168-173` requires `-v`; `manifest-rules.js:21` `TAG_SHAPE_RE = /^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$/` matches; `tagShapeViolation` test passed; `innfo-console-v0.1.0` tag exists |

## Design Coherence

| Design decision | Implemented | Evidence |
|---|---|---|
| Invoke existing manifest suites (no duplication) | ✅ | `verify.js:103-109` |
| Dedicated tracked-text guard with file/reason | ✅ | `guard-text-encoding.js` |
| Preserve coverage + spec URLs; document `build:docs` nonequivalence | ✅ | `check-integrity.js:84-95`, SKILL prose |
| One central git-visibility helper with no-git fallback | ✅ | `scripts/lib/git-visible.js` |
| Shared `rmWithRetry` in both mcp specs | ✅ | both spec diffs + `fs-retry.ts` |
| Prose-only Console option and `-v` tag rule | ✅ | `nn-dev-release/SKILL.md` |
| `scripts/check-integrity.js` listed as Modify | ⚠️ deviation | No edit made — behavior already landed in `918e43a`. Design artifact is stale; spec behavior is satisfied. See S1. |

### Additions beyond the original affected-file list

- `iNNfo/packages/innfo-mcp/tsconfig.json` — **verified no behavior change.**
  The mcp build uses `tsup` (`package.json:21`, `tsup.config.ts` with explicit
  `entry: { server: 'src/server.ts' }`, `dts: false`), not `tsc`. `rootDir: "."`
  and the added `include` only affect `tsc --noEmit` typecheck (the `TS6059`
  workaround); they do not move build output. `npm run typecheck` in the package
  exits 0.
- `scripts/lib/git-visible.js` — justified refinement that de-duplicates the
  selection logic previously inline in `check-spec-version.mjs`. Behavior is
  identical for the production path (same `git ls-files -co --exclude-standard`
  command) and is now unit-covered for the no-git fallback.

## Phase 5.3 — No merge / tag / pin / manifest / user-facing change

| Check | Evidence |
|---|---|
| No commit created | `git status` still shows all change files uncommitted; `HEAD == 97bdef0 == origin/dev` |
| No merge | `git log --merges -1` → pre-existing `3390db8` (PR #87); no new merge commit |
| No tag at HEAD | `git tag --points-at HEAD` → empty; recent tags unchanged |
| No manifest pin/regeneration | This change's file set excludes `manifest/source.yaml`, `docs/use/manifest.md`, CDN bundles; `generate-manifest.js --check` passed (doc fresh) |
| No user-facing behavior | Change set touches only scripts, tests, test helper, `tsconfig`, and maintainer SKILL docs — no `src/` product code |

## Review Budget

Working-tree diff for this change (tracked modifications + new files):
**575 changed lines** (520 added, 55 removed) — under the 800-line budget.
The apply report stated ≈524; it appears to omit `scripts/lib/git-visible.js`
(51 lines). See S2.

## Issues

### CRITICAL
- None.

### WARNING
- **W1 — Pre-existing U+FFFD in `iNNfo/USE_AI.md` (recorded separate defect).**
  The new guard exposes two literal replacement characters in a tracked doc
  outside this change's area. The guard carries an explicit allowlist entry
  (`guard-text-encoding.js:42-46`) with a reviewer note, which satisfies the
  spec's "explicit allowlist with reviewer note" scenario. This is a
  **pre-existing defect to fix separately**, not a violation of this change.
  Maps to: Tracked-text encoding guard / "Binary and fixture behavior is
  explicit". Evidence: `node scripts/guard-text-encoding.js` exit 0 with the
  allowlist in place.

### SUGGESTION
- **S1 — `design.md` lists `scripts/check-integrity.js` as Modify, but no edit
  was made.** Task 3.1 says "preserve", and apply correctly recorded "no code
  change needed" (behavior landed in `918e43a`). The design artifact is stale;
  consider updating it to "unchanged, exercised" for traceability.
- **S2 — Changed-line accounting in `apply-progress.md` understates by 51
  lines.** Reported ≈524; actual 575. The delta equals
  `scripts/lib/git-visible.js`. Still well under the 800-line budget, so no
  process impact.
- **S3 — Mojibake is outside the guard's declared scope.** `iNNfo/scripts/check-spec-version.mjs`
  line 3 contains a pre-existing mojibake em dash (`â€"`, U+00E2 U+20AC U+201D)
  while line 38 uses a correct `─`. This is valid UTF-8 and contains no U+FFFD,
  so the guard correctly does not flag it under the spec's definition of
  "known-invalid" (U+FFFD / undecodable bytes). It is pre-existing (the `HEAD`
  revision contains it; the diff does not touch that line). Consider a future
  guard extension if mojibake should be treated as invalid.

## Final Verdict

**PASS WITH WARNINGS**

All spec requirements and scenarios are backed by executed commands or direct
source evidence; all tasks are complete; the design is coherent apart from one
stale artifact entry; and Phase 5.3 boundaries (no merge/tag/pin/manifest/
user-facing change) are respected. The only warning is a recorded, allowlisted
pre-existing defect outside this change's scope.
