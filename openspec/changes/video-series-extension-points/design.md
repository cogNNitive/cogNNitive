# Design: Video Series Extension Points

## Technical Approach

One resolver (`lib/cascade.mjs`) answers every multi-level parameter from seven bags: `cli`, the
script element fields (layer/scene/video), the series `series_NN.md`, the domain-root
`video-defaults_NN.md` and the package's `defaults/video-defaults_NN.md`. Names it returns
(component, sound, frame) become files through one nearest-folder walker. Overlays and
animations mount as root sub-compositions, sounds ride the root audio track, and every project
write goes through one guarded writer. `SKILL` = `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/`,
`PKG` = `iNNfo/specs/bluepriNNts/video-script/`.

## Architecture Decisions

| # | Topic | Choice | Rejected | Why |
|---|---|---|---|---|
| D1 | Slot contract | The fallback `components/<slot>.html`'s `data-composition-variables` IS the contract; a resolved component must declare a superset, else `SlotContractError: slot "lower-third": <path> missing variables: accent, exit` | `slots.json` schema | One source of truth |
| D2 | Walker | `SKILL/scripts/lib/nearest.mjs`: `findNearest(startDir, rel, {stopDir, fallbackDir})`, `findNearestByStem`, `findSeriesRoot(startDir, domainRoot)` (moved from `video-engine-cli.mjs:63`) | Walker per concern | Components, sounds, frames, series doc: one walker |
| D3 | Walk bounds | Files: script dir up to `resolveWorkspace(scriptDir).root` inclusive, then skill fallback (components, frames); a miss is judged by D21. Series root: nearest ancestor holding `series_NN.md`, `series_rules.md` or `script_template.md`, **strictly below** the domain root | Unbounded series walk (today) | An episode outside a series folder, or a marker at the domain root, never yields a series level |
| D4 | Mount location | Overlay and animation hosts in the root `index.html` with global `data-start` | Inside scene sub-compositions | One nesting level; global times |
| D5 | Staging | Components to `<project>/components/<name>.html`, authored projects to `<project>/authored/<slug>/` (skip `.hyperframes/`); sounds via `stageAsset` | Collapsing the triple copy | Non-goal; no `..` in any `src` |
| D6 | Sound events | CLI appends `kind:'sfx'` entries to `manifest.tracks.audio` (times in D12); no `data-duration` | New emitter path | Reuses `audioEls` |
| D7 | Animation | `layer_type:'animation'`, excluded from `resolveMediaLayers`; pre-pass reads `<asset>/index.html` root id + `data-duration`; scene = `max(narration, animation)`; host duration = scene; no `muted`, no playback-rate | Retiming | Variables cannot retime |
| D8 | Id collisions | Authored id equal to a scene slug, root id, component id or another source's id is an error naming both | Auto-prefix | Loud and cheap |
| D9 | Regeneration guard | `lib/emit-guard.mjs` `writeGuarded(projectDir, files)` with `.nn-emit.json` (`{"files":{"<posix rel>":"<sha256>"}}`, sorted); edited recorded file → `RegenerationRefusedError` listing all, nothing written; no `--force` | `hyperframes history --who` | Offline, unit-testable |
| D10 | Cascade | Rename `lib/model-cascade.mjs` → `lib/cascade.mjs`; `SCOPE_ORDER = cli, layer, scene, video, series, domain, blueprint`; `resolve(param, bags)` → `{value, source}`; `resolveKeyed` for `key=name` lists; `loadCascadeBags(scriptDir)`. Delete `resolveModels`, `resolveEngineModel`, `DEFAULT_MODELS`, `DEFAULT_BG_MUSIC_VOLUME`, the `'cover'` literal | A second resolver | One selection path |
| D11 | Defaults home | `Video Defaults` Concept. Blueprint level: `PKG/defaults/video-defaults_NN.md`. Domain level: `<domain root>/video-defaults_NN.md`, absent = level skipped | Domain-root `series_NN.md`; guard `defaults`; the domaiNN doc | Maintainer decision 1; `Series` stays a real series |
| D12 | Event times | `video-start`=0; `video-end`=`total − probeDuration(sound)` (≥0); `scene-boundary`=scene i>0 start; `overlay-enter/exit.<slot>`=overlay start/end; `layer-enter.<type>`=layer start | Probing all sounds | Only `video-end` needs a length |
| D13 | Levels as data | A parameter is overridable at a Concept iff its Field Definition lists it in `concept:: [...]` (L1 §Field Definition allows a list; nn-core `scope="list"`). One shared definition per parameter | Duplicated per-Concept definitions; frontmatter `cascade:` map | Native iNNfo, no drift between copies |
| D14 | Duration exposure | `compile --dry-run` prints `scene <slug>: <s>s (estimated\|measured)` and `frame <name>: <path> (<source>)`. Mount warns on animation/narration mismatch > 1 frame | New command | Existing output; procedures read the frame path from it |
| D15 | Package locator | `findBlueprintPackage(skillDir)`: first dir whose `spec_NN.md` has `blueprint_name: "video-script"` among `skillDir/../..` (repo, in-package), `skillDir/../../bluepriNNts/video-script` (global install), `skillDir/../../../specs/bluepriNNts/video-script` (workspace install); else `BlueprintPackageNotFoundError` listing them | Copy defaults into the skill; env var | Maintainer wants defaults in the package; the installer copies the package and the skill to separate dirs (`skills-commands.js:473-561`) |
| D16 | Adoption copy | No code. SKILL.md "Domain setup" step: if `<domain root>/video-defaults_NN.md` is absent, copy `PKG/defaults/video-defaults_NN.md` there | New scaffolder; engine auto-write | No scaffolder or domain hydration exists (`install --blueprint` writes only `~/.agents`; `init_knowledge` creates an empty doc) |
| D17 | Defaults versioning | `guard-template-immutability.js`: `ownerSpecOf` matches `<bp>/(skills\|defaults)/**`; `isCanonicalBlueprint` excludes `/defaults/` | Leave as is | Today `defaults/*_NN.md` is read as a canonical blueprint and fails for lacking `blueprint_version` |
| D18 | Frame | `frame` is a cascade parameter; `frames/<name>.md` via D2/D3; `frame-tokens.mjs` keeps `parseFrameTokens`/`frameCss`, loses `FRAME_FILE` and the `loadFrameTokens` walk | Keep nearest `frame.md` | One resolution path |
| D19 | Providers | Delete `elevenlabs`/`edge-tts`: Template `tool` options `[wavespeed, replicate]`; `_useMiniMax` drops the ElevenLabs key test; `'elevenlabs'` fallback and comments go | Keep as aliases | Phantom: no request path exists |
| D20 | TTS cache identity | `voiceOptions` keeps its internal key `model` holding the cascaded `tts_model`; the Template `tool` is no longer a model fallback | Rename the hash key | Renaming `model::`→`tts_model::` must not re-bill cached narration |
| D21 | Missing named file | The D10 `resolve`/`resolveKeyed` result already carries `source`. After the walk, a name with no file and `source !== 'blueprint'` throws `MissingAssetError: sound "whoosh" (set by series) not found; searched: <every path>`; with `source === 'blueprint'` it is skipped with one warning. `findNearest*` returns the paths it tried on a miss. The check runs for every resolved component, sound and frame in `compile` before any synthesis or render | Warn for all (field failure: render aborted mid-way); error for all (breaks a fresh install, which ships no sound files) | Severity follows who asked for the name: a user-level name is a promise, a blueprint default is a hint |

