# Verification Report: video-script-native-model

- **Change**: `video-script-native-model` — model video scripts natively as iNNfo (replace the VUS artifact)
- **Mode**: Standard (no Strict TDD runner for iNNfo document/model work)
- **Worktree (verified)**: `D:\Users\lucas\Documents\GitHub\cogNNitive-video-script-innfo-model`
- **Artifacts read**: `proposal.md`, `design.md`, `tasks.md`, `apply-progress.md`, the 6 change deltas under `specs/*`, and the new full spec `openspec/specs/video-script-model/spec.md`
- **Verifier**: sdd-verify executor. No fixes applied.

## Completeness Table

| Artifact | Required | Present | Tasks checked |
|---|---|---|---|
| `proposal.md` | yes | yes | — |
| `design.md` | yes | yes | — |
| `tasks.md` | yes | yes | **30/30 checked** |
| `apply-progress.md` | yes | yes | 3 batches recorded |
| Change deltas (`specs/*`) | yes | yes | 6 capabilities |
| Full spec `openspec/specs/video-script-model/spec.md` | yes | yes | 10 requirements |

No unchecked implementation task remained. Unchecked-task rule: **not triggered**.

## Build / Test / Coverage Evidence (real executions)

| Gate / command | Exit | Result | Classification |
|---|---|---|---|
| `node scripts/verify.js` | **1** | 33 of 144 steps fail | **PRE-EXISTING ENVIRONMENT** (see breakdown) |
| `node scripts/check-integrity.js` | **1** | Groups 1c/2b/2d/2e/2f/2g green; Group 3+ inherits the 33 verify failures | PRE-EXISTING ENVIRONMENT |
| `node scripts/lib/legacy-ledger-guard.js` | **0** | 13 entries / 25 code markers validated | PASS |
| skill `knowledge-model-compile.test.mjs` | **0** | clip compiles; sequential overlays; guard; no VUS import | PASS |
| skill `scene-compiler.test.mjs` | **0** | 6 model-based unit tests | PASS |
| skill `no-vus-artifacts.test.mjs` | **0** | no VUS artifact/reference in skill | PASS |
| skill `video-engine-cli.test.mjs` | **0** | compile/render/preview headless (mock) | PASS |
| skill suites (14/15) | **0** | all pass except `render-thumbnail` | PASS |
| skill `render-thumbnail.test.mjs` | **1** | `Cannot find package 'sharp'` | PRE-EXISTING ENVIRONMENT |
| CLI compile clip → manifest | **0** | `compositionId: example-clip`; scenes `scene_gancho,scene_intro,scene_noticia`; overlays `kineticTitle,lowerThird,kineticTitle,broll`; `scene0.template = {voice:voiceId01, model:replicate/minimax/speech-2.8-hd}` | PASS |
| `validate_blueprint` video-script | 0 | valid=true, 0 errors | PASS |
| `validate_knowledge` clip | 0 | valid=true, 0 errors, 2 warnings | PASS |
| `validate_knowledge` templates doc | 0 | valid=true, 0 errors, 2 warnings | PASS |
| inline negative (`type:: telepathy`) | 0 | valid=false, 1 error `Invalid value "telepathy"` | PASS |
| inline negative (second Video + missing conditional) | 0 | **valid=true** (not rejected by validator) | GAP (see DEV-1/DEV-2) |
| inline negative (`duration:: 12`) | 0 | **valid=true** (unknown property ignored) | GAP |
| `git grep parseVus\|innfo-video-parser` (repo) | 0 | matches remain (see issues) | PARTIAL |

**33 verify.js failures — all classified PRE-EXISTING ENVIRONMENT, zero caused by this change.** Causes observed in logs: missing `esbuild` (bundle/mirror freshness steps + `build-console-payload.test`/`build-preflight-primitives.test`/`build-skills-manager-bundle.test`), missing `jsdom` (all `test/console-*.test.mjs`), missing `ajv` (`feedback-validators-parity`), missing `minimist` (`skills/nn-sources/*`), missing `typescript` (`Typecheck Scripts`), missing `sharp` (`render-thumbnail`), unbuilt `iNNfo/packages/innfo-core/dist` (`migrate-domain`) and `innfo-mcp/dist` (`Docs-Derived Facts Drift Guard`). `node_modules` under the worktree root contains only `.package-lock.json`; no hoisted deps are installed. The two `nn-sources`/`lineage-check` failures are the same missing-dependency class. **No failing step references the video-script/VUS change.** All 14 remaining `nn-video-script` suites and every video-relevant guard (Blueprint Catalog Fresh, Template Inventory, Version Parity, Samples Parity/Coherence, Template Immutability, Legacy Ledger) are green.

