# conntent-folder-contract Delta Spec

Source decisions: D1, D2, C1 and the F5 reconciliation (Slice 1: Structure). No backwards compatibility: legacy layouts are rejected, never adapted.

## MODIFIED Requirements

### Requirement: Three-Level Asset Scoping

Reusable and owned files MUST be scoped at exactly three levels: domaiNN (shared across all series, in `library/` at the domaiNN root), series (shared across the episodes of one series, in `series/<s>/library/`), and episode (owned by one video, in `series/<s>/episodes/<slug>/`, with its own media in `media/`). The kinds of reusable content and how they are referenced are defined by capability `conntent-library`.
(Previously: series media lived in `series/<s>/assets/`, `series/<s>/shared/<kind>/`, `series/<s>/sounds/`, `series/<s>/components/` and `series/<s>/frames/`, and the domaiNN root held `sounds/`, `components/`, `frames/` and `assets/<library>/`.)

Source: D1, C1.

#### Scenario: Episode-owned files resolve inside the episode folder
- GIVEN a Video in Series `X`
- WHEN its `script`, `thumbnail` and `master` fields are resolved
- THEN all three resolve to files inside `series/X/episodes/<slug>/`

#### Scenario: Series reusable file is found at the series level
- GIVEN `series/X/library/music/intro.mp3` and a scene of an episode of `X` with `background_audio:: music/intro`
- WHEN the folder-contract check runs
- THEN the reference is accepted and resolves to the series file

#### Scenario: Series chrome media is found at the series level
- GIVEN `series/X/library/media/bumper.mp4` named by a fixed Scene Kind as `asset:: media/bumper`
- WHEN the folder-contract check runs
- THEN the reference is accepted

#### Scenario: Series shared folder is rejected
- GIVEN `series/X/shared/audio/intro.mp3`
- WHEN the folder-contract check runs
- THEN a `legacy-layout` finding names `series/X/shared/` and `series/X/library/`

### Requirement: Canonical Domain, Series And Episode Layout

Every video domaiNN MUST use one layout. The domaiNN root holds at least `domaiNN_NN.md`, `video-defaults_NN.md`, `.gitignore` and `.cognnitive/`, MAY hold `model-catalog_NN.md`, `library/`, `procedures/` and any other domaiNN content, and MUST NOT hold engine output, `video-guard.json`, or the root folders `sounds/`, `components/` and `frames/`. Each series at `series/<s>/` MUST hold only its Series document `<s>_coNNtent_NN.md` (frontmatter `scope: true`), `library/` and `episodes/`; its episodes live at `series/<s>/episodes/<slug>/`.

An episode folder `E` MUST contain `<slug>_coNNtent_NN.md` (the episode document: record and script), and MAY contain `sources/`, `media/`, `audio/`, `animations/<project>/`, `plan.json`, `qa.json`, `<slug>_description.md`, the master `<slug>_<W>x<H>.mp4`, `formats/`, the thumbnails `<slug>_thumbnail_<W>x<H>.png`, the animatic `<slug>_animatic_<W>x<H>.mp4`, `deliveries/` and the regenerable `hyperframes/`, each optional until its producing step has run. A bare `<slug>_NN.md` MUST be rejected. `E` MUST NOT contain `build/`, `public/`, `draft.json`, `reviewed.json`, `review_console.html`, `asset_plan.md`, `asset_plan.approved.json`, `description.md`, `thumbnail.png`, or the folders `sounds/`, `components/` and `frames/`. The engine MUST discover episodes only under `series/<s>/episodes/`. A legacy episode folder left in `series/<s>/assets/` MUST be rejected as specified by "Legacy Layouts Are Rejected, Not Adapted"; episodes authored for earlier blueprint versions are not carved out as an archive and are recreated.
(Previously: the series folder MAY also hold `assets/`, `shared/<kind>/`, `sounds/`, `components/`, `frames/` and `procedures/`; the series and episode documents were named `<s>_series_NN.md` and `<slug>_coNNtent_<s>_NN.md`; the domaiNN root MAY hold `sounds/`, `components/`, `frames/` and `assets/<library>/`; an episode could hold `description.md` and `thumbnail.png`; a legacy episode folder was ignored and pre-V_0-15-0 episodes were reported as archive.)

