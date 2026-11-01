# Tasks: Video Presets

Roots: `<bp>` = `iNNfo/specs/bluepriNNts/video-script/`, `<skill>` = `<bp>skills/nn-video-script/`, `<scripts>` = `<skill>scripts/`. Strict TDD: inside each slice, RED (failing test) precedes GREEN (implementation), then REFACTOR. Filtered gate: `node scripts/verify.js --only=<substring>`; fast pass: `npm run verify:fast`; skill tests: `node --test <file>`. Each task group (numbered `S.N`) is one work-unit commit (conventional commits, no AI attribution).

Environment: never run `npm ci` from a worktree. If a build is needed, call `node <repo>/node_modules/typescript/bin/tsc` directly. No nn-core change and no mirror rebuild are planned. Do not edit `openspec/changes/archive/**`.

**No conversion tool.** This change ships no migration script, no aliases and no deprecation window. A document written for an earlier blueprint version fails validation, and that is the intended outcome. Do not add a compatibility path, a `--migrate` flag, or a "convert old keys" helper anywhere.

Spec shorthand: VP = video-presets, VSM = video-script-model, VB = video-blueprint, VE = cognnitive-video-engine, VSS = video-script-skill, VPH = video-production-hierarchy, CR = contextual-resolution, VSF = video-series-folders, SST = series-script-templates (removed).

## Review Workload Forecast

| Slice | Est. changed lines | 400-line budget risk | Chained PRs recommended |
|---|---|---|---|
| 1 Contract | 400-650 | High | Yes |
| 2 Engine core | 800-1200 | High | Yes |
| 3 Widening + renames | 350-650 | High | Yes |
| 4 Authoring + docs | 450-800 | High | Yes |
| **Total** | **2000-3300** | **High** | **Yes** |

Decision needed before apply: No (the scope question was answered: no migration, no alias).
Chained PRs recommended: Yes.
Chain strategy: slices 1 and 2 share a branch (PR 1 = 1+2, base `dev`); PR 2 = slice 3 (base PR 1); PR 3 = slice 4 (base PR 2).

Release constraint: slice 1 publishes a spec whose fields the engine does not yet read, so **slices 1 and 2 land together**. After an actual release puts `V_0-14-0` on `main`, any later touch of `spec_NN.md`/`defaults/**`/`skills/**` needs a strictly greater version (`guard-template-immutability` compares against the merge-base with `origin/main`). The bump therefore lands exactly once, in slice 1.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Spec contract, version bump, catalogs | PR 1 (with slice 2) | engine still reads old names until 2.7-2.10; that is why 1 and 2 share a PR |
| 2 | Preset loader, expansion, Template removal, cache-key proof | PR 1 | same branch as unit 1 |
| 3 | Cascade widening, guard, renames | PR 2 | base = PR 1 branch |
| 4 | Authoring tools, dev tooling, docs | PR 3 | base = PR 2 branch |

---

## Slice 1: Contract

### Phase 1.0: Spec hygiene

- [ ] 1.1 Run `openspec validate 2026-11-01-video-presets` and `npm run check:openspec` against this change's 9 delta specs; fix any structural error. Verify: both exit 0.
- [ ] 1.2 Reconcile `tags` on Preset: VP "Preset Is A Parameters-Only Concept" allows `tags`; design D2 says any other key is `preset-field`. Confirm the design text and the planned `PRESET_PARAMETERS` allow `tags` and the reserved `slug`, and that neither alters a resolved value. Verify: re-read of D2 matches the spec scenario.
- [ ] 1.3 Read `lowerLayer` (`<scripts>/scene-compiler.mjs:452`, `layer_level: fields.level`) and its consumers (`<scripts>/scene-project.mjs:53-65`). Internal property becomes `layer_z_index`, coerced with `Number()` exactly as `layer_level` is today; the emitted number is unchanged, so the emit-guard hash does not move. Record in design D5. Covers VE Layer Stacking Uses z_index. Verify: note in design.md.

### Phase 1.1: RED

- [ ] 1.4 Create `test/video-script-contract-additions.test.mjs`: `Preset` concept present with no own fields; `Template` absent; `presets` is `select`/`multiple`/no options on `[Video, Scene, Series, Video Defaults]`; the field table of design matches `spec_NN.md` (renames, `z_index` on Layer only, `avatar` not on Layer); `tags` allowed on Preset; defaults free of `voice_speed`/`voice_emotion`/`voice_tone`/`presets`/Preset elements; `presenter` `conditional_fields` is `[asset, prompt, avatar]`. Covers VB, VP, VSM. Verify: `node --test test/video-script-contract-additions.test.mjs` fails.
- [ ] 1.5 Add `test/video-script-no-retired-vocabulary.test.mjs`: walks `<bp>` and `scripts/dev/`, excluding `openspec/changes/archive/**`, and fails on `template::`, `tts_model`, `presenter_asset`, `intro_asset`, `music_volume`, `# NN Template`, bare Layer `level::`. Mark `todo`-gated until slice 4 and un-gate in 4.7. Covers VSS Skill Documents Presets And Carries No Retired Vocabulary, VP Template Concept Is Retired. Verify: red on a planted name.

