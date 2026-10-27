# Delta for video-script-model

Scope: the `Video` concept of the `video-script` blueprint also carries the episode's catalogue and
delivery fields, so one L3 document is both the episode's record and its script. The retired `video`
blueprint's role is absorbed here; derived format variants stay computed, never modelled.

## ADDED Requirements

### Requirement: The Video Concept Carries The Episode Record

The `video-script` blueprint's `Video` concept MUST also declare the episode's catalogue and delivery fields `slug` (string), `description` (markdown_inline), `status` (select of `draft`/`scripting`/`rendering`/`published`/`archived`), `script` (file), `master` (video), `thumbnail` (image) and `voice_id` (string), so that one L3 document of the blueprint is both the episode's record and its script.

Each file-backed field MUST hold exactly one filename resolved under the owning model's directory, and a `Video` element MUST NOT carry a field for a derived format variant: the vertical and horizontal masters and thumbnails are derived from `master` by the `render-formats.mjs` naming convention and are never stored.

#### Scenario: An episode is one L3 document

- GIVEN an L3 document of the `video-script` blueprint holding one `## NN Video:` element with `slug`, `status`, `script`, `master` and `thumbnail`
- WHEN it is validated as an L3 document
- THEN it validates with no schema errors

#### Scenario: Format variants are derived, not modelled

- GIVEN such an episode whose `master` is `pepper-mapache_1080x1080.mp4`
- WHEN the format-variant step runs with its default formats
- THEN the vertical variant is derived as `pepper-mapache_1080x1920.mp4`
- AND the blueprint declares no `master_vertical` or `thumbnail_vertical` field

#### Scenario: The surviving concept name is unchanged

- GIVEN an episode whose script root element is `## NN Video: <title>`
- WHEN the model is inspected
- THEN the element's concept is `Video` and no rename is required
