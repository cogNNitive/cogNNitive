# Tasks: Draft Tools Promoted To The Blueprint

Strict TDD: every GREEN task is preceded by a RED task. Promoted tools live in
`iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/` (`S`), tests in `T`.
Phase 1 runs in the user workspace (`_NN/video_NN`), phase 2 in the blueprint.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (hand-written) | ~550-700 (S ~250-350; T ~200; config ~40; docs ~60) |
| Estimated changed lines (generated, counted separately) | none |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
400-line budget risk: Medium

## Sequencing

Phase 1 (extract config) has no blueprint dependency. Phase 2 (promote) depends on the renderer
change only for naming consistency. Docs (phase 3) depend on `video-model-cascade` for the cascade
being the model source.

## 1. Phase 1 — Extract the series config (workspace)

- [ ] 1.1 RED: a test that runs `build-script-from-draft.mjs` with a `video.series.json` for a fake series and asserts the emitted filename and template names come from the config
- [ ] 1.2 GREEN: add `video.series.json` to iNNteresante; remove the hardcoded template names, music path, filename and avatar model from both tools
- [ ] 1.3 REFACTOR: `rg "innteresante" tools/build-*.mjs` returns nothing outside comments
- [ ] 1.4 Manual: regenerate the `google-maps-hack` script from its reviewed JSON with the extracted config; byte-compare with the committed script (must be identical)

## 2. Phase 2 — Promote the tools to the blueprint

- [ ] 2.1 Move `build-draft-html.mjs`, `build-script-from-draft.mjs`, `thumbnail-v1.mjs` to `S/`; add the `--series` seam
- [ ] 2.2 RED: `T/build-script-from-draft.test.mjs` — a reviewed JSON + a neutral series config emits a valid L3 script (`node scripts/verify.js` parses it; 0 errors)
- [ ] 2.3 RED: `T/build-draft-html.test.mjs` — the emitted HTML is self-contained (base64 thumbs), has the review button, and exports `<slug>_reviewed.json`
- [ ] 2.4 GREEN: wire the config seam per Seam 1; rename the schema to `video-script.draft.v1`
- [ ] 2.5 REFACTOR: document the tools in `SKILL.md`; no iNNteresante-specific prose

## 3. Phase 3 — Docs

- [ ] 3.1 `series_rules.md` (iNNteresante) drops model ids; keeps editorial rules
- [ ] 3.2 `script_template.md` marked deprecated (script is generated)
- [ ] 3.3 Workspace `AGENTS.md` + `cosicah` procedure: fix the obsolete `approve-plan.mjs` note (delegated approval is supported)
- [ ] 3.4 Docs gate via `npm run verify:fast`

## 4. Verification and release

- [ ] 4.1 `node --test` per suite, then `npm run verify:fast`; `npm run check:versions`
- [ ] 4.2 Bump `blueprint_version`; release via `nn-dev-release`
