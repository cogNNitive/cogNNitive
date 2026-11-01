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
- **Maintainer confirmation needed:** exploration decision 1 writes references as `[[Lucas]]`. This design drops the wiki-link brackets. If the brackets are required, the least invasive option is an nn-core change: a field type or flag that exempts scope-resolved names from `references.ts`/`relationships.ts`. That also means a `nn-core.generated.cjs` rebuild and an nn-core release. Under that option D3–D7 stay unchanged and only `parsePresetList` changes.

### D2: Preset concept shape

- `Preset` is a `list` Concept with no fields of its own. Its elements may carry only **preset parameters**: the fields whose `concept::` lists `Preset` (table below).
- The engine vendors that set as `PRESET_PARAMETERS`. A drift test checks it against `spec_NN.md`, following the `conditional-fields-drift.test.mjs` pattern.
- Any other key is a `preset-field` error. This covers `presets` (no composition, so no cycles), `type`, `asset` and `title`.
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
- **CLI:** `node scripts/dev/migrate-video-presets.mjs <domain-dir> [--apply] [--json]`. Dry run is the default and writes nothing. Exit 1 on any conflict. `--apply` is all-or-nothing.
- **Files covered:** `*_NN.md` whose `parent_spec.name` starts with `video-script_V_`, `templates_*_NN.md`, the chain scope markers, and the root `video-defaults_NN.md`.

**Rewrites:**

| Rewrite | Rule |
|---|---|
| Field renames | `tts_model`→`voice_model`, `music`→`background_audio`, `music_volume`→`background_audio_volume`, `presenter_asset`→`avatar`, `intro_asset`→`intro`, Template `speed`/`emotion`→`voice_speed`/`voice_emotion`, Layer-only `level::`→`z_index::` (frontmatter `level:` untouched) |
| Layer `model::` | becomes `avatar_model::` when that field is absent. If both are present, `model` is dropped and reported |
| `template::` | `template:: [[Doc :: Name]]` or `Name` becomes `presets:: [Name]` (last `::` segment) |
| Template data | `# NN Template` elements become `# NN Preset`, are **moved** into the innermost scope document covering the templates file's folder (else `series_NN.md`, else the domain `video-defaults_NN.md`), and are appended after the first section. Emptied `templates_*_NN.md` are deleted |
| Removed fields | `tool` and Video `voice_id` are dropped and reported. `voice_id` is **not** converted to `voice`, because that would change resolution and bill again |
| Version | `parent_spec.name` is set to `video-script_V_0-14-0` |
| JSON drafts | `*_reviewed.json` / draft `*.json`: `template`→`presets: [Name]`, `music*`→`background_audio*`, `speed`→`voice_speed` |
| HTML consoles | quine consoles are listed for regeneration and not edited |

- **Conflicts (no writes):** two moved Presets with the same name landing in one target, or no target document.
- **Precedence warnings:** a Scene with an explicit `voice`/`tts_model` that differs from its Template's value. That scene's cache key will change, which is intended under the fixed precedence.
- **Idempotence:** a second run reports zero changes. A test enforces this.
- **Legacy key rejection:** engine and tools reject legacy keys loudly. `build-script-from-draft` and the console loader fail with `legacy-draft-keys` and name the script.
- **Plan approval:** the approval hash covers script content (`plan-approval.mjs:50`), so migrated scripts need re-approval. There is no spend.
- **Legacy markers:** `series_NN.md`, `series_rules.md` and `script_template.md` are **not dropped here**. They are orthogonal to presets and touch `findSeriesRoot` consumers (`video-engine-cli.mjs:675`, `render-thumbnail`, `build-script-from-draft`, `frame`/`series-scope` tests). Follow-up change: `video-legacy-series-markers`.
- **Owner of the external `video_NN` migration:** the maintainer, who runs the script outside the repo.

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
| 1 | Contract + migration | `scripts/dev/migrate-video-presets.test.mjs`: renames, Template move, `template::` conversion, drops reported, Layer-only `z_index`, conflict means no write, **second run no-op**. Root `test/video-script-contract-additions.test.mjs`: Preset present, Template absent, `presets` shape, defaults free of `voice_speed`/`voice_emotion`/`voice_tone`/`presets`/Preset | `<bp>spec_NN.md` (`V_0-14-0`, concepts, fields, conditional_fields), `<bp>defaults/video-defaults_NN.md` (only `parent_spec` → `V_0-14-0`), `scene-compiler.mjs` (`DEFAULT_CONDITIONAL_FIELDS` only), `draft-template.html:1572` (version injected by `build-draft-html.mjs`, test forbids a literal `video-script_V_`), both `catalog.json` (`scripts/blueprint-catalog.mjs`), migration script plus lib, delta specs |
| 2 | Engine core | (a) **cache-key regression**: a V_0-13-11 Template fixture and its migrated form give identical `computeHash`; (b) resolution order: last preset wins, explicit beats own presets, Scene `voice` beats Video preset, Video explicit beats Video preset, inner preset beats outer explicit; (c) lookup: nearest-first, shadowing, `unknown-preset`, `preset-syntax`, `preset-section-order`, `preset-duplicate`; (d) additive lists across levels and series folders; (e) `explain` names `scene:preset:X`; `preset-parameters-drift` | new `lib/presets.mjs`, `lib/video-scope.mjs`, `scene-compiler.mjs`, `lib/knowledge-model.mjs`, `lib/tts-options.mjs`, `video-engine-cli.mjs`, defaults `tts_model`→`voice_model`; rewrite `template-delivery`, `model-params`, `knowledge-model-compile`, `video-template`, `series-scope` tests |
| 3 | Widening + renames | presenter without `asset` passes the guard via a Scene/Series/Preset `avatar` and fails without one; `z_index` paint order; `background_audio*` resolution | `scene-compiler.mjs` (guard, `lowerLayer`), `lib/avatar-jobs.mjs`, `synthesize-avatar.mjs`, `asset-cost-estimator.mjs`, `asset-synthesizer.mjs`, `scene-project.mjs`, defaults `music_volume` rename, remaining skill tests |
| 4 | Authoring + docs | `build-script-from-draft` writes `presets:: [..]`, no presenter `asset::`, resolves `intro`; `legacy-draft-keys` rejection; console exports new keys | `build-script-from-draft.mjs`, `build-draft-html.mjs`, `draft-template.html`, `scripts/dev/adopt-video-plan.mjs` (it hoists `voice_id`, should be `voice`), `lib/series-values.mjs`, `validate-scope-golden.mjs`, `SKILL.md`, `references/*` (`series-template-convention.md` replaced) |
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
- The `parent_spec` of real `<series>_scope_NN.md` markers. The D8 file selection assumes they are discoverable through the chain.
- The exact draft and quine key set beyond the lines the exploration cites.

**Not in scope:**

- nn-mcp `resolve_effective` stays preset-blind.
- Per-folder series nodes (D3 tradeoff).
- `image_model` per Layer.
- Dropping the legacy markers.
