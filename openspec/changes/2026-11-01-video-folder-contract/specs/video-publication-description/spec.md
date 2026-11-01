# video-publication-description Specification

## Purpose

Defines `description.md`, the platform-neutral publication body of a video episode. The engine generates only its chapter block from the compiled manifest's measured scene starts; the agent writes the title, summary, sources and attribution. The file is distinct from the Video element's `description` field. Design decisions are referenced as D6 in `design.md` of change `2026-11-01-video-folder-contract`.

## Requirements

### Requirement: description.md Is A Platform-Neutral Episode File

Each episode MAY have one `E/description.md`, a pasted publication body whose name MUST NOT carry a slug, a version tag or a platform name, and whose engine-written part MUST contain no platform-specific text.

Source: D1, D6.

#### Scenario: Name is neutral

- GIVEN a finalized episode
- WHEN its folder is listed
- THEN the publication file is `description.md` and no `descripcion_youtube.md` or `youtube*.md` exists

#### Scenario: Generated block is platform-free

- GIVEN a generated chapter block
- WHEN it is read
- THEN it contains only `MM:SS Title` lines between the marker comments

### Requirement: Finalize Generates The Chapter Block

`finalize-video.mjs`, through `lib/description.mjs`, MUST write only the text between `<!-- nn:chapters:begin -->` and `<!-- nn:chapters:end -->` in `description.md`, MUST run after render, and MUST leave every byte outside the markers unchanged.

Source: D6.

#### Scenario: Prose outside the markers is preserved

- GIVEN a `description.md` with an agent-written summary and sources around the marker block
- WHEN finalize runs twice
- THEN the text outside the markers is byte-identical after each run

#### Scenario: Block is refreshed

- GIVEN a changed manifest after a re-render
- WHEN finalize runs
- THEN only the lines between the markers change

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

### Requirement: Chapter Warnings

Finalize MUST warn, without failing, when the block would have fewer than 3 chapters or when any chapter is shorter than 10 seconds, because platforms may ignore such chapter lists.

Source: D6.

#### Scenario: Too few chapters

- GIVEN a manifest with 2 scenes
- WHEN finalize runs
- THEN it warns that fewer than 3 chapters may be ignored and still writes the block

#### Scenario: Short chapter

- GIVEN a scene of 8 seconds
- WHEN finalize runs
- THEN it warns naming that chapter

### Requirement: Skeleton Creation And Marker Insertion

When `description.md` is absent, finalize MUST write a skeleton with `# <title>`, the Video `description` field as the summary, a Chapters section holding the marker block, a Sources section and an Attribution section; when it exists without markers, finalize MUST insert the block after the H1 and MUST report every handwritten line matching `^\d{1,2}:\d{2}`.

Source: D6.

#### Scenario: Skeleton is written

- GIVEN no `description.md` and a Video `description` of "A short pitch."
- WHEN finalize runs
- THEN the file has the H1, the summary "A short pitch.", the marker block, Sources and Attribution

#### Scenario: Insertion after the H1

- GIVEN a `description.md` with an H1 and no markers
- WHEN finalize runs
- THEN the marker block follows the H1 and nothing else changes

#### Scenario: Handwritten timestamps are reported

- GIVEN a `description.md` without markers containing the line `00:23 Intro`
- WHEN finalize runs
- THEN the report lists that line and the line is not deleted

### Requirement: Description Is Distinct From The Video Description Field

The Video element's `description` field MUST remain the one or two sentence episode record, `description.md` MUST be the publication body, and no new field MUST be added to the blueprint for it.

Source: D6.

#### Scenario: No new field

- GIVEN the `video-script` blueprint
- WHEN the `Video` Field Definitions are listed
- THEN `description` is present and no field refers to `description.md`

### Requirement: Stale Manifest Blocks Chapter Generation

Finalize MUST NOT generate chapters from a manifest whose `scriptSource` is not the episode script or which is older than the script.

Source: D5, D6.

#### Scenario: Stale manifest leaves the file untouched

- GIVEN a manifest older than the script
- WHEN finalize runs
- THEN it fails and `description.md` is unchanged
