# Design: coNNtent V_0-15-0 (decision-in redesign, formerly `coNNtent`)

Note on length: this design exceeds the 800-word skill budget on purpose. The orchestrator asked it to settle 12 named questions (Q1–Q7 plus engine, console and slicing), and each one constrains the tasks. Decisions are in tables, and code appears only for data shapes.

## Technical Approach

The engine reads a model and runs one command; it never invents data. Data lives in four kNNowledge documents: the Episode, the Series (with Scene Kinds and Chrome), the Model Catalog (bluepriNNt reference plus a domaiNN overlay) and Video Defaults. Changes reach those documents only through changesets applied by the canonical apply engine. The skill reaches nn-core and the apply engine through the existing `build-core-mirrors.mjs` pattern, so it keeps no parser or writer of its own. `produce <episode>` is a resumable state machine keyed on `plan_hash`. HyperFrames projects live in the episode folder and hardlink to the content-addressed cache. Two bluepriNNt console views replace the quine.

## Architecture Decisions

| # | Topic | Choice | Rejected | Rationale |
|---|---|---|---|---|
| A1 | Q1 asset staging | `linkOrCopy(src, dest)`: `fs.linkSync`. On `EXDEV`/`EPERM`/`ENOTSUP` it falls back to `fs.copyFileSync(src, dest, COPYFILE_FICLONE)`. The run records `link_mode` and warns once. In copy mode, `produce` deletes `hyperframes/assets/` after a successful render. | Symlinks: Windows needs developer mode, and file servers may refuse links that escape the root. Pointing the project at cache paths would break the project's relative `assets/<name>` contract and the renderer's root. Keeping today's copies is the 3.6 GB problem. | A hardlink is a normal directory entry, so any reader (the HyperFrames CLI, its file server, Chrome) sees an ordinary file. The only real failures are cross-volume and filesystem support, and the copy fallback covers both. |
| A2 | Q1 verification | Spike in Slice 5. Render the pilot twice, in link mode and in forced copy mode, and require byte-identical masters. Assert `nlink >= 2` on staged assets. Unit-test `EXDEV` through an injected `link` function. Assert that no stage opens an asset for write; cache files are also chmod read-only after write. | Trusting the renderer. | A write through a hardlink would corrupt the cache, so the guard has to be explicit. |
| A3 | Q2 variants and verdicts | Variants are model data. A new concept `Variant` (child of Scene) has `for::` (the target field) and a body (the candidate value). The verdict is a Scene field, `review:: approved \| needs-change`. The reason is a changeset `comment` op on the scene. Picking a variant is an `update_field` that copies the value into the scene field. On approval, the engine removes the `Variant` elements through a changeset. | Extending `changes` with variant groups and per-change verdicts would change a shared, sealed contract for one bluepriNNt and needs partial-apply semantics. A sidecar is forbidden by "Changesets are the only change record". | This reuses every existing op (`add_element`, `update_field`, `comment`, `remove_element`). `changeset-document-model` stays unchanged. |
| A4 | Draft intake | The agent writes a sealed proposed changeset P. `produce` validates P against the field registry (dry apply), then applies it and sets `status:: draft` in a separate engine changeset. The review works on the applied model. | Keeping P unapplied until review: the reviewer's changes would target elements that do not exist yet, and apply ordering becomes fragile. | Regenerating one scene is just another P scoped to that scene's addresses. |
| A5 | Q3 scene kinds | The Series document (`<s>_series_NN.md`, `scope: true`) holds `Scene Kind` and `Chrome` elements. There is no sibling file. | A sibling kinds file splits one decision unit (the series format) across two files. | D2 says kinds are elements of the Series. |
| A6 | Cascade | The fold goes from outermost to innermost: blueprint → domain → series → kind → video → scene. Layer fields are explicit only. The `cli` level is deleted. Presets expand directly before the explicit node of the level that declares them, including `kind`. `kind:: Libre` contributes no node. | Keeping the `cli` level (flags for models and fps). | D3. Flags were a second source of parameters (P2). |
| A7 | Q5 image size | `image_size` is a cascade field, validated against the catalog Model `sizes`, and part of the image cache key. | Hard-coded 1024². Deriving it from the layer box adds logic without a decision behind it. | A person does choose the aspect (square or 16:9 b-roll). |
| A8 | Q6 GSAP | `gsap` is pinned as an exact dependency in the skill `package.json` and installed by `ensure-hyperframes.mjs`. The engine links `node_modules/gsap/dist/gsap.min.js` into `hyperframes/vendor/`, and the emitter references `vendor/gsap.min.js`. A missing file fails loudly. | A committed vendor copy has unclear redistribution terms under the GSAP license. The CDN is what we have today and is not hermetic. | This is hermetic with no redistribution by us. |
| A9 | Q4 stale prices | Every price carries `price_date`. Catalog-level `stale_after_days` defaults to 90. A stale price warns in the estimate and in the Series view and never blocks. An allowed model without a price blocks. | Blocking on stale prices. | Stale prices are approximate; missing prices are wrong. |
| A10 | Parser and apply reuse | A new mirror target `coNNtent` in `scripts/build-core-mirrors.mjs` uses entry `scripts/core-mirrors/coNNtent.ts`. It re-exports the scope fold, `parseKnowledge`, `parseChangeset`, `serializeChangeset`, `computeProposalSha`, `executeChangesetApply` and `writeProposedChangeset`. It replaces the `scope` target, and the output is `lib/nn-core.generated.cjs`. | Shelling out to the MCP. Keeping `lib/knowledge-model.mjs`. | This is an existing, drift-guarded pattern, and the engine writes status and master through the real apply engine. |
| A11 | Field registry | `scripts/build-field-registry.mjs` parses `spec_NN.md` Field Definitions and frontmatter `validation.conditional_fields` and writes `lib/field-registry.generated.json`. `--check` runs in `verify.js`. Consumption is declared in code (`lib/field-consumers.mjs`, field → module). A test fails when a registry field has no consumer or a consumer names an unknown field. | Adding `consumer::` to Field Definitions, which would extend iNNfo L1. | The spec stays pure, and dead or phantom fields fail CI. |
| A12 | Console data | Generic, small addition to `export-console.mjs`: an optional `<pkg>/assets/console-view-<slug>.data.mjs` exporting `collect({ rootDir, models })`. Its JSON result is embedded as `payload.viewData[slug]` and exposed as `ctx.viewData`. | A computed kNNowledge runs document, which goes against "facts stay JSONL". A video-specific hack in the exporter. | The views need ledger and timing data, and today nothing carries it. **This modifies `console-view-registry`** (see Open for maintainer). |
| A13 | Facts location | `<domaiNN>/.cognnitive/video/ledger.jsonl` and `timings.jsonl`, one file per machine. The old `.cognnitive/video-ledger.jsonl` is not read. | Committed facts. | These are machine-local facts. Comparing machines merges files at export time. |
| A14 | Guard config | `video-guard.json` is deleted. The allowlist moves to the catalog overlay (`allowed::`). `budget` (per episode) and `daily_budget` (domain or blueprint level only) become cascade fields. | Keeping the JSON. | One source per fact (P2/P3). |

