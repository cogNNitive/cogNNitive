# Delta for video-script-skill

Scope: draft authoring tools and dev tooling move to the renamed fields and to `presets`; a one-shot migration script ships; legacy keys in persisted review state are rejected loudly. Design decision ids refer to `design.md` of change `2026-11-01-video-presets`.

## ADDED Requirements

### Requirement: Video Presets Migration Script

The repository MUST ship `scripts/dev/migrate-video-presets.mjs`, with its pure core in `scripts/dev/lib/video-presets-migration.mjs`, invoked as `node scripts/dev/migrate-video-presets.mjs <domain-dir> [--steps presets[,layout]] [--apply] [--json]`; it MUST run as a dry run by default, MUST write nothing without `--apply`, and `--apply` MUST be all-or-nothing (D8). (real-domain review) The script MUST be an ordered pipeline of steps: `presets` is the only step implemented by this change and the default for `--steps`, any other step name MUST be a usage error, and the selected steps MUST share one document scan, one dry-run report and one atomic apply (see design "Companion change").

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

#### Scenario: Steps selection (real-domain review)

- GIVEN a run with `--steps presets`, or with no `--steps`
- WHEN it completes
- THEN only the `presets` rewrites are planned
- AND `--steps layout` fails with a usage error stating that the step is not implemented in this script version

### Requirement: Migration Rewrites

The migration MUST rewrite the documents selected by content (requirement "Migration Selects Documents By Content") according to these rules.

| Rewrite | Rule |
|---|---|
| Field renames | `tts_model` to `voice_model`, `music` to `background_audio`, `music_volume` to `background_audio_volume`, `presenter_asset` to `avatar`, `intro_asset` to `intro`, Template `speed`/`emotion` to `voice_speed`/`voice_emotion`, Layer-only `level::` to `z_index::` (frontmatter `level:` untouched) |
| Layer `model::` | becomes `avatar_model::` when that field is absent; when both are present `model` is dropped and reported |
| Template `model::` / `tts_model::` (real-domain review) | in a `# NN Template` element both become `voice_model::` with the value preserved unchanged (including provider prefixes such as `edge-tts/neural`); differing values for both keys in one Template are a conflict |
| `template::` | `template:: [[Doc :: Name]]` or `Name` becomes `presets:: [Name]` using the last `::` segment |
| Template data | `# NN Template` elements become `# NN Preset`, keep their `slug::`, are moved into the innermost scope document covering the templates file's folder (else `series_NN.md`, else the domain `video-defaults_NN.md`) and are appended after its first section; (real-domain review) a `templates_*_NN.md` that holds the `# NN Series` element is its own target and is never deleted |
| Index (real-domain review) | `* [[Template]]` becomes `* [[Preset]]` in the `# NN index` of every migrated document and of every series blueprint `spec_NN.md` that lists them; the `# NN Series` element stays in place |
| Removed fields | `tool` and Video `voice_id` are dropped and reported; `voice_id` is NOT converted to `voice` |
| Scope-marker voice keys (real-domain review) | Series `voice_id::` and `narrator_voice_id::` are reported and, on `--apply`, removed as dead keys, each removal listed with file and value; the guard-config voice registry entry is reported as informational and never edited |
| Version | (real-domain review) `parent_spec` is left untouched; a plain `video-script` is never rewritten to a versioned name |
| JSON drafts | (real-domain review) see requirement "Migration Rewrites Persisted Review State" |
| Series-local tool forks (real-domain review) | listed in the report with path and the old keys they mention; never edited or deleted |
| HTML consoles | quine consoles are listed for regeneration and are not edited |

#### Scenario: Fields and version are renamed

- GIVEN a V_0-13-11 script using `tts_model::`, `music::`, `music_volume::`, `presenter_asset::` and a Layer `level:: 2`
- WHEN the migration is applied
- THEN the script uses `voice_model::`, `background_audio::`, `background_audio_volume::`, `avatar::` and `z_index:: 2`
- AND its `parent_spec.name` is unchanged (real-domain review) and its frontmatter `level:` is untouched

#### Scenario: template reference becomes presets list

- GIVEN a Scene with `template:: [[Studio :: Lucas]]`
- WHEN the migration is applied
- THEN the Scene has `presets:: [Lucas]`

#### Scenario: Template data moves into the covering scope document

- GIVEN `templates_x_NN.md` holding `# NN Template` elements in a folder covered by a Series document
- WHEN the migration is applied
- THEN the elements appear as `# NN Preset` sections after the first section of that Series document
- AND (real-domain review) the `templates_x_NN.md` file is not deleted

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

