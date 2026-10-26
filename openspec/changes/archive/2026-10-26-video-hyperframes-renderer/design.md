# Design: HyperFrames Renderer

## Context

The engine currently has two layers with different fates:

- **Tool-agnostic (keep):** `RemotionSceneCompiler` (renamed `SceneCompiler`) lowers the
  structured iNNfo model into a `CompositionManifest`; `AssetSynthesizer`/`CacheManager`
  produce and cache TTS/media; `SpendGuard`/`plan-approval` gate spend; `render-formats.mjs`
  and `assemble-video.mjs` post-process with FFmpeg.
- **Renderer-bound (replace):** `tryRemotionRender` + `remotion-entry.tsx` + `ScriptRoot.tsx`
  + `scene/**.tsx` + `asset-synthesizer`'s `@remotion/media-parser` probe + `ensure-engine.mjs`.

The manifest stays; only the renderer-bound layer changes.

## Seam 1 — Project emitter (`scene-project.mjs`)

New pure module (no network, no HF import). Input: the manifest + a resolved `ProjectPlan`
(destination dir, component map, series overlay templates). Output: a written HyperFrames
project tree. Deterministic: same manifest → byte-identical files.

```
emitHyperframesProject(manifest, plan) -> { projectDir, indexHtml, compositions: [], assets: [] }
```

### Project tree (HF contract)

```
<renders>/<ref>/hf/
  index.html                 # root: variables + one scene host per Sub-composition + root audio
  compositions/              # one Sub-composition per Scene, ids = scene slug
    <scene-slug>.html
  assets/                    # staged media, root-relative paths (assets/<name>)
  hyperframes.json           # project config (composition id, size, fps, duration)
```

- **Root `index.html`**: declares the video variables, mounts one scene host per Scene
  (`class="clip"`, `data-start`, `data-duration`, `data-composition-id`), and holds **all
  audio** as root `<audio>` elements (D-HF3): narration per scene and music per scene, each
  with a unique `id` and its own `data-track-index`.
- **Scene Sub-composition**: `#root` template with the drawable layers as HF clips
  (`z-index` = `layer_level`), plus the overlay hosts for that scene. Paint order is `z-index`.
- Video total = root `data-duration` = `manifest.totalDurationInSeconds`.

### Manifest → project mapping

| Manifest field | HF artifact |
|---|---|
| `compositionId`, `fps`, `width`, `height`, `totalDurationInSeconds` | root composition attributes |
| `tracks.scenes[].{fromFrame,durationInFrames}` | scene host `data-start`/`data-duration` (`frame/fps`) |
| `tracks.scenes[].props.layers[]` (`layer_asset_source` staged) | clip children in the scene Sub-composition, ordered by `layer_level` |
| `tracks.audio[]` (narration + `kind:music`) | root `<audio id data-start data-duration data-volume>` |
| `tracks.overlays[]` | overlay hosts in the owning scene Sub-composition (change `video-overlays-as-intent`) |
| `tracks.scenes[].transition` | GSAP transition on the scene's **inner wrapper** (Seam 2) |

The emitter is the only place that decides HF placement. The manifest keeps its shape.

## Seam 2 — Transitions (`scene-transition.mjs`)

Resolves a scene's `transition` descriptor into a GSAP tween applied to a **child wrapper**
inside the scene host (never the `.clip` itself, per HF contract rule 5):

```
sceneTransitionFragment({ type, durationInFrames, easing }, fps) -> { js, duration }
```

Supported: `fade` (opacity), `slide-left`/`slide-right` (x), `wipe` (`clip-path`),
`none` (no tween). Pure function, unit-testable without a browser.

## Seam 3 — Duration probe (`lib/media-duration.mjs`)

```
probeDuration(filePath, { run } = {}) -> { seconds, source: 'ffprobe'|'provider'|'unknown', error? }
```

`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 <file>` primary;
the provider-reported duration is the fallback; never throws (0 + reason when unknown, as today).
`asset-synthesizer.mjs` and `synthesize-avatar.mjs` stop importing `@remotion/media-parser`.

## Seam 4 — Renderer driver

`tryHyperframesRender({ projectDir, outputPath, concurrency })`:

- resolves the pinned CLI (`npx hyperframes@<pin>`), runs `hyperframes render <projectDir>
  --out <outputPath>`; a non-zero exit is a named `VideoRenderError` (no FFmpeg fallback,
  no silent mock).
- `renderVideo` keeps its signature; only the driver changes. `--allow-mock` remains a CI seam.
- preview runs `hyperframes preview` and returns the Studio URL (replacing the stub).

## Seam 5 — Runtime provisioner (`ensure-hyperframes.mjs`)

Replace `ensure-engine.mjs`: verify the pinned HyperFrames CLI resolves and the agent skills
are present (`npx hyperframes skills update`), consent-gated, idempotent, `--check` mode.
Deletes the `@remotion/*` install path. `SKILL.md` frontmatter loses `engine: @remotion/renderer`
and gains the HyperFrames pin.

## Data structures

Unchanged: `CompositionManifest` (version `1.0.0`). New: `ProjectPlan`
`{ projectDir, componentMap: Record<overlayType, blockId>, seriesFrame?: path, pin: '0.8.192' }`.
New manifest-adjacent file: `renders/<ref>/hf/hyperframes.json`.

## Package boundaries

All new modules live in `video-script/skills/nn-video-script/scripts/` beside the compiler.
No new npm dependency for the emitter (string templating); `ffprobe`/`npx hyperframes` are
runtime binaries, not modules.

## Open questions (for design sign-off)

1. `hyperframes.json` required keys (confirm against the pinned CLI's schema).
2. Whether the emitter writes one `compositions/<scene>.html` per scene or a single
   `index.html` with inline sub-compositions (HF prefers one file per scene; confirm lint).
3. Exact overlay host markup is owned by change `video-overlays-as-intent`; the emitter must
   leave a stable insertion point (a `<!-- nn-overlay-host -->` anchor per scene).
