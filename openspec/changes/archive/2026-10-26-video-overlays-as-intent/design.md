# Design: Overlays As Intent

## Context

The manifest already carries overlay tracks (`fromFrame`, `durationInFrames`, `type`, `config`,
`enterAnimation`, `exitAnimation`). The compiler schedules `quote`/`b-roll` sequentially and
`title`/`lower-third`/`caption`/`watermark` for the whole scene. This change does not touch
scheduling; it changes how the emitter paints those tracks and where the overlay host lives.

## Seam 1 — Overlay host anchor

The project emitter (change `video-hyperframes-renderer`) reserves a stable insertion point per
scene Sub-composition:

```html
<!-- nn-overlay-host -->
```

The overlays change fills it. This keeps the renderer change and the overlays change decoupled.

## Seam 2 — Block map (`overlay-blocks.mjs`)

```
resolveOverlayBlock(type, { seriesFrame, sceneBlock }) -> { blockId, vars }
```

- Default map (`type::` → registry block id):

| `type::` | Default HyperFrames block | Variables |
|---|---|---|
| `title` | kinetic-type / text-stagger block | `data-var-text`, `position` |
| `lower-third` | lower-third block | `data-var-text` |
| `caption` | static caption/credit block | `data-var-text`, `position` |
| `quote` | quote/card block | `data-var-text` |
| `watermark` | small text notice block | `data-var-text`, `position` |
| `b-roll` | media clip block | `data-var-src`, `fit`, `zoomIn` |

- **Escape**: `seriesFrame` (a series-level HyperFrames frame dir) or `sceneBlock` (a per-scene
  block id) overrides the default for that `type::`. Resolution precedence:
  `sceneBlock > seriesFrame > registry default`.
- Each resolved block MUST be lint-clean (`hyperframes check`), so the registry default is
  preferred and the escape is the author's responsibility.

## Seam 3 — Narration subtitles as a global feature

A video-level boolean (resolved from the series config, not from a Layer) enables a single
root-level captions host (`data-track-kind="captions"`). Words are placed from the narration +
measured timings. No `Layer` participates. If disabled (default), no captions host is emitted.

The compiler MUST NOT turn a `caption` Layer into narration subtitles; a `caption` Layer renders
as static text at its position (source credit).

## Data structures

- `SeriesFrameConfig` (series-provided): `{ frameDir?, blocks?: Record<type::, blockId> }`.
- `OverlayBlock` emitted: `{ id, blockId, from, duration, trackIndex, vars }`.
- No manifest shape change.

## Package boundaries

`overlay-blocks.mjs` lives in the skill scripts beside the emitter. Series frames live in the
series tree (`series/<serie>/frames/<slug>/`), referenced by the series' L3/config, never by the
engine's own prose.

## Open questions (for design sign-off)

1. The exact registry block ids for kinetic type / lower-third / captions at the pinned HF
   version (confirm against `hyperframes-registry`).
2. Whether the series frame is declared in the series `spec_NN.md`, its Template L3, or a
   `video-guard.json`-adjacent config.
3. Whether narration captions are sourced from HF's own caption tooling (`hyperframes`) or from
   an engine-provided timing file.
