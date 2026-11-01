# Video Template Specification (cogNNitive Video Migration Delta)

## Purpose

Updates the `video-template` capability to migrate procedural workflows and naming conventions from legacy external desktop software to internal conversational and CLI tooling provided by `cogNNitive Video`.

## Requirements

### Requirement: Video Generation Procedure Migration

The video production template MUST provide the video generation procedure under the canonical name `generate_video_script_NN.md`. This procedure MUST instruct and orchestrate script authoring, asset synthesis, composition generation, and video rendering using internal `cogNNitive Video` CLI tools instead of external desktop applications, following the workflow estimate, approve, produce, thumbnails, finalize: it MUST render one 1920x1920 master and derive every other format from it, and MUST write the platform-neutral `description.md` chapter block only after the render. The template MUST NOT ship any deprecated redirect procedure alongside it.
(Previously: the procedure listed no workflow order; the description was authored before durations existed and a native 9:16 master was an option.)

Source: D3, D6, D8.

#### Scenario: Script-to-video workflow executed via cogNNitive Video CLI
- GIVEN a video project utilizing the `video` template
- WHEN the `generate_video_script_NN.md` procedure is executed
- THEN all asset generation, composition compilation, and rendering steps invoke cogNNitive Video CLI commands without prompting the user to open external desktop software

#### Scenario: No deprecated procedure is shipped
- GIVEN the video template's `procedures` list
- WHEN it is inspected
- THEN `generate-video-script` is the only script-generation procedure and no entry is marked deprecated

#### Scenario: Single master and late description
- GIVEN the procedure's steps
- WHEN they are read in order
- THEN a single 1920x1920 render precedes format derivation and the chapter block is generated after the render
- AND no step recompiles for a 9:16 master

### Requirement: Naming Rebranding

All video template definitions, procedure instructions, element metadata, and documentation MUST use `cogNNitive Video` as the canonical capability brand, replacing the retired external product names.

#### Scenario: Verification of rebranded terminology across templates
- GIVEN video template files, skills, and procedure specifications
- WHEN inspected for legacy application branding
- THEN all active references reflect `cogNNitive Video` and no retired external product name remains (enforced by `scripts/lib/brand-purge-guard.js`)

#### Scenario: Script format and engine identification
- GIVEN generated video script artifacts and manifests
- WHEN inspected for generator engine metadata
- THEN the engine metadata identifies `cogNNitive Video` as the authoring and rendering system

---

### Requirement: Interactive Provider Consultation and Cost Gate

The `generate_video_script_NN.md` procedure MUST enforce an interactive consultation and cost approval gate prior to asset synthesis. The AI Agent MUST explain the tradeoffs among available image and voiceover providers and models, present an itemized per-scene cost breakdown and total estimated budget, and obtain explicit user approval before synthesizing assets or incurring credit spend.

#### Scenario: Pre-synthesis interactive approval gate
- GIVEN an authored and validated video script
- WHEN the procedure reaches the asset planning phase
- THEN the agent presents the provider options, explains tradeoffs, outputs the per-scene and total cost estimation, and awaits user confirmation before triggering asset compilation

---

### Requirement: Video bluepriNNt Owns Its Script Skill

The `video-script` bluepriNNt package MUST embed `nn-video-script` under `skills/nn-video-script/`. The `video-script` `spec_NN.md` and `design-presets` references to the skill MUST describe it as embedded in the bluepriNNt. A change under `video-script/skills/**` MUST be accompanied by a `video-script` `blueprint_version` bump, a new `blueprints-v*` tag and a repin.

#### Scenario: Skill is discoverable from the video-script bluepriNNt
- GIVEN the `video-script` package
- WHEN `list_blueprint_skills video-script` runs
- THEN `nn-video-script` is returned as an embedded skill

#### Scenario: Release tag accompanies the bump
- GIVEN the `video-script` package with changed `skills/**` content and a bumped `blueprint_version`
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
