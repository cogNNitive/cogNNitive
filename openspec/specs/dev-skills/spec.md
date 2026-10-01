# Dev Skills Specification

## Purpose

The `nn-dev-*` maintainer skills govern the shared working tree, the integrity
gate, and the release flow. These requirements harden them against the three
recurring deploy-pain families: anonymous concurrent-session writes, unverified
`dev -> main` batches, and incomplete "deployed" definitions. They enforce
session attribution, a mechanical merge gate with real CI evidence, and a
four-leg deploy definition of done.

## Requirements

### Requirement: Session-attributed in-flight work

The repository MUST isolate every write-intended session in its own checkout — a `git worktree` of `dev` — so no two sessions ever share a directory, and in-flight work is attributable by construction. A session SHALL commit early and often; work that must survive a crash without merging SHALL be committed as `wip:<session-id>: <reason>` on `dev`.

#### Scenario: A session works in its own worktree

- GIVEN a write-intended session with id `<session-id>` on `dev`
- WHEN the session starts
- THEN the session-start helper SHALL create, or reuse, a `git worktree` of `dev` for that session
- AND the session SHALL perform its writes inside that worktree, never the primary checkout.

#### Scenario: WIP commit carries session identity

- GIVEN a session with id `<session-id>` whose work must survive a crash without merging
- WHEN the work is committed
- THEN it SHALL commit as `wip:<session-id>: <reason>` on `dev`.

#### Scenario: Commit early, not freeze

- GIVEN uncommitted paths in a session's worktree
- WHEN the session continues to write
- THEN it SHALL prefer committing, or stashing with a session note, over leaving the tree dirty across tool-call boundaries.

### Requirement: Gates run against committed HEAD

The deterministic gate MUST evaluate its checks against committed `HEAD` (or a detached clean worktree), never a shared dirty tree, so one session's uncommitted WIP SHALL NOT redden another session's gate.

#### Scenario: Dirty session tree does not redden the gate

- GIVEN a session worktree with uncommitted files
- WHEN another session runs the deterministic gate against `HEAD`
- THEN the gate SHALL NOT read the dirty worktree for its verdicts.

### Requirement: CI-verified batches before merge

A `dev -> main` batch MUST carry a green CI signal on the exact commits being
merged. Unverified batches SHALL NOT land. Local pre-push verification procedures
in maintainer skills MUST invoke genuine catalog and integrity guards rather than
commands that omit catalog validation.

#### Scenario: Dev CI covers the batch

- **GIVEN** `ci.yml` runs the verify job on pushes to `dev`
- **WHEN** the batch tip on `dev` is green
- **THEN** the merge gate MAY pass on verification evidence, provided
  `origin/main` is green and stationary (see next requirement).

#### Scenario: No dev CI, no merge

- **GIVEN** no green CI signal exists for the exact batch tip
- **WHEN** a merge `dev -> main` is requested
- **THEN** the gate SHALL block and require either a dev CI run or a
  documented full local rehearsal (`check-integrity --pre-push` green on the
  tip) recorded in the merge report.

#### Scenario: Pre-push verification executes genuine catalog guard

- **GIVEN** a maintainer executes pre-push verification per `nn-dev-development` §4e
- **WHEN** verifying catalog and template freshness locally
- **THEN** the documented procedure SHALL instruct running the actual catalog guard command (`npm run check:versions` or `node scripts/verify.js`)
- **AND** the procedure SHALL NOT refer to `node scripts/check-integrity.js` as detecting catalog staleness.

### Requirement: Merge gate on target health

The merge MUST NOT land on a red or moving target. All pre-merge comparisons and diff inspections MUST compare remote tracking refs (`origin/main..origin/dev`) rather than local branch refs to avoid stale local ref drift.

#### Scenario: Target is red or advanced

- **GIVEN** `origin/main` latest CI conclusion is not `success`, or
  `origin/main` advanced since the batch was verified
- **WHEN** a merge `dev -> main` is requested
- **THEN** the skill SHALL block with ❌, distinguishing "red caused by this
  batch" (fix-forward on `dev` first, re-verify) from "pre-existing red"
  (record a maintainer-approved exception with the failing run id).

#### Scenario: Diff inspection uses remote tracking references

- **GIVEN** a maintainer evaluates unmerged commits or checks pre-merge template coherence
- **WHEN** comparing changes between `main` and `dev`
- **THEN** the procedure SHALL compare `origin/main..origin/dev`
- **AND** the procedure SHALL NOT compare local `main` due to server-side push staleness.

### Requirement: Complete definition of deployed

A release SHALL be reported as "deployed" only when all four legs verify in
one run; a tag alone MUST never satisfy the definition.

#### Scenario: All legs green

- **GIVEN** a release-shaped change
- **WHEN** Group 1 sync check runs
- **THEN** it SHALL verify (1) tag pushed, (2) CI `success` on the tip of
  `origin/main`, (3) Pages deploy finished on that tip, (4) CDN bundle +
  manifest pins resolve — and any failing leg SHALL be ❌ (escalated from ⚠️)
  for release changes. Non-release changes keep ⚠️ advisory behavior.