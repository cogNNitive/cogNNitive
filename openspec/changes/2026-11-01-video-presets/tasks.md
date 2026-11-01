# Tasks: Video Presets

Roots: `<bp>` = `iNNfo/specs/bluepriNNts/video-script/`, `<skill>` = `<bp>skills/nn-video-script/`, `<scripts>` = `<skill>scripts/`. Strict TDD: inside each slice, RED (failing test) precedes GREEN (implementation), then REFACTOR. Filtered gate: `node scripts/verify.js --only=<substring>`; fast pass: `npm run verify:fast`; skill tests: `node --test <file>`. Each task group (numbered `S.N`) is one work-unit commit (conventional commits, no AI attribution).

Environment: never run `npm ci` from a worktree. If a build is needed, call `node <repo>/node_modules/typescript/bin/tsc` directly. No nn-core change and no mirror rebuild are planned. Do not edit `openspec/changes/archive/**`.

Spec shorthand: VP = video-presets, VSM = video-script-model, VB = video-blueprint, VE = cognnitive-video-engine, VSS = video-script-skill, VPH = video-production-hierarchy, CR = contextual-resolution, VSF = video-series-folders, SST = series-script-templates (removed).

## Review Workload Forecast

| Slice | Est. changed lines | 400-line budget risk | Chained PRs recommended |
|---|---|---|---|
| 1 Contract + migration | 1000-1700 | High | Yes |
| 2 Engine core | 900-1500 | High | Yes |
| 3 Widening + renames | 400-800 | High | Yes |
| 4 Authoring + docs | 600-1100 | High | Yes |
| 5 (optional) fixture text | 30-120 | Low | No |
| **Total** | **2900-5200** | **High** | **Yes** |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Suggested split: PR 1 (slice 1) -> PR 2 (slice 2) -> PR 3 (slice 3) -> PR 4 (slice 4) -> optional PR 5. Design recommends `feature-branch-chain` (PR 1 base = tracker branch; each later PR base = previous PR branch).

(real-domain review) Forecast impact: the real-domain migration cases (tasks 1.6a-1.6d, 1.11), the cache-identity golden and test (1.6d, 2.1a) and the `avatar_resolution` fix (4.1a) add roughly 500-900 changed lines, mostly to slice 1 (migration and fixtures), which stays High risk. Companion coordination: this change is stacked first; `2026-11-01-video-folder-contract` stacks after it, may not archive before it, and both bump within the same unreleased `V_0-14-0` train, so neither merges to main alone. The migration script is an ordered pipeline (`--steps presets[,layout]`); only `presets` is implemented here.

Release constraint (design): no slice is releasable alone. Hold the `dev`->`main` batch until slice 4 lands, or use `feature-branch-chain` so only the tracker merges. Once `main` carries `V_0-14-0`, any later slice needs `V_0-14-1` (the immutability guard compares against the merge-base with `origin/main`). The version bump therefore lands exactly once, in slice 1.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Spec contract, version bump, catalogs, migration script | PR 1 | base = tracker; engine still reads old names, so `verify.js` stays green only because the contract tests and engine fallbacks are scoped as below (see S1 note) |
| 2 | Preset loader, expansion, Template removal, cache-key proof | PR 2 | base = PR 1 branch |
| 3 | Cascade widening, guard, renames | PR 3 | base = PR 2 branch |
| 4 | Authoring tools, dev tooling, docs | PR 4 | base = PR 3 branch |

S1 note: the design requires `node scripts/verify.js` green after every slice. Engine tests that exercise old field names are rewritten in the slice that renames the engine reads (S2/S3). Task 1.12 records the exact set of skill tests that move with slice 1 so the batch stays green; if that set cannot be isolated, fold the minimal engine rename into slice 1 and note it in the apply-progress.

---

## Slice 1: Contract + migration

### Phase 1.0: Spec hygiene

