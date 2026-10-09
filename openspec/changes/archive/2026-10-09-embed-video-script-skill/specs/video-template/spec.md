# Video Template Specification (delta)

## ADDED Requirements

### Requirement: Video bluepriNNt Owns Its Script Skill

The `video` bluepriNNt package MUST embed `nn-video-script` under `skills/nn-video-script/`. The `video` `spec_NN.md` and `design-presets` references to the skill MUST describe it as embedded in the bluepriNNt. A change under `video/skills/**` MUST be accompanied by a `video` `blueprint_version` bump (from V_0-7-2 onward), a new `blueprints-v*` tag and a repin.

#### Scenario: Skill is discoverable from the video bluepriNNt
- GIVEN the `video` package
- WHEN `list_blueprint_skills video` runs
- THEN `nn-video-script` is returned as an embedded skill

#### Scenario: Release tag accompanies the bump
- GIVEN the `video` package with changed `skills/**` content and a bumped `blueprint_version`
- WHEN the manifest pin is validated
- THEN it resolves to a merged `blueprints-v*` tag that contains the new content

### Requirement: Procedures Reference The Installed Skill Path

The `generate_video_script_procedures_NN.md` procedure MUST reference the skill's tools through the installed, stable location `~/.agents/skills/nn-video-script/scripts/...`, and MUST NOT reference `skills/nn-video-script/` at the repository root or a bluepriNNt-package-relative path.

#### Scenario: NN Tools paths use the installed location
- GIVEN the video generation procedure
- WHEN its NN Tools commands are inspected
- THEN every skill script path begins with `~/.agents/skills/nn-video-script/scripts/`

#### Scenario: No repository-root skill path remains
- GIVEN all `video` and `design-presets` package files
- WHEN searched for `skills/nn-video-script/` not preceded by `~/.agents/`
- THEN the only matches are the embedded folder's own internal relative paths
