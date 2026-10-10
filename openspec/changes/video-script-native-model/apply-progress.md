# Apply Progress: video-script-native-model

## Batch: Phases 1–3 (model artifacts only)

**Mode**: Standard (no strict TDD runner for these iNNfo documents)
**Scope**: Author the new L2 blueprint, the Series blueprint + L3 Template data, and the
cocodrilo L3 guion proof. Engine re-point (Phase 4), pipeline verification (Phase 5), VUS
teardown (Phase 6), and docs (Phase 7) are NOT touched in this batch.

### Completed Tasks

- [x] 1.1 Created `iNNfo/specs/bluepriNNts/video-script/spec_NN.md` (L2, `parent_spec: iNNfo_V_0-4-0`, `# NN index` Video→Scene→Layer + top-level Template)
- [x] 1.2 Defined all Concepts/Fields (`title,template,music,transition,type,asset,prompt,text,position,enter_animation,exit_animation,level,tool,voice,model`); no `scene_*`/`layer_*` fields. `slug` is the reserved L1 identity (L1 §2.5), not a declared Field Definition.
- [x] 1.3 Added `validation.conditional_fields` map (`type::`→required Fields) per D9
- [x] 1.4 `validate_blueprint` passes; unknown `type::` rejected by the Field `select` options
- [x] 2.1 Created Series blueprint `iNNfo/specs/bluepriNNts/villabotijos-today/spec_NN.md` with `includes: [video-script]` + `tone`/`sound_tags` on the `Series` Concept
- [x] 2.2 Created Series L3 Template doc `iNNfo/specs/bluepriNNts/villabotijos-today/templates_V_0-1-0_villabotijos-today_NN.md` (`Template` instances: Celedonio Full, Celedonio Section, Bumper)
- [x] 2.3 `template::` reference resolves; domain-scope validation passes
- [x] 3.1 Created `iNNfo/specs/bluepriNNts/video-script/samples/el-cocodrilo-de-singapur_V_0-1-0_video-script_NN.md` (one Video, 3 Scenes with prose narration + Layers, `template::`, `music::`)
- [x] 3.2 `validate_knowledge` passes (valid=true, warnings only)

### Files Created

| File | Action | What |
|------|--------|------|
| `iNNfo/specs/bluepriNNts/video-script/spec_NN.md` | Created | L2 native `video-script` blueprint |
| `iNNfo/specs/bluepriNNts/video-script/samples/el-cocodrilo-de-singapur_V_0-1-0_video-script_NN.md` | Created | cocodrilo L3 guion proof |
| `iNNfo/specs/bluepriNNts/villabotijos-today/spec_NN.md` | Created | Series blueprint (`includes: video-script`) |
| `iNNfo/specs/bluepriNNts/villabotijos-today/templates_V_0-1-0_villabotijos-today_NN.md` | Created | Series L3 Template-data doc |

### Validation Evidence (innfo-mcp)

Domain root = worktree root `D:\Users\lucas\Documents\GitHub\cogNNitive-video-script-innfo-model`.

| Artifact | Tool | Call | Result |
|----------|------|------|--------|
| `video-script` blueprint | `validate_blueprint` | `id=iNNfo/specs/bluepriNNts/video-script/spec_NN.md` | valid=true, 0 errors, 0 warnings |
| `villabotijos-today` blueprint | `validate_blueprint` | `id=iNNfo/specs/bluepriNNts/villabotijos-today/spec_NN.md` | valid=true, 0 errors, 0 warnings |
| cocodrilo guion | `validate_knowledge` | `id=...el-cocodrilo-de-singapur_V_0-1-0_video-script_NN.md` | valid=true, 0 errors, 2 warnings (l3-index-ignored, NN_NAME_INVARIANT) |
| Series Template doc | `validate_knowledge` | `id=...templates_V_0-1-0_villabotijos-today_NN.md` | valid=true, 0 errors, 2 warnings (l3-index-ignored, NN_NAME_INVARIANT) |
| cocodrilo (domain cross-refs) | `validate_knowledge` | `scope_domain=true` | valid=true |
| negative test | `validate_knowledge` (inline) | `type:: telepathy` | valid=false, 1 error `Invalid value "telepathy" for "type"` |

**Note on resolution**: the new blueprint is not yet published to a raw host, so the innfo-mcp
resolved it from the machine's global blueprint store (`~/.agents/bluepriNNts/{video-script,
villabotijos-today}/V_0-1-0/spec_NN.md`), populated as a *validation staging cache* for this
run. The repository artifacts keep canonical raw-GitHub URLs. The staging copies are external
to the repo and are NOT committed; the verify/registration step must publish or hydrate the
blueprint for resolution to work from a clean machine.

### Deviations from Design

- **DEV-1 (element index)**: `design.md` (D4) and the `video-script-model` spec describe
  Scene/Layer ownership and ordering via an `# NN index` of **element instances**. The current
  innfo-core validator rejects element entries in a level-3 index (`format.index-no-elements`,
  error: "Elements should NOT appear in the index") and ignores the L3 index entirely
  (`format.l3-index-ignored`). The guion therefore carries a **concept** index
  (`Video → Scene → Layer`). Scene order and layer ownership are expressed by document order
  within the `# NN Scene` / `# NN Layer` sections. This is a schema/implementation gap the
  engine adapter (Phase 4) must reconcile against the spec's "order equals list order" rule.