### Phase 1.2: GREEN

- [ ] 1.6 Edit `<bp>spec_NN.md`: `blueprint_version` -> `V_0-14-0`; replace `Template` with `Preset`; add `presets`; apply the Field Definitions table (renames, widened `concept::` lists, defaults `voice_model`, `background_audio_volume`, no `voice_speed`/`voice_emotion`/`voice_tone` defaults); `z_index` on Layer; `avatar_model`/`fit` widened; `avatar_resolution` Layer; presenter `conditional_fields` -> `[asset, prompt, avatar]`; remove the eleven retired names; reword Tool-Agnostic guidance. Covers VB, VSM, VP. Verify: 1.4 green except guard cases (slice 3).
- [ ] 1.7 Edit `<bp>defaults/video-defaults_NN.md`: fix the pre-existing drift (`parent_spec` `V_0-13-6` -> `V_0-14-0`), rename `tts_model` -> `voice_model` and `music_volume` -> `background_audio_volume`. Covers VB Blueprint Version Bump And Catalog Parity. Verify: 1.4 green.
- [ ] 1.8 Edit `<scripts>/scene-compiler.mjs` `DEFAULT_CONDITIONAL_FIELDS` only (presenter -> `[asset, prompt, avatar]`) in lockstep with 1.6. Verify: `node scripts/verify.js --only=conditional-fields-drift`.
- [ ] 1.9 Add the version substitution to `<scripts>/build-draft-html.mjs` and replace the literal at `<skill>/draft-template.html:1572` with its placeholder; add the assertion that the template carries no literal `video-script_V_`. Covers VB Blueprint Version Bump And Catalog Parity. Verify: `node --test` on the draft-html test.
- [ ] 1.10 Identify skill tests under `<skill>/test/` that read renamed spec fields or `video-defaults` keys and would break at the bump; rewrite only those needed to keep `node scripts/verify.js` coherent for slices 1-2, defer the rest explicitly to 3.7 in `apply-progress`. Verify: `npm run verify:fast`.

### Phase 1.3: Release guards

- [ ] 1.11 Regenerate both catalog files via `node scripts/blueprint-catalog.mjs` (freshness `verify.js:595`, parity `:617`). Verify: `node scripts/verify.js --only=catalog`.
- [ ] 1.12 Run `node scripts/guard-template-immutability.js`; confirm green with `V_0-14-0` and no edit to a published `_V_x-y-z_` file. Verify: exit 0.
- [ ] 1.13 Run `metaschema-selfdescribe.test.ts`, `bluepriNNt-field-catalogue.test.ts` and the `no-legacy-*` scans. Verify: `--only=metaschema`, `--only=field-catalogue`, `--only=no-legacy`.

---

## Slice 2: Engine core (cache-key and resolution tests first)

### Phase 2.1: RED (in this order)

- [ ] 2.1 TTS cache-key regression: the same effective voice inputs expressed with the old field names and with the new names produce identical `computeHash`/`buildTtsVoiceOptions`; `speed` stays `Number()`, `emotion` trimmed; defaults contain no `voice_speed`/`voice_emotion`/`voice_tone`. New `<skill>/test/preset-cache-identity.test.mjs`. Covers VE Stable TTS cache key, VE Voice Parameters Resolve Through The Cascade. Verify: fails.
- [ ] 2.2 Resolution order: last preset wins; explicit beats own presets; Scene `voice` beats Video preset; Video explicit beats Video preset; inner preset beats outer explicit; a Video preset sits under Video explicit and above Series (fixes the precedence bug). New `<skill>/test/preset-resolution.test.mjs`. Covers VP Per-Level Additive Expansion Order, VSM Universal Parameter Cascade. Verify: fails.
- [ ] 2.3 Lookup and errors: nearest-first, shadowing, case-insensitive name or slug, `unknown-preset` (lists searched docs), `preset-syntax` (`[[`, `]]`, `::`), `preset-section-order`, `preset-duplicate` (document and repeated name in one list), `preset-field` (allows `tags` and `slug`; rejects `presets`, `type`, `asset`, `title`). New `<skill>/test/preset-lookup.test.mjs`. Covers VP The presets Field And Its Syntax, Definition Locations And Lookup Order, Invalid Preset References Fail Before Spend. Verify: fails.
- [ ] 2.4 Additive lists: `components`/`sounds` union across levels, series folders, preset nodes; series `presets` concatenated outer to inner; the blueprint never expands presets. Covers VP Per-Level Additive Expansion Order, VSF. Verify: fails.
- [ ] 2.5 `explain.winner.scope` names `scene:preset:X` and `doc` is the defining document; `preset-parameters-drift` test vs `spec_NN.md` (pattern of `conditional-fields-drift.test.mjs`). Covers VP Explain Names The Supplying Preset, Preset Resolution Needs No nn-core Change. Verify: fails.
- [ ] 2.6 Engine rejects the retired mechanism: no `templates` option, no `tool`, no `model` alias, `template::` rejected loudly, and a document written for an earlier version fails with no conversion offered. Covers VE Template Mechanism Is Removed From The Engine, VSM Retired Field Names Are Rejected. Verify: fails.

