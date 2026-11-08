# Design: coNNtent Render Hotfix

## Technical Approach

Seven test-first fixes inside `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/` (paths below are relative to it). There is no layout change and no blueprint change. The root cause of item 1 is a vocabulary drift: the blueprint's Layer `type` options moved to `avatar | media | text | animation` plus `style`, but the scene compiler still dispatches on the old type names. Item 2 is narrowed to two code-level gaps and closed by a frame-sampling experiment. `produce` gains a pre-render synthesis pass and a post-render overlay QA gate.

## Investigation (read-only)

| # | Finding | Status |
|---|---|---|
| a1 | The evidence episode declares `type:: text` + `style:: title/lower-third/caption`, `type:: media`, `type:: avatar` (`gas-pump-printer-powerball_coNNtent_NN.md:43-89`). The registry agrees: `type` options are `avatar, media, text, animation`, and `style` is "for a `text` Layer: the visual component" (`lib/field-registry.generated.json:647-662,749-763`). | VERIFIED |
| a2 | `TYPE_RENDERERS` has no `text` key (`scene-compiler.mjs:72-86`). `lowerLayer` falls back to `{kind:'layer', manifest: declared}` (`:584`), so a text layer becomes a *drawable* with `layer_type: text`. `compile()` only builds overlays from `kind === 'overlay'` layers and dispatches on `layer.type === 'title'` etc. (`:841-898`). Result: the text layers sit in `scenes[].props.layers` (`manifest.json:29-35,62-68,95-101`). `drawableLayers` drops them because they have no asset (`scene-project.mjs:54-60`), so no markup is emitted at all (`compositions/00-gancho.html`). The installed copy under `~/.agents` has the same keys. | VERIFIED |
| a3 | The Chrome watermark and CTA *do* reach the overlays because the compiler injects them with the old internal names `{type:'watermark'}` / `{type:'title'}` (`scene-compiler.mjs:475-484`). | VERIFIED |
| b1 | `overlayMount` accepts `width`/`height` but never emits them, and `buildProject` never passes them (`overlay-blocks.mjs:100-127`, `scene-project.mjs:141-151`). Overlay hosts have no `data-width`/`data-height` (`index.html:14-18`), while scene hosts and the HyperFrames format example do (`format.md:21-30`). The component roots declare none either (`components/watermark.html:22-35`). The runtime defaults a composition with no size to 1920x1080 (`hyperframes/dist/chunk-B2XLXD7V.js`, `compositionHeight: …??1080`). The master is 1920x1920. | Code gap VERIFIED; that it causes the invisibility is TO-CONFIRM-IN-APPLY |
| b2 | Four hosts mount the same `data-composition-id="watermark"`, and each mount repeats the inner `id="watermark-text"`. The contract says "keep ids unique across the assembled page" (`format.md:68`). Mount variables are keyed by runtime composition id (`__hfVariablesByComp`), so a collision can leave `data-var-text` empty. | TO-CONFIRM-IN-APPLY |
| b3 | Ruled out: z-index (root children are laid out full-frame by the runtime, `format.md:106`, and the hosts carry `z-index:200+`); missing timeline (`data-no-timeline` is on both host and root); unsupported binding (`data-var-text` is implemented in the runtime); component staging (the `components/*.html` files are present). | VERIFIED (by reading) |
| c | `isAvatarLayer` reads `l.properties?.layer_type ?? l.type` (`lib/avatar-jobs.mjs:59-62`). `produce` passes raw elements whose type lives in `fields.type` (`produce.mjs:268-270`). The evidence episode has no `avatar:: true`, so produce skips its avatar stage. The existing test needs the `avatar:: true` workaround (`test/produce.test.mjs:276-277`). | VERIFIED |
| d | `synthesize-avatar.mjs:134,136` lowers without `scriptDir`, so the Series grammar is empty and `validateSceneKinds` throws `unknown-kind` for `kind:: Gancho` (`lib/kinds.mjs:120-124`). Kind presets also drop out of `sceneBags`, so the TTS key can differ from the key compile used. | VERIFIED |
| e | `language` is a code (`es`, `en`) (`spec_NN.md:398`). The provider body hard-codes `options.language \|\| 'Spanish'` (`asset-synthesizer.mjs:447`), and `buildTtsVoiceOptions` never sets `language` (`lib/tts-options.mjs:20-38`). | VERIFIED |

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| D1 | Text lowering | In `lowerLayer`, `type:: text` resolves its binding through `TYPE_RENDERERS[fields.style]` and sets the lowered `type` to the style (the slot). The compile overlay branch and `resolveComponents` work unchanged. A missing or unknown style fails in `checkScript` (`unknown-text-style`), before any spend. | Add `text` to `TYPE_RENDERERS` and branch on `style` in `compile()`; rename the old keys | Smallest change. The old keys stay because the Chrome injection uses them (a3). Failing closed matches the engine's "never silently drop" rule. |
| D2 | Chrome visibility | Emit `data-width`/`data-height` (the master size) on every overlay host. Give each mount a unique `data-composition-id` (`<slot>-<n>`) **only if** the b2 experiment shows it is needed. The components stay size-agnostic. | Hard-code a size in `components/*.html` | Components are reused across master sizes; the host is where the size belongs (format example). |
| D3 | b-acceptance | Apply first runs `npx hyperframes check --json` and `snapshot --at` on a copy of the evidence project, toggling b1 and then b2. The fix is whichever variant shows the watermark and CTA in the frames. | Ship blind | The proposal risk row: the cause needs a real render to prove. |
| D4 | Stage order | When avatar layers exist, `produce` runs `synthesizeEpisodeAssets` (new export from `lib/compile.mjs`: plan → `assertPlanAffordable` → real TTS + image), then `synthesizeAvatars`, then `render`. The compile inside render then gets only cache hits. | Call `compileVideo` twice; teach synthesize-avatar to synthesize TTS | One extracted function, which `compileVideo` itself calls. Avatar code stays read-only on the TTS cache. |
| D5 | Duplicate timing rows | `compileVideo`/`renderVideo` take `recordSynthesisStages` (default `true`). produce passes `false` after the pre-pass, which already wrote the `tts`/`image` rows. | Leave duplicates | The fixed stage order in the facts log stays truthful. |
| D6 | Avatar predicate | `isAvatarLayer` also reads `l.fields?.type`. Delete the `fields.avatar` clause (`produce.mjs:269`). | Keep the workaround | One predicate (the module docstring promises this). |
| D7 | QA scope | Pure `checkOverlays({manifest, indexHtml})`. **declared** = the ids in `tracks.overlays` ∪ the ids of every scene layer that still carries `layer_text_content` (a text layer that leaked into the drawables). **emitted** = the ids matched by `<div id="…" class="clip nn-overlay`. **missing** = declared − emitted. | Count `tracks.overlays` only | Counting only the overlays would pass the botijos bug (a2): its text layers never reach `tracks.overlays`. |
| D8 | QA placement and failure | Runs right after render, before formats. On failure: `ProduceStop('overlay-qa-failed', …, {details:{missing}})`, exit 1. The master is kept, and neither `status` nor `master` is written. A missing `index.html` also fails. | QA after formats; a new exit code | It fails fast, follows the resolved decision, and reuses `EXIT_ERROR`. |
| D9 | TTS language | Lowering sets `properties.scene_language` = the resolved cascade `language`. `buildTtsVoiceOptions` adds `language` (the code) to the options, which are the cache key. The synthesizer maps the code to the provider name (`es→Spanish`, `en→English`, …). An unmapped code sends `auto` instead of a hard-coded value. | Key on the provider name; keep the `'Spanish'` default | The key follows the document's value. The provider vocabulary stays in the provider layer. |
| D10 | `scriptDir` | `synthesize-avatar.mjs` passes `scriptDir` to `checkScript` and `lowerKnowledgeModel`. | Inject `grammar` | It is the same call the estimator makes (`asset-cost-estimator.mjs:175,177`). |

