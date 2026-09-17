## ADDED Requirements

### Requirement: Skill test suites in deterministic verification

`scripts/verify.js` MUST execute every self-contained Node test suite under
`skills/` as part of deterministic verification, and any nonzero exit MUST
fail verification.

#### Scenario: nn-trannsform skill suite runs

- **GIVEN** `node scripts/verify.js`
- **WHEN** deterministic verification reaches the skill-suite checks
- **THEN** it SHALL execute `node skills/nn-trannsform/test/run.js`
- **AND** a nonzero exit SHALL fail verification.

#### Scenario: nn-workspace-git contract test runs

- **GIVEN** `node scripts/verify.js`
- **WHEN** deterministic verification reaches the skill-suite checks
- **THEN** it SHALL execute `node skills/nn-workspace-git/test/skill-contract.test.js`
- **AND** a nonzero exit SHALL fail verification.

#### Scenario: A crashing suite fails the gate instead of passing silently

- **GIVEN** a skill test suite whose entry file resolves a path that no
  longer exists on disk (for example, a stale `actioNN/` reference left over
  from a directory move)
- **WHEN** `scripts/verify.js` runs that suite
- **THEN** the suite SHALL crash with a nonzero exit
- **AND** `scripts/verify.js` SHALL report the step as failed and exit
  nonzero, rather than the crash going unnoticed because nothing invoked the
  suite.

### Requirement: Spec-URL validation covers repo-local skill markdown

`check-spec-version.mjs --check-urls` MUST treat markdown under the repo-local
`skills/` tree as a URL-resolution target, so canonical
`raw.githubusercontent.com` spec URLs written inside a `SKILL.md` are validated.

#### Scenario: Skill markdown is in scope after the consolidation

- **GIVEN** a `SKILL.md` under `skills/` containing a canonical
  `raw.githubusercontent.com` spec URL
- **WHEN** `npm run check:spec-urls` runs
- **THEN** that URL SHALL be resolved against the repository
- **AND** an unresolvable URL SHALL fail the check.

#### Scenario: A path-shaped predicate does not silently narrow coverage

- **GIVEN** a scan predicate that selects files by a hardcoded directory
  prefix (for example `actioNN/skills/`)
- **WHEN** that directory is moved or renamed by a consolidation
- **THEN** the predicate SHALL be updated in the same change
- **AND** the gate SHALL NOT report success while covering strictly fewer
  files than before the move.

### Requirement: Canonical vocabulary identifiers resolve on disk

Every entry in `ageNNt.stable_identifiers` in `iNNfo/specs/vocabulary.json`
MUST resolve to a path that exists in the repository, and the guard asserting
this MUST run in deterministic verification.

#### Scenario: A consolidated directory is reflected in the dictionary

- **GIVEN** the skill ecosystem moved from `actioNN/skills/` to `skills/`
- **WHEN** `node iNNfo/specs/scripts/test-vocabulary.js` runs
- **THEN** each listed stable identifier SHALL exist on disk
- **AND** an identifier naming a removed directory SHALL fail the guard.

#### Scenario: The vocabulary guard is gated

- **GIVEN** `node scripts/verify.js`
- **WHEN** deterministic verification reaches the skill-suite checks
- **THEN** it SHALL execute `node iNNfo/specs/scripts/test-vocabulary.js`
- **AND** a nonzero exit SHALL fail verification.

#### Scenario: An abandoned migration is recorded, not left implied

- **GIVEN** a `planned_migrations` entry describing a rename that was later
  abandoned in favor of a different layout
- **WHEN** the dictionary is updated
- **THEN** the entry SHALL state that the migration shipped to the layout that
  was actually chosen, and that the original target was dropped
- **AND** the superseded term SHALL remain listed as a deprecated alias.

### Requirement: No dangling references to removed directories

After a directory-level consolidation, no tracked, executable reference — a
`require`/`import` path, a resolved filesystem path built at runtime, or an
agent-executable command written inside a `SKILL.md` — SHALL point at a
directory that no longer exists in the repository.

#### Scenario: A moved suite resolves its own SKILL.md relative to the repo root

- **GIVEN** `skills/nn-workspace-git/test/skill-contract.test.js`, which
  reads its own skill's `SKILL.md` to check the frontmatter contract
- **WHEN** the test computes `REPO_ROOT` and `SKILL_PATH`
- **THEN** the resolved path SHALL be `<repo-root>/skills/nn-workspace-git/SKILL.md`
- **AND** the file SHALL exist and be readable at that path.

#### Scenario: Ungated Playwright e2e remains a documented residual gap

- **GIVEN** `.github/workflows/ci.yml` runs Vitest suites only
- **WHEN** a Playwright spec under `iNNfo/apps/innfo-editor/e2e/` contains a
  dangling path (as `16-innfo-console.spec.ts` did before this change)
- **THEN** no automated gate SHALL catch it today
- **AND** this SHALL be recorded as a known, intentionally out-of-scope
  residual gap rather than left undiscoverable, until a future change wires
  Playwright into CI.
