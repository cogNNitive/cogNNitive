# cognnitive-conntent-engine Delta Spec

Slice 3, PR 3b. Reconciles the engine description with HyperFrames, replaces the estimated captions with aligned captions, makes outputs safe for immutable deliveries, and removes the command-line approval. The `## Purpose` paragraph of the living spec still describes "headless Remotion scene compilation"; it MUST be rewritten when this delta is archived (see the first ADDED requirement).

## MODIFIED Requirements

### Requirement: Global Narration Captions Feature

The engine MUST support narration captions as a feature independent of the Layer model, resolved per scene from the cascaded `captions` (`off`, `words`, `lines`; see `conntent-captions`). When at least one scene resolves a mode other than `off`, it MUST emit a single root-level captions host (`data-track-kind="captions"`) whose entries are placed from the aligned word timings of `conntent-captions` (the displayed text being the script, the times coming from whisper alignment) and offset to each scene's global start. When every scene resolves `off`, it MUST emit no captions host. Enabling captions MUST NOT require any script change. The engine MUST NOT place caption words from estimated or evenly distributed timings.
(Previously: a video-level on/off switch, words placed from the narration prose and "measured timings".)

#### Scenario: Enabled emits one captions host

- GIVEN a video whose scenes resolve `captions: words`
- WHEN the project is emitted
- THEN exactly one root captions host is present
- AND no Sub-composition nests its own caption track

#### Scenario: Disabled emits none

- GIVEN every scene resolving `captions: off`
- WHEN the project is emitted
- THEN no captions host is present
- AND a `caption` Layer, if any, still renders as static text

#### Scenario: Times come from alignment

- GIVEN aligned timings for a scene
- WHEN the captions host is emitted
- THEN every word's start and end equals the aligned time plus the scene's global start

#### Scenario: No evenly distributed fallback

- GIVEN a scene whose alignment failed
- WHEN the project is emitted
- THEN emission is not reached (the run stopped with `caption-alignment-failed`)

### Requirement: Derivation Guards Its Input And Its Outputs