## Data Shapes

- **Series document:**
  - `Series` has `title`, `language`, `presets`, `budget`, `script_review` and `output_formats`.
  - `Scene Kind` has `role`, `narration:: on|off`, `max_duration` (seconds), `variants` (count), `fixed:: none|first|last|after:<kind>` with `asset` for fixed scenes, `chrome:: [watermark, cta, …]` and `presets`.
  - `Chrome` (one element per language) has `language`, `watermark`, `cta`, `bumper` and `music`; its media live in `series/<s>/assets/`.
- **Episode:**
  - `Video` has `status:: idea|draft|approved|produced|published|archived`, `published_url`, `master`, `language`, `budget`, `script_review` and `output_formats` (the first entry is the master size; the master is named `<slug>_<W>x<H>.mp4`). The frontmatter pins `blueprint_version: V_0-15-0`.
  - `Scene` has `kind`, the body as narration, `review` and `presets`.
  - `Layer` states exactly one of four behaviour types: `avatar` (lip-synced, paid job), `media` (image or video, with `placement:: full|inset` and `timing:: scene|slot`), `text` (overlay text, whose `style::` names the visual component: title, lower-third, caption, watermark, quote; `source:: narration` takes the scene narration) and `animation` (an authored HyperFrames sub-composition). Appearance lives in Presets ("Lower third", "Title", "Quote", "Captions", "B-roll"). `presenter` is not a type: the name is `avatar` everywhere.
  - `Variant` is described in A3.
- **Catalog:**
  - `Provider` has `name` and `api_base`.
  - `Model` has `provider`, `api_id`, `capability:: tts|image|avatar|video`, `controls:: [speed, emotion, size, resolution]`, `sizes`, `adapter`, `price`, `price_unit:: per_1k_chars|per_image|per_second`, `price_date`, `status:: active|blocked`.
  - `Voice` has `model`, `voice_id`, `language`.
  - The overlay (`<domaiNN>/model-catalog_NN.md`) has Model elements with `allowed`, `price`, `price_date` and `price_source:: invoice`. Fields are merged per Model slug, and the overlay wins. A model defined only in the overlay must declare every field and name an existing adapter.
- **Adapter** (`scripts/adapters/<id>.mjs`):

