# Delta for two-phase-thumbnail

Scope: one Phase B tool. `thumbnail-v1.mjs` folds into `render-thumbnail.mjs` (slice S4a, always).
Item 3 depends on the S4 spike: the **PASS** text below ships with S4b; on **FAIL**, item 3 keeps
the previous SVG-over-base-via-`sharp` wording and the "No sharp" scenario is dropped. This delta
records the **FAIL** outcome: S4b did not ship (the spike could not run offline), so the tool keeps
its SVG+`sharp` rendering path and the skill keeps `sharp`.

## MODIFIED Requirements

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
   brand pill badge.
3. Render the design as SVG vector templating composed over the base image via `sharp`.
4. Scale and fit the base image without distortion (cover).
5. Output a valid JPEG or PNG matching the `--out` extension.
(Previously: SVG composed over the base via `sharp`; `thumbnail-v1.mjs` was a second compositor;
subtitle/badge had no series default.)

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