### Cascade parameters (one shared Field Definition each)

| Field | `concept::` | Blueprint default | Consumer |
|---|---|---|---|
| `template` | Video, Scene, Series, Video Defaults | none | `lowerKnowledgeModel` (`remotion-scene-compiler.mjs:285-294`) |
| `voice`, `tts_model` | Template, Series, Video Defaults | `default`, `minimax/speech-2.8-hd` | `tts-options.mjs`, CLI `:247`, estimator `:328` (Template values fill the scene/video bag of the referencing element) |
| `image_model` | Series, Video Defaults (+cli) | `wavespeed-ai/z-image/turbo` | CLI `:279`, estimator `:279` |
| `avatar_model` | Layer, Series, Video Defaults (+cli) | `wavespeed-ai/infinitetalk-fast` | CLI `:413`, `avatar-jobs.mjs:150`, estimator `:337` |
| `music`, `music_volume`, `transition` | Scene, Series, Video Defaults | -, `0.2`, `none` | compiler `:296-316,579` |
| `fit` | Layer, Series, Video Defaults | `cover` | compiler `:454,640` |
| `frame` | Video, Scene, Series, Video Defaults | `neutral` | slot variables `font`/`accent` (D18) |
| `components` | Video, Series, Video Defaults | `title=title`, ..., `b-roll=b-roll` | slot mount (D1) |
| `sounds` | Video, Series, Video Defaults | `scene-boundary=whoosh` | sfx tracks (D6) |

Series-only (not cascaded): `title` (`concept:: [Video, Series]`), `presenter_asset`, `intro_asset`.
`position` is excluded: per-slot defaults belong to the component's variable defaults.

## Data Flow

