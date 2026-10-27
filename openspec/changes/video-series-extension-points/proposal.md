# Proposal: Video Series Extension Points

## Intent

A series cannot get its visual/audio identity without patching the installed engine, and those
patches are lost on every skill update. Give the engine **concepts** (overlay slot, frame, sound
effect bound to an engine event, authored animation), resolve every multi-level setting through
**one parameter cascade** whose baseline is blueprint data (a `Video Defaults` document), and
stop regeneration from destroying human edits.

## Evidence

| Gap | Where |
|---|---|
| Overlay look hardcoded (`#7c3aed`, `#0b0b0f`) | `scripts/overlay-blocks.mjs:93`, `scripts/scene-project.mjs:99` |
| Registry block id is inert (`data-block` only); `seriesFrame`/`sceneBlock` never passed | `overlay-blocks.mjs:13-38,123`; `hyperframes-render.mjs:26` |
| `enter_animation`/`exit_animation` compiled, then dropped by the emitter | `remotion-scene-compiler.mjs:362-363` vs `overlay-blocks.mjs:75-126` |
| Every media Layer is muted, so the domain resorted to a `_animacion_` filename hack + `data-playback-rate` retime | `scene-project.mjs:52`; `build-script-from-draft.mjs:97` |
| Regeneration overwrites unconditionally | `scene-project.mjs:180-185` |
| Defaults live in engine code and disagree: TTS `'elevenlabs'` vs `minimax/speech-2.8-hd`, music volume `0.2` vs `0.4` | `lib/tts-options.mjs:21`, `asset-cost-estimator.mjs:210`, `remotion-scene-compiler.mjs:42`, `build-script-from-draft.mjs:29` |
| `elevenlabs`/`edge-tts` are phantom providers: an enum value and an API-key check, no request path | `spec_NN.md:177`; `asset-synthesizer.mjs:104-124,164-168` |
| One name (`model`) means two things: Template TTS model and Layer avatar model | `spec_NN.md:157,185` |
| Series settings are a side JSON (`video.series.json`) with a Spanish scene slug hardcoded (`00-gancho`) | `build-script-from-draft.mjs:22-68` |
| `frame.md` has its own nearest-file discovery, separate from every other setting | `lib/frame-tokens.mjs` (prerequisite branch) |
| B-roll zoom-in is required by spec but implemented nowhere (Remotion-era, 50633fac) | `openspec/specs/cognnitive-video-engine/spec.md:168-180` |
| A missing sound file is silent, so a field render ran (and spent) then aborted mid-way with `audio_processing_failed: Source not found for audio element nn-sfx-whoosh-0` when the series lacked the SFX file | Field render, innteresante domain (out of repo) |

## Scope

