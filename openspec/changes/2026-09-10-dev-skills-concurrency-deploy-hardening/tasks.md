# Tasks: nn-dev Skills Hardening

> Scope: skill prose (3 files) + 1 CI trigger line. Single PR, budget 800.
> Strict TDD: N/A for prose (see design.md test strategy); every group ends
> with an executable verification step.

## 1. Baseline (read-only)

- [x] 1.1 Record `git status -sb`, HEAD, `origin/main` tip as the batch baseline.
      — dev, ahead of origin/dev 4; HEAD 4c798e5; origin/main 984eed0; `origin/main...dev` = 0/4.
- [x] 1.2 Run `node scripts/check-integrity.js` and note pre-existing findings
      (must not be introduced by this change). — GREEN, no pre-existing findings.

## 2. `nn-dev-development` — attribution + claim

- [x] 2.1 Extend §1e with the dirty-tree age rule (❌ stale unattributed WIP,
      three named exits). — added "Stale dirty-tree age rule (enforced)" block under §1e.
- [x] 2.2 Add §1f session-claim convention + §4d handoff claim line.
      — new §1f (claim advisory for siblings, mandatory for ours); §4d handoff block gains
      "Session claim: <session-id> · dev · <intent>".
- [x] 2.3 Extend Core Rule #6 with "never stage unattributed files".
- [x] 2.4 Verify: re-read the hunks; `git diff --stat` shows only this SKILL.md.
      — hunks re-read (lines 157-187); diff shows only the 3 batch target SKILL.md files.

## 3. `nn-dev-check-integrity` — deploy legs + merge gate

- [x] 3.1 Extend Group 1 with Pages-deploy and CDN/manifest checks; ❌ for
      release-shaped changes, ⚠️ otherwise. — added deploy-pages job check + `validate-manifest.js`
      leg; verdict rule escalates to ❌ for release-shaped changes, ⚠️ advisory otherwise.
- [x] 3.2 Add the merge-gate rule (batch CI signal + green stationary target;
      batch-red vs pre-existing-red distinction with exception format). — new Group 1b.
- [x] 3.3 Verify: `node scripts/check-integrity.js` green on the edited tree. — GREEN.

## 4. `nn-dev-release` — deploy-DoD + merge gate hook

- [x] 4.1 Extend option [a] audit with the deploy-DoD row. — added DEPLOY-DoD scan block
      (tag / CI-tip / Pages / CDN-manifest) + summary table row.
- [x] 4.2 Add pre-merge gate call before step 0; restate merge → tag → pin
      as blocking. — blocking gate block before option [c] step 0; step 0 restated as gate.
- [x] 4.3 Verify: `node scripts/verify.js` (dev mode) green. — GREEN.

## 5. `ci.yml` — CI on dev (verify jobs only)

- [x] 5.1 Extend push branches to `[main, dev]`; scope `--release` to
      `refs/heads/main` so dev never runs live-manifest validation.
      — ALREADY DONE by sibling commit b13a37f; verified in working tree (line 5 + line 42).
- [x] 5.2 Verify: push the change branch, confirm the dev CI run is green
      and contains no Pages/release steps. — code-inspection only (no push): `--release` (l.42),
      Pages artifact upload (l.50) and deploy-pages (l.136) all scoped to `refs/heads/main`;
      live dev CI runs green (latest 4 `success`, tip 984eed0).

## 6. Close-out

- [x] 6.1 Full `node scripts/check-integrity.js --pre-push` green. — GREEN (lint, typecheck,
      91 test files / 663 tests, coverage, spec-urls).
- [x] 6.2 Review Workload Forecast: estimated diff < 100 lines across 4 files
      → single PR, no chaining, no `size:exception` needed. — confirmed: actual diff ~113
      changed lines (102+/11-), 3 files, still single PR well under budget 800.
- [x] 6.3 Request review; merge per the NEW merge-gate (dogfood it) — **DEFERRED to maintainer batched release flow**: merge `dev → main` is a maintainer act (nn-dev-development §4e); batch not yet pushed (4 local commits incl. sibling work + foreign staged WIP in tree). The merge-gate will be dogfooded during that release flow. Orchestrator decision 2026-09-12.
      — DEFERRED to orchestrator per apply instructions (do NOT merge/push).

## Review Workload Forecast

- Files: 4 (`nn-dev-development`, `nn-dev-check-integrity`, `nn-dev-release`
  SKILL.md + `ci.yml`). Est. changed lines: < 100.
- Chained PRs recommended: No. 400-line budget risk: Low.
- Decision needed before apply: branch consent gate (mandatory per skill §2).