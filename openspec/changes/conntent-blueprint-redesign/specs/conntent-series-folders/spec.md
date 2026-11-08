# conntent-series-folders Delta Spec

Source decisions: D1, D2, C1 (Slice 1: Structure).

## MODIFIED Requirements

### Requirement: Series, Domain And Episode Extension Folders

A series folder MUST contain only one Series document `<s>_coNNtent_NN.md` (naming per `conntent-folder-contract`) with frontmatter `scope: true` (the `series` cascade level), recognised by the marker and never by name, an optional `library/` and `episodes/`; the domaiNN root MUST NOT be treated as a series. The domaiNN root MAY contain one `video-defaults_NN.md` (the `domain` level) and one `library/`. The reusable content of `library/` (kinds `music/`, `sounds/`, `frames/`, `components/`, `characters/`, `media/`), the lookup order episode `media/`, then series `library/`, then domaiNN `library/` (then the blueprint package for frames and components), and the level prefixes are those of capability `conntent-library`; a nearer file MUST win. The episode folder MAY hold `media/` with the same kind sub-folders for episode-only overrides. Named sounds MUST be looked up only in `sounds/` library folders: `audio/` and `media/` MUST NOT be searched for them. All folders and documents are optional. No scaffolder creates them except the setup procedures: the domaiNN Video Defaults is a copy of the package's `defaults/video-defaults_NN.md` made on adoption (SKILL.md step), and a new series writes its own Series document.
(Previously: the series, domaiNN and episode folders each MAY contain `components/<name>.html`, `sounds/<name>.*` and `frames/<name>.md`, found by a nearest-folder walk; `shared/audio/` was explicitly not searched; the series folder could hold `assets/`, `shared/<kind>/` and `procedures/`.)

Source: D1, D2, C1.

#### Scenario: Episode file beats series file
- GIVEN `components/title/COMPONENT.md` in both the episode `media/` and the series `library/`
- WHEN the `title` component name is looked up
- THEN the episode item is used

#### Scenario: Domain file is shared by every series
- GIVEN `library/sounds/whoosh.mp3` only at the domaiNN root and two series without a `library/`
- WHEN either series resolves `scene-boundary=whoosh`
- THEN the domaiNN file is used

#### Scenario: No override falls back to the package
- GIVEN no `title` component at episode, series or domaiNN level
- WHEN the `title` component is looked up
- THEN the vendored package item is used

#### Scenario: Folders are optional
- GIVEN a domaiNN with no `video-defaults_NN.md` and a series with only its Series document and `episodes/`
- WHEN a video in it is rendered
- THEN rendering succeeds using the package defaults and the package fallbacks

#### Scenario: Sound outside the sounds library is not found
- GIVEN `series/s/library/media/click.mp3` and no `sounds/click.*` in any library
- WHEN the series resolves `overlay-enter.title=click`
- THEN the file is not used and the lookup reports the `sounds/` folders searched

#### Scenario: Scope document defines the series level
- GIVEN `series/s/s_coNNtent_NN.md` with `scope: true` declaring `frame:: plain`
- WHEN a Scene in that series resolves `frame`
- THEN the value is `plain` with source `series`

#### Scenario: Series with a retired child folder
- GIVEN `series/s/sounds/`, `series/s/components/`, `series/s/frames/`, `series/s/shared/` or `series/s/assets/`
- WHEN the layout check runs
- THEN each is reported as `legacy-layout` with its replacement under `series/s/library/` or `series/s/episodes/`, and nothing is read from it

#### Scenario: Series with an unrelated entry
- GIVEN `series/s/README.md`
- WHEN the layout check runs
- THEN only a warning `unexpected-series-entry` is reported

### Requirement: Series Scope Document Declares Kinds And Chrome

The Series document `<s>_coNNtent_NN.md` (frontmatter `scope: true`) MUST be the only place where a Series declares its `Scene Kind` and `Chrome` elements (one `Chrome` element per language), and the engine MUST read them from it through the scope chain. A series folder with no Series document MUST have no kinds, and an episode there MAY use only `kind:: Libre`. Media named by `Chrome` items (`watermark` image, `cta`, `bumper`, `music`) and by a Scene Kind `asset` MUST be logical names resolved through the series `library/` as specified by capability `conntent-library`, never relative paths.
(Previously: the same, without the logical-name rule for media.)

#### Scenario: Kinds read from the scope document
- GIVEN `series/s/s_coNNtent_NN.md` declaring `Scene Kind` and `Chrome` elements
- WHEN an episode in that series is produced
- THEN the engine applies those kinds and chrome

#### Scenario: Folder without a scope document
- GIVEN a series folder with no Series document and an episode scene of kind `Noticia`
- WHEN the script is checked
- THEN `unknown-kind` is reported

#### Scenario: Kinds are not read from legacy files
- GIVEN a stale `series_rules.md` describing a scene grammar and a Series document without kinds
- WHEN an episode scene states `kind:: Hook`
- THEN `unknown-kind` is reported and the legacy file supplies nothing

#### Scenario: Chrome media is a logical name
- GIVEN a `Chrome` element with `bumper:: media/bumpers/intro` and `series/s/library/media/bumpers/intro.mp4`
- WHEN the manifest is compiled
- THEN the bumper resolves to the series library file

#### Scenario: Chrome media path is rejected
- GIVEN a `Chrome` element with `bumper:: ../../assets/bumper.mp4`
- WHEN the Series is checked
- THEN it fails with `reference-escape` naming the Chrome element
