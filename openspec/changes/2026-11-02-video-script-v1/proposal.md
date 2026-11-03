# Proposal: coNNtent V_0-15-0 (decision-in redesign, formerly `coNNtent`)

## Intent

Rebuild the `coNNtent` bluepriNNt (formerly `coNNtent`) around the decisions a person makes when producing an episode, not around what the engine and providers need. The current design (bluepriNNt V_0-14-1, skill V_0-15-7) was built engine-out. Edits get lost, parameters drift and cost knowledge sits in code, and about 40% of the domaiNN's disk use is duplicates (exploration §1–§2).

Success means:
- An agent proposes the script as a changeset.
- A reviewer approves it in one console view.
- One command, `produce <episode>`, takes the episode to a master with formats, real cost and timings recorded.

## Problem (exploration §2)

| Id | Problem | Example evidence |
|---|---|---|
| P1 | No single record of decisions | `build-script-from-draft.mjs:147-160` drops non-preset console edits; `status::`/`master::` are copied by hand; the console is a 1889-LOC quine |
| P2 | No field registry | Parameters are spread over 6+ places; dead fields (`voice_tone`, `scene_duration`); phantom `scene_tts_model`; unknown keys are accepted silently |
| P3 | Model, provider and cost knowledge lives in code | The allowlist and the price catalog disagree; capabilities are detected by string match; the image cache key ignores `image_model` |
| P4 | The model is richer than real usage | 8 layer types are used; the per-series scene grammar and chrome are not modeled |
| P5 | No lifecycle, versioning or output hygiene | No pinned version; index status is wrong; about 3.6 GB of `public/` and master duplicates |

## Scope

### In scope
- **Slice 0, quick wins**: ships on the V_0-14-x line before the redesign (see below).
- A breaking bump of the bluepriNNt to V_0-15-0. Episodes pin the version.
- The rename of the bluepriNNt to `coNNtent` (folder and catalog id) and of the skill to `nn-conntent`, with no alias or redirect. OpenSpec capability names keep `video-*`.
- Exactly four Layer behaviour types (`avatar`, `media`, `text`, `animation`), with appearance and visual components moved into Presets; `presenter` and the other visual names stop being types.
- Scene kinds, series chrome, the `Libre` escape hatch, and the cascade extended with a kind level.
- A model catalog as kNNowledge, plus per-model intent adapters.
- A field registry generated from the spec Field Definitions.
- An agent draft procedure that emits a proposed changeset. The engine `produce` command takes over from there.
- One script review gate with budget-based auto-approval.
- The episode lifecycle, written by the engine through apply_change.
- Two registered console views: Episode review and Series.
- JSONL facts: the spend ledger keyed by episode and `plan_hash`, and the stage timing log.
- A new folder contract: `episodes/<slug>/`, no `build/`, hardlinks to the cache, one master per episode, series media under `series/<s>/assets/`.
- Porting 3 series in this order: cognitive-use-cases (pilot), villabotijos-today, innteresante.

### Out of scope
- In-place migration, converters or aliases. Old episodes stay an archive.
- The inntrevistas and cosicah folders, including their `public/` folders.
- A post-render cut review (deferred, not precluded).
- Domain-local engine patches and `tools-*.mjs`, beyond absorbing what the pilot needs.
- Rewriting `openspec/changes/archive/**` or any published `_V_x-y-z_` spec file.

## Approach (mapped to settled decisions)

| Decision | Approach |
|---|---|
| D1, D2 | The Series document declares `Scene Kind` elements: role, narration on/off, max duration, variant count, fixed (engine-inserted) scenes. An episode scene states `kind::` plus its content. `kind:: Libre` inherits no kind rules. |
| D1 | A Layer is one of four behaviour types (`avatar`, `media`, `text`, `animation`). Appearance lives in Presets ("Lower third", "Title", "Quote", "Captions", "B-roll"), never in a type name. |
| D3 | Cascade order: bluepriNNt > domaiNN > series > kind > video > scene. Presets expand at the level that declares them. The PR #441 selector is reused. |
| D4 | `script_review:: required \| skip` and `budget::` are cascade fields. Below budget, the run auto-approves; an unset `budget` always asks, and an unset `language` is a validation error. The bluepriNNt ships no `budget` or `language` default. Skipping review never bypasses the budget stop. A needs-change scene is regenerated alone. |
| D5 | The bluepriNNt ships a dated Provider, Model and Voice catalog. The domaiNN allowlists models and overrides prices. The guard, the estimator, picklists and adapters read the merged catalog. |
| D6 | The agent does creative work only. `produce` sequences chrome, cascade, estimate, TTS/avatar/image, render, formats, timings and status/master. |
| D8 | The HyperFrames project lives in the episode folder and links to cache assets by hardlink. `stageAsset` copies are removed. Series media live in `series/<s>/assets/` and episodes only under `series/<s>/episodes/`. |
| D9, D13 | The lifecycle runs `idea > draft > approved > produced > published > archived`. The series index becomes a computed view. |
| D10 | The views are registered via `registerView` and exported with `export-console.mjs --view`. The quine is deleted. |
| D11 | Facts stay JSONL. Prices are part of the hash input. Each run records a machine fingerprint. |
| D12 | `language` is a cascade field. Chrome texts are declared per language on the Series. |

## Capabilities

