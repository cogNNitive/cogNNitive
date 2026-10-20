# Dev Skills Specification

## Purpose

The `nn-dev-*` maintainer skills govern the shared working tree, the integrity
gate, and the release flow. These requirements harden them against the three
recurring deploy-pain families: anonymous concurrent-session writes, unverified
`dev -> main` batches, and incomplete "deployed" definitions. They enforce
session attribution, a mechanical merge gate with real CI evidence, a
tag-driven release flow, and a complete definition of deployed.
## Requirements
### Requirement: Session-attributed in-flight work

The repository MUST isolate every write-intended session in its own checkout — a `git worktree` of `dev` — so no two sessions ever share a directory, and in-flight work is attributable by construction. When creating or hydrating a session worktree, `scripts/nn-session.mjs start` MUST reuse the primary checkout's `node_modules` (and `skills/nn-sources/node_modules`) via directory junctions (`fs.symlinkSync(target, linkPath, 'junction')`) whenever the worktree's `package-lock.json` SHA-256 matches the primary checkout's `package-lock.json` and `node_modules` is present, falling back to `npm ci` only when lockfiles differ, `node_modules` is missing, or `--full-install` is passed, and then running `npm run build --workspace=@innfo/core`. A session SHALL commit early and often; work that must survive a crash without merging SHALL be committed as `wip:<session-id>: <reason>` on `dev`. (Previously: `nn-session.mjs start` ran a full `npm ci` across root and `skills/nn-sources` on every new worktree.)

#### Scenario: A session works in its own worktree and reuses matching node_modules via junction

- **GIVEN** a write-intended session with id `<session-id>` on `dev` whose `package-lock.json` hashes match the primary checkout
- **WHEN** `node scripts/nn-session.mjs start --id <session-id>` runs without `--full-install`
- **THEN** the session-start helper SHALL create or reuse the `git worktree` for that session, link `node_modules` (and `skills/nn-sources/node_modules`) via directory junctions without running `npm ci`, and build `@innfo/core`
- **AND** the session SHALL perform its writes inside that worktree, never the primary checkout.

#### Scenario: Lockfile mismatch or --full-install triggers clean npm ci

- **GIVEN** a session worktree whose `package-lock.json` differs from the primary checkout, or `--full-install` is passed to `nn-session.mjs start`
- **WHEN** the session starts
- **THEN** `nn-session.mjs` SHALL remove any existing `node_modules` junction in the worktree and execute `npm ci` in the worktree.

#### Scenario: WIP commit carries session identity

- **GIVEN** a session with id `<session-id>` whose work must survive a crash without merging
- **WHEN** the work is committed
- **THEN** it SHALL commit as `wip:<session-id>: <reason>` on `dev`.

#### Scenario: Commit early, not freeze

- **GIVEN** uncommitted paths in a session's worktree
- **WHEN** the session continues to write
- **THEN** it SHALL prefer committing, or stashing with a session note, over leaving the tree dirty across tool-call boundaries.

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

A release SHALL be reported as "deployed" only when all legs verify in one run; a pushed tag alone MUST never satisfy the definition. The legs are: (1) the monorepo release tag is pushed, (2) the release workflow run for that tag concluded `success`, including the post-publish smoke test, (3) the mirror tag exists in `cogNNitive-web`, and (4) the published manifest and the versioned CDN bundle URLs resolve and pin the released version.

#### Scenario: All legs green

- GIVEN a release-shaped change
- WHEN Group 1 sync check runs
- THEN it SHALL verify legs (1) through (4)
- AND any failing leg SHALL be reported as an error (escalated from advisory) for release changes. Non-release changes keep advisory behavior.

#### Scenario: Tag pushed but workflow failed

- GIVEN the release tag is pushed and the workflow run failed
- WHEN deployment status is evaluated
- THEN the release SHALL NOT be reported as deployed

### Requirement: The release procedure is "tag, push, watch"

