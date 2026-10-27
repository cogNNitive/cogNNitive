# Delta for series-script-templates

Scope: where a series keeps its Series document, components and sounds; the domain root as a
shared level.

## ADDED Requirements

### Requirement: Series, Domain And Episode Extension Folders

A series folder MAY contain one `series_NN.md` (the `series` cascade level). The domain root MAY
contain one `series_NN.md` (the `domain` level). The episode, series and domain folders MAY each
contain `components/<name>.html` and `sounds/<name>.*`, where `<name>` is a cascade value, never
an event or slot convention. File lookup MUST be episode, then series, then domain, then the
skill fallback, by a nearest-folder walk from the script's folder; a nearer file MUST win. All
folders and documents are optional. No scaffolder creates them; a new series copies the skill's
`defaults/series_NN.md`.

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

- GIVEN a series with no `series_NN.md`, `components/` or `sounds/`
- WHEN a video in it is rendered
- THEN rendering succeeds using the shipped defaults and fallbacks
