# Tasks: Video Series Extension Points

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,300 (S0 ~0, S1 ~330, S2 ~380, S3 ~280, S4 ~150, S5 ~250, S6 ~380, S7 ~250, S8 ~300) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | S0 spike (no PR) -> PR 1 ... PR 8 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Hard prerequisite: `session/video-delivery-fix` (`lib/frame-tokens.mjs`) merged into `dev` before any apply.

Paths: `SKILL` = `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/`; `PKG` = `iNNfo/specs/bluepriNNts/video-script/`; `BP` = `PKG/spec_NN.md`; tests in `SKILL/test/` run with `node --test <file>`; gate with `node scripts/verify.js --only=<substring>`.

### Suggested Work Units

| Unit | Goal | Likely PR | Depends on |
|------|------|-----------|------------|
| S0 | Spike answers design top risk | none (notes below) | - |
| S1 | Walker + regeneration guard + bumps + `defaults/` versioning + provider deletion | PR 1 | prerequisite |
| S2 | Cascade + `Video Defaults`/`Series` Concepts + defaults documents + package locator | PR 2 | S1 |
| S3 | Model params `tts_model`/`image_model`/`avatar_model` | PR 3 | S2 |
| S4 | `frame` parameter | PR 4 | S2 |
| S5 | Draft tools read the cascade | PR 5 | S2 |
| S6 | Slot components + deletions + b-roll zoom removal | PR 6 | S4 |
| S7 | Sound events | PR 7 | S2 (chained after S6) |
| S8 | Animation layer + duration exposure | PR 8 | S0, S5 |

Each slice is revertible alone (revert its commits; S1 bumps stay valid).

## Slice 0: Spike (time-box 2h, blocks S8)

- [ ] 0.1 Hand-build a project: root `index.html` mounting `authored/demo/index.html` via `data-composition-src`, with a relative asset URL; run `hyperframes check --json` and render at pin 0.8.192.
- [ ] 0.2 Mount the same component file twice (two lower-thirds); confirm no id collision and no 45 s wait.
- [ ] 0.3 Record outcomes under "Spike Outcome". If 0.1 fails, S8 copies authored assets to the project root under a prefix; revise S8 before apply.

## Slice 1: Walker, guard, bumps, providers (spec: engine Regeneration Guard, Only Implemented Providers; model Series Concept "outside a series"; design D2, D3, D9, D17, D19)

- [ ] 1.1 RED `SKILL/test/nearest.test.mjs`: episode>series>domain>fallback, `stopDir` = `resolveWorkspace` root inclusive, folders optional, `findNearestByStem`; `findSeriesRoot(dir, domainRoot)` returns undefined for a script directly under the domain root and ignores a marker AT the domain root.
- [ ] 1.2 GREEN create `SKILL/scripts/lib/nearest.mjs` (`findNearest`, `findNearestByStem`, `findSeriesRoot` moved from `video-engine-cli.mjs:63`, markers `series_NN.md`, `series_rules.md`, `script_template.md`, strictly below the domain root); `video-engine-cli.mjs` imports it.
- [ ] 1.3 RED `SKILL/test/emit-guard.test.mjs`: edited file refused and named, deleted file regenerated, untouched project regenerates, no `--force`, byte-stable record.
- [ ] 1.4 GREEN create `SKILL/scripts/lib/emit-guard.mjs`; `buildProject` returns a `files` map; `hyperframes-render.mjs` writes via `writeGuarded`; determinism test passes.
- [ ] 1.5 RED `scripts/guard-template-immutability.test.js`: a change under `bluepriNNts/<bp>/defaults/` without a `spec_NN.md` bump fails naming the owner; `defaults/*_NN.md` is not treated as a canonical blueprint. GREEN in `scripts/guard-template-immutability.js` (`ownerSpecOf` matches `(skills|defaults)`; `isCanonicalBlueprint` excludes `/defaults/`).
- [ ] 1.6 Delete providers: `BP` Template `tool` options -> `[wavespeed, replicate]`; `asset-synthesizer.mjs` header, `ttsProvider` JSDoc, `elevenLabsApiKey` field and its `_useMiniMax` clause; `asset-cost-estimator.mjs:217` comment; `SKILL/SKILL.md:59`. Tests: `guard-hardening.test.mjs:260` (use another loose label), `synthesizer-guard.test.mjs:141,145` (another loose label), `ELEVENLABS_API_KEY` in `cache-manager.test.mjs:21`, `video-engine-cli.test.mjs:23`, `voice-clone.test.mjs:165`; `test/video-script-contract-additions.test.mjs:129` `tool: 'wavespeed'`. (`tts-options.mjs:21` goes in S3.)
- [ ] 1.7 Grep test: no `elevenlabs`, `edge-tts`, `ELEVENLABS_API_KEY` (case-insensitive) under `SKILL/` except `scripts/lib/tts-options.mjs` until S3 removes it.
- [ ] 1.8 Bump `SKILL/SKILL.md` to `V_0-6-0` and `BP` to `blueprint_version: V_0-4-0`; `node scripts/blueprint-catalog.mjs --release-tag <current>`; commit `catalog.json`.
- [ ] 1.9 `node scripts/guard-template-immutability.js` and `node scripts/verify.js --only=video`; remove the `verify.js:364` `guard-hardening` carve-out if the bump fixes it.

