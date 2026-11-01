# Design: Video Presets

Change: `2026-11-01-video-presets`. Inputs: `exploration.md`, `proposal.md`. Roots: `<bp>` = `iNNfo/specs/bluepriNNts/video-script/`, `<skill>` = `<bp>skills/nn-video-script/`.

## Technical Approach

Approach A, as fixed by the proposal. A video-side module loads `# NN Preset` elements into a **preset index**. `bagsToChain` expands each level's `presets` into extra `ScopeNode`s, each placed directly under that level's own node. The unchanged nn-core `override` fold then resolves every parameter. No nn-core source changes, and `lib/nn-core.generated.cjs` is not rebuilt. One breaking bump to `V_0-14-0` and a hard rename with no aliases. A dry-run-first migration script handles domain data.

## Decisions

### D1 (Q1): `presets` is an open-vocabulary multi-select of bare names

| Option | Evidence | Verdict |
|---|---|---|
| `type:: reference` + `[[Name]]` | `multiple:: true` requires `select` (`schema/metaschema.ts:239-247`); plain `[[Name]]` resolves document-locally only and is an `error` (`validator/references.ts:295-302`) | Rejected |
| `type:: string` holding `[[A]], [[B]]` | Not reference-validated, but `recursiveParser/relationships.ts:119-138` warns "could not be resolved" for any string field containing `[[`. `[[A]], [[B]]` is the documented footgun (`workspaceReferences.ts:68-72`) | Rejected |
| select-multiple holding `[ [[A]], [[B]] ]` | Only splits with the inner spaces: `[[[A]]]` starts with `[[` and is kept whole (`parser/sections.ts:91-98`). A single `[[A]]` stays a string and gets the `relationships.ts` warning | Rejected (fragile) |
| **`type:: select`, `multiple:: true`, no `options`; value `[Lucas, Studio Warm]`** | The same shape as `components`/`sounds`/`tags`, which already pass metaschema self-describe. `validateFieldValue` checks options only when declared (`schema/field-values.ts:42`). No `[[` means no reference, edge or dangling pass. Unbracketed `A, B` gets the `MULTI_VALUE_UNBRACKETED` warning | **Chosen** |

