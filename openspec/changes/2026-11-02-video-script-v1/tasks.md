# Tasks: coNNtent V_0-15-0 (decision-in redesign)

Skill root `S` = `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent`. Tests live in `S/test` (`node --test`). Strict TDD: every slice lists RED (failing test) before GREEN (code) before REFACTOR. Chain strategy is `feature-branch-chain`: tracker branch `feature/conntent-v1` cut from `origin/dev`; PR D targets the tracker, every later slice PR targets the previous slice's branch; only the tracker merges into `dev`, and only on the maintainer's word. After Slice R, `S` moves to `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | about 5,500 total (see per-slice estimates); generated bundles and the `spec_NN.md` text excluded from review weight |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | D, 0a, 0b, 1, R, 2a, 2b, 3a, 3b, 4, 5, 6, 7a, 7b, 8, 9, 10 (Slice 11 is external) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain (tracker `feature/conntent-v1`) |

Decision needed before apply: No (all resolved 2026-11-02, see below)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High (Slices R and 2a carry `size:exception`: mechanical rename / spec text)

### Suggested Work Units

| Unit | Goal | Est. lines | Likely PR | Notes |
|------|------|-----------|-----------|-------|
| 0a | QW1 image cache key, QW5 `--fill crop`, QW3 avatar render refusal | 150 | PR 0a | Independent; V_0-14-x. Base: main or tracker |
| 0b | QW2 remove non-preset console controls, QW4 unpriced warning | 120 | PR 0b | Independent of 0a |
| 1 | Mirror target `coNNtent` | 300 | PR 1 | Needs 0a/0b merged; generated bundle excluded |
| 2a | `spec_NN.md` V_0-15-0 text | 600 | PR 2a | Docs-only, likely `size:exception` |
| 2b | Field registry generator, validator, consumers | 450 | PR 2b | Depends on 2a |
| 3a | Catalog doc, `catalog.mjs`, adapters | 450 | PR 3a | Depends on 2b |
| 3b | Estimator rewrite, `plan_hash`, ledger v2, delete guard JSON | 400 | PR 3b | Depends on 3a |
| 4 | Series kinds/chrome, `cascade.mjs`, language | 450 | PR 4 | Depends on 2b; parallel with 3a/3b in theory, single writer in practice |
| 5 | `stage-assets`, episode-folder project, GSAP vendor, `image_size`, spike | 500 | PR 5 | Depends on 3b, 4 |
| 6 | Timings log, fingerprint | 200 | PR 6 | Depends on 5 |
| 7a | `produce` state machine core, exit codes, engine changesets | 450 | PR 7a | Depends on 3b-6 |
| 7b | Delete old CLIs and drift tests, resume tests | 350 | PR 7b | Depends on 7a |
| 8 | Exporter `.data.mjs` hook, Episode review view | 500 | PR 8 | Depends on 7b |
| 9 | Series view | 350 | PR 9 | Depends on 8 |
| 10 | Draft procedure, SKILL.md, references | 350 | PR 10 | Depends on 7b; may run beside 8/9 |
| 11 | Pilot port, external | n/a | none | Maintainer-run, outside repo |

Each PR states start, end, prior dependency, follow-up and out-of-scope in its Chain Context, with a diagram marking the current PR. Rollback boundary for every slice: revert that PR alone; later slices are not merged until the earlier ones are verified.

## Maintainer decisions (resolved 2026-11-02)

These override proposal, specs and design wherever they disagree. Slice D writes them into those artifacts.

| # | Decision | Resolution | Blocks |
|---|----------|------------|--------|
| 1 | Layer types | Exactly four behaviour types: `avatar` (lip-synced, paid job), `media` (image/video; `placement:: full \| inset`, `timing:: scene \| slot`), `text` (overlay text; `style::` selects the visual component: title, lower-third, caption, watermark, quote; `source:: narration` takes the scene narration), `animation` (authored HyperFrames sub-composition). Appearance lives in Presets ("Lower third", "Title", "Quote", "Captions", "B-roll"…). `presenter`, `background`, `b-roll`, `title`, `lower-third`, `caption`, `brand`, `quote`, `watermark` stop being types. | D, 2a, 3a, 4, 5 |
| 1b | Avatar naming | `avatar` everywhere: `type:: avatar`, internal manifest kind `avatar`, fields `avatar*`. Delete `presenter`, `talking_avatar`, `talking-avatar` with no alias. | D, 2a, 5 |
| 2 | `for:: narration` | Reserved name meaning the scene body (narration stays prose, not a field). | D, 2a, 8 |
| 3 | Defaults | The bluepriNNt ships NO `budget` and NO `language` default. Unset budget = always ask; unset language = validation error. The maintainer's domaiNN sets `language:: es` and `budget:: 1.5` (USD, single currency per domaiNN) per episode. | D, 2a, 4 |
| 4 | Series media folder | `series/<s>/assets/` holds series-level media (bumper, logo, music, avatar images, sounds, frames). The engine discovers episodes ONLY under `series/<s>/episodes/`; legacy episode folders left in `assets/` are ignored (the maintainer reorganises them by hand). | D, 2a, 4 |
| 5 | Episode document name | `<slug>_coNNtent_<s>_NN.md` (keeps the domaiNN-unique stem rule of `video-folder-contract`; `<slug>_NN.md` is rejected). | D, 2a, 7a |
| 6 | Facts in git | `.cognnitive/video/` facts are gitignored, one log per machine; every row carries the machine fingerprint so logs from several machines can be compared if merged by hand. | D, 3b, 6, 9 |
| 7 | Chapters | `produce` writes chapters into `description.md` between `<!-- chapters:start -->` and `<!-- chapters:end -->`, never touching the rest. | D, 10 |
| 8 | `infinitetalk` | Allowed. It stays in the reference catalog as an active avatar model; no warning. | D, 0b, 3a |
| 9 | bluepriNNt rename | `coNNtent` becomes `coNNtent` (display and id, NN casing as in `domaiNN`): folder `iNNfo/specs/bluepriNNts/coNNtent/`, catalog id `coNNtent`. Skill `nn-conntent` becomes `nn-conntent` (skills are lowercase, NN words keep the double n, as `nn-innfo`). OpenSpec capability names keep `video-*`. No aliases or redirects. | D, R |

Design open items accepted as designed: A12 generic `.data.mjs` hook; A4 the agent's draft is applied into the model under `status:: draft`; A6 video-level beats kind-level in the cascade; A10 bundle size measured in Slice 1; `daily_budget` limited to domaiNN and bluepriNNt levels.

## Slice D: Align OpenSpec artifacts with the resolved decisions (docs-only)

- [x] D.1 Update `proposal.md`, `design.md` and `specs/*/spec.md` of this change to decisions 1–9 (layer type set, avatar naming, defaults, folders, names, rename). Keep capability names `video-*`.
- [x] D.2 Update this file's slice tasks that still name old types, paths or the old blueprint id.
- [x] Verify: no remaining `presenter`, `talking_avatar`, `brand`, `quote` (as a type), `<slug>_NN.md`, `budget=0`, `language=en` default in the change folder (`rg`), except in `REMOVED` requirement blocks and explicit retired-name enumerations.

## Slice R: Rename the bluepriNNt to coNNtent (after Slice 1, before 2a; `size:exception`, mechanical)

- [x] R.1 RED: tests/guards that expect `coNNtent` in `iNNfo/specs/bluepriNNts/catalog.json`, `docs/innfo/blueprints/catalog.json`, the publish-web skill allowlist and the core-mirror target name.
- [x] R.2 GREEN: `git mv` the bluepriNNt folder to `coNNtent/` and the skill to `skills/nn-conntent`; update catalog entries, `parent_spec` URLs, SKILL.md name/triggers, `scripts/` references, the `build-core-mirrors.mjs` target and its `scripts/core-mirrors/` entry, docs, tests, `.atl` registry source if tracked. No alias, no redirect.
- [x] R.3 Regenerate every derived artifact (`npm run regen`) and commit the results.
- [x] Verify: `node scripts/verify.js`; `rg -i "video-script|nn-video-script"` returns only OpenSpec history, archived changes, frozen fixtures and REMOVED blocks.

## Slice 0a: Quick wins on the engine (V_0-14-x)

- [x] 0a.1 RED: test in `S/test` that the image cache key changes with cascade `image_model` and ignores display `title` (`lib/image-options.mjs`).
- [x] 0a.2 GREEN: fix the key in `S/scripts/lib/image-options.mjs`; note the one-time re-bill in the release note.
- [x] 0a.3 RED then GREEN: `render-formats.mjs --fill crop` produces a cropped output (test on a fixture clip).
- [x] 0a.4 RED then GREEN: render refuses missing avatar clips (`lib/avatar-jobs.mjs:164-181`), per "Render Refuses Missing Avatar Clips".
- [x] Verify: `node --test S/test` and `node scripts/verify.js`.

## Slice 0b: Quick wins on console and guard

- [x] 0b.1 RED: test that `draft-template.html` exposes only preset controls.
- [x] 0b.2 GREEN: remove non-preset controls from `S/scripts/draft-template.html`.
- [x] 0b.3 RED then GREEN: allowed model without price emits a warning in `asset-cost-estimator.mjs`. `infinitetalk` stays allowed (decision 8).
- [x] Verify: as 0a.

## Slice 1: Core mirror target

- [x] 1.1 RED: `build-core-mirrors.mjs --check` test expects target `coNNtent` and `lib/nn-core.generated.cjs` exports (scope fold, `parseKnowledge`, `parseChangeset`, `serializeChangeset`, `computeProposalSha`, `executeChangesetApply`, `writeProposedChangeset`).
- [x] 1.2 GREEN: create `scripts/core-mirrors/coNNtent.ts`; edit `scripts/build-core-mirrors.mjs` (replaces `scope` target); regenerate.
- [x] 1.3 Replace `S/scripts/lib/knowledge-model.mjs` imports; its tests stay green.
- [x] 1.4 Measure bundle size and record it (design A10).
- [x] Verify: `node scripts/build-core-mirrors.mjs --check`, `node scripts/verify.js`.

## Slice 2a: Spec V_0-15-0 text

- [x] 2a.1 Apply decisions 1-9, then edit `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md`: Scene Kind, Chrome, Variant, new and removed fields, `blueprint_version: V_0-15-0`. Never edit a published `_V_x-y-z_` file.
- [x] 2a.2 Bump `blueprint_version` (V_0-15-0); the editor's shipped-template registry lives in cogNNitive-web and is a Slice 10 follow-up; `manifest/source.yaml` has no coNNtent entry, so its `version:` axis does not apply.
- [x] 2a.3 Sync `openspec/specs/` deltas only at archive time, not here.
- [x] Verify: `node scripts/verify.js`, `check:spec-urls`.

## Slice 2b: Field registry

- [x] 2b.1 RED: tests for `build-field-registry.mjs` generation, `--check` freshness, unknown and retired key rejection, field-to-consumer contract (`lib/field-consumers.mjs`).
- [x] 2b.2 GREEN: create `S/scripts/build-field-registry.mjs`, `lib/field-registry.generated.json`, `lib/field-consumers.mjs`.
- [x] 2b.3 Delete `conditional-fields-drift`, `preset-parameters-drift` tests; remove `PRESET_PARAMETERS`, `DEFAULT_CONDITIONAL_FIELDS`.
- [x] 2b.4 Add `--check` step to `scripts/verify.js`.
- [x] Verify: registry `--check`, `node --test S/test`, `node scripts/verify.js`.

## Slice 3a: Model catalog and adapters

- [x] 3a.1 RED: tests for catalog merge (overlay wins per slug), allowlist, unknown model failure, adapter `controls` equal catalog `controls`, adapter `translate`.
- [x] 3a.2 GREEN: create `.../coNNtent/catalog/model-catalog_coNNtent_NN.md`, `S/scripts/lib/catalog.mjs`, `S/scripts/adapters/*.mjs`.
- [x] Verify: `node --test S/test`.

## Slice 3b: Estimator, plan hash, ledger v2

- [x] 3b.1 RED: golden `plan_hash` (changes with price), stale-price warning, unpriced-allowed blocks, ledger v2 row schema, real cost per episode.
- [x] 3b.2 GREEN: `lib/plan.mjs`, `lib/facts.mjs`; rewrite estimator on the catalog; delete `PROVIDER_PRICING_CATALOG`. Apply decision 6. (`video-guard.json` deletion moves to 7a with the guard rewrite.)
- [x] Verify: `node --test S/test`, `node scripts/verify.js`.

## Slice 4: Series kinds, chrome, cascade

- [x] 4.1 RED: cascade order blueprint, domain, series, kind, video, scene; kind presets; fixed scenes; `Libre`; chrome per language; kind rule enforcement.
- [x] 4.2 GREEN: `lib/cascade.mjs`, `lib/kinds.mjs`; delete the `cli` level; delete `lib/video-scope.mjs`. Apply decisions 3, 4 and A6.
- [x] Verify: `node --test S/test`.

## Slice 5: Staging and project layout

- [x] 5.1 RED: `linkOrCopy` with injected `EXDEV`, `nlink >= 2`, no write-open of staged assets, no `build/`, master named `<slug>_<W>x<H>.mp4`, `image_size` in cache key and catalog `sizes`, missing GSAP fails loudly.
- [x] 5.2 GREEN: `lib/stage-assets.mjs`; modify `scene-project.mjs`, `hyperframes-render.mjs`, `cache-manager.mjs` (read-only cache files), `ensure-hyperframes.mjs`; pin `gsap` exactly.
- [x] 5.3 Manual spike: render the pilot in link and forced-copy modes; masters must be byte-identical. Record in apply-progress.
- [x] Verify: `node --test S/test`.

## Slice 6: Timings

- [x] 6.1 RED: timing row schema, fingerprint (first 12 hex of sha256 of `machine` without `fp`), write failure does not stop a run.
- [x] 6.2 GREEN: timings in `lib/facts.mjs`, stage hooks in `lib/compile.mjs`, `lib/render.mjs`.

## Slice 7a: `produce` core

- [x] 7a.1 RED: integration tests on a tmp domaiNN with injected synthesizer and `hyperframesRun`: every transition, exit codes 0/10/11/1, intake dry-apply, skip never bypasses budget, resume, refusal of non-V_0-15-0 episodes.
- [x] 7a.2 GREEN: `S/scripts/produce.mjs`, `lib/episode.mjs`, `lib/changes.mjs` (engine changesets via `writeProposedChangeset` and `executeChangesetApply`). Apply decision 5.

## Slice 7b: Remove old pipeline

- [x] 7b.1 Delete `video-engine-cli`, `build-script-from-draft`, `build-draft-html`, `draft-template.html`, `finalize-video`, `approve-plan`, `lib/legacy-draft-keys.mjs` and their tests.
- [x] 7b.2 Delete standalone CLIs of `synthesize-avatar.mjs` and `tts-generator.mjs` unless a test needs them.
- [x] Verify: `node --test S/test`, `node scripts/verify.js`.

## Slice 8: Exporter hook and Episode review view

- [x] 8.1 RED (jsdom pragma): view mounts via `registerView`, emits `update_field` and `comment`, reads `ctx.viewData`, export under 5 MB; exporter test for `.data.mjs` `collect`.
- [x] 8.2 GREEN: `scripts/export-console.mjs` hook; `.../assets/console-view-episode-review.js` and `.data.mjs`. Needs A12 confirmed.

## Slice 9: Series view

- [x] 9.1 RED (jsdom): cost and timings from JSONL, stale-price warning, computed index.
- [x] 9.2 GREEN: `console-view-series.js` and `.data.mjs`.

## Slice 10: Draft procedure and docs

- [x] 10.1 Draft procedure under `.../coNNtent/procedures/` emitting a sealed changeset P; apply decision 7.
- [x] 10.2 Update `S/SKILL.md`, `references/{folder-contract,parameters,cost-guardrails}.md`; add `prune-duplicates.mjs --dry-run` with a test that only cache-identical bytes qualify.

## Slice 11: Pilot port (manual, maintainer-run, outside the repo)

Target: `D:\Users\lucas\Documents\_NN\video_NN`.

- [ ] 11.0 DomaiNN setup: declare `language:: es` and `budget:: 1.5` (USD) at domaiNN level; add the domaiNN catalog overlay (allowed models, invoice prices; `infinitetalk` allowed); delete the line in the domaiNN `AGENTS.md` that calls `infinitetalk` blocked; delete `video-guard.json` once the overlay replaces it.
- [ ] 11.1 Port cognitive-use-cases by hand (Series with kinds and chrome, Episode docs). Run `produce` from `idea` to `produced`; check success criteria.
- [ ] 11.2 Run `prune-duplicates.mjs --dry-run`, review the list, then delete only files whose exact bytes exist in `.cognnitive/cache`.
- [ ] 11.3 Never touch inntrevistas or cosicah `public/`.
- [ ] 11.4 After pilot acceptance, port villabotijos-today, then innteresante.
- [ ] 11.5 Keep pre-port files until the pilot is accepted (rollback).