- [ ] 1.1 Run `openspec validate 2026-11-01-video-presets` and `npm run check:openspec` against this change's 9 delta specs; fix any structural error in `openspec/changes/2026-11-01-video-presets/specs/*/spec.md`. All VP/VSM/VB/VE/VSS/VPH/CR/VSF/SST requirements. Verify: both commands exit 0.
- [ ] 1.2 Reconcile `tags` on Preset: VP "Preset Is A Parameters-Only Concept" allows `tags`, design D2 says any other key is `preset-field`. Update design D2 and `PRESET_PARAMETERS` plan so `tags` is allowed and never alters a resolved value. (real-domain review) The reserved `slug` identity key is exempt from `preset-field` in the same way (design D2 already updated); the plan and the drift test treat reserved identity keys as non-parameters. Covers VP Preset Is A Parameters-Only Concept. Verify: re-read of design D2 matches the spec scenario.
- [ ] 1.3 Read `lowerLayer` (`<scripts>/scene-compiler.mjs:452`, `layer_level: fields.level`) and its consumers (`<scripts>/scene-project.mjs:53-65`). Decide: internal property becomes `layer_z_index`, coerced with `Number()` exactly as `layer_level` is today; record the decision in design D5. Covers VE Layer Stacking Uses z_index. Verify: written note in design.md.

### Phase 1.1: RED

- [ ] 1.4 Create `test/video-script-contract-additions.test.mjs` cases: `Preset` concept present with no own fields; `Template` absent; `presets` is `select`/`multiple`/no options on `[Video, Scene, Series, Video Defaults]`; field table of design matches `spec_NN.md` (renames, `z_index` on Layer only, `avatar` not on Layer); `tags` allowed on Preset; defaults free of `voice_speed`/`voice_emotion`/`voice_tone`/`presets`/Preset elements; `presenter` `conditional_fields` is `[asset, prompt, avatar]`. Covers VB (Optional presets Field, Presenter Conditional Fields, Native L2, Per-Layer presenter model, Per-Scene background audio volume, Video-Level Template Field removed), VP (Blueprint Ships No Presets, Template Concept Is Retired), VSM (Field Naming Convention, Cascade Parameters Settable). Verify: `node --test test/video-script-contract-additions.test.mjs` fails.
- [ ] 1.5 Add a retired-vocabulary scan test (new file `test/video-script-no-retired-vocabulary.test.mjs`): walks `<bp>`, `scripts/dev/`, excluding `openspec/changes/archive/**` and the migration script/lib/tests (which legitimately name old keys); fails on `template::`, `tts_model`, `presenter_asset`, `intro_asset`, `music_volume`, `# NN Template`, bare Layer `level::`. Covers VSS Skill Documents Presets And Carries No Retired Vocabulary, VP Template Concept Is Retired. Verify: runs red now; expected to go green only at 4.x. Mark as `todo`-gated until slice 4 and un-gate in task 4.20.
- [ ] 1.6 Create `scripts/dev/migrate-video-presets.test.mjs` with fixtures: each rename row of D8 (including Layer-only `z_index::`, frontmatter `level:` untouched); Layer `model::` -> `avatar_model::` (and both-present drop reported); `template::` conversion (`[[Doc :: Name]]` and bare); Template data moved to innermost covering scope doc (fallback `series_NN.md`, then `video-defaults_NN.md`), `templates_*_NN.md` never deleted (real-domain review: replaces "emptied files deleted"); `tool` and Video `voice_id` dropped and reported, never converted; JSON drafts (`template`, `music*`, `speed`; detailed in 1.6c); HTML consoles listed not edited; `parent_spec` left untouched (real-domain review: replaces "version set to `video-script_V_0-14-0`"); conflict (duplicate name in one target, or no target) writes nothing and exits 1; dry run default writes nothing; `--apply` all-or-nothing; precedence warning for Scene with explicit `voice`/`tts_model` differing from its Template; **second run reports zero changes**. Covers VSS Video Presets Migration Script, Migration Rewrites, Migration Is Idempotent And Precedence-Aware. Verify: `node --test scripts/dev/migrate-video-presets.test.mjs` fails.

