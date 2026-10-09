# Verification Report: 2026-10-09-video-blueprint-architecture

- **Mode**: openspec (Strict TDD not asserted by orchestrator)
- **Implementation commit**: `197b1fce` on `session/video-blueprint-architecture`
- **Worktree**: `cogNNitive-video-blueprint-architecture`
- **Diff base used**: `origin/dev` = `2533f5f6` (integration target); `origin/main` = `49d25f87`
- **Verdict**: **FAIL** — 2 CRITICAL (blueprint_version bump missing; quote/broll render nothing), 2 WARNING, 1 SUGGESTION.

> Known build-noise `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` (uncommitted, prior `npm run build`) was ignored, per instructions.

---

## 1. Execution evidence (real commands)

| Command | Result | Exit |
|---|---|---|
| `npm --workspace=@cognnitive/innfo-video-parser test` | **16 files / 62 tests passed** (incl. new `OverlayEvents.test.ts` 3/3) | 0 |
| `node --test .../test/{overlay-events,blueprint-resolution,scene-compiler,narration-clean,parser-mirror}.test.mjs` | **6 suites / 20 tests passed, 0 fail** | 0 |
| `node scripts/build-video-parser-mirror.mjs --check` | `OK — …innfo-video-parser.generated.mjs is up to date` | 0 |
| `node scripts/lib/legacy-ledger-guard.js` | `14 ledger entries, 26 code markers validated` | 0 |
| `node scripts/verify.js` | **141 steps, all passed** | 0 |
| `node scripts/guard-template-immutability.js` (default base) | OK (masked — see §4) | 0 |
| `node scripts/guard-template-immutability.js --base origin/dev` | **1 violation: video/spec_NN.md modified without version bump** | **1** |