Source: D1, C1, F5.

#### Scenario: Fully produced episode matches the layout
- GIVEN an episode that has completed `produce`
- WHEN its folder is listed
- THEN every entry is named in the canonical layout and every engine-generated file is under `hyperframes/` or `deliveries/`, or is `plan.json`, `qa.json`, the master, `formats/`, a thumbnail, the animatic or the description

#### Scenario: No build directory
- GIVEN a produced episode
- WHEN its folder is listed
- THEN no `build/` or `public/` directory exists

#### Scenario: Series holds only the anchor, the library and the episodes
- GIVEN a series folder holding `<s>_coNNtent_NN.md` with `scope: true`, `library/` and `episodes/`
- WHEN the layout is checked
- THEN the series is valid and no `series_NN.md`, `series_rules.md`, `script_template.md` or `video.series.json` is required

#### Scenario: Unexpected series entry
- GIVEN a series folder that also holds `notes.txt`
- WHEN the layout is checked
- THEN a warning `unexpected-series-entry` names the file and the layout is still valid

#### Scenario: Series with the legacy assets folder
- GIVEN `series/<s>/assets/pepper-mapache/` holding an episode document
- WHEN the layout is checked
- THEN it is rejected and no tool reads, moves or writes it

#### Scenario: Episode discovered only under episodes
- GIVEN an episode at `series/<s>/episodes/<slug>/` and another at `series/<s>/assets/<slug>/`
- WHEN the engine discovers the episodes of the series
- THEN only the first is returned and the second produces a `legacy-layout` finding

#### Scenario: Retired episode deliverable names
- GIVEN an episode folder holding `description.md` or `thumbnail.png`
- WHEN the layout is checked
- THEN a `legacy-layout` finding names the file and its replacement `<slug>_description.md` or `<slug>_thumbnail_<W>x<H>.png`

### Requirement: Naming Scheme By File Class

File and folder names MUST follow one scheme by class. Domain-indexed documents (`_NN.md`) are `<stem>_<blueprint-or-role>_NN.md`. Both the Series document and the episode document are instances of the `coNNtent` bluepriNNt and MUST be named by the nn-core instance rule `<slug>_coNNtent_NN.md` (`series/<s>/<s>_coNNtent_NN.md` and `series/<s>/episodes/<slug>/<slug>_coNNtent_NN.md`); the Series document is recognised by its frontmatter `scope: true`, never by its name, and the hierarchical id of an episode is `<s>/<slug>`. Working files inside `E` carry fixed `snake_case` or lowercase role names with neither slug nor `V_` (`plan.json`, `qa.json`). Every deliverable and every rendered preview carries the episode slug: the master and the derived formats are `<slug>_<W>x<H>.mp4` named by true dimensions (blur variants carry `_blur` before the extension), thumbnails are `<slug>_thumbnail_<W>x<H>.png`, the description is `<slug>_description.md`, the animatic is `<slug>_animatic_<W>x<H>.mp4`, and the delivery page is `<slug>_delivery.html`. The HyperFrames composition id of an episode MUST be the episode slug and MUST NOT be derived from the title.
(Previously: the Series document was `<s>_series_NN.md` and the episode document `<slug>_coNNtent_<s>_NN.md`, which break the nn-core `_NN` stem invariant; `description.md` and `thumbnail.png` carried no slug; the composition id was derived from the title; the thumbnail name had three variants across the specs.)

Source: D1, F5.

Folders MUST be lowercase, plural when they hold many items (`episodes`, `formats`, `animations`, `procedures`, `characters`, `components`, `frames`) and singular for mass nouns (`library`, `media`, `sources`, `music`, `sounds`). Every file and folder name MUST be English. The engine folder is `hyperframes/`; an authored folder differing from it only by case is a collision (see cognnitive-video-engine "Engine Project Lives In The Episode Folder"). New episodes keep authored animation projects under `animations/`.

<!-- shared with slice 3: `<slug>_description.md` is produced by conntent-publication-description and `<slug>_delivery.html` by conntent-delivery; only the names are fixed here. -->