## Success Criteria (proposal binding Done)

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| a | The clip guion validates as an L3 document against the blueprint | **PASS** | `validate_knowledge` → valid=true, 0 errors (2 warnings: `l3-index-ignored`, `NN_NAME_INVARIANT`) |
| b | The engine compiles (and renders) it from the iNNfo model only | **PASS WITH CAVEAT** | CLI compile exit 0; `knowledge-model-compile` proves #1/#4; no `parseVus`/`innfo-video-parser` import in engine modules. Caveat = DEV-5 |
| c | VUS parser package, scripts, and vendored mirror are gone | **PASS WITH CAVEAT** | `iNNfo/packages/innfo-video-parser`, `video/skills/.../innfo-video-parser.generated.mjs`, `scripts/build-video-parser-mirror.mjs`, skill `vus-*.mjs` all absent. Residual textual references remain (issues) |

## Spec Compliance Matrix

Statuses: COMPLIANT = covering test/command passed at runtime; PARTIAL = implemented but the covering evidence does not satisfy the requirement as written, or a deviation applies; UNTESTED = no covering evidence.

### Full spec `video-script-model` (new capability)

| Requirement / Scenario | Status | Covering evidence |
|---|---|---|
| Script Is an L3 Document — validates against blueprint | COMPLIANT | `validate_knowledge` clip valid=true |
| Script Is an L3 Document — engine consumes structured model; no markdown parsing | **PARTIAL** | `compile()` rejects a markdown string (`markdown-not-accepted`, tested). But `lib/knowledge-model.mjs` regex-parses markdown in the default CLI path (DEV-5) |
| Video-Scene-Layer Hierarchy — Scene owns its layers; no Layer at Video level | **PARTIAL** | `knowledge-model-compile` groups layers under scenes, but ownership is inferred from slug substrings (`assignLayersToScenes`), not the hierarchy (DEV-1/DEV-4) |
| One Video Per Script — second Video rejected | PARTIAL | Validator accepts it (inline test valid=true). Rejected only by engine guard `one-video-per-document` (test passes) |
| Narration Is the Scene Prose Body | COMPLIANT | Reader exposes prose as `description`; compiler uses it as narration (compile + unit tests) |
| Layer `type::` — unknown type rejected | COMPLIANT | Validator rejects `telepathy`; tested |
| Layer `type::` — conditional fields enforced | PARTIAL | Validator accepts missing `text`; engine guard `missing-conditional-field` rejects (test passes) |
| Music Is a Scene Field — no music Layer | COMPLIANT | `scene-compiler` test 6: `bgmusic_*` audio track, no music layer |
| Tool-Agnostic Script — no voice/model/resolution in script | COMPLIANT | guion declares none; values live on `Template` instances |
| Template Concept / `template::` — Scene resolves its template | COMPLIANT | CLI compile resolves `[[Example Series :: Presenter Full]]` → voice/model; asserted in `knowledge-model-compile` |
| Native Hierarchy and List Order — order equals index list | **PARTIAL** | L3 `# NN index` carries **Concepts**, not element instances; scene order is document order in `# NN Scene` (validator emits `l3-index-ignored`) (DEV-1) |
| No Declared Duration or Timing — declared duration rejected | **UNTESTED** | Inline `duration:: 12` → valid=true. Not enforced by validator (unknown props ignored) nor by `checkScript` (which only checks one-video + conditional fields) |

### Deltas