### Phase 2.2: GREEN

- [ ] 2.7 Create `<scripts>/lib/presets.mjs`: `PRESET_PARAMETERS`, `parsePresetList`, `loadPresetIndex`, `lookupPreset`, error classes; enforce D2/D3. Verify: 2.3 green.
- [ ] 2.8 Edit `<scripts>/lib/video-scope.mjs`: `presetIndex` bag key, `PRESET_LEVELS`, `bagsToChain` expansion, `loadCascadeBags`, `withScriptPresets`, series `presets` concatenation in `seriesValuesFromScopeChain`. Verify: 2.2, 2.4, 2.5 green.
- [ ] 2.9 Edit `<scripts>/scene-compiler.mjs`: delete `templateRefName`/`videoTemplate`/`resolvedTemplate`/scene-bag injection (`:364-398,415-416`), drop the `model` alias (`:445`); scene resolves `voice_model`, `voice`, `voice_speed`, `voice_emotion`, `voice_tone` from `sceneBags`; `layer_z_index` from `fields.z_index`. Verify: 2.1, 2.2 green.
- [ ] 2.10 Edit `<scripts>/lib/knowledge-model.mjs` (remove `loadTemplateModels`, `tool`, `model` alias `:266`), `<scripts>/lib/tts-options.mjs` (read the lowered `scene_voice_model` etc., keep internal option keys, never read `voice_tone`), `<scripts>/video-engine-cli.mjs` (remove the `templates` option `:535,761`; wire presets). Verify: 2.1, 2.6 green.
- [ ] 2.11 Rewrite the existing tests `template-delivery`, `model-params`, `knowledge-model-compile`, `video-template`, `series-scope` to presets (delete Template-only cases). Verify: `node --test` per file.

### Phase 2.3: REFACTOR and slice gate

- [ ] 2.12 Refactor: remove dead Template helpers and imports; one preset-node builder shared by loader and expansion. Verify: all slice 2 tests green.
- [ ] 2.13 Slice gate: confirm no nn-core or `lib/nn-core.generated.cjs` diff; `npm run verify:fast`. Covers VP Preset Resolution Needs No nn-core Change.

---

## Slice 3: Cascade widening + renames

### Phase 3.1: RED

- [ ] 3.1 Guard: a presenter Layer without `asset` passes `checkScript` when Scene, Series, Video, Video Defaults or a Preset supplies `avatar`; fails with a clear error when none does; the guard still runs before any spend and aggregates `unknown-preset`/`preset-syntax`/`preset-field`. Covers VE Pre-Compile Guard Evaluates Cascaded Values, VSM Presenter Layer Requires A Source, VB Presenter Conditional Fields Include Avatar. Verify: fails.
- [ ] 3.2 `lowerLayer`: presenter `layer_asset_source` = `fields.asset` else the resolved `avatar`. Verify: fails.
- [ ] 3.3 `z_index` paint order (two Layers, 1 and 3) and `level` ignored; `background_audio`/`background_audio_volume` resolution at Video, Scene, Preset; `intro`, `image_model`, `transition`, `frame`, `fit` widened per the Field Definitions table. Covers VE Layer Stacking Uses z_index, VSM Cascade Parameters Settable Where Meaningful, VSM Background Audio Is a Field. Verify: fails.
- [ ] 3.4 `voice_tone` cascades and presets but never enters `voiceOptions`/cache key/payload; cost estimator and avatar job key unchanged for the renamed fields. Covers VE Voice Tone Is Authoring Guidance Only, VE Interactive Provider Consultation and Cost Estimation. Verify: fails.

### Phase 3.2: GREEN