Pre-existing, not introduced by this change: esbuild `duplicate-object-key` warnings from `iNNfo/packages/innfo-video-parser/specs/V_0-3-3.json` (byte-pinned file, noted in the embed change's verify-report S4).

No build was needed for the deterministic gate; `Typecheck Scripts` and `Check Video Parser Mirror Fresh` both ran inside `verify.js` and passed.

---

## 2. Task completeness

All 5 phases / 20 tasks in `tasks.md` are checked `[x]`. Each has a corresponding artifact in the commit diff:

| Phase | Tasks | Evidence |
|---|---|---|
| 0 Resolve open questions | 0.1–0.2 `[x]` | `design.md` Decision table + Open Questions |
| 1 Blueprint | 1.1–1.3 `[x]` | `spec_NN.md` blocks; `blueprint-resolution.test.mjs` |
| 2 Parser + mirror | 2.1–2.6 `[x]` | `vus.peggy`, `vus_parser.js`, `ast.ts`, `lowering.ts`, `types.ts`; mirror `--check` |
| 3 Compiler + overlays | 3.1–3.5 `[x]` | `remotion-scene-compiler.mjs`, `overlay-animation.mjs`, overlay `.tsx`; `overlay-events.test.mjs` |
| 4 Legacy + ledger | 4.1–4.4 `[x]` | marker + `legacy-ledger.yaml` entry; ledger guard |
| 5 Gate | 5.1–5.2 `[x]` | `verify.js` exit 0 |

Task completion: **PASS** (all boxes ticked; artifact per task exists). No unchecked implementation task.

---

## 3. Spec-scenario coverage matrix

Legend: **C** compliant (code + passing covering test), **P** partial, **U** untested/no covering test.

### `video-blueprint/spec.md`
| Requirement / Scenario | Covering test (runtime) | Status |
|---|---|---|
| R1 Level 2 Video Blueprint Template Schema | | |
| · Template kinds are declared in the blueprint | `blueprint-resolution.test.mjs` #1 (✔) | C |
| · **Caption overlay resolves its contract from the blueprint** | **none** — `@caption_template` is parsed but never consumed (only `template`/`broll_template` feed `OVERLAY_EVENT_SPECS`; `blueprintTemplates` used only at compiler L1017) | **U** |
| R2 Blueprint Inheritance and Override | | |
| · **Series override wins over the domain default** | `overlay-events.test.mjs` "resolves an external blueprint …" (series > referenced/system) — but the compiler's `resolveBlueprintTemplates` never loads the **domain `spec_NN.md`** tier (design says series > domain > system) | **P** |
| · Missing template falls back without failing | `overlay-events.test.mjs` "falls back … declares no such template" | C |
| R3 Script-to-Blueprint Reference Resolution | | |
| · External blueprint resolved and composed | `overlay-events.test.mjs` "resolves an external blueprint and composes its broll template" | C |
| · Missing blueprint reference is non-fatal | `overlay-events.test.mjs` "falls back … blueprint is missing" | C |

### `ephemeral-overlays/spec.md`
| Requirement / Scenario | Covering test | Status |
|---|---|---|
| R1 Markdown-Native Blockquote Overlay Syntax | | |
| · Each blockquote directive parses into a structured node | `OverlayEvents.test.ts` "parses each blockquote form …" | C |
| · Narration prose stays clean of directive tokens | `OverlayEvents.test.ts` "keeps narration prose free of directive tokens"; `overlay-events.test.mjs` "rejects directive tokens from the spoken narration" | C |
| R2 Sequential Collision-Free Overlay Scheduling | | |
| · Sequential overlays do not overlap | `overlay-events.test.mjs` "emits one overlay track per > event …" | C |
| · Configured animations reach the overlay track | `overlay-events.test.mjs` "carries configured enter_animation and exit_animation …" | C |
| R3 Legacy Inline Overlay Deprecation | | |
| · Legacy inline overlay still parses with a warning | `overlay-events.test.mjs` "still recognizes legacy … warns once per compile" | C |
| · Legacy code path is ledgered | `overlay-events.test.mjs` "is quarantined with a legacy marker …"; `legacy-ledger-guard.js` | C |

### `cognnitive-video-engine/spec.md` (MODIFIED: Programmatic Remotion Scene Compilation)
| Scenario | Covering test | Status |
|---|---|---|
| Compile multi-scene VUS script into manifest | `scene-compiler.test.mjs` | C |
| `@`-declared scenes compile one track per scene | `scene-compiler.test.mjs` | C |
| Compiler scene model matches the vendored parser | `scene-compiler.test.mjs` | C |
| Blocking parser issues stop compilation | `scene-compiler.test.mjs` | C |
| Visual overlay components compiled with precise frame timings | `scene-compiler.test.mjs` | C |
| Text layer content resolves into overlay props | `scene-compiler.test.mjs` | C |
| Blueprint templates and blockquote overlays reach the manifest | `overlay-events.test.mjs` (manifest tracks) | C (manifest only) |

**Coverage summary**: 14 C, 1 P, 1 U across 16 scenarios. The literal delta-spec scenarios are overwhelmingly covered; the two non-C items and the §4 proposal-level rendering gap are the substantive findings.

---

## 4. CRITICAL findings

### C1 — The video blueprint MUST bump `blueprint_version` (currently missing) — **FAIL**

**Evidence.** Commit `197b1fce` modified `iNNfo/specs/bluepriNNts/video/spec_NN.md` (added `@template`, `@caption_template`, `@broll_template` + inheritance) **and** many files under `iNNfo/specs/bluepriNNts/video/skills/**`, but left `blueprint_version: "V_0-8-0"` unchanged. The integration branch `origin/dev` is already at `V_0-8-0` (verified via `git show origin/dev:…/video/spec_NN.md`).

The repo's authoritative guard makes the rule explicit (`scripts/guard-template-immutability.js` docstring L11-29):
> "any content change to a canonical template is accompanied by a strictly increasing `blueprint_version` relative to the base branch" … "any A/M/D/R under `<bluepriNNt>/skills/**` requires the owning `<bluepriNNt>/spec_NN.md` to carry a `blueprint_version` strictly greater than its base version".

`docs/innfo/template-package-spec.md` §2 states it normatively:
> "**any change under `skills/**` requires a `blueprint_version` bump of the owning package**."

The direct precedent is `openspec/changes/2026-10-07-stable-element-identity/verify-report.md` §6.2, which documents exactly this failure mode:
> "When merging to `dev` or preparing release to `main`, bump `iNNfo/specs/bluepriNNts/video/spec_NN.md` from `V_0-7-2` to `V_0-7-3` and execute `npm run sync:versions` to synchronize `manifest/source.yaml`, `samples.ts`, and `catalog.json`."

Also `87924f34` bumped video to `V_0-7-2` specifically "for style-props schema addition" — additive schema changes bump.

**Why `verify.js` still passes (the mask).** `guard-template-immutability.js` resolves its base as `merge-base(HEAD, origin/main)` = `49d25f87`, which **predates** the co-resident `2026-10-09-embed-video-script-skill` change that owns the `V_0-7-2 → V_0-8-0` bump. The net branch-vs-main diff therefore already contains one bump and the gate is satisfied. Proof:

```
node scripts/guard-template-immutability.js                         # exit 0 (masked, base=origin/main fork)
node scripts/guard-template-immutability.js --base origin/dev      # exit 1
  ERROR: canonical template iNNfo/specs/bluepriNNts/video/spec_NN.md was modified
  without incrementing frontmatter blueprint_version (base: "V_0-8-0", current: "V_0-8-0").
```
`origin/dev` already carries `V_0-8-0`, so this change lands as a content edit at the same version. As soon as `main` catches up to `V_0-8-0`, `verify.js` will fail too.

**Required remediation (exact):**
1. `iNNfo/specs/bluepriNNts/video/spec_NN.md`: `blueprint_version: "V_0-8-0"` → `"V_0-9-0"`.
2. Refresh the sample pin to track the current version (else `Check Samples Version Coherence` fails `NO_CURRENT_SAMPLE`):
   - `_samples_nn/kNNowledge/Ghostbusters_video_NN.md`: `parent_spec.name: "video_V_0-8-0"` → `"video_V_0-9-0"`; `knowledge_version: "V_0-8-0"` → `"V_0-9-0"`.
   - `iNNfo/specs/bluepriNNts/video/samples/Ghostbusters_V_0-8-0_video_NN.md` → rename to `Ghostbusters_V_0-9-0_video_NN.md` (same frontmatter edits).
   - `scripts/sync-samples.mjs` `SAMPLE_MAPPINGS` video target → `Ghostbusters_V_0-9-0_video_NN.md`.
3. `node scripts/sync-samples.mjs` (project `_samples_nn` → package samples).
4. `npm run sync:versions` (chains `node scripts/sync-versions.mjs` **and** `node scripts/blueprint-catalog.mjs`) — updates `iNNfo/apps/innfo-editor/src/config/samples.ts` `SHIPPED_BLUEPRINT_VERSIONS` and `iNNfo/specs/bluepriNNts/catalog.json` (currently `"adopted": "V_0-8-0"`).
5. Re-run `node scripts/verify.js` (must exit 0) and `node scripts/guard-template-immutability.js --base origin/dev` (must exit 0).

### C2 — `quote` and `broll` overlays render nothing (no Scene component) — **FAIL**

**Evidence.** The compiler emits typed overlay tracks `quote` and `broll` (`remotion-scene-compiler.mjs` `OVERLAY_EVENT_SPECS`, L134-138; emission L1029-1038; test asserts `['quote','lowerThird','broll']`). But `scripts/scene/Scene.tsx` `renderOverlay()` (L139-174) has cases only for `lowerThird`, `kineticTitle`, `conceptCallout`, `captions`; every other type hits `default: return null`. No `Quote`/`Broll` component exists (the commit touched only LowerThird/Captions/ConceptCallout/KineticTitle). A `> quote:` or `> broll:` line therefore produces **zero visual output**.

**Spec judgement.** The three delta-spec scenarios stop at the **manifest** ("it contains one overlay track per blockquote event" — `cognnitive-video-engine`, "Blueprint templates and blockquote overlays reach the manifest"), and that scenario passes. No delta scenario literally requires React rendering. However the proposal's own **Success Criterion #1** — *"New video script using only `>` syntax and an external blueprint compiles and **renders** identical or superior video output"* — is violated: a `>`-only script renders missing overlays for 2 of the 3 supported forms. This gap is **not documented anywhere** as a follow-up (design's File Changes lists no new component; task 3.4 only extends existing components). It is therefore an undocumented gap, not an accepted follow-up.

