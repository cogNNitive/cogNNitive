# Delta for video-series-folders

Scope: the series level is anchored by its scope document instead of `series_NN.md`, and named sounds are found only in `sounds/` (issue #425). Design decision ids refer to `design.md` of change `2026-11-01-video-folder-contract`.

Composition with `2026-11-01-video-presets`: that change CREATES this capability (it supersedes `series-script-templates`). This delta targets a capability that does not exist in `openspec/specs/` until that change is archived, so this change MUST archive after it. The MODIFIED block below is a full copy of that change's version of "Series, Domain And Episode Extension Folders", edited. "Script Templates Mandate Nested Layer Syntax" is not touched. The `Purpose` paragraph of the created capability names `series_NN.md` and cannot be changed by a delta; it MUST be edited at archive time to say "scope document".

## MODIFIED Requirements

### Requirement: Series, Domain And Episode Extension Folders

A series folder MAY contain one scope document `<s>_scope_NN.md` with frontmatter `scope: true` (the `series` cascade level); the domain root MUST NOT be treated as a series. The domain root MAY contain one `video-defaults_NN.md` (the `domain` level). The episode, series and domain folders MAY each contain `components/<name>.html`, `sounds/<name>.*` and `frames/<name>.md`, where `<name>` is a cascade value, never an event or slot convention. File lookup MUST be episode, then series, then domain, then the skill fallback, by a nearest-folder walk from the script's folder; a nearer file MUST win. Named sounds MUST be looked up only in `sounds/` folders: `shared/audio/` and `audio/` MUST NOT be searched. All folders and documents are optional. No scaffolder creates them: the domain Video Defaults is a copy of the package's `defaults/video-defaults_NN.md` made on adoption (SKILL.md step), and a new series writes its own scope document.
(Previously: the series document was `series_NN.md`, and sound lookup also searched `shared/audio` and `audio`.)

Source: D9, settled defaults 5 and 7.

#### Scenario: Episode file beats series file

- GIVEN `components/title.html` in both the episode and the series folder
- WHEN the `title` component name is located
- THEN the episode file is used

#### Scenario: Domain file is shared by every series

- GIVEN `sounds/whoosh.mp3` only at the domain root and two series without `sounds/`
- WHEN either series resolves `scene-boundary=whoosh`
- THEN the domain file is used

#### Scenario: No override falls back

- GIVEN no `components/title.html` at episode, series or domain level
- WHEN the `title` component is located
- THEN the skill's neutral fallback is used

#### Scenario: Folders are optional

- GIVEN a domain with no `video-defaults_NN.md` and a series with no scope document, `components/`, `sounds/` or `frames/`
- WHEN a video in it is rendered
- THEN rendering succeeds using the package defaults and the skill fallbacks

#### Scenario: Sound under shared/audio is not found

- GIVEN `series/s/shared/audio/click.mp3` and no `sounds/click.*` at any level
- WHEN the series resolves `overlay-enter.title=click`
- THEN the file is not used and the lookup reports the `sounds/` directories searched

#### Scenario: Scope document defines the series level

- GIVEN `s_scope_NN.md` with `scope: true` declaring `frame:: brand`
- WHEN a Scene in that series resolves `frame`
- THEN the value is `brand` with source `series`
