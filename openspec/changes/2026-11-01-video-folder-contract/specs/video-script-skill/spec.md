# Delta for video-script-skill

Scope: the simplified workflow `estimate -> approve -> produce -> thumbnails -> finalize`, finalize in the new layout, fixed review-file names, shipped procedures, the scope-anchored series root, and the `layout` step group of the migration script. Design decision ids (D1 to D11, L1 to L11) refer to `design.md` of change `2026-11-01-video-folder-contract`.

Composition with `2026-11-01-video-presets` (applied first, archived first). That change ADDS "Video Presets Migration Script" and MODIFIES "Blueprint-Ships Draft Authoring Tools" and "Domain Adoption Copies The Video Defaults". This delta builds on the first two: the MODIFIED blocks below are full copies of that change's versions of those two requirements, edited, and they replace them when this change is archived after it. "Domain Adoption Copies The Video Defaults" is not modified here. Every other requirement below has a distinct heading from that change's additions.

## ADDED Requirements

### Requirement: Workflow Is Estimate, Approve, Produce, Thumbnails, Finalize

SKILL.md MUST document the workflow as domain setup, series setup, media and draft, console, human review, script build, estimate, approve, produce, thumbnails, finalize, description prose and attribution, and retrospective, with `produce` as the single engine step after approval and with no second compile, no `audio/` handoff, no 9:16 recompile and no promotion step.

Source: D8.

The script build MUST run as `build-script-from-draft.mjs reviewed.json`, and `--draft` MUST be optional because the reviewed file carries every scene.

#### Scenario: Script builds from reviewed.json alone

- GIVEN an episode with `reviewed.json` and no `draft.json`
- WHEN `build-script-from-draft.mjs reviewed.json` runs
- THEN it emits the script and does not fail for a missing draft

#### Scenario: SKILL.md lists the steps

- GIVEN SKILL.md
- WHEN its workflow section is read
- THEN it names the thirteen steps in order and `produce` replaces compile, avatar synthesis and render as separate steps

#### Scenario: No retired step is documented

- GIVEN SKILL.md and the skill references
- WHEN they are searched for `--format 9:16`, `master_vertical`, `renders/<ref>` and a second compile
- THEN no match is found

### Requirement: Approval Uses One In-Chat Phrase

The skill MUST instruct a single approval wording, the human replying `approve the plan <hash8>` in chat after which the agent runs `approve-plan.mjs asset_plan.md --delegated "<phrase>"`, and the engine MUST keep accepting any phrase that contains the hash.

Source: D8, D10.

#### Scenario: One wording everywhere

- GIVEN SKILL.md, the shipped procedures and the plan boilerplate
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
- THEN it fails naming the stale manifest and the `render` or `produce` command

#### Scenario: Foreign manifest is rejected

- GIVEN a manifest whose `scriptSource` is another script
- WHEN finalize runs
- THEN it fails and writes no output

#### Scenario: Dry run writes nothing

- GIVEN finalize with `--dry-run`
- WHEN it completes
- THEN it lists the files it would derive and creates none

### Requirement: Finalize Refreshes The Chapter Block

Finalize MUST refresh only the chapter block of `description.md` according to capability `video-publication-description` after deriving the formats, and the agent MUST write the remaining prose and attribution after finalize.

Source: D5, D6, D8.

#### Scenario: Finalize writes chapters

- GIVEN a manifest with measured scene starts
- WHEN finalize runs
- THEN `description.md` contains the chapter block between its marker comments

### Requirement: Blueprint Ships Produce And Draft Procedures

The `video-script` blueprint MUST ship English procedures `procedures/produce-video_procedures_NN.md` and `procedures/draft-scene-visuals_procedures_NN.md` that encode the workflow with the slots `{{slot:series_profile}}` and `{{slot:avatar_recipe}}`, and MUST NOT ship the pre-draft gate of issue #429; the Spanish procedures of a real domain MUST be reported as superseded and MUST NOT be edited.

Source: D8.

#### Scenario: Procedures validate

- GIVEN the blueprint package
- WHEN the blueprint inventory and catalog guards run
- THEN the two shipped procedures are accepted

