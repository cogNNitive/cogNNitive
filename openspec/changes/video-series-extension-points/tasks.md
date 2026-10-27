# Tasks: Video Series Extension Points

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,000-1,150 (S0 ~0, S1 ~250, S2 ~400, S3 ~150, S4 ~250) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | S0 spike (no PR) -> PR 1 -> PR 2 -> PR 3 -> PR 4 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Hard prerequisite: `session/video-delivery-fix` (`lib/frame-tokens.mjs`) merged into `dev` before any apply.

Paths: `SKILL` = `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/`; tests in `SKILL/test/` run with `node --test <file>`; gate with `node scripts/verify.js --only=<substring>`.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| S0 | Spike answers design top risk | none (notes in this file) | Throwaway; no merge |
| S1 | Walker + regeneration guard + version bumps | PR 1 | base = main (stacked) or tracker (chain) |
| S2 | Slot components + deletions | PR 2 | base = PR 1 branch (chain) or main |
| S3 | Sound effects | PR 3 | independent of S2 logic; base = PR 2 in a chain |
| S4 | Animation layer | PR 4 | BLOCKED on S0; base = PR 3 in a chain |

Each slice is revertible alone (revert its commits; S1 bumps stay valid).

## Slice 0: Spike (time-box 2h, blocks S4)

- [ ] 0.1 Hand-build a project: root `index.html` mounting `authored/demo/index.html` via `data-composition-src`, with a relative asset URL; run `hyperframes check --json` and render at pin 0.8.192.
- [ ] 0.2 Mount the same component file twice (two lower-thirds); confirm no composition id collision and no 45 s wait.
- [ ] 0.3 Record outcomes under "Spike Outcome" below. If 0.1 fails, S4 adopts the design fallback (copy authored assets to project root under a prefix) and S4 task list is revised before apply.

## Slice 1: Walker + guard + bumps (spec: series-script-templates, engine Regeneration Guard)

- [ ] 1.1 RED `SKILL/test/nearest.test.mjs`: precedence episode>series>fallback, `stopDir` inclusive, folders optional, `findNearestByStem`.
- [ ] 1.2 GREEN create `SKILL/scripts/lib/nearest.mjs` (`walkUp`, `findNearest`, `findNearestByStem`, `findSeriesRoot` moved from `video-engine-cli.mjs:63`).
- [ ] 1.3 Refactor `lib/frame-tokens.mjs` and `video-engine-cli.mjs` to import it; existing frame-token tests stay green.
- [ ] 1.4 RED `SKILL/test/emit-guard.test.mjs`: edited file refused and named, deleted file regenerated, untouched project regenerates, no `--force`, byte-stable record.
- [ ] 1.5 GREEN create `SKILL/scripts/lib/emit-guard.mjs` (`writeGuarded`, `RegenerationRefusedError`, `.nn-emit.json`).
- [ ] 1.6 Make `buildProject` in `scene-project.mjs` return a `files` map; `hyperframes-render.mjs` writes via `writeGuarded`. Test: `scene-project.test.mjs` determinism still passes.
- [ ] 1.7 Bump `SKILL/SKILL.md` to `V_0-6-0` and blueprint `spec_NN.md` to `blueprint_version: V_0-4-0`.
- [ ] 1.8 Run `node scripts/blueprint-catalog.mjs --release-tag <current>`; commit `catalog.json`.
- [ ] 1.9 Run `node scripts/guard-template-immutability.js` and `node scripts/verify.js --only=video`; re-check the `verify.js:364` `guard-hardening` carve-out and remove it if the bump fixes it.

## Slice 2: Slots + deletions (spec: ephemeral-overlays, engine Slot Resolution, b-roll, watermark, skill)

- [ ] 2.1 RED `overlay-emission.test.mjs`: overlay mounts resolved component with `data-variable-values`; enter/exit reach it; frame tokens reach it; missing variable throws `SlotContractError` naming slot and variables.
- [ ] 2.2 Create neutral fallbacks `SKILL/components/{title,lower-third,caption,quote,watermark,b-roll}.html` (b-roll does `fit` and zoom-in).
- [ ] 2.3 GREEN rewrite `scripts/overlay-blocks.mjs` (`SLOT_OF`, `readVariableIds`, `assertSlotContract`, `overlayMount`); delete `DEFAULT_OVERLAY_BLOCKS`, `resolveOverlayBlock`, `overlayHostMarkup`, `renderOverlay`, `data-block`.
- [ ] 2.4 Move overlay hosts to root `index.html` in `scene-project.mjs`; drop `OVERLAY_HOST_ANCHOR`, `seriesFrame`/`sceneBlock`, hardcoded `#0b0b0f`.
- [ ] 2.5 Stage components to `<project>/components/` in `hyperframes-render.mjs`; resolve via `findNearest` in `video-engine-cli.mjs`.
- [ ] 2.6 Delete `overlay-blocks.test.mjs` cases for removed APIs; add tests: no `..` in any `src`, emitted tree byte-identical across runs.
- [ ] 2.7 Create `SKILL/references/overlay-slots.md` (slot->variables table, one registry hint per slot).
- [ ] 2.8 Re-run catalog (1.8) and `guard-template-immutability`; manual `hyperframes check --json` = 0 errors on fallbacks.

## Slice 3: Sounds (spec: engine Sound Effects)

- [ ] 3.1 RED `sound-events.test.mjs`: per-slot beats generic, generic used, silent fallback, `scene-boundary` skips i=0, no `data-duration` on sfx.
- [ ] 3.2 GREEN add `kind:'sfx'` tracks and `stageAsset` staging in `video-engine-cli.mjs`; conditional `data-duration` in `scene-project.mjs`.
- [ ] 3.3 Grep test: no concrete sound name in `SKILL/scripts/`.
- [ ] 3.4 Re-run catalog and immutability guard; `node scripts/verify.js --only=video`.

## Slice 4: Animation (BLOCKED on S0; spec: video-script-model, engine Animation Layer)

- [ ] 4.1 RED `video-script-model` tests: `type:: animation` valid with asset, rejected without; unknown type still rejected.
- [ ] 4.2 GREEN add `animation` to `remotion-scene-compiler.mjs` and the blueprint `spec_NN.md` Layer `type` (no second version bump; V_0-4-0 unreleased).
- [ ] 4.3 RED then GREEN: pre-pass reads `<asset>/index.html` id and duration; scene = `max(narration, animation)`; shorter holds last frame; missing project fails loudly.
- [ ] 4.4 Stage `authored/<slug>/` (skip `.hyperframes/`); mount at root with global `data-start`, no `muted`, no playback-rate.
- [ ] 4.5 RED then GREEN id-collision errors (D8): scene slug, root id, component id, different source; same source twice allowed.
- [ ] 4.6 Re-run catalog and guard; manual check on one authored animation; full `node scripts/verify.js`.

## Spike Outcome

(to be filled by S0)
