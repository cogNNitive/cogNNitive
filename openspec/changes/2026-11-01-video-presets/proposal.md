# Proposal: Video Presets

## Intent

The `video-script` bluepriNNt (`V_0-13-11`) carries a `Template` concept that runs parallel to the parameter cascade instead of feeding it. Defects that follow from it:

| Problem | Evidence |
|---|---|
| Parallel mechanism: a flat global `name -> {tool, voice, model, speed, emotion}` map, collisions decided by readdir order, `[[Doc :: Name]]` qualifier ignored | `lib/knowledge-model.mjs:234-279`, `scene-compiler.mjs:148-153` |
| Precedence bug: Template values are spread over the Scene bag after its own fields, so a Template beats the Scene's explicit `voice`/`tts_model`, and a Video-level Template enters at scene precedence (outranking Series and Video values it should sit under), contrary to the living spec | `scene-compiler.mjs:389-398` |
| Duplication: `voice`/`tts_model` exist both as cascade parameters and Template fields | `spec_NN.md` |
| Anomalies: `speed`/`emotion` bypass the cascade (only via `resolvedTemplate` into TTS options); `tool` has no consumer; a legacy `model` alias survives | `lib/tts-options.mjs:36-37`, `knowledge-model.mjs:266`, `scene-compiler.mjs:445` |
| Vocabulary: `template` collides with the deprecated bluepriNNt alias | `iNNfo/specs/vocabulary.json` |
| Inconsistent field names (`music`, `presenter_asset`, `level`, bare `speed`) and Series-only parameters | `spec_NN.md` |

Goal: one resolution mechanism, one naming convention, one breaking bump, no aliases.

## Scope

### In Scope
- `Preset` concept replaces `Template`: a named bundle of cascade parameters, no own fields, defined in a scope document (Series, domain Video Defaults, Video), referenced by plain name, resolved nearest-first. Characterisation via preset name plus `tags`.
- `presets` list on every cascade level: applied in order (last wins); element explicit fields beat its presets; lists additive across levels (each level's presets directly under that level's explicit fields).
- Cascade widening: `avatar` settable on Scene/Video/Series/Video Defaults; voice delivery parameters cascade.
- Full rename table below; removals of `tool`, the `model` alias, Video `voice_id`.
- One `blueprint_version` bump (breaking, proposed `V_0-14-0`), catalog regeneration, pre-existing drift fixed (`defaults` `parent_spec V_0-13-6`, `draft-template.html:1572`).
- Engine, draft console, `build-script-from-draft`, dev tooling (`adopt-video-plan`, `series-values`), skill docs and tests moved in lockstep.
- One-shot migration script for domain data. (real-domain review) It is an ordered pipeline of steps (`--steps presets[,layout]`; this change implements `presets`), selects documents by content rather than `parent_spec.name`, covers Template `model::`/`tts_model::` to `voice_model`, the JSON review state (`config[]`, `videoOverrides`, per-scene overrides, `scenes[].template`), `# NN index` and series blueprint `[[Template]]` listings, reports (never edits) series-local tool forks and off-schema JSON keys, and removes dead marker keys `voice_id::`/`narrator_voice_id::` on `--apply`.
- (real-domain review) Fix `build-script-from-draft.mjs:175`, which writes `avatar_resolution` only for quality `ALTA` and silently drops the chosen resolution otherwise.

### Out of Scope
- Layers inside Presets (background layers, HyperFrames effects).
- Renaming `frame`.
- Preset support in nn-mcp `resolve_effective` (stays preset-blind; tracked separately).
- Any nn-core resolver/loader change.
- Migrating the external `video_NN` domain (only the script is provided).
- Rewriting `openspec/changes/archive/**`.

## Rename table

| Old | New | Note |
|---|---|---|
| `Template` (concept) | `Preset` | no own fields |
| `template::` | `presets::` | list, every cascade level |
| `tts_model` | `voice_model` | |
| `speed` | `voice_speed` | now cascades |
| `emotion` | `voice_emotion` | now cascades |
| (new) | `voice_tone` | semantics in design (Q5) |
| `presenter_asset` | `avatar` | no longer Series-only |
| `intro_asset` | `intro` | |
| `music` | `background_audio` | |
| `music_volume` | `background_audio_volume` | |
| `level` (Layer) | `z_index` | |
| `tool`, `model` alias, Video `voice_id` | removed | |
| `frame`, `voice`, `image_model`, `avatar_model`, `tags` | unchanged | |

