# Spec: Two-Phase Thumbnail Pipeline & Programmatic Renderer

## Purpose

Defines the two-phase generation process for video thumbnails, separating visual diffusion generation from deterministic typography and branding composition to guarantee readability at small scale (YouTube / mobile feeds).
## Requirements
### Requirement: REQ-1: Two-Phase Separation
1. **Phase A (Base Visual)**: The base thumbnail (`thumbnail_[topic]_base.jpeg`) MUST be generated as a 16:9 visual composition without text. The prompt MUST strictly forbid generative text, typography, letters, and watermarks. Multi-face reference anchoring is applied here.
2. **Phase B (Programmatic Composition)**: Final typography and branding overlays MUST be rendered programmatically via the `render-thumbnail.mjs` CLI tool over the clean Phase A base image.

#### Scenario: Two-phase thumbnail generation
- GIVEN a topic needing a thumbnail
- WHEN the pipeline runs
- THEN a text-free base image is generated first
- AND typography is composited over it by `render-thumbnail.mjs`

### Requirement: REQ-2: Programmatic Typography Tool (`scripts/render-thumbnail.mjs`)

The `render-thumbnail.mjs` tool MUST be the only Phase B tool in the skill. It MUST:
1. Accept input parameters via CLI:
   - `--base <path>` (Required): Path to clean base image.
   - `--title <string>` (Required): Primary headline.
   - `--out <path>` (Required): Target output path for the composed image.
   - `--series <dir>` (Optional): Series folder whose `series_NN.md` supplies the default
     subtitle/badge; otherwise the cascade walks from `--out`'s folder.
   - `--subtitle <string>`, `--badge <string>` (Optional): each defaults to the Series `title`
     read through the parameter cascade (walking from `--out`'s folder, or `--series <dir>`).
   - `--width <number>` (Optional, default: 2560), `--height <number>` (Optional, default: 1440).
2. Render bold sans-serif typography with a high-contrast stroke or drop shadow and a translucent
   brand pill badge; font and accent come from the resolved `frame` tokens.
3. Render the design as a one-frame HyperFrames composition through the pinned HyperFrames CLI.
   The skill MUST NOT depend on `sharp`.
4. Scale and fit the base image without distortion (cover).
5. Output a valid JPEG or PNG matching the `--out` extension.
(Previously: SVG composed over the base via `sharp`; `thumbnail-v1.mjs` was a second compositor;
subtitle/badge had no series default; no frame tokens.)

#### Scenario: Typography render

- GIVEN a base image and a title
- WHEN `render-thumbnail.mjs` runs with `--base`, `--title` and `--out thumb.jpg`
- THEN it writes a 2560x1440 JPEG with the title over the cover-fitted base

#### Scenario: Series title fills subtitle and badge

- GIVEN a series folder whose `series_NN.md` declares `title:: Other Series`
- WHEN the tool runs with `--series <that folder>` and no `--subtitle`/`--badge`
- THEN subtitle and badge read `Other Series`

#### Scenario: Missing required argument

- GIVEN no `--title`
- WHEN the tool runs
- THEN it exits non-zero with its usage line and writes nothing

#### Scenario: No sharp

- GIVEN the skill's package manifest and its thumbnail renderer
- WHEN they are inspected
- THEN the manifest declares no `sharp` dependency
- AND the thumbnail renderer imports no `sharp`