### Requirement: Migration Selects Documents By Content

(real-domain review) The migration MUST select documents by their content and MUST NOT use `parent_spec.name` to select or to gate them. A document under the domain MUST be selected when it contains a `# NN Template` section, a `template::` field, a `# NN Video` or `# NN Scene` element, or a scope marker with a `# NN Series` element; the root `video-defaults_NN.md` MUST always be selected. Documents under `archive`, `.bak*`, `node_modules`, `renders` and `_tmp_*` MUST be ignored. The migration MUST leave `parent_spec` untouched and MUST NOT rewrite a plain `video-script` to a versioned name.

#### Scenario: Unversioned and old-versioned parent_spec are selected

- GIVEN a script with `parent_spec.name: "video-script"`, a scope marker with `parent_spec.name: "video-script"` and an older script with `<series>_V_0-1-0`, each with the content markers above
- WHEN the migration runs
- THEN all three are selected and rewritten
- AND each `parent_spec` is unchanged afterwards

#### Scenario: Ignored locations

- GIVEN matching documents under `archive/`, `x.bak1/`, `node_modules/`, `renders/` and `_tmp_work/`
- WHEN the migration runs
- THEN none of them is read for rewriting or modified

#### Scenario: Unrelated document is not selected

- GIVEN a Markdown note with no Template, Video, Scene or Series element and no `template::` field
- WHEN the migration runs
- THEN it is not selected and not modified

### Requirement: Migration Handles Real-Domain Document Shapes

(real-domain review) The migration MUST map Template `model::` and `tts_model::` to `voice_model::` preserving the value; MUST move Presets out of a `templates_*` document without deleting that document; MUST rewrite `* [[Template]]` entries to `* [[Preset]]` in the `# NN index` of migrated documents and of series blueprint `spec_NN.md` files; MUST report and, on `--apply`, remove Series `voice_id::` and `narrator_voice_id::`; and MUST list series-local tool forks without editing them.

#### Scenario: Template model becomes voice_model

- GIVEN three Template documents in three series, each with two or three Template elements, some with `tool:: edge-tts` and `model:: edge-tts/neural`, some with `model:: replicate/minimax/speech-02-hd`, and two identical full-presenter Templates in one document
- WHEN the migration is applied
- THEN each Preset carries `voice_model::` with the original value unchanged
- AND `tool` is dropped and reported
- AND the two identical Presets are both kept under their own names (identical content is not a conflict)

#### Scenario: Template declares both model keys

- GIVEN a Template with `tts_model:: a` and `model:: b`
- WHEN the migration runs
- THEN it reports a conflict and exits 1 without writing

#### Scenario: templates file keeps its Series element and index

- GIVEN `templates_x_NN.md` holding a `# NN Series` element (tone, sound_tags), Template elements, and a `# NN index` listing `* [[Template]]`
- WHEN the migration is applied
- THEN the Series element is unchanged and the Template elements are `# NN Preset` sections after it in the same file
- AND the index lists `* [[Preset]]`
- AND the file is not deleted and the report lists it as now holding only the Series element plus Presets

#### Scenario: Series blueprint index is rewritten

- GIVEN a series blueprint `spec_NN.md` whose `# NN index` lists `* [[Template]]`
- WHEN the migration is applied
- THEN it lists `* [[Preset]]` and no other content of that file changes

#### Scenario: Preset keeps its slug

- GIVEN a Template element carrying `slug:: studio-warm`
- WHEN the migration is applied and the result is checked
- THEN the Preset carries `slug:: studio-warm` and no `preset-field` error is reported

#### Scenario: Dead voice keys on scope markers

- GIVEN 4 scope markers whose Series element declares `voice_id::` or `narrator_voice_id::`
- WHEN the migration runs without `--apply`
- THEN the report lists each key with file and value and nothing is written
- AND WHEN it runs with `--apply` the keys are removed and the report still lists every removal with file and value

#### Scenario: Guard-config voice registry entry is informational

- GIVEN a guard-config voice registry entry for a removed voice key
- WHEN the migration runs, with or without `--apply`
- THEN the report mentions it as informational and the file is not modified

#### Scenario: Series-local tool forks are listed

- GIVEN `series/x/tools/build-review-console.mjs` and a copy of `draft-template.html` mentioning `music_volume` and `template`
- WHEN the migration runs
- THEN the report lists each path with the old keys it mentions
- AND neither file is edited or deleted

### Requirement: Migration Rewrites Persisted Review State

