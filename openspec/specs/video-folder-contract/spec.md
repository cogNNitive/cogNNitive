# Video Folder Contract Specification

## Purpose

Defines the three-level asset scoping (workspace, series, video), the rule that a script's asset paths never escape its own Series folder, the ephemeral/gitignored engine directories, and the finalize/register step that promotes rendered output into Element-owned storage.
## Requirements
### Requirement: Three-Level Asset Scoping

Assets MUST be scoped at exactly three levels: domain (shared across all series, at the domain root), series (shared across the episodes of one series, in `series/<s>/shared/<kind>/`, `series/<s>/sounds/`, `series/<s>/components/` and `series/<s>/frames/`), and episode (owned by one video, in `series/<s>/assets/<slug>/`).
(Previously: series scope was `series/{series-slug}/assets/`, video scope `series/{series-slug}/videos/{video-slug}/`, and segment names MAY be refined during implementation.)

Source: D1.

#### Scenario: Episode-owned files resolve inside the episode folder

- GIVEN a Video in Series `X`
- WHEN its `script`, `thumbnail` and `master` fields are resolved
- THEN all three resolve to files inside that episode's own folder under Series `X`

#### Scenario: Series shared asset is found at the series level

- GIVEN `series/X/shared/audio/intro.mp3` and a script in an episode of `X` referencing it by that relative path
- WHEN the folder-contract check runs
- THEN the reference is accepted

### Requirement: No-Upward-Escape Rule

A script's asset paths MUST NOT resolve above its scope root: the domaiNN root, or the
nearest `isolate` scope when one is in the chain. Paths MAY resolve into an ancestor scope
of the script (for example from a Video into its Series or into the domaiNN root) when the
resolved location is inside the scope root. Paths that climb outside the scope root, or
into a sibling scope's private folder, are invalid.
(Previously: asset paths MUST NOT resolve above the script's own Series folder, so
`../../assets/x.mp4` reaching a workspace-level folder was invalid.)

#### Scenario: In-scope asset path is accepted

- GIVEN a script referencing an asset inside its own video or series folder
- WHEN the folder-contract check runs
- THEN the reference is accepted

#### Scenario: Ancestor-scope asset path is accepted

- GIVEN a script in Series `X` referencing `../../assets/x.mp4` that resolves to `assets/x.mp4` inside the domaiNN root
- WHEN the folder-contract check runs
- THEN the reference is accepted

#### Scenario: Path above the scope root is rejected

- GIVEN a script referencing a path that resolves to a location above the domaiNN root
- WHEN the folder-contract check runs
- THEN the reference is rejected with an explicit escape violation

#### Scenario: Path beyond an isolate boundary is rejected

- GIVEN a Series scope with `isolate: true` and a script referencing an asset in the enclosing domaiNN root's `assets/`
- WHEN the folder-contract check runs
- THEN the reference is rejected with an explicit escape violation

#### Scenario: Sibling series folder is rejected

- GIVEN a script in Series `X` referencing a file under Series `Y`'s private folder
- WHEN the folder-contract check runs
- THEN the reference is rejected with an explicit escape violation

### Requirement: Ephemeral Engine Directories Are Not Artifacts

`build/` and `draft_thumbs/` inside an episode folder and `.cognnitive/cache/` at the domain root MUST be gitignored and MUST NOT be treated as iNNfo Artifacts. They hold transient engine output, not workspace-owned deliverables.
(Previously: `renders/` and `.cognnitive-video/`.)

Source: D2.

#### Scenario: Engine directories excluded from artifact discovery

- GIVEN an episode folder containing `build/` and `draft_thumbs/`
- WHEN artifact/manifest discovery runs
- THEN neither directory nor its contents are treated as candidate Artifacts

### Requirement: Canonical Domain, Series And Episode Layout

Every video domain MUST use one layout: the domain root holds at least `domaiNN_NN.md`, `video-defaults_NN.md`, `video-guard.json`, `.gitignore` and `.cognnitive/`, MAY hold `sounds/`, `components/`, `frames/`, `procedures/`, `assets/<library>/` and any other domaiNN content, and MUST NOT hold engine output; each series at `series/<s>/` holds its scope document `<s>_scope_NN.md` plus optional `shared/<kind>/`, `sounds/`, `components/`, `frames/`, `procedures/`, and its episodes at `series/<s>/assets/<slug>/`.

Source: D1.

An episode folder `E` MUST contain `<slug>_video-script_<s>_NN.md`, `draft.json`, `reviewed.json`, `review_console.html`, `draft_thumbs/`, `media/`, `animations/<project>/`, `asset_plan.md`, `asset_plan.approved.json`, `description.md`, the deliverables of "Deliverables Are Written In Place", and `build/`, each optional until its producing step has run. The folder name `assets/` is accepted as meaning both the domain library and the episode container, because both follow the iNNfo `{modelDir}/assets/` rule.

