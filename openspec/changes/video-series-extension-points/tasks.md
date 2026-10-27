# Tasks: Video Series Extension Points

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,800-1,950 (S0 ~0, S1 ~250, S2 ~400, S3 ~250, S4 ~380, S5 ~250, S6 ~300) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | S0 spike (no PR) -> PR 1 ... PR 6 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Hard prerequisite: `session/video-delivery-fix` (`lib/frame-tokens.mjs`) merged into `dev` before any apply.

Paths: `SKILL` = `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/`; `BP` = `iNNfo/specs/bluepriNNts/video-script/spec_NN.md`; tests in `SKILL/test/` run with `node --test <file>`; gate with `node scripts/verify.js --only=<substring>`.

### Suggested Work Units

| Unit | Goal | Likely PR | Depends on |
|------|------|-----------|------------|
| S0 | Spike answers design top risk | none (notes below) | - |
| S1 | Walker + regeneration guard + version bumps | PR 1 | prerequisite |
| S2 | Cascade + Series Concept + defaults document | PR 2 | S1 |
| S3 | Draft tools read the Series document | PR 3 | S2 |
| S4 | Slot components + deletions + b-roll zoom removal | PR 4 | S2 |
| S5 | Sound events | PR 5 | S2 (chained after S4) |
| S6 | Animation layer + duration exposure | PR 6 | S0, S3 |

Each slice is revertible alone (revert its commits; S1 bumps stay valid).

## Slice 0: Spike (time-box 2h, blocks S6)

- [ ] 0.1 Hand-build a project: root `index.html` mounting `authored/demo/index.html` via `data-composition-src`, with a relative asset URL; run `hyperframes check --json` and render at pin 0.8.192.
- [ ] 0.2 Mount the same component file twice (two lower-thirds); confirm no id collision and no 45 s wait.
- [ ] 0.3 Record outcomes under "Spike Outcome". If 0.1 fails, S6 copies authored assets to the project root under a prefix; revise S6 before apply.

## Slice 1: Walker + guard + bumps (spec: engine Regeneration Guard; design D2, D3, D9)

- [ ] 1.1 RED `SKILL/test/nearest.test.mjs`: episode>series>domain>fallback, `stopDir` = `resolveWorkspace` root inclusive, folders optional, `findNearestByStem`.
- [ ] 1.2 GREEN create `SKILL/scripts/lib/nearest.mjs` (`walkUp`, `findNearest`, `findNearestByStem`, `findSeriesRoot` moved from `video-engine-cli.mjs:63`).
- [ ] 1.3 Refactor `lib/frame-tokens.mjs` and `video-engine-cli.mjs` to import it; frame-token tests stay green.
- [ ] 1.4 RED `SKILL/test/emit-guard.test.mjs`: edited file refused and named, deleted file regenerated, untouched project regenerates, no `--force`, byte-stable record.
- [ ] 1.5 GREEN create `SKILL/scripts/lib/emit-guard.mjs`.
- [ ] 1.6 `buildProject` returns a `files` map; `hyperframes-render.mjs` writes via `writeGuarded`; determinism test passes.
- [ ] 1.7 Bump `SKILL/SKILL.md` to `V_0-6-0` and `BP` to `blueprint_version: V_0-4-0`.
- [ ] 1.8 `node scripts/blueprint-catalog.mjs --release-tag <current>`; commit `catalog.json`.
- [ ] 1.9 `node scripts/guard-template-immutability.js` and `node scripts/verify.js --only=video`; remove the `verify.js:364` `guard-hardening` carve-out if the bump fixes it.

## Slice 2: Cascade + Series (spec: video-script-model Universal Parameter Cascade, Series Concept; engine Stable TTS cache key, Spend Guard; design D10, D11, D13)

- [ ] 2.1 RED `SKILL/test/cascade.test.mjs` (migrate `model-cascade.test.mjs`): order `cli..blueprint`, source reported, empty values skipped, `resolveKeyed` per key, `loadCascadeBags` finds series doc below the domain root and domain doc at it.
- [ ] 2.2 GREEN rename `lib/model-cascade.mjs` -> `lib/cascade.mjs` (`resolve`, `resolveKeyed`, `loadCascadeBags`); delete `resolveModels`, `resolveEngineModel`; `workspace` -> `domain`.
- [ ] 2.3 `BP`: add `Series` Concept + index entry; Series Field Definitions (design table); `components`/`sounds` on Video; Layer `model` -> `avatar_model`; update the cascade wording in `template` (Video) description.
- [ ] 2.4 Create `SKILL/defaults/series_NN.md` with every default from the design table (values moved from `DEFAULT_MODELS`, `DEFAULT_BG_MUSIC_VOLUME`, `'cover'`, `'default'` voice).
- [ ] 2.5 RED then GREEN: compiler `lowerKnowledgeModel` resolves `template`, `music`, `music_volume`, `transition`, `fit`, `avatar_model` via `resolve`; series-level and domain-level scenarios.
- [ ] 2.6 Fold `tts-options.mjs` fallbacks into `resolve`; switch `video-engine-cli.mjs`, `asset-cost-estimator.mjs`, `asset-synthesizer.mjs`, `lib/avatar-jobs.mjs`, `synthesize-avatar.mjs`; delete `DEFAULT_MODELS` and `DEFAULT_BG_MUSIC_VOLUME`. Update `test/video-script-contract-additions.test.mjs`.
- [ ] 2.7 Test: TTS key unchanged when `avatar_model::` changes; grep test: no default literal in `SKILL/scripts/`.
- [ ] 2.8 Re-run catalog and immutability guard; `node scripts/verify.js --only=video`.