### In Scope
1. **Universal parameter cascade**: `lib/model-cascade.mjs` becomes `lib/cascade.mjs`, the only resolver: `cli > layer > scene > video > series > domain > blueprint`, same Field name at every level (`cli` only for model ids). Every engine default literal folds into it.
2. **`Video Defaults` Concept**, two instances: the **blueprint** level, `defaults/video-defaults_NN.md` shipped in the bluepriNNt package (not the skill); the **domain** level, `video-defaults_NN.md` at the domain root, a copy made on adoption and then tuned by editing. Changing the blueprint one bumps `blueprint_version`.
3. **`Series` Concept**, only for real series: one `series_NN.md` per series folder. Replaces `video.series.json`; `DEFAULT_SERIES_CONFIG`, `loadSeriesConfig`, `--config` are deleted. An episode outside a series folder has no series level.
4. **Parameter-specific names**: `tts_model`, `image_model`, `avatar_model` at every level. Template `model` becomes `tts_model`; Layer `model` becomes `avatar_model`.
5. **`frame` parameter**: `frame:: <name>` at scene, video, series, domain; the walk locates `frames/<name>.md`. Replaces `frame.md` discovery.
6. **Slot contracts** for `title`, `lower-third`, `caption`, `quote`, `watermark`, `b-roll`: the fallback's `data-composition-variables` is the contract; violations raise `SlotContractError`.
7. **Files vs parameters**: WHICH component/sound/frame is a cascade value (a name); one folder walk locates `components/<name>.html`, `sounds/<name>.*`, `frames/<name>.md`: episode > series > domain > skill fallback. A missing file is judged by the level that set the name: a name set at any user level (layer, scene, video, series, domain Video Defaults) with no file found fails at pre-compile, before any render or spend, naming the name, the level and every path searched; a name that comes only from the blueprint Video Defaults and has no file is skipped with a warning, so a fresh install still renders. Applies to components, sounds and frames.
8. **Sound events**: `video-start`, `video-end`, `scene-boundary`, `overlay-enter.<slot>`, `overlay-exit.<slot>` (text slots), `layer-enter.<b-roll|animation|presenter>`.
9. **Layer `type:: animation`**: authored HyperFrames project mounted as a sub-composition with its own audio; scene = `max(narration, animation)`; target durations exposed.
10. **Regeneration guard**: `.nn-emit.json` hash record; edited files refuse regeneration and are listed.
11. **Deletions / clean break**: `elevenlabs` and `edge-tts` everywhere (enum, synthesizer, estimator, tests, `ELEVENLABS_API_KEY`); `DEFAULT_OVERLAY_BLOCKS`, `resolveOverlayBlock`, `overlayHostMarkup`, `data-block`, inline overlay CSS; `FRAME_FILE` discovery; the b-roll zoom-in requirement; the `video-guard.json` `defaults` clause. Blueprint `V_0-4-0`, skill `V_0-6-0`.

### Out of Scope (future changes)
- Custom transition components; native multi-format renders; thumbnail as a composition.
- Legacy residue (`assemble-video`, `faststart`, `RemotionSceneCompiler` rename, dead manifest fields).
- Word-timed captions, caption/word sound events, ducking/loudness, a `produce` orchestrator, registry lock file.
- Any scaffolder: none exists, so the domain Video Defaults copy and new Series documents are made by the agent (SKILL.md step) or by hand.
- Ken Burns and caption groups from the domain patches: **these regress**.

## Ownership split

