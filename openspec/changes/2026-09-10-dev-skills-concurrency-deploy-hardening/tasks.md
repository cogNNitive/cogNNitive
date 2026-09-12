# Tasks: nn-dev Skills Hardening

> Scope: skill prose (3 files) + 1 CI trigger line. Single PR, budget 800.
> Strict TDD: N/A for prose (see design.md test strategy); every group ends
> with an executable verification step.

## 1. Baseline (read-only)

- [ ] 1.1 Record `git status -sb`, HEAD, `origin/main` tip as the batch baseline.
- [ ] 1.2 Run `node scripts/check-integrity.js` and note pre-existing findings
      (must not be introduced by this change).

## 2. `nn-dev-development` — attribution + claim

- [ ] 2.1 Extend §1e with the dirty-tree age rule (❌ stale unattributed WIP,
      three named exits).
- [ ] 2.2 Add §1f session-claim convention + §4d handoff claim line.
- [ ] 2.3 Extend Core Rule #6 with "never stage unattributed files".
- [ ] 2.4 Verify: re-read the hunks; `git diff --stat` shows only this SKILL.md.

## 3. `nn-dev-check-integrity` — deploy legs + merge gate

- [ ] 3.1 Extend Group 1 with Pages-deploy and CDN/manifest checks; ❌ for
      release-shaped changes, ⚠️ otherwise.
- [ ] 3.2 Add the merge-gate rule (batch CI signal + green stationary target;
      batch-red vs pre-existing-red distinction with exception format).
- [ ] 3.3 Verify: `node scripts/check-integrity.js` green on the edited tree.

## 4. `nn-dev-release` — deploy-DoD + merge gate hook

- [ ] 4.1 Extend option [a] audit with the deploy-DoD row.
- [ ] 4.2 Add pre-merge gate call before step 0; restate merge → tag → pin
      as blocking.
- [ ] 4.3 Verify: `node scripts/verify.js` (dev mode) green.

## 5. `ci.yml` — CI on dev (verify jobs only)

- [ ] 5.1 Extend push branches to `[main, dev]`; scope `--release` to
      `refs/heads/main` so dev never runs live-manifest validation.
- [ ] 5.2 Verify: push the change branch, confirm the dev CI run is green
      and contains no Pages/release steps.

## 6. Close-out

- [ ] 6.1 Full `node scripts/check-integrity.js --pre-push` green.
- [ ] 6.2 Review Workload Forecast: estimated diff < 100 lines across 4 files
      → single PR, no chaining, no `size:exception` needed.
- [ ] 6.3 Request review; merge per the NEW merge-gate (dogfood it).

## Review Workload Forecast

- Files: 4 (`nn-dev-development`, `nn-dev-check-integrity`, `nn-dev-release`
  SKILL.md + `ci.yml`). Est. changed lines: < 100.
- Chained PRs recommended: No. 400-line budget risk: Low.
- Decision needed before apply: branch consent gate (mandatory per skill §2).