```
scriptDir ─findSeriesRoot→ series_NN.md ─ <root>/video-defaults_NN.md ─ PKG/defaults/video-defaults_NN.md
                      └────────── cascade.resolve(param, bags) ──────────┘
names → findNearest(components/<n>.html | sounds/<n>.* | frames/<n>.md) → D21 (source) → contract → stage
compile(values, animationDurations) → manifest(+sfx) → buildProject → writeGuarded → render
```

## File Changes

| File | Action | Description |
|---|---|---|
| `SKILL/scripts/lib/nearest.mjs`, `lib/emit-guard.mjs` | Create | D2/D3, D9 |
| `SKILL/scripts/lib/cascade.mjs` | Create (rename) | D10, D15 |
| `SKILL/scripts/lib/model-cascade.mjs` | Delete | Renamed |
| `SKILL/scripts/lib/tts-options.mjs`, `lib/frame-tokens.mjs` | Modify | Cascaded voice/`tts_model`, no literals; D18 |
| `SKILL/scripts/asset-cost-estimator.mjs`, `asset-synthesizer.mjs`, `lib/avatar-jobs.mjs`, `synthesize-avatar.mjs` | Modify | Defaults from bags; D19 |
| `SKILL/scripts/remotion-scene-compiler.mjs`, `lib/knowledge-model.mjs` | Modify | Cascaded params, `tts_model`/`avatar_model`, `animation`, `max()` |
| `SKILL/scripts/build-script-from-draft.mjs`, `build-draft-html.mjs`, `thumbnail-v1.mjs` | Modify | Read bags; delete `DEFAULT_SERIES_CONFIG`, `loadSeriesConfig`, `--config`, `00-gancho`, `_animacion_` |
| `SKILL/scripts/overlay-blocks.mjs` | Rewrite | `SLOT_OF`, `readVariableIds`, `assertSlotContract`, `overlayMount` |
| `SKILL/scripts/scene-project.mjs`, `hyperframes-render.mjs`, `video-engine-cli.mjs` | Modify | Root hosts, `files` map, staging, sfx, dry-run lines |
| `SKILL/components/*.html` (6), `SKILL/frames/neutral.md`, `SKILL/references/overlay-slots.md` | Create | Neutral fallbacks; reference |
| `PKG/defaults/video-defaults_NN.md` | Create | Blueprint Video Defaults |
| `PKG/spec_NN.md`; `iNNfo/specs/bluepriNNts/catalog.json`; `SKILL/SKILL.md` | Modify | Concepts/Fields, `tool` options, versions; adoption step |
| `scripts/guard-template-immutability.js` (+ `.test.js`) | Modify | D17 |
| Tests: `guard-hardening`, `synthesizer-guard`, `cache-manager`, `video-engine-cli`, `voice-clone` (`SKILL/test/`), `test/video-script-contract-additions.test.mjs` | Modify | Drop `elevenlabs`/`ELEVENLABS_API_KEY`; `model`→`avatar_model`/`tts_model` |

## Interfaces / Contracts

```js
resolve('music_volume', bags)                        // { value: '0.2', source: 'blueprint' }
resolveKeyed('sounds', 'overlay-enter.title', bags)  // { value: 'click', source: 'series' } | { value: null }
// bags: { cli?, layer?, scene?, video?, series?, domain?, blueprint } — each a fields object
```

Slot variables: `text`, `src`, `position`, `enter`, `exit`, `font`, `accent`; `b-roll` adds `fit`.

## Testing Strategy

Strict TDD, `node --test` under `SKILL/test/`, RED before GREEN.

| Layer | What | Approach |
|---|---|---|
| Unit | precedence/source/keyed; D21 error vs warning by source, searched paths listed; walker bounds incl. no-series episode; locator; contract diff; guard; event times; `max()`; collisions; immutability `defaults/` | Temp-dir fixtures |
| Integration | byte-identical emission; no `..`; grep: no sound name, default literal, `elevenlabs`, `edge-tts`, `00-gancho` in `SKILL/scripts/` | Extend suites; migrate `model-cascade.test.mjs` |
| Manual | `hyperframes check --json` = 0 errors | Maintainer, pin 0.8.192 |

## Migration / Rollout

No engine-side data migration; see the proposal's domain note.

## Open Questions

- [ ] Spike: does HF 0.8.192 mount a standalone `index.html` via `data-composition-src` and resolve its relative assets from `authored/<slug>/`?
- [ ] Does mounting one component id several times render without the 45 s wait?
- [ ] Root animation hosts lose `layer_level` ordering against siblings. Acceptable?
- [ ] Template `tool` has no consumer after D20. Delete the Field in a follow-up?
