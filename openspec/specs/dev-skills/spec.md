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

The shared working tree MUST make every session's in-flight work attributable,
so no dirty tree is ever anonymous.

#### Scenario: WIP commit carries session identity

- **GIVEN** a session with id `<session-id>` working on `dev`
- **WHEN** the work must survive beyond the current session without merging
- **THEN** the session SHALL commit it as `wip:<session-id>: <short reason>`
  on `dev` instead of leaving a dirty tree.

#### Scenario: Anonymous dirty tree is a blocker

- **GIVEN** `git status --porcelain` is non-empty at session start
- **WHEN** no `wip:<session-id>` commit or maintainer confirmation attributes
  the paths to a known session
- **THEN** the skill SHALL report ❌ and ask exactly one question
  ("yours from another session, or foreign?") before any write, and SHALL
  never stage those paths without explicit consent.

### Requirement: Dirty-tree age rule

A dirty tree MUST NOT outlive the session that created it without conversion
to an attributed `wip:` commit.

#### Scenario: Stale dirty tree expires

- **GIVEN** uncommitted paths older than one session with no attributed owner
- **WHEN** a new session opens on the shared tree
- **THEN** the skill SHALL flag ❌ "stale unattributed WIP" and require
  commit (`wip:<session-id>`), stash-with-owner-note, or maintainer-confirmed
  discard before the session's first write.

### Requirement: Session claim on the shared tree

Sessions SHOULD announce their presence so sibling agents can tell active
work from abandoned work.

#### Scenario: Claim is visible

- **GIVEN** a session starts write-intended work on `dev`
- **WHEN** the concurrency scan runs (skill §1)
- **THEN** the session SHALL record its claim (branch + session id + intent)
  in the session handoff block, and sibling sessions MUST treat claimed paths
  as live and hands-off.

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