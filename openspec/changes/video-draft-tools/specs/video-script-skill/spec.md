# Delta for video-script-skill

Scope: the skill ships the draft/review/authoring tools, parameterized by a series config, so every
series gets the review-before-spend workflow.

## ADDED Requirements

### Requirement: Blueprint-Ships Draft Authoring Tools

The skill MUST ship the draft authoring tools: `build-draft-html.mjs` (draft JSON → a
self-contained review HTML with embedded thumbnails and a reviewed-JSON exporter),
`build-script-from-draft.mjs` (reviewed JSON → a valid L3 `video-script` document), and
`thumbnail-v1.mjs`. The draft JSON schema MUST be named neutrally (`video-script.draft.v1`). The
tools MUST be parameterized by a **series config** and MUST NOT hardcode any single series' template
names, music default, filename pattern or avatar model.

#### Scenario: Tools run against a non-iNNteresante series

- GIVEN a series config for a series other than iNNteresante
- WHEN `build-script-from-draft.mjs` runs
- THEN the emitted filename and template references come from that config

#### Scenario: No series is hardcoded

- GIVEN the promoted tools
- WHEN they are inspected
- THEN no single series' name, template names, music path or filename pattern is hardcoded in prose or code

#### Scenario: Generated script validates

- GIVEN a reviewed draft JSON and a series config
- WHEN `build-script-from-draft.mjs` runs
- THEN it emits an L3 document that validates against the `video-script` blueprint with no schema errors

#### Scenario: Review HTML is self-contained

- GIVEN a draft JSON referencing thumbnails
- WHEN `build-draft-html.mjs` runs
- THEN the HTML embeds the thumbnails (base64), opens from `file://`, and exports `<slug>_reviewed.json`
