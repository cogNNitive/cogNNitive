# Delta for video-template

Scope: the generation procedure follows the simplified workflow with a single master and the description written after render. Design decision ids refer to `design.md` of change `2026-11-01-video-folder-contract`. The relation between the canonical procedure name `generate_video_script_NN.md` kept here and the shipped blueprint procedures `produce-video_procedures_NN.md` and `draft-scene-visuals_procedures_NN.md` (capability `video-script-skill`) is not settled by the design; this delta keeps the existing name and changes only the orchestrated workflow.

## MODIFIED Requirements

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
