# Verification Report (Re-verify): 2026-10-09-video-blueprint-architecture

- **Mode**: openspec (Strict TDD not asserted by orchestrator)
- **Previous verdict**: **FAIL** at `197b1fce` (C1 missing `blueprint_version` bump; C2 `quote`/`broll` render nothing; W3/W4)
- **Remediation commit**: `3d396291` — `fix(video): bump blueprint to V_0-9-0, render quote/broll overlays, wire caption/domain tiers`
- **Worktree**: `cogNNitive-video-blueprint-architecture`
- **Diff base used**: `origin/dev` = `2533f5f6` (integration target)
- **Verdict**: **PASS** — both CRITICALs resolved, both WARNINGs resolved, no regressions, all deterministic gates green.

> Known build-noise `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` (uncommitted) was ignored, per instructions.

---

## 0. Re-verification results against the 6 items

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | CRITICAL 1 — blueprint immutability + `V_0-9-0` consistency | **PASS** | guard `--base origin/dev` exit 0; `sync-versions --check` exit 0; `sync-samples --check` exit 0; version consistent across all artifacts (§1) |
| 2 | CRITICAL 2 — `quote`/`broll` render | **PASS** | `Quote.tsx`+`Broll.tsx` exist; wired via `overlay-registry.mjs` into `Scene.tsx` switch; `overlay-render.test.mjs` passes (§2) |
| 3 | WARNING 3 — `@caption_template` consumed | **PASS** | `createCaptionsOverlay({ …, blueprint })` consumes `caption_template`; covered by 2 tests (§3) |
| 4 | WARNING 4 — domain `spec_NN.md` tier in precedence | **PASS** | `resolveBlueprintTemplates` loads domain tier first; precedence series > video_blueprint > domain > default; covered by 2 tests (§4) |
| 5 | Regressions — parser/skill suites, mirror, ledger, verify.js | **PASS** | all exit 0 (§5) |
| 6 | Proposal checkboxes + spec-scenario coverage | **PASS** | 4/4 criteria `[x]`; 16/16 scenarios C (§6, §7) |

---

## 1. CRITICAL 1 — blueprint immutability & version coherence

| Command | Result | Exit |
|---|---|---|
| `node scripts/guard-template-immutability.js --base origin/dev` | `OK — every changed canonical template bumps blueprint_version.` | **0** |
| `node scripts/sync-versions.mjs --check` | `✅ All versions are in sync.` | **0** |
| `node scripts/sync-samples.mjs --check` | `✅ All template samples are in sync with _samples_nn.` | **0** |

**`V_0-9-0` consistency confirmed:**

- `iNNfo/specs/bluepriNNts/video/spec_NN.md:8` → `blueprint_version: "V_0-9-0"`.
- `_samples_nn/kNNowledge/Ghostbusters_video_NN.md` → `parent_spec.name: "video_V_0-9-0"`, `knowledge_version: "V_0-9-0"`.
- Package sample renamed: `iNNfo/specs/bluepriNNts/video/samples/Ghostbusters_V_0-9-0_video_NN.md` (only sample present; old `V_0-8-0` file gone).
- `scripts/sync-samples.mjs:67` `SAMPLE_MAPPINGS` video target → `Ghostbusters_V_0-9-0_video_NN.md`.
- `iNNfo/apps/innfo-editor/src/config/samples.ts:54` → `video: 'V_0-9-0'`.
- `iNNfo/specs/bluepriNNts/catalog.json` video → `"adopted": "V_0-9-0"`, `blueprint_version: "V_0-9-0"`.

The pre-existing mask (base = merge-base with `origin/main`) is bypassed by the explicit `--base origin/dev`; the guard now passes on the integration target as well.

---

## 2. CRITICAL 2 — `quote`/`broll` now render

- **Components exist**: `.../scripts/scene/overlays/Quote.tsx` (renders `config.text` + optional `config.source`, returns `null` only when text is empty) and `.../overlays/Broll.tsx` (renders `Img` from `config.assetPath`, fit/position/source).
- **Wired via registry**: `.../scripts/scene/overlay-registry.mjs` exports `OVERLAY_RENDERERS` mapping `quote→'Quote'`, `broll→'Broll'` (+ existing 4). `Scene.tsx:19` imports `rendererForOverlay`; `Scene.tsx:23` extends the `Overlay.type` union with `'quote' | 'broll'`; `Scene.tsx:149-185` `renderOverlay()` switches on `rendererForOverlay(overlay.type)` with explicit `case 'Quote'` and `case 'Broll'`; only genuinely unknown types hit `default: return null`.
- **Props flow**: compiler `overlayEventConfig()` emits `{ text: event.payload }` for `quote` and `{ assetPath, fit, position, source }` for `broll` (remotion-scene-compiler.mjs L195-214), so both components receive non-empty config.
- **Test**: `test/overlay-render.test.mjs` compiles a `>`-only script (quote + lower-third + broll), asserts 3 emitted `_event_` overlays and that **every** emitted type resolves via `rendererForOverlay` (i.e. never `default`), plus exact `quote→Quote`, `broll→Broll` mappings and the complete renderer key set. **Ran: passes** (part of §5).

