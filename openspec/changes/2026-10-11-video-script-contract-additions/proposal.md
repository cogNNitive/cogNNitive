# Proposal: video-script contract additions (watermark, per-Layer model/fit, per-Scene music_volume) + b-roll/format ergonomics

> **Re-scoped 2026-10-16.** The contract additions below (watermark, `model`, `fit`,
> `music_volume`, b-roll fit/zoom, stable TTS cache key) are shipped and verified (commits
> c43de73f, 3769d206, 50633fac, e4c35a67, 09554a18; tests in `test/contract-additions.test.mjs`).
> **Remaining work: format variants (`render-formats.mjs`) only** - see `tasks.md` section 5.
> The sections below are kept as the original rationale; their delta specs are retained so the
> archive step merges them into the living specs.

## Intent

Producing a real series on the native `video-script` model surfaced four missing
contract facts and two engine defects. Today they are handled by local workarounds
that the workspace cannot rely on:

- There is **no text-watermark Layer type**: the series' AI-disclosure line ("generado
  con IA…") has no home, because `brand` requires an image `asset`. (Workaround: a
  local `watermark` type.)
- A `presenter` Layer cannot pick its **avatar/lip-sync model**; every avatar uses the
  default. A series wants the hook (scene 00) on `wavespeed-ai/infinitetalk` and the
  feature on `wavespeed-ai/infinitetalk-fast`. (Workaround: a local `model` Layer field.)
- A media Layer cannot choose **`cover` vs `contain`**; the engine hardcodes `cover`,
  so a news snapshot/image is cropped instead of shown whole with margins. (Workaround:
  a local `fit` Layer field.)
- Background music has only a **global** volume constant; a series needs to set it per
  Scene. (Workaround: a local `music_volume` Scene field.)
- The TTS cache key **changes when an avatar model changes**, re-billing TTS (and
  re-synthesizing every avatar) for an unchanged narration.
- Vertical/horizontal derivatives are produced by **crop-fill**, losing the square
  composition; there is no first-class "square entire + Gaussian-blur fill" output.

## Scope

### In Scope
- `video-script` blueprint: add Layer `type:: watermark` (text notice); add Layer
  fields `model` (presenter avatar-model override) and `fit` (`cover`|`contain`); add
  Scene field `music_volume`.
- Engine: render `watermark`; honor `fit` (contain = whole asset + margin) and a
  Ken-Burns zoom-in on b-roll; apply per-Scene `music_volume`; make the TTS cache key
  independent of the avatar model; add a format-variant step (`<slug>_<W>x<H>.mp4`,
  square entire over a Gaussian-blurred fill).
- Docs (`template-video.md`) and the skill's `references`.

### Out of Scope
- Migrating old workspaces/series (their scripts opt in by adding the new fields).
- A provider-endpoint change; the avatar models already exist in the catalog.

## Capabilities

### New Capabilities
- `video-format-variants`: render square/vertical/horizontal outputs from one master
  with dimension-encoded names and blur fill.

### Modified Capabilities
- `video-script`: the Layer/Scene field contract gains `watermark`, `model`, `fit`,
  `music_volume`.
- `cognnitive-video-engine`: b-roll `fit`/zoom, watermark renderer, per-Scene music
  volume, stable TTS cache key, format-variant rendering.

## Approach

Extend the L2 blueprint `validation`/Field Definitions and the engine's
`TYPE_RENDERERS` / `DEFAULT_CONDITIONAL_FIELDS` / overlay config in lockstep (guarded
by `conditional-fields-drift.test.mjs`). `model`/`fit`/`music_volume` are optional
fields, so existing documents stay valid. The format-variant step is a post-process
over the square master (FFmpeg `split` + `gblur` + `overlay`), not a re-render.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/bluepriNNts/video-script/spec_NN.md` | Modified | `watermark` type; `model`/`fit` Layer fields; `music_volume` Scene field |
| `.../scripts/remotion-scene-compiler.mjs` | Modified | renderers + conditional fields; layer map; music volume; b-roll fit |
| `.../scripts/scene/overlays/Watermark.tsx` | New | persistent text notice |
| `.../scripts/scene/overlays/Broll.tsx` | Modified | `fit: contain` card (rounded + shadow) + Ken-Burns zoom |
| `.../scripts/scene/overlay-registry.mjs`, `Scene.tsx` | Modified | wire `watermark` |
| `.../scripts/lib/tts-options.mjs`, `asset-synthesizer.mjs` | Modified | TTS cache key independent of the avatar model |
| `.../scripts/render-formats.mjs` | New | format variants (blur fill + dimension naming) |
| `.../test/*`, `docs/innfo/documentation/template-video.md` | Modified | coverage + docs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Blueprint↔engine drift on the new fields | Med | `conditional-fields-drift.test.mjs` + a `fit`/`model`/`music_volume` unit assertion |
| `contain` + zoom clips the asset | Low | Zoom is applied inside an `overflow:hidden` card; visually verified |
| TTS cache-key change re-bills existing caches | Low | New key is a superset; old entries simply miss once |
| Format FFmpeg step mislabels dimensions | Low | Name built from the actual filter output size; `ffprobe` assert in test |

## Rollback Plan

Additive and isolated to the `video-script` package + one new script. Revert the
slice commit; no persisted data migrates. Existing L3 documents are unaffected (the
new fields are optional; a document that omits them behaves exactly as before).

## Success Criteria

- [x] A `type:: watermark` Layer validates (requires `text`) and renders a persistent
      text notice; `DEFAULT_CONDITIONAL_FIELDS` matches the blueprint.
- [x] A `presenter` Layer with `model:: <id>` is priced, billed and synthesized with
      that model; other presenters keep the default.
- [x] A b-roll Layer with `fit:: contain` shows the whole asset with margins and a
      subtle zoom-in; `cover` is unchanged.
- [x] A Scene with `music_volume:: 0.06` emits its music track at 0.06.
- [x] Changing an avatar model does **not** re-bill TTS for an unchanged narration.
- [ ] The format step emits `<slug>_1080x1080.mp4`, `<slug>_1080x1920.mp4`,
      `<slug>_1920x1080.mp4` with the square intact over a blurred fill.
- [ ] `node scripts/verify.js` and the skill tests are green.