#### Scenario: Episodes stay where they are

- GIVEN a domain whose episodes live at `series/<s>/assets/<slug>/`
- WHEN the canonical layout is checked
- THEN no episode folder needs to move and no episode folder is missing

#### Scenario: Fully produced episode matches the layout

- GIVEN an episode that has run estimate, compile, avatar synthesis, render, thumbnails and finalize
- WHEN its folder is listed
- THEN every entry is named in the canonical layout and every engine-generated file is under `build/`

#### Scenario: Series anchor is the only series file required

- GIVEN a series folder holding only `<s>_scope_NN.md`
- WHEN the layout is checked
- THEN the series is valid and no `series_NN.md`, `series_rules.md`, `script_template.md` or `video.series.json` is required

### Requirement: Naming Scheme By File Class

File and folder names MUST follow one scheme by class: domain-indexed documents (`_NN.md`) are `<stem>_<blueprint-or-role>_NN.md` with a domain-unique kebab-case stem, working files inside `E` carry fixed `snake_case` role names with neither slug nor `V_`, deliverables that leave `E` are `<slug>_<what?>_<W>x<H>.<ext>` named by true dimensions, and `description.md` carries no slug and no `V_`.

Source: D1.

The episode script MUST keep the name `<slug>_video-script_<s>_NN.md` because it is a domain-indexed document and stems must be unique. Folders MUST be lowercase, plural when they hold many items (`assets`, `sounds`, `components`, `frames`, `animations`, `procedures`) and singular for mass nouns (`media`, `shared`, `build`). Every file and folder name MUST be English. Authored `Hyperframes/` folders are tolerated and are not renamed; new episodes use `animations/`.

#### Scenario: Deliverable name carries slug and true dimensions

- GIVEN episode slug `startup-founder` and a vertical derivation
- WHEN the output is written
- THEN its name is `startup-founder_1080x1920.mp4`

#### Scenario: Working files carry no slug or version

- GIVEN a freshly drafted episode
- WHEN `draft.json`, `reviewed.json` and `review_console.html` are inspected
- THEN none of their names contains the slug or a `V_x-y-z` tag

#### Scenario: Script keeps its domain-indexed name

- GIVEN `build-script-from-draft.mjs` run for episode `startup-founder` in series `cognitive-use-cases`
- WHEN the script is written
- THEN its name is `startup-founder_video-script_cognitive-use-cases_NN.md`

#### Scenario: Spanish names are reported, not renamed

- GIVEN a real-domain procedure file with a Spanish name
- WHEN the canonical layout is applied to a new episode
- THEN the existing file keeps its name and the contract states that new names are English

### Requirement: Deliverables Are Written In Place

Render and finalize MUST write every deliverable directly at its final path in `E`, with no promotion step and no copy out of a staging folder: the master `<slug>_1920x1920.mp4`, the derived `<slug>_1080x1920.mp4`, `<slug>_1920x1080.mp4` and `<slug>_1080x1080.mp4` (blur variants carry `_blur` before the extension), and the thumbnails `<slug>_thumbnail_<W>x<H>.png`.

Source: D1, D5 (settled default 1).

The Video element fields `master` and `thumbnail` MUST hold the bare file names of the master and the 2560x1440 thumbnail. A `Video` element MUST NOT carry a field for a derived format.

#### Scenario: Master is written at its final path

- GIVEN a successful `render`
- WHEN `E` is listed
- THEN `<slug>_1920x1920.mp4` exists in `E`
- AND `build/render.tmp.mp4` no longer exists and no other copy of the master exists

#### Scenario: Fields name the deliverables

- GIVEN a finalized episode
- WHEN the Video record is read
- THEN `master` is `<slug>_1920x1920.mp4` and `thumbnail` is `<slug>_thumbnail_2560x1440.png`

### Requirement: Engine Output Lives Only Under build/

Every file the engine generates MUST live under `E/build/`, which MUST contain `.nn-build`, `manifest.json`, `render.tmp.mp4` (only during a render), `hyperframes/` (`index.html`, `compositions/`, `components/`, `authored/`, `assets/`, `.nn-emit.json`, `.hyperframes/`) and the migration parking folder `_legacy/`; `E` MUST NOT contain `public/`, `hyperframes/`, `audio/` written by the engine, or an engine `manifest.json`.

Source: D2.

The approval file `asset_plan.approved.json` MUST stay at `E` as a tracked governance file that survives deletion of `build/`.

#### Scenario: Compile writes only under build

