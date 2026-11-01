# Delta for cognnitive-video-engine

Scope: one declared 1920x1920 master and formats derived from it by crop; engine output under `build/`; `render` that takes a script and writes the master in place; `produce`; avatar synthesis reading the TTS cache directly; sounds found only in `sounds/`; truthful estimate; a layout-independent cache identity. Design decision ids (D1 to D11) refer to `design.md` of change `2026-11-01-video-folder-contract`.

Composition with `2026-11-01-video-presets` (applied first): that change modifies "Deterministic Media & TTS Asset Synthesis", "Interactive Provider Consultation and Cost Estimation", "Stable TTS cache key" and "Programmatic HyperFrames Scene Compilation". This delta does not modify any of them; every requirement below has a distinct heading. "Headless Video Rendering CLI" and "Format variants with blur fill" are not touched by that change.

## ADDED Requirements

### Requirement: Single Square Master Declared By master_resolution

The compiler MUST take the master pixel size from the cascaded `master_resolution` value parsed as `^(\d+)x(\d+)$`, MUST emit a manifest whose width and height are that size, and MUST fail before any spend with `unsupported-master-resolution` when the value does not match; `scene-compiler.mjs` and `scene-project.mjs` MUST NOT default a width, height or orientation, and `isHorizontal` and the `center 12%` headroom MUST NOT exist.

Source: D3, D5, settled default 4.

#### Scenario: Manifest takes the declared size

- GIVEN the package default `master_resolution:: 1920x1920`
- WHEN a script is compiled
- THEN the manifest width and height are 1920 and 1920

#### Scenario: Unsupported value stops before spend

- GIVEN a domain Video Defaults declaring `master_resolution:: wide`
- WHEN `compile` runs
- THEN it fails with `unsupported-master-resolution`
- AND no provider request is made and no ledger entry is written

#### Scenario: Project emission requires the size

- GIVEN a manifest without width or height
- WHEN the project is emitted
- THEN emission fails with a named error and does not assume 1920x1080

### Requirement: Format Flags Are Removed From The Engine CLI

The engine CLI MUST NOT accept `--format`, `--width` or `--height`, and `FORMAT_PRESETS`, `resolveFormatSize` and the 9:16 recompile route MUST NOT exist.

Source: D3.

#### Scenario: Removed flag is a usage error

- GIVEN the engine CLI
- WHEN `render` or `compile` is run with `--format 9:16`
- THEN it exits non-zero with a usage that does not list the flag
- AND nothing is compiled or spent

### Requirement: Delivery Formats Are Derived From The Master By Crop

The format step MUST derive every delivery format as a pure function of the master file `<slug>_1920x1920.mp4` with the common arguments `-map 0:v:0 -map 0:a? -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart -map_metadata -1 -fflags +bitexact`, using `-vf crop=1080:1920:420:0` for `<slug>_1080x1920.mp4`, `-vf crop=1920:1080:0:420` for `<slug>_1920x1080.mp4` and `-vf scale=1080:1080:flags=lanczos` for `<slug>_1080x1080.mp4`.

Source: D5, settled default 2, invariant 12.

The square MUST be a real scale and MUST NOT be a stream copy.

#### Scenario: Vertical is the central columns

- GIVEN a 1920x1920 master
- WHEN the vertical format is derived
- THEN the ffmpeg arguments contain `crop=1080:1920:420:0`
- AND ffprobe reports 1080x1920 for `<slug>_1080x1920.mp4`

#### Scenario: Horizontal is the central rows

- GIVEN a 1920x1920 master
- WHEN the horizontal format is derived
- THEN the ffmpeg arguments contain `crop=1920:1080:0:420`
- AND ffprobe reports 1920x1080

#### Scenario: Square is a real scale

- GIVEN a 1920x1920 master
- WHEN the square format is derived
- THEN the ffmpeg arguments contain `scale=1080:1080:flags=lanczos` and not `-c copy`
- AND ffprobe reports 1080x1080

#### Scenario: Every output equals its name

- GIVEN all three derived outputs
- WHEN ffprobe measures each
- THEN its `<W>x<H>` equals the dimensions in its file name

### Requirement: Blur Fill Is Opt-In And Suffixed

Blur-filled variants MUST be produced only when `--fill blur` is passed, MUST use the existing blur-fill filter graph (`buildBlurFillFilter`), MUST apply only to the vertical and horizontal formats, and MUST be named `<slug>_<W>x<H>_blur.mp4`; the default fill MUST be `crop`.