- **DEV-2 (unforced conditions)**: at model level innfo-core **ignores undeclared properties**
  (`unknownProperty: 'ignore'`) and has no conditional-required primitive, so:
  - "missing conditional field fails" (task 1.4) is NOT enforced by the validator — it belongs
    to the engine pre-compile guard (`validation.conditional_fields`, D9 / Phase 4).
  - "declared duration is rejected" (task 3.2) is NOT enforced by the validator for the same
    reason — it is an engine-guard responsibility.
  - "a second Video is rejected" has no native single-root primitive; also an engine guard.
  Only the `type::` select rejection is natively enforced (verified).
- **DEV-3 (`slug` Field)**: task 1.2 lists `slug`. It is the reserved immutable identity
  (L1 §2.5), first property line of every element, and is NOT declared as a Field Definition
  (a single name cannot own fields for four concepts; the validator treats it as reserved).

### Issues Found

- Adding a new blueprint package makes generated registries stale, which fails three verify.js
  steps: `Check Blueprint Catalog Fresh` (catalog.json), `Template Inventory Guard`
  (`manifest/source.yaml` missing `video-script`, `villabotijos-today`), and
  `Check Version Parity` (`SHIPPED_BLUEPRINT_VERSIONS` stale). Regenerating these generated
  artifacts is deferred to the registration/gate step (Phases 7–8); generated files are not
  hand-edited here.

### Remaining Tasks (this change)

- [ ] Phase 4: engine re-point to the structured iNNfo model
- [ ] Phase 5: compile + render verification
- [ ] Phase 6: VUS big-bang teardown
- [ ] Phase 7: documentation
- [ ] Phase 8: deterministic gates (regenerate catalog / sync versions / register manifest)

### Status

10/10 tasks complete for Phases 1–3. Ready for verify (scoped to Phases 1–3).

---

# Apply Progress: video-script-native-model

## Batch: Phases 4–5 (engine re-point + pipeline proof)

**Mode**: Standard.
**Scope**: Re-point the nn-video-script engine to consume the structured iNNfo model
instead of the VUS parser; prove the cocodrilo sample compiles to a Remotion
composition manifest from the model only. VUS big-bang teardown (Phase 6), docs
(Phase 7), and deterministic gates (Phase 8) are NOT touched in this batch.

### Completed Tasks

- [x] 4.1 `remotion-scene-compiler.mjs`: removed `parseVus` import, `parseScript`, `parseBlueprintTemplates`, `OVERLAY_EVENT_SPECS`, `extractNarrationAndOverlays`, `BLUEPRINT_TEMPLATE_RE`, `DOMAIN_BLUEPRINT_SPEC`, `resolveBlueprintTemplates`; added `lowerKnowledgeModel()` (structured model → `{title,fps,width,height,scenes[]}`).
- [x] 4.2 `TYPE_RENDERERS` map (`type::` → renderer/manifest kind) per design table; one `RemotionSceneTrack` per Scene in list order; overlay text from Layer `text::`, never the layer name. `assignLayersToScenes()` derives Layer→Scene ownership from the stable `slug` (DEV-1 reconciliation).
- [x] 4.3 `lib/tts-options.mjs` reads voice/model from the resolved `template::` instance (never a script field); narration = Scene body prose; cost estimator + synthesize-avatar load the structured model; one TTS per narrated Scene; duration still measured without FFmpeg-from-PATH.
- [x] 4.4 `quote`/`lower-third`/`b-roll` overlays scheduled into equal, non-overlapping slots by list order, carrying `enter_animation`/`exit_animation`.
- [x] 4.5 `test/knowledge-model-compile.test.mjs`: compiles cocodrilo from the iNNfo model only; grep-asserts the engine imports no VUS parser/mirror.
- [x] 5.1 Compiler + CLI compile cocodrilo from the iNNfo model; one track per Scene in list order (asserted).
- [x] 5.2 `ScriptValidationError` (named, non-zero) stops compilation before any manifest: one-video-per-document, unknown-`type::`, missing-conditional-field, and markdown-not-accepted.

### Files Created / Modified

