# conntent-publication-description Specification

## Purpose

Defines `description.md`, the platform-neutral publication body of a video episode. The engine prints its chapters from the compiled manifest's measured scene starts and the agent writes the whole file; the agent-authored prose and the engine's output are both plain markdown, with no marker comments. The file is distinct from the Video element's `description` field. Design decisions are referenced as D6 in `design.md` of change `2026-11-01-video-folder-contract`.
## Requirements
### Requirement: description.md Is A Platform-Neutral Episode File

Each episode MAY have one `E/description.md`, a pasted publication body whose name MUST NOT carry a slug, a version tag or a platform name, whose prose (title, summary, sources, attribution) is authored by the agent as part of the proposed changeset in the cascaded `language`, and whose engine-written part (the chapter block between `<!-- chapters:start -->` and `<!-- chapters:end -->`) MUST contain no platform-specific text.
(Previously: the agent wrote the whole file from finalize's printed output.)

Source: D1, D6.

#### Scenario: Name is neutral

- GIVEN a produced episode
- WHEN its folder is listed
- THEN the publication file is `description.md` and no `descripcion_youtube.md` or `youtube*.md` exists

#### Scenario: Printed chapters are platform-free

- GIVEN the chapter output of `produce`
- WHEN it is read
- THEN it contains only `MM:SS Title` lines and no platform name

#### Scenario: Prose follows the language

- GIVEN an episode with `language:: en`
- WHEN the agent drafts the description
- THEN the prose is in English

### Requirement: Chapter Starts Come From Measured Durations

Each chapter line MUST come from one entry of `build/manifest.json` `tracks.scenes[]`, its start being `floor(fromFrame / fps)` seconds and its title `props.title`; the first line MUST be `00:00`; lines MUST be `MM:SS Title`, or `H:MM:SS Title` for every line when the total duration is 1 hour or more.

Source: D6.

#### Scenario: Floor of the measured start

- GIVEN a scene with `fromFrame` 786 at `fps` 30 (26.2 s)
- WHEN the chapter block is generated
- THEN its line starts with `00:26`

#### Scenario: First chapter is zero

- GIVEN a manifest whose first scene starts at frame 0
- WHEN the block is generated
- THEN the first line starts with `00:00`

#### Scenario: Long video uses hours

- GIVEN a total duration of 3700 seconds
- WHEN the block is generated
- THEN every line uses `H:MM:SS`

#### Scenario: Starts equal the manifest

- GIVEN any manifest
- WHEN the generated starts are compared with `floor(fromFrame / fps)` per scene
- THEN they are equal

### Requirement: Description Is Distinct From The Video Description Field

The Video element's `description` field MUST remain the one or two sentence episode record, `description.md` MUST be the publication body, and no new field MUST be added to the blueprint for it.

Source: D6.

#### Scenario: No new field

- GIVEN the `coNNtent` blueprint
- WHEN the `Video` Field Definitions are listed
- THEN `description` is present and no field refers to `description.md`

### Requirement: Produce Writes The Chapter Block

`produce`, through `lib/description.mjs`, MUST compute one chapter line per scene as `floor(fromFrame / fps)` from the manifest of the run (the scene title from `props.title`), including engine-inserted fixed scenes in their placed order, MUST run after render, and MUST write the lines inside the chapter block delimited by `<!-- chapters:start -->` and `<!-- chapters:end -->` in `description.md`. It MUST create that block when absent, MUST replace only the bytes between the two markers, and MUST NOT alter any text outside them. It MUST also print the block in the run summary.

Source: D6, maintainer decision 7.

#### Scenario: Chapters written after the prose

- GIVEN a `description.md` with agent-authored title, summary and sources, and a rendered manifest
- WHEN `produce` completes
- THEN the file holds the unchanged prose plus a `<!-- chapters:start -->` … `<!-- chapters:end -->` block with one `MM:SS Title` line per scene, the first being `00:00`

#### Scenario: Re-produce replaces only the chapters

- GIVEN a `description.md` that already has a chapter block
- WHEN `produce` runs again after a narration edit
- THEN only the bytes between the two markers change

#### Scenario: Text outside the markers is untouched

- GIVEN a chapter block followed by further agent-authored prose
- WHEN `produce` rewrites the chapters
- THEN every byte outside the two markers is identical

#### Scenario: Fixed scenes are chaptered

- GIVEN a fixed bumper scene inserted by the engine
- WHEN the chapters are written
- THEN the bumper has its own line in placed order

#### Scenario: No description file yet

- GIVEN an episode whose proposal carried no description prose
- WHEN `produce` completes
- THEN `description.md` is created containing only the two markers and the chapter lines

