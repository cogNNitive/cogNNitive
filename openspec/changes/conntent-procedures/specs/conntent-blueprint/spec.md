# Delta for conntent-blueprint

The coNNtent bluepriNNt shipped only its setup and authoring procedures. The production
procedures a video domaiNN actually ran (drafting single-visual scenes and routing a video
request to the right series) lived only in one external domaiNN, in Spanish and tied to its
series, vendors and machine. Two generic procedures are promoted into the bluepriNNt; source
selection is not one of them, because acquiring sources belongs to a domaiNN that specializes
in it.

## ADDED Requirements

### Requirement: The bluepriNNt declares and ships the generic production procedures

The `procedures:` frontmatter list of `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md` MUST declare `draft-scene-visuals` at `procedures/draft_scene_visuals_procedures_NN.md` and `produce-video` at `procedures/produce_video_procedures_NN.md`.
Every procedure the list declares MUST resolve through the bluepriNNt floor loader under the id its file name yields, with no loader or resolution error.
The bluepriNNt MUST NOT declare or ship a `select-news` procedure.
Both procedures MUST be written in English and MUST carry no series name, vendor or model id, machine path or person's name.
Every step of both procedures MUST declare exactly one tool from `agent`, `engine`, `console` and `human`, with the field that tool contributes.

#### Scenario: The runner resolves the declared procedures
- GIVEN the coNNtent bluepriNNt package
- WHEN its `procedures/` folder is loaded and resolved as the bluepriNNt floor
- THEN `draft-scene-visuals` and `produce-video` are selected
- AND every id in the `procedures:` list resolves to the path it declares
- AND no diagnostic of severity error is reported

#### Scenario: Source selection stays out of the bluepriNNt
- GIVEN the coNNtent bluepriNNt package
- WHEN its `procedures:` list and its `procedures/` folder are read
- THEN neither names a `select-news` procedure

### Requirement: draft-scene-visuals gates the draft on existing media

`draft-scene-visuals` MUST capture the clean screenshots and render the HyperFrames clips of its visual scenes before its media gate step.
The media gate step MUST stop the procedure, naming each missing file and its scene, until the clean screenshots and the rendered HyperFrames clips exist in the episode's media folder (`series/<s>/episodes/<slug>/media/`, or `assets/<slug>/media/` in a domaiNN on the older layout).
The media gate step MUST come before the step that drafts the scenes, and it applies equally before a draft JSON or `build-draft-html.mjs` in a domaiNN that still drafts that way.
The gate is a documented procedure step and is not a hard check inside an engine script.
The procedure MUST end in a human approval of the proposed draft.

#### Scenario: A missing clip stops the draft
- GIVEN an episode whose visual scene needs a HyperFrames clip that was not rendered
- WHEN the agent reaches the media gate step
- THEN the procedure stops and names the missing clip and its scene
- AND no draft is written

### Requirement: produce-video routes a video request to the procedure the series declares

`produce-video` MUST list the series of the domaiNN through their scope documents, the files whose frontmatter carries `scope: true`, and never by folder name alone.
`produce-video` MUST read the procedure the chosen series declares, through `list_blueprint_procedures` from the series folder and the `fills:` of its scope document, and MUST hand the run off with `procedure_start` from that series folder.
`produce-video` MUST NOT invent a slot value and MUST NOT spend anything itself.

#### Scenario: A series that fills draft-scene-visuals gets it
- GIVEN a domaiNN with one series whose scope document fills `draft-scene-visuals`
- WHEN a person asks for a video without naming a series
- THEN `produce-video` lists that series from its scope document
- AND hands off to `draft-scene-visuals` with `procedure_start` from the series folder