### New capabilities
- `video-scene-kinds`: kind elements, fixed scenes, `Libre`, chrome application per kind.
- `video-model-catalog`: catalog concepts, domaiNN allowlist and price override, intent adapters.
- `video-field-registry`: the generated registry, unknown-key rejection, `--check` gate.
- `video-produce-command`: the single deterministic pipeline and its stop points.
- `video-script-review`: the review gate, verdicts, budget auto-approval, regeneration of one scene.
- `video-episode-lifecycle`: states, who sets each one, and the computed series index.
- `video-run-facts`: ledger and timing log schemas.
- `video-console-views`: the Episode review and Series views.

### Modified capabilities
- `video-script-model`: the kind level in the cascade; `language`, `budget`, `output_formats`, `script_review`; dead and phantom fields removed; master size taken from the field.
- `video-blueprint`: V_0-15-0; the single-option `master_resolution` requirements are removed.
- `video-presets`: kind-level presets.
- `cognnitive-video-engine`: catalog-driven guard and estimator, the image cache key, hardlinked staging, the `build/` and CLI-flag requirements, a hermetic GSAP.
- `video-script-skill`: draft procedure and changeset. The requirements for the quine draft tools, the in-chat phrase approval and the manual workflow sequence are removed.
- `video-folder-contract`: `episodes/<slug>/`, no `build/`, one master.
- `video-production-hierarchy`, `video-series-folders`: the Series declares kinds and chrome.
- `video-publication-description`: the description is produced by the agent, and `produce` replaces finalize.
- `video-template`: the draft production procedure.
- `changeset-document-model`: only if variants need support there (open question Q2).

`console-view-registry` is consumed unchanged unless design finds a size-budget conflict.

## Quick wins: Slice 0 (independent, V_0-14-x)

1. The image cache key uses the cascade `image_model` and drops the display `title` (`lib/image-options.mjs`). Covered by a test.
2. The non-preset console controls in `draft-template.html` are removed.
3. Enforce the living requirement "Render Refuses Missing Avatar Clips" (`lib/avatar-jobs.mjs:164-181`).
4. Warn on allowed models that have no price. `infinitetalk` stays an allowed, active avatar model with no warning (decision 8).
5. Fix `render-formats.mjs --fill crop`.

## Affected areas

| Area | Impact |
|---|---|
| `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md` (+ catalog, defaults) | Modified: V_0-15-0 |
| `.../skills/nn-conntent/scripts/` (`scene-compiler`, `lib/knowledge-model`, `lib/presets`, `asset-cost-estimator`, `video-engine-cli`, `build-script-from-draft`, `render-formats`) | Modified or rewritten |
| `.../scripts/draft-template.html` | Removed |
| `.../skills/nn-conntent/SKILL.md`, `references/`, `test/` | Modified |
| Console views (`registerView`), `scripts/export-console.mjs` | New views |
| domaiNN `video_NN/series/*` (3 active series) | Ported by hand during rollout |

## Rollout

1. Slice 0 ships first.
2. V_0-15-0 spec and contract, then the engine and `produce`, then the console views.
3. Pilot: cognitive-use-cases. Cleanup of active-series duplicates happens here, deleting only files whose bytes already exist in the cache.
4. Port villabotijos-today, then innteresante.
5. inntrevistas and cosicah are left untouched.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| HyperFrames does not render through hardlinks (or links break across volumes) | Med | Spike first; the fallback is defined in design |
| nn-core changesets cannot carry variants or per-scene verdicts | Med | Check `changeset-document-model` early; a sidecar is the fallback |
| The console bundle exceeds the `console-view-registry` size budget | Med | Measure during the views slice; split the views if needed |
| Breaking V_0-15-0 strands old episodes | High (intended) | No compat code; old episodes stay archives under their pinned version |
| Quick win 1 re-bills images | High (once) | Accepted; documented in the release note |
| Scope exceeds the 400-line budget | High | Chained slices (ask-on-risk) |

## Rollback plan

Slice 0 and the V_0-15-0 slices are separate commits on `dev`. Reverting them restores V_0-14-1. Ported series keep their pre-port files until the pilot is accepted, and the duplicate cleanup only deletes bytes that are still present in the cache.

## Success criteria

- [ ] The pilot episode goes from `idea` to `produced` with the agent writing only the changeset and one `produce` run.
- [ ] Every console edit reaches the master; no field is dropped silently.
- [ ] One catalog drives the guard, the estimator and the picklists; an unpriced or unknown model fails loudly.
- [ ] Unknown or retired keys are rejected; the registry `--check` passes.
- [ ] The pilot series has no hash-named staging copies and one master per episode.
- [ ] The Series view shows real cost and stage timings from the JSONL facts.
- [ ] `node scripts/verify.js` passes.

## Open questions (for design)

- Q1: Which fallback applies if hardlinks fail: symlinks, copy-on-render with cleanup, or a cache-served path?
- Q2: How are variants and per-scene verdicts represented in a proposed changeset?
- Q3: Do kinds live inside the Series document or in a sibling kNNowledge file?
- Q4: How is the catalog price date reported when it is stale?
- Q5: Does the 1024² image size become a field?
- Q6: How is GSAP vendored to make render hermetic?
- Q7: Is `infinitetalk` blocked? Resolved: it stays an active, allowed avatar model with no warning (decision 8).

All open questions above are settled by the maintainer decisions table in `tasks.md`, which overrides this document wherever they disagree.

## Proposal question round

Not asked (automatic mode). Assumptions for review:
1. Slice 0 ships on V_0-14-x and is not folded into V_0-15-0.
2. The console view bundle may grow, within the registry budget.
3. Ported series are rewritten by hand; there is no tool.