**Required remediation (choose one):**
- **Implement**: add `Quote` and `Broll` overlay components and wire them into `Scene.tsx` `renderOverlay` (extend the `Overlay.type` union), plus a render/manifest-to-props test asserting both types produce output; **or**
- **Explicitly narrow scope**: remove `quote`/`broll` from `OVERLAY_EVENT_SPECS` emission (or mark them manifest-only) and amend proposal Success Criterion #1 + add a `tasks.md`/`design.md` follow-up describing the deferred rendering. The first option matches the stated intent; the second at minimum removes the silent drop.

---

## 5. WARNING findings

- **W1 — Domain blueprint tier not resolved.** `resolveBlueprintTemplates` (L272-290) loads only the script-declared `video_blueprint` and `series_blueprint.md`; the design's precedence chain ("script-local → series `series_blueprint.md` → domain `spec_NN.md` → system default") never reads the domain `spec_NN.md` automatically. `video-blueprint` R2 ("domain-level shared blueprint plus series-level overrides") is only satisfied when the script explicitly points at a blueprint file. Scenario "Series override wins over the domain default" is therefore partial.
- **W2 — `@caption_template` is parsed but never applied.** `BLUEPRINT_TEMPLATE_RE`/`parseBlueprintTemplates` recognize `@caption_template`, but no compiler path consumes it; caption styling flows from script props (`caption_style`) only. The `video-blueprint` scenario "Caption overlay resolves its contract from the blueprint" has no covering test and no implementation path. (Related to C1's missing coverage row.)

## 6. SUGGESTION findings

- **S1 — Add a guard assertion for the proposal's render criterion.** A test that compiles a `>`-only script and asserts every emitted overlay `type` is handled by `renderOverlay` (i.e. not `default`) would have caught C2 at build time.

---

## 7. Success criteria & legacy ledger (item 5)

**Proposal Success Criteria — all four checkboxes are still `[ ]` (unchecked)** in `proposal.md` L71-74:
- `[ ]` `>`-only script compiles and **renders** identical/superior output → **NOT MET** (C2).
- `[ ]` Narration TTS prose 100% clean of directive tokens → **MET** (tests pass) but box unchecked.
- `[ ]` Existing scripts render with zero regressions under compatibility mode → **MET** (full `verify.js` + legacy tests green) but box unchecked.
- `[ ]` Monorepo integrity passes (`verify.js`, `legacy-ledger-guard.js`) → **MET** at gate level (both exit 0) but **at risk** under C1 once main advances; box unchecked.

**Legacy-ledger 1:1 contract — PASS.** Marker `// legacy:video-overlay/html-comment-overlays` exists exactly once (`remotion-scene-compiler.mjs` L212) and maps to exactly one ledger entry `id: html-comment-overlays` (`legacy-ledger.yaml` L119) declaring `owner: 2026-10-09-video-blueprint-architecture` and the compiler path. `legacy-ledger-guard.js` exits 0 (14 entries / 26 markers); the dedicated test asserts exactly one matching entry and path.

---

## 8. Design coherence

| Design decision | Implementation | Status |
|---|---|---|
| Parser owns `>` syntax (PEG, AST only) | `vus.peggy` `BlockQuoteEvent`; compiler consumes `sc.overlay_events` | Coherent |
| Blockquote shape `kind: payload [opts]` | grammar + `OverlayEvents.test.ts` | Coherent |
| `- video_blueprint:` reference resolution | `resolveBlueprintTemplates` | Coherent (domain tier missing, W1) |
| Template inheritance via VUS `@…_template` blocks | `parseBlueprintTemplates` | Coherent (caption unused, W2) |
| Legacy quarantined behind `legacy:` marker + warn once | marker + ledger + test | Coherent |
| Auto-sequential collision-free scheduling | L1011-1040 + test | Coherent |
| Config contract `{id,type,fromFrame,durationInFrames,enterAnimation,exitAnimation,config}` | emission + test | Coherent |
| "No JSON/CSS authored in Level-3 script" | compiler-derived config | Coherent |
| `enterAnimation`/`exitAnimation` consumed by components | LowerThird/Captions/ConceptCallout/KineticTitle + `overlay-animation.mjs` | Coherent (only for the 4 rendered types) |

---

## 9. Verdict

**FAIL.**

- Deterministic gate (`node scripts/verify.js`, mirror `--check`, ledger guard, parser + skill suites): **all PASS**.
- Task completeness: **PASS**.
- Delta spec-scenario coverage: **14/16 C, 1 P, 1 U**.
- **CRITICAL C1**: missing `blueprint_version` bump — required by `guard-template-immutability.js` and `docs/innfo/template-package-spec.md`; gate currently masked by `origin/main` fork base; **fails** against `origin/dev`. Remediation in §4-C1.
- **CRITICAL C2**: `quote`/`broll` emit manifest tracks but render nothing (`Scene.tsx` default → null); violates proposal Success Criterion #1; not documented as a follow-up. Remediation in §4-C2.

Do not archive until C1 and C2 are resolved (or C2 is explicitly scoped out with amended success criteria).
