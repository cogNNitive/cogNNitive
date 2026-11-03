# Exploration: coNNtent V_0-15-0 (from-scratch redesign)

Date: 2026-11-02. Status: exploration complete, decisions settled with the maintainer in a grill session.
Persona/language contract: all artifacts in English; neutral technical tone.

Inputs:
- OpenSpec-external OpenCode session "Rediseños de la consola de video" (112 messages, run in the user domaiNN).
- Static audit of `iNNfo/specs/bluepriNNts/coNNtent` (blueprint V_0-14-1, skill V_0-15-7, ~9.1k LOC engine, 57 test files).
- Survey of the real domaiNN `D:\Users\lucas\Documents\_NN\video_NN\series` (5 series, ~55 episode folders, ~8.95 GB, 4 eras).

## 1. Diagnosis

The blueprint was built engine-out (from what HyperFrames, TTS and avatar providers need) instead of
decision-in (from what a person decides when making an episode). Every finding below follows from that.

## 2. Findings

### P1. No single record of decisions
- One episode's decisions are spread over `draft.json`, `reviewed.json`, the review-console quine,
  the L3 script, `build/manifest.json` and the HyperFrames project.
- Edits are lost between them:
  - `build-script-from-draft.mjs:147-160` reads only `presets` from console overrides. `voice_speed`,
    `background_audio_volume`, `transition` and `fps` edits are silently dropped.
  - `reviewed.json` overlays are ignored.
  - `kind:fixed` scenes are filtered out of the export.
- Users hand-edit narration mid-chain (pepper-mapache: 5/5 scenes differ between draft and reviewed).
- No skill script produces `draft.json`. Each series invents its own schema (`innteresante.draft.v1`, …).
- `status::` and `master::` are copied by hand from finalize's printed output.
- The review console is still the standalone `draft-template.html` quine (1889 LOC). This includes the
  newest domain episode, `consulting-sales/review_console.html` (2026-11-02). It was never ported to a
  domaiNN-console view, although the mechanism exists:
  - `registerView`, blueprint and custom views, and a shared ctx (draft store, changeset, `ctx.ui.Ku`),
    per `openspec/specs/console-view-registry/spec.md`;
  - single-view export via `scripts/export-console.mjs --view`.

### P2. No field registry
- Parameters live in 6+ places: `spec_NN.md`, `video-defaults_NN.md`, series `series_rules.md` prose,
  `video-guard.json`, scope documents, the draft `config[]` and `script_template.md`.
- Dead fields:
  - `voice_tone` is "deliberately not read" (`scene-compiler.mjs:434`).
  - `scene_duration` is never read.
- Phantom field: `scene_tts_model` appears in templates but does not exist.
- Unknown keys are accepted silently.
- Inconsistent scopes:
  - `avatar_model` is valid at every scope, but `avatar_resolution` only on Layer.
  - `fit` is allowed on captions and titles.
  - `master_resolution` is a one-value enum, and the master name `_1920x1920.mp4` is hard-coded
    (`video-engine-cli.mjs:770`).
- `fps` is a CLI flag with a default duplicated in two files. It is not a field.
- Hidden fields that live in prose: `hook_variants=5`, `max_internal_jokes=1`, `voice_by_scene_kind`,
  `duration_target`, `approval_margin=1.25`, `max_scene_duration`.
- `DEFAULT_CONDITIONAL_FIELDS` (`scene-compiler.mjs:93`) and `PRESET_PARAMETERS` (`lib/presets.mjs:25`) are
  hand-copied from the spec and held together by drift tests.

### P3. Model, provider and cost knowledge lives in code
- Three sources disagree: the guard allowlist (14 ids), the price catalog `PROVIDER_PRICING_CATALOG`
  in `asset-cost-estimator.mjs` (18 entries, hand-edited, undated) and the spec defaults.
  - 6 allowed models have no price and fall back silently to a conservative rate.
  - 10 priced models cannot be called.
  - `wavespeed/` vs `wavespeed-ai/` ids are never reconciled.
  - `infinitetalk` is "blocked" in the domain AGENTS.md but allowed in `video-guard.json`.
- Capabilities are detected by string match: `avatar-jobs.mjs:34` `if (m.includes('pruna'))`.
- Intent fields are passed straight to vendor APIs: `speed` and `emotion` go raw to MiniMax
  (`asset-synthesizer.mjs:446-448`).
- BUG: the image cache key ignores the cascade `image_model` and does include the scene display title
  (`lib/image-options.mjs:23-31`). Changing the model reuses a stale image, and renaming a scene re-bills.
  Image size is fixed at 1024² (`asset-synthesizer.mjs:642`).
- Budget is not a field:
  - `budgetPerRunUsd` is per process.
  - The ledger (`video-ledger.jsonl`: ts, kind, model, ref, estUsd, cacheHit, outcome) has no episode key.
  - `plan_hash` excludes prices.
  - A typed approval phrase is demanded even when the cost is under the series budget.

