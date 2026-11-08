# conntent-asset-pipeline Delta Spec

Source decisions: D1, C1, D4, F5 (Slices 1 and 2).

## MODIFIED Requirements

### REQ-2: Multi-Reference Identity Anchoring

1. When generating character avatars for historical or recurring figures, an isolated portrait reference on neutral/white background MUST be preserved as the canonical identity anchor. For a figure modelled as a Character (see capability `conntent-character`) the anchor MUST be `library/characters/<name>/avatars/base_white.<ext>` (at domaiNN or series level); for a one-off figure it MAY stay in the episode as `media/avatar_[character]_base_white.jpeg`.
2. Composed characters in scenes MUST anchor against the canonical portrait reference.
(Previously: the anchor was always `avatar_[character]_base_white.jpeg` and had no stated home.)

#### Scenario: Avatar anchored to the canonical portrait
- GIVEN a Character `maria` with `avatars/base_white.png`
- WHEN her avatar is generated for a scene
- THEN `base_white.png` is used as the identity anchor

#### Scenario: One-off figure keeps the episode name
- GIVEN a figure with no Character and the episode file `media/avatar_darwin_base_white.jpeg`
- WHEN the avatar is generated
- THEN that file is the identity anchor

### Requirement: REQ-3: Canonical Asset Naming Pattern

Visual preproduction assets MUST follow the standardized patterns. Episode-only assets live in the episode `media/` folder:
- `set_[scene/context].jpeg`: Empty environment/set used by one episode.
- `avatar_[role/character]_[context].jpeg`: Character placed into scene context.
- `thumbnail_[topic]_base.jpeg`: Text-free clean composite thumbnail base (the default `thumbnail_base` is the first scene still when none is declared).

Reusable assets live in a Character: poses in `library/characters/<name>/avatars/<pose>.<ext>` and recurring sets in `library/characters/<name>/backgrounds/<background>.<ext>`.

Final thumbnails MUST be deliverables named by their true dimensions and prefixed with the slug: `<slug>_thumbnail_<W>x<H>.png` in the episode folder (for example `<slug>_thumbnail_2560x1440.png`). Other deliverables follow `conntent-folder-contract` "Naming Scheme By File Class".
(Previously: `avatar_[role/character]_base_white.jpeg` and recurring `set_*` files lived in the episode `media/` folder, and the patterns did not cover reusable character assets.)

Source: D1, D5, C1, F5.

#### Scenario: Assets follow the canonical naming pattern
- GIVEN an episode with generated preproduction assets in `media/`
- WHEN its filenames are inspected
- THEN each asset matches `avatar_[role/character]_...`, `set_[scene/context].jpeg` or `thumbnail_[topic]_base.jpeg`

#### Scenario: Reusable pose lives in the character
- GIVEN a Character `lucas` with a pose `smiling`
- WHEN the pose image is stored
- THEN its path is `library/characters/lucas/avatars/smiling.<ext>` and no copy is placed in an episode `media/`

#### Scenario: Final thumbnail is named by dimensions and slug
- GIVEN a final thumbnail rendered at 2560x1440 for slug `gas-pump`
- WHEN the episode folder is inspected
- THEN the file is `gas-pump_thumbnail_2560x1440.png` and no `thumbnail_[topic].jpeg` or `thumbnail.png` exists

#### Scenario: Vertical thumbnail
- GIVEN a thumbnail rendered at 1080x1920 for slug `gas-pump`
- WHEN the episode folder is inspected
- THEN the file is `gas-pump_thumbnail_1080x1920.png`

## ADDED Requirements

### Requirement: Cache Entries Are Named By Their Request Key

Every cached provider output under `.cognnitive/cache/` MUST be stored under a name derived from the lowercase hexadecimal SHA-256 of its canonical request (`<stage>/<key>.<ext>`), so equal requests share one entry and different requests never collide. The composition of the TTS key (including the resolved `language`) is owned by `cognnitive-conntent-engine` "Stable TTS cache key" and the alignment key by `conntent-captions` "Alignment is cached"; the image key MUST include the resolved `image_model`, `image_size` and prompt; the avatar key MUST include the resolved `avatar_model`, `avatar_resolution`, the pose image hash and the audio hash. A cache entry MUST NOT carry the episode slug in its name.

<!-- Assumption: the `<stage>/<key>.<ext>` layout is a naming rule, not a migration of existing entries; the design phase confirms the current on-disk layout. -->

#### Scenario: Language changes the TTS key
- GIVEN two TTS requests identical in text, voice, model and delivery parameters, one with `language:: es` and one with `language:: en`
- WHEN their cache keys are computed
- THEN the keys differ and the two entries are distinct files

#### Scenario: Equal requests share an entry
- GIVEN the same image request made by two episodes of different series
- WHEN both are synthesised
- THEN a single cache entry exists and the second run is a cache hit

#### Scenario: Resolution changes the avatar key
- GIVEN two avatar requests identical except `avatar_resolution` `480p` and `720p`
- WHEN their cache keys are computed
- THEN the keys differ

### Requirement: Estimator Prices Only What The Engine Produces

The cost estimator MUST emit lines for TTS, image and avatar stages only. It MUST NOT emit a line for generated video clips (previously priced at 0.030 each and never produced), and a plan MUST contain no video-clip item.

#### Scenario: No video-clip line
- GIVEN an episode with media Layers that have prompts and avatar Layers
- WHEN the estimate is built
- THEN no line has the stage `video` or a `per clip` price and the total equals the sum of the TTS, image and avatar lines

#### Scenario: Generated clip request is refused
- GIVEN a Layer whose resolved model has `capability:: video`
- WHEN the estimate is built
- THEN it fails with `unsupported-capability` ("generated video clips are not supported yet") before any spend, as owned by `conntent-model-catalog` "Video Capability Is Not Supported Yet"
