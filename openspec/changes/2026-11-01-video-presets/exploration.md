# Exploration: video-presets

Change: replace the `Template` concept of the `video-script` bluepriNNt with `Preset`, widen the cascade, and apply a single naming convention. One breaking change, one `blueprint_version` bump, no backwards-compat aliases.

Worktree: `../cogNNitive-video-presets` (branch `session/video-presets`). Roots below are relative to it.
Blueprint root: `iNNfo/specs/bluepriNNts/video-script/` (spec `V_0-13-11`). Skill root: `<blueprint>/skills/nn-video-script/`.

## Decisions already taken (not to be re-litigated)

1. `Preset` replaces `Template`: a named bundle of cascade parameters with no own fields. Referenced by plain name `[[Lucas]]`, defined in the scope document (Series, domain Video Defaults, Video), resolved nearest-first. `tool` is dropped. Character / environment / look is only the preset name plus the existing `tags` field. The console shows one preset selector.
2. An element carries a LIST `presets`, applied in order, last wins. Explicit fields on the element beat its own presets. Across cascade levels the lists are ADDITIVE: each level's presets sit directly under that level's explicit fields, outer levels first. Known tradeoff: a preset that omits a parameter inherits the previous preset's value.
3. Presets hold parameters only, not Layers (background layers and HyperFrames effects are deferred).
4. Cascade parameters are settable at every level where meaningful (avatar on Scene, `presenter_asset` no longer Series-only, voice delivery parameters cascade).
5. Naming convention: `subject` / `subject_attribute`; file-typed fields are the bare content noun; lists are plural; field names snake_case; values kebab-case; no dots in field names.
6. Renames: `template`->`presets`; `speed`->`voice_speed`; `emotion`->`voice_emotion`; new `voice_tone`; `presenter_asset`->`avatar`; `intro_asset`->`intro`; `level`->`z_index`; `tts_model`->`voice_model`; `music`->`background_audio`; `music_volume`->`background_audio_volume`. Removed: `tool`, the legacy `model` alias read in `scene-compiler.lowerLayer`, Video `voice_id`. `frame` stays.

Resolved by the orchestrator after exploration: cross-level precedence is per-level expansion (decision 2). Multi-value syntax is deferred to design (Q1).

## Current state (verified)

- Template data: `lib/knowledge-model.mjs:234-279` `loadTemplateModels` scans `templates_*_NN.md` in the script dir, 3 ancestors and their immediate subdirs, building one flat `name -> {tool, voice, model, speed, emotion}` map (global namespace, collisions decided by readdir order). `templateRefName` (`scene-compiler.mjs:148-153`) already keeps only the last `::` segment, so the `[[Doc :: Name]]` qualifier is decorative. Legacy `model` alias at `knowledge-model.mjs:266` and `scene-compiler.mjs:445`.
- Cascade: `lib/video-scope.mjs` builds bags `{cli, layer, scene, video, series, domain, blueprint}`; `bagsToChain` (46-58) -> nn-core `ScopeNode`s; `resolve()` runs nn-core `override`. The series bag is the flat merge of every sub-root folder scope's first-element fields (`seriesValuesFromScopeChain`, 142-150). Legacy markers `series_NN.md`, `series_rules.md`, `script_template.md` remain as a fallback (23, 156-163).
- Template consumption (`scene-compiler.lowerKnowledgeModel`, 355-435): a Template's `tts_model`/`voice` are injected into the scene bag (389-398), which is why a Video-level template beats a Series-level `voice`. `speed`/`emotion` travel only through `resolvedTemplate` into `lib/tts-options.mjs:36-37`, which feeds the TTS cache identity. `tool` has no consumer.
- The compiler never resolves `presenter_asset` / `intro_asset`; only `scripts/build-script-from-draft.mjs:164,171` reads the series bag and writes literal `asset::` lines.

## Reference inventory (old names)