## Slice 2: Cascade + Concepts + defaults (spec: model Universal Parameter Cascade, Video Defaults, Series, Shared Field Definitions; engine Blueprint Defaults Are Read From The Package; skill Package Ships Defaults, Domain Adoption; design D10, D11, D13, D15, D16)

- [ ] 2.1 RED `SKILL/test/cascade.test.mjs` (migrate `model-cascade.test.mjs`): order `cli..blueprint`, source reported, empty values skipped, `resolveKeyed` per key; `loadCascadeBags` reads series doc from `findSeriesRoot`, domain doc at the root, blueprint doc via the locator; no domain doc = level skipped; script outside a series yields `domain`, never `series`.
- [ ] 2.2 RED locator: repo, global (`../../bluepriNNts/video-script`) and workspace (`../../../specs/bluepriNNts/video-script`) layouts found; none found -> `BlueprintPackageNotFoundError` listing paths.
- [ ] 2.3 GREEN rename `lib/model-cascade.mjs` -> `lib/cascade.mjs` (`resolve`, `resolveKeyed`, `loadCascadeBags`, `findBlueprintPackage`); delete `resolveModels`; `workspace` -> `domain`.
- [ ] 2.4 `BP`: add `Series` and `Video Defaults` Concepts + index entries; one shared Field Definition per cascade parameter with `concept:: [...]` per the design table (merge the two `template` definitions); `title` -> `concept:: [Video, Series]`; `presenter_asset`, `intro_asset` on Series; `frame`, `components`, `sounds` on Video; `frame` on Scene; update cascade wording in descriptions.
- [ ] 2.5 Create `PKG/defaults/video-defaults_NN.md` (L3, `parent_spec` = `BP`) with every default from the design table (`template` none, `voice:: default`, `tts_model`, `image_model`, `avatar_model`, `music_volume:: 0.2`, `transition:: none`, `fit:: cover`, `frame:: neutral`, `components`, `sounds:: [scene-boundary=whoosh]`). It must validate against `BP`.
- [ ] 2.6 RED then GREEN: compiler `lowerKnowledgeModel` resolves `template`, `music`, `music_volume`, `transition`, `fit` via `resolve`; series-level and domain-level scenarios; delete `DEFAULT_BG_MUSIC_VOLUME` and the `'cover'` literal.
- [ ] 2.7 `SKILL/SKILL.md`: "Domain setup" step (copy `PKG/defaults/video-defaults_NN.md` to the domain root when absent; tune by editing); test asserts both paths are named.
- [ ] 2.8 Re-run catalog and immutability guard; `node scripts/verify.js --only=video`.

## Slice 3: Model params (spec: model Template Concept, Layer type; engine Stable TTS cache key; design D10, D20)

- [ ] 3.1 RED: TTS key unchanged when `avatar_model::` changes; key unchanged when Template `model::` becomes `tts_model::` with the same value; Template `tool` no longer used as model.
- [ ] 3.2 GREEN `BP`: Layer `model` -> `avatar_model`, Template `model` -> `tts_model` (shared definitions with Series/Video Defaults); `lib/knowledge-model.mjs:260` reads `tts_model`; compiler `:304` `scene_tts_model` from `tts_model` only, `:346` `layer_avatar_model` from `avatar_model`.
- [ ] 3.3 Fold `tts-options.mjs` fallbacks (`'elevenlabs'`, `'default'`) into `resolve`; voice options keep the hash key `model`.
- [ ] 3.4 Switch `video-engine-cli.mjs:247,279,413`, `asset-cost-estimator.mjs:279-337`, `asset-synthesizer.mjs:126`, `lib/avatar-jobs.mjs:150`, `synthesize-avatar.mjs` to `resolve`; delete `DEFAULT_MODELS` and `resolveEngineModel`. Update `test/video-script-contract-additions.test.mjs` (`model:` -> `avatar_model:`).
- [ ] 3.5 Grep test: no default literal and no `elevenlabs` in `SKILL/scripts/` (drop the 1.7 exception).
- [ ] 3.6 Re-run catalog and guard; `node scripts/verify.js --only=video`.

## Slice 4: Frame (spec: model Frame Parameter; engine Names Are Parameters, Slot Contract frame scenario; design D18, D14)

