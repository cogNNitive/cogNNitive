# Proposal: Video Series Extension Points

## Intent

A series cannot get its visual/audio identity without patching the installed engine, and those
patches are lost on every skill update. Give the engine **concepts** (overlay slot, sound
effect bound to an engine event, authored animation), resolve every multi-level setting through
**one parameter cascade** fed by a minimal `Series` Concept, and stop regeneration from
destroying human edits.

## Evidence

| Gap | Where |
|---|---|
| Overlay look hardcoded (`#7c3aed`, `#0b0b0f`) | `scripts/overlay-blocks.mjs:93`, `scripts/scene-project.mjs:99` |
| Registry block id is inert (`data-block` only); `seriesFrame`/`sceneBlock` never passed | `overlay-blocks.mjs:13-38,123`; `hyperframes-render.mjs:26` |
| `enter_animation`/`exit_animation` compiled, then dropped by the emitter | `remotion-scene-compiler.mjs:362-363` vs `overlay-blocks.mjs:75-126` |
| Every media Layer is muted, so the domain resorted to a `_animacion_` filename hack + `data-playback-rate` retime | `scene-project.mjs:52`; `build-script-from-draft.mjs:97` |
| Regeneration overwrites unconditionally | `scene-project.mjs:180-185` |
| Defaults live in engine code and disagree: TTS `'elevenlabs'` vs `minimax/speech-2.8-hd`, music volume `0.2` vs `0.4` | `lib/tts-options.mjs:21`, `asset-cost-estimator.mjs:210`, `remotion-scene-compiler.mjs:42`, `build-script-from-draft.mjs:29` |
| Series settings are a side JSON (`video.series.json`) with a Spanish scene slug hardcoded (`00-gancho`) | `build-script-from-draft.mjs:22-68` |
| B-roll zoom-in is required by spec but implemented nowhere (Remotion-era, 50633fac) | `openspec/specs/cognnitive-video-engine/spec.md:168-180` |

## Scope

### In Scope
1. **Universal parameter cascade**: `lib/model-cascade.mjs` becomes `lib/cascade.mjs`, the only resolver, precedence `cli > layer > scene > video > series > domain > blueprint`, same field name at every level. `tts-options.mjs`'s private fallback chain, `DEFAULT_MODELS`, `DEFAULT_BG_MUSIC_VOLUME` and the `'cover'` fit literal fold into it. Parameters are limited to those with a consumer today (design D10).
2. **`Series` Concept** (minimal fields) replacing `video.series.json`. One `series_NN.md` per series folder; a `series_NN.md` at the domain root is the **domain** level; the skill ships `defaults/series_NN.md` as the **blueprint** level. Draft tools read it; `DEFAULT_SERIES_CONFIG`, `loadSeriesConfig`, `--config` are deleted.
3. **Slot contracts** for `title`, `lower-third`, `caption`, `quote`, `watermark`, `b-roll`: the fallback's `data-composition-variables` is the contract; violations raise `SlotContractError`.
4. **Files vs parameters**: WHICH component/sound is a cascade value (a name); the folder walk only locates `components/<name>.html` / `sounds/<name>.*`, episode > series > domain > skill fallback. A missing sound file is silence plus one warning.
5. **Sound events**: `video-start`, `video-end`, `scene-boundary`, `overlay-enter.<slot>`, `overlay-exit.<slot>` (text slots), `layer-enter.<b-roll|animation|presenter>`. All derive from manifest times.
6. **Layer `type:: animation`**: authored HyperFrames project copied to `authored/<slug>/`, mounted as a sub-composition with its own audio. Scene = `max(narration, animation)`; the engine exposes each scene's target duration and warns on mismatch.
7. **Regeneration guard**: `.nn-emit.json` hash record; edited files refuse regeneration and are listed.
8. **Deletions / clean break**: `DEFAULT_OVERLAY_BLOCKS`, `resolveOverlayBlock`, `overlayHostMarkup`, `data-block`, inline overlay CSS, the b-roll zoom-in requirement, the `video-guard.json` `defaults` clause, Layer `model::` (renamed `avatar_model::`). Blueprint `V_0-4-0`, skill `V_0-6-0`.

### Out of Scope (future changes)
- Custom transition components; native multi-format renders; thumbnail as a composition.
- Legacy residue (`assemble-video`, `faststart`, `RemotionSceneCompiler` rename, dead manifest fields).
- Word-timed captions, caption/word sound events, ducking/loudness, a `produce` orchestrator, registry lock file.
- A Series scaffolder: none exists today, so a new series copies `defaults/series_NN.md` by hand.
- Folding `frame.md` (`font`/`accent`) into the cascade (see Risks).
- Ken Burns and caption groups from the domain patches: **these regress**.