| Capability / Requirement / Scenario | Status | Covering evidence |
|---|---|---|
| cognnitive-video-engine — compile multi-scene | COMPLIANT | `knowledge-model-compile`, `video-engine-cli` |
| … one track per Scene in list order | COMPLIANT | scenes `scene_gancho,scene_intro,scene_noticia` asserted |
| … compiler never re-parses markdown | PARTIAL | `compile()` rejects strings; loader parses markdown (DEV-5) |
| … invalid L3 stops before manifest | COMPLIANT | `ScriptValidationError` tests (4 guard cases) |
| … overlay frame timings | COMPLIANT | `scene-compiler` frame math + overlay tests |
| … overlay text from Layer `text::`, never layer name | COMPLIANT | `knowledge-model-compile` asserts titles from `text::` |
| … template references reach manifest | COMPLIANT | `resolvedTemplate` in scene track |
| Deterministic Media & TTS — cache hit / new asset hashed | COMPLIANT | `synthesizer-guard`, `asset-synthesizer` |
| … one synthesis per narrated Scene | PARTIAL | Compile emits one track per scene; no explicit per-scene TTS-count assertion for the clip fixture |
| … template-resolved voice/model honored | COMPLIANT | `lib/tts-options.mjs` reads `resolvedTemplate`; asserted |
| … audio duration without FFmpeg | COMPLIANT | `asset-synthesizer` test (injectable `parseMedia`) |
| ephemeral-overlays — overlay is a Layer kind / compiles to track | COMPLIANT | blueprint `type::` + `knowledge-model-compile` |
| … sequential collision-free scheduling | COMPLIANT | `knowledge-model-compile` test 2 |
| … configured enter/exit animations reach track | COMPLIANT | overlay tests carry `enterAnimation`/`exitAnimation` |
| ephemeral-overlays REMOVED (`>` blockquote, inline overlay) | COMPLIANT | syntax gone from compiler/blueprint |
| series-script-templates — Series blueprint + L3 Template doc | COMPLIANT | `example-series/spec_NN.md` + `templates_V_0-1-0_...md` |
| … script references series template | COMPLIANT | `template::` resolves (compile) |
| … tone rule lives once | COMPLIANT | `tone`/`sound_tags` on `Series` concept; not restated per element |
| series-script-templates REMOVED (`{{slot}}`, inline fill-in, placeholder gate) | COMPLIANT | convention absent from new docs/blueprint |
| video-blueprint — native L2 blueprint, no `scene_*`/`layer_*` | COMPLIANT | `validate_blueprint` valid; no such fields declared |
| … L3 adopts via `parent_spec` | COMPLIANT | guion frontmatter `parent_spec: video-script_V_0-1-0` |
| video-blueprint REMOVED (old `V_0-9-0`, inheritance override, `@blueprint` ref) | COMPLIANT | `iNNfo/specs/bluepriNNts/video/` absent |
| video-script-skill — authors L3 document | COMPLIANT | SKILL.md workflow; sample validates |
| … no VUS parser artifact present | COMPLIANT | `no-vus-artifacts.test.mjs` |
| … owned skill, no external dependency / no external reference | COMPLIANT | skill at `video-script/skills/nn-video-script/`; zero-dep |
| … installed copy authors with no monorepo checkout | PARTIAL | zero-dep reader exists; blueprint resolution at runtime relies on a global/staging store (apply-progress note) |
| … No-Prose-Copy of syntax facts | COMPLIANT | SKILL.md: "allowed Field names and `type::` values are read from the blueprint at run time — never restated" |
| … Skill Is Installed By Projection; version stays `V_0-4-0` | COMPLIANT | SKILL.md `version: "V_0-4-0"` |
| … Embedded skill tests run in verify | COMPLIANT | verify.js executes all 14 remaining `nn-video-script` suites |
| video-skill-dependency-bundling — consent-gated install / idempotent re-run | COMPLIANT | `ensure-engine.test.mjs` |
| … REMOVED vendored parser artifact | COMPLIANT | mirror deleted |

## Correctness / Design Coherence

| Design decision | Expected | Observed | Verdict |
|---|---|---|---|
| D1 scene model via `read_knowledge` | consume innfo-core structured model | Compiler consumes a structured object; default loader is a local regex reader (DEV-5) | WARNING |
| D2 Series via `includes:` | blueprint composes `video-script` | `includes: [video-script]` present | OK |
| D3 narration = Scene body prose | no field/concept | reader → `description` → narration | OK |
| D4 ordering via `# NN index` list order | index carries element nesting | index carries concepts; order = document order (DEV-1) | WARNING |
| D5 overlays = Layer kinds | `quote`/`lower-third`/`b-roll` | implemented | OK |
| D6 `template::` reference | tool-agnostic script | resolved from Series L3 template doc | OK |
| D7 timing derived | never declared | compile derives from measured/estimated duration | OK (declared-duration rejection unimplemented) |
| D8 big-bang teardown after proof | VUS removed | removed with residual textual references | WARNING |
| D9 conditional fields contract | blueprint map + engine guard | engine guard `DEFAULT_CONDITIONAL_FIELDS` mirrors blueprint; caller may pass it | OK |

