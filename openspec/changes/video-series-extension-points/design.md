# Design: Video Series Extension Points

## Technical Approach

One resolver (`lib/cascade.mjs`) answers every multi-level parameter from five bags: the script
element fields (layer/scene/video), the series and domain `series_NN.md`, and the skill's
`defaults/series_NN.md`. Names it returns (component, sound) are turned into files by one
nearest-folder walker. Overlays and animations mount as root sub-compositions, sounds ride the
root audio track, and every project write goes through one guarded writer. Paths are
`iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/` unless noted.

## Architecture Decisions

| # | Topic | Choice | Rejected | Why |
|---|---|---|---|---|
| D1 | Slot contract | The fallback `components/<slot>.html`'s `data-composition-variables` IS the contract; a resolved component must declare a superset, else `SlotContractError: slot "lower-third": <path> missing variables: accent, exit` | `slots.json` schema | One source of truth |
| D2 | Walker | `scripts/lib/nearest.mjs`: `walkUp`, `findNearest(startDir, rel, {stopDir, fallbackDir})`, `findNearestByStem`, `findSeriesRoot` (moved from `video-engine-cli.mjs:63`). `loadFrameTokens` uses it | Walker per concern | 3 walkers become 1. `loadTemplateModels` (`lib/knowledge-model.mjs:232`) is untouched |
| D3 | Walk bounds | From the script dir up to `resolveWorkspace(scriptDir).root` (inclusive) = episode > series > domain; then skill fallback (components) or silence (sounds) | Stop at series root | Decision 3 adds the domain level. Reuses the existing root resolver; reads no guard config |
| D4 | Mount location | Overlay and animation hosts in the root `index.html` with global `data-start` | Inside scene sub-compositions | One nesting level; global times |
| D5 | Staging | Components to `<project>/components/<name>.html`, authored projects to `<project>/authored/<slug>/` (skip `.hyperframes/`); sounds via `stageAsset` | Collapsing the triple copy | Non-goal; no `..` in any `src` |
| D6 | Sound events | CLI appends `kind:'sfx'` entries to `manifest.tracks.audio` (times in D12); no `data-duration`, so the sound plays out | New emitter path | Reuses `audioEls` |
| D7 | Animation | `layer_type:'animation'`, excluded from `resolveMediaLayers`; pre-pass reads `<asset>/index.html` root id + `data-duration`; scene = `max(narration, animation)`; host duration = scene, shorter holds last frame; no `muted`, no playback-rate | Retiming; rewriting authored ids | Variables cannot retime |
| D8 | Id collisions | Authored id equal to a scene slug, root id, component id or another source's id is an error naming both | Auto-prefix | Loud and cheap |
| D9 | Regeneration guard | `lib/emit-guard.mjs` `writeGuarded(projectDir, files)` with `.nn-emit.json` (`{"files":{"<posix rel>":"<sha256>"}}`, sorted); edited recorded file → `RegenerationRefusedError` listing all, nothing written; deleted/unrecorded files written; no `--force` | `hyperframes history --who` | `history` is a trial command needing `npx`; the record is offline and unit-testable |
| D10 | Cascade | Rename `lib/model-cascade.mjs` → `lib/cascade.mjs`; `SCOPE_ORDER = cli, layer, scene, video, series, domain, blueprint`; `resolve(param, bags)` → `{value, source}`; `resolveKeyed(param, key, bags)` for `key=name` list fields. Delete `resolveModels`, `resolveEngineModel`, `buildTtsVoiceOptions`'s fallbacks, `DEFAULT_MODELS`, `DEFAULT_BG_MUSIC_VOLUME` | A second resolver | Decision 1. `workspace` scope renamed `domain` |
| D11 | Domain home | `series_NN.md` at the domain root (same Concept, same reader) | `video-guard.json` `defaults`; the domaiNN document | Guard is gate-only; the domaiNN doc belongs to another blueprint and would need foreign Fields. Zero new parser |
| D12 | Event times | `video-start`=0; `video-end`=`total − probeDuration(sound)` (clamped ≥0, `lib/media-duration.mjs`); `scene-boundary`=scene i>0 start; `overlay-enter/exit.<slot>`=overlay start/end; `layer-enter.<type>`=layer global start | Probing all sounds | Only `video-end` needs a length |
| D13 | Levels as data | A parameter is overridable at level X iff the blueprint has a Field Definition of that name with `concept:: X`. Defaults = values in `defaults/series_NN.md`. The resolver has no per-parameter table | Frontmatter `cascade:` map | Native iNNfo: the Field Definitions already are the declaration. The resolver reads only the bags the callers pass per parameter (table below); flagging a misplaced field is innfo-core validation's job (unverified here) |
| D14 | Duration exposure | `compile --dry-run` prints `scene <slug>: <s>s (estimated\|measured)`; the manifest already carries `scenes[].durationInFrames`. Mount warns `animation <slug>: 4.0s vs scene 6.0s` when they differ by >1 frame | New command | Decision 5 prefers existing output |

### Cascade parameters (verified consumers)