#### Scenario: Procedures are English and slot-based

- GIVEN the two procedures
- WHEN they are inspected
- THEN they contain `{{slot:series_profile}}` and `{{slot:avatar_recipe}}` and no Spanish approval phrase

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

The blueprint, the skill and `scripts/dev` MUST NOT contain `videos/{`, `.cognnitive-video`, `renders/<ref>`, `--format`, `master_vertical`, `descripcion_youtube`, `SERIES_MARKERS`, `series_rules.md`, `script_template.md`, `video.series.json`, `FORMAT_PRESETS`, `isHorizontal` or `_draft_<version>.html` outside `openspec/changes/archive/` and the migration fixtures.

Source: D11 (retired names added to the scan).

#### Scenario: Scan is clean

- GIVEN the repository after the last slice
- WHEN the retired-vocabulary scan runs
- THEN it reports no match outside archive and migration fixtures

### Requirement: Layout Migration Step Group

The migration script `scripts/dev/migrate-video-domain.mjs` MUST implement a `layout` step group after `presets`, MUST plan `rename`, `write` and `mkdir` operations over the result of `presets` in one virtual file plan from one document scan, and MUST never touch `.cognnitive/**` (except the journal), `domaiNN_NN.md`, `video-guard.json`, `media/`, `shared/`, the domain `assets/` or Scene and Layer headings.

Source: D11.

#### Scenario: One report for both steps

- GIVEN a domain needing both `presets` and `layout` changes
- WHEN the script runs without `--apply`
- THEN it prints one report with both groups of changes and writes nothing

#### Scenario: Protected paths are untouched

- GIVEN a domain with `.cognnitive/`, `video-guard.json`, `media/` and `shared/`
- WHEN the script runs with `--apply`
- THEN none of them is modified except the new journal under `.cognnitive/migrations/`

#### Scenario: Layout alone

- GIVEN `--steps layout`
- WHEN the script runs
- THEN only layout operations are planned

### Requirement: Layout Migration Moves Engine Output And Deliverables

The `layout` step MUST move engine output to `E/build/_legacy/` (L1), name masters by dimension (L2), rename the description (L3), rename review files (L4) and rename thumbnails (L5) according to the table.

Source: D11 L1 to L5.

| Op | Rule |
|---|---|
| L1 | Move `public/`, `hyperframes/` only when it contains `.nn-emit.json`, `manifest.json`, `audio/<sceneId>_voiceover.mp3` files only (other files in `audio/` stay) and the episode `renders/` into `build/_legacy/`; create `build/.nn-build` |
| L2 | `master.mp4` becomes `<slug>_1920x1920.mp4` when the target is absent and ffprobe reports 1920x1920, otherwise it goes to `_legacy/` and the report says "re-render, zero provider spend"; `master_<WxH>.mp4` goes to `_legacy/`; existing `<slug>_<WxH>.mp4` stay |
| L3 | `descripcion_youtube.md` becomes `description.md` |
| L4 | The newest `<slug>_draft_V_*.json` becomes `draft.json` (older versions listed), `<slug>_reviewed.json` becomes `reviewed.json`, `<slug>_review_console.html` becomes `review_console.html`, legacy `<slug>_draft_*.html` goes to `_legacy/` |
| L5 | `thumbnail*.png\|jpe?g` becomes `<slug>_thumbnail_<W>x<H>.<ext>` with dimensions read from the PNG IHDR or JPEG SOF header; `thumbnail::` and `master::` values in selected documents are rewritten only on an exact match against the old relative path |

#### Scenario: Engine output is parked

- GIVEN an episode with `public/`, a `hyperframes/` holding `.nn-emit.json`, `manifest.json` and `audio/00_hook_voiceover.mp3`
- WHEN the script runs with `--apply`
- THEN all of them are under `build/_legacy/` and `build/.nn-build` exists

#### Scenario: Authored audio stays

- GIVEN `audio/00_gancho.wav` and `audio/00_hook_voiceover.mp3`
- WHEN the script runs with `--apply`
- THEN `00_gancho.wav` stays in `audio/` and only the voiceover copy moves