Internal TTS `voiceOptions` keys (`model`, `voice`, `speed`, `emotion`) stay unchanged.

## Capabilities

### New Capabilities
- `video-presets`: Preset concept, definition locations, name resolution, `presets` list order, per-level expansion and precedence, `explain` naming the supplying preset.

### Modified Capabilities
- `video-script-model`: remove "Template Concept and `template::` Reference"; rewrite "Tool-Agnostic Script" (voice/model values live in presets or scope documents); "Universal Parameter Cascade" gains preset expansion; "Video Defaults Concept", "Series Concept", "Shared Field Definitions", "Music Is a Scene Field" use the new names and widened levels.
- `video-blueprint`: concept list (`Preset` for `Template`); "Video-Level Template Field" replaced; "Per-Scene music volume" and "Per-Layer presenter model" renamed fields.
- `cognnitive-video-engine`: "Deterministic Media & TTS Asset Synthesis" (voice params from the cascade, not `template::`); "Stable TTS cache key" (public renames do not change cache identity); cost estimation scenario on video-level `template::`.
- `video-script-skill`: draft tools and review console read/write new names; migration script ships; examples (`music_volume`) renamed.
- `video-production-hierarchy`: Series supplies presets instead of "one script template" (wording only).
- `contextual-resolution`: illustrative `music_volume` scenario key only; no requirement change (resolver untouched).
- `series-script-templates`: **superseded and renamed** to `video-series-folders`. Justification: its name and its first two requirements describe the retired Template-data mechanism and use the deprecated `template` term; the Template requirements move to `video-presets`, while the surviving requirements (nested Layer syntax, extension folders) are carried over unchanged.

## Approach

Approach A from the exploration: a video-side helper loads `# NN Preset` elements from each scope-chain document (via existing `findScopeChain`/`loadChain`), then, before `bagsToChain`, expands each level's `presets` into extra `ScopeNode`s placed immediately before that level's node in list order (ids like `series:preset:Lucas`). The unchanged nn-core `override` fold then yields: last preset wins, explicit beats own presets, nearer levels win, `explain.winner.scope` names the preset. Hard rename with no aliases; one bump; a one-shot migration script on the `adopt-video-plan` pattern (dry-run by default).

## Affected Areas

| Area | Impact |
|---|---|
| `iNNfo/specs/bluepriNNts/video-script/spec_NN.md`, `defaults/video-defaults_NN.md` | Modified |
| `<skill>/scripts/` (`scene-compiler`, `lib/knowledge-model`, `lib/video-scope`, `lib/tts-options`, `lib/avatar-jobs`, CLI, estimator, synthesizer, `scene-project`, `build-script-from-draft`, `draft-template.html`) | Modified |
| `<skill>/SKILL.md`, `references/*` (`series-template-convention.md` replaced) | Modified |
| `<skill>/test/**`, `test/video-script-contract-additions.test.mjs` | Modified |
| `scripts/dev/` (`adopt-video-plan`, `lib/series-values`, `validate-scope-golden`) | Modified |
| Both `catalog.json` files | Regenerated |
| Migration script | New |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| TTS cache re-billing if renames leak into `computeHash` | Med | Internal keys frozen; `voice_tone` joins the key only when declared; regression test first |
| `voice_tone` has no provider mapping | High | Design decides payload (Q5); unmapped value must not silently change cost |
| Cascaded `avatar`/`intro` rejected by `checkScript` `conditional_fields` guard before resolution | High | Design (Q5); scenario test |
| Draft console persisted state (`reviewed.json`, quines) keeps old keys and silently stops applying | High | Migration script covers them or loud rejection of legacy keys |
| External `video_NN` broken until migrated (no aliases) | High | Migration script plus documented procedure |
| Ordering: version bump, catalog, guards and spec must land together; cache test before rewiring | Med | Slicing below |
| Preset references reported dangling by `validate_knowledge` | High | Design Q1 before slice 1 (resolved: unbracketed `presets:: [Lucas]`, D1) |
| (real-domain review) Migration repeats paid provider requests on the real domain (TTS model lost, selection by `parent_spec` misses documents, precedence fix changes keys) | High | Cache preservation invariant (success criteria, D9); content-based selection; `voice_model` mapping; before/after cache-identity test on a real-domain-shaped fixture |

## Rollback Plan

Revert the slice commits on `dev`; blueprint returns to `V_0-13-11` and the catalog regenerates. Migrated domain data is reverted from its pre-migration copy (the script writes nothing without an explicit apply flag and reports every change). No nn-core state to undo.

