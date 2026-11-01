# Video Script Skill Specification

## Purpose

Defines the cogNNitive-owned skill that authors native iNNfo Level-3 video-script documents inside an iNNfo workspace. The skill is embedded in the `video-script` blueprint package; script validity is enforced by the `video-script` blueprint, with no external repository dependency.
## Requirements
### Requirement: Authors iNNfo L3 Script Documents

The skill MUST author video scripts as iNNfo Level-3 kNNowledge documents that adopt the `video-script` blueprint. The skill MUST NOT author VUS scripts and MUST NOT ship, vendor, or invoke a VUS parser.

#### Scenario: Skill authors an L3 document

- GIVEN a workspace with a registered Video Element and its owning Series
- WHEN the skill authors a script for that Video
- THEN it writes an iNNfo L3 document adopting the `video-script` blueprint
- AND the document validates against the blueprint

#### Scenario: No VUS parser artifact present

- GIVEN the skill directory
- WHEN its files are inspected
- THEN no vendored VUS parser artifact is present
- AND no VUS parse code path is referenced

### Requirement: Owned Skill With No External Dependency

The system MUST provide a cogNNitive-owned video-script skill embedded in the `video-script` bluepriNNt package at `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/` that authors iNNfo Level-3 video-script documents and understands iNNfo workspace structure (Series/Video registration). The skill MUST NOT depend on, fork from at run time, or reference any repository outside the monorepo. (Previously: it authored VUS scripts using a vendored parser and VUS specification, embedded in the `video` bluepriNNt package.)

#### Scenario: Skill authors a document with no external repository

- GIVEN a workspace with a registered Video Element and its owning Series, and no external video repository present
- WHEN the skill authors a document for that Video
- THEN the document is written to the Video's own folder
- AND no external-repository path is referenced

#### Scenario: No external reference remains

- GIVEN the skill directory
- WHEN its files are inspected
- THEN they reference no repository outside cogNNitive

#### Scenario: Installed copy authors with no monorepo checkout

- GIVEN the skill installed at `~/.agents/skills/nn-video-script/` with no monorepo present
- WHEN the skill authors a valid L3 script document
- THEN it succeeds using only artifacts committed inside the skill

### Requirement: No-Prose-Copy of Syntax Facts

The skill's own documentation and prompts MUST NOT restate blueprint Field names, allowed `type::` values, or other schema facts as literal prose. Every such fact MUST be resolved by reading the blueprint at run time. (Previously: the prose restricted VUS voice IDs and property names sourced from the pinned VUS spec.)

#### Scenario: Allowed layer type resolved from the blueprint

- GIVEN a document that needs a valid Layer `type::`
- WHEN the skill selects a value
- THEN it reads the allowed values from the `video-script` blueprint, never from a hardcoded list in its own prose

#### Scenario: Restated schema fact rejected in review

- GIVEN a skill document containing a literal Layer `type::` list not sourced from the blueprint
- WHEN skill content is reviewed against this requirement
- THEN it is flagged as a no-prose-copy violation

### Requirement: Declared Asset Provider Dependency

The skill MUST declare its external asset-provider dependency (TTS/media via WaveSpeed or
Replicate) **and its renderer dependency (HyperFrames)** in its own frontmatter `depends_on`, so
the setup step can check it. Direct provider fetch through environment-variable credentials SHALL
remain the supported path. The skill MUST NOT retain the local OS-native TTS fallback (Windows
SAPI). Engine setup MUST verify provider credentials, renderer availability and optional
agent-MCP presence with user consent before proceeding. The skill MUST NOT declare or install a
Remotion engine.
(Previously: declared only the asset provider; the frontmatter pinned `engine: @remotion/renderer`.)

#### Scenario: Provider and renderer dependencies are declared

- GIVEN the skill's frontmatter
- WHEN it is inspected
- THEN it declares its asset-provider dependency under `depends_on`
- AND it declares the HyperFrames renderer dependency with a pinned version

#### Scenario: No Remotion engine is declared

- GIVEN the skill's frontmatter and setup script
- WHEN they are inspected
- THEN no `@remotion/*` engine or installer is declared or referenced

### Requirement: Skill Is Installed By Projection From The video bluepriNNt

The skill MUST be made available to agents at `~/.agents/skills/nn-video-script/` solely by
installing the `video-script` bluepriNNt. It MUST NOT have a standalone distribution entry, alias,
redirect or dual path. Any change under `video-script/skills/**` or `video-script/defaults/**`
MUST bump the `video-script` `blueprint_version` and the skill `version`, and every registry that
records these versions MUST be updated in the same change.
(Previously: pinned literal versions `V_0-6-0` / `V_0-4-0`, which went stale with each change.)

#### Scenario: Installing video-script yields a working skill

- GIVEN a clean `~/.agents/`
- WHEN the `video-script` bluepriNNt is installed
- THEN `~/.agents/skills/nn-video-script/SKILL.md` and the package's `defaults/video-defaults_NN.md` exist and the skill's scripts find it

#### Scenario: Renderer change bumps the blueprint version

- GIVEN a change under `video-script/skills/**`
- WHEN the manifest pin is validated
- THEN the `video-script` `blueprint_version` is bumped

#### Scenario: Versions are registered consistently

- GIVEN the bumped skill and blueprint versions
- WHEN `node scripts/verify.js` runs
- THEN it passes with no version-registration mismatch

### Requirement: Embedded Skill Tests Run In Verify

Test suites that live inside the embedded skill MUST be discovered and executed by `node scripts/verify.js`, without double-running suites already collected from `iNNfo/packages`. Moving the suites MUST NOT reduce the number of executed suites.

#### Scenario: Moved suites still run