(real-domain review) The migration MUST rewrite the draft and reviewed JSON as follows. The draft JSON stores config as `config[] = {key, value, origin, type}`; keys in `config[].key`, in `videoOverrides` and in per-scene override keys MUST be renamed through the same table as documents (`tts_model` to `voice_model`, `speed` to `voice_speed`, `emotion` to `voice_emotion`, `music` to `background_audio`, `music_volume` to `background_audio_volume`), and `scenes[].template` MUST become `presets` holding a one-element list. The migration MUST NEVER rename `scenes[].choice.model`, which is an avatar model id. Off-schema keys (`narrator_voice`, `avatar_image`, `avatar_resolution_hook` and any other unknown config key) MUST be reported with their location and MUST NOT be converted.

#### Scenario: Config, overrides and scene template are renamed

- GIVEN a draft JSON with `config[]` entries keyed `tts_model`, `speed`, `emotion`, `music`, `music_volume`, a `videoOverrides` object with `speed`, a per-scene override `emotion`, and a reviewed JSON with `scenes[].template: "Lucas"`
- WHEN the migration is applied
- THEN the keys are `voice_model`, `voice_speed`, `voice_emotion`, `background_audio`, `background_audio_volume`, in `config[]`, `videoOverrides` and the scene override
- AND each scene has `presets: ["Lucas"]` and no `template`

#### Scenario: Avatar model id is never renamed

- GIVEN a reviewed JSON scene with `choice.model` set to an avatar model id
- WHEN the migration is applied
- THEN `choice.model` is unchanged

#### Scenario: Off-schema keys are reported only

- GIVEN `config[]` entries keyed `narrator_voice`, `avatar_image` and `avatar_resolution_hook`
- WHEN the migration runs
- THEN the report lists each with its location
- AND the entries are unchanged

### Requirement: Migration Preserves Cache Identity

(real-domain review) HARD CONSTRAINT: re-running generation from a migrated script MUST NEVER repeat a provider request that the cache already satisfies. For every scene whose effective inputs did not change, the TTS, avatar and image cache identities MUST be identical before and after migration. Only scenes affected by the documented precedence-bug fix MAY differ, and the dry-run report MUST list them. The report MUST state that migrated scripts invalidate `asset_plan.approved.json` (re-estimate and re-approve, zero spend because of cache hits) and that a pre-migration `manifest.json` is stale and must be regenerated by `compile`.

#### Scenario: Cache identities are unchanged on the real-domain-shaped fixture

- GIVEN a fixture modelled on the real domain (Templates with `model::` and `tool:: edge-tts`, unversioned `parent_spec`, duplicate-content Templates, scope markers with dead voice keys) and a committed golden of TTS, avatar and image cache identities computed with the V_0-13-11 engine
- WHEN the fixture is migrated and the identities are recomputed with the new engine
- THEN they are identical for every scene whose effective inputs did not change
- AND any other difference fails the test

#### Scenario: Precedence-fix scenes are listed

- GIVEN a scene whose explicit `voice` differs from its Template's value
- WHEN the migration runs in dry-run
- THEN the report lists that scene as the only permitted cache-identity change

#### Scenario: Approval and manifest invalidation are reported

- GIVEN a migrated script that has an `asset_plan.approved.json` and a `manifest.json`
- WHEN the report is read
- THEN it states that the approval must be re-estimated and re-approved with zero spend, and that the manifest must be regenerated by `compile`

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

`build-script-from-draft` and the review console loader MUST fail with the error `legacy-draft-keys`, naming the script and the legacy keys found, when a reviewed or draft JSON carries a retired key (`template`, `music`, `music_volume`, `speed`, `emotion`, `tts_model`, `presenter_asset`, `intro_asset`), and MUST NOT ignore or translate it. (real-domain review) The check applies to `config[].key`, `videoOverrides` keys, per-scene override keys and `scenes[].template`; `scenes[].choice.model` is an avatar model id and is NOT a legacy key, and off-schema keys are not legacy keys. Plan approval hashes script content, so migrated scripts MUST be re-approved; no spend is involved.

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

#### Scenario: Chosen avatar resolution is kept for any quality (real-domain review)

- GIVEN a reviewed draft whose quality is not `ALTA` and whose presenter choice is `480p`
- WHEN `build-script-from-draft.mjs` runs
- THEN the presenter Layer contains `avatar_resolution:: 480p`
- AND the resolution is not written only when the quality is `ALTA`

#### Scenario: Legacy choice.model is not rejected (real-domain review)

- GIVEN a reviewed draft with `scenes[].choice.model` set to an avatar model id
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