#### Scenario: Deliverable name carries true dimensions and the slug
- GIVEN episode slug `startup-founder` and a vertical derivation
- WHEN the output is written
- THEN its name is `startup-founder_1080x1920.mp4` under `formats/`

#### Scenario: Thumbnail and description carry the slug
- GIVEN episode slug `startup-founder` with `thumbnail_formats` `[2560x1440, 1080x1920]`
- WHEN the deliverables are written
- THEN the files are `startup-founder_thumbnail_2560x1440.png`, `startup-founder_thumbnail_1080x1920.png` and `startup-founder_description.md`

#### Scenario: Working files carry no slug or version
- GIVEN a freshly produced episode
- WHEN `plan.json` is inspected
- THEN its name contains neither the slug nor a `V_x-y-z` tag

#### Scenario: Episode document name
- GIVEN episode `startup-founder` in series `cognitive-use-cases`
- WHEN its document is written
- THEN its path is `series/cognitive-use-cases/episodes/startup-founder/startup-founder_coNNtent_NN.md`
- AND a bare `startup-founder_NN.md` is rejected as a non-conforming episode document

#### Scenario: Series document name
- GIVEN series `cognitive-use-cases`
- WHEN its Series document is written
- THEN its path is `series/cognitive-use-cases/cognitive-use-cases_coNNtent_NN.md` with `scope: true`
- AND neither `cognitive-use-cases_series_NN.md` nor `<s>_scope_NN.md` is recognised as a Series document

#### Scenario: Composition id is the slug
- GIVEN episode slug `startup-founder` with title "Why founders fail"
- WHEN the HyperFrames project is emitted
- THEN the composition id is `startup-founder`

#### Scenario: Spanish names are reported, not renamed
- GIVEN a real-domain procedure file with a Spanish name
- WHEN the canonical layout is applied to a new episode
- THEN the existing file keeps its name and the contract states that new names are English

### Requirement: Deliverables Are Written In Place

Render and `produce` MUST write every deliverable directly at its final path in `E`, with no promotion step and no copy out of a staging folder: the master `<slug>_<W>x<H>.mp4` at the episode folder root, the derived formats `<slug>_<W>x<H>.mp4` declared by `output_formats` under `formats/` (blur variants carry `_blur` before the extension), and one `<slug>_thumbnail_<W>x<H>.png` at the episode folder root for each entry of `thumbnail_formats`.
(Previously: the thumbnail was a single `thumbnail.png`.)

Source: D1, D5, F5.

The Video element fields `master` and `thumbnail` MUST hold the bare file names of the master and of the first thumbnail (the first entry of `thumbnail_formats`). A `Video` element MUST NOT carry a field for a derived format or for another thumbnail.

#### Scenario: Master is written at its final path
- GIVEN a successful `render`
- WHEN `E` is listed
- THEN `<slug>_<W>x<H>.mp4` exists in `E`
- AND no temporary render file remains and no other copy of the master exists

#### Scenario: Fields name the deliverables
- GIVEN a produced episode with default `thumbnail_formats`
- WHEN the Video record is read
- THEN `master` is the master file name and `thumbnail` is `<slug>_thumbnail_2560x1440.png`

#### Scenario: One thumbnail per declared format
- GIVEN `thumbnail_formats:: [1280x720, 720x1280, 1080x1080]`
- WHEN thumbnails are produced
- THEN exactly three `<slug>_thumbnail_<W>x<H>.png` files exist in `E`

### Requirement: Authored And Engine-Generated Files Are Distinct

The contract MUST classify each entry as authored and tracked (the episode document, `sources/`, `media/`, `audio/`, `animations/`, `library/` at both levels, the Series document, `video-defaults_NN.md`, `model-catalog_NN.md`), tool-written and tracked in place (`plan.json`, `qa.json`, `<slug>_description.md`, the master, `formats/`, the thumbnails, and `deliveries/` owned by `conntent-delivery`), or generated and gitignored (`hyperframes/`, the animatic `<slug>_animatic_<W>x<H>.mp4`, `.cognnitive/cache/`, `.cognnitive/video/`).
(Previously: the classification listed `description.md` and `thumbnail.png`, and no `library/`, `plan.json`, `qa.json`, animatic or `deliveries/`.)

