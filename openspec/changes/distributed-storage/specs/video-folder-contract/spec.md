# Delta for video-folder-contract

Living spec read: `openspec/specs/video-folder-contract/spec.md`. The folder layout itself does not change: episodes stay at `series/<s>/assets/<slug>/`, three-level asset scoping, the no-upward-escape rule, ephemeral engine directories, deliverables in place, `build/` and the gitignore block are unchanged. What changes is the status of the layout: it stops being a convention of this contract and becomes the placement rule that the `video-script` bluepriNNt declares (`concept-storage-declaration`), validated by `placement-validation`. The file names of the series anchor and of the episode script change with the instance-model naming rule (`nn-naming-contract`), and the requirement "Canonical Domain, Series And Episode Layout" is re-stated here (A-7) so archiving leaves no contradictory text.

## MODIFIED Requirements

### Requirement: Naming Scheme By File Class

File and folder names MUST follow one scheme by class: domain-indexed documents (`_NN.md`) are `<stem>_<blueprint-or-role>_NN.md` with a kebab-case stem derived from the folder slug as specified by `nn-naming-contract` (instance model stem), working files inside `E` carry fixed `snake_case` role names with neither slug nor `V_`, deliverables that leave `E` are `<slug>_<what?>_<W>x<H>.<ext>` named by true dimensions, and `description.md` carries no slug and no `V_`.

Source: D1.

The episode script MUST keep a domain-indexed name that satisfies the instance-model naming rule of the `video-script` bluepriNNt declaration. Its stem is no longer required to be unique across the domaiNN, because identity is hierarchical (`hierarchical-identity`); the parent series name MUST NOT be needed in the stem to avoid collisions. Folders MUST be lowercase, plural when they hold many items (`assets`, `sounds`, `components`, `frames`, `animations`, `procedures`) and singular for mass nouns (`media`, `shared`, `build`). Every file and folder name MUST be English. Authored `Hyperframes/` folders are tolerated and are not renamed; new episodes use `animations/`.
(Previously: the stem had to be domain-unique, and the script MUST keep the name `<slug>_video-script_<s>_NN.md` because stems must be unique.)

#### Scenario: Deliverable name carries slug and true dimensions

- GIVEN episode slug `startup-founder` and a vertical derivation
- WHEN the output is written
- THEN its name is `startup-founder_1080x1920.mp4`

#### Scenario: Working files carry no slug or version

- GIVEN a freshly drafted episode
- WHEN `draft.json`, `reviewed.json` and `review_console.html` are inspected
- THEN none of their names contains the slug or a `V_x-y-z` tag

#### Scenario: Script name satisfies the declared rule

- GIVEN `build-script-from-draft.mjs` run for episode `startup-founder` in series `cognitive-use-cases`
- WHEN the script is written
- THEN its name satisfies the instance-model naming rule for folder slug `startup-founder`
- AND placement validation reports no naming finding

#### Scenario: Same episode slug in two series

- GIVEN episode `intro` in series `villabotijos-today` and episode `intro` in series `innteresante`
- WHEN both scripts are written
- THEN both names satisfy the rule without carrying the series name
- AND `check_domain` reports no duplicate identity

#### Scenario: Spanish names are reported, not renamed

- GIVEN a real-domain procedure file with a Spanish name
- WHEN the canonical layout is applied to a new episode
- THEN the existing file keeps its name and the contract states that new names are English

### Requirement: Canonical Domain, Series And Episode Layout

Every video domaiNN MUST use one layout: the domain root holds at least `domaiNN_NN.md`, `video-defaults_NN.md`, `video-guard.json`, `.gitignore` and `.cognnitive/`, MAY hold `sounds/`, `components/`, `frames/`, `procedures/`, `assets/<library>/` and any other domaiNN content, and MUST NOT hold engine output; each series at `series/<s>/` holds its Series instance model `<s>_video-script_NN.md` (frontmatter `scope: true`, the series scope document) plus optional `shared/<kind>/`, `sounds/`, `components/`, `frames/`, `procedures/`, and its episodes at `series/<s>/assets/<slug>/`.

An episode folder `E` MUST contain `<slug>_video-script_NN.md`, `draft.json`, `reviewed.json`, `review_console.html`, `draft_thumbs/`, `media/`, `animations/<project>/`, `asset_plan.md`, `asset_plan.approved.json`, `description.md`, the deliverables of "Deliverables Are Written In Place", and `build/`, each optional until its producing step has run. The folder name `assets/` is accepted as meaning both the domain library and the episode container, because both follow the iNNfo `{modelDir}/assets/` rule.

(Previously: the series anchor was `<s>_scope_NN.md` and the episode script was `<slug>_video-script_<s>_NN.md`.)

Source: D1.

#### Scenario: Episodes stay where they are

- GIVEN a domain whose episodes live at `series/<s>/assets/<slug>/`
- WHEN the canonical layout is checked
- THEN no episode folder needs to move and no episode folder is missing

#### Scenario: Fully produced episode matches the layout

- GIVEN an episode that has run estimate, compile, avatar synthesis, render, thumbnails and finalize
- WHEN its folder is listed
- THEN every entry is named in the canonical layout and every engine-generated file is under `build/`

#### Scenario: Series anchor is the only series file required

- GIVEN a series folder holding only `<s>_video-script_NN.md`
- WHEN the layout is checked
- THEN the series is valid and no `series_NN.md`, `series_rules.md`, `script_template.md` or `video.series.json` is required

#### Scenario: Episode script name carries no series name

- GIVEN episode `intro` in series `villabotijos-today` and in series `innteresante`
- WHEN both scripts are written
- THEN both files are named `intro_video-script_NN.md`
- AND they keep distinct hierarchical ids `villabotijos-today/intro` and `innteresante/intro`


## ADDED Requirements

### Requirement: Series and episode locations are declared by the bluepriNNt

The location of a Series scope document and of an episode folder MUST be the placement rule declared by the `video-script` bluepriNNt for `Series` and `Video`. This contract MUST NOT define a second, independent copy of that rule, and the cross-check test between this specification, `references/folder-contract.md` and SKILL.md MUST compare their layout with the declared rule.

#### Scenario: Layout agrees with the declaration
- GIVEN the placement rules declared for `Series` and `Video`
- WHEN the cross-check test runs
- THEN `series/<s>/` and `series/<s>/assets/<slug>/` in this specification, `folder-contract.md` and SKILL.md match the declared rules

#### Scenario: Episode outside its placement
- GIVEN an episode script under `kNNowledge/`
- WHEN `check_domain` runs
- THEN a placement error is reported
- AND the folder-contract check does not accept it as an episode

### Requirement: An episode is stored once

An episode MUST be stored as its instance model only. The same episode MUST NOT also be listed as a `Video` element of a compact registry (`INNteresante_video_NN.md`, `VillabotijosToday_video_NN.md` style).

#### Scenario: Registry duplicate is reported
- GIVEN `pepper-mapache` as an episode model and as an element of `VillabotijosToday_video_NN.md`
- WHEN `check_domain` runs
- THEN a double-storage error names both locations
