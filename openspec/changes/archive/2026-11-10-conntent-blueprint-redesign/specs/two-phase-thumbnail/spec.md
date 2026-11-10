# two-phase-thumbnail Delta Spec

Source decisions: D5 (fields), D17, F5 (Slice 2 portion: thumbnail fields in the cascade and file naming). Producing thumbnails inside `produce` is Slice 3.

<!-- shared with slice 3: the "formats and thumbnails" stage of `produce` and its QA are specified by conntent-produce-command and conntent-qa; this part fixes the fields, defaults, renderer arguments and names. -->

## MODIFIED Requirements

### Requirement: REQ-2: Programmatic Typography Tool (`scripts/render-thumbnail.mjs`)

The `render-thumbnail.mjs` tool MUST be the only Phase B tool in the skill. It MUST:
1. Accept input parameters via CLI:
   - `--base <path>` (Required): Path to clean base image.
   - `--title <string>` (Required): Primary headline.
   - `--out <path>` (Required): Target output path for the composed image.
   - `--series <dir>` (Optional): Series folder whose scope document (`<s>_coNNtent_NN.md` with `scope: true`) supplies the default subtitle; otherwise the cascade walks from `--out`'s folder.
   - `--subtitle <string>` (Optional): defaults to the Series `title` read through the parameter cascade.
   - `--badge <string>` (Optional): no default; when absent no badge is drawn.
   - `--width <number>` (Optional, default: 2560), `--height <number>` (Optional, default: 1440).
2. Render bold sans-serif typography with a high-contrast stroke or drop shadow and, when a badge is given, a translucent brand pill badge; font and accent come from the resolved `frame` tokens `typography.heading` and `colors.primary`.
3. Render the design as a one-frame HyperFrames composition through the pinned HyperFrames CLI. The skill MUST NOT depend on `sharp`.
4. Scale and fit the base image without distortion (cover).
5. Output a valid JPEG or PNG matching the `--out` extension.

Within `produce`, the arguments MUST come from the cascade fields: `--title` from `thumbnail_title` (default the Video `title`), `--base` from `thumbnail_base` resolved as a logical name (default the first scene still), `--badge` from `thumbnail_badge` (no badge when unset), and one render per entry of `thumbnail_formats` with `--width` and `--height` taken from that entry. These defaults are the recommended defaults of an open product question listed in the proposal. Each output is placed by rename (`cognnitive-conntent-engine`, "Output files are never written in place").
(Previously: `--badge` defaulted to the Series `title`, the Series document was `<s>_scope_NN.md`, and the size flags were chosen by the caller.)

Source: D5, D9.

#### Scenario: Typography render
- GIVEN a base image and a title
- WHEN `render-thumbnail.mjs` runs with `--base`, `--title` and `--out thumb.jpg`
- THEN it writes a 2560x1440 JPEG with the title over the cover-fitted base and no badge

#### Scenario: Series title fills the subtitle only
- GIVEN a series folder whose scope document `other_coNNtent_NN.md` (`scope: true`) declares `title:: Other Series`
- WHEN the tool runs with `--series <that folder>` and no `--subtitle` or `--badge`
- THEN the subtitle reads `Other Series` and no badge is drawn

#### Scenario: Badge is drawn only when given
- GIVEN `--badge NEW`
- WHEN the tool runs
- THEN the output carries a pill badge reading `NEW`

#### Scenario: Legacy series_NN.md is not read
- GIVEN a series folder with a stale `series_NN.md` declaring `title:: Old` and a scope document declaring `title:: New`
- WHEN the tool runs with `--series <that folder>`
- THEN the subtitle reads `New`

#### Scenario: Legacy scope document name is not read
- GIVEN a series folder with only `s_scope_NN.md` declaring `title:: Old`
- WHEN the tool runs with `--series <that folder>`
- THEN the subtitle does not read `Old`

#### Scenario: Missing required argument
- GIVEN no `--title`
- WHEN the tool runs
- THEN it exits non-zero with its usage line and writes nothing

#### Scenario: Frame tokens drive the look
- GIVEN a resolved frame with `colors.primary: "#FF5A36"` and a `typography.heading.fontFamily`
- WHEN the tool renders with a badge
- THEN the badge accent is `#FF5A36` and the headline uses that font family

#### Scenario: Defaults come from the cascade
- GIVEN a Video with `title:: Why founders fail`, no `thumbnail_title`, no `thumbnail_badge` and no `thumbnail_base`
- WHEN the thumbnail stage computes its arguments
- THEN the title is `Why founders fail`, no badge is passed and the base is the first scene still

#### Scenario: Declared thumbnail fields win
- GIVEN `thumbnail_title:: Short`, `thumbnail_badge:: NEW` and `thumbnail_base:: media/hero`
- WHEN the thumbnail stage computes its arguments
- THEN the title is `Short`, the badge is `NEW` and the base is the resolved library file

#### Scenario: Base not found
- GIVEN `thumbnail_base:: media/ghost` and no such file
- WHEN the pre-compile check runs
- THEN it fails with `library-not-found` before any spend

#### Scenario: No sharp
- GIVEN the skill's package manifest and its thumbnail renderer
- WHEN they are inspected
- THEN the manifest declares no `sharp` dependency
- AND the thumbnail renderer imports no `sharp`

### Requirement: Thumbnails Are Separate Stills Named By Dimensions

Thumbnails MUST remain separate stills rendered by `render-thumbnail.mjs`, MUST NOT be derived from the video master, MUST follow the resolved `thumbnail_formats` (default `[2560x1440, 1080x1920]`) independent of the master resolution, and MUST be delivered as `<slug>_thumbnail_<W>x<H>.png` in the episode folder, one file per entry.
(Previously: the default was a single 16:9 2560x1440 still, the vertical still was rendered on request with `--width 1080 --height 1920`, and the name was the same but not tied to a field.)

Source: D5, F5.

#### Scenario: Default thumbnails are 16:9 and 9:16
- GIVEN a base image and a title with no `thumbnail_formats` set at any level
- WHEN the thumbnails are produced
- THEN `<slug>_thumbnail_2560x1440.png` and `<slug>_thumbnail_1080x1920.png` exist

#### Scenario: Custom formats
- GIVEN `thumbnail_formats:: [1280x720]` at the Series
- WHEN the thumbnails are produced
- THEN only `<slug>_thumbnail_1280x720.png` exists

#### Scenario: Vertical thumbnail by flags
- GIVEN `--width 1080 --height 1920`
- WHEN `render-thumbnail.mjs` runs
- THEN the output is 1080x1920 and is delivered as `<slug>_thumbnail_1080x1920.png`

#### Scenario: Independent of the master
- GIVEN `output_formats:: [1920x1920]`
- WHEN default thumbnails are rendered
- THEN their sizes are still 2560x1440 and 1080x1920

#### Scenario: Retired names are not produced
- GIVEN a produced episode
- WHEN its folder is listed
- THEN no `thumbnail.png` and no `thumbnail_[topic].jpeg` exists