```js
export default { id, capability, controls: ['speed','emotion'],
  translate(intent /* {voice_speed, voice_emotion, image_size, …} */, model) /* -> vendor params */ }
```

  A test asserts `adapter.controls` equals the catalog `controls`. A non-default intent value for a control the model does not declare fails at estimate, before any spend.
- **Ledger row (v2):** `{v:2, ts, run_id, episode, plan_hash, stage, kind, model, cache_key, units, unit_price, price_date, price_source, est_usd, actual_usd, cache_hit, outcome:ok|failed|blocked, queue_ms, processing_ms, machine:{fp}}`. Every row carries the machine fingerprint (decision 6) so logs from several machines can be compared when merged by hand.
- **Timing row (v1):** `{v:1, ts, run_id, episode, plan_hash, stage:plan|tts|image|avatar|compile|render|formats|apply, start, end, duration_ms, link_mode, machine:{fp, cpu, cores, gpu|null, ram_gb, os, node, hyperframes}, render?:{frames, fps_effective, width, height}, cache:{hits, misses}}`. `fp` is the first 12 hex characters of the sha256 of the canonical `machine` object without `fp`.
- **`plan_hash`:** sha256 of canonical JSON `{episode, blueprint_version, items:[{kind, model, cache_key, units, unit_price, price_date}]}`. Any price change invalidates an approval.

## Data Flow: `produce <episode>`

```
idea --P found, dry-apply ok--> apply P + E(status=draft) --> draft
draft --script_review=skip--> pick variant 1 per field --+
draft --review changeset R applied, all scenes approved--+--> E(status=approved, remove Variants) --> approved
draft --any needs-change--> exit 10 STOP_REVIEW (lists scenes + comments; agent writes P' for those scenes only)
draft --no R yet--> export Episode review view, exit 10
approved --> kinds+chrome expand --> cascade --> estimate (catalog, plan_hash)
   total > budget and no --approve <plan_hash> --> exit 11 STOP_BUDGET   (skip never bypasses this)
   budget unset --> exit 11 STOP_BUDGET (an unset budget always asks)
   language unset --> validation error before estimate (the bluepriNNt ships no language default)
   else --> tts --> image --> avatar --> compile --> link-stage --> render master --> formats
        --> E(status=produced, master) --> produced          [ledger+timings appended per stage]
produced --user--> published (published_url) | archived
```

Exit codes: 0 done, 10 awaiting review, 11 over budget, 1 error. Every stage is idempotent through the cache, so a rerun resumes. E is an engine changeset written with `writeProposedChangeset` and applied with `executeChangesetApply`.

## Folder Contract

```
<domaiNN>/video-defaults_NN.md   model-catalog_NN.md   .cognnitive/{cache/video, video/*.jsonl}
series/<s>/<s>_series_NN.md   assets/ (series media: bumper, logo, music, avatar images, sounds, frames)
series/<s>/episodes/<slug>/<slug>_coNNtent_<s>_NN.md  sources/  media/  hyperframes/ (regenerable, gitignored:
    index.html, compositions/, assets/ hardlinks, vendor/gsap.min.js, manifest.json)
    <slug>_<W>x<H>.mp4 (the one master)   formats/   thumbnail.png
```

The engine discovers episodes only under `series/<s>/episodes/`; a legacy episode folder left in `series/<s>/assets/` is ignored and the maintainer reorganises it by hand. There is no `build/`, no `render.tmp.mp4` outside `hyperframes/`, and no second master.

## File Changes (skill root `S` = `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent`)

| File | Action | Description |
|---|---|---|
| `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md` | Modify | V_0-15-0: concepts Scene Kind, Chrome, Variant; new and removed fields |
| `.../coNNtent/catalog/model-catalog_coNNtent_NN.md` | Create | Dated reference catalog |
| `.../coNNtent/procedures/` (draft procedure) | Create | Agent draft procedure that emits P |
| `.../coNNtent/assets/console-view-episode-review.js`, `console-view-series.js` (+ `.data.mjs`) | Create | The two views |
| `scripts/export-console.mjs` | Modify | `.data.mjs` collect hook, `ctx.viewData` (A12) |
| `scripts/build-core-mirrors.mjs`, `scripts/core-mirrors/coNNtent.ts` | Modify/Create | A10 |
| `S/scripts/produce.mjs` | Create | CLI entry and state machine only |
| `S/scripts/lib/{episode,kinds,cascade,catalog,plan,stage-assets,facts,changes,compile,render,field-consumers}.mjs` | Create | Split of `video-engine-cli.mjs` |
| `S/scripts/build-field-registry.mjs`, `lib/field-registry.generated.json` | Create | A11 |
| `S/scripts/adapters/*.mjs` | Create | One adapter per catalog model |
| `S/scripts/{asset-synthesizer,scene-project,hyperframes-render,render-formats,cache-manager}.mjs` | Modify | Adapters, vendor GSAP, links, cache key |
| `S/scripts/{video-engine-cli,build-script-from-draft,build-draft-html,draft-template.html,finalize-video,approve-plan}.mjs` | Delete | Replaced by `produce` and the views |
| `S/scripts/lib/{knowledge-model,video-scope,legacy-draft-keys}.mjs`, `video-guard.json` | Delete | Replaced by the mirror, cascade, registry and catalog |
| `asset-cost-estimator.mjs` `PROVIDER_PRICING_CATALOG`, `presets.mjs` `PRESET_PARAMETERS`, `scene-compiler.mjs` `DEFAULT_CONDITIONAL_FIELDS` | Delete | Read from the catalog or registry |
| `S/test/{conditional-fields-drift,preset-parameters-drift,build-draft-html,build-script-from-draft,legacy-draft-keys}.test.mjs` | Delete | Superseded by the registry and produce tests |
| `S/SKILL.md`, `references/{folder-contract,parameters,cost-guardrails}.md` | Modify | New contract |