Source: D5, settled default 2.

#### Scenario: Default does not blur

- GIVEN a derivation run without `--fill`
- WHEN the outputs are listed
- THEN no file name ends in `_blur.mp4`

#### Scenario: Blur variant coexists with the crop

- GIVEN `<slug>_1080x1920.mp4` already published
- WHEN the vertical format is derived with `--fill blur`
- THEN `<slug>_1080x1920_blur.mp4` is written and the crop file is unchanged

#### Scenario: Square ignores blur

- GIVEN `--fill blur` with the square format
- WHEN the outputs are derived
- THEN `<slug>_1080x1080.mp4` is written by the lanczos scale and no `_blur` square exists

### Requirement: Derivation Guards Its Input And Its Outputs

The format step MUST refuse a master that ffprobe does not report as 1920x1920, MUST read the slug from the master file name `<slug>_1920x1920.mp4`, and MUST skip an existing output unless `--force` is passed.

Source: D5.

#### Scenario: Non-square master is refused

- GIVEN a master that ffprobe reports as 1920x1080
- WHEN the format step runs
- THEN it fails with a named error and writes no output

#### Scenario: Existing output is kept

- GIVEN `<slug>_1080x1920.mp4` already exists
- WHEN the format step runs without `--force`
- THEN the file is not modified and the run reports it as skipped
- AND with `--force` the file is rewritten

#### Scenario: Derivation is deterministic

- GIVEN the same master derived twice on one machine
- WHEN the two vertical outputs are compared
- THEN they are identical files

### Requirement: Overlay Components Respect The Central Safe Square

The overlay components `lower-third`, `caption`, `title`, `quote`, `watermark` and `b-roll` MUST set `#root { inset: 21.875%; overflow: visible }` and MUST keep their own percentages relative to that inset square, so that every overlay stays inside the central 1080x1080 of the master that survives every derivation.

Source: D5.

#### Scenario: Inset is declared

- GIVEN the six shipped overlay components
- WHEN each is inspected
- THEN each declares `inset: 21.875%` on `#root`

#### Scenario: Lower third survives both crops

- GIVEN `lower-third` with `bottom: 12%`, `left: 5%` and `max-width: 70%` inside the inset square
- WHEN it is placed on the 1920x1920 master
- THEN its box sits 549.6 px above the master bottom, 474 px from the left and at most 756 px wide
- AND in the horizontal crop it sits 129.6 px above the bottom and in the vertical crop 54 px from the left

#### Scenario: Caption survives both crops

- GIVEN `caption` with `bottom: 10%`, `right: 5%` and `max-width: 60%` inside the inset square
- WHEN it is placed on the master
- THEN its box sits 528 px above the master bottom, 474 px from the right and at most 648 px wide
- AND in the horizontal crop it sits 108 px above the bottom and in the vertical crop 54 px from the right

### Requirement: Engine Output Is Written Only Under build/

The engine MUST write its manifest to `E/build/manifest.json` on every compile (the `--output` and `--out` options MUST NOT exist), MUST stage every asset only into `E/build/hyperframes/assets/` as the single staging layer with the content-addressed names `<base>_<sha12>`, MUST emit the project at `E/build/hyperframes/`, MUST create `E/build/.nn-build`, and MUST NOT create `E/public/`, `E/hyperframes/` or an `E/audio/` handoff.

Source: D2, invariant 9.

The renderer MUST NOT copy the staging folder onto itself when the staging folder and the project assets folder are the same, and `projectDir` MUST be required. Manifest absolute paths (`scriptSource`, `publicDir`, `frame.path`, `components[].path`) MUST stay absolute.

#### Scenario: Compile stages once

- GIVEN a script with one image and one narration
- WHEN `compile` completes
- THEN each staged file exists once, under `E/build/hyperframes/assets/`, named `<base>_<sha12>.<ext>`

#### Scenario: Output option is refused

- GIVEN the engine CLI
- WHEN `compile` is run with `--output out.json`
- THEN it exits non-zero with a usage that does not list the option

#### Scenario: Renderer does not copy onto itself

- GIVEN a manifest whose `publicDir` equals the project assets folder
- WHEN the project is rendered
- THEN no copy is attempted and the render proceeds

### Requirement: Render Compiles Every Time And Writes The Master In Place

