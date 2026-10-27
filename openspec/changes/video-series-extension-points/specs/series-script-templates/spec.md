# Delta for series-script-templates

Scope: series and episode folders may carry slot components and sound files by convention.

## ADDED Requirements

### Requirement: Series And Episode Extension Folders

A series folder and an episode folder MAY each contain `components/<slot>.html` and
`sounds/<event>.*` (and, for `overlay-enter`, `sounds/overlay-enter.<slot>.*`). No `Series`
Concept and no new Field MUST be required. Resolution MUST be episode, then series, then the
skill fallback, found by a nearest-folder walk from the script's folder. A file present at a
nearer level MUST win over the same file at a farther level.

#### Scenario: Episode component beats series component

- GIVEN `components/title.html` in both the episode and the series folder
- WHEN the `title` slot is resolved
- THEN the episode file is used

#### Scenario: Series component beats the fallback

- GIVEN `components/title.html` only in the series folder
- WHEN the `title` slot is resolved
- THEN the series file is used, not the skill fallback

#### Scenario: No override falls back

- GIVEN no `components/title.html` at episode or series level
- WHEN the `title` slot is resolved
- THEN the skill's neutral fallback is used

#### Scenario: Folders are optional

- GIVEN a series with no `components/` or `sounds/` folder
- WHEN a video in it is rendered
- THEN rendering succeeds using fallbacks and no sound
