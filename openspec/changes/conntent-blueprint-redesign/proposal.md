# Proposal: coNNtent bluepriNNt Redesign

## Intent

The coNNtent bluepriNNt has a good **model**: one document per episode, Scene Kinds and Chrome at series level, a well-defined cascade, content-addressed caching, and budget gates before spend. The **delivery chain around that model is broken**. The specs contradict each other on basic layout. The engine runs stages in an order that fails on a first run. The console cannot see real episodes. Nothing checks that the rendered video contains what the script asked for. The review gate can be satisfied by the agent itself.

This change makes the blueprint's guarantees (changesets only, human review, plan before spend, "produced" means "matches the script") **enforced by the engine** instead of being conventions an agent can step around. It covers the folder structure, the parameter cascade, the generation pipeline and its review gates, a single unified console, and procedures for every level (domain, series, episode).

Source of truth: the decision record of 2026-11-08 (D1–D20 and the accepted coherence fixes C1–C10), produced from the 360° review of coNNtent V_0-15-1 and engine nn-conntent V_0-15-11.

### Governing premise: no backwards compatibility

- The target is new videos, new series and new domaiNNs.
- No migration scripts, aliases or legacy readers.
- The engine **rejects old layouts with a clear message** (for example `series/<s>/assets/<slug>/` → "episodes now live in `series/<s>/episodes/<slug>/`; recreate this domaiNN").
- Existing domaiNNs (including `coNNtent_NN/series/botijos-today`) are recreated, not migrated.

## Problem (evidence from the 360° review)

The real episode `botijos-today / gas-pump-printer-powerball` was marked `produced`, yet it contains none of its authored text. No human reviewed it. It needed four manual engine stages and two hot-patches to the installed package.

| # | Severity | Finding | Evidence |
|---|---|---|---|
| F1 | P0 | Rendered master has no text at all | Title, lower-third and caption layers exist in `hyperframes/manifest.json` (`scenes[].props.layers`) but never reach `index.html`; emitted Chrome watermark and CTA are invisible in frames; `produce` reported success. **Handled by hotfix `conntent-render-hotfix`.** |
| F2 | P0 | Avatar stage runs before TTS exists | `produce.mjs:268-275` calls `synthesizeAvatars` before `renderVideo`, where TTS is generated; `avatar-jobs.mjs:134-138` fails with "Run compile first". **Hotfix.** |
| F3 | P0 | The console cannot see episodes | `export-console.mjs:224-239` skips `series/<s>/assets/` as "legacy", which is exactly where `spec_NN.md` and the engine put episodes. Review edits target elements that are not in the payload. |
| F4 | P0 | The review gate is self-certified | The agent wrote `review:: approved` on all 4 scenes while drafting. Approval is not bound to a content hash, so later edits stay approved. |
| F5 | P1 | Specs contradict each other on layout and naming | Episode folder `assets/<slug>` vs `episodes/<slug>`; three series-document names; `video-guard.json` mandatory in the skill but forbidden in openspec; two ledger paths (`.cognnitive/video-ledger.jsonl` written, `.cognnitive/video/ledger.jsonl` read); `asset_plan.md` required in one place and forbidden in another; thumbnail name has three variants. |
| F6 | P1 | Cascade is silently truncated | `image_model`/`image_size` resolve only from series, domain and blueprint (`compile.mjs:529-534`); `avatar_resolution` is Layer-only (the example came out at 640×352, upscaled to 1920²). Hand-kept per-field level lists caused both bugs. |
| F7 | P1 | TTS language hard-coded | `asset-synthesizer.mjs:447` uses `options.language \|\| 'Spanish'`; `language` is not in the TTS cache key; the catalog ships only `en` voices. **Pass-through is in the hotfix; the language model is here.** |
| F8 | P1 | Capabilities without a parameter | Burned-in captions, thumbnail style/size, and generated video clips (priced at $0.030 each by the estimator, never produced). |
| F9 | P1 | Path resolution by coincidence | A series-level `../../assets/music/ambient.mp3` resolves from the episode folder, not from the declaring document. Two music mechanisms (`background_audio` and Chrome `music`) have no precedence. |
| F10 | P1 | Spend order wastes money | Avatars were 94% of spend ($0.390 of $0.414) and run before any human has heard the audio or seen the stills. |
| F11 | P1 | No procedures above episode level | `usage_procedures_NN.md` has seven steps, all at episode level; series and domain setup is done by hand-editing (five 64–93-change agent changesets still `proposed`). |
| F12 | P1 | Console is stale and cannot show media | Domain console was 2 days stale; CSP `img-src data: blob:` blocks file paths; videos are never shown. |
| F13 | P2 | Wrong engine loaded | The agent loaded `nn-video-script` (the old blueprint) instead of `nn-conntent`; three engine copies were installed. |

## Scope

### Prerequisite (separate change, lands first)

