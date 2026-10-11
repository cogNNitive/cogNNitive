# Design: video-script contract additions + b-roll/format ergonomics

## Technical Approach

Two seams, matching the existing `video-script` + `cognnitive-video-engine` contract.

1. **Blueprint owns the field contract.** `video-script/spec_NN.md` gains: Layer
   `type:: watermark` (a new value of the `type::` select), Layer fields `model`
   (string) and `fit` (select `cover`|`contain`), and Scene field `music_volume`
   (string, 0–1). The engine mirrors the conditional contract in
   `DEFAULT_CONDITIONAL_FIELDS` (kept in lockstep by `conditional-fields-drift.test.mjs`).
2. **Engine owns semantics.** `remotion-scene-compiler.mjs` maps the fields onto the
   manifest; `Watermark.tsx` / `Broll.tsx` render them; the format step is a
   post-process over the square master.

The new fields are **optional** — a document that omits them compiles byte-for-byte
as before (the drift guard only pins the `presenter`/… conditional set, which grows
by one entry: `watermark: [text]`).

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| D1 | AI-disclosure home | relax `brand` to accept `text` vs new `watermark` type | **new `type:: watermark`** | `brand` is an image layer; a text notice is a distinct kind and must have its own conditional field (`text`) |
| D2 | Avatar model per Layer | new Layer `model` vs Scene field | **Layer `model` (presenter only)** | the model belongs to the presenter Layer, like `asset`; absent = engine default |
| D3 | Media fit | per-Layer `fit` vs template `@broll_template` | **per-Layer `fit` select** | one field for `b-roll`/`background`; no template machinery |
| D4 | Music volume | global constant vs Scene field | **Scene `music_volume`** | music is a Scene field already; volume is per-Scene |
| D5 | b-roll dynamism | opt-in field vs built-in | **built-in Ken-Burns, `zoomIn:false` to disable** | the series wants it always; a disable hatch stays cheap |
| D6 | Format variants | re-render per `--format` vs post-process | **post-process the square master** | blur-fill + "square entire" is not what a `--format` render does; FFmpeg is cheap and deterministic |
| D7 | TTS cache key | include avatar model vs exclude | **exclude** | the narration voice/model is the template's; an avatar-model change must not re-bill TTS |

## Interfaces / Contracts

```ts
// Layer `type::` gains: watermark  →  manifest overlay { type: 'watermark', config: { text, position } }
// Layer field  model?  →  properties.layer_avatar_model  (presenter avatar model override)
// Layer field  fit?    →  properties.layer_fit           (cover | contain)
// Scene field  music_volume? → properties.scene_music_volume → bgmusic track volume (fallback DEFAULT_BG_MUSIC_VOLUME)
```

```js
// manifest broll config (unchanged shape, fit no longer hardcoded)
config: { assetPath, fit: props.fit || 'cover', position: props.position || 'center' }
```

```js
// format step (new scripts/render-formats.mjs): square master -> variants
// [0:v]split=2[bg][fg];
// [bg]scale=W:H:force_original_aspect_ratio=increase,crop=W:H,gblur=sigma=S,eq=brightness=-0.18[bg2];
// [fg]scale=W:H:force_original_aspect_ratio=decrease[fg2];
// [bg2][fg2]overlay=(W-w)/2:(H-h)/2   →  <slug>_<W>x<H>.mp4
```

## Data Flow

```
L3 doc ──read_knowledge──▶ model ──lower──▶ manifest
  Layer.type=watermark ─────────────▶ overlay watermark {text}
  Layer.model ─▶ layer_avatar_model ─▶ avatar job model (per job)
  Layer.fit  ─▶ layer_fit ─▶ b-roll overlay fit (contain + card + zoom)
  Scene.music_volume ─▶ bgmusic volume
square master ──render-formats──▶ <slug>_1080x1080 / _1080x1920 / _1920x1080
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/specs/bluepriNNts/video-script/spec_NN.md` | Modify | `watermark` in `type::` + `conditional_fields`; `model`/`fit` Layer fields; `music_volume` Scene field |
| `.../scripts/remotion-scene-compiler.mjs` | Modify | `TYPE_RENDERERS`+`DEFAULT_CONDITIONAL_FIELDS` `watermark`; `createWatermarkOverlay`; `lowerLayer` `model`/`fit`; `music_volume` |
| `.../scripts/scene/overlays/Watermark.tsx` | Create | persistent text notice |
| `.../scripts/scene/overlays/Broll.tsx` | Modify | `fit: contain` card (rounded + shadow) + Ken-Burns zoom |
| `.../scripts/scene/overlay-registry.mjs`, `Scene.tsx` | Modify | wire `watermark` renderer |
| `.../scripts/lib/tts-options.mjs` (+ `avatar-jobs.mjs`) | Modify | TTS cache key independent of the avatar model |
| `.../scripts/render-formats.mjs` | Create | format variants (blur fill + dimension naming) |
| `.../test/*` | Modify | `watermark` conditional; `fit`/`model`; format-name test |
| `docs/innfo/documentation/template-video.md` | Modify | document `watermark`, `model`, `fit`, `music_volume`, format step |

## Sequencing / Rollout

1. Blueprint fields + engine mirror + drift test (green).
2. `Watermark.tsx` + registry/Scene wiring.
3. `Broll.tsx` fit/zoom; `music_volume`.
4. TTS cache-key fix (regression test: change avatar model, assert no TTS re-bill).
5. `render-formats.mjs` + test.
6. Docs + `blueprint_version` bump (V_0-1-2 → V_0-1-3) + `manifest/source.yaml` pin → release.

All slices are additive; each commits independently and is CI-verified.

## Testing Strategy

Runner: `node scripts/verify.js` (discovers skill `*.test.mjs`) + Vitest where relevant.

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | `watermark` conditional + overlay emission; `fit` carried into the broll config; `music_volume` → track volume; `model` → avatar job model | `scene-compiler.test.mjs` assertions |
| Unit | TTS cache key is stable across an avatar-model change | targeted `tts-options`/`avatar-jobs` test |
| Unit | format step names sizes from the real output and keeps the square whole | `render-formats` test asserting `ffprobe` dims + name |
| Integration | `conditional-fields-drift.test.mjs` stays green; `verify.js` | deterministic gate |

## Open Questions

- [ ] Should the format step live in the skill (`render-formats.mjs`) or stay a
      series tool? (Proposed: the skill, so every series gets it.)
- [ ] `brand` vs `watermark`: keep both, or fold the image-brand into `watermark`
      with an optional `asset`? (Proposed: keep both; `brand` = image, `watermark` = text.)