- GIVEN a clean episode
- WHEN `compile` completes
- THEN `E/build/manifest.json` and `E/build/hyperframes/assets/` exist
- AND `E/public`, `E/hyperframes`, `E/audio` and `E/manifest.json` do not exist

#### Scenario: Deleting build is safe

- GIVEN a produced episode with a full cache
- WHEN `E/build/` is deleted and the three engine commands run again
- THEN `asset_plan.approved.json` and every deliverable are untouched
- AND no provider request is made

#### Scenario: No collision with authored animations

- GIVEN an episode with an authored `animations/intro/` or `Hyperframes/intro/` project
- WHEN the engine emits its project
- THEN it writes to `E/build/hyperframes/` and never to a path that differs from an authored folder only by case

### Requirement: Managed Gitignore Block

The domain `.gitignore` MUST contain the managed block `**/build/`, `**/draft_thumbs/` and `.cognnitive/cache/`, and `audio/` MUST NOT be ignored because real episodes hold authored audio there.

Source: D2.

#### Scenario: Block ignores engine output

- GIVEN a domain `.gitignore` with the managed block
- WHEN `git check-ignore` is run for `series/s/assets/e/build/manifest.json` and `series/s/assets/e/draft_thumbs/a.png`
- THEN both are ignored

#### Scenario: Authored audio is not ignored

- GIVEN `series/s/assets/e/audio/00_hook.wav`
- WHEN `git check-ignore` is run for it
- THEN it is not ignored

### Requirement: Series Root Is Anchored On Scope Documents

`findSeriesRoot(startDir)` MUST return the outermost folder scope link below the domain root of `findScopeChain`, a scope document being recognised by frontmatter `scope: true` and never by filename, and MUST surface a chain that is not `ok` (for example `DUPLICATE_SCOPE_MARKER`) instead of swallowing it.

Source: D9.

The consumers `video-engine-cli.mjs`, `render-thumbnail.mjs`, `build-script-from-draft.mjs` and `build-draft-html.mjs` MUST resolve the series root through it. An episode outside any scope folder MUST have no series.

#### Scenario: Scope-only series resolves

- GIVEN `series/s/s_scope_NN.md` with `scope: true` and no other marker
- WHEN `findSeriesRoot` runs from `series/s/assets/e/`
- THEN it returns `series/s`

#### Scenario: Nested scopes resolve to the outermost

- GIVEN a scope document in `series/s/` and another in `series/s/assets/`
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

### Requirement: Legacy Series Markers Are Not Recognised

The engine, the skill and the dev tooling MUST NOT read `series_NN.md`, `series_rules.md`, `script_template.md` or `video.series.json` to locate a series or to supply any value, and `SERIES_MARKERS` and the `series_NN.md` fallback of `loadCascadeBags` MUST NOT exist.

Source: D9, settled default 5.

#### Scenario: Legacy file supplies no cascade value

- GIVEN a series with a scope document and a stale `series_NN.md` declaring `transition:: wipe`
- WHEN a Scene resolves `transition`
- THEN the value comes from the scope document or a lower level, never from `series_NN.md`

#### Scenario: Code carries no marker list

- GIVEN `lib/video-scope.mjs`
- WHEN it is searched for `SERIES_MARKERS`
- THEN no match is found

### Requirement: Authored And Engine-Generated Files Are Distinct

The contract MUST classify each episode entry as authored and tracked (scope document, script, `draft.json`, `reviewed.json`, `asset_plan.md`, `asset_plan.approved.json`, `media/`, `animations/`, `description.md`), tool-written and tracked in place (`review_console.html`, the deliverables of "Deliverables Are Written In Place"), or generated and gitignored (`build/`, `draft_thumbs/`, `.cognnitive/cache/`).

Source: D1, D2.

#### Scenario: Classes are exhaustive

- GIVEN a produced episode folder
- WHEN each entry is looked up in the classification
- THEN every entry has exactly one class

### Requirement: One Contract Across Spec, Reference And Skill

This specification, `references/folder-contract.md` and SKILL.md MUST describe the same tree and the same names, and a cross-check test MUST fail when a path of the canonical layout is missing from either document or when either mentions a retired layout.

Source: D1, slice 5.

#### Scenario: Documents agree

- GIVEN the canonical layout paths
- WHEN `folder-contract.md` and SKILL.md are searched for each of them
- THEN every path is present in both

#### Scenario: Retired layout is absent

- GIVEN `folder-contract.md` and SKILL.md
- WHEN they are searched for `videos/{`, `renders/<ref>`, `.cognnitive-video`, `master_vertical` and a rule that paths stay inside `series/<slug>/`
- THEN no match is found
