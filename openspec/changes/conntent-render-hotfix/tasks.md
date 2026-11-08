# Tasks: coNNtent Render Hotfix

Strict TDD is ACTIVE. Every behavior has a RED task (write the failing test, run it, see it fail for the stated reason) before its GREEN task (minimal code to pass), then a REFACTOR step only if needed with the suite still green. Never write GREEN first. `design.md` is authoritative. No backwards-compat code, YAGNI. Published `_V_x-y-z_` spec files are write-once; `spec_NN.md` does not change in this hotfix.

Markers: `[P]` independent (parallel-safe only if the tasks own disjoint files), `[S]` sequential (`after` names the dependency).

## Repo constraints (apply to every task)

- Work only in an `nn-session` worktree (`node scripts/nn-session.mjs start`); never write to the primary checkout. Commit early on `dev` per `nn-dev-development`. The session worktree for this change is `D:\Users\lucas\Documents\GitHub\cogNNitive-conntent-redesign-sdd`.
- `node_modules` in a worktree are junctions to the primary. NEVER run `npm ci` (or `npm install`) from the worktree or from a sub-agent: it corrupts the primary `node_modules`. Builds and tests only.
- Before running any test, repoint `node_modules/@cognnitive/nn-core` to the worktree's `iNNfo/packages/nn-core` and build it (nn-dev-development section 1a), otherwise tests exercise the primary checkout's code.
- Test runners: `node --test <file>` for skill tests under `SK/test/`; `node scripts/verify.js --only=<substring>` for a targeted gate; `npm run verify:fast` for the broad pass.
- Relative imports in `.mjs` and TS sources carry `.js`/`.mjs` extensions as the file already does.
- Artifacts (code, comments, test names) are English.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~650 hand-written: tests ~420 (8 test groups, 1 new file), source ~230 (`scene-compiler` ~50, `overlay-qa.mjs` ~50 new, `produce.mjs` ~45, `compile.mjs`/`render.mjs` ~40, `asset-synthesizer`/`tts-options` ~30, `scene-project`/`overlay-blocks` ~15, `avatar-jobs`/`synthesize-avatar` ~5). No generated output expected |
| 400-line budget risk | High (estimate exceeds 400; roughly 65% is tests) |
| Chained PRs recommended | No. The seven items share `produce.mjs` and `scene-compiler.mjs`, are individually small, and the proposal's rollback plan is a single revert. Splitting would force repeated rebases on those two files |
| Suggested split | One PR to `dev`, ordered as one work-unit commit per phase below (each with its own RED/GREEN verification and revert boundary) |
| Delivery strategy | `ask-on-risk` |
| Chain strategy | not applicable (single PR) |

Decision needed before apply: No. Resolved 2026-11-08: the user confirmed one PR with `size:exception`.
Chained PRs recommended: No
Chain strategy: not applicable
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Phase 0-1 setup and Chrome investigation (no source change unless the decision point says so) | PR 1 (single) | findings recorded in the PR description |
| 2 | Phase 2 text lowering (D1) | same PR | commit 1 |
| 3 | Phase 3 Chrome visibility (D2) | same PR | commit 2, scope set by Phase 1 decision |
| 4 | Phase 4 overlay QA gate (D7, D8) | same PR | commit 3 |
| 5 | Phase 5 avatar predicate (D6) | same PR | commit 4 |
| 6 | Phase 6 stage order (D4, D5) | same PR | commit 5, after Phase 5 |
| 7 | Phase 7 TTS language (D9) | same PR | commit 6 |
| 8 | Phase 8 `scriptDir` (D10) | same PR | commit 7 |
| 9 | Phase 9 verification, review, PR | same PR | last |

## Key Paths

- `SK`: `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/` (all `scripts/...` and `test/...` paths below are relative to it)
- `EVID`: `botijos-today/assets/gas-pump-printer-powerball/hyperframes/` (evidence project; copy, never edit in place)

## Ownership (parallel writers must not overlap)

| File | Phases that touch it | Rule |
|---|---|---|
| `scripts/produce.mjs`, `test/produce.test.mjs` | 4, 5, 6, 7 | sequential only |
| `scripts/scene-compiler.mjs` | 2, 7 | sequential only |
| `scripts/lib/compile.mjs`, `scripts/lib/render.mjs` | 6 | single owner |
| `scripts/scene-project.mjs`, `scripts/overlay-blocks.mjs` | 3 | single owner |
| `scripts/asset-synthesizer.mjs`, `scripts/lib/tts-options.mjs` | 7 | single owner |

Phases 5 and 8 touch disjoint files from Phases 2-3 and could run in parallel with them, but `produce.mjs` is shared by 4-7, so a single writer is recommended.