The `render` command MUST accept only a script (`render <manifest.json>` MUST NOT exist), MUST compile on every run, MUST render to `E/build/render.tmp.mp4` and MUST then rename it on the same volume to `E/<slug>_1920x1920.mp4`.

Source: D2.

A rename that fails because the target is open MUST end in an error message that explains the open file.

#### Scenario: Stale manifest cannot be rendered

- GIVEN a `build/manifest.json` from before a script edit
- WHEN `render <script>` runs
- THEN the manifest is regenerated from the current script before rendering

#### Scenario: Master appears atomically

- GIVEN a render in progress
- WHEN the final file is observed before completion
- THEN `E/<slug>_1920x1920.mp4` is either absent or the previous complete master, never a partial file

#### Scenario: Manifest argument is refused

- GIVEN a path to `manifest.json`
- WHEN `render` is run with it
- THEN it exits non-zero with a usage showing a script argument

### Requirement: Render Refuses Missing Avatar Clips

The `render` command MUST refuse to render when a presenter Layer has no cached avatar clip, with a named non-zero error, unless `--allow-still-avatars` is passed.

Source: D8.

#### Scenario: Missing clip stops the render

- GIVEN a presenter Layer whose avatar clip is not in the cache
- WHEN `render <script>` runs without `--allow-still-avatars`
- THEN it fails before rendering and states the avatar synthesis command

#### Scenario: Opt-in still avatar

- GIVEN the same script
- WHEN `render` runs with `--allow-still-avatars`
- THEN it renders with the still image

### Requirement: Produce Command Runs Compile, Avatar Synthesis And Render

The engine CLI MUST provide `produce <script>` that runs compile (TTS and images, one approval), then avatar synthesis only for jobs that are not cached with the same flags object, then render, and MUST exit 3 with the resume command when avatar synthesis exits 3; `compile`, `synthesize-avatar` and `render` MUST remain available.

Source: D8, invariant 7.

#### Scenario: Phases run in order

- GIVEN fake providers and an approved plan
- WHEN `produce` runs
- THEN compile, avatar synthesis and render run in that order, with one identical `--*-model` flags object passed to compile and avatar synthesis

#### Scenario: Avatar exit 3 is propagated

- GIVEN avatar synthesis exits 3
- WHEN `produce` handles it
- THEN `produce` exits 3 and prints the resume command
- AND render has not run

#### Scenario: Re-run is idempotent

- GIVEN a completed `produce` on a full cache
- WHEN `produce` runs again
- THEN no provider request is made and no ledger entry is added

### Requirement: Avatar Synthesis Reads The TTS Cache Directly

`synthesize-avatar` MUST obtain a scene's audio from the TTS cache entry through `ttsCachePathFor(scene, {cacheManager, config, models, bags})`, MUST keep the explicit `audio_asset_source` or `voiceover` branch for scenes without narration, and on a cache miss MUST fail naming "run compile first"; compile MUST NOT write `audio/<sceneId>_voiceover.mp3`.

Source: D7.

#### Scenario: Audio comes from the cache

- GIVEN a narrated scene whose TTS cache entry exists
- WHEN `synthesize-avatar` builds the job
- THEN the audio bytes are those of the cache entry and no `audio/` file is read

#### Scenario: Cache miss names the fix

- GIVEN a narrated scene with no TTS cache entry
- WHEN `synthesize-avatar` runs
- THEN it fails with a message containing "run compile first"

#### Scenario: Compile writes no handoff

- GIVEN a compile of a narrated script
- WHEN `E/` is listed
- THEN no `audio/<sceneId>_voiceover.mp3` was created by the engine

### Requirement: Named Sounds Are Found Only In sounds/

Sound file lookup MUST search only `sounds/<name>.*` through the nearest-folder walk, MUST NOT search `shared/audio` or `audio`, and a name set at a user level whose file exists only under `shared/audio` MUST fail before any spend with `MissingAssetError` listing every directory searched.