The format step MUST refuse a master that ffprobe does not report as the declared master size, MUST read the slug from the master file name `<slug>_<W>x<H>.mp4`, and MUST write each output by producing a new file and renaming it into place, never by writing in the existing file. For an existing output it MUST skip when that output was derived from the current master (its recorded source hash equals the master's hash) and MUST replace it when it was derived from another master; `--force` MUST replace it regardless.
(Previously: an existing output was skipped unless `--force` was passed, whatever master it came from, and written in place.)

#### Scenario: Wrong-size master is refused

- GIVEN a master that ffprobe reports as 1920x1080 while the declared master is 1920x1920
- WHEN the format step runs
- THEN it fails with a named error and writes no output

#### Scenario: Existing output of the current master is kept

- GIVEN `<slug>_1080x1920.mp4` derived from the current master
- WHEN the format step runs without `--force`
- THEN the file is not modified and the run reports it as skipped
- AND with `--force` the file is rewritten

#### Scenario: Output of an old master is replaced

- GIVEN `<slug>_1080x1920.mp4` derived from a previous master and a new master
- WHEN the format step runs without `--force`
- THEN the output is replaced by a file derived from the new master

#### Scenario: Replacement does not touch earlier links

- GIVEN `deliveries/v1/` hardlinked to the old `<slug>_1080x1920.mp4`
- WHEN the format step replaces that output
- THEN the file in `v1/` still holds the old bytes

#### Scenario: Derivation is deterministic

- GIVEN the same master derived twice on one machine
- WHEN the two vertical outputs are compared
- THEN they are identical files

### Requirement: Spend Guard Is Gate-Only

The spend guard MUST gate spend: it decides whether a resolved model is allowed by the domaiNN overlay (`allowed::`) of the merged model catalog and whether the run fits the cascaded `budget` (per episode) and `daily_budget`. It MUST NOT select a model id, MUST NOT hold an allowlist or price of its own, and MUST NOT supply any cascade level. `video-guard.json` MUST NOT exist. The bluepriNNt ships no `budget` default. An unset `budget` with a plan total above zero MUST be a spend stop (exit 11, naming `budget`), never an auto-approval; the daily cap is a spend stop too. An over-budget plan is authorized only by an applied human `review_gate` change carrying the current plan hash (see `conntent-review-gates`, "Spend authorization is one mechanism"), never by a command-line flag.
(Previously: the unset-budget gate was satisfied with `--approve <plan_hash>`.)
<!-- shared with slice 1: video-guard.json retirement is specified there; only the approval mechanism changes here -->

#### Scenario: Blocked resolved model is refused before spend

- GIVEN a resolved model that the domaiNN does not allow
- WHEN `compile` runs
- THEN the whole run is refused before the first charge with a named error

#### Scenario: Guard never selects

- GIVEN the guard module
- WHEN it is inspected
- THEN it returns only allow/deny and budget verdicts, never a model id

#### Scenario: Allowlist is the catalog allowlist

- GIVEN the merged model catalog
- WHEN the guard allowlist is read
- THEN it equals the models allowed by the domaiNN overlay

#### Scenario: Daily budget stops the run

- GIVEN `daily_budget:: 5`, ledger rows of the current day summing to 4.50 and an estimate of 1.00
- WHEN `produce` runs
- THEN it exits 11 before the first charge naming the daily budget

#### Scenario: Unset budget stops instead of auto-approving

- GIVEN no level declares `budget` and an estimate above zero
- WHEN `produce` runs
- THEN it exits 11 naming `budget` and no provider is called

### Requirement: Composition Renders Every Media Layer Type

The HyperFrames composition MUST render each Layer type the compiler emits (the four types `avatar`, `media`, `text`, `animation` of `conntent-model` "Layer `type::` Discriminator") using the correct primitive: a `media` Layer whose resolved asset is a video file (`mp4`, `mov`, `webm`) MUST render as a timed video element (never an image), a `media` Layer whose asset is an image MUST render as an image element, and an `avatar` Layer MUST render with a distinct framed treatment. When no layer resolves to a drawable asset, the composition MUST fall back to a solid color. The composition MUST remain presentational: it MUST NOT read the filesystem or resolve relative paths, consuming only project-relative, staged asset names (`assets/...`). No generated video clip layer exists (`capability:: video` is rejected, `conntent-model-catalog`).
(Previously: the types were named `layer_type: video`, `image` and `talking_avatar`.)

#### Scenario: Video media renders without an image-decode error

- GIVEN a scene whose `media` Layer resolves to an MP4 source
- WHEN the composition renders that scene
- THEN the video is drawn as a timed video element
- AND no image-decode failure occurs

#### Scenario: Avatar renders with its own treatment

- GIVEN a scene whose Layer is `type:: avatar` with a still image source
- WHEN the composition renders that scene
- THEN the avatar image is drawn with the distinct framed avatar treatment, not the generic image path

#### Scenario: No drawable layer falls back to color

- GIVEN a scene with no resolvable media layer
- WHEN the composition renders that scene
- THEN the scene background is a solid color fill, not an empty or broken frame

#### Scenario: Legacy type names are not emitted

- GIVEN the compiler output for any script
- WHEN its layer types are listed
- THEN none is `video`, `image`, `talking_avatar` or `presenter`

### Requirement: Stable TTS cache key

The TTS cache key MUST depend only on the narration text, the resolved episode `language` (`conntent-model` "One Language Per Episode"), and the resolved `voice`, `voice_model`, `voice_speed` (when declared), `voice_emotion` (when declared) and model override, and MUST be unchanged by the public renames for an equal input. The internal TTS option keys MUST remain `model`, `voice`, `speed`, `emotion` and `modelOverride` (D5), plus `language`. Changing an `avatar` Layer's `avatar_model::` MUST NOT change the TTS cache key. This requirement is the single owner of the TTS key composition; `conntent-asset-pipeline` "Cache Entries Are Named By Their Request Key" owns only the file naming.
(Previously: `language` was not part of the key, and the Layer type was named `presenter`.)

#### Scenario: Avatar model change does not re-bill TTS

- GIVEN a Scene compiled once (TTS cached)
- WHEN the `avatar` Layer's `avatar_model::` changes and the Scene is recompiled
- THEN the TTS step is a cache hit (zero spend) for an unchanged narration

#### Scenario: Language changes the key

- GIVEN two Scenes identical in narration, voice and delivery parameters, in episodes with `language:: es` and `language:: en`
- WHEN their TTS hashes are computed
- THEN they differ

#### Scenario: Same effective inputs keep the same cache key under the new names

- GIVEN a Scene whose narration resolves voice `v`, model `m`, speed `1.1`, emotion `calm` and language `es`, expressed once with the retired names and once with `voice_model`, `voice_speed` and `voice_emotion`
- WHEN the TTS options and the hash are computed for each
- THEN the two hashes are equal

#### Scenario: Speed keeps its numeric form

- GIVEN a Preset with `voice_speed:: 1.1`
- WHEN the TTS options are built
- THEN `speed` is the number `1.1`, not the string `"1.1"`
- AND an undeclared or non-finite speed leaves `speed` absent

#### Scenario: Undeclared delivery values add nothing to the key

- GIVEN a Scene resolving no `voice_speed` and no `voice_emotion`
- WHEN the TTS options are built
- THEN the options contain no `speed` or `emotion` key

#### Scenario: Emotion keeps its trimmed form

- GIVEN a Preset with `voice_emotion:: " calm "`
- WHEN the TTS options are built
- THEN `emotion` is `calm`

### Requirement: Sound Effects Bound To Engine Events

The engine MUST support exactly these sound keys, each timed from the manifest: `video-start`
(frame 0), `video-end` (ends at the video's end), `scene-boundary` (start of every scene after
the first), `overlay-enter.<slot>` and `overlay-exit.<slot>` for the `text` styles `title`, `lower-third`,
`caption`, `quote`, `watermark` (overlay start and end), and `layer-enter.<type>` for `media`,
`animation`, `avatar` (layer start). Sounds MUST be root audio without a `data-duration`, and every named sound MUST resolve through the `sounds/` library kind (`conntent-library`). No
caption or word event MUST exist.
(Previously: `layer-enter.<type>` named `b-roll`, `animation` and `presenter`.)

#### Scenario: Per-slot key

- GIVEN the series sets `sounds:: [overlay-enter.title=click]`
- WHEN a `title` overlay enters and a `lower-third` overlay enters
- THEN `click` plays for the title only

#### Scenario: First scene has no boundary sound

- GIVEN a three-scene video with `scene-boundary` resolved
- WHEN the project is emitted
- THEN exactly two boundary sounds are emitted

#### Scenario: Retired layer keys are rejected

- GIVEN `sounds:: [layer-enter.presenter=pop]` or `[layer-enter.b-roll=pop]`
- WHEN the script is checked
- THEN it fails naming the key and the allowed `layer-enter.media`, `layer-enter.animation`, `layer-enter.avatar`

### Requirement: Pre-Compile Guard Evaluates Cascaded Values

The pre-compile guard `checkScript` MUST evaluate each name of a Layer's conditional-fields rule against the Layer's explicit fields first and, for a cascade parameter missing there, against its value resolved through the expanded chain for the owning Scene (including the active Character node), and MUST do so offline and before any spend (D7).

For an `avatar` Layer the source of the lowered image MUST be `asset` when present, otherwise the resolved `avatar`.
(Previously: the Layer type was named `presenter`, and the Character node did not exist.)

#### Scenario: Cascaded avatar satisfies the guard

- GIVEN an `avatar` Layer with neither `asset` nor `prompt` and a Series declaring `avatar:: characters/lucas/avatars/neutral`
- WHEN `checkScript` runs
- THEN no `missing-conditional-field` error is reported

#### Scenario: Avatar layer without any source fails

- GIVEN an `avatar` Layer with no `asset`, no `prompt`, no `avatar` at any level and no active Character
- WHEN `checkScript` runs
- THEN it fails with `missing-conditional-field` before any spend

#### Scenario: Lowered source prefers the explicit asset

- GIVEN an `avatar` Layer with `asset:: media/own` in a Scene whose resolved `avatar` is another file
- WHEN the Layer is lowered
- THEN the layer asset source is the file of `media/own`

#### Scenario: Preset errors are aggregated by the guard

- GIVEN a script with an `unknown-preset` error and a `missing-conditional-field` error
- WHEN `checkScript` runs
- THEN both are reported in one failure

## ADDED Requirements

### Requirement: The engine is described as a HyperFrames engine only

The engine's specification Purpose, the skill description, the skill documentation and the engine's script headers MUST describe the renderer as HyperFrames and MUST NOT describe Remotion as a renderer or dependency. The word "Remotion" MAY appear only in the requirement that forbids a Remotion dependency and in historical notes marked as such.

#### Scenario: Purpose names HyperFrames

- GIVEN the archived `cognnitive-conntent-engine` Purpose
- WHEN it is read
- THEN it describes HyperFrames compilation and rendering

#### Scenario: No Remotion in the skill

- GIVEN the skill tree, excluding its tests of absence
- WHEN it is searched for `Remotion` (case-insensitive)
- THEN no occurrence describes the renderer or a dependency

### Requirement: The engine hosts one QA module

The engine MUST host the QA checks of `conntent-qa` in one module used by `produce`, the hotfix overlay check being one of its checks; no other module MUST compare the manifest with the emitted project for overlay presence.

#### Scenario: Single implementation

- GIVEN the engine scripts
- WHEN they are searched for the overlay-presence comparison
- THEN it is found only in the QA module

### Requirement: Output files are never written in place

This requirement is the single owner of the atomic-write rule that keeps hardlinked deliveries immutable; `conntent-delivery`, `conntent-publication-description` and "Derivation Guards Its Input And Its Outputs" reference it. Every output the engine places in the episode folder that can be hardlinked into a delivery (the master, derived formats, thumbnails and the description file) MUST be written to a temporary name in the same folder and renamed over its final name. No stage MUST open such a file for writing after it has been delivered.

#### Scenario: Master replaced by rename

- GIVEN a delivered master and a new render
- WHEN the new master is placed
- THEN the old inode is unchanged and `deliveries/v1/` still holds the old bytes

#### Scenario: Thumbnail replaced by rename

- GIVEN a delivered thumbnail and a re-render
- WHEN the new thumbnail is placed
- THEN the delivered file is unchanged

#### Scenario: Description replaced by rename

- GIVEN `deliveries/v1/` and a re-run that rewrites the chapter block of the description
- WHEN the description in `v1/` is read
- THEN it holds the chapters it had at delivery
