# Delta for video-folder-contract

Change `2026-11-02-video-script-v1`. Decision D8 (folder contract) and D7 (old episodes and archive series stay untouched), aligned to design.md "Folder Contract". The engine project folder is `hyperframes/`.

## ADDED Requirements

### Requirement: One Master Per Episode

An episode folder MUST hold at most one master file `<slug>_<W>x<H>.mp4`. A new render MUST replace it atomically, and no tool MUST keep renders of earlier runs, variants of the master or a copy of it outside the derived formats in `formats/`.

Source: D8.

#### Scenario: Re-render replaces the master

- GIVEN an episode with a master and a successful re-render
- WHEN the folder is listed
- THEN exactly one master exists and it is the new one

#### Scenario: No root renders folder

- GIVEN a produced episode
- WHEN the series and domain roots are searched for a copy of its master
- THEN none is found

### Requirement: Duplicate Cleanup Deletes Only Cached Bytes

The cleanup of duplicates in an active series (`prune-duplicates.mjs`, with `--dry-run`) MUST delete a file only when its exact bytes (by content hash) exist in the provider cache, MUST report each deleted and each kept file, and MUST be run for the pilot series only as part of the pilot. It MUST NOT touch the `inntrevistas` and `cosicah` folders, including their `public/` folders.

Source: D7, D8.

#### Scenario: Cached duplicate is deleted

- GIVEN a hash-named file in an episode whose bytes equal a cache entry
- WHEN the cleanup runs
- THEN the file is deleted and the cache entry is untouched

#### Scenario: Uncached file is kept

- GIVEN a file whose bytes are in no cache entry
- WHEN the cleanup runs
- THEN the file is kept and reported

#### Scenario: Dry run deletes nothing

- GIVEN the cleanup with `--dry-run`
- WHEN it completes
- THEN it lists the files it would delete and deletes none

#### Scenario: Archive series are untouched

- GIVEN the `inntrevistas` and `cosicah` series
- WHEN the cleanup runs
- THEN no file under them is read for deletion or modified

## MODIFIED Requirements

### Requirement: Three-Level Asset Scoping

Assets MUST be scoped at exactly three levels: domain (shared across all series, at the domain root), series (shared across the episodes of one series, in `series/<s>/assets/` for series media such as a bumper, logo, music, avatar image, sound or frame, `series/<s>/shared/<kind>/`, `series/<s>/sounds/`, `series/<s>/components/` and `series/<s>/frames/`), and episode (owned by one video, in `series/<s>/episodes/<slug>/`).
(Previously: the episode level was `series/<s>/assets/<slug>/` and `series/<s>/assets/` was not a series-level folder.)

Source: D1, D8.

#### Scenario: Episode-owned files resolve inside the episode folder

- GIVEN a Video in Series `X`
- WHEN its `script`, `thumbnail` and `master` fields are resolved
- THEN all three resolve to files inside that episode's own folder under Series `X`

#### Scenario: Series shared asset is found at the series level

- GIVEN `series/X/shared/audio/intro.mp3` and a script in an episode of `X` referencing it by that relative path
- WHEN the folder-contract check runs
- THEN the reference is accepted

#### Scenario: Series chrome media is found at the series level

- GIVEN `series/X/assets/bumper.mp4` named by a fixed Scene Kind
- WHEN the folder-contract check runs
- THEN the reference is accepted

### Requirement: Ephemeral Engine Directories Are Not Artifacts

`hyperframes/` inside an episode folder, `.cognnitive/cache/` and `.cognnitive/video/` at the domain root MUST be gitignored and MUST NOT be treated as iNNfo Artifacts. They hold regenerable or machine-local engine output, not workspace-owned deliverables.
(Previously: `build/`, `draft_thumbs/` and `.cognnitive/cache/`.)

Source: D2, D8.

#### Scenario: Engine directories excluded from artifact discovery

- GIVEN an episode folder containing `hyperframes/`
- WHEN artifact/manifest discovery runs
- THEN neither the directory nor its contents are treated as candidate Artifacts

### Requirement: Canonical Domain, Series And Episode Layout

Every video domain MUST use one layout: the domain root holds at least `domaiNN_NN.md`, `video-defaults_NN.md`, `.gitignore` and `.cognnitive/`, MAY hold `model-catalog_NN.md`, `sounds/`, `components/`, `frames/`, `procedures/`, `assets/<library>/` and any other domaiNN content, and MUST NOT hold engine output or `video-guard.json`; each series at `series/<s>/` holds its Series document `<s>_series_NN.md` plus optional `assets/`, `shared/<kind>/`, `sounds/`, `components/`, `frames/`, `procedures/`, and its episodes at `series/<s>/episodes/<slug>/`.
(Previously: episodes lived at `series/<s>/assets/<slug>/`, the Series document was `<s>_scope_NN.md`, and the domain root held `video-guard.json`.)

