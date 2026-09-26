# Video Script Skill Specification

## Purpose

Defines the cogNNitive-owned skill that authors Anydeo VUS video scripts inside an iNNfo workspace. It replaces the video template's dangling reference to `anydeo-script-builder` (which exists only in VidGeNN) with a forked, iNNfo-aware skill, pinned mechanically to a single canonical VUS spec source.

## Requirements

### Requirement: Forked Skill With One-Way Dependency

The system MUST provide a cogNNitive skill, forked from VidGeNN's `anydeo-script-builder` and named with the `nn-` prefix under `skills/` (e.g. `skills/nn-video-script/`), that authors Anydeo VUS scripts and understands iNNfo workspace structure (Series/Video registration). The dependency direction MUST be cogNNitive → VidGeNN only; VidGeNN MUST NOT reference or depend on the forked skill.

#### Scenario: Skill authors a script inside a workspace
- GIVEN a workspace with a registered Video Element and its owning Series
- WHEN the forked skill authors a script for that Video
- THEN the script is written to the Video's own folder and no VidGeNN-specific paths are referenced

#### Scenario: VidGeNN stays unaware of the fork
- GIVEN the VidGeNN repository
- WHEN inspected for references to the forked skill
- THEN none exist; VidGeNN remains a read-only reference

### Requirement: Machine-Checkable VUS Spec Pin

The forked skill MUST declare a pinned VUS spec version in its frontmatter and in `manifest/source.yaml`, following the existing template-pinning pattern. The pin MUST reference exclusively `VidGeNN/packages/core/specs/V_0-3-3.json` as the canonical source. It MUST NOT reference `.agent/skills/anydeo-script-builder/specs/V_0-3-3.json`, a divergent, stale copy. A check MUST validate the pin mechanically and fail when the declared pin does not resolve to the canonical file or when its content has drifted.

#### Scenario: Pin check passes against the canonical copy
- GIVEN the skill's declared pin points at `packages/core/specs/V_0-3-3.json`
- WHEN the pin-validation check runs
- THEN it passes with zero warnings

#### Scenario: Pin check fails on the non-canonical copy
- GIVEN a skill file that references `.agent/skills/anydeo-script-builder/specs/V_0-3-3.json`
- WHEN the pin-validation check runs
- THEN it fails, naming the non-canonical path as the reason

### Requirement: No-Prose-Copy of VUS Syntax Facts

The skill's own documentation and prompts MUST NOT restate voice IDs, property names, or other VUS-syntax facts as literal prose. Every such fact MUST be resolved by reading the pinned spec file at run time.

#### Scenario: Voice ID resolved from the pinned spec
- GIVEN a script that needs a valid `voice_id`
- WHEN the skill selects a voice
- THEN it reads the value from the pinned `V_0-3-3.json`, never from a hardcoded list in its own prose

#### Scenario: Restated voice ID rejected in review
- GIVEN a skill document containing a literal voice-ID string not sourced from the pinned spec
- WHEN skill content is reviewed against this requirement
- THEN it is flagged as a no-prose-copy violation (the `English_Deep-VoicedGentleman` class of bug)
