# Proposal: Video Series Extension Points

## Intent

A series cannot get its visual/audio identity without patching the installed engine, and those
patches are lost on every skill update. Give the engine **concepts** (overlay slot, sound
effect bound to an engine event, authored animation) with series/episode overrides, and stop
regeneration from destroying human edits.

## Evidence

| Gap | Where |
|---|---|
| Overlay look hardcoded (`#7c3aed`, `#0b0b0f`) | `scripts/overlay-blocks.mjs:93`, `scripts/scene-project.mjs:99` |
| Registry block id is inert (`data-block` only); `seriesFrame`/`sceneBlock` never passed | `overlay-blocks.mjs:13-38,123`; `hyperframes-render.mjs:26` |
| `enter_animation`/`exit_animation` compiled, then dropped by the emitter | `remotion-scene-compiler.mjs:362-363` vs `overlay-blocks.mjs:75-126` |
| Every media Layer is muted (`data-has-audio="false"`), so the domain resorted to a `_animacion_` filename hack + `data-playback-rate` retime | `scene-project.mjs:52` |
| Regeneration overwrites unconditionally | `scene-project.mjs:180-185` |

## Scope

### In Scope
1. **Slot contracts** for `title`, `lower-third`, `caption`, `quote`, `watermark`, `b-roll`: each slot declares the `data-composition-variables` a component must accept (`text`/`src`/`position`/`enter`/`exit` + frame tokens `font`/`accent`). The overlay mounts via `data-composition-src` + `data-variable-values`.
2. **One neutral fallback component per slot** shipped by the skill; one-line registry hint per slot in a reference doc.
3. **Resolution episode > series > blueprint** by file convention `components/<slot>.html`, found by the same nearest-folder walk `frame-tokens.mjs` uses. **No `Series` Concept and no new Fields are needed.**
4. **Sound effects** for exactly two existing events, `scene-boundary` and `overlay-enter`: `sounds/<event>.*` (`overlay-enter` first tries `sounds/overlay-enter.<slot>.*`), same walk; silent fallback. The engine code names no sound.
5. **Layer `type:: animation`** (Idea A): `asset::` points to an authored HyperFrames project, which gets copied into `authored/<slug>/` and mounted as a sub-composition with its own audio.
6. **Regeneration guard** (Idea B): the engine records a content hash for every file it writes; if a file's hash changed since then, regeneration refuses and lists the file. Deleting the file means the user accepts regeneration. `hyperframes history --who` is not used unless the design phase proves the hash record is not enough.
7. **Delete** `DEFAULT_OVERLAY_BLOCKS`, `resolveOverlayBlock`, `overlayHostMarkup`, `data-block` and the inline overlay CSS. Bump blueprint to `V_0-4-0` and skill to `V_0-6-0`. Clean break.

### Out of Scope (future changes)
- Custom transition components: the 5 engine-native tweens stay (add one when a series needs its own look).
- Native multi-format renders (replacing `render-formats`/`render-vertical`); the thumbnail as a composition.
- Removing legacy residue: `assemble-video`, `faststart`, the `RemotionSceneCompiler` rename, dead manifest fields.
- Word-timed captions (`hyperframes transcribe`); ducking/loudness; a `produce` orchestrator; a registry lock file; pin enforcement in `ensure-hyperframes`.
- Ken Burns and caption-group behaviour from the domain patches: **these regress** (see migration note).

## Ownership split

| Layer | Owns |
|---|---|
| Blueprint/skill | slot names, variable contracts, event names, neutral fallbacks, hints. English only, no concrete values |
| Series folder | `components/<slot>.html` (via `hyperframes add`, editable), `sounds/<event>.*`, `frame.md` |
| Episode folder | same files, highest precedence; authored animation projects |
| Domain | the series content; no engine patches |

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `ephemeral-overlays`: an overlay renders by mounting the resolved slot component. The registry-default and `seriesFrame` escape go away.
- `video-script-model`: Layer gains `type:: animation`.
- `cognnitive-video-engine`: slot/sound resolution, animation sub-composition mount, regeneration guard.
- `video-script-skill`: ships fallbacks + slot reference doc; version bump.
- `series-script-templates`: series/episode `components/` and `sounds/` folder convention.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Animation duration ≠ narration duration (variables cannot retime) | High | Rule decided in spec; assumed scene = max(narration, animation) |
| Series component violates contract | Med | `hyperframes check` + missing-variable error naming the slot |
| Version bump not registered (recurring gap) | Med | Bump all registries in the same slice |
| Prerequisite `session/video-delivery-fix` not merged | Med | Hard dependency; apply blocks until it lands |

## Rollback Plan

Revert the slice commits on `dev`, which restores blueprint `V_0-3-8` and skill `V_0-5-0`. No workspace data is migrated. Series `components/`/`sounds/` folders become inert.

## Dependencies

- `session/video-delivery-fix` (9c64908a, c11514d9 `frame-tokens.mjs`) merged first.
- HyperFrames pin `0.8.192`.

## Domain migration note (innteresante, out of repo)

Reinstall the clean skill and drop the engine patches. Replace `_animacion_` MP4s with `type:: animation` Layers pointing at `assets/<ep>/Hyperframes/hf-*`. Move SFX to `sounds/scene-boundary.*` (whoosh), `sounds/overlay-enter.title.*` (click) and `sounds/overlay-enter.lower-third.*` (pop). Add components with `hyperframes add`. Ken Burns and caption groups regress until a follow-up.

## Resolved assumptions (orchestrator defaults, pending maintainer review)

1. Animation vs narration length: the scene lasts `max(narration, animation)`; a shorter animation holds its last frame. No clipping, no rejection.
2. SFX vocabulary: still two events. In the domain, `click` marked a title entering and `pop` a lower-third entering, so `overlay-enter` resolves per slot first: `sounds/overlay-enter.<slot>.*`, then `sounds/overlay-enter.*`, then silence. No cue is lost and no new event is added.
3. Ken Burns and caption groups only ever existed as domain patches, never in the repo. Losing them until a follow-up change is accepted.
4. An `animation` Layer's audio plays at its authored level, with no ducking (ducking is out of scope).

## Success Criteria

- [ ] A fresh install renders every slot with fallbacks and passes `hyperframes check` with 0 errors.
- [ ] An episode component overrides the series one, which overrides the fallback (RED-then-GREEN).
- [ ] An `animation` Layer renders with its own audio and no playback-rate retime.
- [ ] Regeneration refuses a hand-edited file and names it.
- [ ] No series-language or concrete sound name in engine code. `node scripts/verify.js` is green.