## Phase 0: Baseline

- [ ] 0.1 [S] Files: none (environment). In the session worktree, repoint `node_modules/@cognnitive/nn-core` to the worktree and build nn-core (nn-dev-development section 1a). Run `node --test` over the existing `SK/test/` suites that this change touches (`produce`, `scene-compiler`, `scene-project-mount`, `avatar-resolution`, `avatar-tts-cache`, `asset-synthesizer`) and record the baseline pass/fail. Acceptance: baseline recorded; any pre-existing red suite is noted so it is not blamed on this change. Never run `npm ci`.

## Phase 1: Investigation, invisible Chrome overlays (design D3, spec: Overlay Emission Is Complete And Visible)

Read-only on source. All work happens on a COPY of the evidence project in the scratchpad directory, never in the repo and never in the primary checkout.

- [ ] 1.1 [S after 0.1] Files: scratch copy of `EVID` only. Copy the evidence project to the scratchpad. Run `npx hyperframes check --json` on the copy and save the output. Acceptance: the baseline check result is recorded, including any composition-size or duplicate-id warnings.
- [ ] 1.2 [S after 1.1] Files: scratch copy only. Run `npx hyperframes snapshot --at` at times inside the watermark window and inside the CTA window of the unmodified copy. Acceptance: baseline frames show the watermark and CTA absent (reproduces the bug). If they are already visible, stop and report; the premise of item 2 is wrong. (spec: Watermark and CTA visible in rendered frames)
- [ ] 1.3 [S after 1.2] Files: scratch copy only. Variant B1: add `data-width`/`data-height` equal to the master size (1920x1920) on every overlay host in the copy's `index.html`; re-run `snapshot --at` at the same times. Acceptance: record whether the watermark and CTA appear. (design b1)
- [ ] 1.4 [S after 1.3] Files: scratch copy only. Variant B2: on a fresh copy, give each watermark mount a unique `data-composition-id` (`watermark-1`, `watermark-2`, ...) and unique inner ids, without the B1 change; re-run `snapshot --at`. Then try B1 + B2 together. Acceptance: record which of {B1, B2, B1+B2} makes both overlays visible, and confirm `data-var-text` is populated in the B2 case. (design b2)
- [ ] 1.5 [S after 1.4] Files: none. DECISION POINT. Choose the fix scope for Phase 3 from the evidence:
  - B1 alone fixes it: Phase 3 emits host size only; skip task 3.4.
  - B2 is needed (alone or with B1): Phase 3 emits host size and unique mount ids (include 3.4).
  - Neither fixes it: STOP. Do not ship a blind fix. Record the new findings (check the remaining suspects: component staging, CSS `display`/opacity, timeline) and return to the orchestrator for a design amendment before Phase 3.
  Acceptance: the chosen variant and the frame evidence are written into the PR description and into a note at the top of Phase 3 in this file. Also answer the open question on `components/*.html`: change them only if the evidence shows the root needs it.

## Phase 2: Text layer lowering (D1, spec: Scene Text Layers Are Lowered To Overlays)

- [ ] 2.1 [S after 0.1] RED `test/scene-compiler.test.mjs`: add a botijos-shaped fixture (a scene with `type:: text` Layers carrying `style:: title`, `lower-third`, `caption`, plus a `media` and an `avatar` Layer). Assert: title resolves to `kineticTitle`, lower-third to `lowerThird`, caption to `captions`; `tracks.overlays` holds three entries with the declared texts (text comes from the declared text field, not the Layer name); no `layer_type: text` entry is left in `scenes[].props.layers`; a scene with no text Layer adds no text overlay; global `data-start` is scene start plus the Layer offset. Fails because `TYPE_RENDERERS` has no `text` key and the layers stay in `props.layers`. (specs: Title/lower-third/caption reach index.html, Overlay timing is global, Text comes from the declared field, Scene without text layers)
- [ ] 2.2 [S after 2.1] RED `test/scene-compiler.test.mjs`: a text Layer with a missing or unknown `style` makes `checkScript` fail with `unknown-text-style` before any spend. Fails: no such check. (spec: A text Layer MUST NOT be dropped silently)
- [ ] 2.3 [S after 2.2] GREEN `scripts/scene-compiler.mjs`: in `lowerLayer`, resolve `type:: text` through `TYPE_RENDERERS[fields.style]` and set the lowered `type` to the style slot; add the `unknown-text-style` check in `checkScript`. Keep the old renderer keys (Chrome injection uses them). Acceptance: tests 2.1 and 2.2 pass with `node --test test/scene-compiler.test.mjs`.
- [ ] 2.4 [S after 2.3] REFACTOR `scripts/scene-compiler.mjs`: dedupe any style-to-slot lookup shared with the Chrome injection at `:475-484` only if it reads clearer; suite stays green. Acceptance: no behavior change.