- [ ] 1.6a (real-domain review) Build the real-domain-shaped fixture under the migration tests: 3 Template documents in 3 series, 2-3 Template elements each, some with `tool:: edge-tts` and `model::`/`tts_model::` (including `edge-tts/neural` and `replicate/minimax/...`), two identical-content full-presenter Templates in one document, `parent_spec.name: "video-script"` (no version) and `<series>_V_0-1-0`, scope markers with `voice_id::`/`narrator_voice_id::`, a `templates_*` document with a `# NN Series` element and `# NN index` listing `[[Template]]`, a series blueprint `spec_NN.md` listing `[[Template]]`, ignored `archive`/`.bak1`/`node_modules`/`renders`/`_tmp_x` copies, and a `series/x/tools/` fork. Cases: content-based selection with `parent_spec` untouched; Template `model::`/`tts_model::` to `voice_model::` value preserved, both-keys-differ conflict; Preset keeps `slug::` and no `preset-field`; index rewrite on migrated documents and series blueprints; Series element kept and `templates_*` file never deleted; marker keys reported then removed only on `--apply`; guard-config registry entry informational; forks listed not edited; `--steps presets` default, `--steps layout` usage error. Covers VSS Migration Selects Documents By Content, Migration Handles Real-Domain Document Shapes. Verify: `node --test scripts/dev/migrate-video-presets.test.mjs` fails.
- [ ] 1.6b (real-domain review) The 1.6a fixtures and the series-local fork fixture legitimately contain retired names; exclude the migration fixtures directory from the retired-vocabulary scan of task 1.5 and from the `no-legacy-*` scans, with an assertion that the exclusion is limited to that directory. Verify: scan test still red on a planted retired name outside the fixtures.
- [ ] 1.6c (real-domain review) JSON review state cases: `config[] = {key,value,origin,type}` with `tts_model`, `speed`, `emotion`, `music`, `music_volume`; `videoOverrides` keys; per-scene override keys; `scenes[].template` to one-element `presets`; `scenes[].choice.model` NEVER renamed; off-schema `narrator_voice`, `avatar_image`, `avatar_resolution_hook` reported only; `legacy-draft-keys` does not fire on `choice.model`. Covers VSS Migration Rewrites Persisted Review State, Legacy Keys In Persisted State Are Rejected. Verify: fails.
- [ ] 1.6d (real-domain review) Cache-identity golden: from the merge-base engine (V_0-13-11), compute TTS options hash, avatar job key and image prompt-plus-options hash for every scene of the 1.6a fixture and commit them as a golden file next to the fixture; add a migration-report case listing the only scenes allowed to differ (precedence-fix scenes) and the `asset_plan.approved.json` / `manifest.json` invalidation notice. The "after" comparison runs in 2.1a. Covers VSS Migration Preserves Cache Identity. Verify: golden file present and the report cases fail.

### Phase 1.2: GREEN