### P4. The model is far richer than real usage
- Real data: 108 scenes and 313 layers.
  - Only 8 layer types are used: lower-third 79, watermark 64, background 56, presenter 50, title 27,
    b-roll 22, caption 10, animation 5.
  - 20% of layers are the same watermark string, repeated per scene. It stays Spanish in English episodes.
- Never used: `prompt`, `z_index`, `components`, `frame`, Presets (introduced very recently),
  per-scene voice and image fields, the domain `video-defaults_NN.md`.
- What is really used is a fixed per-series scene grammar, plus series "chrome" (watermark, bumper,
  music, avatar). Neither is modeled. Examples:
  - villabotijos and innteresante: Gancho > Intro bumper > Noticia > Cierre;
  - cognitive-use-cases: Hook > Reality and Pain > Pipeline > Deliverable and ROI > Wrap-up.
- Visual direction lives outside the model:
  - `tools-*.mjs` in episode folders;
  - separate HyperFrames animation projects;
  - per-series review-console builders forked from each other.

### P5. No lifecycle, versioning or output hygiene
- Episodes pin no blueprint version.
- Series index `status` disagrees with reality: inntrevistas marks 12 episodes `scripting`, though some
  are rendered.
- 11 of 14 inntrevistas episodes were never rendered, and nothing tracks that.
- About 3.6 GB (~40%) is duplicates:
  - `public/` holds hash-named copies of cache entries, made by `stageAsset` (`video-engine-cli.mjs:265`),
    which copies the provider cache into the render project.
  - `master.mp4` is stored twice, and the root `renders/` duplicates series renders.
  - teoria-subjetiva-del-valor has six render variants (503 MB).
- Engine patches live locally in the domaiNN.
- Churn: 110 commits in about 3.5 weeks, 53 of them on `spec_NN.md`.

### Engine boundary
Inside the engine, but should be data or shared:
- the allowlist, prices, capability detection and default model ids;
- the hand-copied conditional fields and preset parameter lists;
- its own markdown reader (`lib/knowledge-model.mjs`), which should use the nn-core parser;
- the standalone console template;
- the ALTA/MEDIA/RÁPIDA tier labels and ease names baked into the UI;
- GSAP loaded from a CDN at render time (`scene-project.mjs:128,211`; not hermetic).

Outside the engine, but should be inside:
- the draft producer (today ad-hoc agent work, no schema);
- applying series chrome;
- ordering the compile → avatar → compile passes;
- auto-approval under budget;
- writing `status::` / `master::`;
- per-episode `tools-*.mjs`, per-series console builders and local engine patches;
- the manual ffmpeg crop (a `render-formats.mjs --fill crop` bug).

### Worth keeping
- Model → manifest → emitted project, with the build fully regenerable.
- The nn-core cascade fold, with Presets as scope nodes.
- Fail-before-spend.
- The content-addressed provider cache `.cognnitive/cache/video/{tts,images,temp}` (SHA-256 of content
  plus options).
- `plan_hash` approval, the ledger and the pending-prediction journal (`--resume`).
- Atomic render to the master; a pinned HyperFrames renderer with no silent fallback.
- Loud rejection of retired keys.
- Generated docs with a `--check` freshness gate (`parameters.md`).

## 3. Settled decisions (grill, 2026-11-02)

D1. **Factory-first.** About 80% of use is a fixed series format with many short episodes and fast
review. Bespoke work must stay possible through an escape hatch: a scene with `kind:: Libre` that
inherits no kind rules and allows hand-authored layers or its own animation project.

D2. **Series declares scene kinds.** Each kind is an element of the Series document with its role and
rules: narration on/off, max duration, number of variants, and fixed scenes (bumper) that the engine
inserts without the episode writing them. An episode scene states `kind::` plus its content (narration,
optional asset). The structure is orientative: an episode may reorder, remove or repeat scenes. Keep the
UI simple.

