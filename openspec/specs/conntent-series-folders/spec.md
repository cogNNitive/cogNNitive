# conntent-series-folders Specification

## Purpose

Defines the nested Layer syntax mandated for series authoring documents, and the optional series, domain and episode extension folders (`<s>_scope_NN.md`, `video-defaults_NN.md`, `components/`, `sounds/`, `frames/`). This capability supersedes `series-script-templates`, whose name and Template-data requirements described the retired `Template` mechanism; those moved to capability `video-presets`. Both requirements below are carried over and corrected to the scope-document anchor the engine already resolves.
## Requirements
### Requirement: Series Authoring Documents Mandate Nested Layer Syntax

Series authoring documents and procedures MUST declare `Layer` elements as nested `### NN Layer:` headings inside enclosing `## NN Scene:` sections.

#### Scenario: Series authoring document uses nested headings

- GIVEN a series authoring document or procedure
- WHEN authoring video scripts
- THEN Scene sections contain nested `### NN Layer:` headings instead of flat `## NN Layer:` sections

### Requirement: Series, Domain And Episode Extension Folders

A series folder MAY contain one Series document `<s>_series_NN.md` with frontmatter `scope: true` (the `series` cascade level), recognised by the marker and never by name; the domain root MUST NOT be treated as a series. The domain root MAY contain one `video-defaults_NN.md` (the `domain` level). The episode, series and domain folders MAY each contain `components/<name>.html`, `sounds/<name>.*` and `frames/<name>.md`, where `<name>` is a cascade value, never an event or slot convention. File lookup MUST be episode, then series, then domain, then the skill fallback, by a nearest-folder walk from the script's folder; a nearer file MUST win. Named sounds MUST be looked up only in `sounds/` folders: `shared/audio/` and `audio/` MUST NOT be searched. All folders and documents are optional. No scaffolder creates them: the domain Video Defaults is a copy of the package's `defaults/video-defaults_NN.md` made on adoption (SKILL.md step), and a new series writes its own scope document.
(Previously: the document was named `<s>_scope_NN.md`; restated here because the Series document now also carries kinds and chrome, see "Series Scope Document Declares Kinds And Chrome".)

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

- GIVEN `s_series_NN.md` with `scope: true` declaring `frame:: plain`
- WHEN a Scene in that series resolves `frame`
- THEN the value is `plain` with source `series`

### Requirement: Series Scope Document Declares Kinds And Chrome

The Series document `<s>_series_NN.md` (frontmatter `scope: true`) MUST be the only place where a Series declares its `Scene Kind` and `Chrome` elements (one `Chrome` element per language), and the engine MUST read them from it through the scope chain. A series folder with no Series document MUST have no kinds, and an episode there MAY use only `kind:: Libre`.

#### Scenario: Kinds read from the scope document

- GIVEN `s_series_NN.md` declaring `Scene Kind` and `Chrome` elements
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