- Canonical form: `presets:: [Name, Other Name]`. A single bare `presets:: Name` is accepted.
- The video reader `parsePresetList(value)` takes an array (from `read_knowledge` JSON) or a string (from the skill's raw reader).
- A token containing `[[`, `]]` or `::` is a `preset-syntax` error whose hint gives the canonical form. This is the only syntax supported, with no alias.
- Unknown name: an `unknown-preset` error from `checkScript`, before any spend (proposal assumption 1). The error lists the documents searched.
- **No nn-core change needed.** Cost: `validate_knowledge` does not check that a preset name exists. That check belongs to the engine guard, which is acceptable for a scope-resolved name.
- **Decided by the maintainer (real-domain review):** `presets` is written WITHOUT wiki-link brackets, as `presets:: [Lucas, Studio Warm]`. Exploration decision 1 wrote `[[Lucas]]`; that notation is superseded and appears nowhere as the preset reference syntax. The legacy `[[Doc :: Name]]` survives only as the migration source (D8). The bracketed alternative (an nn-core flag exempting scope-resolved names from `references.ts`/`relationships.ts`, plus a `nn-core.generated.cjs` rebuild) is not pursued.

### D2: Preset concept shape

- `Preset` is a `list` Concept with no fields of its own. Its elements may carry only **preset parameters**: the fields whose `concept::` lists `Preset` (table below).
- The engine vendors that set as `PRESET_PARAMETERS`. A drift test checks it against `spec_NN.md`, following the `conditional-fields-drift.test.mjs` pattern.
- Any other key is a `preset-field` error. This covers `presets` (no composition, so no cycles), `type`, `asset` and `title`.
- `slug` is exempt from `preset-field` (real-domain review): it is the reserved identity key every element carries, and migrated Preset elements keep the `slug::` their Template had. Lookup by slug (D3) depends on it. `PRESET_PARAMETERS` does not list `slug`; the check skips reserved identity keys instead, and the drift test treats them the same way.
- Two Presets with the same name or slug in one document are a `preset-duplicate` error. A name listed twice in one `presets` list is also an error.

### D3 (Q3): Storage and lookup

| Source (nearest first) | Location | Constraint |
|---|---|---|
| Script | `# NN Preset` section of the Video document | none |
| Series | each folder scope document of the chain (`findScopeChain`/`loadChain`, `nodes.slice(1)`), innermost first; the legacy `series_NN.md` when it supplied the series bag | `readValuesDoc` reads the first element of the first concept section (`scope/fs-layers.ts:35-48`). The `# NN Preset` section therefore MUST follow the Series section. The loader raises `preset-section-order` if the first concept section is `Preset` |
| Domain | `<root>/video-defaults_NN.md` | `documentFields` selects `Video Defaults` by concept (`video-scope.mjs:100-105`), so section order does not matter |
| Blueprint | none | the package ships no Preset and no `presets`. A test enforces this, so the `floor` node never needs expansion |

- One lookup order applies to every reference, whatever level it comes from: script, then series innermost to outermost, then domain. The first match wins (case-insensitive name, or slug).
- A deeper definition shadows an outer one with the same name. This is intended: a Video-local `Lucas` redefines `Lucas` for that episode, including where a Series-level reference uses it.
- Series flattening is kept: the bag is still one merged `series` level. `seriesValuesFromScopeChain` concatenates `presets` from outer to inner instead of replacing it.
- Known tradeoff: an outer folder's explicit field beats an inner folder's preset.

### D4: Expansion algorithm (`lib/video-scope.mjs`, new `lib/presets.mjs`)

Bags keep their shape `{cli, layer, scene, video, series, domain, blueprint}` and gain one reserved key, `presetIndex`. It is not a level, so `bagsToChain` already ignores it as a level and spreading carries it along. `loadCascadeBags` fills it from series and domain. `withScriptPresets(bags, model)` prepends the script source.

```js
const PRESET_LEVELS = new Set(['domain', 'series', 'video', 'scene']); // layer, cli: explicit only
export function bagsToChain(bags = {}) {
  const floor = bags.blueprint ? node('blueprint', null, bags.blueprint) : null; // no presets (D3)
  const nodes = [];
  for (const level of ['domain', 'series', 'video', 'scene', 'layer', 'cli']) {
    const bag = bags[level];
    if (!bag) continue;
    if (PRESET_LEVELS.has(level)) {
      for (const name of parsePresetList(bag.presets)) {          // list order: last wins
        const def = lookupPreset(bags.presetIndex, name);          // throws UnknownPresetError
        nodes.push(node(`${level}:preset:${def.name}`, def.doc, def.values));
      }
    }
    nodes.push(node(level, null, omit(bag, 'presets')));          // explicit beats own presets
  }
  return { floor, nodes };
}
```

- `explain.winner.scope` then names the source, for example `series:preset:Lucas`, and `doc` is the defining document.
- `scene-compiler.mjs:364-398,415-416` (`templateRefName`, `videoTemplate`, `resolvedTemplate`, the scene-bag injection) is deleted. The scene resolves `voice_model`, `voice`, `voice_speed`, `voice_emotion` and `voice_tone` from the same `sceneBags` as every other parameter.
- This fixes the precedence bug: an explicit Scene `voice` now beats any preset, and a Video preset now sits under explicit Video fields instead of at scene level.
- `loadTemplateModels`, the `templates` option (`video-engine-cli.mjs:535,761`), `tool`, and both `model` aliases (`knowledge-model.mjs:266`, `scene-compiler.mjs:445`) are removed.

### D5: TTS cache identity unchanged

- `buildTtsVoiceOptions` reads the lowered `properties` and keeps the internal keys `model`, `voice`, `speed`, `emotion` and `modelOverride`.
- `speed` keeps today's coercion: `Number()`, only when finite and non-empty. `emotion` keeps today's trim, only when non-empty. A string `"1.1"` would change `_deterministicStringify`.
- `voice_speed`, `voice_emotion` and `voice_tone` MUST NOT appear in the blueprint defaults. Otherwise every key gains a value and all narration is billed again. A test enforces this.
- Internal `properties` names follow the public renames (`scene_voice_model`, `scene_background_audio_volume`, `layer_z_index`). They do not feed any hash I could find: the hashes are TTS options, the avatar job key, the prompt plus options, and `bgmusic:<file>`.

### D6 (Q5a): `voice_tone` is authoring guidance only

`asset-synthesizer.mjs:438-444` sends `voice_id`, `speed`, `language` and `emotion` only, and no provider accepts a tone. A value that changes no audio must not enter the cache key (that would bill again for identical audio) or the payload (it would be ignored). `voice_tone` therefore cascades, presets and shows in the console and draft prompts, and the engine never reads it into `voiceOptions`. If a provider mapping arrives later, it joins under the same "only when declared" rule.

### D7 (Q5b): Guard semantics change for cascaded `avatar`

- `validation.conditional_fields.presenter` becomes `[asset, prompt, avatar]`, and `DEFAULT_CONDITIONAL_FIELDS` changes in lockstep (the drift test fires).
- `checkScript(model, {bags})` evaluates each required name against the Layer's explicit fields. For a cascade parameter missing there, it resolves the name through the expanded chain (bags plus video plus owning scene via `assignLayersToScenes`).
- Resolution is pure and offline, so the guard still runs before any spend. `checkScript` also aggregates `unknown-preset`, `preset-syntax` and `preset-field` errors.
- `lowerLayer` sets the presenter's `layer_asset_source` to `fields.asset` if present, else the resolved `avatar`.
- `build-script-from-draft` stops writing a literal presenter `asset::`.
- `intro` has no compiler consumer and gets none. `build-script-from-draft` resolves it through the cascade and writes the fixed scene's background `asset::`. This is unchanged except for the name.
- Rejected: resolving before the guard by moving `checkScript` after lowering. That reorders a documented invariant for no gain.

### D8 (Q4): Migration vehicle

- **Vehicle:** `scripts/dev/migrate-video-presets.mjs`. Its pure core is `scripts/dev/lib/video-presets-migration.mjs`, following the `adopt-video-plan` pattern.
- **Rejected:** `nn-upgrade`. It is agent-guided and non-deterministic, and has no `rename_field` primitive.
- **CLI:** `node scripts/dev/migrate-video-presets.mjs <domain-dir> [--steps presets[,layout]] [--apply] [--json]`. Dry run is the default and writes nothing. Exit 1 on any conflict. `--apply` is all-or-nothing. (real-domain review) The script is an ORDERED PIPELINE OF STEPS: this change owns step group `presets` and is the only one implemented here; `--steps` defaults to `presets`, and an unknown or not-yet-implemented step group is a usage error. All selected steps share one document scan, produce ONE dry-run report and commit ONE atomic apply (see "Companion change").
- **Files covered (real-domain review):** selected by CONTENT, not by `parent_spec.name`. Real scripts and scope markers carry `parent_spec.name: "video-script"` without a version, older ones `<series>_V_0-1-0`, so a version prefix test misses them. A `*.md` document under the domain is selected when it contains any of: a `# NN Template` section, a `template::` field, a `# NN Video` or `# NN Scene` element, or a scope marker (a `# NN Series` element). The root `video-defaults_NN.md` is always selected. Ignored directories and files: `archive`, `.bak*`, `node_modules`, `renders`, `_tmp_*`. Selection never reads `parent_spec`. Selected and unselected documents are both counted in the report.

**Rewrites:**

| Rewrite | Rule |
|---|---|
| Field renames | `tts_model`→`voice_model`, `music`→`background_audio`, `music_volume`→`background_audio_volume`, `presenter_asset`→`avatar`, `intro_asset`→`intro`, Template `speed`/`emotion`→`voice_speed`/`voice_emotion`, Layer-only `level::`→`z_index::` (frontmatter `level:` untouched) |
| Layer `model::` | becomes `avatar_model::` when that field is absent. If both are present, `model` is dropped and reported |
| Template `model::` / `tts_model::` (real-domain review) | in a `# NN Template` element, both map to `voice_model::`, value preserved byte-for-byte, including provider-prefixed ids such as `edge-tts/neural` or `replicate/minimax/...`. Without it the TTS model silently falls back to the default and edge-tts voices break. If a Template declares both keys with different values it is a conflict (no writes); with equal values one is dropped and reported. The Layer-vs-Template distinction comes from the owning concept section, never from the key alone |
| `template::` | `template:: [[Doc :: Name]]` or `Name` becomes `presets:: [Name]` (last `::` segment) |
| Template data | `# NN Template` elements become `# NN Preset`, keep their `slug::`, are **moved** into the innermost scope document covering the templates file's folder (else `series_NN.md`, else the domain `video-defaults_NN.md`), and are appended after the first section. (real-domain review) When the `templates_*_NN.md` file itself holds the `# NN Series` element, it is its own target: the Presets are appended after the Series section in place. The `templates_*` file is NEVER deleted; the report lists it as now holding only the Series element |
| Index (real-domain review) | in the `# NN index` of every migrated document AND of every series blueprint `spec_NN.md` that lists them, `* [[Template]]` becomes `* [[Preset]]`. The `# NN Series` element (tone, sound_tags) stays in place |
| Removed fields | `tool` and Video `voice_id` are dropped and reported. `voice_id` is **not** converted to `voice`, because that would change resolution and bill again |
| Scope-marker voice keys (real-domain review) | Series fields `voice_id::` and `narrator_voice_id::` (4 real markers) have no consumer in the engine. The migration REPORTS each (file, key, value) and, on `--apply`, REMOVES it as a dead key; the report lists every removal so nothing is lost silently. Voice comes from Presets or the cascade `voice`. The guard-config voice registry entry is reported as informational only and is never edited. The removal is a maintainer-confirmable assumption (proposal) |
| Version | (real-domain review) `parent_spec` is left UNTOUCHED: it is a pointer, not a version gate. A plain `video-script` is never rewritten to a versioned name, and a versioned one is not bumped. The blueprint version lives in `spec_NN.md` and the defaults document (slice 1) only |
| JSON drafts | `*_reviewed.json` / draft `*.json`: see "JSON review state" below |
| Series-local tool forks (real-domain review) | `series/*/tools/` copies of skill tools (for example `build-review-console.mjs`, `build-draft-html.mjs`, `build-script-from-draft.mjs`, copies of `draft-template.html`) are invisible to rename logic and keep emitting old names. The report LISTS each (path plus the old keys it mentions) and never edits or deletes it |
| HTML consoles | quine consoles are listed for regeneration and not edited |

**JSON review state (real-domain review).** The draft JSON stores config as `config[] = {key, value, origin, type}` (keys such as `tts_model`, `speed`, `emotion`, `music`, `music_volume`, and off-schema `narrator_voice`, `avatar_image`, `avatar_resolution_hook`), plus `videoOverrides{}` and per-scene override keys; reviewed JSON has `scenes[].template`. The migration rewrites `config[].key`, `videoOverrides` keys, per-scene override keys (all through the same rename table, including `tts_model`→`voice_model`, `speed`→`voice_speed`, `emotion`→`voice_emotion`, `music*`→`background_audio*`) and `scenes[].template`→`presets` (a one-element list). It MUST NEVER rename `scenes[].choice.model`: that is an AVATAR model id, not the retired Template alias. Off-schema keys (`narrator_voice`, `avatar_image`, `avatar_resolution_hook`, and any other unknown config key) are REPORTED with their location and left unchanged, not converted.

- **Conflicts (no writes):** two moved Presets with the same name landing in one target, or no target document.
- **Precedence warnings:** a Scene with an explicit `voice`/`tts_model` that differs from its Template's value. That scene's cache key will change, which is intended under the fixed precedence.
- **Idempotence:** a second run reports zero changes. A test enforces this.
- **Legacy key rejection:** engine and tools reject legacy keys loudly. `build-script-from-draft` and the console loader fail with `legacy-draft-keys` and name the script.
- **Plan approval:** the approval hash covers script content (`plan-approval.mjs:50`), so migrated scripts need re-approval. There is no spend. (real-domain review) Migrated scripts invalidate `asset_plan.approved.json`: re-run the estimate and re-approve; the spend is zero because every asset is a cache hit (D9). A `manifest.json` produced before the migration is stale and MUST be regenerated by `compile`; the report lists both kinds of file per script.
- **Legacy markers:** `series_NN.md`, `series_rules.md` and `script_template.md` are **not dropped here**. They are orthogonal to presets and touch `findSeriesRoot` consumers (`video-engine-cli.mjs:675`, `render-thumbnail`, `build-script-from-draft`, `frame`/`series-scope` tests). (real-domain review) Their removal belongs to the companion change `2026-11-01-video-folder-contract`, which replaces the earlier idea of a separate `video-legacy-series-markers` change.
- **Owner of the external `video_NN` migration:** the maintainer, who runs the script outside the repo ONCE, after both this change and the companion have landed (real-domain review).

### D9: Cache preservation invariant (real-domain review, hard maintainer constraint)

Re-running generation from a migrated script MUST NEVER repeat a provider request that the cache already satisfies.

- For the real-domain-shaped fixture, the TTS, avatar and image cache identities (TTS options hash per D5, avatar job key, image prompt plus options hash) computed BEFORE migration (V_0-13-11 engine) and AFTER migration (new engine) MUST be identical for every scene whose effective inputs did not change.
- Only scenes touched by the documented precedence-bug fix (D4, D8 precedence warnings) may differ. The dry-run report MUST list each such scene, so a difference is never a surprise and an unexpected one fails the test.
- The `model`/`tts_model`→`voice_model` rule (D8) is part of the invariant: dropping it would change the TTS model and therefore the TTS hash.
- Dead-key removal (`voice_id::`, `narrator_voice_id::`) is cache-neutral because no hash reads them. Series-local forks are not edited, so they cannot change a hash.
- Not cache-related but reported together: `asset_plan.approved.json` is invalidated and `manifest.json` is stale (see D8 Plan approval).
- Test method: a golden file of "before" cache identities is generated once from the V_0-13-11 engine and committed with the fixture (slice 1); a slice 2 test computes the "after" identities from the migrated fixture with the new engine and fails on any unexpected difference.

## Naming convention (defined once here; consumed by the companion change)

(real-domain review) The companion `2026-11-01-video-folder-contract` consumes this section and does not redefine it.

- Concept names are singular and capitalised in documents (`Preset`, `Series`, `Video`, `Scene`, `Layer`); the retired `Template` is never reused for this mechanism.
- Field names are `snake_case`. Voice delivery parameters carry the `voice_` prefix (`voice_model`, `voice_speed`, `voice_emotion`, `voice_tone`); background sound carries `background_audio` and `background_audio_volume`; paint order is `z_index`; the avatar source is `avatar`. Cascade scope names are `<level>:preset:<Name>`.
- `presets` holds bare names, unbracketed (D1). `slug` is the reserved identity key of every element (D2).
- Internal TTS option keys and cache keys keep their historical names (D5).
- Folder and file naming, and the layout step group, are owned by the companion.

## Companion change

(real-domain review) A second change, `2026-11-01-video-folder-contract` (folder layout, file/folder naming, workflow cleanup, single 1920x1920 master, platform-neutral description file, legacy series markers removal, issues #425 and #428), is coordinated with this one. Its content is not designed here. Binding points:

- The migration script is an ORDERED PIPELINE OF STEPS (D8). This change owns step group `presets`; the companion adds step group `layout` and may rename the script to `migrate-video-domain.mjs`. CLI: `--steps presets[,layout]`; `presets` is the only step implemented here. One dry-run report, one atomic apply.
- Both changes ride the same blueprint release: this change bumps to `V_0-14-0` and the companion bumps within the same unreleased train, so neither is merged to main alone. This is a release-train constraint: see "Test Strategy (Strict TDD) and Slices", which already requires `feature-branch-chain` or a held `dev`->`main` batch.
- The companion is stacked after this change and may not archive before it.
- Shared vocabulary and naming convention are defined once, in this change ("Naming convention" above).
- The real-domain migration is run ONCE, after both changes land.

## Field Definitions (post-change, feeds the spec)

The default column shows blueprint defaults only (`defaults/video-defaults_NN.md`); "–" means not declared.

| Field | concept:: | type / options | Default | Why these Concepts |
|---|---|---|---|---|
| tags | * | select, multiple | – | global field, kept |
| title | [Video, Series] | string | – | unchanged |
| description, status, script, master, thumbnail | Video | unchanged | – | episode record |
| presets | [Video, Scene, Series, Video Defaults] | select, multiple, no options | – | every level that expands. Not Layer (D4), not Preset (D2), not the blueprint (D3) |
| voice | [Video, Scene, Preset, Series, Video Defaults] | string | `default` | narration is per Scene; Scene explicit beats presets |
| voice_model | same as voice | string | `minimax/speech-2.8-hd` | ex `tts_model`; cache identity |
| voice_speed | same as voice | string (number) | – (D5) | ex Template `speed`; now cascades |
| voice_emotion | same as voice | string | – (D5) | ex Template `emotion` |
| voice_tone | same as voice | string | – | guidance only (D6) |
| avatar | [Video, Scene, Preset, Series, Video Defaults] | file | – | ex `presenter_asset`. Not Layer, where `asset` is the local value |
| avatar_model | [Layer, Scene, Video, Preset, Series, Video Defaults] | string | `wavespeed-ai/infinitetalk-fast` | `lowerLayer` already resolves through `sceneBags` |
| avatar_resolution | Layer | select [480p, 720p, 768p] | – | validated per model; not cascaded |
| intro | [Video, Preset, Series, Video Defaults] | file | – | ex `intro_asset`; per episode, so not Scene |
| image_model | [Video, Scene, Preset, Series, Video Defaults] | string | `wavespeed-ai/z-image/turbo` | widened. Layer excluded (no per-layer consumer) |
| background_audio | [Video, Scene, Preset, Series, Video Defaults] | file | – | ex `music`; Video added |
| background_audio_volume | same as background_audio | string (0–1) | `0.2` | ex `music_volume` |
| transition | [Video, Scene, Preset, Series, Video Defaults] | select [fade, slide-left, slide-right, wipe, none] | `none` | Video added |
| frame | [Video, Scene, Preset, Series, Video Defaults] | string | `neutral` | Preset added |
| fit | [Layer, Scene, Video, Preset, Series, Video Defaults] | select [cover, contain] | `cover` | already mechanically resolved via `sceneBags` |
| components | [Video, Preset, Series, Video Defaults] | select, multiple (keyed) | current list | union fold; preset nodes participate |
| sounds | [Video, Preset, Series, Video Defaults] | select, multiple (keyed) | `[scene-boundary=whoosh]` | same |
| type, asset, prompt, text, position, enter_animation, exit_animation | Layer | unchanged | – | unchanged |
| z_index | Layer | string (number) | – | ex `level` |

Removed: `template`, `tool`, `tts_model`, `speed`, `emotion`, `music`, `music_volume`, `presenter_asset`, `intro_asset`, `level`, and Video `voice_id`.

The "Tool-Agnostic Script" requirement becomes guidance: model and voice ids SHOULD live in Presets or scope documents, and the script MAY override them.

## Test Strategy (Strict TDD) and Slices

Every slice must leave `node scripts/verify.js` green. **No intermediate state is releasable.** Use `feature-branch-chain`, or hold the `dev`→`main` batch until slice 4 lands. Once `main` carries `V_0-14-0`, any later slice needs `V_0-14-1`, because the guard compares against the merge-base with `origin/main`.

| # | Slice | RED tests first | Files |
|---|---|---|---|
| 1 | Contract + migration | `scripts/dev/migrate-video-presets.test.mjs`: renames, Template move, `template::` conversion, drops reported, Layer-only `z_index`, conflict means no write, **second run no-op**; (real-domain review) fixtures modelled on the real domain: content-based selection with unversioned `parent_spec`, Template `model::`/`tts_model::` to `voice_model` (provider-prefixed values), JSON `config[]`/`videoOverrides`/`scenes[].template` with `choice.model` untouched, marker `voice_id`/`narrator_voice_id` removal, `# NN index` rewrite with the `templates_*` Series element kept, fork listing, and the committed "before" cache-identity golden. Root `test/video-script-contract-additions.test.mjs`: Preset present, Template absent, `presets` shape, defaults free of `voice_speed`/`voice_emotion`/`voice_tone`/`presets`/Preset | `<bp>spec_NN.md` (`V_0-14-0`, concepts, fields, conditional_fields), `<bp>defaults/video-defaults_NN.md` (only `parent_spec` → `V_0-14-0`), `scene-compiler.mjs` (`DEFAULT_CONDITIONAL_FIELDS` only), `draft-template.html:1572` (version injected by `build-draft-html.mjs`, test forbids a literal `video-script_V_`), both `catalog.json` (`scripts/blueprint-catalog.mjs`), migration script plus lib, delta specs |
| 2 | Engine core | (a) **cache-key regression**: a V_0-13-11 Template fixture and its migrated form give identical `computeHash`; (real-domain review) plus the D9 before/after cache-identity comparison on the real-domain-shaped fixture (TTS, avatar, image), failing on any unexpected difference; (b) resolution order: last preset wins, explicit beats own presets, Scene `voice` beats Video preset, Video explicit beats Video preset, inner preset beats outer explicit; (c) lookup: nearest-first, shadowing, `unknown-preset`, `preset-syntax`, `preset-section-order`, `preset-duplicate`; (d) additive lists across levels and series folders; (e) `explain` names `scene:preset:X`; `preset-parameters-drift` | new `lib/presets.mjs`, `lib/video-scope.mjs`, `scene-compiler.mjs`, `lib/knowledge-model.mjs`, `lib/tts-options.mjs`, `video-engine-cli.mjs`, defaults `tts_model`→`voice_model`; rewrite `template-delivery`, `model-params`, `knowledge-model-compile`, `video-template`, `series-scope` tests |
| 3 | Widening + renames | presenter without `asset` passes the guard via a Scene/Series/Preset `avatar` and fails without one; `z_index` paint order; `background_audio*` resolution | `scene-compiler.mjs` (guard, `lowerLayer`), `lib/avatar-jobs.mjs`, `synthesize-avatar.mjs`, `asset-cost-estimator.mjs`, `asset-synthesizer.mjs`, `scene-project.mjs`, defaults `music_volume` rename, remaining skill tests |
| 4 | Authoring + docs | `build-script-from-draft` writes `presets:: [..]`, no presenter `asset::`, resolves `intro`; (real-domain review) writes `avatar_resolution` for any draft quality (today `build-script-from-draft.mjs:175` writes it only for `ALTA` and silently drops the chosen resolution otherwise; the real episode chose 480p), test first; `legacy-draft-keys` rejection; console exports new keys | `build-script-from-draft.mjs`, `build-draft-html.mjs`, `draft-template.html`, `scripts/dev/adopt-video-plan.mjs` (it hoists `voice_id`, should be `voice`), `lib/series-values.mjs`, `validate-scope-golden.mjs`, `SKILL.md`, `references/*` (`series-template-convention.md` replaced) |
| 5 (opt.) | Fixture text | – | nn-core golden fixtures, nn-mcp illustrative text |

**Slice 1 checklist:**

- [ ] `blueprint_version` `V_0-14-0` in `spec_NN.md`.
- [ ] `guard-template-immutability.js` green.
- [ ] Catalogs regenerated (`verify.js:595` freshness, `:617` parity).
- [ ] `metaschema-selfdescribe.test.ts` green (no `reference` with `multiple`).
- [ ] `bluepriNNt-field-catalogue.test.ts` green.
- [ ] `conditional-fields-drift` green.
- [ ] `no-legacy-*` scans clean. Checked by reading: they ban none of the new terms.
- [ ] Defaults `parent_spec` drift fixed.
- [ ] `draft-template.html:1572` fixed.

## Not covered / verified only by reading

I read code only, with no shell. Nothing was run.

**Unverified behaviour:**

- `validate_knowledge` and the workspace parse on a real `presets:: [Lucas]` (expected: no diagnostics).
- Editor rendering of an option-less select-multiple.
- `explain` output wording.
- (real-domain review) The real-domain review settled that scripts and markers carry `parent_spec.name: "video-script"` (no version) or `<series>_V_0-1-0`; D8 therefore selects by content. Still unverified: whether a `templates_*_NN.md` holding a `# NN Series` element is discovered by `findScopeChain` as a scope document (D8 assumes it is, and otherwise falls back to the innermost covering scope document).
- (real-domain review) The path and format of the "guard-config voice registry entry"; D8 only reports it.
- The exact draft and quine key set beyond the lines the exploration cites.

**Not in scope:**

- nn-mcp `resolve_effective` stays preset-blind.
- Per-folder series nodes (D3 tradeoff).
- `image_model` per Layer.
- Dropping the legacy markers (owned by the companion change `2026-11-01-video-folder-contract`).
- The `layout` migration step group and folder/file naming (companion).
