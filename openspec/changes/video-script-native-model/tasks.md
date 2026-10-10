# Tasks: Model video scripts natively as iNNfo

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 blueprint+guion → PR2 engine → PR3 teardown+docs |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | L2 blueprint + Series + cocodrilo L3 proof | PR 1 | base main; validates standalone |
| 2 | Engine re-point to iNNfo model | PR 2 | base PR 1; compile/render proof |
| 3 | VUS big-bang teardown + docs | PR 3 | base PR 2; only after compile proof |

## Phase 1: L2 `video-script` blueprint

- [x] 1.1 Create `iNNfo/specs/bluepriNNts/video-script/spec_NN.md` (L2, `parent_spec: iNNfo_V_0-4-0`, `# NN index` Video→Scene→Layer + top-level Template) [capability:video-blueprint:Native L2 Video-Script Blueprint]
- [x] 1.2 Define all Concepts/Fields per design table (`slug,title,type,asset,prompt,text,position,enter_animation,exit_animation,level,music,tool,voice,model`); no `scene_*`/`layer_*` fields [capability:video-blueprint:Native L2 Video-Script Blueprint] — `slug` is the reserved L1 identity, not a declared Field
- [x] 1.3 Add `validation.conditional_fields` map (`type::`→required Fields) per D9 [capability:video-script-model:Layer `type::` Discriminator]
- [x] 1.4 Test: `validate_blueprint` passes; unknown `type::` rejected by the native `select` options [capability:video-script-model:Layer `type::` Discriminator] — missing-conditional-field is NOT enforced by innfo-core (undeclared props are ignored at model level); it is the engine pre-compile guard's job (Phase 4). Declared-duration/second-Video likewise not enforced by the MCP validator (see apply-progress).

## Phase 2: Series blueprint + L3 Template data

- [x] 2.1 Create Series blueprint `iNNfo/specs/bluepriNNts/villabotijos-today/spec_NN.md` with `includes: [video-script]` + tone fields (`tone`, `sound_tags` on the `Series` Concept) [capability:series-script-templates:Series Is a Blueprint Plus L3 Template Data]
- [x] 2.2 Create Series L3 Template doc (`templates_V_0-1-0_villabotijos-today_NN.md`) declaring `Template` instances (tool/voice/model) [capability:video-script-model:Template Concept and `template::` Reference]
- [x] 2.3 Test: a script's `template::` ref resolves to its Template instance (domain-scope validation passes; `[[Villabotijos Today :: Celedonio Full]]` resolves) [capability:series-script-templates:Series Is a Blueprint Plus L3 Template Data]

## Phase 3: cocodrilo L3 guion proof

- [x] 3.1 Create `iNNfo/specs/bluepriNNts/video-script/samples/el-cocodrilo-de-singapur_V_0-1-0_video-script_NN.md` (`parent_spec: video-script`; one Video, Scenes with prose body + Layers) [capability:video-script-model:Script Is an iNNfo Level-3 Document] — the `# NN index` carries Concepts (Video→Scene→Layer), NOT element instances: the current validator rejects element entries (`format.index-no-elements`); element order/ownership is expressed by document order within the concept sections (DEV-1)
- [x] 3.2 Test: `validate_knowledge` cocodrilo passes (valid=true, warnings only) [capability:video-script-model:No Declared Duration or Timing] — second-Video and declared-duration are NOT enforced by innfo-core (unknown props ignored, no single-root primitive); they are engine-guard responsibilities (Phase 4/5)

## Phase 4: Engine re-point to structured iNNfo