D3. **Presets kept, with a sharper meaning.** A kind says what a scene IS (structure); a Preset says how it
looks or sounds (a named bundle of values). A kind carries default presets, and the episode or a scene
adds or overrides presets (reuse the ordered preset selector of PR #441). The cascade is
blueprint > domain > series > kind > video > scene, with presets expanded at the level that declares them.

D4. **One review gate: the script, before spend.**
- The reviewer picks among variants, edits narration, marks each scene approved or needs-change with a
  comment, and sees estimated cost against budget.
- Below budget the run auto-approves; above it, it asks.
- `script_review:: required | skip` is a cascade field.
- Skip never bypasses the budget stop.
- A needs-change scene goes back to the agent and only that scene is regenerated.
- A post-render cut review is deferred, not precluded; per-scene caching keeps it cheap later.

D5. **Model catalog as kNNowledge.** The blueprint ships a dated reference catalog: Provider, Model
(capability tts|image|avatar|video, declared controls, reference price with date) and Voice. The domaiNN
declares which models are allowed, adds its own, and overrides prices with invoice prices. The guard,
the estimator, console picklists and per-model adapters all read the merged catalog. Intent fields
(`voice_speed`, `voice_emotion`) are translated by per-model adapters based on the declared controls.

D6. **The agent writes, the engine executes.**
- The agent, through a blueprint procedure, does only creative work: narration and variants, scene kind
  choice, visual asset selection, image prompts, the YouTube description. It delivers this as a
  proposed changeset.
- The engine does everything deterministic through one command, `produce <episode>`: series structure
  and chrome, cascade, estimate and approval, TTS/avatar/image in the right order, render, formats,
  timing log, and writing status/master.
- `produce` stops only at the script review (unless skipped) or when over budget.
- The agent never sequences engine steps.

D7. **Series to port.** Port villabotijos-today, innteresante and cognitive-use-cases (the pilot).
inntrevistas and cosicah (Anydeo era) stay a read-only archive; their `public/` folders are NOT touched.
There is no in-place migration: old episodes stay an archive.

D8. **Folder contract.**
- Episodes live under `series/<s>/episodes/<slug>/`, not `assets/`. This was never recorded anywhere before.
- One master per episode; old renders are not kept.
- No separate `build/` directory. The HyperFrames project is kept inside the episode folder, and its
  assets are hardlinks to the provider cache rather than copies. Verify that HyperFrames renders through
  hardlinks; define a fallback if not.
- Hash-named staging copies of cache entries are removed by design.
- Cleanup of existing duplicates in active series happens with the pilot, deleting only files whose
  exact bytes exist in the cache.

D9. **Episode lifecycle.**

| State | Set by | When |
|---|---|---|
| `idea` | agent or user | title, series and linked Sources only (nn-sources sidecars); the backlog lives in the model |
| `draft` | engine | the agent proposed the script |
| `approved` | engine | review done or skipped |
| `produced` | engine | master and formats written |
| `published` | user | with the publication URL as a field |
| `archived` | user | the episode is discarded |

The series index becomes a computed view, not a hand-kept document.

D10. **Console.** The review console is a single-view customization of the domaiNN console: a registered
view, exportable with `export-console.mjs --view`. It is NOT a standalone quine. The draft is a proposed
changeset reviewed in that view. v1 ships two views in the same block:
- (a) Episode review;
- (b) Series view: episodes by state, real cost from the ledger, stage timings and machine comparison.

D11. **Facts stay JSONL** (dogfood without forcing it):
- the spend ledger, keyed by episode and `plan_hash`, with prices inside the hash;
- a stage timing log, with episode, stage, plan_hash, start/end/duration, a machine fingerprint
  (CPU, GPU, RAM, HyperFrames version), render frames, effective fps, resolution and cache hits;
  provider calls record queue time separately from processing time.

Console views read them. The maintainer's goal is to compare runs and decide whether better hardware is
needed.

D12. **Language** is a cascade field: the series sets it and an episode may override it. It drives the
voice, chrome texts, narration rules and description. Chrome texts are declared per language on the
Series only when needed.

D13. **Dogfooding principle.** Use cogNNitive formats wherever they fit naturally:
- the episode, series, scene kinds and model catalog are kNNowledge documents under the blueprint;
- the field registry is generated from the spec Field Definitions (the `parameters.md` pattern);
- draft production is a blueprint procedure;
- the draft is a proposed changeset;
- status and master are written through apply_change;
- Sources are used for episode inputs.

Do not force it: append-only facts stay JSONL.

## 4. Defaults accepted at grill close
- The blueprint name stays `coNNtent`, bumped to V_0-15-0 (breaking); episodes pin the version.
- `budget::` is a cascade field with a single currency per domaiNN.
- `output_formats::` is a cascade field; the master size comes from the declared field, never hard-coded.
- Series chrome (watermark, CTA) is declared once on the Series, per language, and applied by the engine
  per scene kind.
- No backwards-compat code (maintainer preference): delete retired paths rather than alias them.

## 5. Quick wins (first independent block, before the redesign)
1. Put the cascade `image_model` into the image cache key, drop the display `title` from it, and add a test.
2. Either emit the console's non-preset overrides or remove those controls. Removal is preferred, since
   the console is being replaced.
3. Enforce or retract the SKILL.md claim that a presenter with no avatar clip stops the render
   (`SKILL.md:113` vs `lib/avatar-jobs.mjs:164-181`).
4. Reconcile the allowlist with the price catalog: warn on unpriced allowed models, and block
   `infinitetalk` if the maintainer confirms.
5. Fix the `render-formats.mjs --fill crop` bug.