Source: D1, D2.

#### Scenario: Classes are exhaustive
- GIVEN a produced episode folder
- WHEN each entry is looked up in the classification
- THEN every entry has exactly one class

#### Scenario: Library is authored
- GIVEN `series/s/library/frames/night/FRAME.md`
- WHEN it is looked up in the classification
- THEN its class is authored and tracked

### Requirement: One Contract Across Spec, Reference And Skill

This specification, `references/folder-contract.md` and SKILL.md MUST describe the same tree and the same names, and a cross-check test MUST fail when a path of the canonical layout is missing from either document or when either mentions a retired layout.

Source: D1, slice 5.

#### Scenario: Documents agree
- GIVEN the canonical layout paths
- WHEN `folder-contract.md` and SKILL.md are searched for each of them
- THEN every path is present in both

#### Scenario: Retired layout is absent
- GIVEN `folder-contract.md` and SKILL.md
- WHEN they are searched for `videos/{`, `renders/<ref>`, `.cognnitive-video`, `master_vertical`, `series/<s>/assets/<slug>`, `video-guard.json`, `<s>_scope_NN.md`, `<s>_series_NN.md`, `_coNNtent_<s>_NN.md`, `asset_plan.md`, `video-ledger.jsonl`, a root `sounds/`, `components/` or `frames/` as a supported location, and a rule that paths stay inside `series/<slug>/`
- THEN no match is found outside a sentence that names it as rejected

### Requirement: Series and episode locations are declared by the bluepriNNt

The location of a Series scope document and of an episode folder MUST be the placement rule declared by the `coNNtent` bluepriNNt (`spec_NN.md`) for `Series` and `Video`; the `Video` rule MUST be `placement:: "{container}/episodes/{slug}/"` (see `conntent-blueprint` "The video-script bluepriNNt declares its storage"). This contract MUST NOT define a second, independent copy of that rule, and the cross-check test between this specification, `references/folder-contract.md` and SKILL.md MUST compare their layout with the declared rule.
(Previously: the scenario compared `series/<s>/assets/<slug>/`, and the declaring bluepriNNt was named `video-script`.)

#### Scenario: Layout agrees with the declaration
- GIVEN the placement rules declared for `Series` and `Video`
- WHEN the cross-check test runs
- THEN `series/<s>/` and `series/<s>/episodes/<slug>/` in this specification, `folder-contract.md` and SKILL.md match the declared rules

#### Scenario: Episode outside its placement
- GIVEN an episode script under `kNNowledge/`
- WHEN `check_domain` runs
- THEN a placement error is reported
- AND the folder-contract check does not accept it as an episode

## ADDED Requirements

### Requirement: Legacy Layouts Are Rejected, Not Adapted

The layout check, run by `produce`, `compile`, `check_domain` and the console export, MUST detect each legacy path of the table below and fail with code `legacy-layout`, one message per detected path, before any spend and before any file is read from it. There MUST be no alias, no legacy reader, no migration script and no automatic move.

| Detected path | Message |
|---|---|
| `series/<s>/assets/<slug>/` (a folder holding an episode document) | "episodes now live in `series/<s>/episodes/<slug>/`; recreate this domaiNN" |
| `series/<s>/assets/` (any other content) | "series media now lives in `series/<s>/library/<kind>/`; recreate this domaiNN" |
| `video-guard.json` at the domaiNN root | "`video-guard.json` is retired; allow models through `model-catalog_NN.md`" |
| `.cognnitive/video-ledger.jsonl` | "the ledger now lives in `.cognnitive/video/ledger.jsonl`" |
| `asset_plan.md` or `asset_plan.approved.json` in an episode | "the plan is now `plan.json` in the episode folder" |
| `series/<s>/<s>_series_NN.md`, `series/<s>/<s>_scope_NN.md`, or an episode document `<slug>_coNNtent_<s>_NN.md` | "documents are now named `<slug>_coNNtent_NN.md`; recreate this domaiNN" |
| `description.md` or `thumbnail.png` in an episode | "deliverables now carry the slug: `<slug>_description.md`, `<slug>_thumbnail_<W>x<H>.png`" |
| root `sounds/`, `components/`, `frames/`; `series/<s>/shared/` | see capability `conntent-library` "Legacy Root Folders Are Rejected" |