- [x] 4.1 `.../nn-video-script/scripts/remotion-scene-compiler.mjs`: delete `parseVus`/`parseScript`/`parseBlueprintTemplates`/`OVERLAY_EVENT_SPECS`/`extractNarrationAndOverlays`/regex consts; add `read_knowledge`→`{title,fps,width,height,scenes[]}` adapter [capability:cognnitive-video-engine:Programmatic Remotion Scene Compilation]
- [x] 4.2 Map `type::`→renderer/manifest kind (design table); one `RemotionSceneTrack` per Scene in list order; overlay text from Layer `text::`, never layer name [capability:cognnitive-video-engine:Programmatic Remotion Scene Compilation]
- [x] 4.3 `asset-synthesizer.mjs`/`tts-generator.mjs`: narration←Scene body; voice/model←resolved `template::`; one TTS per narrated Scene; duration from audio w/o FFmpeg [capability:cognnitive-video-engine:Deterministic Media & TTS Asset Synthesis]
- [x] 4.4 Schedule `quote`/`lower-third`/`b-roll` Layers by list order with `enter_animation`/`exit_animation` [capability:ephemeral-overlays:Sequential Collision-Free Overlay Scheduling]
- [x] 4.5 Test: compile from iNNfo only; grep-assert no `parseVus`/VUS symbol; manifest scenarios pass [capability:cognnitive-video-engine:Programmatic Remotion Scene Compilation]

## Phase 5: Pipeline verification

- [x] 5.1 Compile + render cocodrilo from iNNfo only; assert one track per Scene in list order [capability:video-script-model:Video-Scene-Layer Concept Hierarchy]
- [x] 5.2 Test: invalid L3 stops compilation with a named non-zero error before any manifest [capability:cognnitive-video-engine:Programmatic Remotion Scene Compilation]

## Phase 6: VUS big-bang teardown

- [ ] 6.1 Delete `iNNfo/packages/innfo-video-parser/` (`src/parser/vus.peggy`, `specs/V_0-3-3.json`) [capability:video-skill-dependency-bundling:Consent-Gated On-Demand Engine Install]
- [ ] 6.2 Delete mirror `.../nn-video-script/scripts/lib/innfo-video-parser.generated.mjs` [capability:video-script-skill:Authors iNNfo L3 Script Documents]
- [ ] 6.3 Delete skill `scripts/vus-parse.mjs`,`vus-spec.mjs`,`vus-parse-runner.mjs`,`check-script.mjs`, `specs/V_0-3-3.json`, `references/vus-authoring-notes.md` [capability:video-script-skill:Authors iNNfo L3 Script Documents]
- [ ] 6.4 Delete `scripts/build-video-parser-mirror.mjs`; remove `scripts/verify.js` §7b-ter `video-parser-mirror` step [capability:video-skill-dependency-bundling:Consent-Gated On-Demand Engine Install]
- [ ] 6.5 Remove old `video` blueprint `V_0-9-0` (`iNNfo/specs/bluepriNNts/video/spec_NN.md`) + VUS samples/series-kit [capability:video-blueprint:Native L2 Video-Script Blueprint]
- [ ] 6.6 Remove `legacy-ledger.yaml` `html-comment-overlays` entry + matching marker in compiler [capability:ephemeral-overlays:Overlays Are Layer `type::` Kinds]
- [ ] 6.7 Remove SKILL.md `vus_spec:` frontmatter + VUS prose; point authoring at L3/blueprint [capability:video-script-skill:No-Prose-Copy of Syntax Facts]
- [ ] 6.8 Remove `manifest/source.yaml` vus pin/registration [capability:video-skill-dependency-bundling:Consent-Gated On-Demand Engine Install]
- [ ] 6.9 Test (grep asserts): no VUS symbol/path/`vus_spec` remains anywhere [capability:video-script-skill:No VUS parser artifact present]

## Phase 7: Documentation

- [ ] 7.1 Update `docs/innfo/documentation/template-video.md` + `templates.md` to native model [capability:video-blueprint:Native L2 Video-Script Blueprint]
- [ ] 7.2 Remove VUS prose from skill `references/*`; state blueprint-resolved facts only [capability:video-script-skill:No-Prose-Copy of Syntax Facts]

## Phase 8: Deterministic gates

- [ ] 8.1 Run `node scripts/verify.js` → green (guard literal) [capability:cognnitive-video-engine:Programmatic Remotion Scene Compilation]
- [ ] 8.2 Run `node scripts/check-integrity.js` → green (guard literal) [capability:video-script-model:Script Is an iNNfo Level-3 Document]
- [ ] 8.3 Run `npm run lint`, `npm run typecheck`, `npm run format:check` → no new drift [capability:video-blueprint:Native L2 Video-Script Blueprint]