Source: D1, D8.

An episode folder `E` MUST contain `<slug>_coNNtent_<s>_NN.md` (the episode document: record and script, where `<s>` is the series name), and MAY contain `sources/`, `media/`, `animations/<project>/`, `description.md`, the master `<slug>_<W>x<H>.mp4`, `formats/`, `thumbnail.png` and the regenerable `hyperframes/`, each optional until its producing step has run. A bare `<slug>_NN.md` MUST be rejected. `E` MUST NOT contain `build/`, `public/`, `draft.json`, `reviewed.json`, `review_console.html`, `asset_plan.md` or `asset_plan.approved.json`. The engine MUST discover episodes only under `series/<s>/episodes/`; a legacy episode folder left in `series/<s>/assets/` MUST be ignored and left for the maintainer to reorganise by hand. Episodes authored before V_0-15-0 stay where they are as an archive and are not required to match this layout.

#### Scenario: Fully produced episode matches the layout

- GIVEN an episode that has completed `produce`
- WHEN its folder is listed
- THEN every entry is named in the canonical layout and every engine-generated file is under `hyperframes/` or is the master, `formats/` or `thumbnail.png`

#### Scenario: No build directory

- GIVEN a produced episode
- WHEN its folder is listed
- THEN no `build/` or `public/` directory exists

#### Scenario: Series anchor is the only series file required

- GIVEN a series folder holding only `<s>_series_NN.md`
- WHEN the layout is checked
- THEN the series is valid and no `series_NN.md`, `series_rules.md`, `script_template.md` or `video.series.json` is required

#### Scenario: Old episodes are not moved

- GIVEN a pre-V_0-15-0 episode at `series/<s>/assets/<slug>/`
- WHEN the layout is checked
- THEN it is reported as archive and no tool moves it

#### Scenario: Legacy episode folder in assets is not discovered

- GIVEN an episode folder left under `series/<s>/assets/<slug>/` and no folder under `series/<s>/episodes/`
- WHEN the engine discovers the episodes of that series
- THEN the legacy folder is not treated as an episode and no tool reads or writes it

### Requirement: Naming Scheme By File Class

File and folder names MUST follow one scheme by class: domain-indexed documents (`_NN.md`) are `<stem>_<blueprint-or-role>_NN.md` or, for an episode, `<slug>_coNNtent_<s>_NN.md`; working files inside `E` carry fixed `snake_case` or lowercase role names with neither slug nor `V_`, the master and derived formats are `<slug>_<W>x<H>.mp4` named by true dimensions, and `description.md` carries no slug and no `V_`.
(Previously: the episode script was `<slug>_coNNtent_<s>_NN.md`, thumbnails were `<slug>_thumbnail_<W>x<H>.png`, and the working-file scenario listed `draft.json`, `reviewed.json` and `review_console.html`.)

Source: D1.

Folders MUST be lowercase, plural when they hold many items (`episodes`, `assets`, `sounds`, `components`, `frames`, `animations`, `procedures`, `formats`) and singular for mass nouns (`media`, `shared`, `sources`). Every file and folder name MUST be English. The engine folder is `hyperframes/`; an authored folder differing from it only by case is a collision (see cognnitive-video-engine "Engine Project Lives In The Episode Folder"). New episodes keep authored animation projects under `animations/`.

#### Scenario: Deliverable name carries true dimensions

- GIVEN episode slug `startup-founder` and a vertical derivation
- WHEN the output is written
- THEN its name is `startup-founder_1080x1920.mp4` under `formats/`

#### Scenario: Working files carry no slug or version

- GIVEN a freshly produced episode
- WHEN `description.md` and `thumbnail.png` are inspected
- THEN none of their names contains the slug or a `V_x-y-z` tag

#### Scenario: Episode document name

- GIVEN episode `startup-founder` in series `cognitive-use-cases`
- WHEN its document is written
- THEN its name is `startup-founder_coNNtent_cognitive-use-cases_NN.md`
- AND a bare `startup-founder_NN.md` is rejected as a non-conforming episode document

#### Scenario: Spanish names are reported, not renamed

- GIVEN a real-domain procedure file with a Spanish name
- WHEN the canonical layout is applied to a new episode
- THEN the existing file keeps its name and the contract states that new names are English

### Requirement: Deliverables Are Written In Place

