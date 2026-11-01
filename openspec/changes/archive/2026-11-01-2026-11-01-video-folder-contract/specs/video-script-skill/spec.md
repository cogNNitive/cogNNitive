# Delta for video-script-skill

Scope: the simplified workflow `estimate -> approve -> compile -> avatar synthesis -> render -> thumbnails -> finalize`, finalize in the new layout, fixed review-file names, the scope-anchored series root. There is no `produce` command and no shipped procedures; the engine keeps `compile`, `synthesize-avatar` and `render` as separate, ordered commands. Design decision ids (D1 to D10) refer to `design.md` of change `2026-11-01-video-folder-contract`.

Composition with `2026-11-01-video-presets` (applied and archived first). That change MODIFIES "Blueprint-Ships Draft Authoring Tools" and "Domain Adoption Copies The Video Defaults". The MODIFIED block below is a full copy of that change's version of the first requirement, edited, and it replaces it when this change is archived after it. "Domain Adoption Copies The Video Defaults" is not modified here. Every other requirement below has a distinct heading from that change's additions.

## ADDED Requirements

### Requirement: Workflow Is Estimate, Approve, Compile, Avatar, Render, Thumbnails, Finalize

SKILL.md MUST document the workflow as domain setup, series setup, media and draft, console, human review, script build, estimate, approve, compile, avatar synthesis, render, thumbnails, finalize, description prose and attribution, and retrospective, with the three engine commands in that order and with no second compile, no `audio/` handoff, no 9:16 recompile, no promotion step and no combined `produce` command.

Source: D8.

The script build MUST run as `build-script-from-draft.mjs reviewed.json`, and `--draft` MUST be optional because the reviewed file carries every scene.

#### Scenario: Script builds from reviewed.json alone

- GIVEN an episode with `reviewed.json` and no `draft.json`
- WHEN `build-script-from-draft.mjs reviewed.json` runs
- THEN it emits the script and does not fail for a missing draft

#### Scenario: SKILL.md lists the steps

- GIVEN SKILL.md
- WHEN its workflow section is read
- THEN it names the steps in order and `compile`, `synthesize-avatar` and `render` are three consecutive steps
- AND no `produce` step is documented

#### Scenario: No retired step is documented

- GIVEN SKILL.md and the skill references
- WHEN they are searched for `--format 9:16`, `master_vertical`, `renders/<ref>` and a second compile
- THEN no match is found

### Requirement: Approval Uses One In-Chat Phrase

The skill MUST instruct a single approval wording, the human replying `approve the plan <hash8>` in chat after which the agent runs `approve-plan.mjs asset_plan.md --delegated "<phrase>"`, and the engine MUST keep accepting any phrase that contains the hash.

Source: D8, D10.

#### Scenario: One wording everywhere

- GIVEN SKILL.md and the plan boilerplate
- WHEN they are searched for the approval instruction
- THEN each uses `approve the plan <hash8>` and none uses `apruebo el plan`

#### Scenario: Any phrase containing the hash is accepted

- GIVEN a plan hash `1a2b3c4d`
- WHEN the delegated phrase is `ok, go ahead with 1a2b3c4d`
- THEN approval is recorded

### Requirement: Finalize Derives Formats In Place

`finalize-video.mjs <episode-dir> [--formats vertical,horizontal,square] [--fill crop|blur] [--force] [--dry-run]` MUST read `E/<slug>_1920x1920.mp4` and `E/build/manifest.json`, MUST derive the requested formats beside the master, MUST print the field values `master:: <slug>_1920x1920.mp4` and `thumbnail:: <slug>_thumbnail_2560x1440.png`, MUST NOT write the model, and MUST NOT read `renders/`, MUST NOT accept `--ref`, and MUST NOT promote `master_vertical` or a voiceover.

Source: D2, D5.

Finalize MUST reject a manifest whose `scriptSource` is not the episode script or which is older than the script.

#### Scenario: Finalize derives and prints

- GIVEN a rendered master and a current manifest
- WHEN finalize runs with default formats
- THEN the three derived files exist and the two field lines are printed
- AND the Video document is unchanged

#### Scenario: Stale manifest is rejected

- GIVEN a script edited after `build/manifest.json` was written
- WHEN finalize runs
- THEN it fails naming the stale manifest and the `render` command