The message MUST include the detected path. Findings MUST be aggregated in one failure so the maintainer sees all of them at once.

#### Scenario: Episode in the old assets folder
- GIVEN `series/botijos-today/assets/gas-pump-printer-powerball/` holding the episode document
- WHEN `produce` starts for that series
- THEN it fails with `legacy-layout` and the message "episodes now live in `series/botijos-today/episodes/gas-pump-printer-powerball/`; recreate this domaiNN"
- AND nothing is read from, written to or spent for that folder

#### Scenario: Several legacy paths are all reported
- GIVEN `video-guard.json`, `.cognnitive/video-ledger.jsonl` and `series/s/assets/e/`
- WHEN the layout check runs
- THEN one failure lists three findings, one per path

#### Scenario: New layout is accepted
- GIVEN `series/s/episodes/e/` and `library/` and none of the legacy paths
- WHEN the layout check runs
- THEN no `legacy-layout` finding is reported

### Requirement: One Plan And One Ledger Location

The persisted plan of an episode MUST be `plan.json` in the episode folder, the ledger MUST be `<domaiNN>/.cognnitive/video/ledger.jsonl` and the timing log `<domaiNN>/.cognnitive/video/timings.jsonl`. The path the engine writes MUST be the path every reader (estimator, console export, verification) reads; a test MUST assert that the writer and the readers use the same constant. `asset_plan.md` MUST NOT be required or produced.

<!-- shared with slice 3: the content of the plan, `plan_hash` and the gates are specified by conntent-run-facts and conntent-review-gates; this requirement fixes locations only. -->

#### Scenario: Writer and reader agree
- GIVEN a run that appends a ledger row
- WHEN the console export collects the spend
- THEN it reads the row from `.cognnitive/video/ledger.jsonl`

#### Scenario: Plan is in the episode folder
- GIVEN an episode whose plan has been persisted
- WHEN `E` is listed
- THEN `plan.json` exists in `E` and no `asset_plan.md` exists

### Requirement: The Spend Guard Is The Catalog Overlay

`video-guard.json` MUST NOT exist anywhere in the skill, the package, the specs or a domaiNN. The allowlist of models and their price overrides MUST come only from `model-catalog_NN.md` (see capability `conntent-model-catalog`). SKILL.md and `folder-contract.md` MUST NOT describe `video-guard.json` as mandatory or optional.

#### Scenario: Retired guard file in a domaiNN
- GIVEN a domaiNN root holding `video-guard.json`
- WHEN the layout check runs
- THEN a `legacy-layout` finding names the file and the replacement `model-catalog_NN.md`

#### Scenario: Retired guard file in the package
- GIVEN the blueprint package and its skill
- WHEN they are searched for the file name `video-guard.json` outside rejection messages and tests that assert rejection
- THEN no match is found

### Requirement: Episode Discovery Is Shared By Every Consumer

The engine, `check_domain` and the console export MUST discover the episodes of a domaiNN through one function that enumerates `series/<s>/episodes/*/` for every series folder and no other location. A consumer MUST NOT skip `series/<s>/assets/` silently: it MUST either report it through `legacy-layout` or not touch it.

<!-- shared with slice 4: the console payload and view are specified by the console capabilities; this requirement fixes the discovery rule. -->

#### Scenario: Console lists every episode under episodes
- GIVEN `series/s/episodes/a/` and `series/s/episodes/b/` each holding an episode document
- WHEN the console export builds its payload
- THEN both episodes are listed

#### Scenario: Engine and console agree
- GIVEN any domaiNN layout
- WHEN the engine and the console export enumerate episodes
- THEN the two lists are equal

## REMOVED Requirements

### Requirement: No-Upward-Escape Rule

(Reason: asset references are no longer paths that may climb between scopes. They are logical names resolved by upward lookup, and `..`, absolute paths and symbolic-link escapes are rejected. The replacement rules, including the `isolate` boundary and the sibling-series prohibition, are `conntent-library` "References Are Logical Names Resolved By Upward Lookup" and "Paths That Climb Or Point Outside Are Rejected".)