---

## 3. WARNING 3 — `@caption_template` consumed

- `remotion-scene-compiler.mjs:788` → `const captionTemplate = blueprintTemplates.caption_template || {}`.
- `createCaptionsOverlay({ …, blueprint })` (L413) now reads `blueprint.enter_animation`/`exit_animation` and falls back for `style`/`size`/`highlight`/`fontFamily` **below** explicit script/scene props and **above** code defaults. Both caption emission sites (L1006, L1029) pass `blueprint: captionTemplate`.
- **Tests (passing)**: "sources caption styling and animation from the blueprint `@caption_template`" (asserts size 64, highlight `#abcdef`, fontFamily `Fira Code`, enter `zoom-in`, exit `zoom-out`, and that explicit script style still wins) and "lets explicit script caption props win over the blueprint `@caption_template`".

---

## 4. WARNING 4 — domain `spec_NN.md` tier in resolution precedence

- `remotion-scene-compiler.mjs:143-149` defines `DOMAIN_BLUEPRINT_SPEC` = shipped `…/video/spec_NN.md`.
- `resolveBlueprintTemplates(scriptSource, videoBlueprint)` (L292) merges the **domain tier first**, then `video_blueprint`, then sibling `series_blueprint.md`, using field-level `mergeBlueprintTemplates` (so higher tiers override only declared fields). Effective precedence: **series > video_blueprint > domain > system defaults**.
- The domain `spec_NN.md` declares `@template`, `@caption_template`, and `@broll_template` (with `fit: cover`, `caption_style: tiktok`, `caption_size: 80`), so the domain tier is real, not empty.
- **Tests (passing)**: "loads the domain spec_NN.md as the default template tier" (asserts `@broll_template.fit === 'cover'` and `@template` present) and "lets a series override win over the domain default" (series `duration: 9` wins; unspecified `fit` still falls back to domain `cover`).

---

## 5. Regression gates (all real commands)

| Command | Result | Exit |
|---|---|---|
| `npm --workspace=@cognnitive/innfo-video-parser test` | **16 files / 62 tests passed** | **0** |
| `node --test …/test/{overlay-render,overlay-events,blueprint-resolution,scene-compiler,narration-clean,parser-mirror}.test.mjs` | **8 suites / 26 tests passed, 0 fail** | **0** |
| `node scripts/build-video-parser-mirror.mjs --check` | `OK — innfo-video-parser.generated.mjs is up to date` | **0** |
| `node scripts/lib/legacy-ledger-guard.js` | `14 ledger entries, 26 code markers validated` | **0** |
| `node scripts/verify.js` | **all deterministic pre-checks passed** | **0** |

No dist artifact was missing; `verify.js` ran `Typecheck Scripts`, `Check Video Parser Mirror Fresh`, `Check Samples Version Coherence`, `Check Version Parity`, `Template Immutability Guard`, `Check Blueprint Catalog Fresh`, and `Legacy Ledger & Quarantine Guard` — all green.

Pre-existing, not introduced by this change: esbuild `duplicate-object-key` warnings from the byte-pinned `iNNfo/packages/innfo-video-parser/specs/V_0-3-3.json`.

---

## 6. Task completeness & proposal Success Criteria

- All 5 phases / 22 tasks (Phases 1–5) remain `[x]`; the remediation adds no new task checkboxes but implements the C1/C2/W3/W4 items previously flagged.
- **Proposal Success Criteria — now all 4 `[x]` and each is true:**
  - `[x]` `>`-only script compiles and **renders** → met: `overlay-render.test.mjs` proves every emitted type maps to a renderer; `Quote`/`Broll` render.
  - `[x]` Narration TTS prose 100% clean → met (parser + skill tests).
  - `[x]` Existing scripts render with zero regressions → met (`verify.js` + parser/skill suites green).
  - `[x]` Monorepo integrity (`verify.js`, `legacy-ledger-guard.js`) → met (both exit 0; immutability now passes against `origin/dev` too).

