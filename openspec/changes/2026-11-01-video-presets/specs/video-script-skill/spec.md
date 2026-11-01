# Delta for video-script-skill

Scope: draft authoring tools and dev tooling move to the renamed fields and to `presets`; a one-shot migration script ships; legacy keys in persisted review state are rejected loudly. Design decision ids refer to `design.md` of change `2026-11-01-video-presets`.

## ADDED Requirements

### Requirement: Video Presets Migration Script

The repository MUST ship `scripts/dev/migrate-video-presets.mjs`, with its pure core in `scripts/dev/lib/video-presets-migration.mjs`, invoked as `node scripts/dev/migrate-video-presets.mjs <domain-dir> [--apply] [--json]`; it MUST run as a dry run by default, MUST write nothing without `--apply`, and `--apply` MUST be all-or-nothing (D8).

The script MUST exit with code 1 when any conflict is found, in which case it MUST write nothing even with `--apply`, and MUST report every change, drop, warning and conflict, as JSON when `--json` is given.

#### Scenario: Dry run writes nothing

- GIVEN a domain directory with V_0-13-11 documents
- WHEN the script runs without `--apply`
- THEN it reports every planned change
- AND no file is created, modified or deleted

#### Scenario: Apply rewrites all files

- GIVEN the same domain directory and no conflicts
- WHEN the script runs with `--apply`
- THEN every reported change is written and the exit code is 0

#### Scenario: A conflict blocks all writes

- GIVEN a domain where two moved Presets with the same name land in one target document, or no target document exists for a moved Preset
- WHEN the script runs with `--apply`
- THEN it exits 1, reports the conflict
- AND no file is changed

#### Scenario: JSON report

- GIVEN any run with `--json`
- WHEN it completes
- THEN standard output is one parseable JSON document listing changes, drops, warnings and conflicts

### Requirement: Migration Rewrites

The migration MUST rewrite documents whose `parent_spec.name` starts with `video-script_V_`, `templates_*_NN.md` files, chain scope markers and the root `video-defaults_NN.md` according to these rules.

| Rewrite | Rule |
|---|---|
| Field renames | `tts_model` to `voice_model`, `music` to `background_audio`, `music_volume` to `background_audio_volume`, `presenter_asset` to `avatar`, `intro_asset` to `intro`, Template `speed`/`emotion` to `voice_speed`/`voice_emotion`, Layer-only `level::` to `z_index::` (frontmatter `level:` untouched) |
| Layer `model::` | becomes `avatar_model::` when that field is absent; when both are present `model` is dropped and reported |
| `template::` | `template:: [[Doc :: Name]]` or `Name` becomes `presets:: [Name]` using the last `::` segment |
| Template data | `# NN Template` elements become `# NN Preset`, are moved into the innermost scope document covering the templates file's folder (else `series_NN.md`, else the domain `video-defaults_NN.md`) and are appended after its first section; emptied `templates_*_NN.md` files are deleted |
| Removed fields | `tool` and Video `voice_id` are dropped and reported; `voice_id` is NOT converted to `voice` |
| Version | `parent_spec.name` becomes `video-script_V_0-14-0` |
| JSON drafts | `*_reviewed.json` and draft `*.json`: `template` to `presets: [Name]`, `music*` to `background_audio*`, `speed` to `voice_speed` |
| HTML consoles | quine consoles are listed for regeneration and are not edited |

#### Scenario: Fields and version are renamed

- GIVEN a V_0-13-11 script using `tts_model::`, `music::`, `music_volume::`, `presenter_asset::` and a Layer `level:: 2`
- WHEN the migration is applied
- THEN the script uses `voice_model::`, `background_audio::`, `background_audio_volume::`, `avatar::` and `z_index:: 2`
- AND its `parent_spec.name` is `video-script_V_0-14-0` and its frontmatter `level:` is untouched

#### Scenario: template reference becomes presets list

- GIVEN a Scene with `template:: [[Studio :: Lucas]]`
- WHEN the migration is applied
- THEN the Scene has `presets:: [Lucas]`

#### Scenario: Template data moves into the covering scope document

- GIVEN `templates_x_NN.md` holding `# NN Template` elements in a folder covered by a Series document
- WHEN the migration is applied
- THEN the elements appear as `# NN Preset` sections after the first section of that Series document
- AND the emptied `templates_x_NN.md` is deleted

#### Scenario: Removed fields are dropped and reported

- GIVEN a Template with `tool:: wavespeed` and a Video with `voice_id:: abc`
- WHEN the migration runs
- THEN both are dropped and appear in the report
- AND no `voice` field is created from `voice_id`

#### Scenario: Both model and avatar_model present

- GIVEN a Layer declaring `model:: a` and `avatar_model:: b`
- WHEN the migration is applied
- THEN `model` is dropped, `avatar_model:: b` remains and the drop is reported

#### Scenario: JSON drafts and consoles

- GIVEN a `*_reviewed.json` with `template`, `music_volume` and `speed`, and a quine HTML console
- WHEN the migration is applied
- THEN the JSON carries `presets: [Name]`, `background_audio_volume` and `voice_speed`
- AND the console is listed for regeneration and left unedited

### Requirement: Migration Is Idempotent And Precedence-Aware

A second run of the migration over an already migrated domain MUST report zero changes, and the migration MUST warn for every Scene whose explicit `voice` or `tts_model` differs from its Template's value, because that Scene's cache key changes under the corrected precedence.

#### Scenario: Second run is a no-op

- GIVEN a domain migrated with `--apply`
- WHEN the script runs again
- THEN it reports zero changes, exits 0 and writes nothing

#### Scenario: Precedence warning

- GIVEN a Scene with explicit `voice:: own` referencing a Template whose `voice` is `other`
- WHEN the migration runs
- THEN a warning names the Scene and states that its cache key will change

#### Scenario: Unaffected Scenes keep their cache key

- GIVEN a golden fixture migrated from V_0-13-11 whose Scenes have no explicit voice conflicting with their Template
- WHEN the TTS hashes before and after migration are compared
- THEN they are identical for every Scene

### Requirement: Legacy Keys In Persisted State Are Rejected

`build-script-from-draft` and the review console loader MUST fail with the error `legacy-draft-keys`, naming the script and the legacy keys found, when a reviewed or draft JSON carries a retired key (`template`, `music`, `music_volume`, `speed`, `emotion`, `tts_model`, `presenter_asset`, `intro_asset`), and MUST NOT ignore or translate it. Plan approval hashes script content, so migrated scripts MUST be re-approved; no spend is involved.

#### Scenario: Reviewed JSON with a legacy key fails

- GIVEN a `*_reviewed.json` containing `music_volume`
- WHEN `build-script-from-draft` runs on it
- THEN it fails with `legacy-draft-keys` naming the script and `music_volume`
- AND no script is written

#### Scenario: Console loader fails loudly

- GIVEN a draft JSON containing `template`
- WHEN the review console loads it
- THEN it reports `legacy-draft-keys` naming the script instead of silently dropping the key

#### Scenario: Migrated JSON loads

- GIVEN a draft JSON migrated by the script
- WHEN `build-script-from-draft` runs on it
- THEN it succeeds

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
