# Spec: Video Asset Pipeline (Empty Set First & Canonical Asset Naming)

## Purpose

Establishes the visual asset generation workflow and naming conventions for video productions within cogNNitive workspaces, preventing generative background contamination and standardizing asset management across series.

## Requirements

### REQ-1: Empty Set First Precondition (Decoupled Background Generation)
When a video script requires a recurring environment or interview set, the pipeline MUST generate assets in the order below:
1. The background set MUST be generated first as a clean, uninhabited environment (e.g. `set_entrevista.jpeg` or `set_[scene].jpeg`).
2. The generative prompt for the set MUST explicitly enforce zero human presence (negative prompt: `strictly no people, empty chairs, unoccupied room`).
3. Character avatars MUST be generated in a secondary in-painting / image-editing step using the validated empty set as the base and facial reference images as inputs.

#### Scenario: Background set generated before avatars
- GIVEN a video script requiring a recurring interview set
- WHEN preproduction assets are generated
- THEN the empty set image is produced first with no human presence
- AND character avatars are composed afterwards over that empty set

### REQ-2: Multi-Reference Identity Anchoring
1. When generating character avatars for historical or recurring figures, an isolated portrait reference on neutral/white background (`avatar_[character]_base_white.jpeg`) MUST be preserved as the canonical identity anchor.
2. Composed characters in scenes MUST anchor against the canonical portrait reference.

#### Scenario: Avatar anchored to the canonical portrait
- GIVEN a historical figure appearing in multiple scenes
- WHEN their avatar is generated for a scene
- THEN `avatar_[character]_base_white.jpeg` is used as the identity anchor

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
