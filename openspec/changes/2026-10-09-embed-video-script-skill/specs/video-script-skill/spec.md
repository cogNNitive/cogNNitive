# Video Script Skill Specification (delta)

## MODIFIED Requirements

### Requirement: Owned Skill With No External Dependency

The system MUST provide a cogNNitive-owned video-script skill embedded in the `video` bluepriNNt package at `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/` (no longer under top-level `skills/`) that authors VUS scripts and understands iNNfo workspace structure (Series/Video registration). The skill MUST NOT depend on, fork from at run time, or reference any repository outside the monorepo. The parser and the VUS specification it uses MUST resolve from cogNNitive-owned, self-contained artifacts committed inside the skill itself, allowing the installed skill copy to run without a monorepo checkout. (Previously: located under `skills/nn-video-script/`.)

#### Scenario: Skill authors a script with no external repository
- GIVEN a workspace with a registered Video Element and its owning Series, and no external video repository present
- WHEN the skill authors a script for that Video
- THEN the script is written to the Video's own folder
- AND no external-repository path is referenced

#### Scenario: No external reference remains
- GIVEN the skill directory
- WHEN its files are inspected
- THEN they reference no repository outside cogNNitive

#### Scenario: Installed copy compiles with no monorepo checkout
- GIVEN the skill installed at `~/.agents/skills/nn-video-script/` with no monorepo present
- WHEN the skill compiles a valid VUS script
- THEN it succeeds using only artifacts committed inside the skill

### Requirement: Self-Hosted Spec Pin

The skill MUST vendor the VUS specification as `V_0-3-3.json` inside the skill folder and resolve it relative to the skill itself (never through a monorepo-relative path). It MUST declare, and mechanically verify, a pinned sha256 for that file. The check MUST fail when the vendored file's content has drifted from the pin, and MUST NOT require an environment variable pointing outside the skill. `scripts/verify.js` MUST byte-compare the vendored copy against the package source `iNNfo/packages/innfo-video-parser/specs/V_0-3-3.json` and fail on any difference. (Previously: the pin resolved to the monorepo file.)

#### Scenario: Pin check passes against the vendored copy
- GIVEN the vendored `V_0-3-3.json` inside the skill matches the declared sha256
- WHEN the pin-validation check runs
- THEN it passes with zero warnings
- AND it succeeds with no environment variable set

#### Scenario: Pin check fails on drift
- GIVEN a vendored spec whose content no longer matches the declared pin
- WHEN the pin-validation check runs
- THEN it fails, naming the hash mismatch as the reason

#### Scenario: Vendored copy diverges from the package source
- GIVEN the vendored copy differs by one byte from `iNNfo/packages/innfo-video-parser/specs/V_0-3-3.json`
- WHEN `node scripts/verify.js` runs
- THEN it fails naming the vendored copy

## ADDED Requirements

### Requirement: Skill Is Installed By Projection From The video bluepriNNt

The skill MUST be made available to agents at `~/.agents/skills/nn-video-script/` solely by installing the `video` bluepriNNt (see R-TPD-05). It MUST NOT have a standalone distribution entry, alias, redirect or dual path. Its `version` MUST remain `V_0-4-0` as skill frontmatter, and any change under `video/skills/**` MUST bump the `video` `blueprint_version`.

#### Scenario: Installing video yields a working skill
- GIVEN a clean `~/.agents/`
- WHEN the `video` bluepriNNt is installed
- THEN `~/.agents/skills/nn-video-script/SKILL.md` exists and its scripts run

#### Scenario: Old standalone location is gone
- GIVEN the repository after the change
- WHEN `skills/nn-video-script/` is looked up
- THEN it does not exist and nothing references it

### Requirement: Embedded Skill Tests Run In Verify

Test suites that live inside the embedded skill MUST be discovered and executed by `node scripts/verify.js`, without double-running suites already collected from `iNNfo/packages`. Moving the suites MUST NOT reduce the number of executed suites.

#### Scenario: Moved suites still run
- GIVEN the skill's suites under `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/test/`
- WHEN `node scripts/verify.js` collects suites
- THEN each moved suite is in the executed set
- AND the total suite count is not lower than before the move