- [ ] 1.7 Edit `<bp>spec_NN.md`: `blueprint_version` -> `V_0-14-0`; replace `Template` with `Preset` concept; add `presets`; apply Field Definitions table (renames, widened `concept::` lists, defaults `voice_model`, `background_audio_volume`, no `voice_speed`/`voice_emotion`/`voice_tone` defaults); `z_index` on Layer; `avatar_model`/`fit` widened; `avatar_resolution` Layer; presenter `conditional_fields` -> `[asset, prompt, avatar]`; remove `template`, `tool`, `tts_model`, `speed`, `emotion`, `music`, `music_volume`, `presenter_asset`, `intro_asset`, `level`, Video `voice_id`; reword Tool-Agnostic guidance. Covers VB, VSM, VP. Verify: `node --test test/video-script-contract-additions.test.mjs` green (except guard parts moved to S3).
- [ ] 1.8 Edit `<bp>defaults/video-defaults_NN.md`: fix pre-existing drift (`parent_spec` `V_0-13-6` -> `V_0-14-0`), rename `tts_model` -> `voice_model` and `music_volume` -> `background_audio_volume`. Covers VB Blueprint Version Bump And Catalog Parity, VSS Domain Adoption Copies The Video Defaults. Verify: `node --test test/video-script-contract-additions.test.mjs`.
- [ ] 1.9 Edit `<scripts>/scene-compiler.mjs` `DEFAULT_CONDITIONAL_FIELDS` only (presenter -> `[asset, prompt, avatar]`) in lockstep with 1.7. Covers VB Presenter Conditional Fields Include Avatar. Verify: `node scripts/verify.js --only=conditional-fields-drift`.
- [ ] 1.10 Fix `<skill>/draft-template.html:1572` pinned `video-script_V_` literal: version is injected by `build-draft-html.mjs`; test must forbid a literal `video-script_V_` in the template. Covers VB Blueprint Version Bump And Catalog Parity. Verify: `node --test` on the existing draft-html test plus the new assertion.
- [ ] 1.11 Create `scripts/dev/lib/video-presets-migration.mjs` (pure core) and `scripts/dev/migrate-video-presets.mjs` (CLI `<domain-dir> [--steps presets[,layout]] [--apply] [--json]`, dry-run default, exit 1 on conflict, all-or-nothing apply, legacy keys `legacy-draft-keys`), following the `adopt-video-plan` pattern. (real-domain review) Build it as an ordered pipeline of steps with `presets` the only implemented step group (companion adds `layout`), one document scan, one report, one atomic apply; select documents by content, never by `parent_spec`; implement every rule of 1.6a, 1.6c, 1.6d. Covers VSS migration requirements (3). Verify: `node --test scripts/dev/migrate-video-presets.test.mjs` green.
- [ ] 1.12 Identify skill tests under `<skill>/test/` that read renamed spec fields or `video-defaults` keys and would break at the bump; rewrite only those needed to keep `node scripts/verify.js` coherent for slice 1, defer the rest explicitly to S2/S3 in `apply-progress`. Verify: `npm run verify:fast`.

### Phase 1.3: Release guards (explicit)

- [ ] 1.13 Regenerate both catalog files via `node scripts/blueprint-catalog.mjs` (freshness `verify.js:595`, parity `:617`). Covers VB Blueprint Version Bump And Catalog Parity. Verify: `node scripts/verify.js --only=catalog`.
- [ ] 1.14 Run `node scripts/guard-template-immutability.js`; confirm green with `V_0-14-0` and no edit to a published `_V_x-y-z_` file. Covers VB version bump. Verify: exit 0.
- [ ] 1.15 Run `metaschema-selfdescribe.test.ts` (no `reference` with `multiple`), `bluepriNNt-field-catalogue.test.ts`, and the `no-legacy-*` scans. Verify: `node scripts/verify.js --only=metaschema`, `--only=field-catalogue`, `--only=no-legacy`.

### Phase 1.4: REFACTOR and slice gate

