# Delta for dev-skills

## MODIFIED Requirements

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

## ADDED Requirements

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