## Phase 3: Chrome visibility (D2, specs: Overlay Emission Is Complete And Visible; Watermark and CTA visible in rendered frames)

Scope fixed by decision 1.5. Do not start before 1.5 is recorded.

- [ ] 3.1 [S after 1.5, 2.4] RED `test/scene-project-mount.test.mjs`: every overlay host in the emitted `index.html` carries `data-width` and `data-height` equal to the master size; overlay hosts are stacked above the full-frame scene host. Fails: `overlayMount` never emits the size and `buildProject` never passes it. (specs: Every manifest overlay is emitted, Overlay is above scene content)
- [ ] 3.2 [S after 3.1] GREEN `scripts/overlay-blocks.mjs`, `scripts/scene-project.mjs`: pass the master `width`/`height` from `buildProject` to `overlayMount` and emit them as `data-width`/`data-height`. Acceptance: 3.1 passes with `node --test test/scene-project-mount.test.mjs`.
- [ ] 3.3 [S after 3.2, only if 1.5 chose B2] RED `test/scene-project-mount.test.mjs`: four mounts of the same component slot produce four distinct `data-composition-id` values (`<slot>-<n>`) and distinct inner ids across the whole page. Fails: all four repeat `watermark`.
- [ ] 3.4 [S after 3.3, only if 1.5 chose B2] GREEN `scripts/overlay-blocks.mjs`, `scripts/scene-project.mjs`: unique mount id per overlay host and unique inner ids. Acceptance: 3.3 passes and `data-var-text` is still bound for each mount.
- [ ] 3.5 [S after 3.2 (and 3.4 if applicable)] Verify against the real render. Re-run the Phase 1 `snapshot --at` check using the engine's emit (not a hand edit) on a copy of `EVID`. Acceptance: watermark visible in a frame inside its window, CTA visible in a frame inside its window, and neither visible outside its interval (spec: Chrome is not visible outside its interval). Attach the frames or a description to the PR.

## Phase 4: Post-emit overlay QA gate (D7, D8, spec: Post-Emit Overlay QA Gates Produced)

- [ ] 4.1 [P] RED `test/overlay-qa.test.mjs` (new file): `checkOverlays({manifest, indexHtml})` returns `[]` for a complete project; returns `[id]` when one host is removed; reports a leaked text drawable (a scene layer still carrying `layer_text_content`) as missing; passes when the manifest declares no overlays; ignores extra emitted hosts not in the manifest. Fails: module missing. (specs: All declared overlays present, Scene without overlays is not penalised, Extra emitted elements are ignored)
- [ ] 4.2 [S after 4.1] GREEN `scripts/lib/overlay-qa.mjs` (new): pure function. declared = ids in `tracks.overlays` union ids of scene layers still carrying `layer_text_content`; emitted = ids matched by `<div id="..." class="clip nn-overlay`; missing = declared minus emitted. Acceptance: `node --test test/overlay-qa.test.mjs` green.
- [ ] 4.3 [S after 4.2, 3.2] RED `test/produce.test.mjs`: make `fakeRender` write an `index.html` that matches the manifest. Add cases: (a) a removed host makes `produce` exit 1 with `overlay-qa-failed`, error lists the missing overlay and its scene, status stays `approved`, no `master` field written, and the master file still exists on disk; (b) a complete project proceeds to formats and `status:: produced`; (c) a missing `index.html` also fails with the same error. Fails: no QA stage exists. (specs: A missing overlay fails the run, Failed QA keeps the master, All declared overlays present)
- [ ] 4.4 [S after 4.3] GREEN `scripts/produce.mjs`: run `checkOverlays` right after render and before formats; on non-empty `missing` throw `ProduceStop('overlay-qa-failed', ..., {details:{missing}})` with `EXIT_ERROR`; record a `qa` stage row between `render` and `formats`. Acceptance: 4.3 passes and the fixed stage order in the facts log reads `plan, tts, image, avatar, compile, render, qa, formats, apply` (spec: Order is fixed). Update the existing "Order is fixed" test accordingly.

## Phase 5: Avatar detection (D6, spec: Avatar Layers Are Detected From Model Fields)