## Data Flow

    produce: intake → review → approved → estimate/budget
       └─ avatars? ─yes─► synthesizeEpisodeAssets (TTS+images, rows tts/image)
                          └─► synthesizeAvatars (reads TTS cache, writes avatar cache)
       └─► renderVideo(recordSynthesisStages:!prepass) → compile (hits) → emit → hyperframes
       └─► checkOverlays(manifest.json, index.html) ─missing≠∅─► stop exit 1 (master kept)
       └─► formats → description → status:: produced

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/scene-compiler.mjs` | Modify | D1 (`lowerLayer`, `checkScript`), D9 (`scene_language`) |
| `scripts/lib/compile.mjs` | Modify | Export `synthesizeEpisodeAssets`; `recordSynthesisStages` (D4, D5) |
| `scripts/lib/render.mjs` | Modify | Forward `recordSynthesisStages` |
| `scripts/lib/avatar-jobs.mjs` | Modify | D6 |
| `scripts/lib/tts-options.mjs` | Modify | D9: `language` in the voice options |
| `scripts/asset-synthesizer.mjs` | Modify | D9: code → provider map; remove `'Spanish'` |
| `scripts/synthesize-avatar.mjs` | Modify | D10 |
| `scripts/overlay-blocks.mjs`, `scripts/scene-project.mjs` | Modify | D2: host size (plus a unique mount id if confirmed) |
| `scripts/lib/overlay-qa.mjs` | Create | D7 |
| `scripts/produce.mjs` | Modify | D4, D6, D8 |
| `components/*.html` | Modify only if D3 shows the root needs it | — |

## Testing Strategy (Strict TDD, red first)

| # | Test | Asserts |
|---|---|---|
| 1 | `test/scene-compiler.test.mjs` | A botijos-shaped fixture: text/title → `kineticTitle`, lower-third → `lowerThird`, caption → `captions`; no `layer_type: text` left in `props.layers`; an unknown style fails `checkScript` |
| 2 | `test/scene-project-mount.test.mjs` | Every overlay host carries the master `data-width`/`data-height` (and unique mount ids if D2 applies) |
| 3 | `test/overlay-qa.test.mjs` (new) | Complete → `[]`; one host removed → `[id]`; a leaked text drawable is reported; no overlays → pass |
| 4 | `test/produce.test.mjs` | `fakeRender` writes a matching `index.html`. A removed host → `overlay-qa-failed`, exit 1, status not `produced`, the master exists |
| 5 | `test/produce.test.mjs` | The avatar test drops `avatar:: true` and still sees `['avatars','render']`. `isAvatarLayer({fields:{type:'avatar'}})` is true |
| 6 | `test/produce.test.mjs` cold cache (new) | Empty cache, no API key, **real** `synthesizeAvatars` (no stub), render stubbed only at `hyperframesRun`: no "Run compile first", and the `tts` row precedes the avatar call |
| 7 | `test/avatar-tts-cache.test.mjs`, `test/asset-synthesizer.test.mjs` | The `en` and `es` keys differ; with a fetch stub the body sends `language: 'English'` for `en`; the estimator and compile agree on the key |
| 8 | `test/avatar-resolution.test.mjs` | `synthesize-avatar` with a Series Kind: no `unknown-kind`, and the TTS key equals compile's when the Kind supplies a voice preset |
| E2E | Manual acceptance | Re-produce botijos; sample frames inside each overlay window (`npx hyperframes snapshot --at`) |

## Migration / Rollout

No data migration. **Cache consequence:** `language` joins the TTS key, so every narrated scene misses once and pays one re-synthesis. Avatar clips are keyed by the audio bytes, so a re-synthesized narration also re-keys the avatar clips. That is a paid avatar re-run per presenter scene. The estimator shares `ttsCachePathFor`, so the estimate shows this spend before the budget gate. Old cache entries are never deleted.

**Rollback:** revert the single PR. The old keys hit again, and the new entries are inert files.

## Open Questions

- [ ] Does test 6 need an offline avatar path? It assumes keyless `synthesizeAvatars` stores a placeholder the way TTS does (`-offline`). Confirm this in apply.
- [ ] Release key: is the `skills/` folder inside the bluepriNNt package byte-pinned by `validate-manifest`? `spec_NN.md` does not change.