- GIVEN the skill's suites under `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/test/`
- WHEN `node scripts/verify.js` collects suites
- THEN each remaining suite is in the executed set

### Requirement: Compiler Resolves Layers via Explicit Parentage

The video script compiler MUST bind `Layer` elements to their parent `Scene` using explicit `parentSlug` values before falling back to slug prefix matching. Flat legacy scripts lacking `parentSlug` MUST continue resolving via slug prefix fallback.

#### Scenario: Nested layers bind by parent slug

- GIVEN a script with nested Layer elements specifying `parentSlug`
- WHEN the compiler builds the scene manifest
- THEN each Layer binds to its parent Scene via `parentSlug`

#### Scenario: Flat legacy layers fall back to slug prefix

- GIVEN a legacy script lacking `parentSlug`
- WHEN the compiler builds the scene manifest
- THEN each Layer binds to its Scene via slug prefix

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

### Requirement: Cost Estimator Invoked Through Any Path

The cost estimator MUST run `main()` when invoked through a symlinked or junction path (its entry
guard MUST compare real paths), so an agent invoking it through a skill junction is never a silent
no-op.

#### Scenario: Junction invocation runs the estimator

- GIVEN the estimator invoked through a junction (`~/.config/opencode/skills/...`) that resolves to the real skill path
- WHEN the CLI runs
- THEN `main()` executes and the plan is written (not an exit-0 no-op)

### Requirement: Package Ships Defaults, Skill Ships Neutral Fallbacks And A Slot Reference

The `video-script` bluepriNNt package (not the skill) MUST ship `defaults/video-defaults_NN.md`,
a `Video Defaults` document holding every cascade default (the `blueprint` level). The skill
MUST ship exactly one neutral fallback component per slot (`title`, `lower-third`, `caption`,
`quote`, `watermark`, `b-roll`), one neutral frame `frames/neutral.md`, and a reference doc
listing, per slot, its variables and a one-line registry hint, plus the sound event keys. Engine
code MUST NOT name any component, sound, frame or default value; only the Video Defaults
document MAY name them (for example `scene-boundary=whoosh`, `frame:: neutral`). The skill MUST
NOT ship sound files. All shipped files MUST be English-only and series-neutral.

#### Scenario: Every slot has a fallback

- GIVEN a fresh install of the skill
- WHEN the shipped components are listed
- THEN one fallback exists for each of the six slots

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

### Requirement: No Legacy Renderer Residue

The skill MUST NOT contain the word "remotion" (case-insensitive) in any file except the one test
that enforces this rule. The scene compiler MUST be `scripts/scene-compiler.mjs` exporting
`SceneCompiler`. Manifest scene tracks MUST NOT carry `sceneType`; the `type::` binding table MUST
NOT carry React renderer names; an overlay `config` MUST carry only keys the project emitter reads.

#### Scenario: Skill tree is free of Remotion text

- GIVEN the skill directory
- WHEN every file except the guard test is searched for `remotion` ignoring case
- THEN no match is found

#### Scenario: Manifest carries no dead fields

- GIVEN a script with a title overlay and a caption overlay
- WHEN it is compiled
- THEN no scene track has `sceneType`
- AND every overlay `config` key is read by the project emitter

### Requirement: Scene Transitions Emit A GSAP Ease

A scene transition MUST be emitted with a GSAP ease name. The compiler MUST NOT write a CSS
`bezier(...)` string into the manifest; the emitter's default ease (`power2.out`) applies.

#### Scenario: Declared transition uses a valid ease

- GIVEN a Scene with `transition:: fade`
- WHEN it is compiled and its project emitted
- THEN the scene tween carries `ease: 'power2.out'`
- AND no emitted file contains `bezier(`

### Requirement: Skill Consumes nn-core Scope Resolution

The skill's scripts MUST locate the domaiNN root and the series scope through nn-core
`findScopeChain`, and MUST resolve cascaded values through nn-core `resolve`. The files
`scripts/lib/cascade.mjs` and `scripts/lib/nearest.mjs` MUST NOT exist, and no skill script
MAY contain a private frontmatter or field parser for kNNowledge. No skill script MAY
locate the workspace through `.git`.

#### Scenario: Private cascade code is gone

- GIVEN the skill's `scripts/` tree
- WHEN it is listed
- THEN neither `lib/cascade.mjs` nor `lib/nearest.mjs` exists
- AND no script imports them

#### Scenario: Workspace resolved without git

- GIVEN a `video_NN` domaiNN with `domaiNN_NN.md` and no `.git` in its ancestry
- WHEN a skill script runs from inside a series folder
- THEN it finds the domaiNN root and completes

#### Scenario: Existing cascade behavior is preserved

- GIVEN the skill's existing cascade tests (series, then domain Video Defaults, then package Video Defaults)
- WHEN they run against the nn-core based implementation
- THEN they pass with the same resolved values

### Requirement: Scene Visuals Procedure Defined Once With Slots

The `draft_scene_visuals` procedure MUST exist exactly once in the `video_NN` domaiNN, at
the highest scope that needs it, declaring its series-specific variation as named slots.
Each series MUST fill those slots instead of carrying a copy of the steps.

#### Scenario: One definition, two series

- GIVEN the `video_NN` domaiNN after Adoption A
- WHEN procedure files named `draft_scene_visuals` are counted
- THEN exactly one definition exists
- AND each of the two series that previously copied it fills the procedure's slots

#### Scenario: Both series run it through slots

- GIVEN the two series
- WHEN the procedure is resolved for a document in each
- THEN both resolve to the single definition with their own slot fillers
- AND the resolution reports no slot-contract errors

#### Scenario: No copy remains

- GIVEN the two series folders
- WHEN they are searched for the 13-step body of `draft_scene_visuals`
- THEN no copy of the step list is found in either

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
