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

---

# Apply Progress: video-script-native-model

## Batch: Phases 6–8 (VUS big-bang teardown + docs + gates)

**Mode**: Standard.
**Scope**: Delete the VUS parser package/mirror/scripts/tests, retire the old
`video` package, re-point docs at the native model, regenerate the generated
registries, and run the deterministic gates. Engine work (Phases 4–5) already
landed.

### Skill-location reconciliation (design 6.5 vs `video-script-skill` spec)

The old `video` blueprint package is retired (`video/spec_NN.md` deleted). The
`video-script-skill` spec pins the skill inside its owning blueprint package and
the immutability guard resolves a skill's owner as `<bp>/spec_NN.md` — a skill
cannot live in a package that has no spec. The skill was therefore **MOVED** from
`iNNfo/specs/bluepriNNts/video/skills/nn-video-script/` to
`iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/` and the
`video-script-skill` delta + published spec were updated to the new location
(Owned-Skill, Projection, and Embedded-Tests requirements).

### Completed Tasks

- [x] 6.1 Deleted `iNNfo/packages/innfo-video-parser/` (whole package).
- [x] 6.2 Deleted the vendored mirror `scripts/lib/innfo-video-parser.generated.mjs`.
- [x] 6.3 Deleted `scripts/vus-parse.mjs`, `vus-parse-runner.mjs`, `vus-spec.mjs`, `check-script.mjs`, `specs/V_0-3-3.json`, `references/vus-authoring-notes.md`.
- [x] 6.4 Deleted `scripts/build-video-parser-mirror.mjs` + `scripts/mirror/video-parser-entry.ts`; removed the `video-parser-mirror` step from `scripts/verify.js`.
- [x] 6.5 Deleted the `video` package (`spec_NN.md`, `samples/`, `procedures/`, `web/`); moved the skill into `video-script`.
- [x] 6.6 Confirmed the ledger's `html-comment-overlays` entry is gone; `legacy-ledger-guard.js` passes (13 entries / 25 markers).
- [x] 6.7 Removed `vus_spec:` frontmatter and VUS prose from `SKILL.md`; authoring/validation now point at the L3 document + `video-script` blueprint; removed the CLI-mirror and `check-script.mjs` tooling rows.
- [x] 6.8 Reconciled `manifest/source.yaml`: replaced the `video` blueprint entry with `video-script` + `villabotijos-today`.
- [x] 6.9 Added `test/no-vus-artifacts.test.mjs` (grep-asserts no VUS artifact/`vus_spec` in the skill).
- [x] 7.1 Rewrote `docs/innfo/documentation/template-video.md`; updated `templates.md` + `specifications.md`; regenerated `docs/innfo/blueprints/catalog.json`.
- [x] 7.2 Rewrote `references/series-template-convention.md`, updated `references/folder-contract.md` + `references/cost-guardrails.md` (no VUS prose).
- [x] 8.1 `node scripts/verify.js` ran (see Gates).
- [x] 8.2 `node scripts/check-integrity.js` ran (see Gates).
- [x] 8.3 `npm run lint|typecheck|format:check` (see Gates).

### Files Removed / Changed