`.agents/skills/nn-dev-release/SKILL.md` MUST describe the release as: confirm the change is merged to `main`, that the authored version is bumped for `innfo-mcp` and `innfo-console`, and that the new version is strictly greater than the highest existing tag of the key in both repositories, create the annotated tag `<key>-v<semver>`, push the tag, and watch the release workflow to completion. The procedure MUST NOT instruct the maintainer to edit pins, channel versions, or the stable manifest by hand, to run `sync-versions` for channel refs, or to tag `cogNNitive-web`. It MUST reject a tag whose key is not allowed, whose version is not greater than every existing tag of the key, or (for `innfo-mcp` and `innfo-console`) whose version does not match the authored version.

#### Scenario: Maintainer follows the procedure

- GIVEN a merged change for `skills` and a version above the highest existing `skills` tag
- WHEN the maintainer follows `nn-dev-release`
- THEN the only manual release actions are creating and pushing `skills-v<semver>` and watching the workflow

#### Scenario: Invalid key is stopped

- GIVEN a proposed tag with a key outside the allowed set
- WHEN the procedure validates the tag
- THEN the flow stops before the tag is pushed

#### Scenario: Non-increasing or mismatched version is stopped

- GIVEN a proposed tag whose version is not greater than the highest existing tag of its key, or differs from the authored version of `innfo-mcp` or `innfo-console`
- WHEN the procedure validates the tag
- THEN the flow stops before the tag is pushed

### Requirement: Failure and re-run states are documented

The `nn-dev-release` procedure MUST document, for each release stage, the state left behind by a failure at that stage and the action to resolve it, including that re-running the workflow on the same tag is the repair path. A published tag is never deleted: after a failed smoke test the mirror tag and the manifest commit stay and a re-run on the same tag converges. The procedure MUST document manifest rollback as a manual step: re-publish the previous `docs/use/manifests/<tag>.md` snapshot. It MUST also document that a cancelled pending run (GitHub keeps one pending run per concurrency group) is repaired by re-running the same tag.

#### Scenario: Partial publish

- GIVEN the web commit was pushed but the smoke test failed
- WHEN the maintainer consults the procedure
- THEN it states the resulting state and instructs re-running on the same tag

#### Scenario: Procedure covers every stage

- GIVEN the seven release stages
- WHEN the failure section is reviewed
- THEN each stage has a documented failure state and resolution

### Requirement: Tiered inner-loop versus batch-gate verification

Maintainer skills (`.agents/skills/nn-dev-development/SKILL.md` and `.agents/skills/nn-dev-check-integrity/SKILL.md`) and `scripts/check-integrity.js` MUST distinguish inner-loop session verification from the `dev -> main` batch gate. Inner-loop session rules MUST prescribe targeted unit tests (`node --test <file>`), `node scripts/verify.js --only=<substring>`, or `npm run verify:fast` (`node scripts/verify.js --fast`) after edits, and `scripts/check-integrity.js` (default non-`--pre-push` mode) MUST invoke `node scripts/verify.js --fast` for Group 2. Full `node scripts/verify.js` and `node scripts/check-integrity.js --pre-push` MUST remain mandatory for the `dev -> main` batch gate.

#### Scenario: Inner-loop session uses targeted or fast verification

- **GIVEN** an active development session editing code on a session worktree
- **WHEN** the maintainer or agent verifies an incremental change or runs default `node scripts/check-integrity.js`
- **THEN** the workflow SHALL run targeted tests (`--only=<name>`) or `verify.js --fast` rather than the full 3-minute verification suite.

#### Scenario: Batch promotion to main enforces full verification

- **GIVEN** a maintainer prepares to promote a `dev` batch to `main` or runs `node scripts/check-integrity.js --pre-push`
- **WHEN** the pre-push / merge gate executes
- **THEN** it SHALL run the full unfiltered `node scripts/verify.js` and Group 5 CI-mirror checks.

