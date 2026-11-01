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

Goal: one resolution mechanism, one naming convention, one breaking bump, no aliases, no conversion.

## Scope

### In Scope
- `Preset` concept replaces `Template`: a named bundle of cascade parameters, no own fields, defined in a scope document (Series, domain Video Defaults, Video), referenced by plain name, resolved nearest-first. Characterisation via preset name plus `tags`.
- `presets` list on every cascade level: applied in order (last wins); element explicit fields beat its presets; lists additive across levels (each level's presets directly under that level's explicit fields).
- Cascade widening: `avatar` settable on Scene/Video/Series/Video Defaults; voice delivery parameters cascade.
- Full rename table below; removals of `tool`, the `model` alias, Video `voice_id`.
- One `blueprint_version` bump to `V_0-14-0`, catalog regeneration, pre-existing drift fixed (`defaults` `parent_spec V_0-13-6`, `draft-template.html:1572`).
- Engine, draft console, `build-script-from-draft`, dev tooling (`adopt-video-plan`, `series-values`), skill docs and tests moved in lockstep.
- Fix `build-script-from-draft.mjs:175`, which writes `avatar_resolution` only for quality `ALTA` and silently drops the chosen resolution otherwise. It applies to drafts produced from now on; no already-produced episode is rewritten.
- SKILL.md states the version boundary: the script format changed in `V_0-14-0`, a document written for an earlier version is rejected, and an old episode is produced with the earlier blueprint version.

### Out of Scope
- Any conversion of existing documents or domain data. This change ships **no migration tool** and no backwards-compatibility aliases: a document written for an earlier blueprint version fails validation. Migrating a domain is not part of this change and no follow-up change is planned for it.
- Layers inside Presets (background layers, HyperFrames effects).
- Renaming `frame`.
- Preset support in nn-mcp `resolve_effective` (stays preset-blind; tracked separately).
- Any nn-core resolver/loader change.
- Rewriting `openspec/changes/archive/**`.
- Folder layout, file naming, master formats and the platform-neutral description file: owned by `2026-11-01-video-folder-contract`, which ships later as its own release.

## Rename table

| Old | New | Note |
|---|---|---|
| `Template` (concept) | `Preset` | no own fields |
| `template::` | `presets::` | list, every cascade level |
| `tts_model` | `voice_model` | |
| `speed` | `voice_speed` | now cascades |
| `emotion` | `voice_emotion` | now cascades |
| (new) | `voice_tone` | authoring guidance only (D6) |
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
- `video-script-model`: remove "Template Concept and `template::` Reference"; rewrite "Tool-Agnostic Script"; "Universal Parameter Cascade" gains preset expansion; "Video Defaults Concept", "Series Concept", "Shared Field Definitions", "Background Audio Is a Field, Not a Layer" use the new names and widened levels, and the Series anchor becomes its scope document.
- `video-blueprint`: concept list (`Preset` for `Template`); "Video-Level Template Field" removed; presenter conditional fields gain `avatar`; renamed fields.
- `cognnitive-video-engine`: "Deterministic Media & TTS Asset Synthesis" (voice params from the cascade); "Stable TTS cache key" (public renames do not change cache identity); "Layer Stacking Uses z_index"; guard evaluates cascaded values.
- `video-script-skill`: draft tools and review console read/write new names; legacy keys are rejected loudly; no migration script.
- `video-production-hierarchy`: Series supplies presets instead of "one script template" (wording only).
- `contextual-resolution`: illustrative `music_volume` scenario key only; no requirement change (resolver untouched).
- `series-script-templates`: **superseded and renamed** to `video-series-folders`. Its name and its first two requirements describe the retired Template-data mechanism; the Template requirements move to `video-presets`, while the surviving two are carried over with their series anchor corrected to the scope document.

## Approach

Approach A from the exploration: a video-side helper loads `# NN Preset` elements from each scope-chain document (via existing `findScopeChain`/`loadChain`), then, before `bagsToChain`, expands each level's `presets` into extra `ScopeNode`s placed immediately before that level's node in list order (ids like `series:preset:Lucas`). The unchanged nn-core `override` fold then yields: last preset wins, explicit beats own presets, nearer levels win, `explain.winner.scope` names the preset. Hard rename with no aliases; one bump.

## Affected Areas

