# Dev Skills Specification

## Purpose

The `nn-dev-*` maintainer skills govern the shared working tree, the integrity
gate, and the release flow. These requirements ensure local pre-push integrity
procedures invoke actual verification guards and all pre-merge diff inspections
use remote tracking references to avoid stale local state.

## Requirements

### MODIFIED Requirement: CI-verified batches before merge

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

### MODIFIED Requirement: Merge gate on target health

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