- [ ] 1.16 Refactor: dedupe rename table shared by migration lib and contract test into one constant; keep the test fixtures minimal. Verify: both new test files green.
- [ ] 1.17 Slice gate: `npm run verify:fast`; list any red gate in apply-progress. (Full `node scripts/verify.js` is the maintainer's batch gate.)

---

## Slice 2: Engine core (cache-key and resolution tests first)

### Phase 2.1: RED (in this order)

- [ ] 2.1 TTS cache-key regression: fixture with a `V_0-13-11` Template (`tts_model`, `speed`, `emotion`, `voice`) and its migrated form (Preset, `voice_model`, `voice_speed`, `voice_emotion`) produce identical `computeHash`/`buildTtsVoiceOptions`; `speed` stays `Number()`, `emotion` trimmed; defaults contain no `voice_speed`/`voice_emotion`/`voice_tone`. New `<skill>/test/preset-cache-identity.test.mjs`. Covers VE Stable TTS cache key, Voice Parameters Resolve Through The Cascade. Verify: `node --test <skill>/test/preset-cache-identity.test.mjs` fails.
- [ ] 2.1a (real-domain review) Cache preservation proof: migrate the 1.6a fixture (in memory, via the migration core), compute TTS options hash, avatar job key and image prompt-plus-options hash for every scene with the new engine and compare with the 1.6d golden. Fail on any difference except the scenes the migration report lists as precedence-fix scenes; fail if a listed scene does not actually differ. New `<skill>/test/preset-cache-preservation.test.mjs`. Covers VSS Migration Preserves Cache Identity, VE Stable TTS cache key. Verify: fails until 2.9-2.10 and 3.5-3.6 land; must be green at the slice 3 gate (3.9) and stay green after.
- [ ] 2.2 Resolution order: last preset wins; explicit beats own presets; Scene `voice` beats Video preset; Video explicit beats Video preset; inner preset beats outer explicit; Video preset sits under Video explicit and above Series (fixes precedence bug). New `<skill>/test/preset-resolution.test.mjs`. Covers VP Per-Level Additive Expansion Order, VSM Universal Parameter Cascade. Verify: fails.
- [ ] 2.3 Lookup and errors: nearest-first, shadowing, case-insensitive name or slug, `unknown-preset` (lists searched docs), `preset-syntax` (`[[`, `]]`, `::`), `preset-section-order`, `preset-duplicate` (document and repeated name in one list), `preset-field` (allows `tags`; rejects `presets`, `type`, `asset`, `title`). New `<skill>/test/preset-lookup.test.mjs`. Covers VP The presets Field And Its Syntax, Definition Locations And Lookup Order, Invalid Preset References Fail Before Spend. Verify: fails.
- [ ] 2.4 Additive lists: `components`/`sounds` union across levels, series folders, preset nodes; series `presets` concatenated outer to inner; blueprint never expands presets. Covers VP Per-Level Additive Expansion Order, VSF. Verify: fails.
- [ ] 2.5 `explain.winner.scope` names `scene:preset:X` and `doc` is the defining document; `preset-parameters-drift` test vs `spec_NN.md` (pattern of `conditional-fields-drift.test.mjs`). Covers VP Explain Names The Supplying Preset, Preset Resolution Needs No nn-core Change. Verify: fails.
- [ ] 2.6 Engine rejects retired Template mechanism: no `templates` option, no `tool`, no `model` alias, `template::` rejected loudly. Covers VE Template Mechanism Is Removed From The Engine, VSM Retired Field Names Are Rejected. Verify: fails.

### Phase 2.2: GREEN

- [ ] 2.7 Create `<scripts>/lib/presets.mjs`: `PRESET_PARAMETERS`, `parsePresetList`, `loadPresetIndex`, `lookupPreset`, error classes; enforce D2/D3. Verify: 2.3 tests green.
- [ ] 2.8 Edit `<scripts>/lib/video-scope.mjs`: `presetIndex` bag key, `PRESET_LEVELS`, `bagsToChain` expansion, `loadCascadeBags`, `withScriptPresets`, series `presets` concatenation in `seriesValuesFromScopeChain`. Verify: 2.2, 2.4, 2.5 green.
- [ ] 2.9 Edit `<scripts>/scene-compiler.mjs`: delete `templateRefName`/`videoTemplate`/`resolvedTemplate`/scene-bag injection (`:364-398,415-416`), drop `model` alias (`:445`); scene resolves `voice_model`, `voice`, `voice_speed`, `voice_emotion`, `voice_tone` from `sceneBags`; `layer_z_index` from `fields.z_index`. Verify: 2.1, 2.2 green.
- [ ] 2.10 Edit `<scripts>/lib/knowledge-model.mjs` (remove `loadTemplateModels`, `tool`, `model` alias `:266`), `<scripts>/lib/tts-options.mjs` (read lowered `scene_voice_model` etc., keep internal option keys, never read `voice_tone`), `<scripts>/video-engine-cli.mjs` (remove `templates` option `:535,761`; wire presets). Verify: 2.1, 2.6 green.
- [ ] 2.11 Rename `tts_model` -> `voice_model` in `<bp>defaults/video-defaults_NN.md` consumers; ensure the contract test still green. Verify: `node --test test/video-script-contract-additions.test.mjs`.
- [ ] 2.12 Rewrite existing tests `template-delivery`, `model-params`, `knowledge-model-compile`, `video-template`, `series-scope` in `<skill>/test/` to presets (delete Template-only cases). Verify: `node --test` per file.

### Phase 2.3: REFACTOR and slice gate

- [ ] 2.13 Refactor: remove dead Template helpers and imports; one preset-node builder shared by loader and expansion. Verify: all slice 2 tests green.
- [ ] 2.14 Slice gate: confirm no nn-core or `lib/nn-core.generated.cjs` diff; `npm run verify:fast`. Covers VP Preset Resolution Needs No nn-core Change.

---

## Slice 3: Cascade widening + renames

### Phase 3.1: RED

- [ ] 3.1 Guard: presenter without `asset` passes `checkScript` when Scene, Series, Video, Video Defaults or Preset supplies `avatar`; fails with a clear error when none does; guard still runs before any spend; aggregates `unknown-preset`/`preset-syntax`/`preset-field`. Covers VE Pre-Compile Guard Evaluates Cascaded Values, VSM Presenter Layer Requires A Source, VB Presenter Conditional Fields. Verify: `node --test <skill>/test/<guard test>` fails.
- [ ] 3.2 `lowerLayer`: presenter `layer_asset_source` = `fields.asset` else resolved `avatar`. Covers VSM Presenter Layer Requires A Source. Verify: fails.
- [ ] 3.3 `z_index` paint order (two Layers, 1 and 3) and `level` ignored; `background_audio` / `background_audio_volume` resolution at Video, Scene, Preset; `intro`, `image_model`, `transition`, `frame`, `fit` widened levels per Field Definitions. Covers VE Layer Stacking Uses z_index, VSM Cascade Parameters Settable Where Meaningful, Background Audio Is a Field, Frame Parameter. Verify: fails.
- [ ] 3.4 `voice_tone` cascades and presets but never enters `voiceOptions`/cache key/payload; cost estimator and avatar job key unchanged for renamed fields. Covers VE Voice Tone Is Authoring Guidance Only, Interactive Provider Consultation and Cost Estimation, Deterministic Media & TTS Asset Synthesis. Verify: fails.

### Phase 3.2: GREEN

- [ ] 3.5 Edit `<scripts>/scene-compiler.mjs` (`checkScript` cascade-aware guard via `assignLayersToScenes`, `lowerLayer`), `<scripts>/lib/avatar-jobs.mjs`, `<scripts>/synthesize-avatar.mjs`. Verify: 3.1, 3.2 green.
- [ ] 3.6 Edit `<scripts>/asset-cost-estimator.mjs`, `<scripts>/asset-synthesizer.mjs`, `<scripts>/scene-project.mjs` (`layer_z_index`, `background_audio*`, `avatar`). Verify: 3.3, 3.4 green.
- [ ] 3.7 Rename remaining skill tests to new field names (`music_volume` -> `background_audio_volume`, `presenter_asset` -> `avatar`, `level` -> `z_index`). Verify: `node --test <skill>/test/*.test.mjs`.

### Phase 3.3: REFACTOR and slice gate

- [ ] 3.8 Refactor: single cascade-resolve helper for guard and compile path. Verify: slice 3 tests green.
- [ ] 3.9 Slice gate: `rg` the engine scripts for retired names (expect none outside the migration lib); `node --test <skill>/test/preset-cache-preservation.test.mjs` green (real-domain review); `npm run verify:fast`.

---

## Slice 4: Authoring tools, dev tooling, docs

### Phase 4.1: RED

- [ ] 4.1 `build-script-from-draft`: writes `presets:: [..]`, no presenter `asset::`, resolves `intro` through the cascade into the fixed scene background `asset::`; rejects legacy draft keys with `legacy-draft-keys` naming the script. Covers VSS Blueprint-Ships Draft Authoring Tools, Legacy Keys In Persisted State Are Rejected. Verify: `node --test` fails.
- [ ] 4.1a (real-domain review) RED first: a draft whose quality is not `ALTA` with a chosen resolution of `480p` makes `build-script-from-draft` emit `avatar_resolution:: 480p` on the presenter Layer (today `build-script-from-draft.mjs:175` writes it only for `ALTA` and silently drops the choice); `ALTA` behaviour is unchanged; `choice.model` is not rejected as a legacy key. Covers VSS Chosen avatar resolution is kept for any quality. Verify: `node --test` fails, then green with 4.4.
- [ ] 4.2 Console: one preset selector per element (VP Console Draft Tool Offers One Preset Selector); exports new keys; console loader fails with `legacy-draft-keys`. Verify: fails.
- [ ] 4.3 Dev tooling: `adopt-video-plan` hoists `voice` not `voice_id`; `series-values` emits `presets`; `validate-scope-golden` golden docs use new names. Covers VSS Dev Tooling Emits Current Field Names, Domain Adoption Copies The Video Defaults. Verify: `node --test scripts/dev/*.test.mjs` fails.

### Phase 4.2: GREEN

- [ ] 4.4 Edit `<scripts>/build-script-from-draft.mjs` (including the `avatar_resolution` write at `:175`, real-domain review), `<scripts>/build-draft-html.mjs`, `<skill>/draft-template.html`. Verify: 4.1, 4.1a, 4.2 green.
- [ ] 4.5 Edit `scripts/dev/adopt-video-plan.mjs`, `scripts/dev/lib/series-values.mjs`, `scripts/dev/validate-scope-golden.mjs`. Verify: 4.3 green.
- [ ] 4.6 Edit `<skill>/SKILL.md` and `<skill>/references/*`; replace `series-template-convention.md` with a presets reference; document the migration procedure (maintainer runs it on external `video_NN` ONCE, after this change and the companion `2026-11-01-video-folder-contract` both land; plan re-approval needed with zero spend; stale `manifest.json` regenerated by compile; consoles and series-local tool forks regenerated or updated by hand from the report) (real-domain review). Covers VSS Skill Documents Presets, VPH Four-Level Hierarchy, CR (illustrative key only), VSF. Verify: retired-vocabulary scan green.
- [ ] 4.7 Un-gate the retired-vocabulary scan (task 1.5) and fix every remaining hit outside `archive/`. Verify: `node --test test/video-script-no-retired-vocabulary.test.mjs`.

### Phase 4.3: REFACTOR, slice gate and closing

- [ ] 4.8 Refactor: shared legacy-key list between migration lib, draft builder and console loader. Verify: slice 4 tests green.
- [ ] 4.9 Slice gate: `npm run verify:fast`; then hand off `node scripts/verify.js` as the maintainer's full batch gate. Covers all success criteria in proposal.
- [ ] 4.10 Archive-time task (run by sdd-archive, not apply): fix the Purpose text of `video-blueprint` in `openspec/specs/video-blueprint/spec.md` while merging deltas; rename `series-script-templates` to `video-series-folders` in living specs; do not touch `openspec/changes/archive/**`. Verify: `npm run check:openspec`.
- [ ] 4.11 Follow-ups recorded, not implemented: removal of the legacy markers (`series_NN.md`, `series_rules.md`, `script_template.md`) is owned by the companion change `2026-11-01-video-folder-contract` (real-domain review; replaces the earlier `video-legacy-series-markers` idea); nn-mcp `resolve_effective` preset support.
- [ ] 4.12 (real-domain review) Companion hand-off: confirm the companion change imports the design "Naming convention", adds its `layout` step group to the same pipeline without changing the `presets` step contract, is stacked after this change, bumps within the same unreleased `V_0-14-0` train, and is not archived before this one. Verify: companion artifacts reference this change; record in apply-progress.

---

## Slice 5 (optional): Fixture text

- [ ] 5.1 Update illustrative `music_volume` text in nn-core golden fixtures and nn-mcp text (no behaviour change; CR). Verify: `npm run verify:fast`.