- [ ] 5.1 [S after 4.4] RED `test/produce.test.mjs`: assert `isAvatarLayer({fields:{type:'avatar'}})` is true, `isAvatarLayer({type:'avatar'})` is true, `isAvatarLayer({fields:{type:'media'}})` is false. Edit the existing avatar test to drop `avatar:: true` and still expect the stages `['avatars','render']`. Fails: the predicate reads only `properties.layer_type ?? type`, and `produce` relies on `fields.avatar`. (specs: Layer typed through fields.type is detected, through type is detected, Non-avatar Layer is excluded, Workaround removed)
- [ ] 5.2 [S after 5.1] GREEN `scripts/lib/avatar-jobs.mjs`: `isAvatarLayer` also reads `l.fields?.type`. `scripts/produce.mjs`: delete the `fields.avatar` clause (`:269`) so produce uses the single predicate. Acceptance: 5.1 passes with `node --test test/produce.test.mjs`; `rg "fields.avatar"` over `scripts/` returns no remaining use.

## Phase 6: Stage order and cold cache (D4, D5, spec: One Command Sequences The Whole Pipeline)

- [ ] 6.1 [S after 5.2] RED `test/produce.test.mjs` cold-cache case (new): empty TTS cache, no API key, the REAL `synthesizeAvatars` (no stub), render stubbed only at `hyperframesRun`, episode with a narrated avatar and no prior compile. Assert: no "Run compile first" error; the `tts` row precedes the `avatar` call; both `tts` and `image` ended before `avatar` started; no duplicate `tts`/`image` rows in the facts log. Fails with "Run compile first" (`avatar-jobs.mjs:134-138`). If keyless `synthesizeAvatars` has no offline placeholder path, resolve the design open question here: either assert the existing offline behavior or amend the test to stub only the provider fetch, and note the choice. (specs: Cold cache with narrated avatars succeeds, TTS and images precede avatars)
- [ ] 6.2 [S after 6.1] GREEN `scripts/lib/compile.mjs`: extract and export `synthesizeEpisodeAssets` (plan, `assertPlanAffordable`, real TTS and image), called by `compileVideo` itself; add `recordSynthesisStages` (default `true`) to `compileVideo`. `scripts/lib/render.mjs`: forward `recordSynthesisStages`. `scripts/produce.mjs`: when avatar layers exist, run `synthesizeEpisodeAssets`, then `synthesizeAvatars`, then `renderVideo({recordSynthesisStages:false})`. Acceptance: 6.1 passes; the existing produce, compile and render suites stay green; compile inside render sees only cache hits.
- [ ] 6.3 [S after 6.2] REFACTOR `scripts/lib/compile.mjs`: confirm `compileVideo` and the pre-pass share one code path with no duplicated plan/budget logic. Acceptance: suite green, no behavior change.

## Phase 7: TTS language (D9, specs: Produce Passes The Cascaded Language To TTS; TTS Request Carries The Resolved Language; Stable TTS cache key)

- [ ] 7.1 [S after 6.3] RED `test/avatar-tts-cache.test.mjs`: `es` and `en` produce different TTS cache hashes for identical narration, voice and voice model; two computations with `en` are equal; undeclared `voice_speed`/`voice_emotion` still add no key; `speed` stays numeric; the estimator and compile agree on the key for the same scene. Fails: `buildTtsVoiceOptions` never sets `language`. (specs: Language changes the key, Same language keeps the key, Undeclared delivery values add nothing, Speed keeps its numeric form)
- [ ] 7.2 [S after 7.1] RED `test/asset-synthesizer.test.mjs`: with a `fetch` stub, an `en` request body carries `language: 'English'`; an `es` request carries `Spanish`; an unmapped code sends `auto`; a request with no language fails with a named error naming `language` and makes no provider call (and never defaults to `Spanish`). Fails: `options.language || 'Spanish'` hard-codes the default. (specs: English episode sends English, No hard-coded fallback, Missing language fails)
- [ ] 7.3 [S after 7.2] RED `test/scene-compiler.test.mjs`: lowering sets `properties.scene_language` to the resolved cascade `language`; with no language declared it falls back to the cascade default, never a hard-coded value (proposal question round). Fails: the property is not set.
- [ ] 7.4 [S after 7.3] GREEN `scripts/scene-compiler.mjs` (set `scene_language`), `scripts/lib/tts-options.mjs` (add `language` code to the options that form the cache key), `scripts/asset-synthesizer.mjs` (code to provider-name map `es->Spanish`, `en->English`, ...; unmapped sends `auto`; throw a named error when `language` is absent; remove the `'Spanish'` literal). Acceptance: 7.1-7.3 pass with `node --test` on the three files; `rg "'Spanish'" scripts/asset-synthesizer.mjs` returns only the map entry.
- [ ] 7.5 [S after 7.4] `test/produce.test.mjs`: add one end-to-end case that an English episode reaches the TTS stage with `language: English` and a key different from the Spanish one. Acceptance: passes. This task is RED-first inside the same commit: write and run it before relying on 7.4 if 7.4 is not yet applied.