| Area | Impact |
|---|---|
| `iNNfo/specs/bluepriNNts/video-script/spec_NN.md`, `defaults/video-defaults_NN.md` | Modified |
| `<skill>/scripts/` (`scene-compiler`, `lib/knowledge-model`, `lib/video-scope`, `lib/tts-options`, `lib/avatar-jobs`, CLI, estimator, synthesizer, `scene-project`, `build-script-from-draft`, `draft-template.html`) | Modified |
| `<skill>/SKILL.md`, `references/*` (`series-template-convention.md` replaced) | Modified |
| `<skill>/test/**`, `test/video-script-contract-additions.test.mjs` | Modified |
| `scripts/dev/` (`adopt-video-plan`, `lib/series-values`, `validate-scope-golden`) | Modified |
| Both `catalog.json` files | Regenerated |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| TTS cache re-billing if renames leak into `computeHash` | Med | Internal keys frozen; regression test first; defaults stay free of `voice_speed`/`voice_emotion`/`voice_tone` |
| `voice_tone` has no provider mapping | High | Authoring-only by design (D6); never enters the key or the payload |
| Cascaded `avatar`/`intro` rejected by the `conditional_fields` guard before resolution | High | Guard resolves through the expanded chain (D7); scenario test |
| An existing episode is opened with the new engine and fails | High | Intended and documented; SKILL.md names the version boundary and the earlier blueprint version as the way to produce an old episode |
| Draft console or dev tooling keeps an old key and silently stops applying | Med | Legacy keys are rejected loudly (`legacy-draft-keys`) |
| Preset references reported dangling by `validate_knowledge` | High | D1: unbracketed `presets:: [Lucas]`, an option-less select-multiple, verified against the metaschema and the reference validator |

## Rollback Plan

Revert the slice commits on `dev`; the blueprint returns to `V_0-13-11` and the catalog regenerates. No domain data is touched by this change, so there is nothing to restore. No nn-core state to undo.

## Dependencies

- `2026-10-31-video-script-review-console` (V_0-13-11) merged first; `draft-template.html` was just changed there.
- `2026-11-01-video-folder-contract` ships later as its own release (`V_0-14-1`) and is not a dependency of this one. It consumes the naming convention defined in this change's design.

## Success Criteria

- [ ] Cache identity unchanged for equal inputs: a fixture whose effective TTS inputs are expressed with the old names and the same fixture expressed with the new names produce identical `computeHash` values.
- [ ] Resolution scenarios pass RED-then-GREEN: last preset wins; explicit beats own presets; Scene explicit `voice` beats a Video preset; Video explicit beats Video preset; `explain` names the preset.
- [ ] `rg` over the blueprint, skill and dev tooling finds none of the old field names or the `Template` concept outside `archive/`.
- [ ] A document written for an earlier blueprint version is rejected with no alias and no conversion.
- [ ] Guards green: immutability, catalog freshness/parity, metaschema self-describe, field catalogue, legacy-string scans; `node scripts/verify.js` green.

## Delivery

Expected well above 400 changed lines; chained PRs recommended:
1. Spec and contract (spec, defaults, catalogs, delta specs).
2. Engine core (preset loader, expansion, rewiring, removals; cache-key and resolution tests first).
3. Cascade widening and renames (`avatar`, `intro`, `background_audio*`, `z_index`, `voice_*`, guard interaction).
4. Authoring tools and docs (draft console, `build-script-from-draft`, dev tooling, SKILL.md).

## Open Questions (deferred to design)

- Q1: canonical multi-value syntax for `presets`; how a scope-resolved name avoids dangling-reference reports; behaviour for an unknown preset name. (Resolved in design D1 by maintainer decision: unbracketed `presets:: [Lucas, Studio Warm]`.)
- Q3: preset storage (Series document after its first element; multi-element `video-defaults_NN.md`).
- Q5: `voice_tone` semantics (payload, cache key); how cascaded `avatar`/`intro` satisfy `conditional_fields`.

## Proposal question round

Not asked directly (sub-agent). Assumptions for user review:
1. Unknown preset name is a pre-compile error, not a warning.
2. Renaming `series-script-templates` to `video-series-folders` is acceptable.
3. Bump is `V_0-14-0` (breaking).
4. Legacy keys in persisted review state are rejected loudly rather than ignored.