#### Scenario: Authored Hyperframes is not moved

- GIVEN a `Hyperframes/` folder without `.nn-emit.json`
- WHEN the script runs
- THEN it is reported and not moved or renamed

#### Scenario: Master named by dimension

- GIVEN `master.mp4` that ffprobe reports as 1920x1920 and no `<slug>_1920x1920.mp4`
- WHEN the script runs with `--apply`
- THEN the file is renamed to `<slug>_1920x1920.mp4`

#### Scenario: Wrong-size master is parked

- GIVEN `master.mp4` that ffprobe reports as 1920x1080
- WHEN the script runs with `--apply`
- THEN it is moved to `build/_legacy/` and the report states "re-render, zero provider spend"

#### Scenario: Review files are renamed

- GIVEN `<slug>_draft_V_0-1-0.json`, `<slug>_draft_V_0-2-0.json`, `<slug>_reviewed.json` and `<slug>_review_console.html`
- WHEN the script runs with `--apply`
- THEN `draft.json` is the 0-2-0 content, `reviewed.json` and `review_console.html` exist and the 0-1-0 file is listed

#### Scenario: Thumbnails take true dimensions

- GIVEN `thumbnail.png` of 2560x1440 and `thumbnail_vertical.png` of 1080x1920
- WHEN the script runs with `--apply`
- THEN they become `<slug>_thumbnail_2560x1440.png` and `<slug>_thumbnail_1080x1920.png`
- AND a `thumbnail:: thumbnail.png` value is rewritten and `thumbnail:: other.png` is not

#### Scenario: Description is renamed

- GIVEN `descripcion_youtube.md` and no `description.md`
- WHEN the script runs with `--apply`
- THEN `description.md` holds its content

### Requirement: Layout Migration Rewrites Scripts And Series Markers

The `layout` step MUST remove the Video element's `resolution::` and `format::` (L6) and report `fps::`, MUST report an authored `Hyperframes/` folder (L7), and MUST convert or list series markers (L8): `series_NN.md` without a scope document is renamed to `<s>_scope_NN.md` and gains `scope: true`, `series_NN.md` beside a scope document is a conflict, `series_rules.md` or `script_template.md` without a scope document is a conflict, and with a scope document they and `video.series.json` are listed.

Source: D11 L6 to L8, settled default 5.

#### Scenario: Undeclared fields are removed

- GIVEN a Video with `resolution:: 1920x1920`, `format:: 1:1` and `fps:: 30`
- WHEN the script runs with `--apply`
- THEN `resolution` and `format` are removed and `fps` is reported and kept

#### Scenario: Marker-only series is converted

- GIVEN a series folder with only `series_NN.md`
- WHEN the script runs with `--apply`
- THEN it is renamed to `<s>_scope_NN.md` and carries `scope: true`
- AND its values and keys are unchanged

#### Scenario: Marker beside a scope document conflicts

- GIVEN `series_NN.md` and `<s>_scope_NN.md` in one series folder
- WHEN the script runs
- THEN it reports a conflict, exits 1 and writes nothing

#### Scenario: Legacy files with a scope document are listed

- GIVEN a scope document plus `series_rules.md`, `script_template.md` and `video.series.json`
- WHEN the script runs with `--apply`
- THEN the three are listed and none is deleted

### Requirement: Layout Migration Copies Sounds And Updates The Gitignore

The `layout` step MUST copy, never move, any sound file that a resolved sound key finds only under `shared/audio/` into `<s>/sounds/` (L9), and MUST add the managed gitignore block idempotently while reporting the obsolete lines `.cognnitive-video/`, `.anydeo/`, `.remotion/` and `renders/` (L10).

Source: D11 L9, L10, settled default 7.

#### Scenario: Sound is copied

- GIVEN `sounds:: [scene-boundary=whoosh]` and `series/s/shared/audio/whoosh.mp3` only
- WHEN the script runs with `--apply`
- THEN `series/s/sounds/whoosh.mp3` exists and the original remains

#### Scenario: Gitignore block is idempotent

