# Video Template Specification (cogNNitive Video Migration Delta)

## Purpose

Updates the `video-template` capability to migrate procedural workflows and naming conventions from legacy external desktop software to internal conversational and CLI tooling provided by `cogNNitive Video`.
## Requirements
### Requirement: Video Generation Procedure Migration

The video production template MUST provide the video generation procedure under the canonical name `generate_video_script_NN.md`. This procedure MUST be the draft production procedure: it MUST instruct the agent to propose the creative content of an episode as a changeset (see capability `video-script-skill` "Draft Procedure Emits A Proposed Changeset"), then to hand the episode to the review and to `produce <episode>`, using internal `cogNNitive Video` CLI tools instead of external desktop applications. It MUST NOT sequence engine steps, MUST NOT describe a native 9:16 master, and MUST state that the chapter block of `description.md` is written by `produce` after the render. The template MUST NOT ship any deprecated redirect procedure alongside it.
(Previously: the procedure orchestrated authoring, asset synthesis, composition and rendering in the order estimate, approve, produce, thumbnails, finalize.)

Source: D3, D6, D8.

#### Scenario: Script-to-video workflow executed via cogNNitive Video CLI

- GIVEN a video project utilizing the `video` template
- WHEN the `generate_video_script_NN.md` procedure is executed
- THEN the agent delivers a proposed changeset and the only engine command invoked is `produce`, without prompting the user to open external desktop software

#### Scenario: No deprecated procedure is shipped

- GIVEN the video template's `procedures` list
- WHEN it is inspected
- THEN `generate-coNNtent` is the only script-generation procedure and no entry is marked deprecated

#### Scenario: Agent does not sequence the engine

- GIVEN the procedure's steps
- WHEN they are read in order
- THEN no step tells the agent to run `compile`, `synthesize-avatar`, `render` or a finalize step
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

The `generate_video_script_NN.md` procedure MUST enforce the cost gate prior to asset synthesis through the engine budget gate: below the cascaded `budget` the cost is auto-approved, above it the AI Agent MUST explain the tradeoffs among available image and voiceover providers and models from the merged catalog, present the itemized per-scene cost breakdown and total estimated budget, and obtain explicit user approval of the plan hash before any credit spend.
(Previously: explicit approval was required for every run, before asset synthesis.)

#### Scenario: Over-budget approval gate

- GIVEN an authored script whose estimate exceeds the budget
- WHEN the procedure reaches the budget gate
- THEN the agent presents the provider options, explains tradeoffs, outputs the per-scene and total cost estimation, and awaits user confirmation before spend

#### Scenario: Under-budget run needs no approval

- GIVEN an estimate not above the budget
- WHEN the procedure reaches the budget gate
- THEN no user approval is requested and the run continues

### Requirement: Video bluepriNNt Owns Its Script Skill

The `coNNtent` bluepriNNt package MUST embed `nn-conntent` under `skills/nn-conntent/`. The `coNNtent` `spec_NN.md` and `design-presets` references to the skill MUST describe it as embedded in the bluepriNNt. A change under `coNNtent/skills/**` MUST be accompanied by a `coNNtent` `blueprint_version` bump, a new `blueprints-v*` tag and a repin.

#### Scenario: Skill is discoverable from the coNNtent bluepriNNt
- GIVEN the `coNNtent` package
- WHEN `list_blueprint_skills coNNtent` runs
- THEN `nn-conntent` is returned as an embedded skill

#### Scenario: Release tag accompanies the bump
- GIVEN the `coNNtent` package with changed `skills/**` content and a bumped `blueprint_version`
- WHEN the manifest pin is validated
- THEN it resolves to a merged `blueprints-v*` tag that contains the new content

### Requirement: Procedures Reference The Installed Skill Path

The `generate_video_script_procedures_NN.md` procedure MUST reference the skill's tools through the installed, stable location `~/.agents/skills/nn-conntent/scripts/...`, and MUST NOT reference `skills/nn-conntent/` at the repository root or a bluepriNNt-package-relative path.

#### Scenario: NN Tools paths use the installed location
- GIVEN the video generation procedure
- WHEN its NN Tools commands are inspected
- THEN every skill script path begins with `~/.agents/skills/nn-conntent/scripts/`

#### Scenario: No repository-root skill path remains
- GIVEN all `video` and `design-presets` package files
- WHEN searched for `skills/nn-conntent/` not preceded by `~/.agents/`
- THEN the only matches are the embedded folder's own internal relative paths

