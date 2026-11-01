# video-publication-description Specification

## Purpose

Defines `description.md`, the platform-neutral publication body of a video episode. The engine prints its chapters from the compiled manifest's measured scene starts and the agent writes the whole file; the agent-authored prose and the engine's output are both plain markdown, with no marker comments. The file is distinct from the Video element's `description` field. Design decisions are referenced as D6 in `design.md` of change `2026-11-01-video-folder-contract`.

## Requirements

### Requirement: description.md Is A Platform-Neutral Episode File

Each episode MAY have one `E/description.md`, a pasted publication body whose name MUST NOT carry a slug, a version tag or a platform name, and whose engine-written part MUST contain no platform-specific text.

Source: D1, D6.

#### Scenario: Name is neutral

- GIVEN a finalized episode
- WHEN its folder is listed
- THEN the publication file is `description.md` and no `descripcion_youtube.md` or `youtube*.md` exists

#### Scenario: Printed chapters are platform-free

- GIVEN the chapter output of finalize
- WHEN it is read
- THEN it contains only `MM:SS Title` lines and no platform name

### Requirement: Finalize Prints The Chapter Block

`finalize-video.mjs`, through `lib/description.mjs`, MUST print one chapter line per scene, computed as `floor(fromFrame / fps)` from `E/build/manifest.json` with the scene title from `props.title`, MUST run after render, and MUST NOT write any file.

Source: D6.

#### Scenario: Printed chapters match the manifest

- GIVEN a manifest with measured scene starts
- WHEN finalize runs
- THEN it prints one `MM:SS Title` line per scene, the first being `00:00`
- AND it writes no file

#### Scenario: Long videos use hours

- GIVEN a total duration of 3700 s
- WHEN the chapters are printed
- THEN every line uses `H:MM:SS`

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

- GIVEN the `video-script` blueprint
- WHEN the `Video` Field Definitions are listed
- THEN `description` is present and no field refers to `description.md`
