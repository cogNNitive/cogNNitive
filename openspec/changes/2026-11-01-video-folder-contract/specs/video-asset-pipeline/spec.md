# Delta for video-asset-pipeline

Scope: canonical names of the media and thumbnail files, aligned with the folder contract. Design decision ids refer to `design.md` of change `2026-11-01-video-folder-contract`. The unnamed base-thumbnail name `thumbnail_[topic]_base.jpeg` is not settled by the design and is kept as it was.

## MODIFIED Requirements

### Requirement: REQ-3: Canonical Asset Naming Pattern

Visual preproduction assets in an episode's `media/` folder MUST follow the standardized pattern, and the final thumbnail MUST be a deliverable named by its true dimensions.
- `avatar_[role/character]_base_white.jpeg`: Canonical isolated portrait.
- `set_[scene/context].jpeg`: Empty environment/set.
- `avatar_[role/character]_[context].jpeg`: Character placed into scene context.
- `thumbnail_[topic]_base.jpeg`: Text-free clean composite thumbnail.
- `<slug>_thumbnail_<W>x<H>.png`: Final rendered thumbnail with programmatic typography, in the episode folder (for example `<slug>_thumbnail_2560x1440.png`).

(Previously: the final thumbnail was `thumbnail_[topic].jpeg` and the patterns applied to "video production folders" without naming the folder.)

Source: D1, D5, settled default 6.

#### Scenario: Assets follow the canonical naming pattern

- GIVEN an episode with generated preproduction assets in `media/`
- WHEN its filenames are inspected
- THEN each asset matches `avatar_[role/character]_...`, `set_[scene/context].jpeg`, or `thumbnail_[topic]_base.jpeg`

#### Scenario: Final thumbnail is named by dimensions

- GIVEN a final thumbnail rendered at 2560x1440
- WHEN the episode folder is inspected
- THEN the file is `<slug>_thumbnail_2560x1440.png` and no `thumbnail_[topic].jpeg` exists

#### Scenario: Vertical thumbnail

- GIVEN a thumbnail rendered with `--width 1080 --height 1920`
- WHEN the episode folder is inspected
- THEN the file is `<slug>_thumbnail_1080x1920.png`