Source: D9, settled default 7 (issue #425).

#### Scenario: shared/audio is not searched

- GIVEN `sounds:: [overlay-enter.title=click]` at the series level and `series/s/shared/audio/click.mp3` only
- WHEN `compile` runs
- THEN it fails before spend with `MissingAssetError` naming `click`, level `series` and the searched `sounds/` directories
- AND `shared/audio` is not among them

#### Scenario: sounds/ file is used

- GIVEN `series/s/sounds/click.mp3`
- WHEN the name `click` is resolved
- THEN that file is used

### Requirement: Estimate Reflects What The Run Will Charge

The cost estimator MUST price a cached item at $0, MUST quote an image only when compile would generate it (prompt present), and MUST make `total_usd` equal the amount the run will charge, so the 1.25x cap compares against real spend.

Source: D10.

#### Scenario: Cached narration costs nothing

- GIVEN a full TTS cache for a script
- WHEN the estimator runs
- THEN every cached item is priced $0 and `total_usd` is the sum of uncached items only

#### Scenario: Image without a prompt is not quoted

- GIVEN a Layer with an `asset` and no `prompt`
- WHEN the estimator runs
- THEN no image price is quoted for it

#### Scenario: Cache emptied after the estimate

- GIVEN an approved all-cached estimate whose cache is then emptied
- WHEN compile runs
- THEN compile refuses rather than spending past the approved total

### Requirement: Plan Boilerplate Is Truthful

`asset_plan.md` MUST show the in-chat approval phrase `approve the plan <hash8>` instead of an `approve-plan.mjs <this file>` command, MUST list the stamped resolved model ids instead of a `- [ ]` checklist, and MUST NOT contain a hard-coded "Recommended" tier or "Speech 2.5 HD"; the `checkApproval` hint MUST use the same phrase.

Source: D10.

#### Scenario: Plan states the phrase

- GIVEN a generated `asset_plan.md`
- WHEN it is read
- THEN it contains `approve the plan` followed by the 8-character hash and no `approve-plan.mjs <this file>` line

#### Scenario: Plan lists resolved models

- GIVEN a script whose TTS model resolves to `minimax/speech-2.8-hd`
- WHEN the plan is generated
- THEN it lists that id and contains neither "Speech 2.5 HD" nor "Recommended"

#### Scenario: Approval hint matches

- GIVEN a missing approval
- WHEN `checkApproval` fails
- THEN its hint contains the same in-chat phrase

### Requirement: Cache Identity Is Layout-Independent

No cache key (TTS, image or avatar) MUST contain a path, folder name, output name or pixel dimension, so that moving an episode, renaming an output or changing the master size declaration never changes a key.

Source: D1, cache-key audit, invariants 1 to 12.

#### Scenario: Keys survive a layout change

- GIVEN TTS, image and avatar identities computed on a fixture
- WHEN the fixture is moved to the canonical layout and the identities are recomputed
- THEN every identity is equal

#### Scenario: Output name is not an input

- GIVEN two compiles of one scene whose episode folder names differ
- WHEN the keys are compared
- THEN they are equal

### Requirement: Cache Identity Image Options Never Gain Size

The image `mediaOptions` MUST NOT include a `size` key or any key derived from the master resolution, and the image key MUST remain computed from the prompt and the options `{provider, model, title: "<scene.name> — <layer.name>", accentColor, modelOverride?}`.

Source: D3, cache-key audit.

#### Scenario: Square master adds nothing to the image key

- GIVEN the committed golden image key for a scene
- WHEN the scene is compiled with the 1920x1920 master
- THEN the image key equals the golden

#### Scenario: Display names are not renamed

- GIVEN scene and layer display names
- WHEN the layout migration and the engine change are applied
- THEN no heading is renamed and the title string in the key is unchanged

### Requirement: Cache Identity Avatar Audio Comes From The TTS Cache

The avatar key MUST remain the hash of the image bytes, the audio bytes and `{model, resolution}`, and the audio bytes MUST be those of the TTS cache entry, so the key equals the key computed from the former `audio/` copy.

Source: D7, invariant 5.

#### Scenario: Key equals the key from the audio copy

- GIVEN a narrated scene with a TTS cache entry and an `audio/` copy of the same bytes
- WHEN the avatar key is computed from each
- THEN the two keys are equal

#### Scenario: Temp clips are kept

- GIVEN avatar clips in `.cognnitive/cache/video/temp/`
- WHEN produce, finalize or the layout migration runs
- THEN no `temp/*.mp4` file is deleted

### Requirement: Cache Identity Keyless Placeholders Are Stored Offline

Without a provider key, the synthesizer MUST store the placeholder TTS audio and the placeholder image under `<key>-offline` and MUST NOT store them under the real key, and the offline placeholder image MUST be 1920x1920 and MUST NOT be part of any key.

Source: D10, settled default 8.

#### Scenario: Keyless TTS does not poison the real key

- GIVEN a run without `WAVESPEED_API_KEY`
- WHEN a narrated scene is synthesized
- THEN the placeholder is stored as `<key>-offline` and no file exists under the real key

#### Scenario: Later keyed run bills

- GIVEN a prior keyless run
- WHEN a keyed run synthesizes the same scene
- THEN the real key is a miss, the provider is called once and the real entry is stored

#### Scenario: Keyless image does not poison the real key

- GIVEN a keyless run that generates a local SVG placeholder for an image Layer
- WHEN the cache is listed
- THEN the placeholder is under `<key>-offline` and the 1920x1920 SVG is not under the real image key

### Requirement: Cache Identity Location And Domain Root Are Unchanged

The cache MUST stay at `<findDomainRoot>/.cognnitive/cache/video/{tts,images,temp}` where the domain root is the nearest `domaiNN_NN.md`, `build/` MUST NOT change the domain root, and the ledger, `pending-predictions.jsonl`, `locks/` and `video-guard.json` MUST stay at the domain root.

Source: D2, cache-key audit, invariants 1 and 10.

#### Scenario: Build folder does not relocate the cache

- GIVEN an episode with a `build/` folder
- WHEN the cache directory is resolved from the script
- THEN it is `<domain root>/.cognnitive/cache/video`

#### Scenario: Domain root detection is unchanged

- GIVEN `domaiNN_NN.md` two levels above an episode that has `build/`
- WHEN the domain root is resolved from the script and from `E/build/`
- THEN both resolve to the folder holding `domaiNN_NN.md`
- AND the ledger, locks and `video-guard.json` are read from there

### Requirement: Cache Identity Re-Run After Layout Migration Spends Nothing

A compile, avatar synthesis and render run after the layout migration on a full cache MUST make zero provider requests and MUST add zero ledger entries.

Source: D11, invariants 1 to 12, success criteria.

#### Scenario: Re-run after migration is free

- GIVEN a real-domain-shaped fixture with a full cache, migrated with `--steps presets,layout` and re-approved
- WHEN `produce` runs
- THEN the provider call count is 0 and the ledger gains no entry

#### Scenario: Only the plan hash changes

- GIVEN a migrated script whose text changed
- WHEN the plan hash is recomputed
- THEN it differs from the old approval and the estimate prices every item at $0 after re-approval

## MODIFIED Requirements

### Requirement: Headless Video Rendering CLI

The system MUST provide headless CLI commands that emit a HyperFrames project from the manifest and invoke the HyperFrames renderer to produce the 1920x1920 MP4 master, reporting the exact total duration and frame metrics. The renderer MUST render through HyperFrames only; FFmpeg-from-PATH is not the master compositor (it only derives delivery formats from the master); and a mock MP4 MUST NOT masquerade as a render (an explicit `--allow-mock` opt-in is the only exception, and it is reserved for CI). A HyperFrames failure is a loud, named, non-zero error.
(Previously: the render took "master output parameters" and FFmpeg was not allowed any compositing role; the CLI accepted `--format`, `--width`, `--height` and `--output`.)

Source: D2, D3.

#### Scenario: Headless CLI renders MP4 master via HyperFrames

- GIVEN an approved script and synthesized assets
- WHEN `render <script>` is executed
- THEN it emits the HyperFrames project and renders it to `<slug>_1920x1920.mp4`
- AND it logs total rendered frames and execution time

#### Scenario: Total duration calculation and validation

- GIVEN a completed render job
- WHEN the CLI outputs the render summary
- THEN the reported total duration matches the root `data-duration` derived from the scene sequence timings

#### Scenario: HyperFrames failure is loud, never a silent mock

- GIVEN a render where the HyperFrames CLI is unavailable
- WHEN the render CLI runs without `--allow-mock`
- THEN it fails with a named, non-zero error
- AND it never writes a mock MP4 in its place

## REMOVED Requirements

### Requirement: Format variants with blur fill

(Reason: the contain-over-blur derivation shrank the 1920x1920 master content by about 44% and contradicted the Open Gate crop protocol; derivation is now a crop by default with blur as an opt-in, and the old requirement named `<slug>_1080x1080.mp4` as the square master.)
(Migration: "Delivery Formats Are Derived From The Master By Crop" and "Blur Fill Is Opt-In And Suffixed" in this capability. Issue #428 is closed as superseded: `render-formats` is the one derivation.)