## Ownership split

| Layer | Owns |
|---|---|
| Blueprint | Concepts/Fields (a Field's `concept::` set = the levels where a parameter is overridable), slot names, event names |
| Skill | `defaults/series_NN.md` (blueprint-level values, e.g. `scene-boundary=whoosh`), neutral slot fallbacks, slot reference doc. Engine code names no value |
| Domain root | optional `series_NN.md` (domain defaults), `components/`, `sounds/` |
| Series folder | `series_NN.md`, `components/<name>.html`, `sounds/<name>.*`, `frame.md` |
| Episode folder | script (Video/Scene/Layer values), same files, highest file precedence; authored animation projects |

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `video-script-model`: universal parameter cascade (replaces Model Selection Cascade), `Series` Concept, Layer `type:: animation`, `avatar_model`.
- `cognnitive-video-engine`: slot/sound resolution, sound events, animation mount and duration exposure, regeneration guard; b-roll zoom removed; spend guard loses `defaults`.
- `ephemeral-overlays`: overlays mount the resolved slot component.
- `video-script-skill`: fallbacks, defaults document, draft tools read the Series document, version bump.
- `series-script-templates`: series/domain extension folders and Series document location.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Folding the TTS default changes the cache key of template-less scenes (one re-bill) | Med | Listed in migration note; template-bound scenes are unaffected |
| Series component violates contract | Med | `SlotContractError` naming slot and variables |
| Version bump not registered (recurring gap) | Med | Bump all registries in S1 |
| `frame.md` remains a second resolution path for `font`/`accent` | Med | Maintainer decides; out of scope here |
| Prerequisite `session/video-delivery-fix` not merged | Med | Hard dependency; apply blocks until it lands |

## Rollback Plan

Revert the slice commits on `dev`; blueprint `V_0-3-8` and skill `V_0-5-0` return. No workspace data is migrated by the engine; `series_NN.md`, `components/`, `sounds/` become inert.

## Dependencies

- `session/video-delivery-fix` (9c64908a, c11514d9 `frame-tokens.mjs`) merged first.
- HyperFrames pin `0.8.192`.

## Domain migration note (innteresante, out of repo)

Reinstall the clean skill and drop the engine patches. Convert `video.series.json` to the series `series_NN.md` (title, template, music, music_volume, transition, presenter_asset, intro_asset); move the hook-scene template onto that draft scene. Rename presenter `model::` to `avatar_model::`. Replace `_animacion_` MP4s with `type:: animation` Layers pointing at `assets/<ep>/Hyperframes/hf-*`. Put SFX files at `sounds/whoosh.*`, `sounds/click.*`, `sounds/pop.*` and set `sounds:: [overlay-enter.title=click, overlay-enter.lower-third=pop]` in the series document (`scene-boundary=whoosh` is the blueprint default). Add components with `hyperframes add`. Ken Burns and caption groups regress.

## Resolved assumptions

| # | Assumption | Status |
|---|---|---|
| 1 | Scene lasts `max(narration, animation)`; a shorter animation holds its last frame | Maintainer-confirmed (decision 5), plus duration exposure and mismatch warning |
| 2 | Sound vocabulary: the 7 event families of Scope 5; no caption/word events | Maintainer-confirmed (decision 4) |
| 3 | Sound/component choice is a cascade name; files are found by walk | Maintainer-confirmed (decision 3); replaces `sounds/<event>.*` naming |
| 4 | Ken Burns and caption groups regress | Orchestrator default, pending review |
| 5 | An `animation` Layer's audio plays at its authored level, no ducking | Orchestrator default, pending review |
| 6 | b-roll emits `layer-enter.b-roll`, not `overlay-enter.b-roll` (one key per instant) | Design default, pending review |
| 7 | `cli` stays above `layer` for model ids (living spec, auditable in the plan) | Design default, pending review |
| 8 | Domain level = `series_NN.md` at the `resolveWorkspace` root | Design default (D11), pending review |

## Success Criteria

- [ ] A fresh install renders every slot with fallbacks and passes `hyperframes check` with 0 errors.
- [ ] A parameter set at series overrides domain, which overrides the shipped defaults (RED-then-GREEN).
- [ ] An episode component file overrides the series one, which overrides the fallback.
- [ ] An `animation` Layer renders with its own audio and no playback-rate retime.
- [ ] Regeneration refuses a hand-edited file and names it.
- [ ] No series-language, sound name or cascade default value in engine code. `node scripts/verify.js` is green.