#### Scenario: Foreign manifest is rejected

- GIVEN a manifest whose `scriptSource` is another script
- WHEN finalize runs
- THEN it fails and writes no output

#### Scenario: Dry run writes nothing

- GIVEN finalize with `--dry-run`
- WHEN it completes
- THEN it lists the files it would derive and creates none

### Requirement: Finalize Prints The Chapter Block

Finalize MUST print the chapter block of `description.md`, computed from the manifest, according to capability `video-publication-description` after deriving the formats, and the agent MUST write the whole file (title, summary, chapters, sources, attribution) from that output.

Source: D6.

#### Scenario: Finalize prints the chapters

- GIVEN a manifest with measured scene starts
- WHEN finalize runs
- THEN it prints one `MM:SS Title` line per scene, starting at `00:00`
- AND it writes no file of its own

### Requirement: Domain Setup Documents The Gitignore Block

SKILL.md MUST instruct the agent, at domain setup, to add the managed gitignore block of capability `video-folder-contract` to the domain `.gitignore`.

Source: D2.

#### Scenario: Setup step names the block

- GIVEN SKILL.md
- WHEN its domain setup section is read
- THEN it names `**/build/`, `**/draft_thumbs/` and `.cognnitive/cache/`

### Requirement: Skill Scripts Use The Scope-Anchored Series Root

The skill scripts `video-engine-cli.mjs`, `render-thumbnail.mjs`, `build-script-from-draft.mjs` and `build-draft-html.mjs` MUST locate the series through `findSeriesRoot` of capability `video-folder-contract`, and the thumbnail and script builder MUST read the series title from the scope document.

Source: D9.

#### Scenario: Thumbnail reads the scope title

- GIVEN a series whose scope document declares `title:: Other Series` and no `series_NN.md`
- WHEN `render-thumbnail.mjs` runs without `--subtitle`
- THEN the subtitle is `Other Series`

#### Scenario: Script builder surfaces a scope error

- GIVEN a series with a duplicate scope marker
- WHEN `build-script-from-draft.mjs` runs
- THEN it fails naming `DUPLICATE_SCOPE_MARKER`

### Requirement: Dev Tooling Does Not Read video.series.json

`scripts/dev/lib/series-values.mjs`, `scripts/dev/adopt-video-plan.mjs` and `scripts/dev/validate-scope-golden.mjs` MUST NOT read `video.series.json`.

Source: D9.

#### Scenario: Tooling ignores the file

- GIVEN a series with a `video.series.json` whose values differ from the scope document
- WHEN `series-values` runs
- THEN the output reflects the scope document only

### Requirement: Retired Layout Vocabulary Is Absent

The blueprint, the skill and `scripts/dev` MUST NOT contain `videos/{`, `.cognnitive-video`, `renders/<ref>`, `--format`, `master_vertical`, `descripcion_youtube`, `SERIES_MARKERS`, `series_rules.md`, `script_template.md`, `video.series.json`, `FORMAT_PRESETS`, `isHorizontal` or `_draft_<version>.html` outside `openspec/changes/archive/`.

Source: D11 (retired names added to the scan).

#### Scenario: Scan is clean

- GIVEN the repository after the last slice
- WHEN the retired-vocabulary scan runs
- THEN it reports no match outside `archive/`

## MODIFIED Requirements

### Requirement: Blueprint-Ships Draft Authoring Tools

The skill MUST ship the draft authoring tools: `build-draft-html.mjs` (`draft.json` to a self-contained `review_console.html` with embedded thumbnails and a `reviewed.json` exporter) and `build-script-from-draft.mjs` (`reviewed.json` to a valid L3 `video-script` document named `<slug>_video-script_<s>_NN.md`). Thumbnails MUST be produced by the single `render-thumbnail.mjs` tool. The draft JSON schema MUST be named neutrally (`video-script.draft.v1`). The tools MUST read series values through the parameter cascade (series, then domain Video Defaults, then package Video Defaults), resolved by nn-core from the scope chain of the input file's folder (or `--series <dir>`). There MUST be no `video.series.json`, `--config` flag or built-in series config, and no legacy `_draft_<version>.html` alias. The generated script's frontmatter MUST be copied from the series scope document and its filename MUST use the Series slug. The tools MUST NOT write cascaded scene values that the engine resolves itself, MUST write a Preset choice as `presets:: [..]`, MUST NOT write a literal presenter `asset::`, MUST resolve `intro` through the cascade into the fixed scene's background `asset::`, and MUST NOT hardcode any series' preset names, scene slugs, background audio, filename pattern or model. The review console MUST export the renamed keys (`presets`, `background_audio`, `background_audio_volume`, `voice_speed`, `avatar_*`).
(Previously: the file names were `<slug>_draft_V_x-y-z.json`, `<slug>_reviewed.json` and `<slug>_review_console.html`, with a legacy `_draft_<version>.html` alias.)

