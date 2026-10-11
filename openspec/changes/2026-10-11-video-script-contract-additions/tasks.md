# Tasks: video-script contract additions + b-roll/format ergonomics

Ordered, TDD-first. Each slice leaves the tree green (`node scripts/verify.js`).

## 1. Blueprint: new fields + `watermark` type

- [ ] 1.1 RED — extend `test/conditional-fields-drift.test.mjs` expectations to include
      `watermark: [text]`; add a scene-compiler assertion that a `type:: watermark` Layer
      with `text` compiles to a `watermark` overlay and one without `text` fails the guard.
- [ ] 1.2 GREEN — in `iNNfo/specs/bluepriNNts/video-script/spec_NN.md`: add `watermark`
      to the `type::` options + `validation.conditional_fields` + the Conditional Fields
      table; add Field Definitions `model` (Layer) and `fit` (Layer, select cover|contain);
      add Field Definition `music_volume` (Scene).
- [ ] 1.3 GREEN — in `remotion-scene-compiler.mjs`: add `watermark` to `TYPE_RENDERERS`
      and `DEFAULT_CONDITIONAL_FIELDS`; `createWatermarkOverlay`; the overlay-loop branch;
      `lowerLayer` → `layer_avatar_model: fields.model`, `layer_fit: fields.fit`;
      `lowerKnowledgeModel` → `properties.scene_music_volume`; bgmusic `volume` from it.
- [ ] 1.4 Verify — `node test/conditional-fields-drift.test.mjs` and
      `node test/scene-compiler.test.mjs` green.

## 2. Watermark renderer

- [ ] 2.1 RED — assert `rendererForOverlay('watermark') === 'Watermark'`.
- [ ] 2.2 GREEN — `scripts/scene/overlays/Watermark.tsx` (persistent text, position,
      scaled by `width/1920`); add to `overlay-registry.mjs` and the `Scene.tsx` switch
      (+ the `Overlay` type union).
- [ ] 2.3 Verify — registry/Scene tests green.

## 3. b-roll fit + zoom

- [ ] 3.1 RED — assert a b-roll with `fit:: contain` yields `config.fit === 'contain'`
      and default b-roll still yields `cover`.
- [ ] 3.2 GREEN — `Broll.tsx`: honor `fit`; `contain` renders inside a rounded,
      shadowed card with a margin; a Ken-Burns zoom-in over the duration (`zoomIn:false`
      disables).
- [ ] 3.3 Verify — scene-compiler green; visual spot-check.

## 4. TTS cache-key stability

- [ ] 4.1 RED — test: same narration+voice+tts-model but a different avatar model →
      identical TTS cache key (no re-bill).
- [ ] 4.2 GREEN — remove the avatar model from the TTS cache options in
      `lib/tts-options.mjs` (and any caller that folded it in).
- [ ] 4.3 Verify — the targeted test + `asset-synthesizer.test.mjs` green.

## 5. Format variants

- [ ] 5.1 RED — test `render-formats.mjs` output names (`<slug>_<W>x<H>.mp4`) and that
      `ffprobe` reports the expected dimensions for each variant.
- [ ] 5.2 GREEN — `scripts/render-formats.mjs`: from the square master, emit
      `_1080x1080` (copy), `_1080x1920`, `_1920x1080` via `split`/`scale`/`gblur`/`overlay`
      (whole square, blur fill), `-movflags +faststart`.
- [ ] 5.3 Verify — the test + a dry smoke on a short fixture.

## 6. Docs, version, release

- [ ] 6.1 `docs/innfo/documentation/template-video.md`: document `watermark`, `model`,
      `fit`, `music_volume`, and the format step.
- [ ] 6.2 Bump `blueprint_version` (V_0-1-2 → V_0-1-3) and update the
      `manifest/source.yaml` pin; reconcile the L3 `# NN index` doc/validator mismatch
      flagged in the design's context.
- [ ] 6.3 `node scripts/verify.js` and `npm run check:integrity` green.
- [ ] 6.4 Land on `dev` (session worktree → PR); cut `blueprints-v*` / `skills-v*` via
      `nn-dev-release`.

## Acceptance

- [ ] All Success Criteria in `proposal.md` hold.
- [ ] No workspace/series migration required (new fields are optional).