| Field | Levels (Field Definitions) | Default in `defaults/series_NN.md` | Consumer |
|---|---|---|---|
| `template` | scene, video, series | none | `lowerKnowledgeModel` (`remotion-scene-compiler.mjs:285-294`) |
| `voice`, `tts_model` | resolved Template (scene scope), series | `default`, `minimax/speech-2.8-hd` | `tts-options.mjs`, CLI `:247`, estimator `:328` |
| `image_model` | cli, series | `wavespeed-ai/z-image/turbo` | CLI `:279`, estimator `:279` |
| `avatar_model` | cli, layer (renamed from `model`), series | `wavespeed-ai/infinitetalk-fast` | CLI `:413`, `avatar-jobs.mjs:150`, estimator `:337` |
| `music`, `music_volume`, `transition` | scene, series | -, `0.2`, `none` | compiler `:296-316,579` |
| `fit` | layer, series | `cover` | compiler `:454,640` |
| `components` | video, series | `title=title`, ..., `b-roll=b-roll` | slot mount (D1) |
| `sounds` | video, series | `scene-boundary=whoosh` | sfx tracks (D6) |
| `title`, `presenter_asset`, `intro_asset` | series | none | draft tools |

`position` is excluded: per-slot defaults belong to the component's variable defaults.
Every Series field is also valid at domain level (same Concept).

## Data Flow

```
script dir ─walkUp→ series_NN.md (series) ─ domain root series_NN.md ─ skill defaults
                         └──────── cascade.resolve(param, bags) ────────┘
names → findNearest(components/<name>.html | sounds/<name>.*) → contract check → stage
compile(cascaded values, animationDurations) → manifest(+sfx) → buildProject → files
                                         writeGuarded(.nn-emit.json) → hyperframes render
```

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/lib/nearest.mjs` | Create | Walker (D2) |
| `scripts/lib/emit-guard.mjs` | Create | D9 |
| `scripts/lib/cascade.mjs` | Create (rename) | From `model-cascade.mjs`; `resolve`, `resolveKeyed`, `loadCascadeBags(scriptDir)` |
| `scripts/lib/model-cascade.mjs` | Delete | Renamed |
| `scripts/lib/tts-options.mjs` | Modify | Voice/model from `cascade.resolve`; no literals |
| `scripts/asset-cost-estimator.mjs`, `asset-synthesizer.mjs`, `lib/avatar-jobs.mjs`, `synthesize-avatar.mjs` | Modify | Defaults from bags; `DEFAULT_MODELS` deleted |
| `scripts/remotion-scene-compiler.mjs` | Modify | Cascaded scene/layer params, `avatar_model`, `animation`, `max()` |
| `scripts/build-script-from-draft.mjs`, `build-draft-html.mjs`, `thumbnail-v1.mjs` | Modify | Read Series bags; delete `DEFAULT_SERIES_CONFIG`, `loadSeriesConfig`, `--config`, `00-gancho`, `_animacion_`; script frontmatter copied from the series document |
| `defaults/series_NN.md` | Create | Blueprint-level Series document |
| `scripts/overlay-blocks.mjs` | Rewrite | `SLOT_OF`, `readVariableIds`, `assertSlotContract`, `overlayMount`; deletes registry/CSS APIs |
| `scripts/scene-project.mjs`, `hyperframes-render.mjs`, `video-engine-cli.mjs`, `lib/frame-tokens.mjs` | Modify | Root hosts, `files` map, staging, sfx, dry-run durations |
| `components/{title,lower-third,caption,quote,watermark,b-roll}.html` | Create | Neutral fallbacks; `b-roll` honors `fit` only |
| `references/overlay-slots.md` | Create | Slot→variables, event keys, registry hints |
| `SKILL.md`; `../../spec_NN.md`; `iNNfo/specs/bluepriNNts/catalog.json` | Modify | Versions; `Series` Concept + Fields, `avatar_model`, `animation`; regenerate catalog |

## Interfaces / Contracts

```js
resolve('music_volume', bags)        // { value: '0.2', source: 'blueprint' }
resolveKeyed('sounds', 'overlay-enter.title', bags) // { value: 'click', source: 'series' } | { value: null }
// bags: { cli?, layer?, scene?, video?, series?, domain?, blueprint } — each a fields object
```

Slot variables: `text`, `src`, `position`, `enter`, `exit`, `font`, `accent`; `b-roll` adds `fit`.

## Testing Strategy

Strict TDD, `node --test` under `test/`, RED before GREEN.

| Layer | What | Approach |
|---|---|---|
| Unit | cascade precedence/source/keyed; walker bounds; contract diff; guard; event times; `max()`; collisions | Temp-dir fixtures |
| Integration | byte-identical emission; no `..`; grep: no sound name, `DEFAULT_MODELS`, `00-gancho` in `scripts/` | Extend existing suites; migrate `model-cascade.test.mjs` |
| Manual | `hyperframes check --json` = 0 errors | Maintainer, pin 0.8.192 |

## Migration / Rollout

No engine-side data migration; see the proposal's domain note.

## Open Questions

- [ ] Spike: does HF 0.8.192 mount a standalone `index.html` via `data-composition-src` and resolve its relative assets from `authored/<slug>/`?
- [ ] Does mounting one component id several times render without the 45 s wait?
- [ ] Root animation hosts lose `layer_level` ordering against siblings. Acceptable?
- [ ] Should `frame.md` `font`/`accent` become Series fields (one path) in a follow-up?