Source: D8, D9, D1 (review file names).

#### Scenario: Tools run against any series

- GIVEN a series folder whose scope document `other_scope_NN.md` declares `title:: Other Series`
- WHEN `build-script-from-draft.mjs` runs on a reviewed draft in that series
- THEN the filename uses the Series slug and the script frontmatter matches the scope document

#### Scenario: No series is hardcoded

- GIVEN the tools
- WHEN they are inspected
- THEN no series' name, preset name, scene slug, background audio path or filename pattern appears in prose or code

#### Scenario: Generated script validates

- GIVEN a reviewed draft JSON in a series folder
- WHEN `build-script-from-draft.mjs` runs
- THEN it emits an L3 document that validates against the `video-script` blueprint with no schema errors

#### Scenario: Review HTML is self-contained

- GIVEN a `draft.json` referencing thumbnails in `draft_thumbs/`
- WHEN `build-draft-html.mjs draft.json` runs
- THEN `review_console.html` embeds the thumbnails (base64), opens from `file://`, shows the Series `title`, and exports `reviewed.json`

#### Scenario: Fixed default names and no alias

- GIVEN `build-draft-html.mjs draft.json` run in an episode folder
- WHEN the folder is listed
- THEN `review_console.html` exists and no file matches `*_draft_*.html`

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

#### Scenario: Chosen avatar resolution is kept for any quality

- GIVEN a reviewed draft whose quality is not `ALTA` and whose presenter choice is `480p`
- WHEN `build-script-from-draft.mjs` runs
- THEN the presenter Layer contains `avatar_resolution:: 480p`
- AND the resolution is not written only when the quality is `ALTA`

#### Scenario: Legacy choice.model is not rejected

- GIVEN a reviewed draft with `scenes[].choice.model` set to an avatar model id
- WHEN `build-script-from-draft.mjs` runs
- THEN no `legacy-draft-keys` error is raised for it

#### Scenario: Intro is resolved through the cascade

- GIVEN a series that declares `intro:: intro.mp4`
- WHEN `build-script-from-draft.mjs` runs
- THEN the fixed intro scene's background `asset::` is `intro.mp4`

### Requirement: Render Step Uses The HyperFrames Pipeline

The skill's render step MUST emit the HyperFrames project from the manifest and invoke the HyperFrames renderer. It MUST NOT bundle or install a React/Remotion runtime. The engine-provisioning step MUST ensure the pinned HyperFrames CLI rather than a Remotion engine. The engine CLI MUST expose only `compile`, `render` and the primitive `synthesize-avatar`; preview is `hyperframes preview`, and there is no native 9:16 render because every other format is derived from the 1920x1920 master. The skill MUST NOT ship `render-vertical.mjs`, `assemble-video.mjs` or a combined `produce` command.
(Previously: the CLI exposed only `compile` and `render`, and a vertical master was a native `--format 9:16` render.)

Source: D3, D8.

#### Scenario: Render uses HyperFrames

- GIVEN an approved script
- WHEN the skill's render step runs
- THEN it emits a HyperFrames project and renders it via the pinned HyperFrames CLI
- AND no Remotion bundle step runs

#### Scenario: Removed command is refused

- GIVEN the engine CLI
- WHEN it is run with `preview`
- THEN it exits non-zero printing a usage that lists `compile`, `render` and `synthesize-avatar` and no `preview`

#### Scenario: Removed tools are gone

- GIVEN the skill's `scripts/` and SKILL.md
- WHEN they are inspected
- THEN neither `render-vertical.mjs` nor `assemble-video.mjs` exists or is referenced