`synthesize-avatar.mjs` and `tts-generator.mjs` become stage functions called by `produce`. Whether they keep a standalone CLI is decided in tasks: delete unless a test needs them.

## Testing Strategy (strict TDD, `node --test` in `S/test`)

| Layer | What | Approach |
|---|---|---|
| Unit | cascade order and kind presets, kind expansion (fixed, Libre, reorder), catalog merge, allowlist, staleness, `plan_hash` (golden; changes with price), adapter translate, `linkOrCopy` (injected `EXDEV`), registry generation, unknown-key rejection, fingerprint | Pure functions, in-memory fixtures |
| Contract | adapters ↔ catalog `controls`; registry ↔ consumers; registry `--check`; mirror `--check` | Tests and `verify.js` steps |
| Integration | the `produce` state table (each transition and exit code) against a tmp domaiNN, with an injected synthesizer and renderer (`hyperframesRun`); engine changesets valid under `parseChangeset`; JSONL rows match the schemas | Fixture domaiNN under the OS tmp dir |
| View | both views mount via `registerView`, produce changesets with `update_field`/`comment`, read `ctx.viewData`; the export stays under 5 MB | jsdom pragma (happy-dom is insufficient per prior findings) |
| Spike | real HyperFrames render, link vs copy, byte-identical | Manual, Slice 5, recorded in apply-progress |

## Slice Plan (each slice at most about 400 changed lines where possible)

| Slice | Content | Depends on |
|---|---|---|
| 0a | QW1 image cache key, QW5 `--fill crop`, QW3 avatar render refusal (V_0-14-x) | — |
| 0b | QW2 remove non-preset console controls, QW4 unpriced-model warning | — |
| 1 | Mirror target `coNNtent`; replace `knowledge-model.mjs` | 0 |
| 2a | `spec_NN.md` V_0-15-0 text (docs-only; likely `size:exception`) | 1 |
| 2b | Field registry generator, validator, consumers, delete drift tests | 2a |
| 3 | Catalog document, `catalog.mjs`, adapters, estimator rewrite, `plan_hash` with prices, ledger v2, delete guard JSON | 2b |
| 4 | Series kinds and chrome, `cascade.mjs` with kind level, language | 2b |
| 5 | `stage-assets` link-or-copy, project in episode folder, no `build/`, master from `output_formats`, GSAP vendor, `image_size` + spike | 3, 4 |
| 6 | Timings log and machine fingerprint | 5 |
| 7 | `produce` state machine, engine changesets, delete old CLIs | 3–6 |
| 8 | Exporter `.data.mjs` hook + Episode review view | 7 |
| 9 | Series view | 8 |
| 10 | Draft procedure, SKILL.md, references | 7 |
| 11 | Pilot port (domaiNN, outside the repo) + `prune-duplicates.mjs --dry-run` (deletes only cache-identical bytes) | 9, 10 |

## Migration / Rollout

There is no migration code. Old episodes stay archives under their pinned version, and `produce` refuses a non-V_0-15-0 `blueprint_version`. The series are ported by hand, in the order cognitive-use-cases, villabotijos-today, innteresante.

## Resolved by the maintainer (2026-11-02)

- [x] A12 adds a generic `.data.mjs` hook to `console-view-registry`. Accepted as designed: the spec phase adds a MODIFIED delta.
- [x] Q7: `infinitetalk` stays in the reference catalog as an active avatar model, with no warning (decision 8).
- [x] A4: P is applied at intake, so unreviewed narration sits in the model under `status:: draft`. Accepted as designed.
- [x] A6: a video-level value overrides a kind-level one. Accepted as designed.
- [x] A10: bundling `executeChangesetApply` (nn-mcp) into a skill mirror. Bundle size measured in Slice 1.
- [x] `daily_budget` stays a cascade field restricted to the domain and blueprint levels.