---

## 7. Spec-scenario coverage matrix

Legend: **C** compliant (code + passing covering test).

### `video-blueprint/spec.md`
| Requirement / Scenario | Covering test (runtime) | Status |
|---|---|---|
| · Template kinds are declared in the blueprint | `blueprint-resolution.test.mjs` | C |
| · Caption overlay resolves its contract from the blueprint | `overlay-events.test.mjs` "sources caption styling and animation from the blueprint `@caption_template`" | C *(was U)* |
| · Series override wins over the domain default | `overlay-events.test.mjs` "lets a series override win over the domain default" | C *(was P)* |
| · Missing template falls back without failing | `overlay-events.test.mjs` "falls back … declares no such template" | C |
| · External blueprint is resolved and composed | `overlay-events.test.mjs` "resolves an external blueprint and composes its broll template" | C |
| · Missing blueprint reference is non-fatal | `overlay-events.test.mjs` "falls back … blueprint is missing" | C |

### `ephemeral-overlays/spec.md`
| Requirement / Scenario | Covering test | Status |
|---|---|---|
| · Each blockquote directive parses into a structured node | `OverlayEvents.test.ts` | C |
| · Narration prose stays clean of directive tokens | `OverlayEvents.test.ts`; `overlay-events.test.mjs` | C |
| · Sequential overlays do not overlap | `overlay-events.test.mjs` | C |
| · Configured animations reach the overlay track | `overlay-events.test.mjs` | C |
| · Legacy inline overlay still parses with a warning | `overlay-events.test.mjs` | C |
| · Legacy code path is ledgered | `overlay-events.test.mjs`; `legacy-ledger-guard.js` | C |

### `cognnitive-video-engine/spec.md` (MODIFIED)
| Scenario | Covering test | Status |
|---|---|---|
| Compile multi-scene VUS script into manifest | `scene-compiler.test.mjs` | C |
| `@`-declared scenes compile one track per scene | `scene-compiler.test.mjs` | C |
| Compiler scene model matches the vendored parser | `scene-compiler.test.mjs` | C |
| Blocking parser issues stop compilation | `scene-compiler.test.mjs` | C |
| Visual overlay components compiled with precise frame timings | `scene-compiler.test.mjs` | C |
| Text layer content resolves into overlay props | `scene-compiler.test.mjs` | C |
| Blueprint templates and blockquote overlays reach the manifest | `overlay-events.test.mjs` | C |

**Coverage: 16/16 C.** No untested or partial scenario remains.

---

## 8. Legacy ledger & design coherence

- **Ledger 1:1 — PASS.** Marker `// legacy:video-overlay/html-comment-overlays` exists once (`remotion-scene-compiler.mjs:231`) and maps to one ledger entry (`legacy-ledger.yaml`); guard exits 0 (14 entries / 26 markers).
- **Design coherence** unchanged and now fully coherent: parser owns `>` syntax; `- video_blueprint:` resolution with domain tier (W4 fixed); template inheritance incl. `@caption_template` (W3 fixed); legacy quarantined behind marker + warn-once; auto-sequential collision-free scheduling; config contract consumed by LowerThird/Captions/ConceptCallout/KineticTitle **plus Quote/Broll** (C2 fixed); no JSON/CSS in Level-3 scripts.

---

## 9. Verdict

**PASS.**

- CRITICAL C1 (missing `blueprint_version` bump): **RESOLVED** — `V_0-9-0` coherent everywhere; guard passes against `origin/dev`; both sync `--check`s green.
- CRITICAL C2 (`quote`/`broll` render nothing): **RESOLVED** — components exist and are registry-wired into `Scene.tsx`, props flow from the compiler, and a regression test guards render coverage.
- WARNING W3 (`@caption_template` unused): **RESOLVED** — consumed with correct precedence + tests.
- WARNING W4 (domain tier skipped): **RESOLVED** — domain `spec_NN.md` is the default tier in the documented precedence + tests.
- No regressions: parser (62 tests), skill suites (26 tests), mirror `--check`, ledger guard, and `node scripts/verify.js` all exit 0.
- Proposal Success Criteria: 4/4 true and checked. Spec-scenario coverage: 16/16 C.

**Residual warnings**: none blocking. The only observation is the pre-existing esbuild `duplicate-object-key` warnings from the byte-pinned `V_0-3-3.json` (not introduced by this change).

**Ready to archive + land on `dev`**: **YES.** No CRITICAL or WARNING remains; all deterministic gates pass. Recommend `sdd-archive`, then merge to `dev`.