## Phase 8: `scriptDir` in avatar synthesis (D10, spec: Avatar Synthesis Resolves Series Scene Kinds)

- [ ] 8.1 [P after 0.1] RED `test/avatar-resolution.test.mjs`: `synthesize-avatar` on an episode whose Series declares kind `Gancho`: no `unknown-kind` is raised; a Kind preset resolves with source `kind`; the TTS key `synthesize-avatar` computes equals the key compile computes when the Kind supplies a voice preset; the estimator and `synthesize-avatar` resolve the same Kind and values. Fails with `unknown-kind` because `checkScript` and `lowerKnowledgeModel` are called without `scriptDir` (`synthesize-avatar.mjs:134,136`). (specs: Kind preset reaches avatar synthesis, Estimator and synthesis agree, Without script directory kinds are not resolved)
- [ ] 8.2 [S after 8.1] GREEN `scripts/synthesize-avatar.mjs`: pass `scriptDir` to both calls, as the estimator does (`asset-cost-estimator.mjs:175,177`). Acceptance: 8.1 passes with `node --test test/avatar-resolution.test.mjs`. If tasks 7.x already changed the key, run 8.1 after 7.4 so key equality is checked against the final key.

Note: 8.1/8.2 touch only `avatar-resolution.test.mjs` and `synthesize-avatar.mjs`, so they may run in parallel with Phases 2-4 if a second writer is used; with a single writer, run them after Phase 7.

## Phase 9: Verification, review, PR

- [ ] 9.1 [S after all] Open question check: determine whether the `skills/` folder inside the bluepriNNt package is byte-pinned by `validate-manifest`. Run `node scripts/verify.js --only=manifest` (or the matching substring) and `node scripts/validate-manifest.mjs` as the repo documents. Acceptance: no pin failure, or the required `blueprints-v*` release step is added to the PR notes and the orchestrator is told before merge. Do not edit any published `_V_x-y-z_` file.
- [ ] 9.2 [S after 9.1] Run the full targeted skill tests: `node --test` over every file edited in Phases 2-8. Acceptance: all green on a fresh run with the junction repointed to the worktree.
- [ ] 9.3 [S after 9.2] Run `npm run verify:fast`. Acceptance: green. Per repo memory, re-run any preflight-adjacent suite with an empty `USERPROFILE` and `HOME` if it fails only on CI-like conditions.
- [ ] 9.4 [S after 9.3] E2E manual acceptance on the evidence episode: re-produce the botijos episode (or the engine's offline equivalent) and sample frames inside each overlay window with `npx hyperframes snapshot --at`. Acceptance: every manifest overlay is in `index.html` and visible in frames (title, lower-third, caption, watermark, CTA). Removing one host from `index.html` and re-running QA fails the run without writing `status:: produced`. (Proposal success criteria 1 and 2)
- [ ] 9.5 [S after 9.4] Fresh-context review of the whole diff (PR rule: not the author, adversarial, against the three delta specs). Acceptance: no CRITICAL findings open; WARNINGs fixed or recorded.
- [ ] 9.6 [S after 9.5] Open the PR to `dev` from the session branch with conventional-commit history (no AI attribution). The description includes: the Phase 1 evidence and decision, the cache-invalidation note (`language` joins the TTS key, so each narrated scene misses once and paid avatar clips re-key; the estimator shows this before the budget gate), the rollback (single revert), and `size:exception` if the delivery decision confirmed one PR. Acceptance: PR open with green CI.

## Spec Coverage Matrix

| Spec requirement | Tasks |
|---|---|
| One Command Sequences The Whole Pipeline (order, cold cache) | 4.4, 6.1-6.3 |
| Post-Emit Overlay QA Gates Produced | 4.1-4.4 |
| Produce Passes The Cascaded Language To TTS | 7.1-7.5 |
| Series Chrome visible in frames | 1.1-1.5, 3.1-3.5 |
| Scene Text Layers Are Lowered To Overlays | 2.1-2.4 |
| Avatar Layers Are Detected From Model Fields | 5.1-5.2 |
| Avatar Synthesis Resolves Series Scene Kinds | 8.1-8.2 |
| Stable TTS cache key | 7.1, 7.4 |
| TTS Request Carries The Resolved Language | 7.2, 7.4 |
| Overlay Emission Is Complete And Visible | 1.x, 3.1-3.5, 4.x |