- GIVEN a domain `.gitignore` with obsolete lines
- WHEN the script runs twice with `--apply`
- THEN the managed block appears once and the obsolete lines are reported and kept

### Requirement: Layout Migration Lists Leftovers And Never Deletes

The `layout` step MUST list `.bak*`, `_tmp_*`, `*-proto`, `_tts-ab-test`, Series-as-template records `*_video_NN.md`, `templates_*`, Spanish procedures and domain `components/` lacking the safe inset (L11) and MUST NOT delete any of them.

Source: D11 L11.

#### Scenario: Leftovers are reported

- GIVEN `.bak-outro1/`, `_tmp_notes.md`, `x-proto/` and `_tts-ab-test/`
- WHEN the script runs with `--apply`
- THEN each is listed in the report and still exists

#### Scenario: Component without inset is listed

- GIVEN a domain `components/lower-third.html` that does not declare the safe inset
- WHEN the script runs
- THEN it is listed as ignoring the safe-zone contract and is not edited

### Requirement: Layout Migration Conflicts Write Nothing

The script MUST report as a conflict, exit 1 and write nothing, any of: both `descripcion_youtube.md` and `description.md` present, a rename target with different content, a `build/` without `.nn-build`, a missing `domaiNN_NN.md`, or a series-marker conflict.

Source: D11.

#### Scenario: Both description files present

- GIVEN `descripcion_youtube.md` and `description.md` both present
- WHEN the script runs with `--apply`
- THEN it exits 1 and no file is changed

#### Scenario: Foreign build folder

- GIVEN a `build/` folder without `.nn-build`
- WHEN the script runs with `--apply`
- THEN it exits 1 and no file is changed

#### Scenario: No domain root

- GIVEN a directory with no `domaiNN_NN.md`
- WHEN the script runs
- THEN it exits 1 and writes nothing

### Requirement: Layout Migration Applies Atomically And Idempotently

`--apply` MUST write `<root>/.cognnitive/migrations/<iso>.json` holding the inverse operations before any write, MUST perform temp writes followed by same-volume renames, MUST roll back from the journal on any failure, and a second run over a migrated domain MUST report zero changes; dry run MUST be the default and exit codes MUST be 0 for ok or nothing to do, 1 for a conflict and 2 for a usage error.

Source: D11.

#### Scenario: Journal precedes writes

- GIVEN a run with `--apply`
- WHEN the first write happens
- THEN the journal file already exists

#### Scenario: Failure rolls back

- GIVEN an injected failure on the third operation
- WHEN the run fails
- THEN the tree equals its state before the run

#### Scenario: Second run is a no-op

- GIVEN a domain migrated with `--apply`
- WHEN the script runs again
- THEN it reports zero changes and exits 0

#### Scenario: Usage error

- GIVEN an unknown step `--steps nope`
- WHEN the script runs
- THEN it exits 2

### Requirement: Layout Migration Reports Invalidation

The report MUST list every script whose text changed (L5, L6 or presets) as needing re-estimate and re-approval at zero spend, and MUST list every episode as needing `produce` or `render` to regenerate its manifest.

Source: D11.

#### Scenario: Changed script is listed

- GIVEN a script whose `resolution::` was removed
- WHEN the report is read
- THEN the script is listed for re-estimate and re-approval

#### Scenario: Every episode is listed

- GIVEN a domain with three episodes
- WHEN the report is read
- THEN all three are listed for manifest regeneration

### Requirement: Layout Migration Preserves Cache Identity

After `--steps presets,layout` on the real-domain-shaped fixture, the TTS, image and avatar identities (avatar audio read from the cache) MUST equal the golden of change `2026-11-01-video-presets`, except the scenes that change lists as precedence-fix scenes.

Source: D11, invariants 1 to 12.

#### Scenario: Identities equal the golden

- GIVEN the fixture extended with layout cases and the committed before-golden
- WHEN `--steps presets,layout` is applied and the identities are recomputed
- THEN every identity equals the golden outside the listed precedence-fix scenes

#### Scenario: Unexpected difference fails

- GIVEN a changed identity for a scene not listed as precedence-fix
- WHEN the comparison test runs
- THEN it fails