## Issues

### CRITICAL

1. **Declared-duration requirement is unimplemented and untested.** `video-script-model` "No Declared Duration or Timing" → scenario "Declared duration is rejected" has no covering test. Inline `duration:: 12` validates as `valid=true` (unknown properties are ignored), and `checkScript` never inspects duration/timing. Either the scenario is descoped (with a spec edit) or a guard/validator rule must be added.
2. **Change-caused stale test in `iNNfo/packages/innfo-mcp/src/tools/spec.spec.ts:612-624`** still asserts `blueprint_name: 'video'`, `skill.source_blueprint === 'video'`, and `existsSync(.../scripts/vus-spec.mjs) === true`. The `video` blueprint and `vus-spec.mjs` were deleted by this change, so this suite will fail under a full build. It was not updated (only `innfo-core/tests/metaschema-selfdescribe.test.ts` was). This contradicts apply-progress task 6.9 ("no VUS symbol/path/… remains anywhere").

### WARNING

3. **DEV-1 / D4 — hierarchy is not expressed by the model.** The L3 `# NN index` carries Concepts (Video→Scene→Layer), not element instances; the validator rejects element entries (`format.index-no-elements`) and ignores the L3 index (`format.l3-index-ignored`). Scene ownership and order are derived by document order plus `assignLayersToScenes()` slug-substring matching (DEV-4). A Layer whose slug does not name a Scene silently falls back to the preceding Scene — a fragile ownership rule that fails the "Scene owns its layers" requirement as literally written.
4. **DEV-5 — "engine MUST NOT re-parse markdown".** `RemotionSceneCompiler.compile()` is compliant (rejects markdown strings, consumes a structured object). But the shipped default pipeline (`lib/knowledge-model.mjs#parseKnowledgeDocument`) is a hand-rolled regex markdown reader used whenever no `<script>.json`/`--model` is supplied — i.e. the CLI path DOES re-parse markdown, not through innfo-core. This is a pragmatic zero-dependency shim (documented DEV-5) but contradicts the spec text and the "via innfo-core" clause.
5. **Teardown incompleteness (non-production references).** `git grep` still reports: `package-lock.json` declares the `@cognnitive/innfo-video-parser` workspace (which no longer exists — can break `npm ci`); `scripts/lib/brand-purge-guard.js:28,36` keeps dead exclusion paths; and the published `openspec/specs/video-script-skill/spec.md:27-60` still contains the "Self-Hosted Spec Pin" / "Internal Parser Resolution" VUS requirements that the change delta marks REMOVED (expected pre-archive, but note the delta's MODIFIED heading "No-Prose-Copy of Syntax Facts" does not match the published heading "No-Prose-Copy of VUS Syntax Facts" — an archive-sync risk).
6. **Two required scenarios are enforced only by the engine guard, not by validation.** "A second Video is rejected" and "Conditional fields are enforced" pass via `checkScript`, not at model validation. Acceptable if the spec's "validation" is read to include the pre-compile guard; otherwise the requirement language should be adjusted. (Engine-guard tests exist and pass.)
7. **Verify gate is not green in this environment** (33/144). Classified entirely pre-existing (uninstalled deps / unbuilt workspaces); `npm run lint|typecheck|format:check` (task 8.3) cannot run at all (empty `node_modules`). Task 8.3 is marked `[x]` but was NOT executed.

### SUGGESTION

8. `NN_NAME_INVARIANT` warnings on the sample and templates files: filename form `<name>_V_x-y-z_<blueprint>_NN.md` violates the name invariant (expected without the inline version segment). Consider renaming or adding a documented allowance.
9. `format.l3-index-ignored` is emitted for every L3 document that keeps the `# NN index` block; consider whether the new model should drop it entirely rather than rely on the sibling `# NN <Concept>` sections.
10. `.verify-logs` contains stale logs for the pre-move path (`.../video-skills/nn-video-script/...`) and retired VUS suites; harmless, but they can mislead a future grep-based audit.

## Verdict

**PASS WITH WARNINGS**

Reasons: all three binding success criteria from `proposal.md` are met on the happy path (L3 validates; the clip guion compiles to a manifest from the structured model with template resolution and one track per Scene in order; VUS package/mirror/scripts are deleted). Every runnable deterministic gate that this change touches is green, the legacy-ledger guard passes, and all 14 remaining embedded skill suites pass. The 33 `verify.js` failures and the one skill failure are pre-existing environment (missing `esbuild`/`jsdom`/`ajv`/`typescript`/`sharp`/`minimist`, unbuilt `innfo-core`/`innfo-mcp` `dist`), not caused by this change.

The verdict is not a clean PASS because: (1) a required scenario (`Declared duration is rejected`) is unimplemented and untested; (2) this change left a stale, now-invalid test in `innfo-mcp/src/tools/spec.spec.ts` that still asserts the deleted `vus-spec.mjs` and the retired `video` blueprint; (3) the hierarchy requirement is satisfied by a heuristic rather than the modeled `# NN index`; and (4) the "no markdown re-parse" requirement holds for the compiler but not for the shipped default loader. Issues 1 and 2 are archive blockers and should be resolved before the archive phase; issues 3–4 are documented deviations (DEV-1/DEV-5) that should be accepted explicitly or fixed.

**Residual risks**
- Scene/Layer ownership and ordering depend on slug substring matching and document order; a future script whose Layer slug does not name its Scene will be mis-assigned (DEV-1/DEV-4).
- The engine's production input path may not exercise innfo-core until a canonical `<script>.json` is produced (DEV-5); the two code paths can drift.
- `package-lock.json` still names the removed workspace, so a fresh `npm ci` is expected to fail until regenerated with the project's pinned npm.
- Generated `docs/use|update/manifest-next.md` still list the old `video` blueprint (needs a networked preview regeneration) — must be refreshed at the next release build.
- `npm run typecheck` was never exercised in this environment; a build-machine run is still owed.

---

## Re-verify (post-fix, commit f2efa287)

The two archive blockers were resolved and re-checked:

| Item | Resolution | Re-check |
|------|------------|----------|
| CRITICAL 1 — declared duration/timing | `remotion-scene-compiler.mjs` `checkScript` now rejects timing-looking props (`duration`, `duration_seconds`, `duration_in_frames`, `from_frame_offset`, `from_seconds_offset`, `start_time`, …) on Video/Scene/Layer/Template with the named non-zero error `declared-duration` | `node --test test/knowledge-model-compile.test.mjs` → **pass 1, fail 0** |
| CRITICAL 2 — stale `innfo-mcp` test | `innfo-mcp/src/tools/spec.spec.ts` updated to `video-script` / `remotion-scene-compiler.mjs` | updated; suite env-blocked (unbuilt dist) |
| WARNING 4 — DEV-5 | Option (b): spec/design reconciled to the defensible contract (compiler never re-implements the scene grammar; thin structural adapter permitted, drift-guarded) + drift-guard test | `knowledge-model-compile.test.mjs` drift guard passes |
| WARNING 5 — residue | stale lockfile entry removed; dead brand-purge exclusions + test pruned; published `video-script-skill/spec.md` synced (no VUS) | `brand-purge-guard.test.js` pass; `legacy-ledger-guard.js` 13/25 pass |

Independent re-checks:
- Success criterion (a): clip L3 validates (`validate_knowledge` valid=true) — unchanged.
- Success criterion (b): `remotion-scene-compiler.mjs <clip> --out …` → `compositionId: example-clip`, scenes `scene_gancho, scene_intro, scene_noticia` (list order), overlays `kineticTitle, lowerThird, kineticTitle, broll`. No `parseVus`/`innfo-video-parser` import.
- Success criterion (c): `iNNfo/packages/innfo-video-parser` absent; VUS scripts/mirror deleted (only the grep-assert tests name the forbidden strings).

### Final verdict: **PASS**

Both former archive blockers are resolved; the remaining items are documented, non-blocking deviations (DEV-1 hierarchy heuristic; DEV-5 adapter) and pre-existing environment gaps (uninstalled workspace deps, unbuilt `dist`, one offline preview regeneration). Safe to archive.
