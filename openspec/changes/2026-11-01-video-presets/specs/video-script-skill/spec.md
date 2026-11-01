# Delta for video-script-skill

Scope: draft authoring tools and dev tooling move to the renamed fields and to `presets`; legacy keys in persisted review state are rejected loudly. No migration tool ships: documents written for an earlier blueprint version are rejected, not converted. Design decision ids refer to `design.md` of change `2026-11-01-video-presets`.

## ADDED Requirements

### Requirement: Legacy Keys In Persisted State Are Rejected

`build-script-from-draft` and the review console loader MUST fail with the error `legacy-draft-keys`, naming the script and the legacy keys found, when a reviewed or draft JSON carries a retired key (`template`, `music`, `music_volume`, `speed`, `emotion`, `tts_model`, `presenter_asset`, `intro_asset`), and MUST NOT ignore or translate it. The check applies to `config[].key`, `videoOverrides` keys, per-scene override keys and `scenes[].template`; `scenes[].choice.model` is an avatar model id and is NOT a legacy key, and off-schema keys are not legacy keys. A rejected file is never converted: the author re-drafts it or produces that episode with the earlier blueprint version.

#### Scenario: Reviewed JSON with a legacy key fails

- GIVEN a `*_reviewed.json` containing `music_volume`
- WHEN `build-script-from-draft` runs on it
- THEN it fails with `legacy-draft-keys` naming the script and `music_volume`
- AND no script is written

#### Scenario: Console loader fails loudly

- GIVEN a draft JSON containing `template`
- WHEN the review console loads it
- THEN it reports `legacy-draft-keys` naming the script instead of silently dropping the key

### Requirement: Dev Tooling Emits Current Field Names

`scripts/dev/adopt-video-plan.mjs`, `scripts/dev/lib/series-values.mjs` and `scripts/dev/validate-scope-golden.mjs` MUST emit and accept only the current field names, and `adopt-video-plan` MUST hoist a Video's voice as `voice`, not `voice_id`.

#### Scenario: Adopt plan hoists voice

- GIVEN a plan whose videos share one voice
- WHEN `adopt-video-plan` produces the series document
- THEN it declares `voice:: <value>` and no `voice_id`

#### Scenario: Series values use new names

- GIVEN a series that sets a volume and an avatar
- WHEN `series-values` emits the document
- THEN it writes `background_audio_volume` and `avatar`, never `music_volume` or `presenter_asset`

### Requirement: Skill Documents Presets And Carries No Retired Vocabulary

SKILL.md and the skill references MUST document Presets, the `presets` list and the new field names, and the reference documenting Template data (`series-template-convention.md`) MUST be replaced by one documenting Presets. The blueprint, skill and dev tooling MUST contain none of the retired field names as `::` fields or JSON keys outside `openspec/changes/archive/`.

#### Scenario: Retired names are absent

- GIVEN the blueprint, the skill and `scripts/dev`
- WHEN they are searched for `tts_model::`, `music_volume::`, `presenter_asset::`, `intro_asset::` and `template::`
- THEN no match is found

#### Scenario: Template convention document is gone

- GIVEN the skill's `references/`
- WHEN it is listed
- THEN `series-template-convention.md` does not exist and a Presets reference does

## MODIFIED Requirements

### Requirement: Blueprint-Ships Draft Authoring Tools

The skill MUST ship the draft authoring tools: `build-draft-html.mjs` (draft JSON → a self-contained review HTML with embedded thumbnails and a reviewed-JSON exporter) and `build-script-from-draft.mjs` (reviewed JSON → a valid L3 `video-script` document). Thumbnails MUST be produced by the single `render-thumbnail.mjs` tool. The draft JSON schema MUST be named neutrally (`video-script.draft.v1`). The tools MUST read series values through the parameter cascade (series, then domain Video Defaults, then package Video Defaults), resolved by nn-core from the scope chain of the input file's folder (or `--series <dir>`). There MUST be no `video.series.json`, `--config` flag or built-in series config. The generated script's frontmatter MUST be copied from the series document and its filename MUST use the Series slug. The tools MUST NOT write cascaded scene values that the engine resolves itself, MUST write a Preset choice as `presets:: [..]`, MUST NOT write a literal presenter `asset::`, MUST resolve `intro` through the cascade into the fixed scene's background `asset::`, and MUST NOT hardcode any series' preset names, scene slugs, background audio, filename pattern or model. The review console MUST export the renamed keys (`presets`, `background_audio`, `background_audio_volume`, `voice_speed`, `avatar_*`).
(Previously: the tools wrote `template::`, `music`, `music_volume`, `speed` and a literal presenter `asset::` read from `presenter_asset`, and must not hardcode template names or music.)