**Hotfix 0 — `conntent-render-hotfix`** (light lane, no SDD, one PR to `dev`): scene text layers reach the render; minimal overlay QA (manifest vs `index.html`) fails `produce` without setting `status:: produced`; stage order TTS → avatar; avatar-layer detection via `fields.type`; `language` passed to TTS and its cache key; upstream the `scriptDir` fix in `asset-cost-estimator.mjs` and `synthesize-avatar.mjs`. This proposal assumes it is merged and does not re-specify it, except that Slice 3 replaces the minimal QA with full QA (D9).

### In Scope — Slice 1: Structure

- **D1** Episodes live in `series/<s>/episodes/<slug>/`. Reusable media lives in `library/` at domaiNN level and at series level. The engine and the console reject `series/<s>/assets/<slug>/` with a migration message (no alias, no reader).
- **C1** Everything reusable lives under `library/`: `music/`, `sounds/`, `frames/`, `components/`, `characters/`, plus `media/` (bumpers, intros, logos and images; added by the spec phase because Chrome and fixed Scene Kinds need a reusable home). Avatars live inside their character. Root-level `sounds/`, `components/`, `frames/` at domaiNN and series roots are rejected.
- **D2** Library items are referenced by **logical name with upward lookup**: `background_audio:: music/ambient` is looked up in episode `media/`, then series `library/`, then domaiNN `library/`; nearest wins. A `domain:` or `series:` prefix forces a level. `..` and absolute paths are rejected. The plan and the console report the resolved file for each name. Generalises the existing `findNearest`.
- **Reconciliation of `spec_NN.md` and openspec onto one name per thing** (F5): series and episode documents both `<slug>_coNNtent_NN.md` (the series recognised by `scope: true`; design G1), `Video` placement `"{container}/episodes/{slug}/"`, thumbnail name (`<slug>_thumbnail_<W>x<H>.png`), deliverable names prefixed with the slug, plan file `plan.json` in the episode folder, one ledger path `.cognnitive/video/ledger.jsonl` (written = read; the legacy path is rejected), `video-guard.json` retired in favour of the catalog overlay, composition id = episode slug (no title-derived ids).
- Old layouts produce one clear rejection message per detected legacy path; no migration script.

### In Scope — Slice 2: Cascade

- **D3** One uniform cascade with three scope classes declared once per field in the field registry:
  - `render`: every level where it applies (domaiNN · series · kind · preset · video · scene · layer);
  - `video`: domaiNN · series · video;
  - `domain`: domaiNN only.
  Scene Kinds accept direct fields. Every resolved value carries a source trace. A **contract test** proves every field resolves at every allowed level, in both the compiler and the estimator (fixes F6: `image_model`, `image_size`, `avatar_resolution`).
- **D4** One language per episode. `language` selects the catalog Voice (whose language must match), is sent to TTS and is part of its cache key, and selects the Chrome. Translations are separate episodes linked with `translation_of`. Validation fails before spend when the Chrome or the character voice for that language is missing (use case U4).
- **D5 (fields)** New fields: `captions: off|words|lines` (render), `caption_model` (render), `thumbnail_formats` (video, default `[2560x1440, 1080x1920]`), thumbnail base, title and badge. The estimator stops pricing video clips; `capability:: video` in the catalog is rejected as "not supported yet".
- **D17** `frame` becomes a full HyperFrames-compatible `FRAME.md`: normative frontmatter (`colors`, `typography`, `spacing`, `components`) plus intent prose (a DESIGN.md superset). Resolved through the cascade and the library, copied into the emitted HyperFrames project as `frame.md`, so engine components, authored animations and registry blocks read the same tokens. A `caption-skin.html` styles captions. The 13 HyperFrames frame presets or `hyperframes capture <url>` are starting points.
- **D19** New concept **Character** at domaiNN or series level: `library/characters/<name>/CHARACTER.md` (frontmatter: voices per language, `default_pose`, `avatar_model`, `avatar_resolution`, `default_background`; prose: speaking and narrative style, things never said, examples) plus `avatars/`, `backgrounds/`, `voice/`. Selected with `character` (render class: a series sets its host, a scene can bring a guest), `pose` and `background`. Its parameters act like a preset directly beneath the explicit fields of the level that sets it. `voice-clone.mjs` writes a catalog `Voice` that carries its `language`.
- **C9** Validation warns when a preset or explicit field overrides a value the active character supplies. Series guidance: when characters are in use, presets do not set `voice` or `avatar`.
- **D18 (format) / C2** The component portfolio is `library/components/<name>/` with `COMPONENT.md`, `index.html`, `preview.mp4`. Frontmatter declares `slot`, `variables`, `duration`, `aspect`, `source` (`registry:<item>@<ver>` or `local`) and the frame `tokens` it uses; prose says when to use it and gives a prompt for creating variants. Items are selected with the existing `components:: <slot>=<name>` field. "Animation" keeps meaning the authored HyperFrames scene layer (`type:: animation`). The package bundles a base set of about 15–18 items vendored from the registry with pinned versions, so rendering never needs the network. *(Allocation note: the decision record assigns only the D18 picker to Slice 4; the format and resolution are placed here because they depend on D17 tokens and the `components` cascade.)*