| File | Action | What |
|------|--------|------|
| `.../nn-video-script/scripts/lib/knowledge-model.mjs` | Created | Structural iNNfo L3 reader + `loadKnowledgeModel()` / `loadTemplateModels()` |
| `.../nn-video-script/scripts/remotion-scene-compiler.mjs` | Modified | VUS parser removed; model adapter, `TYPE_RENDERERS`, `checkScript` guard, sequential overlay scheduling |
| `.../nn-video-script/scripts/video-engine-cli.mjs` | Modified | Loads the structured model, runs the guard before synthesis; forwards model/templates/synthesizeAssets |
| `.../nn-video-script/scripts/asset-cost-estimator.mjs` | Modified | Reads the structured model instead of `parseScript` |
| `.../nn-video-script/scripts/synthesize-avatar.mjs` | Modified | Reads the structured model instead of `parseScript` |
| `.../nn-video-script/scripts/lib/tts-options.mjs` | Modified | Voice/model resolved from `template::` |
| `.../nn-video-script/test/scene-compiler.test.mjs` | Rewritten | Model-based unit tests |
| `.../nn-video-script/test/knowledge-model-compile.test.mjs` | Created | Cocodrilo compile-from-model proof + guard + grep-assert |
| `.../nn-video-script/test/video-engine-cli.test.mjs` | Modified | L3 fixture; model-based compile/render assertions |
| `legacy-ledger.yaml` | Modified | Removed the `html-comment-overlays` entry (code + marker deleted) |

### Validation Evidence

| Check | Command | Result |
|-------|---------|--------|
| Compiler unit tests | `node test/scene-compiler.test.mjs` | ✅ pass |
| Model compile proof | `node test/knowledge-model-compile.test.mjs` | ✅ pass (3 scenes in list order; overlays; template voices; sequential no-collision; guard; grep) |
| CLI integration | `node test/video-engine-cli.test.mjs` | ✅ pass |
| Cocodrilo → manifest | `node scripts/remotion-scene-compiler.mjs <sample> --out …` | ✅ `compositionId: el-cocodrilo-de-singapur`, scenes `scene_gancho/scene_intro/scene_noticia`, templates resolved |
| Cost estimator from model | `node scripts/asset-cost-estimator.mjs <sample>` | ✅ plan produced (template TTS model resolved) |
| Grep VUS symbols | `git grep parseVus\|innfo-video-parser -- <engine modules>` | ✅ no matches (exit 1) |
| Legacy ledger guard | `node scripts/lib/legacy-ledger-guard.js` | ✅ 13 entries / 25 markers validated |

### Deviations from Design

- **DEV-4 (Layer→Scene ownership)**: the `read_knowledge` `elements` map is grouped by
  concept with no parent linkage (DEV-1 confirmed). `assignLayersToScenes()` therefore
  assigns each Layer to the Scene whose `slug` names it (falling back to the
  document-order preceding Scene). Revisit if the L3 index gains element nesting.
- **DEV-5 (model source at runtime)**: the skill ships zero-dependency, so the CLI
  cannot import `@cognnitive/innfo-core`. `lib/knowledge-model.mjs` is a thin
  structural reader producing the SAME `read_knowledge` shape; it is used only when no
  canonical `<script>.json` (or `--model`) is supplied. The compiler never parses
  markdown — it consumes the structured object.
- **DEV-6 (conditional contract)**: `checkScript` carries a built-in default map
  mirroring the blueprint's `validation.conditional_fields`; callers may pass the
  blueprint map to keep the blueprint authoritative when reachable.
- **Skill location (not moved)**: the authoritative `video-script-skill` spec still
  pins the skill at `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/`; Phase 6
  teardown item 6.5 removes the old `video` blueprint `spec_NN.md` and VUS samples,
  not the skill folder. The skill was therefore NOT relocated.

### Issues Found

- VUS-fixture test suites still fail because their inputs are VUS markdown with no
  iNNfo `Video` (the guard now rejects them): `compile-gate`, `cost-estimator`,
  `plan-approval`, `avatar-hardening`, `synthesize-avatar`, `scene-media-types`,
  `background-music`, `narration-clean`, `overlay-events`, `overlay-render`,
  `kinetic-title-big`, `probe-duration`. Plus the retired VUS suites
  (`parser-mirror`, `vus-parse`, `vus-spec-pin`). These are Phase 6 teardown /
  migration targets — see the teardown inventory in `design.md`.
- `render-thumbnail.test.mjs` fails on a missing `sharp` package (environmental;
  workspace deps not installed in this worktree).

### Remaining Tasks (this change)

- [ ] Phase 6: VUS big-bang teardown (delete parser package, mirror, VUS scripts, VUS tests; deregister)
- [ ] Phase 7: documentation
- [ ] Phase 8: deterministic gates (`node scripts/verify.js` green after regenerating catalog / manifest / versions)

### Status

6/6 tasks complete for Phases 4–5. Ready for verify (scoped to Phases 4–5).
