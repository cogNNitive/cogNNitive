# Delta for video-script-skill

Scope: the skill ships neutral slot fallbacks and a slot reference doc; versions bump.

## ADDED Requirements

### Requirement: Skill Ships Neutral Slot Fallbacks And A Slot Reference

The skill MUST ship exactly one neutral fallback component per slot (`title`, `lower-third`,
`caption`, `quote`, `watermark`, `b-roll`), each accepting the variables its slot declares. It
MUST ship a reference doc that, per slot, lists the declared variables and gives a one-line
registry hint. Shipped components and docs MUST be English-only and MUST NOT name any concrete
series language or sound file.

#### Scenario: Every slot has a fallback

- GIVEN a fresh install of the skill
- WHEN the shipped components are listed
- THEN one fallback exists for each of the six slots

#### Scenario: Fresh install renders and checks clean

- GIVEN a fresh install and a script using every slot, with no series overrides
- WHEN the project is emitted
- THEN `hyperframes check` reports zero errors

#### Scenario: Reference doc covers each slot

- GIVEN the slot reference doc
- WHEN it is inspected
- THEN each slot lists its variables and one registry hint line

## MODIFIED Requirements

### Requirement: Skill Is Installed By Projection From The video bluepriNNt

The skill MUST be made available to agents at `~/.agents/skills/nn-video-script/` solely by
installing the `video-script` bluepriNNt. It MUST NOT have a standalone distribution entry, alias,
redirect or dual path. Its `version` MUST be `V_0-6-0` as skill frontmatter, the `video-script`
blueprint version MUST be `V_0-4-0`, and any change under `video-script/skills/**` MUST bump the
`video-script` `blueprint_version`. Every registry that records these versions MUST be updated
in the same change.
(Previously: skill version pinned to `V_0-5-0`; blueprint at `V_0-3-8`.)

#### Scenario: Installing video-script yields a working skill

- GIVEN a clean `~/.agents/`
- WHEN the `video-script` bluepriNNt is installed
- THEN `~/.agents/skills/nn-video-script/SKILL.md` exists and its scripts run

#### Scenario: Renderer change bumps the blueprint version

- GIVEN a change under `video-script/skills/**`
- WHEN the manifest pin is validated
- THEN the `video-script` `blueprint_version` is bumped

#### Scenario: Versions are registered consistently

- GIVEN the bumped skill and blueprint versions
- WHEN `node scripts/verify.js` runs
- THEN it passes with no version-registration mismatch