### In Scope — Slice 3: Pipeline and review

- **D7** `review_gates` replaces `script_review`; blueprint default `[script, preview]`; settable at domaiNN, series or video; a series may set `[]` for autopilot. The budget gate always asks when the plan exceeds `budget`.
- **C3** The preview gate's changeset carries the approved plan hash: per scene, the scene's plan slice hash (design X3, so a one-scene edit does not re-open the others' spend approval); the episode `plan_hash` is built from the slice hashes. When `preview` is not in `review_gates` and the plan exceeds `budget`, the engine inserts a `budget` gate of the same `review_gate` kind, carrying the episode `plan_hash`. One mechanism, never two approvals (see open product question 1 for the one edge case).
- **D8** Generation order: validate → **script** gate → plan (persisted) → TTS and images in parallel → caption alignment → low-res animatic → **preview** gate (also approves avatar spend) → avatar → compile → render → automatic QA → formats and thumbnails → description → delivery.
- **C8** The animatic shows the character's pose still (a real file) or the prompt-generated avatar image from the image stage, with real audio.
- **D6** Caption timings come from whisper.cpp via `hyperframes transcribe`. Model derived from `language` (`small.en` for English, `small --language <code>` otherwise; the default model is never used because it translates non-English speech). Displayed text is the script; whisper supplies timings only, matched word by word. Fewer than 90% matched words, or alignment failure, stops the run before render (no estimated fallback). Cache key `sha256(audio) + text + model version`. If whisper.cpp is missing, installation is offered with a notice at domaiNN setup or first use; nothing installs silently.
- **D9** Automatic post-render QA always runs (hard v1 requirement) at two checkpoints: the master (every manifest overlay present in the render, scene durations, frame sampling in text regions) and the output set (every format, thumbnail and the description exists). Failure sets `failed_qa` (exit 12); nothing is delivered. No `--skip-qa` or `--approve` flag exists.
- **D10** No master gate. The lifecycle ends at `delivered`. Publishing stays human and out of scope.
- **D11** Approval is **derived from human changesets**, never from the `review::` field. A gate is approved only by an applied changeset that came from the console with `author_kind: human`, a named reviewer and a `reviewed_hash` of the content (narration + layers + resolved params). A content change breaks the hash and re-opens the gate for the affected scenes only. Agent tools refuse verdict operations. A `review::` value with no backing changeset is flagged and ignored; `review::` becomes a display mirror.
- **D12** `review_gate` is a **generic nn-core changeset operation**. An all-good review is a verdict-only changeset. Each bluepriNNt declares its own gates. Supersedes the `innfo-console-feedback` rule that forbids verdicts in exports.
- **D13** Deliveries are immutable `deliveries/v<N>/` folders (not semver), hardlinking formats, thumbnails, description, and `<slug>_delivery.html`. N increases only when the output hash and the input fingerprint both change (`delivery.json`). Outputs are always replaced by rename, never written in place, so hardlinked earlier versions keep their bytes. Old versions are deleted by hand.
- **C4** Delivery runs automatically as the last step of Produce once QA passes (no gate after QA); there is no separate Deliver procedure.
- **C5** `delivered` is not terminal: any content change after delivery moves the episode back to the first open gate, for the affected scenes only. A re-run that changes nothing creates no new version.
- **C6 (engine)** When an upstream change (for example a series voice change, use case U6) invalidates a `reviewed_hash`, the engine records the cause so the console can show it.
- **D5 (stages)** Thumbnails are produced inside `produce` from the cascade fields (formats and thumbnails stage).

### In Scope — Slice 4: Console

- **D14** Both consoles (domaiNN console and delivery HTML) load media by relative path; the console CSP in `artifact_shell.html` is widened (`img-src`, `media-src`) to allow it. The domaiNN console sits at the domaiNN root and stays small regardless of episode count. Videos play from a Drive-for-desktop sync or an unzipped folder.
- **D15** The owner's console writes directly into `changes/` through the File System Access API, one grant per domaiNN. `produce` applies pending human changesets on start. Download remains the fallback for browsers without the API.
- **D16** One registered view: a **Domain → Series → Episode tree with a Pending inbox as home**. Sections — Domain: Config, Catalog & voices, Status. Series: Board, Config, Scene Kinds, Chrome & Presets. Episode: Review, Config, Status, Deliveries. Every field shows its effective value and the level it comes from. Replaces the current Episode review and Series views. Follows the reviewed mockup (`console-mockup/domaiNN_console_mockup.html`).
- **C6 (display)** The Pending inbox shows why each gate re-opened ("re-opened: series voice changed").
- **C7** Every engine exit and every applied changeset regenerates the console. An approval whose hash no longer matches is refused: "content changed since you reviewed it; reopen the console".
- **C10** The delivery HTML is produced by the same writer and runtime through a read-only `delivery` view scoped to one episode and written into `deliveries/v<N>/`. Requires implementing `consoleScope.models` in the runtime (specified, not yet implemented). Runtime bundle (~830 KB) fits.
- **D4 (display)** The console flags a translation as stale when the original scene's hash changes.
- **D18 (picker)** Component-portfolio picker showing `preview.mp4`, slot and variables.

### In Scope — Slice 5: Procedures

- **D20 + C4** Six procedures in one document, each step declaring its tool (agent, engine, console or human):

  | Procedure | Level | Ends in |
  |---|---|---|
  | Set up the Domain | domaiNN | defaults, catalog, voices, whisper check, library |
  | Define a Frame | domaiNN / series | `library/frames/<name>/FRAME.md` + `caption-skin.html` (folder form, design D-K3) |
  | Define a Character | domaiNN / series | `library/characters/<name>/` + catalog Voice |
  | Create a Series | series | series doc (Kinds, Chrome, Presets) + dry-run test episode |
  | Plan an Episode | episode | idea, then sealed scene draft (reads CHARACTER prose) |
  | Produce an Episode | episode | gates, render, QA, automatic delivery |

- Setup procedures are conversational wizards that end in a `proposed` changeset for the human to approve.
- The `nn-conntent` entry point detects the domaiNN's state and proposes the right procedure.
- `nn-video-script` refuses coNNtent domaiNNs (F13).

### Out of Scope (non-goals)

- **Publishing** (upload, `published_url`, platform metadata). The lifecycle ends at `delivered` (D10).
- **Generated video clips** (`capability:: video`): rejected as not supported yet (D5).
- **Migration** of any kind: no scripts, aliases, legacy readers, or compatibility shims.
- A master/final review gate (D10).
- Delivery changelog ("what changed") and automatic cleanup of old `deliveries/v<N>/` (D13).
- Orphan cleanup of `.cognnitive/cache/` (tracked separately).
- Collapsing the four budget caps (`budget`, `daily_budget`, `budgetPerRunUsd`, `dailyCapUsd`) into one vocabulary — follow-up, except where Slice 1 reconciliation removes `video-guard.json`.
- Preset-aware `resolve_effective` in nn-mcp beyond what the source trace (D3) needs — follow-up if the console reads the engine trace instead.
- Resumable TTS/image jobs and skip-unchanged render (efficiency items from the review) — follow-up.
- Episode tokens in Chrome text (`{episode_number}`) — follow-up.
- Everything in hotfix 0 (separate change).

## Capabilities

### New Capabilities

| Capability | Slice | Covers |
|---|---|---|
| `conntent-library` | 1 | `library/` at domaiNN and series level, its six kind subfolders (C1 plus `media/`), logical-name references with upward lookup and level prefixes, rejection of `..`/absolute paths and of legacy root folders (D1, D2) |
| `conntent-frame` | 2 | FRAME.md format (frontmatter tokens + prose), resolution, emission as `frame.md`, `caption-skin.html` (D17) |
| `conntent-character` | 2 | Character concept, folder layout, `character`/`pose`/`background` fields, preset-like precedence, override warnings (D19, C9) |
| `conntent-component-portfolio` | 2 (+4 picker) | `library/components/<name>/COMPONENT.md` format, `components` slot selection, vendored pinned base set (D18, C2) |
| `conntent-captions` | 3 | `captions`/`caption_model`, whisper.cpp alignment via `hyperframes transcribe`, model selection by language, 90% match rule, cache key, consent-gated install (D5, D6) |
| `conntent-review-gates` | 3 | `review_gates`, gate kinds (`script`, `preview`, auto `budget`), `reviewed_hash`, `plan_hash`, derived approval, scene-scoped re-open, re-open causes (D7, D11, C3, C5, C6) |
| `conntent-qa` | 3 | Post-render QA checks and `failed_qa` (D9) |
| `conntent-delivery` | 3 (+4 view) | `deliveries/v<N>/` immutability, hardlinks, version increment rule, automatic delivery after QA, delivery HTML (D13, C4, C10) |
| `conntent-domain-console` | 4 | The single registered coNNtent view: tree, Pending inbox, per-level sections, effective value + source, stale-translation flag, portfolio picker, read-only `delivery` view (D16, D4, D18, C6, C10) |
| `conntent-procedures` | 5 | Six procedures, tool per step, wizard → `proposed` changeset, state-aware entry point (D20, C4) |
| `changeset-review-gate` | 3 | Generic nn-core `review_gate` operation (single owner of its schema `gate`/`verdict`/`reviewed_hash`/`plan_hash`/`notes`, of the sealed frontmatter provenance `author_kind`/`origin`/`reviewer`, and of the `GATE_*` error codes): verdict-only changesets, per-bluepriNNt gate declaration, agent-tool refusal (D11, D12) |
| `console-changes-direct-write` | 4 | Owner console writes to `changes/` via File System Access API (one grant per domaiNN), download fallback; `produce` applies pending human changesets on start (D15) |

### Modified Capabilities

| Capability | Slice | Requirement change |
|---|---|---|
| `conntent-folder-contract` | 1 | `episodes/<slug>/`, `library/`, single plan/ledger locations, legacy-layout rejection; replaces "paths never escape the Series folder" with the D2 lookup rules |
| `conntent-series-folders` | 1 | Series folder contains `<series doc>`, `library/`, `episodes/` only |
| `conntent-production-hierarchy` | 1 | Reconciled to domaiNN → series → episode (removes the Subject level if the spec phase confirms it is unused) |
| `conntent-asset-pipeline` | 1 | Naming: slug-prefixed deliverables, true-dimension names, cache naming |
| `conntent-blueprint` | 1–2 | One name per document/concept; adds Character, Frame, Component; removes the stale `Template` concept reference |
| `conntent-model` | 2 | Episode language model, `translation_of` |
| `conntent-field-registry` | 2 | Scope classes `render`/`video`/`domain`, source trace, new fields (`captions`, `caption_model`, `thumbnail_*`, `character`, `pose`, `background`, `review_gates`), removes `script_review` |
| `conntent-presets` | 2 | Character parameters sit beneath explicit fields of the setting level; override warning |
| `conntent-scene-kinds` | 2 | Scene Kinds accept direct fields |
| `conntent-model-catalog` | 2 | Voice carries `language`; `capability:: video` rejected; no video-clip pricing; replaces `video-guard.json` |
| `two-phase-thumbnail` | 2–3 | Thumbnail fields in the cascade; thumbnails produced inside `produce` |
| `conntent-produce-command` | 3 | D8 generation order, parallel TTS/images, animatic, gate stops, automatic delivery, applies pending human changesets on start |
| `conntent-episode-lifecycle` | 3 | States end at `delivered`; adds `failed_qa`; `delivered` not terminal; removes `published` |
| `conntent-run-facts` | 3 | Persisted plan with `plan_hash`; one ledger path |
| `conntent-publication-description` | 3 | Description generated after QA and included in the delivery |
| `cognnitive-conntent-engine` | 3 | Reconcile renderer description with HyperFrames; captions; QA |
| `conntent-skill-dependency-bundling` | 3 | Consent-gated whisper.cpp install; vendored component base set |
| `changeset-document-model` | 3 | Adds the `review_gate` operation and the `author_kind`/`reviewer`/`reviewed_hash` fields |
| `changeset-apply-engine` | 3 | Applies `review_gate`; refuses it unless `author_kind: human` from the console |
| `changeset-propose-tool` | 3 | Agent-side propose refuses verdict operations |
| `innfo-console-feedback` | 3 | Lifts the "no verdicts in exports" rule in favour of `review_gate` |
| `console-scope` | 4 | `consoleScope.models` implemented in the runtime; per-episode delivery scope |
| `console-view-registry` | 4 | One coNNtent view; read-only `delivery` view; edit-control rule reconciled with the review view |
| `innfo-console-runtime` | 4 | CSP `img-src`/`media-src` allow relative local files |
| `console-regeneration` | 4 | Regenerate after every engine exit and every applied changeset; stale-hash refusal |
| `conntent-skill` | 5 | State-aware `nn-conntent` entry point |
| `conntent-template` | 5 | Superseded by `conntent-procedures`; spec phase decides between removal and a delta |

### Removed Capabilities

- `conntent-review`: superseded by `conntent-review-gates` (no compatibility for `script_review` or `review::`-based approval).
- `conntent-console-views`: superseded by `conntent-domain-console` (Episode review and Series views are deleted).

`console-review-mode` and `review-workflow` may overlap with reviewer identity; the spec phase checks them and adds deltas only if requirements change.

## Approach

- **Order of dependency, not of convenience.** Structure first (every later slice references `library/` and `episodes/`), then the cascade (gates hash resolved params), then the pipeline (the console displays gates and deliveries), then the console, then procedures (which orchestrate everything else).
- **Reject, do not adapt.** Each slice adds detection of the layouts or fields it retires and fails with one actionable message. No reader branches on old shapes.
- **One registry, one contract test.** The field registry is the single source of each field's scope class; the compiler and the estimator both consume it and a contract test runs every field at every allowed level through both (D3).
- **Approval as data, not as a field.** Gate state is computed from applied `review_gate` changesets and current hashes. `review::` is written only as a mirror. This makes F4 impossible by construction rather than by agent discipline.
- **Cross-blueprint seams stay generic.** `review_gate` lives in nn-core with no coNNtent knowledge; the bluepriNNt declares its gate names. `consoleScope.models` and the CSP change are runtime features usable by any bluepriNNt.
- **Reuse the existing writer.** The delivery HTML is a scoped export of the same runtime (C10); no second renderer.
- **Strict TDD.** Each slice starts with failing tests for its rejection messages and contract tests.

## Cross-blueprint impact (nn-core / nn-mcp / console runtime)

| Area | Change | Consumers affected |
|---|---|---|
| `iNNfo/packages/nn-core/src/changeset/` | New `review_gate` op type, verdict-only changesets, `author_kind`/`reviewer`/`reviewed_hash`, conflict rules | All bluepriNNts (opt-in by declaring gates) |
| `iNNfo/packages/nn-mcp/src/tools/propose-changeset.ts`, `apply-change.ts` | Agent tools refuse verdict ops; apply validates human origin | Every agent using MCP |
| `iNNfo/specs/bluepriNNts/console/artifact_shell.html` | CSP widened for relative `img-src`/`media-src` | Every exported console |
| `iNNfo/specs/bluepriNNts/console/nn-runtime.js` | `consoleScope.models`, File System Access write path, `review_gate` emission | Every exported console |
| `scripts/export-console.mjs` | Episode discovery under `episodes/`, delivery-view export, regeneration hooks | Every domaiNN console |

These require version bumps of nn-core, nn-mcp and the console runtime, and a templates release (see the release memory notes on the derived version model).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md` | Modified | Concepts Character/Frame/Component, field scope classes, new fields, names reconciled; `blueprint_version` bump |
| `iNNfo/specs/bluepriNNts/coNNtent/defaults/` | Modified | `review_gates`, `captions`, `thumbnail_formats` defaults |
| `iNNfo/specs/bluepriNNts/coNNtent/catalog/` | Modified | Voice `language`, no video pricing, `es` voices |
| `iNNfo/specs/bluepriNNts/coNNtent/library/` (new, packaged) | New | Vendored component base set (~15–18 items, pinned) |
| `iNNfo/specs/bluepriNNts/coNNtent/procedures/usage_procedures_NN.md` | Modified | Six procedures |
| `iNNfo/specs/bluepriNNts/coNNtent/assets/console-view-episode-review.*`, `console-view-series.*` | Removed | Replaced by the unified view |
| `iNNfo/specs/bluepriNNts/coNNtent/assets/console-view-domain.*` (name decided in design) | New | Unified tree view + delivery view |
| `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/` (`produce.mjs`, `lib/compile.mjs`, `lib/render.mjs`, `lib/avatar-jobs.mjs`, `scene-compiler.mjs`, `asset-synthesizer.mjs`, `asset-cost-estimator.mjs`, `synthesize-avatar.mjs`, `voice-clone.mjs`, `render-thumbnail.mjs`) | Modified | Library lookup, cascade registry, pipeline order, gates, captions, QA, delivery |
| `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/test/` | Modified/New | Contract tests, rejection tests, gate tests |
| `iNNfo/packages/nn-core/src/changeset/` | Modified | `review_gate` op |
| `iNNfo/packages/nn-mcp/src/tools/` | Modified | Verdict refusal |
| `iNNfo/specs/bluepriNNts/console/` (`nn-runtime.js`, `artifact_shell.html`) | Modified | CSP, scope, direct write |
| `scripts/export-console.mjs` | Modified | Episode discovery, delivery export, regeneration |
| `nn-video-script` skill | Modified | Refuses coNNtent domaiNNs |
| `openspec/specs/conntent-*`, `console-*`, `changeset-*`, `innfo-console-*`, `two-phase-thumbnail`, `cognnitive-conntent-engine` | Modified/Removed | See Capabilities |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| File System Access permission does not persist for `file://` consoles (D15) | Med | Open verification before design; download fallback is already in scope |
| Chrome/Edge block relative media from `file://` even with a widened CSP (D14) | Med | Open verification; if blocked, design evaluates inlining posters only and opening media in a new tab |
| `hyperframes transcribe` gives no word-level timings on Windows, or whisper.cpp is unavailable (not on PATH on the maintainer machine) (D6) | Med | Open verification; `captions: off` stays valid so production is not blocked; consent-gated install |
| 90% word-match threshold too strict for Spanish or proper nouns | Med | Threshold is a named constant; spec phase defines normalisation (case, punctuation, accents) |
| `review_gate` in nn-core changes a cross-blueprint contract and lifts an existing console-feedback rule | Med | Generic op with no coNNtent knowledge; delta on `innfo-console-feedback`; fresh review of the nn-core PR |
| `consoleScope.models` is specified but unimplemented, blocking C10 | Med | Implemented in Slice 4 before the delivery view; delivery folder (Slice 3) works without the HTML until then |
| Hardlinks fail across volumes or are duplicated by Drive for desktop (D13) | Low–Med | Design defines a copy fallback when `link` fails; immutability is enforced by the version rule, not the link |
| `reviewed_hash` over resolved params re-opens many gates after one upstream edit (C6, U6) | High (intended) | Cause shown in the Pending inbox; scene-scoped re-open; delivered episodes untouched until re-produced |
| Registry items for the vendored base set have incompatible licenses (D18) | Low–Med | Open verification; vendor only permissively licensed items with pinned versions and license files |
| Breaking every existing coNNtent domaiNN | High (accepted) | Governing premise; clear rejection messages; procedures make recreation cheap |
| Slices exceed the 400-line review budget | High | Chained PRs per slice; `sdd-tasks` may split slices further |
| Agents edit `_NN.md` files by hand and bypass changesets | Med | Approval is derived only from applied human `review_gate` changesets, so hand edits cannot approve; validation flags unbacked `review::` |

## Open Verifications (do in exploration, before design)

1. Whether File System Access permission persists for consoles opened as `file://` (D15).
2. That a CSP `media-src` and `img-src` change allows relative local files in Chrome and Edge from `file://` (D14).
3. The exact `hyperframes transcribe` JSON shape and whether it gives word-level timings on Windows (D6).
4. Why the Chrome overlays that were emitted did not appear in the example render (hotfix 0).
5. Which registry items to vendor for the base portfolio, and their licenses (D18).

## Delivery Plan (chained PRs per slice)

| PR | Slice | Depends on | Contents | Can start in parallel with |
|---|---|---|---|---|
| 0 | `conntent-render-hotfix` (separate change) | — | Hotfix 0 | — |
| 1 | Structure | 0 | D1, D2, C1, reconciliation | — |
| 2 | Cascade | 1 | D3, D4, D5 fields, D17, D19, C9, D18 format/C2 | 3a |
| 3a | nn-core `review_gate` | 0 | D12, agent refusal in nn-mcp | 1, 2 |
| 3b | Pipeline & review | 2, 3a | D6–D11, D13, C3–C6 (engine), C8, D5 stages | — |
| 4 | Console | 3b | D14–D16, D18 picker, C6 display, C7, C10, D4 display | — |
| 5 | Procedures | 4 | D20, C4, `nn-video-script` refusal | — |

Splitting 3a out keeps the cross-blueprint nn-core change in its own reviewable PR. `sdd-tasks` sets the final PR boundaries against the 400-line budget; the chain strategy is the orchestrator's cached choice.

## Rollback Plan

- Each slice is one PR (or one sub-chain) and is reverted independently in reverse order (5 → 1). Reverting a slice restores the previous `blueprint_version` via `scripts/sync-versions.mjs`.
- No data migration exists in either direction. A domaiNN recreated in the new layout is not readable after reverting Slice 1; this is accepted by the premise (recreate again).
- PR 3a (nn-core) is reverted only together with 3b and later, because 3b consumes the op.

## Dependencies

- `conntent-render-hotfix` merged to `dev`.
- Open verifications 1–3 and 5 resolved before the design of slices 3 and 4.
- HyperFrames CLI with `transcribe` and `capture`; whisper.cpp (optional, consent-gated).
- A templates release and nn-core/nn-mcp/console runtime version bumps after merge.

## Success Criteria

**Slice 1 — Structure**
- [ ] A domaiNN with `series/<s>/episodes/<slug>/` and `library/` validates; one with `series/<s>/assets/<slug>/` or root `sounds/`/`frames/`/`components/` fails with a message naming the new location.
- [ ] `background_audio:: music/ambient` resolves to the nearest `library/` file; `series:`/`domain:` prefixes force the level; `..` and absolute paths are rejected; the plan shows the resolved file.
- [ ] `spec_NN.md`, openspec and engine use one name for every document, plan, ledger and deliverable; `video-guard.json` no longer exists anywhere.
- [ ] The console lists every episode under `episodes/`.

**Slice 2 — Cascade**
- [ ] The contract test passes for every field at every allowed level in both compiler and estimator, including `image_model`, `image_size`, `avatar_resolution`.
- [ ] Every resolved value reports its source level.
- [ ] A Spanish episode uses a Spanish catalog Voice and Spanish Chrome; a `translation_of` English episode fails before spend when `en` Chrome or character voice is missing.
- [ ] `capability:: video` is rejected; the estimate contains no video-clip line.
- [ ] The emitted HyperFrames project contains `frame.md` with the resolved tokens.
- [ ] A series with `character:: lucas` and a scene with `character:: maria` resolve voice, avatar and pose per scene; a preset setting `voice` triggers the C9 warning.
- [ ] `components:: title=<name>` resolves a `library/components/<name>/COMPONENT.md`; rendering works offline with the vendored set.

**Slice 3 — Pipeline & review**
- [ ] An agent-written `review:: approved` does not open any gate and is flagged.
- [ ] Only an applied console changeset with `author_kind: human`, a reviewer and a matching `reviewed_hash` approves a gate; nn-mcp refuses agent verdict ops.
- [ ] Editing scene 2 after approval re-opens only scene 2; the avatar stage regenerates only scene 2 (U3).
- [ ] With `review_gates: []` and the plan over budget, exactly one `budget` gate is inserted (exit 10); with `preview` on, each scene's preview approval carries its plan slice hash and no second approval is asked; an unset `budget` with a non-zero plan is a spend stop (exit 11).
- [ ] Avatar spend happens only after the preview gate.
- [ ] Captions use the script text with whisper timings; under 90% match stops the run before render.
- [ ] A render missing any manifest overlay ends in `failed_qa` (exit 12) and produces no delivery; a missing format or thumbnail fails the output-set checkpoint the same way.
- [ ] A passing run creates `deliveries/v1/`; an identical re-run creates nothing; a changed run creates `v2/`; `v1/` is unchanged.

**Slice 4 — Console**
- [ ] The domaiNN console plays episode audio and video by relative path from `file://` in Chrome and Edge.
- [ ] Owner approvals land in `changes/` without a download (where the API exists); `produce` applies them on start.
- [ ] The home screen is the Pending inbox and shows the re-open cause for each gate.
- [ ] Every field shows its effective value and source level.
- [ ] After any engine exit or applied changeset the console is regenerated; a stale approval is refused with the C7 message.
- [ ] `deliveries/v<N>/<slug>_delivery.html` is a read-only view scoped to one episode via `consoleScope.models`.

**Slice 5 — Procedures**
- [ ] From an empty folder, the `nn-conntent` entry point proposes "Set up the Domain", and after each completed procedure proposes the next one.
- [ ] Every setup procedure ends in a `proposed` changeset; no procedure edits `_NN.md` files directly.
- [ ] Use cases U1–U7 from the decision record run end to end on a freshly created domaiNN.
- [ ] `nn-video-script` refuses a coNNtent domaiNN with a pointer to `nn-conntent`.

## Proposal question round

The 20 decisions and 10 fixes were settled in a structured interview, so this round only covers residual product gaps. Assumptions are listed for user review:

1. **Who counts as a named reviewer?** Assumed: any human who enters a name in the console; no reviewer roster per domaiNN in v1.
2. **Missing character voice for the episode language:** hard failure before any spend, or fall back to the domaiNN voice? Assumed: hard failure (U4).
3. **Thumbnail defaults:** title from the Video `title`, base from the first scene still, no badge unless set? Assumed: yes.
4. **Superseded deliveries:** after `v2/` exists, should the console mark `v1/` as superseded? Assumed: yes, display only; deletion stays manual.
5. **Budget vocabulary collapse** (four caps): kept out of this change? Assumed: out, as a follow-up.

## Open product questions (pre-apply)

Raised by the spec reconciliation. The specs implement the recommended default of each one and mark the spot; a different answer changes only the named requirement.

**Resolved 2026-11-08:** the user accepted the recommended default for all 11 questions. The `[Q<n>]` tags in tasks.md need no patching.

| # | Question | Recommended default (what the specs say now) | Where |
|---|---|---|---|
| 1 | **Double approval when the pre-preview spend alone exceeds `budget`.** With `preview` on, TTS and images are spent before the preview gate. If that subtotal alone is over budget, C3's "never two approvals" cannot hold. | Insert a `budget` gate before TTS and images carrying the episode `plan_hash`; the later preview gate then reviews content only and asks for no spend approval. Alternative: a spend stop (exit 11) asking the human to raise `budget`. | `conntent-review-gates` "A budget gate is inserted…" |
| 2 | **`captions: words` for languages written without spaces (zh, ja).** Whisper returns such a script as one word. | Hard validation error `captions-words-unsupported` before spend; `lines` and `off` stay valid. Alternative: silently fall back to `lines`. | `conntent-captions` |
| 3 | **Chrome `music` precedence against `background_audio`.** | Chrome `music` acts as the kind-level value of `background_audio`, so a video or scene `background_audio` wins over it (design D-K2). | `conntent-model` "Background Audio Is a Field, Not a Layer", `conntent-scene-kinds` |
| 4 | **`voice` required with no blueprint default.** | Required: a scene with no `voice` and no active Character fails with `missing-voice` before spend; no package default, so no wrong-language voice and no TTS cache churn. | `conntent-model` "One Language Per Episode" |
| 5 | **Entry point proposing Define a Frame / Define a Character only before any series exists.** | Yes: proposed only while no series exists, skippable; once a series exists they are never proposed again (the package `neutral` frame covers a skipped frame). | `conntent-procedures` "State-aware entry point" |
| 6 | **Delivery view contents.** Should the recipient see cost or prompts? | Omit spend, budgets, ledger data and image prompts; show script, media, QA result and review history (gate, reviewer, time). | `conntent-domain-console` "Read-only delivery view" |
| 7 | **Dry-run test episode of Create a Series: keep or discard.** | The human chooses at the last step; keeping makes it the series' first episode (no spend was made). | `conntent-procedures` "Create a Series" |
| 8 | **Thumbnail defaults.** | Title from the Video `title`, base from the first scene still, no badge, formats `[2560x1440, 1080x1920]`. | `two-phase-thumbnail`, `conntent-model` |
| 9 | **Who counts as a named reviewer.** | Any non-empty name other than the console default pseudonym `reviewer`; no roster in v1. | `conntent-review-gates`, `console-changes-direct-write` |
| 10 | **Unset `budget`.** The earlier specs made it ask at a budget gate; design D-P7 makes it a spend stop. | Spend stop (exit 11) when the plan total is above zero; a fully cached run with no `budget` proceeds. No verdict can satisfy it, so the human sets `budget`. | `conntent-review-gates` "Spend authorization is one mechanism", `cognnitive-conntent-engine` |
| 11 | **Animatic size and frame rate** (design open question). | 640 px wide, 15 fps, named constants. | `conntent-produce-command` "The animatic…" |