#### Scenario: Tools run against any series

- GIVEN a series folder whose `series_NN.md` declares `title:: Other Series`
- WHEN `build-script-from-draft.mjs` runs on a reviewed draft in that series
- THEN the filename uses the Series slug and the script frontmatter matches the series document

#### Scenario: No series is hardcoded

- GIVEN the tools
- WHEN they are inspected
- THEN no series' name, preset name, scene slug, background audio path or filename pattern appears in prose or code

#### Scenario: Generated script validates

- GIVEN a reviewed draft JSON in a series folder
- WHEN `build-script-from-draft.mjs` runs
- THEN it emits an L3 document that validates against the `video-script` blueprint with no schema errors

#### Scenario: Review HTML is self-contained

- GIVEN a draft JSON referencing thumbnails
- WHEN `build-draft-html.mjs` runs
- THEN the HTML embeds the thumbnails (base64), opens from `file://`, shows the Series `title`, and exports `<slug>_reviewed.json`

#### Scenario: One thumbnail tool

- GIVEN the skill's `scripts/`
- WHEN it is listed
- THEN `render-thumbnail.mjs` exists and `thumbnail-v1.mjs` does not

#### Scenario: Series value comes from the nn-core chain

- GIVEN a series that sets no `background_audio_volume` and a domain Video Defaults that sets one
- WHEN a tool resolves `background_audio_volume` for a draft in that series
- THEN the domain value is used
- AND the resolution trace names the domain Video Defaults as supplier

#### Scenario: Preset choice is written as a list

- GIVEN a reviewed draft whose Scene selects `Lucas` then `Studio Warm`
- WHEN `build-script-from-draft.mjs` runs
- THEN the Scene contains `presets:: [Lucas, Studio Warm]`

#### Scenario: Presenter asset is not written literally

- GIVEN a series that declares `avatar:: lucas.png` and a reviewed draft with a presenter Layer
- WHEN `build-script-from-draft.mjs` runs
- THEN the presenter Layer has no literal `asset::` line
- AND the engine resolves the image from the cascaded `avatar`

#### Scenario: Chosen avatar resolution is kept for any quality - GIVEN a reviewed draft whose quality is not `ALTA` and whose presenter choice is `480p`
- WHEN `build-script-from-draft.mjs` runs
- THEN the presenter Layer contains `avatar_resolution:: 480p`
- AND the resolution is not written only when the quality is `ALTA`

#### Scenario: Legacy choice.model is not rejected - GIVEN a reviewed draft with `scenes[].choice.model` set to an avatar model id
- WHEN `build-script-from-draft.mjs` runs
- THEN no `legacy-draft-keys` error is raised for it

#### Scenario: Intro is resolved through the cascade

- GIVEN a series that declares `intro:: intro.mp4`
- WHEN `build-script-from-draft.mjs` runs
- THEN the fixed intro scene's background `asset::` is `intro.mp4`

### Requirement: Domain Adoption Copies The Video Defaults

SKILL.md MUST instruct the agent, when a domain adopts the `video-script` bluepriNNt and its root has no `video-defaults_NN.md`, to copy the package's `defaults/video-defaults_NN.md` there unchanged. Domain tuning MUST be an edit of that copy, and a domain MAY add `# NN Preset` sections to it. No script MUST create it.
(Previously: no mention of domain Presets; the defaults scenario searched for `0.2` as a music-volume default.)

#### Scenario: Adoption step is documented

- GIVEN SKILL.md
- WHEN its domain setup section is read
- THEN it names the package source path and the domain-root destination of the copy

#### Scenario: Fresh install renders and checks clean

- GIVEN a fresh install and a script using every slot, with no series overrides
- WHEN the project is emitted
- THEN `hyperframes check` reports zero errors

#### Scenario: Defaults live only in the defaults document

- GIVEN the skill's `scripts/` tree
- WHEN it is searched for `whoosh`, `minimax/speech-2.8-hd` or `0.2` as a background-audio-volume default
- THEN none is found