- [ ] 4.1 RED: `frame` resolves per scene; `frames/<name>.md` found episode>series>domain>skill; a series `frame.md` is ignored; unknown frame name fails naming it; dry-run prints `frame <name>: <path> (<source>)`.
- [ ] 4.2 GREEN: create `SKILL/frames/neutral.md`; `lib/frame-tokens.mjs` keeps `parseFrameTokens`/`frameCss`, deletes `FRAME_FILE` and the `loadFrameTokens` walk (a `loadFrame(path)` reader replaces it); callers use `resolve('frame')` + `findNearest`.
- [ ] 4.3 Re-run catalog and guard; `node scripts/verify.js --only=video`.

## Slice 5: Draft tools (spec: skill Blueprint-Ships Draft Authoring Tools)

- [ ] 5.1 RED `build-script-from-draft.test.mjs`: values from the cascade, filename from Series slug, frontmatter copied from the series doc, no cascaded scene lines written, hook template comes from the draft scene.
- [ ] 5.2 GREEN delete `DEFAULT_SERIES_CONFIG`, `applySeriesTokens`, `loadSeriesConfig`, `--config`, the `00-gancho` branch; read `loadCascadeBags` from the input dir or `--series <dir>`.
- [ ] 5.3 `build-draft-html.mjs` and `thumbnail-v1.mjs` take `title` from the Series doc; update usage strings and `SKILL.md:134` mention of `video.series.json`.
- [ ] 5.4 Re-run catalog and guard; `node scripts/verify.js --only=video`.

## Slice 6: Slots + deletions (spec: ephemeral-overlays, engine Slot Contract, B-roll, Watermark; design D1, D4, D5)

- [ ] 6.1 RED `overlay-emission.test.mjs`: root host mounts the component named by `components`; enter/exit and frame tokens reach it; `SlotContractError` names slot and variables; series `components:: [lower-third=pill]` mounts `pill.html`.
- [ ] 6.2 Create neutral fallbacks `SKILL/components/{title,lower-third,caption,quote,watermark,b-roll}.html` (b-roll honors `fit`, no motion).
- [ ] 6.3 GREEN rewrite `scripts/overlay-blocks.mjs`; delete `DEFAULT_OVERLAY_BLOCKS`, `resolveOverlayBlock`, `overlayHostMarkup`, `renderOverlay`, `data-block`.
- [ ] 6.4 Root overlay hosts in `scene-project.mjs`; drop `OVERLAY_HOST_ANCHOR`, `seriesFrame`/`sceneBlock`, `#0b0b0f`.
- [ ] 6.5 Stage components in `hyperframes-render.mjs`; locate via `findNearest` in `video-engine-cli.mjs`.
- [ ] 6.6 Delete `overlay-blocks.test.mjs` cases for removed APIs; tests: no `..` in any `src`, byte-identical tree.
- [ ] 6.7 Create `SKILL/references/overlay-slots.md` (slot variables, event keys, one registry hint per slot).
- [ ] 6.8 Re-run catalog and guard; manual `hyperframes check --json` = 0 errors on fallbacks.

## Slice 7: Sounds (spec: engine Sound Effects Bound To Engine Events, Names Are Parameters; design D6, D12)

- [ ] 7.1 RED `sound-events.test.mjs`: each key's time (`video-start` 0, `video-end` = total minus probed length, boundaries skip scene 0, overlay enter/exit, `layer-enter.<type>`); per-slot key; unresolved key silent without warning; missing file silent with one warning; no `data-duration`.
- [ ] 7.2 GREEN add `kind:'sfx'` tracks with `resolveKeyed('sounds', ...)` + `findNearestByStem` + `stageAsset` in `video-engine-cli.mjs`; conditional `data-duration` in `scene-project.mjs`.
- [ ] 7.3 Grep test: no sound name in `SKILL/scripts/`.
- [ ] 7.4 Re-run catalog and guard; `node scripts/verify.js --only=video`.

## Slice 8: Animation (BLOCKED on S0; spec: model Layer type, engine Animation Layer, Scene Target Duration; design D7, D8, D14)

- [ ] 8.1 RED model tests: `type:: animation` valid with asset, rejected without; unknown type rejected.
- [ ] 8.2 GREEN add `animation` to `remotion-scene-compiler.mjs`, `BP` Layer `type` options and `validation.conditional_fields`.
- [ ] 8.3 RED then GREEN pre-pass reads `<asset>/index.html` id and duration; scene = `max(narration, animation)`; shorter holds last frame; missing project fails loudly; mismatch >1 frame warns with scene and both durations.
- [ ] 8.4 `compile --dry-run` prints `scene <slug>: <s>s (estimated|measured)`.
- [ ] 8.5 Stage `authored/<slug>/` (skip `.hyperframes/`); root mount, no `muted`, no playback-rate.
- [ ] 8.6 RED then GREEN id collisions (D8).
- [ ] 8.7 `build-script-from-draft.mjs`: an `animation` choice emits `type:: animation` with the authored project asset (delete `_animacion_`).
- [ ] 8.8 Re-run catalog and guard; manual check on one authored animation; full `node scripts/verify.js`.

## Spike Outcome

(to be filled by S0)