- [ ] 3.5 Edit `<scripts>/scene-compiler.mjs` (cascade-aware guard via `assignLayersToScenes`, `lowerLayer`), `<scripts>/lib/avatar-jobs.mjs`, `<scripts>/synthesize-avatar.mjs`. Verify: 3.1, 3.2 green.
- [ ] 3.6 Edit `<scripts>/asset-cost-estimator.mjs`, `<scripts>/asset-synthesizer.mjs`, `<scripts>/scene-project.mjs` (`layer_z_index`, `background_audio*`, `avatar`). Verify: 3.3, 3.4 green.
- [ ] 3.7 Rename remaining skill tests to the new field names (`music_volume` -> `background_audio_volume`, `presenter_asset` -> `avatar`, `level` -> `z_index`). Verify: `node --test <skill>/test/*.test.mjs`.

### Phase 3.3: REFACTOR and slice gate

- [ ] 3.8 Refactor: one cascade-resolve helper shared by the guard and the compile path. Verify: slice 3 tests green.
- [ ] 3.9 Slice gate: `rg` the engine scripts for retired names (expect none); `npm run verify:fast`.

---

## Slice 4: Authoring tools, dev tooling, docs

### Phase 4.1: RED

- [ ] 4.1 `build-script-from-draft`: writes `presets:: [..]`, no presenter `asset::`, resolves `intro` through the cascade into the fixed scene's background `asset::`; rejects legacy draft keys with `legacy-draft-keys` naming the script; never converts them. Covers VSS Blueprint-Ships Draft Authoring Tools, Legacy Keys In Persisted State Are Rejected. Verify: `node --test` fails.
- [ ] 4.2 RED first: a draft whose quality is not `ALTA` with a chosen resolution of `480p` makes `build-script-from-draft` emit `avatar_resolution:: 480p` on the presenter Layer (today `build-script-from-draft.mjs:175` writes it only for `ALTA` and silently drops the choice); `ALTA` behaviour is unchanged; `choice.model` is not rejected as a legacy key. The fix applies to drafts produced from now on and rewrites no existing script. Covers VSS Chosen avatar resolution is kept for any quality. Verify: `node --test` fails, then green with 4.5.
- [ ] 4.3 Console: one preset selector per element (VP Console Draft Tool Offers One Preset Selector); exports the new keys; the console loader fails with `legacy-draft-keys`. Verify: fails.
- [ ] 4.4 Dev tooling: `adopt-video-plan` hoists `voice` not `voice_id`; `series-values` emits `presets`; `validate-scope-golden` golden docs use the new names. Covers VSS Dev Tooling Emits Current Field Names. Verify: `node --test scripts/dev/*.test.mjs` fails.

### Phase 4.2: GREEN

- [ ] 4.5 Edit `<scripts>/build-script-from-draft.mjs` (including the `avatar_resolution` write at `:175`), `<scripts>/build-draft-html.mjs`, `<skill>/draft-template.html`. Verify: 4.1, 4.2, 4.3 green.
- [ ] 4.6 Edit `scripts/dev/adopt-video-plan.mjs`, `scripts/dev/lib/series-values.mjs`, `scripts/dev/validate-scope-golden.mjs`. Verify: 4.4 green.
- [ ] 4.7 Edit `<skill>/SKILL.md` and `<skill>/references/*`; replace `series-template-convention.md` with a presets reference; add the version boundary (format changed in `V_0-14-0`; a document written for an earlier version is rejected; an old episode is produced with that version's blueprint). Do not document a migration procedure: none exists. Covers VSS Skill Documents Presets, VPH Four-Level Hierarchy, CR (illustrative key only), VSF. Verify: retired-vocabulary scan green.
- [ ] 4.8 Un-gate the retired-vocabulary scan (task 1.5) and fix every remaining hit outside `archive/`. Verify: `node --test test/video-script-no-retired-vocabulary.test.mjs`.

### Phase 4.3: REFACTOR, slice gate and closing

- [ ] 4.9 Refactor: one shared legacy-key list between the draft builder and the console loader. Verify: slice 4 tests green.
- [ ] 4.10 Slice gate: `npm run verify:fast`; then hand off `node scripts/verify.js` as the maintainer's full batch gate.
- [ ] 4.11 Archive-time task (run by sdd-archive, not apply): fix the Purpose text of `video-blueprint` in `openspec/specs/video-blueprint/spec.md` while merging deltas; rename `series-script-templates` to `video-series-folders` in living specs; do not touch `openspec/changes/archive/**`. Verify: `npm run check:openspec`.
- [ ] 4.12 Follow-ups recorded, not implemented: nn-mcp `resolve_effective` preset support; removal of the legacy markers (`series_NN.md`, `series_rules.md`, `script_template.md`) is owned by `2026-11-01-video-folder-contract`.
