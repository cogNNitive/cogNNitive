# Tasks: Video Blueprint Architecture & Ephemeral Overlays

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–950 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 blueprint+parser+mirror → PR2 compiler+overlays → PR3 legacy+gate |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR |
|------|------|-----------|
| 1 | Level-2 blueprint schema + PEG overlay events + rebuilt mirror | PR 1 (base: feature branch) |
| 2 | Compiler blueprint resolution + sequential overlay scheduling | PR 2 (base: PR 1) |
| 3 | Legacy quarantine + ledger + deterministic gate | PR 3 (base: PR 2) |

## Phase 0: Resolve Open Questions (gating decisions)

- [x] 0.1 Resolve the `> broll:` option schema (`source`, `duration`, `fit`); record in `design.md`.
- [x] 0.2 Resolve series-override location (sibling blueprint file vs inline `series_rules.md`); record in `design.md`.

## Phase 1: Video Blueprint (Level 2) — Foundation

- [x] 1.1 RED: `skills/nn-video-script/test/blueprint-resolution.test.mjs` asserting `spec_NN.md` declares the three reusable templates.
- [x] 1.2 GREEN: add the three template blocks + inheritance rules to `iNNfo/specs/bluepriNNts/video/spec_NN.md`.
- [x] 1.3 Verify: run 1.1; `npm run lint`; `npm run typecheck`; `npm run format:check`.

## Phase 2: Parser — PEG Grammar + Mirror

- [x] 2.1 RED: Vitest `src/parser/OverlayEvents.test.ts` — each `>` form → typed `OverlayEvent`; narration token-free; legacy comment recognized.
- [x] 2.2 GREEN: add `OverlayEventNode` to `src/parser/ast.ts`; `overlay_events?` to `SceneSchema` in `src/domain/types.ts`.
- [x] 2.3 GREEN: add `BlockQuoteEvent` rule and `>` to `MarkerLine` in `src/parser/vus.peggy`; run `npm run build:grammar`.
- [x] 2.4 GREEN: push events to `scene.overlay_events` and exclude them from `scene_content` in `src/parser/lowering.ts`.
- [x] 2.5 GREEN: re-export new types in `scripts/mirror/video-parser-entry.ts`; regenerate via `node scripts/build-video-parser-mirror.mjs`.
- [x] 2.6 Verify: `npm --workspace=@cognnitive/innfo-video-parser test`; mirror `--check`; lint/typecheck/format.

## Phase 3: Compiler — Blueprint Resolution + Scheduling

- [x] 3.1 RED: `skills/nn-video-script/test/overlay-events.test.mjs` — one overlay track per `>` event; sequential, no overlap; enter/exit present; missing template/blueprint falls back and warns without failing.
- [x] 3.2 GREEN: add `- video_blueprint:` loader/resolver (series > domain > system default) to `remotion-scene-compiler.mjs`.
- [x] 3.3 GREEN: schedule parsed `OverlayEvent`s into `manifest.tracks.overlays[]` with computed `fromFrame`/`durationInFrames`/`enterAnimation`/`exitAnimation`.
- [x] 3.4 GREEN: consume `enterAnimation`/`exitAnimation` in `scripts/scene/overlays/LowerThird.tsx` and siblings.
- [x] 3.5 Verify: run 3.1 and `scene-compiler.test.mjs`; lint/typecheck/format.

## Phase 4: Legacy Quarantine + Ledger

- [x] 4.1 RED: extend `overlay-events.test.mjs` — legacy `<!-- overlay: -->` parses and warns once; ledger holds exactly one matching `html-comment-overlays` entry.
- [x] 4.2 GREEN: quarantine `extractNarrationAndOverlays` behind `// legacy:video-overlay/html-comment-overlays`; warn once per compile.
- [x] 4.3 GREEN: add the 1:1 entry (`id: html-comment-overlays`, path `remotion-scene-compiler.mjs`) to `legacy-ledger.yaml`.
- [x] 4.4 Verify: `node scripts/lib/legacy-ledger-guard.js`; lint/typecheck/format.

## Phase 5: Final Deterministic Gate

- [x] 5.1 Run the full deterministic gate: `node scripts/verify.js`.
- [x] 5.2 Confirm no regressions: existing scripts render under compatibility mode; TTS stays token-free.
