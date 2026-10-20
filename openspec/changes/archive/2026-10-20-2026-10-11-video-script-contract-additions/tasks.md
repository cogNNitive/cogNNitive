# Tasks: video-script format variants (render-formats)

Re-scoped 2026-10-16: the contract additions (watermark, `model`, `fit`, `music_volume`,
b-roll fit/zoom, TTS cache-key stability) shipped earlier (commits c43de73f, 3769d206,
50633fac, e4c35a67, 09554a18) and are verified below. The only remaining work is the
format-variant step (section 5). Evidence paths are relative to `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/`.

## 1. Blueprint: new fields + `watermark` type (SHIPPED)

- [x] 1.1 RED — `test/conditional-fields-drift.test.mjs` deep-equals the compiler map to the
      blueprint (covers `watermark: [text]`); watermark compile + missing-`text` guard asserted in
      `test/contract-additions.test.mjs`.
- [x] 1.2 GREEN — `spec_NN.md` (video-script): `watermark` in `type::` options,
      `validation.conditional_fields` and the Conditional Fields table; Field Definitions `model`,
      `fit` (Layer) and `music_volume` (Scene).
- [x] 1.3 GREEN — `scripts/remotion-scene-compiler.mjs`: `TYPE_RENDERERS.watermark`,
      `DEFAULT_CONDITIONAL_FIELDS.watermark`, `createWatermarkOverlay`, overlay-loop branch,
      `layer_avatar_model` / `layer_fit`, `scene_music_volume` feeding the bgmusic `volume`.
- [x] 1.4 Verify — `node test/conditional-fields-drift.test.mjs` and
      `node test/scene-compiler.test.mjs` green.

## 2. Watermark renderer (SHIPPED)

- [x] 2.1 RED — `rendererForOverlay('watermark') === 'Watermark'` asserted in
      `test/contract-additions.test.mjs`.
- [x] 2.2 GREEN — `scripts/scene/overlays/Watermark.tsx`, `overlay-registry.mjs`, `Scene.tsx`
      switch + `Overlay` type union.
- [x] 2.3 Verify — registry/compiler assertions green.

## 3. b-roll fit + zoom (SHIPPED)

- [x] 3.1 RED — `fit:: contain` yields `config.fit === 'contain'`, default yields `cover`
      (`test/contract-additions.test.mjs`).
- [x] 3.2 GREEN — `scripts/scene/overlays/Broll.tsx` honors `fit` (contain card + margin) and a
      Ken-Burns zoom-in with `zoomIn:false` to disable.
- [x] 3.3 Verify — compiler assertions green. The visual spot-check is not automated and was not
      redone here (React render only; no DOM test).

## 4. TTS cache-key stability (SHIPPED, no code change needed)

- [x] 4.1 RED — `test/contract-additions.test.mjs` asserts the TTS cache key (`buildTtsVoiceOptions`
      + `resolveRegisteredVoice` + `CacheManager.computeHash`) is identical across avatar models.
      It passed without a code change: the key is built only from the resolved template voice/model
      and the explicit TTS model, never from a Layer.
- [x] 4.2 GREEN — nothing to remove; `scripts/lib/tts-options.mjs` never folded the avatar model in.
- [x] 4.3 Verify — the targeted test + `test/asset-synthesizer.test.mjs` green.

## 5. Format variants (SHIPPED)

- [x] 5.1 RED — `test/render-formats.test.mjs` asserts the output names (`<slug>_<W>x<H>.mp4`),
      the square/preset dimensions, the blur-fill filter graph, and (with ffmpeg on PATH)
      `ffprobe` dimensions for each variant.
- [x] 5.2 GREEN — `scripts/render-formats.mjs`: from the square master, emits
      `_1080x1080` (stream copy), `_1080x1920`, `_1920x1080` via `split`/`scale`/`gblur`/`overlay`
      (whole square, blur fill), audio copied, `-movflags +faststart`. Skips the square copy when
      the master is already named `<slug>_1080x1080.mp4` (never overwrites its own input).
      (`scripts/render-vertical.mjs` remains the dual-master vertical flow fallback.)
- [x] 5.3 Verify — test green (13 cases, incl. the real-ffmpeg smoke); `node scripts/verify.js --fast`
      all deterministic pre-checks pass.

## 6. Docs, version, release

- [x] 6.1a `docs/innfo/documentation/template-video.md`: `watermark` (already listed), plus
      `model`, `fit`, `music_volume` (added 2026-10-16).
- [x] 6.1b `docs/innfo/documentation/template-video.md` §8.3 documents the format step; SKILL.md
      gains workflow step 6c + the tooling-table row.
- [x] 6.2 Embedded-skill change bumped the owning blueprint `blueprint_version` V_0-2-1 → V_0-2-2
      (required by `guard-template-immutability`) and regenerated `iNNfo/specs/bluepriNNts/catalog.json`.
      Corrected 2026-10-20: the earlier note about `manifest/source.yaml` pinning `video-script` at
      `V_0-1-4` was wrong — the manifest carries no `video-script` blueprint entry at all (its
      `blueprints:` list is domaiNN, changes, sidecar, sources, artifacts, procedures, blank), so
      there is nothing to reconcile there. The embedded skill ships through the `blueprints`
      family (`repoPaths: ['iNNfo/specs']`), not through a `video-script` pin.
- [x] 6.3 `node scripts/verify.js --fast` green (150/150 steps). `npm run check:integrity` is not
      part of the merge gate in this environment (it hangs; `verify.js` + CI cover it).
- [x] 6.4 Landed on `dev` (`4d5a32a2`, "feat(video-script): derive format variants from the
      square master") and published with the blueprint: `blueprints-v0.40.0` (`c6ecb08d0`) carries
      `video-script` `blueprint_version: V_0-2-2`. No `skills-v*` cut is needed — the embedded
      `nn-video-script` skill lives under `iNNfo/specs/`, owned by the `blueprints` family
      (`release-keys.js` → `blueprints.repoPaths: ['iNNfo/specs']`); the `skills` family owns only
      the root `skills/`.

## Acceptance

- [x] The format-variant Success Criterion in `proposal.md` holds.
- [x] No workspace/series migration required.