## Slice 3: Draft tools (spec: video-script-skill Blueprint-Ships Draft Authoring Tools)

- [ ] 3.1 RED `build-script-from-draft.test.mjs`: values from series doc, filename from Series slug, frontmatter copied from series doc, no cascaded scene lines written, hook template comes from the draft scene.
- [ ] 3.2 GREEN delete `DEFAULT_SERIES_CONFIG`, `applySeriesTokens`, `loadSeriesConfig`, `--config`, the `00-gancho` branch; read `loadCascadeBags` from the input dir or `--series <dir>`.
- [ ] 3.3 `build-draft-html.mjs` and `thumbnail-v1.mjs` take `title` from the cascade; update usage strings and SKILL.md mentions of `video.series.json`.
- [ ] 3.4 Re-run catalog and guard; `node scripts/verify.js --only=video`.

## Slice 4: Slots + deletions (spec: ephemeral-overlays, engine Names Are Parameters, Slot Contract, B-roll, Watermark; design D1, D4, D5)

- [ ] 4.1 RED `overlay-emission.test.mjs`: root host mounts the component named by `components`; enter/exit and frame tokens reach it; `SlotContractError` names slot and variables; series `components:: [lower-third=pill]` mounts `pill.html`.
- [ ] 4.2 Create neutral fallbacks `SKILL/components/{title,lower-third,caption,quote,watermark,b-roll}.html` (b-roll honors `fit`, no motion).
- [ ] 4.3 GREEN rewrite `scripts/overlay-blocks.mjs`; delete `DEFAULT_OVERLAY_BLOCKS`, `resolveOverlayBlock`, `overlayHostMarkup`, `renderOverlay`, `data-block`.
- [ ] 4.4 Root overlay hosts in `scene-project.mjs`; drop `OVERLAY_HOST_ANCHOR`, `seriesFrame`/`sceneBlock`, `#0b0b0f`.
- [ ] 4.5 Stage components in `hyperframes-render.mjs`; locate via `findNearest` in `video-engine-cli.mjs`.
- [ ] 4.6 Delete `overlay-blocks.test.mjs` cases for removed APIs; tests: no `..` in any `src`, byte-identical tree.
- [ ] 4.7 Create `SKILL/references/overlay-slots.md` (slot variables, event keys, one registry hint per slot).
- [ ] 4.8 Re-run catalog and guard; manual `hyperframes check --json` = 0 errors on fallbacks.

## Slice 5: Sounds (spec: engine Sound Effects Bound To Engine Events, Names Are Parameters; design D6, D12)

- [ ] 5.1 RED `sound-events.test.mjs`: each key's time (`video-start` 0, `video-end` = total minus probed length, boundaries skip scene 0, overlay enter/exit, `layer-enter.<type>`); per-slot key; unresolved key silent without warning; missing file silent with one warning; no `data-duration`.
- [ ] 5.2 GREEN add `kind:'sfx'` tracks with `resolveKeyed('sounds', ...)` + `findNearestByStem` + `stageAsset` in `video-engine-cli.mjs`; conditional `data-duration` in `scene-project.mjs`.
- [ ] 5.3 Grep test: no sound name in `SKILL/scripts/`.
- [ ] 5.4 Re-run catalog and guard; `node scripts/verify.js --only=video`.

## Slice 6: Animation (BLOCKED on S0; spec: video-script-model Layer type, engine Animation Layer, Scene Target Duration; design D7, D8, D14)

- [ ] 6.1 RED model tests: `type:: animation` valid with asset, rejected without; unknown type rejected.
- [ ] 6.2 GREEN add `animation` to `remotion-scene-compiler.mjs`, `BP` Layer `type` options and `validation.conditional_fields` (no second bump).
- [ ] 6.3 RED then GREEN pre-pass reads `<asset>/index.html` id and duration; scene = `max(narration, animation)`; shorter holds last frame; missing project fails loudly; mismatch >1 frame warns with scene and both durations.
- [ ] 6.4 `compile --dry-run` prints `scene <slug>: <s>s (estimated|measured)`.
- [ ] 6.5 Stage `authored/<slug>/` (skip `.hyperframes/`); root mount, no `muted`, no playback-rate.
- [ ] 6.6 RED then GREEN id collisions (D8).
- [ ] 6.7 `build-script-from-draft.mjs`: an `animation` choice emits `type:: animation` with the authored project asset (delete `_animacion_`).
- [ ] 6.8 Re-run catalog and guard; manual check on one authored animation; full `node scripts/verify.js`.

## Spike Outcome

(to be filled by S0)
