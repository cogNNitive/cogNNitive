# Video Script Skill Specification

## Purpose

Defines the cogNNitive-owned skill that authors native iNNfo Level-3 video-script documents inside an iNNfo workspace. The skill is embedded in the `video-script` blueprint package; script validity is enforced by the `video-script` blueprint, with no external repository dependency.

## Requirements

### Requirement: Authors iNNfo L3 Script Documents

The skill MUST author video scripts as iNNfo Level-3 kNNowledge documents that adopt the `video-script` blueprint. The skill MUST NOT author VUS scripts and MUST NOT ship, vendor, or invoke a VUS parser.

#### Scenario: Skill authors an L3 document

- GIVEN a workspace with a registered Video Element and its owning Series
- WHEN the skill authors a script for that Video
- THEN it writes an iNNfo L3 document adopting the `video-script` blueprint
- AND the document validates against the blueprint

#### Scenario: No VUS parser artifact present

- GIVEN the skill directory
- WHEN its files are inspected
- THEN no vendored VUS parser artifact is present
- AND no VUS parse code path is referenced

### Requirement: Owned Skill With No External Dependency

The system MUST provide a cogNNitive-owned video-script skill embedded in the `video-script` bluepriNNt package at `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/` that authors iNNfo Level-3 video-script documents and understands iNNfo workspace structure (Series/Video registration). The skill MUST NOT depend on, fork from at run time, or reference any repository outside the monorepo. (Previously: it authored VUS scripts using a vendored parser and VUS specification, embedded in the `video` bluepriNNt package.)

#### Scenario: Skill authors a document with no external repository

- GIVEN a workspace with a registered Video Element and its owning Series, and no external video repository present
- WHEN the skill authors a document for that Video
- THEN the document is written to the Video's own folder
- AND no external-repository path is referenced

#### Scenario: No external reference remains

- GIVEN the skill directory
- WHEN its files are inspected
- THEN they reference no repository outside cogNNitive

#### Scenario: Installed copy authors with no monorepo checkout

- GIVEN the skill installed at `~/.agents/skills/nn-video-script/` with no monorepo present
- WHEN the skill authors a valid L3 script document
- THEN it succeeds using only artifacts committed inside the skill

### Requirement: No-Prose-Copy of Syntax Facts

The skill's own documentation and prompts MUST NOT restate blueprint Field names, allowed `type::` values, or other schema facts as literal prose. Every such fact MUST be resolved by reading the blueprint at run time. (Previously: the prose restricted VUS voice IDs and property names sourced from the pinned VUS spec.)

#### Scenario: Allowed layer type resolved from the blueprint

- GIVEN a document that needs a valid Layer `type::`
- WHEN the skill selects a value
- THEN it reads the allowed values from the `video-script` blueprint, never from a hardcoded list in its own prose

#### Scenario: Restated schema fact rejected in review

- GIVEN a skill document containing a literal Layer `type::` list not sourced from the blueprint
- WHEN skill content is reviewed against this requirement
- THEN it is flagged as a no-prose-copy violation

### Requirement: Declared Asset Provider Dependency

The skill MUST declare its external asset-provider dependency (TTS/media via WaveSpeed or Replicate) in its own frontmatter `depends_on`, so the setup step can check it. Direct provider fetch through environment-variable credentials SHALL remain the supported path in this change. The skill MUST NOT retain the local OS-native TTS fallback (Windows SAPI); it MUST be removed. Engine setup MUST verify provider credential and optional agent-MCP presence with user consent before proceeding.

#### Scenario: Provider dependency is declared

- GIVEN the skill's frontmatter
- WHEN it is inspected
- THEN it declares its asset-provider dependency under `depends_on`

#### Scenario: Local OS-native TTS fallback is gone

- GIVEN the skill scripts
- WHEN they are inspected
- THEN no OS-native (Windows SAPI) TTS synthesis path remains

#### Scenario: Setup checks provider credentials with consent

- GIVEN a workspace where the asset provider credential is absent
- WHEN the engine setup step runs
- THEN it reports the missing provider dependency and requests consent before any change

### Requirement: Skill Is Installed By Projection From The video bluepriNNt

The skill MUST be made available to agents at `~/.agents/skills/nn-video-script/` solely by installing the `video-script` bluepriNNt (see R-TPD-05). It MUST NOT have a standalone distribution entry, alias, redirect or dual path. Its `version` MUST remain `V_0-4-0` as skill frontmatter, and any change under `video-script/skills/**` MUST bump the `video-script` `blueprint_version`. (Previously: projected from the `video` bluepriNNt, which is retired by this change.)

#### Scenario: Installing video-script yields a working skill

- GIVEN a clean `~/.agents/`
- WHEN the `video-script` bluepriNNt is installed
- THEN `~/.agents/skills/nn-video-script/SKILL.md` exists and its scripts run

### Requirement: Embedded Skill Tests Run In Verify

Test suites that live inside the embedded skill MUST be discovered and executed by `node scripts/verify.js`, without double-running suites already collected from `iNNfo/packages`. Moving the suites MUST NOT reduce the number of executed suites.

#### Scenario: Moved suites still run

- GIVEN the skill's suites under `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/test/`
- WHEN `node scripts/verify.js` collects suites
- THEN each remaining suite is in the executed set

### Requirement: Compiler Resolves Layers via Explicit Parentage

The video script compiler MUST bind `Layer` elements to their parent `Scene` using explicit `parentSlug` values before falling back to slug prefix matching. Flat legacy scripts lacking `parentSlug` MUST continue resolving via slug prefix fallback.

#### Scenario: Nested layers bind by parent slug

- GIVEN a script with nested Layer elements specifying `parentSlug`
- WHEN the compiler builds the scene manifest
- THEN each Layer binds to its parent Scene via `parentSlug`

#### Scenario: Flat legacy layers fall back to slug prefix

- GIVEN a legacy script lacking `parentSlug`
- WHEN the compiler builds the scene manifest
- THEN each Layer binds to its Scene via slug prefix
