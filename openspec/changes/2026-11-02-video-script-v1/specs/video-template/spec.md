# Delta for video-template

Change `2026-11-02-video-script-v1`. Decisions D4, D6, D13: the template's procedure becomes the draft production procedure; everything deterministic belongs to `produce`.

## MODIFIED Requirements

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