Render and `produce` MUST write every deliverable directly at its final path in `E`, with no promotion step and no copy out of a staging folder: the master `<slug>_<W>x<H>.mp4` at the episode folder root, the derived formats `<slug>_<W>x<H>.mp4` declared by `output_formats` under `formats/` (blur variants carry `_blur` before the extension), and `thumbnail.png`.
(Previously: the master was `<slug>_1920x1920.mp4`, the derived formats were three fixed files beside it and thumbnails were `<slug>_thumbnail_<W>x<H>.png`.)

Source: D1, D5 (settled default 1).

The Video element fields `master` and `thumbnail` MUST hold the bare file names of the master and of the thumbnail. A `Video` element MUST NOT carry a field for a derived format.

#### Scenario: Master is written at its final path

- GIVEN a successful `render`
- WHEN `E` is listed
- THEN `<slug>_<W>x<H>.mp4` exists in `E`
- AND no temporary render file remains and no other copy of the master exists

#### Scenario: Fields name the deliverables

- GIVEN a produced episode
- WHEN the Video record is read
- THEN `master` is the master file name and `thumbnail` is `thumbnail.png`

### Requirement: Managed Gitignore Block

The domain `.gitignore` MUST contain the managed block `**/hyperframes/`, `.cognnitive/cache/` and `.cognnitive/video/`, and `audio/` MUST NOT be ignored because real episodes hold authored audio there.
(Previously: the block was `**/build/`, `**/draft_thumbs/` and `.cognnitive/cache/`.)

Source: D2.

#### Scenario: Block ignores engine output

- GIVEN a domain `.gitignore` with the managed block
- WHEN `git check-ignore` is run for `series/s/episodes/e/hyperframes/index.html` and `.cognnitive/video/ledger.jsonl`
- THEN both are ignored

#### Scenario: Authored audio is not ignored

- GIVEN `series/s/episodes/e/audio/00_hook.wav`
- WHEN `git check-ignore` is run for it
- THEN it is not ignored

### Requirement: Authored And Engine-Generated Files Are Distinct

The contract MUST classify each episode entry as authored and tracked (the episode document, `sources/`, `media/`, `animations/`, `description.md`), tool-written and tracked in place (the master, `formats/` and `thumbnail.png`), or generated and gitignored (`hyperframes/`, `.cognnitive/cache/`, `.cognnitive/video/`).
(Previously: the classification listed `draft.json`, `reviewed.json`, `review_console.html`, `asset_plan.*`, `build/` and `draft_thumbs/`.)

Source: D1, D2.

#### Scenario: Classes are exhaustive

- GIVEN a produced episode folder
- WHEN each entry is looked up in the classification
- THEN every entry has exactly one class

### Requirement: Series Root Is Anchored On Scope Documents

`findSeriesRoot(startDir)` MUST return the outermost folder scope link below the domain root of `findScopeChain`, a scope document being recognised by frontmatter `scope: true` and never by filename, and MUST surface a chain that is not `ok` (for example `DUPLICATE_SCOPE_MARKER`) instead of swallowing it.
(Previously: unchanged in behaviour; the example paths used `series/s/assets/e/`.)

Source: D9.

The consumers `video-engine-cli.mjs` (now `produce.mjs`) and `render-thumbnail.mjs` MUST resolve the series root through it. An episode outside any scope folder MUST have no series.

#### Scenario: Scope-only series resolves

- GIVEN `series/s/s_series_NN.md` with `scope: true` and no other marker
- WHEN `findSeriesRoot` runs from `series/s/episodes/e/`
- THEN it returns `series/s`

#### Scenario: Nested scopes resolve to the outermost

- GIVEN a scope document in `series/s/` and another in `series/s/episodes/`
- WHEN `findSeriesRoot` runs from an episode below both
- THEN it returns `series/s`

#### Scenario: Duplicate marker is surfaced

- GIVEN two documents with `scope: true` in one series folder
- WHEN `findSeriesRoot` runs
- THEN it raises an error naming `DUPLICATE_SCOPE_MARKER` and does not return a root

#### Scenario: Marker-only folder is not a series

- GIVEN a folder holding only `series_NN.md`, `series_rules.md` or `script_template.md`
- WHEN `findSeriesRoot` runs from an episode in it
- THEN no series root is returned

## REMOVED Requirements

### Requirement: Engine Output Lives Only Under build/

(Reason: D8 removes the separate `build/` directory; the HyperFrames project lives in `hyperframes/` of the episode folder and links its assets to the cache. See cognnitive-video-engine "Engine Project Lives In The Episode Folder".)
(Migration: engine output lives under `hyperframes/`; plan approval is `--approve <plan_hash>` and needs no tracked file.)
