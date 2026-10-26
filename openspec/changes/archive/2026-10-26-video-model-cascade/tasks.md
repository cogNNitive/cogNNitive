# Tasks: Model Selection Cascade

Strict TDD: every GREEN task is preceded by a RED task. Skill suite root:
`iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/` (`S` = `scripts/`, `T` = `test/`).
Independent of the renderer change; can land in parallel.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (hand-written) | ~500-650 (S ~250-350; T ~200; spec ~120; docs ~30) |
| Estimated changed lines (generated, counted separately) | none |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
400-line budget risk: Medium

## 1. Video-level template

- [ ] 1.1 RED: `T/knowledge-model.test.mjs` — a `Video` element declaring `template::` resolves that Template instance; absent, it resolves to null
- [ ] 1.2 GREEN: `video-script/spec_NN.md` Field Definition for `Video.template` (reference → Template); `S/lib/knowledge-model.mjs` exposes it on the lowered video
- [ ] 1.3 RED: a Scene with a `template::` wins over the Video's

## 2. Resolver

- [ ] 2.1 RED: `T/model-cascade.test.mjs` — full precedence table for `tts`, `image`, `avatar`: `cli > layer > scene > video > series > workspace > blueprint`; each case asserts `{id, source}`
- [ ] 2.2 GREEN: `S/lib/model-cascade.mjs` per Seam 1; export `resolveModel`
- [ ] 2.3 RED+GREEN: the estimator and `video-engine-cli.mjs` obtain `image/tts/avatar` ids ONLY via `resolveModel`; `rg "DEFAULT_MODELS" S/` only appears inside the resolver

## 3. Guard is gate-only

- [ ] 3.1 RED: with `allowedModels` excluding a resolved id, `compile` refuses before spend; with the id allowed, it proceeds; the guard never returns an id
- [ ] 3.2 GREEN: remove any id-selection from `S/lib/video-guard.mjs`; add the optional `defaults` block read by the `workspace` scope
- [ ] 3.3 RED: `video-guard.json.defaults.tts` is used when no more specific scope sets tts

## 4. CLI override is auditable

- [ ] 4.1 RED: `--avatar-model X` resolves to `{id: X, source: 'cli'}` and is echoed in the plan; `plan_hash` changes vs the same run without the flag
- [ ] 4.2 GREEN: inject the `cli` scope; echo the resolved models + sources in the estimator/compile plan output

## 5. Verification

- [ ] 5.1 `node --test` per suite, then `npm run verify:fast`; `npm run check:versions`
- [ ] 5.2 Bump `blueprint_version`; release via `nn-dev-release`
