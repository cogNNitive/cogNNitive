# Tasks: Dev→Main Process Gaps

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~90–160 implementation lines plus prose/tests |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | Single work unit after approval |
| Chain strategy | Not needed |

Decision needed before apply: branch consent for the first repo write, and
confirmation that this change remains complementary to the pending sibling
change (no duplicated process requirements).

## Phase 0: Baseline

- [x] 0.1 Record `git status -sb`, `HEAD`, and `origin/main` tip.
- [x] 0.2 Run the current fast gates and record which target gaps reproduce:
  manifest suites unrun, no text-encoding guard, scanner coverage of ignored
  files, duplicated cleanup helper.

## Phase 1: Manifest suites in deterministic verification

- [x] 1.1 RED: call the three root manifest suites from a local invocation and
  confirm each can fail the verification path (Req: Manifest suites).
- [x] 1.2 GREEN: wire `generate-manifest.test.js`, `validate-manifest.test.js`,
  and `check-parity.test.js` into `scripts/verify.js` without duplicating
  their assertions.
- [x] 1.3 Verify: `node scripts/verify.js` green.

## Phase 2: Generated-file and repository-scan guards

- [x] 2.1 RED: create tracked-text fixtures for replacement characters and
  undecodable bytes plus binary/generated exclusions (Req: Tracked-text guard).
- [x] 2.2 GREEN: implement `scripts/guard-text-encoding.js` and its focused
  unit test; failure names file and reason.
- [x] 2.3 RED: fixture a disposable git repository containing a gitignored
  artifact (Req: Git-aware scans).
- [x] 2.4 GREEN: centralize git-visible file selection and apply it to
  repository scans, preserving the no-git fallback.
- [x] 2.5 Verify: focused tests plus `npm --prefix iNNfo run check:spec-urls`.

## Phase 3: Local CI mirror

- [x] 3.1 Preserve the split innfo-mcp coverage command and spec-URL command
  in `check-integrity --pre-push` (Req: Local pre-push mirror).
- [x] 3.2 Align Group 5 prose in `nn-dev-check-integrity/SKILL.md` and
  explicitly document any remaining deliberate `build:docs`/build nonequivalence.
- [x] 3.3 Verify: `node scripts/check-integrity.js --pre-push` green.

## Phase 4: Release documentation and test-helper cleanup

- [x] 4.1 Add the Console subsystem option to `nn-dev-release/SKILL.md`.
- [x] 4.2 Add the normative `-v` stable-tag requirement and example.
- [x] 4.3 Replace both duplicated cleanup implementations with one shared
  helper import.
- [x] 4.4 Verify: focused `innfo-mcp` suites plus `verify.js` remain green.

## Phase 5: Close-out

- [x] 5.1 Review the changed hunks separately from the pending sibling change
  to confirm no duplicated process requirements.
- [x] 5.2 Check estimated changed lines against the review budget and decide on
  chaining only if it exceeds it.
- [x] 5.3 Do not merge, tag, pin, regenerate manifests, or alter user-facing
  behavior as part of this planning/implementation change.