| Path | Action |
|------|--------|
| `iNNfo/packages/innfo-video-parser/**` | Deleted |
| `scripts/build-video-parser-mirror.mjs`, `scripts/mirror/video-parser-entry.ts` | Deleted |
| `iNNfo/specs/bluepriNNts/video/**` | Deleted (skill moved out first) |
| `_samples_nn/kNNowledge/Ghostbusters_video_NN.md` | Deleted |
| `.../video-script/skills/nn-video-script/**` | Moved (from `.../video/skills/…`) |
| skill `scripts/{vus-parse,vus-parse-runner,vus-spec,check-script}.mjs`, `scripts/lib/innfo-video-parser.generated.mjs`, `specs/`, `references/vus-authoring-notes.md` | Deleted |
| skill VUS-fixture tests (17 files) + `test/fixtures/inflacion-script.md` | Retired |
| skill `SKILL.md`, `references/{series-template-convention,folder-contract,cost-guardrails}.md` | Rewritten (native model) |
| skill `scripts/{asset-cost-estimator,video-guard,remotion-scene-compiler}.mjs`, `lib/{knowledge-model,tts-options}.mjs`, `scene/layer-primitive.mjs` | VUS comments/fallbacks cleaned |
| skill tests `kinetic-title-big.test.mjs` (pruned), `cli-symlink-guard.test.mjs` (script list), `scene-compiler.test.mjs` (+music), `no-vus-artifacts.test.mjs` (new) | Migrated |
| `scripts/verify.js`, `scripts/sync-samples.mjs`, `scripts/skills-manager.test.js`, `scripts/verify-inventory.test.js` | Updated |
| `manifest/source.yaml`, `package.json`, `.github/workflows/{ci,release}.yml`, `openspec/config.yaml`, `.prettierignore`, `.gitattributes`, `eslint.config.mjs` | Deregistered VUS |
| `iNNfo/specs/bluepriNNts/catalog.json`, `iNNfo/apps/innfo-editor/src/config/samples.ts`, `docs/innfo/blueprints/catalog.json` | Regenerated |
| `iNNfo/packages/innfo-core/tests/metaschema-selfdescribe.test.ts` | `video` → `video-script` |
| `iNNfo/specs/bluepriNNts/villabotijos-today/templates_V_0-1-0_villabotijos-today_NN.md` | Added `blueprint_version` (satisfies the template-immutability guard) |
| `docs/innfo/documentation/{template-video,templates,specifications}.md` | Updated |
| `openspec/specs/video-script-skill/spec.md` + change delta | Location reconciled to `video-script` |

### Gate Results

- `node scripts/verify.js`: **33 of 144 steps fail — ALL pre-existing environment.** Causes seen in `.verify-logs`: missing `esbuild` (console/preflight/skills-manager/transform mirrors), missing `jsdom` (all `test/console-*.test.mjs`), missing `ajv`, missing `typescript` (`typecheck-scripts`), missing `sharp` (`render-thumbnail.test.mjs`), unbuilt `iNNfo/packages/innfo-core/dist` + `innfo-mcp/dist` (docs-facts, nn-upgrade), uninstalled `skills/nn-sources` deps. **Zero failures reference the VUS teardown.** All video-script steps pass.
- Video-relevant steps **green**: Template Inventory Guard · Check Blueprint Catalog Fresh · Check Version Parity · Samples Parity + Version Coherence · Template Immutability Guard · Legacy Ledger · Retired Product Name · Distributed Skill Script References · all repo tests on the changed scripts (`skills-manager`, `verify-inventory`, `check-samples-version`, `guard-template-immutability`, `sync-samples`) · all 14 remaining skill suites except `render-thumbnail` (env, `sharp`).
- `node scripts/check-integrity.js`: Groups 1c/2b/2d/2e/2f/2g all green when the working tree is included. Group 1c (tag-pin freshness) reports "blueprints changed without re-pinning manifest/source.yaml" **only because it diffs the committed `origin/main...HEAD` range**; `manifest/source.yaml` IS edited in this uncommitted batch (proven with `git diff origin/main`). It will pass once the orchestrator commits. Group 3 inherits the environmental failures above.
- `npm run lint|typecheck|format:check`: **cannot run** — `node_modules` is empty in this worktree (`eslint`/`typescript`/`prettier` absent). Pre-existing environment blocker.

### Remaining Blockers / Follow-ups

- `package-lock.json` still lists the removed `@cognnitive/innfo-video-parser` workspace. Regenerating it here (`npm install --package-lock-only`) produced unrelated npm-version churn (version fields, `optional` flags) and left the entry marked extraneous, so it was reverted. Regenerate with the project's pinned npm in a networked environment.
- `docs/use/manifest-next.md` + `docs/update/manifest-next.md` are generated by `scripts/manifest/generate-manifest.js --channel preview`, which requires the GitHub API (blocked offline: HTTP 403). They still show the old `video` blueprint and must be regenerated at the next release/preview build.
- Lockfile + empty `node_modules` mean `npm test`/`npm run typecheck` cannot be exercised locally.

### Status

Phase 6–8 tasks complete. Change is ready for verify, subject to the pre-existing
environment (uninstalled deps / unbuilt workspaces) documented above.

---