| Area | Where | Notes |
|---|---|---|
| Blueprint spec | `<blueprint>/spec_NN.md` | ~44 hits: index 37-42, concepts 67-72, fields 130-149, 174-182, 221-224, 243-272, prose 276-310, 423-444, 466 |
| Blueprint defaults | `<blueprint>/defaults/video-defaults_NN.md` | 4 hits; its `parent_spec` already says `V_0-13-6` (pre-existing drift) |
| Skill scripts | `scene-compiler.mjs` (22), `lib/knowledge-model.mjs` (14), `lib/tts-options.mjs`, `lib/avatar-jobs.mjs` (149-150), `lib/video-scope.mjs`, `video-engine-cli.mjs` (22, 535, 761, 517, 438), `synthesize-avatar.mjs` (35, 133, 119), `asset-cost-estimator.mjs` (287, 349, 358), `asset-synthesizer.mjs` (130-131, 441-443), `scene-project.mjs` (59, 65, 72), `build-script-from-draft.mjs` (153-157, 164, 171, 174, 242-243) | internal property names `layer_*`, `scene_*` appear in ~20 files |
| Draft console | `scripts/draft-template.html` | widgets keyed on `music_volume` (951, 1054, 1189-1214), `speed` (953), `music` (890, 1053, 1210); exports `template::` (1583, 1593), `music`/`music_volume` (1594-1595), `avatar_*` (1612-1613); hardcoded `parent_spec "video-script_V_0-13-11"` (1572) |
| Skill docs | `SKILL.md` (61, 69, 76), `references/series-template-convention.md` (whole file), `references/folder-contract.md` (18-29), `references/cost-guardrails.md` (154, 223) | |
| Skill tests | `test/` : `template-delivery` 17, `model-params` 15, `build-script-from-draft` 16, `knowledge-model-compile` 10, `video-template` 7, `series-scope` 6, `avatar-resolution` 3, `scene-compiler` 2, `scene-project` 3, `animation-layer` 2, `media-staging` 2, `hyperframes-render` 1, `overlay-emission` 1, `sound-events` 1 | ~76 field-name hits + ~66 internal property hits |
| Root test | `test/video-script-contract-additions.test.mjs` | ~11 hits |
| Living OpenSpec | `openspec/specs/`: `video-script-model` (23), `video-blueprint` (11), `cognnitive-video-engine` (9; 147-160 "Template field rename does not re-bill TTS"), `series-script-templates` (8, Template-centric), `contextual-resolution` (2), `video-script-skill` (2), `video-production-hierarchy` (1) | need delta specs |
| Archive | `openspec/changes/archive/2026-10-2*` (~119 hits) | history, MUST NOT be rewritten |
| nn-core fixtures | `video-golden/series/innteresante/*`, `villabotijos-today_scope_NN.md`, `bosco-verticale_*`, `video-golden-blueprint/defaults/video-defaults_NN.md`; `golden.spec.ts`, `resolve.spec.ts`, `fs-elements.spec.ts`, `tests/nested-elements.test.ts:36` | use `music_volume` / `voice_id` as arbitrary scope keys; change only if the golden must mirror the blueprint |
| nn-mcp | `src/tools/resolve-effective.spec.ts`, `src/server.ts:776,811` | illustrative text only |
| Dev tooling | `scripts/dev/lib/series-values.mjs`, `adopt-video-plan.mjs:99-101`, `validate-scope-golden.mjs`, tests | emit old names into new documents; must move in lockstep |
| Catalog | `iNNfo/specs/bluepriNNts/catalog.json:295,305`, `docs/innfo/blueprints/catalog.json:295,305` | regenerate with `scripts/blueprint-catalog.mjs` |

No other blueprint includes `video-script`. The `design-presets` blueprint uses "preset" in an unrelated sense; no collision in the vocabulary file.

## Platform findings that shape the design

1. `[[A]], [[B]]` is NOT a multi-value form. `parsePropertyValue` (`nn-core/src/parser/sections.ts:90-98`) keeps a `[[...]]`-bounded string whole; the per-file validator (`validator/references.ts:226-303`) reports it as a dangling reference; `workspaceReferences.ts:48-72` names it a footgun (`MULTIVALUE_SYNTAX`). `multiple:: true` is allowed only on `type:: select` (`metaschema.ts:239-247`). Only `[ [[A]], [[B]] ]` (with spaces) splits into an array.
2. A plain `[[Name]]` resolves document-locally only (`references.ts:62-102`), so a Scene `presets:: [[Lucas]]` whose Preset lives in the Series scope document is flagged dangling by `validate_knowledge`. `[[Doc :: Name]]` escapes the per-file pass because it contains `::`. To be verified against a real `validate_knowledge` run.
3. `readValuesDoc` (`nn-core/src/scope/fs-layers.ts:35-48`) reads only the first element of the first concept section, so the scope engine will not see `# NN Preset` sections. A video-side helper can parse `elements.Preset` from each chain doc, the domain `video-defaults_NN.md`, the blueprint defaults and the script itself, using `findScopeChain` / `loadChain` that `video-scope.mjs` already uses. No nn-core change is needed for loading.
4. nn-core `resolve` offers `override | union | none | restrict`. `union` merges only `name=value` keyed items; there is no ordered concatenation of plain lists.
5. Smallest viable mechanism (approach A, no nn-core change): before `bagsToChain`, expand each level's `presets` into extra `ScopeNode`s placed immediately before that level's own node, in list order (ids like `series:preset:Lucas`), then call the unchanged `coreResolve(..., 'override')`. Last preset wins, explicit fields beat their level's presets, nearer levels still win, and `explain.winner.scope` names the preset. Cost: nn-mcp `resolve_effective` stays preset-blind (accepted, tracked separately). Approach B (new ordered-list strategy in nn-core) was rejected: engine, validator and mirror rebuilds.

## Migration situation