| Layer | Owns |
|---|---|
| Blueprint package | `spec_NN.md` (Concepts/Fields; a Field's `concept::` list = levels where it is overridable; slot and event names); `defaults/video-defaults_NN.md` (baseline values as data) |
| Skill | Engine; neutral fallbacks `components/<slot>.html`, `frames/neutral.md`; slot reference doc. Engine code names no value |
| Domain root | `video-defaults_NN.md` (adoption copy, user-tuned), `components/`, `sounds/`, `frames/` |
| Series folder | `series_NN.md`, `components/`, `sounds/`, `frames/` |
| Episode folder | script (Video/Scene/Layer values), same folders, highest file precedence; authored animation projects |

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `video-script-model`: universal cascade, `Video Defaults` and `Series` Concepts, shared Field Definitions, `tts_model`/`avatar_model`/`frame`, `type:: animation`, Template `tool` options.
- `cognnitive-video-engine`: name/file resolution (components, sounds, frames), slot contract, sound events, animation mount and duration exposure, regeneration guard; b-roll zoom removed; spend guard loses `defaults`.
- `ephemeral-overlays`: overlays mount the resolved slot component.
- `video-script-skill`: package-shipped defaults, fallbacks, adoption copy step, draft tools read the cascade, version bump.
- `series-script-templates`: extension folders and document locations.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Folding the TTS default changes the cache key of template-less scenes (one re-bill) | Med | Migration note; template-bound scenes keep their key (the cache identity key stays `model`) |
| Skill cannot find its package at runtime (install layouts differ) | Med | One locator over the known layouts, loud `BlueprintPackageNotFoundError` listing paths tried |
| `defaults/*_NN.md` is misread by the immutability guard as a canonical blueprint | High | S1 maps `<bp>/defaults/**` to the owning `spec_NN.md`, like `skills/**` |
| Series component violates contract | Med | `SlotContractError` naming slot and variables |
| Version bump not registered (recurring gap) | Med | Bump all registries in S1 |
| Prerequisite `session/video-delivery-fix` not merged | Med | Hard dependency; apply blocks until it lands |

## Rollback Plan

Revert the slice commits on `dev`; blueprint `V_0-3-8` and skill `V_0-5-0` return. The engine migrates no workspace data; `video-defaults_NN.md`, `series_NN.md`, `components/`, `sounds/`, `frames/` become inert.

## Dependencies

- `session/video-delivery-fix` (9c64908a, c11514d9 `frame-tokens.mjs`) merged first.
- HyperFrames pin `0.8.192`.

## Domain migration note (innteresante, out of repo)

Reinstall the clean skill and drop the engine patches. Copy the package's `defaults/video-defaults_NN.md` to the domain root. Convert `video.series.json` to the series `series_NN.md` (title, template, music, music_volume, transition, presenter_asset, intro_asset); move the hook-scene template onto that draft scene. Rename presenter Layer `model::` to `avatar_model::` and Template `model::` to `tts_model::`. Move `frame.md` to `frames/<name>.md` and set `frame:: <name>` in the series document (or the domain one if shared). Replace `_animacion_` MP4s with `type:: animation` Layers pointing at `assets/<ep>/Hyperframes/hf-*`. Put SFX files at `sounds/whoosh.*`, `sounds/click.*`, `sounds/pop.*` and set `sounds:: [overlay-enter.title=click, overlay-enter.lower-third=pop]` in the series document (`scene-boundary=whoosh` is the blueprint default). Add components with `hyperframes add`. Ken Burns and caption groups regress.

## Resolved assumptions

| # | Assumption | Status |
|---|---|---|
| 1 | Scene lasts `max(narration, animation)`; a shorter animation holds its last frame | Maintainer-confirmed, plus duration exposure and mismatch warning |
| 2 | Sound vocabulary: the event families of Scope 8; no caption/word events | Maintainer-confirmed |
| 3 | Sound/component/frame choice is a cascade name; files are found by walk | Maintainer-confirmed |
| 4 | Ken Burns and caption groups regress | Orchestrator default, pending review |
| 5 | An `animation` Layer's audio plays at its authored level, no ducking | Orchestrator default, pending review |
| 6 | b-roll emits `layer-enter.b-roll`, not `overlay-enter.b-roll` | Design default, pending review |
| 7 | `cli` stays above `layer` for model ids | Maintainer-confirmed |
| 8 | No domain-root `series_NN.md`; domain and blueprint levels are `Video Defaults` documents; `Series` only for real series | Maintainer-confirmed |
| 9 | Model params are `tts_model`/`image_model`/`avatar_model` at every level | Maintainer-confirmed |
| 10 | `frame` is a cascade parameter; `frames/<name>.md` replaces `frame.md` discovery | Maintainer-confirmed |
| 11 | `elevenlabs` and `edge-tts` are deleted; defaults use MiniMax | Maintainer-confirmed |
| 12 | `transition` default `none` | Maintainer-confirmed |
| 13 | The domain Video Defaults copy is made by an agent step in SKILL.md, not by code | Design default, pending review |
| 14 | Missing-file severity follows the cascade `source`: user-level name = pre-compile error; blueprint-only name = warning and skip | Maintainer-confirmed |

## Success Criteria

- [ ] A fresh install renders every slot with fallbacks and passes `hyperframes check` with 0 errors.
- [ ] A parameter set at series overrides domain Video Defaults, which overrides blueprint Video Defaults (RED-then-GREEN).
- [ ] An episode outside a series folder resolves no series level.
- [ ] An episode component/frame file overrides the series one, which overrides the fallback.
- [ ] An `animation` Layer renders with its own audio and no playback-rate retime.
- [ ] Regeneration refuses a hand-edited file and names it.
- [ ] A user-level name with no file fails before any spend naming the name, level and paths searched; a blueprint-only name with no file warns and renders.
- [ ] No `elevenlabs`/`edge-tts`/`ELEVENLABS_API_KEY`, series-language, sound name or cascade default value in engine code. `node scripts/verify.js` is green.