## MODIFIED Requirements

### Requirement: Video Presets Migration Script

The repository MUST ship `scripts/dev/migrate-video-domain.mjs`, invoked as `node scripts/dev/migrate-video-domain.mjs <domain-dir> [--steps presets,layout] [--apply] [--json]`, as an ordered pipeline of steps whose default is `presets,layout`, whose execution order is always `presets` then `layout` whatever the argument order, and whose selected steps MUST share one document scan, one dry-run report and one atomic apply; it MUST run as a dry run by default, MUST write nothing without `--apply`, and `--apply` MUST be all-or-nothing (D8, D11).
(Previously: the script was `scripts/dev/migrate-video-presets.mjs`, `--steps` defaulted to `presets`, and `layout` was a usage error. The old name is removed with no alias.)

Source: D11, settled default 10.

The script MUST exit with code 1 when any conflict is found, in which case it MUST write nothing even with `--apply`, MUST exit with code 2 on a usage error (an unknown step name), and MUST report every change, drop, warning and conflict, as JSON when `--json` is given.

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

#### Scenario: Steps selection

- GIVEN a run with no `--steps`, a run with `--steps presets,layout` and a run with `--steps layout,presets`
- WHEN each completes
- THEN each plans the `presets` rewrites and the `layout` operations in the order `presets` then `layout`
- AND `--steps nope` exits 2 with a usage message naming the known steps

#### Scenario: Old script name is gone

- GIVEN `scripts/dev/`
- WHEN it is listed
- THEN `migrate-video-presets.mjs` does not exist and `migrate-video-domain.mjs` does

### Requirement: Blueprint-Ships Draft Authoring Tools

The skill MUST ship the draft authoring tools: `build-draft-html.mjs` (`draft.json` to a self-contained `review_console.html` with embedded thumbnails and a `reviewed.json` exporter) and `build-script-from-draft.mjs` (`reviewed.json` to a valid L3 `video-script` document named `<slug>_video-script_<s>_NN.md`). Thumbnails MUST be produced by the single `render-thumbnail.mjs` tool. The draft JSON schema MUST be named neutrally (`video-script.draft.v1`). The tools MUST read series values through the parameter cascade (series, then domain Video Defaults, then package Video Defaults), resolved by nn-core from the scope chain of the input file's folder (or `--series <dir>`). There MUST be no `video.series.json`, `--config` flag or built-in series config, and no legacy `_draft_<version>.html` alias. The generated script's frontmatter MUST be copied from the series scope document and its filename MUST use the Series slug. The tools MUST NOT write cascaded scene values that the engine resolves itself, MUST write a Preset choice as `presets:: [..]`, MUST NOT write a literal presenter `asset::`, MUST resolve `intro` through the cascade into the fixed scene's background `asset::`, and MUST NOT hardcode any series' preset names, scene slugs, background audio, filename pattern or model. The review console MUST export the renamed keys (`presets`, `background_audio`, `background_audio_volume`, `voice_speed`, `avatar_*`).
(Previously: the file names were `<slug>_draft_V_x-y-z.json`, `<slug>_reviewed.json` and `<slug>_review_console.html` with a legacy `_draft_<version>.html` alias, and the series document was named `series_NN.md`.)

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

The skill's render step MUST emit the HyperFrames project from the manifest and invoke the HyperFrames renderer. It MUST NOT bundle or install a React/Remotion runtime. The engine-provisioning step MUST ensure the pinned HyperFrames CLI rather than a Remotion engine. The engine CLI MUST expose only `compile`, `render` and `produce`, plus the primitive `synthesize-avatar`; preview is `hyperframes preview`, and there is no native 9:16 render because every other format is derived from the 1920x1920 master. The skill MUST NOT ship `render-vertical.mjs` or `assemble-video.mjs`.
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
- THEN it exits non-zero printing a usage that lists `compile`, `render` and `produce` and no `preview`

#### Scenario: Removed tools are gone

- GIVEN the skill's `scripts/` and SKILL.md
- WHEN they are inspected
- THEN neither `render-vertical.mjs` nor `assemble-video.mjs` exists or is referenced