- No real video domain is reachable from this repo. The real `video_NN` domain, its Template-data documents, `reviewed.json`, draft quines and the `draft_scene_visuals` procedure live outside it. With no aliases they stay broken until migrated.
- No deterministic field-rename migration exists. `skills/nn-upgrade` is agent-guided; nn-core `mutate` has `rename_concept` / `rename_element` but no instance `rename_field`. Only `scripts/dev/adopt-video-plan.mjs` / `lib/series-values.mjs` do video-specific hoisting (dry-run only). A one-shot migration script following the `adopt-video-plan` pattern is the likely vehicle.

## Guards that will fire

- `scripts/guard-template-immutability.js`: any change to `spec_NN.md`, `defaults/**` or `skills/**` needs one strictly greater `blueprint_version` (27-30, 290-329). One bump covers everything.
- Blueprint catalog freshness (`verify.js:595`) and version parity (`verify.js:617`).
- `metaschema-selfdescribe.test.ts:240-246`: the blueprint must stay metaschema-valid (`reference` + `multiple` would fail).
- `bluepriNNt-field-catalogue.test.ts`: the global `tags` field is kept; a `Preset` concept inherits it.
- `no-legacy-tools`, `no-legacy-renderer`, `no-phantom-providers` scan the skill for banned strings; check they do not ban terms this change adds.
- `conditional-fields-drift.test.mjs` is unaffected (no Layer field it names is renamed).
- Pre-existing drift to fix in the same bump: `defaults` `parent_spec V_0-13-6`; `draft-template.html:1572`.

## Risks

- TTS cache re-billing: cache identity is `computeHash(text, voiceOptions)` over keys `model`, `voice`, `speed`, `emotion`, `modelOverride` (`tts-options.mjs`, `asset-synthesizer.mjs:401`). Public renames must keep the internal `voiceOptions` keys unchanged; `voice_tone` joins the key only when declared. A regression test is mandatory (living spec `cognnitive-video-engine` 147-160).
- `voice_tone` has no provider mapping (`asset-synthesizer.mjs:438-444` sends `voice_id`, `speed`, `language`, `emotion`).
- `avatar` / `intro` cascade vs the `checkScript` guard (`scene-compiler.mjs:322-345`, `conditional_fields: presenter: [asset, prompt]`): a presenter Layer with neither would be rejected before the cascaded value could fill it.
- Draft console and persisted review state keep old keys and silently stop applying.
- `level` -> `z_index`: `level:` is also the iNNfo frontmatter key, so search noise is high; the Layer-field rename itself is isolated (`fields.level` in `lowerLayer`).
- `draft-template.html` was just edited by the V_0-13-11 console change; `lib/nn-core.generated.cjs` is a generated mirror (rebuild only if nn-core changes).
- Environment: the primary checkout lacks `node_modules/.bin`, so `npm run build` fails with "'tsc' is not recognized"; invoke `node <root>/node_modules/typescript/bin/tsc` directly, and never run `npm ci` from a worktree (it corrupts the primary's junctioned node_modules).

## Open questions for design

1. Canonical multi-value syntax for `presets`, and how a scope-resolved plain `[[Name]]` avoids being reported dangling (field type, validator exemption, or new nn-core support).
2. (Resolved: per-level expansion.)
3. Storage: does a Series scope document carry `# NN Preset` after its first element, and are Presets in multi-element `video-defaults_NN.md` readable (scope readers take the first element only)?
4. Migration vehicle (one-shot script vs `nn-upgrade` recipe), who migrates the external `video_NN`, and whether the legacy markers `series_NN.md` / `script_template.md` / `series_rules.md` (`video-scope.mjs:23, 156-163`) are also dropped.
5. `voice_tone` semantics (payload and cache key) and how a cascaded `avatar` / `intro` satisfies the `conditional_fields` guard.

## Recommended slicing (chained PRs, ~400-line review budget)

1. Spec and migration contract: `spec_NN.md`, defaults, both catalog files, living-spec deltas, migration script (the version bump and guards force these together; settle Q1 first).
2. Engine core: Preset loader, `bagsToChain` expansion, `scene-compiler` / `knowledge-model` / `tts-options` rewiring (internal TTS keys kept), `tool` and `model`-alias removal, rewrite of `template-delivery`, `model-params`, `knowledge-model-compile`, `video-template` tests; first tests are the cache-key regression and the resolution-order scenarios.
3. Cascade widening and renames: `avatar`, `intro`, `background_audio*`, `z_index`, `voice_*`, the `checkScript` interaction, `scene-project` / `avatar-jobs` / `asset-cost-estimator` / CLI keys, remaining skill tests.
4. Authoring tools: `build-script-from-draft.mjs`, `draft-template.html` (including its hardcoded parent_spec), `adopt-video-plan` / `series-values`, skill references and `SKILL.md`; nn-core golden and nn-mcp fixtures as an optional fifth cleanup PR.