## Dependencies

- `2026-10-31-video-script-review-console` (V_0-13-11) merged first; `draft-template.html` was just changed there.

## Success Criteria

- [ ] Zero re-synthesis: a fixture migrated from V_0-13-11 produces identical TTS cache hashes.
- [ ] (real-domain review) CACHE PRESERVATION (hard constraint): re-running generation from a migrated script never repeats a provider request the cache already satisfies. On the real-domain-shaped fixture the TTS, avatar and image cache identities are identical before and after migration for every scene whose effective inputs did not change; only scenes affected by the documented precedence-bug fix may differ, and the dry-run report lists them. Migrated scripts invalidate `asset_plan.approved.json` (re-estimate and re-approve, zero spend because of cache hits); a pre-migration `manifest.json` is stale and is regenerated by compile.
- [ ] Resolution scenarios pass RED-then-GREEN: last preset wins; explicit beats own presets; Scene explicit `voice` beats a Video preset; Video explicit beats Video preset; `explain` names the preset.
- [ ] `rg` over the blueprint, skill and dev tooling finds none of the old field names or `Template` concept outside `archive/`.
- [ ] Migration script converts every golden/fixture document; a second run is a no-op.
- [ ] Guards green: immutability, catalog freshness/parity, metaschema self-describe, field catalogue, legacy-string scans; `node scripts/verify.js` green.

## Delivery

Expected well above 400 changed lines; chained PRs recommended:
1. Spec and migration contract (spec, defaults, catalogs, delta specs, migration script; requires Q1).
2. Engine core (preset loader, expansion, rewiring, removals; cache-key and resolution tests first).
3. Cascade widening and renames (`avatar`, `intro`, `background_audio*`, `z_index`, `voice_*`, guard interaction).
4. Authoring tools and docs (draft console, `build-script-from-draft`, dev tooling, SKILL.md). Optional fifth: nn-core golden / nn-mcp fixture text.

## Open Questions (deferred to design)

- Q1: canonical multi-value syntax for `presets`; how a scope-resolved name avoids dangling-reference reports; behaviour for an unknown preset name. (Resolved in design D1 by maintainer decision: unbracketed `presets:: [Lucas, Studio Warm]`.)
- Q3: preset storage (Series document after its first element; multi-element `video-defaults_NN.md`).
- Q4: migration vehicle, owner of the external migration, fate of legacy markers (`series_NN.md`, `script_template.md`, `series_rules.md`) (real-domain review: marker removal is owned by the companion change).
- Q5: `voice_tone` semantics (payload, cache key); how cascaded `avatar`/`intro` satisfy `conditional_fields`.

## Proposal question round

Not asked directly (sub-agent). Assumptions for user review:
1. Unknown preset name is a pre-compile error, not a warning (affects Q1).
2. Renaming `series-script-templates` to `video-series-folders` is acceptable.
3. Bump is `V_0-14-0` (breaking).
4. Legacy keys in persisted review state are rejected loudly rather than ignored.
5. (real-domain review) MAINTAINER-CONFIRMABLE: Series scope-marker fields `voice_id::` and `narrator_voice_id::` (4 real markers) have no consumer in the engine, so the migration removes them on `--apply` as dead keys, listing each removal with file and value in the report. Voice comes from Presets or the cascade `voice`. If the maintainer prefers to keep them, the migration reports them and leaves them in place.
6. (real-domain review) `parent_spec` is a pointer, not a version gate: the migration never rewrites it.

## Companion change

(real-domain review) A second change, `2026-11-01-video-folder-contract` (folder layout, file/folder naming, workflow cleanup, single 1920x1920 master, platform-neutral description file, legacy series markers removal, issues #425 and #428), is being planned and MUST be coordinated absolutely with this one. Its content is not designed here.

- The migration script `scripts/dev/migrate-video-presets.mjs` is an ordered pipeline of steps. This change owns step group `presets`; the companion adds step group `layout` and may rename the script to `migrate-video-domain.mjs`. CLI: `--steps presets[,layout]`, with `presets` the only step implemented here; one dry-run report, one atomic apply.
- Both changes ride the same blueprint release: this change bumps to `V_0-14-0` and the companion bumps within the same unreleased train, so neither is merged to main alone (a release-train constraint; chain strategy in design).
- The companion is stacked after this change and may not archive before it.
- Shared vocabulary and naming convention are defined once, in this change (design "Naming convention"); the companion consumes them.
- The real-domain migration is run ONCE, after both changes land.
