# Tasks: coNNtent bluepriNNt Redesign

Strict TDD is ACTIVE. Every implementation task (GREEN) is preceded by a RED task (write the failing test, run it, see it fail for the stated reason). Then REFACTOR with the suite green. Never write GREEN first. `design.md` is authoritative; the delta specs were reconciled to it. No backwards-compat code: old layouts are rejected with one message, never adapted. YAGNI.

Markers: `[P]` independent (parallel-safe if the lane owns disjoint files), `[S after X]` sequential. `[Q<n>]` marks a task that depends on open product question n of `proposal.md` (`## Open product questions (pre-apply)`); each is planned with the recommended default, and a different answer patches only the tagged tasks.

## Repo constraints (apply to every PR)

- One `nn-session` worktree per PR (`node scripts/nn-session.mjs start`); never write to the primary checkout. Commit early on the session branch; work-unit commits (see `work-unit-commits`): each commit = one RED/GREEN/REFACTOR unit with tests.
- `node_modules` in a worktree are junctions to the primary checkout. NEVER run `npm ci` or `npm install` from a worktree or sub-agent (corrupts the primary `node_modules`). Builds and tests only.
- Before any nn-mcp, skill or engine test: build nn-core in the worktree and repoint the `node_modules/@cognnitive/nn-core` junction to the worktree's `iNNfo/packages/nn-core`; rerun `node scripts/build-core-mirrors.mjs` so `skills/nn-conntent/scripts/lib/nn-core.generated.cjs` matches. A stale nn-core `dist` produces false failures in nn-mcp and the engine.
- Spec files under `specs/` are write-once: never edit a published `_V_x-y-z_` file. A coNNtent change = bump `blueprint_version` in the unversioned `spec_NN.md` frontmatter (NOT `template_version`; they are two axes) and let `node scripts/sync-versions.mjs` derive the rest. Bump nn-core, nn-mcp and nn-console only through the derived-version flow.
- The field registry is generated: edit field definitions in `spec_NN.md`, then run `node iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/build-field-registry.mjs`; never hand-edit `lib/field-registry.generated.json`. Regenerate `nn-core.generated.cjs` in every PR that touches nn-core exports.
- New relative imports carry `.js`. New template/blueprint folders must be added to `manifest/source.yaml`. `check:spec-urls` scans `openspec/specs/`: do not write a bare `cogNNitive/iNNfo` slug there.
- Runners. Skill tests: `node --test <file>` from `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/test/`. nn-core / nn-mcp: the package test script, run per file where possible. Gate: `node scripts/verify.js --only=<substring>` per PR, `npm run verify:fast` before push, full `node scripts/verify.js` at the end.

Paths: `BP` = `iNNfo/specs/bluepriNNts/coNNtent/`; `E` = `BP/skills/nn-conntent/scripts/`; `T` = `BP/skills/nn-conntent/test/`; `CORE` = `iNNfo/packages/nn-core/`; `MCP` = `iNNfo/packages/nn-mcp/`; `CON` = `iNNfo/specs/bluepriNNts/console/`; `LIVE` = `openspec/specs/`.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~7,000 hand-written across 21 PRs (tests ~45%), plus non-reviewable generated/vendored output (`nn-core.generated.cjs`, `field-registry.generated.json`, bundles, regenerated consoles, vendored registry components, catalogs) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 0 (separate change) then 1a-1c, 2a-2e, 3a-i/3a-ii (parallel to 1-2), 3b-1..3b-5, 4a-4d, 5a-5b |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain (confirmed by the user 2026-11-08) |

Decision needed before apply: No (chained PRs chosen)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Why feature-branch-chain over stacked-to-main: (1) the premise rejects old layouts, so a slice merged alone to main would break every existing coNNtent domaiNN and its consoles while later slices are still in flight; only the finished tracker should reach `main`. (2) `validate-manifest` byte-checks main against the `templates-v*` pin, so each blueprint-touching merge to main would need its own tag and repin; one tracker merge needs one release run. (3) Rollback is one revert of the tracker merge, plus the per-PR revert inside the tracker. (4) Multi-PR stacked merges to main have caused incidents before. Cost: the tracker lives long, so rebase it onto `dev` after each child merges. If the user prefers speed, stacked-to-main is workable only if every PR leaves `verify:fast` green and the release is cut once at the end.

Branch map (feature-branch-chain): tracker `feat/conntent-redesign` (based on `dev` after PR 0). PR 1a base = tracker. Each later PR targets the immediate previous PR branch in its chain: 1b to 1a, 1c to 1b, 2a to 1c, 2b to 2a, ... 3a-i targets the tracker (independent chain, parallel), 3a-ii to 3a-i. 3b-1 targets 2e and requires 3a-ii merged into the tracker first. After each child is reviewed it merges into the tracker; if a child diff shows parent changes, the base is wrong: retarget before review.

### Suggested Work Units

| Unit | Goal | PR | Est. lines | Depends on |
|---|---|---|---|---|
| 0 | Hotfix (`conntent-render-hotfix`) | separate change | n/a | merged to `dev` (hard dependency) |
| V | Open verifications V1-V5 with decisions | PR V (notes only) | ~60 | PR 0 |
| 1a | `layout.mjs`, legacy rejection, placement `episodes/` | PR 1a | 250 | V |
| 1b | `library.mjs` lookup + library folders | PR 1b | 350 | 1a |
| 1c | Name reconciliation, ledger, plan path, `video-guard.json` retired | PR 1c | 400 | 1b |
| 2a | Scope classes in registry, `cascade.mjs`, contract test | PR 2a | 380 | 1c |
| 2b | Language, Voice.language, capability `video` rejected, new fields | PR 2b | 300 | 2a |
| 2c | FRAME.md folder, tokens, emission | PR 2c | 300 | 2b |
| 2d | Character, C9 warning | PR 2d | 350 | 2b |
| 2e | Component portfolio format + vendored base set | PR 2e | 400 | 2c |
| 3a-i | nn-core `review_gate` op | PR 3a-i | 380 | PR 0 (parallel to 1-2) |
| 3a-ii | nn-mcp refusal + human-origin check, mirror rebuild | PR 3a-ii | 200 | 3a-i |
| 3b-1 | `review-hash`, `gates`, plan slices, lifecycle | PR 3b-1 | 380 | 2e, 3a-ii |
| 3b-2 | `pipeline.mjs` order, exit codes, animatic, budget gate | PR 3b-2 | 380 | 3b-1 |
| 3b-3 | `captions.mjs`, whisper consent | PR 3b-3 | 330 | 3b-2 |
| 3b-4 | `qa.mjs` | PR 3b-4 | 300 | 3b-2 |
| 3b-5 | `delivery.mjs`, formats, thumbnails, description | PR 3b-5 | 400 | 3b-4 |
| 4a | Runtime: CSP, FSA, scope models, verdict kind | PR 4a | 380 | 3b-5, V1, V2 |
| 4b | `console-view-conntent.data.mjs`, export discovery | PR 4b | 380 | 4a |
| 4c | View UI, delete old views, regeneration | PR 4c | 400 | 4b |
| 4d | Delivery view, portfolio picker, stale flags | PR 4d | 300 | 4c |
| 5a | Six procedures document | PR 5a | 300 | 4d |
| 5b | State-aware entry point, `nn-video-script` refusal | PR 5b | 200 | 5a |

Fallback if any PR drifts above 400 lines: split along the sub-task groups already shown; do not request `size:exception` for hand-written code.

## Phase 0: Open verifications (PR V, gates later PRs)

Results go to `openspec/changes/conntent-blueprint-redesign/verifications.md` (one section per verification: command, observed result, decision). Run on the maintainer machine (Windows 11, Chrome and Edge).

- [ ] V.1 [P] Verify V1 (FSA on `file://`): build a scratch `scratch-fsa.html` in the session scratchpad (not the repo); open as `file://` in Chrome and Edge; test `showDirectoryPicker`, store the handle in IndexedDB, reload, `queryPermission`/`requestPermission`. DECISION: (a) handle persists and re-prompts only per session: keep D-C2 as designed. (b) handle cannot be stored or restored: D-C2 becomes "re-pick the folder per session", drop IndexedDB task 4a.6. (c) `showDirectoryPicker` unavailable in a browser: download + `apply_change` is the only path there (already in scope). Triggers: tasks 4a.5-4a.8. Accept: spec `console-changes-direct-write` "Folder is connected once per domaiNN" is still satisfiable, or the spec scenario is amended in 4a.
- [ ] V.2 [P] Verify V2 (CSP media on `file://`): same scratch page with the widened CSP of D-C1 (`img-src 'self' file: data: blob: https:`, `media-src 'self' file: blob:`); load a relative `<img>`, `<video>`, `<audio>` in Chrome and Edge. DECISION: (a) all load: keep D-C1. (b) any blocked: switch to inlined posters (<=160 KB) plus `<a href target=_blank>` "Open" links; amend `innfo-console-runtime` and `conntent-domain-console` media scenarios in 4a/4c and mark 4a.3 `V2-fallback`.
- [ ] V.3 [P] Verify V3 (`hyperframes transcribe` on Windows): run `npx hyperframes transcribe <wav> --json --model small.en` in a temp cwd on a 10 s fixture; record the JSON shape (`[{id,text,start,end}]`), time cost and whether `whisper.cpp` is on PATH. DECISION: (a) word timings present: `captions: words` as designed. (b) segment timings only: `captions: lines` valid, `words` becomes `captions-words-unsupported` on that machine (extends the Q2 error). (c) whisper.cpp missing or unusable: install is consent-gated (task 3b-3.9); `captions: off` stays valid so production is never blocked. Triggers: 3b-3.x. Save the recorded JSON as the fixture for 3b-3.1.
- [ ] V.4 [P] Verify V4 (Chrome overlay invisibility): after PR 0 is on `dev`, render the botijos fixture and inspect frames. DECISION: (a) overlays visible: closed, hotfix fixed it; keep the QA regression fixture from 3b-4.1 built from a hand-made transparent-watermark frame. (b) still invisible: file a defect against PR 0 and do not start 3b-4 until fixed; QA check (3) is calibrated only on rendered frames.
- [ ] V.5 [P] Verify V5 (registry licenses): list candidate registry items for `library/components/` (15-18), read each license, pin version. DECISION: vendor an item only if permissively licensed and a `LICENSE` file ships beside it; any item failing this is dropped. If fewer than 15 pass, ship the 6 engine-authored items plus whatever passes (fallback from design). Output: the vendored list with pins, consumed by 2e.8.
- [ ] V.6 [S after V.1-V.5] Decision checkpoint: record in `verifications.md` which fallback each verification triggered and mark affected tasks (`V1-fallback`, `V2-fallback`, `V3-fallback`, `V5-fallback`). No PR 2e, 3b-3, 4a starts before its verification is recorded. Commit notes as PR V (docs only).

## Phase 1: Structure (Slice 1; PRs 1a-1c)

### PR 1a: layout contract. Start: tracker branch + PR 0 merged. Finish: `assertLayout` rejects each legacy path; Video placement writes `episodes/`. Verify: `node --test T/layout.test.mjs`, `node scripts/verify.js --only=conntent`. Rollback: revert PR 1a (no data migration).

- [ ] 1a.1 RED `T/layout.test.mjs`: one `LAYOUT_LEGACY` message per legacy path (`series/*/assets/*/` holding `_coNNtent_NN.md`; root or series `sounds/`, `components/`, `frames/`; `video-guard.json`); each message names the new location; a clean tree passes. Fails: module missing. (spec: conntent-folder-contract "Legacy layout is rejected")
- [ ] 1a.2 GREEN `E/lib/layout.mjs` `assertLayout(root)`. (conntent-folder-contract, conntent-series-folders)
- [ ] 1a.3 RED `T/export-console-episodes.test.mjs`: `export-console` discovers an episode under `series/<s>/episodes/<slug>/` and rejects one under `assets/`. Fails: `LEGACY_EPISODE` skip. (conntent-domain-console "Console lists every episode")
- [ ] 1a.4 GREEN `scripts/export-console.mjs` (replace `LEGACY_EPISODE` skip with `assertLayout`), `E/produce.mjs` `modelIdOf` on `episodes/`.
- [ ] 1a.5 RED `T/placement.test.mjs`: `Video` placement is `"{container}/episodes/{slug}/"`; series doc is recognised by `scope: true`, named `<s>_coNNtent_NN.md`; episode doc `<slug>_coNNtent_NN.md` satisfies the nn-core `_NN` invariant. Fails: current placement `assets/`. (conntent-blueprint, conntent-folder-contract; design G1/G2)
- [ ] 1a.6 GREEN `BP/spec_NN.md` placement, series-doc naming prose, `blueprint_version` bump (`node scripts/sync-versions.mjs`).
- [ ] 1a.7 REFACTOR remove now-dead `EPISODE_DIRS=['episodes','assets']` in the (soon replaced) episode-review view data module only if tests stay green; otherwise leave for 4c.
- [ ] 1a.8 RED+GREEN `T/production-hierarchy.test.mjs`: hierarchy is domaiNN -> series -> episode; Subject concept absent or unused (confirm by `rg Subject BP/`; delete if unused). (conntent-production-hierarchy)

### PR 1b: library lookup. Start: 1a merged. Finish: all reusable media resolves through `resolveLibrary`; `library/` folders validated. Verify: `node --test T/library.test.mjs`. Rollback: revert PR 1b.

- [ ] 1b.1 RED `T/library.test.mjs`: nearest wins (episode `media/` -> series `library/` -> domaiNN `library/` -> package floor); `series:` and `domain:` prefixes force a level; `..`, absolute and `\` rejected (`LIBRARY_PATH_INVALID`); user-level miss -> `MissingAssetError`; floor miss -> one warning. Fails: module missing. (conntent-library "Logical-name lookup", "Paths are rejected")
- [ ] 1b.2 GREEN `E/lib/library.mjs` `resolveLibrary({kind, ref, fromDir})` returning `{path, level, searched}`; kinds `music|sounds|frames|components|characters|media`, any extension, folder kinds as folders.
- [ ] 1b.3 RED `T/library-folders.test.mjs`: `library/` at domaiNN and series with the six kind subfolders; root `sounds/`, `components/`, `frames/` rejected with the `library/` location in the message; avatars live inside the character. (conntent-library "Six kinds", C1)
- [ ] 1b.4 GREEN extend `layout.mjs` and `E/lib/video-scope.mjs`; delete `findNearest*` and wire `E/lib/compile.mjs` music/sounds/frame/component walks plus `E/render-thumbnail.mjs` `resolveSeriesTitle`/`resolveThumbnailFrameTokens` through `library.mjs`.
- [ ] 1b.5 RED `T/plan-library-record.test.mjs`: the plan records `{name, level, path}` for each resolved logical name; F9 case (`../../assets/music/ambient.mp3` from series doc) fails with `LIBRARY_PATH_INVALID`. (conntent-library "Plan reports resolved file", conntent-asset-pipeline)
- [ ] 1b.6 GREEN `E/lib/plan.mjs` library resolution records; REFACTOR duplicated stem-matching code.

### PR 1c: names and ledger. Start: 1b merged. Finish: one name per document/deliverable; `video-guard.json` gone. Verify: `node --test T/names.test.mjs T/video-guard*.test.mjs`. Rollback: revert PR 1c; legacy tests restored by the revert.

- [ ] 1c.1 RED `T/names.test.mjs`: master `<slug>_<W>x<H>.mp4`, formats `formats/<slug>_<W>x<H>.mp4`, `<slug>_thumbnail_<W>x<H>.png`, `<slug>_description.md`, `<slug>_animatic_<W>x<H>.mp4`, working files `plan.json`, `qa.json`; composition id = slug (no title-derived ids). Fails: current names. (conntent-asset-pipeline, two-phase-thumbnail, conntent-publication-description, cognnitive-conntent-engine)
- [ ] 1c.2 GREEN `E/render-thumbnail.mjs`, `E/render-formats.mjs`, `E/scene-compiler.mjs`, `E/lib/render.mjs`.
- [ ] 1c.3 RED `T/ledger-path.test.mjs`: one ledger `.cognnitive/video/ledger.jsonl`, written path equals read path; legacy `.cognnitive/video-ledger.jsonl` rejected by `assertLayout`. (conntent-run-facts "Single ledger")
- [ ] 1c.4 GREEN `E/lib/facts.mjs` sole owner; delete ledger functions in `E/lib/video-guard.mjs`.
- [ ] 1c.5 RED `T/video-guard-retired.test.mjs`: per-run cap from cascade `budget`, daily cap from `daily_budget`, blocked via Model `allowed:: false`, `max_seconds`/`max_concurrency` Model fields, voices from catalog `Voice`; `--allow-model` rejected; `video-guard.json` present -> `LAYOUT_LEGACY`. (conntent-model-catalog "video-guard retired", D-S4)
- [ ] 1c.6 GREEN delete `GUARD_FILENAME`, `DEFAULT_GUARD`, `loadGuard`, `validateConfig`; `SpendGuard` reads catalog + cascade; add Model fields `max_seconds`, `max_concurrency` to `BP/spec_NN.md` and `BP/catalog/model-catalog_coNNtent_NN.md`.
- [ ] 1c.7 RED+GREEN `T/plan-path.test.mjs`: plan persisted at `<episode>/plan.json` (not `<slug>_plan.md`), engine recomputes and never trusts its body. (conntent-run-facts)
- [ ] 1c.8 Rewrite `BP/procedures/usage_procedures_NN.md`, `BP/skills/nn-conntent/SKILL.md`, `references/*.md` names/paths (grep old names to zero: `rg "assets/<slug>|video-guard|video-ledger|_series_NN" BP/`). Accept: `rg` returns no hit. (conntent-skill, conntent-blueprint)
- [ ] 1c.9 REFACTOR + run `node scripts/verify.js --only=conntent`, `npm run verify:fast`.

## Phase 2: Cascade (Slice 2; PRs 2a-2e)

### PR 2a: scope classes and resolver. Start: 1c merged. Finish: contract test green for every field at every allowed level in compiler AND estimator. Verify: `node --test T/cascade-scope-classes.test.mjs T/build-field-registry.test.mjs`. Rollback: revert PR 2a, regenerate registry.

- [ ] 2a.1 RED `T/build-field-registry.test.mjs`: a `concept::` vs `scope::` mismatch fails generation; output carries `scope` and `levels`. Fails: no `scope`. (conntent-field-registry "Scope classes declared once")
- [ ] 2a.2 GREEN `E/build-field-registry.mjs`; add `scope:: render|video|domain` to every cascade Field Definition in `BP/spec_NN.md`; regenerate `E/lib/field-registry.generated.json`.
- [ ] 2a.3 RED `T/cascade-scope-classes.test.mjs`: for every registry field x every allowed level a sentinel resolves with `source = level` through `createCascade` AND appears in the plan built by `plan.mjs`; each forbidden level -> `CASCADE_LEVEL_FORBIDDEN`. Includes `image_model`, `image_size`, `avatar_resolution` (F6). Fails: module missing. (conntent-field-registry, conntent-model)
- [ ] 2a.4 GREEN `E/lib/cascade.mjs` `createCascade({model, scriptPath}).at(scene?, layer?).get(field)` -> `{value, source, trace}`; node order outer->inner per level: presets, character node (placeholder until 2d), explicit fields; build on `bagsToChain`.
- [ ] 2a.5 RED `T/scene-kind-direct-fields.test.mjs`: Scene Kinds accept direct fields; kind-level value beats series, loses to video; Chrome `music` feeds `background_audio` at kind level so a video or scene `background_audio` wins. [Q3] (conntent-scene-kinds, conntent-model "Background Audio Is a Field")
- [ ] 2a.6 GREEN `E/lib/cascade.mjs` kind level; remove `resolve`/`resolveKeyed` public exports from `E/lib/video-scope.mjs`.
- [ ] 2a.7 GREEN rewire `E/lib/compile.mjs:465,531`, `E/asset-cost-estimator.mjs:178-181` (thin view over `plan.mjs`), `E/lib/{avatar-jobs,tts-options,image-options,episode}.mjs`; delete `resolveForEpisode` per-field lists. Accept: 2a.3 passes in both paths.
- [ ] 2a.8 RED+GREEN source-trace output: the plan and `validate` print level for every resolved value. (conntent-field-registry "Every resolved value carries a source")
- [ ] 2a.9 REFACTOR rewrite stale tests that encode per-field level lists; `node scripts/verify.js --only=conntent`.

### PR 2b: language and catalog. Start: 2a merged. Finish: one language per episode validated before spend; video capability rejected. Verify: `node --test T/language.test.mjs T/catalog-video.test.mjs`. Rollback: revert PR 2b.

- [ ] 2b.1 RED `T/language.test.mjs`: `Voice.language === language` or `LANGUAGE_VOICE_MISMATCH` before spend; Chrome for that language required; `translation_of` is a Video-only record field; a `translation_of` episode with missing `en` Chrome or character voice fails with $0; `language` in the TTS cache key (different language -> different key). Fails: `'Spanish'` hard-coded fallback. (conntent-model "One Language Per Episode", conntent-captions n/a)
- [ ] 2b.2 RED [Q4] same file: a scene with no `voice` and no active Character fails `missing-voice` before spend; no package default `voice`.
- [ ] 2b.3 GREEN `BP/spec_NN.md` (`language` video class, `translation_of`), `E/lib/tts-options.mjs`, `E/asset-synthesizer.mjs:447` (remove `'Spanish'` fallback), `BP/defaults/video-defaults_NN.md`, validator in `E/lib/catalog.mjs`.
- [ ] 2b.4 RED `T/catalog-video.test.mjs`: `capability:: video` rejected `CAPABILITY_UNSUPPORTED`; estimate has no video-clip line; `video`/`ai_video` layer types removed. (conntent-model-catalog, D-K7)
- [ ] 2b.5 GREEN `E/lib/catalog.mjs`, `E/asset-cost-estimator.mjs:233,276` (delete branches); catalog `BP/catalog/model-catalog_coNNtent_NN.md` Voice `language`, `es` voices, system voices. `E/voice-clone.mjs` writes `Voice{language}`.
- [ ] 2b.6 RED+GREEN new fields `captions` (`off|words|lines`, render), `caption_model` (render), `thumbnail_formats` (video, default `[2560x1440, 1080x1920]`), thumbnail base/title/badge [Q8: title from Video `title`, base first scene still, no badge], `review_gates` (default `[script, preview]`, replaces `script_review`): registry test per field and `rg script_review BP/` returns nothing. Regenerate registry. (conntent-field-registry, two-phase-thumbnail, conntent-review "removed")
- [ ] 2b.7 RED+GREEN estimator vs compiler parity for `language` and TTS key (`T/estimator-parity.test.mjs`). REFACTOR.

### PR 2c: Frame. Start: 2b merged. Finish: emitted project contains resolved `frame.md`. Verify: `node --test T/frame.test.mjs`. Rollback: revert PR 2c.

- [ ] 2c.1 RED `T/frame.test.mjs`: `library/frames/<name>/FRAME.md` frontmatter (`colors`, `typography`, `spacing`, `components`) parsed with the nn-core parser (nested `components:` maps parse); `caption-skin.html` and `fonts/` optional; copied to `hyperframes/frame.md` (+ skin, fonts) with resolved tokens; `frame` resolves through cascade + library. Fails: `frame-tokens.mjs` YAML subset. (conntent-frame; D-K3, G11)
- [ ] 2c.2 GREEN `E/lib/frame-tokens.mjs` (use nn-core parser via mirror; export it in `scripts/core-mirrors/coNNtent.ts`, rebuild `nn-core.generated.cjs`), `E/lib/compile.mjs` emission, `E/render-thumbnail.mjs` frame source.
- [ ] 2c.3 GREEN move `skills/nn-conntent/frames/neutral.md` to `BP/library/frames/neutral/FRAME.md` (+ `caption-skin.html`); register in `manifest/source.yaml` if the folder is new. Accept: a skipped Define-a-Frame still renders (package floor). [Q5]
- [ ] 2c.4 REFACTOR remove the old frame walk; `node scripts/verify.js --only=conntent`.

### PR 2d: Character. Start: 2b merged (parallel to 2c). Finish: per-scene character voice/avatar/pose; C9 warning. Verify: `node --test T/character.test.mjs`. Rollback: revert PR 2d.

- [ ] 2d.1 RED `T/character.test.mjs`: `CHARACTER.md` frontmatter (`voices: {<lang>: <Voice slug>}`, `default_pose`, `avatar_model`, `avatar_resolution`, `default_background`) plus `avatars/`, `backgrounds/`, `voice/`; series `character:: lucas` and scene `character:: maria` resolve voice, avatar, pose per scene; `pose`/`background` resolve inside the character folder. Fails: field absent. (conntent-character)
- [ ] 2d.2 GREEN `BP/spec_NN.md` fields `character`, `pose`, `background` (render class); `E/lib/cascade.mjs` character node; `E/lib/avatar-jobs.mjs`; `E/lib/library.mjs` kind `characters`.
- [ ] 2d.3 RED `T/character-precedence.test.mjs`: character parameters sit directly beneath the explicit fields of the level that sets it, above presets of the same level per D-K2 order; a preset or explicit field overriding `voice`, `avatar`, `avatar_model` or `avatar_resolution` emits `CHARACTER_OVERRIDDEN`. (conntent-presets, C9)
- [ ] 2d.4 GREEN validator warning; REFACTOR.
- [ ] 2d.5 RED+GREEN missing character voice for the episode language fails hard before spend (no fallback to domaiNN voice). [Q4]

### PR 2e: Component portfolio. Start: 2c merged and V.5 recorded. Finish: `components:: <slot>=<name>` resolves `COMPONENT.md`; offline render with vendored set. Verify: `node --test T/component-portfolio.test.mjs`. Rollback: revert PR 2e.

- [ ] 2e.1 RED `T/component-portfolio.test.mjs`: `library/components/<name>/{COMPONENT.md,index.html,preview.mp4}`; frontmatter `slot`, `variables`, `duration`, `aspect`, `source` (`registry:<item>@<ver>` or `local`), `tokens`; slot contract `assertSlotContract` kept; every vendored item has `LICENSE` and a pin. Fails: folder form absent. (conntent-component-portfolio)
- [ ] 2e.2 GREEN move slot contracts to `skills/nn-conntent/slots/<slot>.html`; convert the 6 engine-authored components into `BP/library/components/<name>/`.
- [ ] 2e.3 GREEN `E/lib/compile.mjs` component resolution through `library.mjs`; `components:: <slot>=<name>`.
- [ ] 2e.4 RED `T/offline-render.test.mjs`: a render with the package set makes zero network calls (stub `fetch`/`https`, and prove the stub can go red). (conntent-skill-dependency-bundling "Vendored base set")
- [ ] 2e.5 GREEN vendor the items listed by V.5 into `BP/library/components/` with pins and `LICENSE` files [V5-fallback: only the 6 engine-authored items]. Generated/vendored output is excluded from the line budget; keep hand-written glue under 400.
- [ ] 2e.6 `manifest/source.yaml` entry for the new `library/` folders; `node scripts/sync-versions.mjs`; `npm run verify:fast`.
- [ ] 2e.7 Resolve `conntent-template` spec: decide removal vs delta (default: removal, superseded by `conntent-procedures`); record in `verifications.md`.

## Phase 3: nn-core `review_gate` (PR 3a; parallel to Phases 1-2)

### PR 3a-i: nn-core op. Start: PR 0 merged (tracker). Finish: `review_gate` op parsed, validated, sealed, round-tripped; apply requires human origin. Verify: nn-core tests for `changeset/review-gate.test.ts`. Rollback: revert PR 3a-i together with 3a-ii and 3b.

- [ ] 3a-i.1 RED `CORE/tests/changeset/review-gate.test.ts`: shape problems (`reviewed_hash` required; `verdict` in `approved|needs-change`; `gate` required); mutates nothing; `gate`, `verdict`, `reviewed_hash`, `plan_hash` sealed into `proposal_sha`; parse/serialize round-trip. Fails: op unknown. (changeset-review-gate, changeset-document-model)
- [ ] 3a-i.2 GREEN `CORE/src/changeset/{types,parser,serializer,hasher}.ts`: `review_gate`, `reviewGateProblems()`, frontmatter `author_kind`/`origin`/`reviewer` sealed.
- [ ] 3a-i.3 RED same file: blueprint `gates` frontmatter declaration; undeclared gate -> `GATE_UNDECLARED`; invalid target unit -> `GATE_TARGET_INVALID`. (changeset-review-gate "Per-bluepriNNt gate declaration")
- [ ] 3a-i.4 GREEN `CORE/src/changeset/` gate declaration check; `gates:` in `BP/spec_NN.md` (`script`,`preview` per element; `budget` per model); bump `blueprint_version`.
- [ ] 3a-i.5 RED `CORE/tests/changeset/review-gate-apply.test.ts`: apply without `author_kind: human`+`reviewer`+`origin: console` -> `GATE_NOT_HUMAN`/`GATE_REVIEWER_REQUIRED`; failed verdict leaves model untouched; reviewer must be non-empty and not the default pseudonym `reviewer`. [Q9] (changeset-apply-engine)
- [ ] 3a-i.6 GREEN apply engine; REFACTOR; build nn-core.

### PR 3a-ii: nn-mcp. Start: 3a-i merged. Finish: agent tools refuse verdicts; console changesets still apply. Verify: `MCP` `propose-changeset.spec.ts`, `apply-change-rejections.test.ts`. Rollback: revert PR 3a-ii.

- [ ] 3a-ii.1 RED `MCP` tests: `propose_changeset` and the bare-intent `apply_change` path return `GATE_VERDICT_REFUSED` for `review_gate`; `apply_change` of a console-downloaded human changeset file applies. (changeset-propose-tool, changeset-apply-engine)
- [ ] 3a-ii.2 GREEN `MCP/src/tools/{propose-changeset,apply-change}.ts`; the handler, not `writeProposedChangeset`, refuses (the engine uses that writer).
- [ ] 3a-ii.3 GREEN export frontmatter parser through `scripts/core-mirrors/coNNtent.ts`; `node scripts/build-core-mirrors.mjs`; commit regenerated `nn-core.generated.cjs`.
- [ ] 3a-ii.4 `innfo-console-feedback` delta applied in docs/living spec text later (task 8.2); here record the code-side change only.
- [ ] 3a-ii.5 Document risk R1 (forged human file) in the `changeset-review-gate` spec notes; no code.

## Phase 4: Pipeline and review (Slice 3b; PRs 3b-1..3b-5)

### PR 3b-1: hashes, gates, lifecycle. Start: 2e and 3a-ii merged. Finish: approval derived only from applied human changesets. Verify: `node --test T/gates.test.mjs T/review-hash.test.mjs T/lifecycle.test.mjs`. Rollback: revert PR 3b-1 and later.

- [ ] 3b-1.1 RED `T/review-hash.test.mjs`: `scriptSubject`/`previewSubject` canonical, exclude `review` and `status`; scene slice hash and `plan_hash = sha256(sorted slice hashes + prices)`; one shared implementation used by the console data module. (conntent-review-gates "reviewed_hash", C3, D-P1)
- [ ] 3b-1.2 GREEN `E/lib/review-hash.mjs`; `E/lib/plan.mjs` plan slices, persisted `plan.json` stamp. (conntent-run-facts "plan_hash")
- [ ] 3b-1.3 RED `T/gates.test.mjs`: an agent-written `review:: approved` opens nothing and is flagged (`REVIEW_UNBACKED`); a stale `reviewed_hash` refuses with "content changed since you reviewed it; reopen the console"; a scene-2 edit re-opens only scene 2 with a cause; `script`/`preview` per scene. Fails: module missing. (conntent-review-gates, conntent-review removed)
- [ ] 3b-1.4 GREEN `E/lib/gates.mjs` `gateState(...)`; delete `pendingReviews` (`episode.mjs:141`), `--approve` and `script_review` consumers.
- [ ] 3b-1.5 RED+GREEN re-open cause: `.cognnitive/video/reviews/<s>__<slug>.json` snapshot, diff of subjects names the changed key and source trace ("series voice changed"), missing snapshot -> "content changed". (conntent-review-gates C6)
- [ ] 3b-1.6 RED `T/lifecycle.test.mjs`: states `idea -> draft -> approved -> produced -> delivered` plus `failed_qa`, `archived`; `published` and `published_url` removed; content change after `delivered` re-opens the first changed gate for affected scenes only; `review::` mirrored only when changed. (conntent-episode-lifecycle, C5)
- [ ] 3b-1.7 GREEN `E/lib/episode.mjs`, `BP/spec_NN.md` status values; `rg "published_url" BP/` empty.
- [ ] 3b-1.8 RED+GREEN `review_gates` settable at domaiNN, series or video; `[]` autopilot valid. (conntent-review-gates "review_gates cascade")
- [ ] 3b-1.9 REFACTOR; `node scripts/verify.js --only=conntent`.

### PR 3b-2: pipeline order, budget, animatic. Start: 3b-1 merged. Finish: `produce` runs D8 order with exit codes; zero avatar calls before preview. Verify: `node --test T/produce-cold-cache.test.mjs T/pipeline.test.mjs`. Rollback: revert PR 3b-2 and later.

- [ ] 3b-2.1 RED `T/pipeline.test.mjs`: order validate -> script gate -> plan -> TTS and images (parallel, bounded `createLimiter`) -> animatic -> preview gate -> avatar -> compile -> render; exits 0/10/11/12/1; `--approve` and `--skip-qa` do not exist. (conntent-produce-command; D-P4, D-P7)
- [ ] 3b-2.2 GREEN `E/lib/pipeline.mjs`; `E/produce.mjs` becomes a CLI over it; `writeConsole` in `finally`.
- [ ] 3b-2.3 RED `T/budget-gate.test.mjs`: with `preview` off and total > `budget` exactly one `budget` gate (exit 10) carrying the episode `plan_hash`; with `preview` on, preview approval carries each scene slice hash and no second approval is asked; unset `budget` with total > 0 -> exit 11 (a cached run proceeds); daily cap -> exit 11. [Q10] (conntent-review-gates "Spend authorization is one mechanism")
- [ ] 3b-2.4 RED [Q1] same file: with `preview` on and the pre-preview (TTS+images) subtotal alone over `budget`, a `budget` gate is inserted BEFORE TTS and images carrying the episode `plan_hash`; the later preview gate asks for no spend approval. Alternative if answer changes: exit 11 asking to raise `budget`.
- [ ] 3b-2.5 GREEN `E/lib/gates.mjs` budget insertion; `pipeline.mjs` stops.
- [ ] 3b-2.6 RED `T/animatic.test.mjs`: animatic uses real audio and the character pose still or the prompt-generated image; named constants 640 px wide, 15 fps. [Q11] (conntent-produce-command "The animatic", C8)
- [ ] 3b-2.7 GREEN `E/lib/render.mjs` animatic path, `<slug>_animatic_<W>x<H>.mp4`.
- [ ] 3b-2.8 RED `T/produce-cold-cache.test.mjs` (fake providers via `synthesizerOptions`): stop 10 at script -> human fixture changeset -> stop 10 at preview with ZERO avatar calls -> approve -> TTS precedes avatar; editing scene 2 regenerates only scene 2's avatar; rerun no-op. (E2E for U3)
- [ ] 3b-2.9 GREEN wire `produce` step 1: apply pending `changes/*.md` with `author_kind: human` and `origin: console` on start (via `executeChangesetApply`). (console-changes-direct-write "produce applies pending")
- [ ] 3b-2.10 REFACTOR; run `node --test` on all pipeline tests.

### PR 3b-3: captions. Start: 3b-2 merged and V.3 recorded. Finish: aligned captions or stop before render. Verify: `node --test T/captions.test.mjs`. Rollback: revert PR 3b-3.

- [ ] 3b-3.1 RED `T/captions.test.mjs` using the V.3 fixture JSON: 89% match stops, 90% passes (`CAPTION_MATCH_MIN = 0.90`); displayed text is the script, whisper gives timings only; silent-tail words dropped; unmatched words interpolated between matched neighbours; normalisation NFC -> NFD accent strip, casefold, punctuation strip; model `small.en` for English, `small --language <code>` otherwise, never the default model. Fails: module missing. (conntent-captions)
- [ ] 3b-3.2 GREEN `E/lib/captions.mjs` running `npx hyperframes transcribe <a> --json` in a temp cwd per audio.
- [ ] 3b-3.3 RED+GREEN cache key `cache/video/captions/<sha256(audio sha, text, model, whisper version)>.json`: hit on same inputs, miss on any change. (conntent-captions "Alignment is cached")
- [ ] 3b-3.4 RED [Q2] `captions: words` for zh/ja -> `captions-words-unsupported` validation error before spend; `lines` and `off` valid. [V3-fallback: also on machines with segment-only timings]
- [ ] 3b-3.5 GREEN `E/lib/catalog.mjs`/validator rule; `captions: lines` from segment timings.
- [ ] 3b-3.6 RED+GREEN caption stage position: after TTS and images, before animatic; fewer than 90% stops the run before render with exit 1.
- [ ] 3b-3.7 RED `T/whisper-consent.test.mjs`: whisper missing + `captions != off` fails validation before spend with install offer; nothing installs silently; `off` valid. (conntent-skill-dependency-bundling, conntent-captions "Whisper is checked before spend")
- [ ] 3b-3.8 GREEN consent-gated install notice at domaiNN setup / first use.
- [ ] 3b-3.9 GREEN `caption-skin.html` consumed from the active frame for burned-in captions; REFACTOR.

### PR 3b-4: QA. Start: 3b-2 merged and V.4 recorded. Finish: master and output-set QA, `failed_qa` exit 12. Verify: `node --test T/qa.test.mjs`. Rollback: revert PR 3b-4.

- [ ] 3b-4.1 RED `T/qa.test.mjs`: a fixture render whose watermark is emitted but transparent -> `failed_qa`, `qa.json`, exit 12, no delivery (F1 regression); manifest overlay missing in `index.html` fails; master duration = manifest total +-1 frame. Fails: module missing. (conntent-qa)
- [ ] 3b-4.2 GREEN `E/lib/qa.mjs` master checkpoint; named constant `QA_TEXT_EDGE_MIN` (ffmpeg only); replaces the PR 0 minimal QA.
- [ ] 3b-4.3 RED+GREEN output-set checkpoint: every format and thumbnail exists with its declared dimensions, description exists; any failure -> `failed_qa`. (conntent-qa "Output set")
- [ ] 3b-4.4 Calibrate `QA_TEXT_EDGE_MIN` on the botijos frames; record value and frames used in the PR description (risk R2).
- [ ] 3b-4.5 REFACTOR.

### PR 3b-5: delivery, formats, thumbnails, description. Start: 3b-4 merged. Finish: automatic delivery after QA. Verify: `node --test T/delivery.test.mjs T/thumbnails.test.mjs T/description.test.mjs`. Rollback: revert PR 3b-5.

- [ ] 3b-5.1 RED `T/delivery.test.mjs`: first passing run creates `deliveries/v1/`; identical rerun creates nothing; changed run creates `v2/` and `v1/` bytes unchanged; N increments only when `outputs_hash` AND `input_fingerprint` both change; `delivery.json` fields; link fails (EXDEV/EPERM) -> copy fallback; outputs replaced by rename never in place. Fails: module missing. (conntent-delivery)
- [ ] 3b-5.2 GREEN `E/lib/delivery.mjs` (assemble in temporary sibling, `linkOrCopy` from `stage-assets.mjs`, rename into place), `status:: delivered`, `delivered_version`.
- [ ] 3b-5.3 RED+GREEN delivery runs automatically as the last step of Produce after QA; no separate Deliver procedure or `--deliver` flag. (C4)
- [ ] 3b-5.4 RED `T/thumbnails.test.mjs`: `thumbnail_formats` default two sizes, thumbnails produced inside `produce`; title from Video `title`, base first scene still, no badge. [Q8] (two-phase-thumbnail)
- [ ] 3b-5.5 GREEN `E/render-thumbnail.mjs`, `E/render-formats.mjs`; cascade fields consumed.
- [ ] 3b-5.6 RED+GREEN `T/description.test.mjs`: `<slug>_description.md` generated after QA, with chapters, included in delivery. (conntent-publication-description)
- [ ] 3b-5.7 RED+GREEN reconcile engine renderer description with HyperFrames; remove `published` references in `E/` and docs. (cognnitive-conntent-engine)
- [ ] 3b-5.8 REFACTOR; E2E `produce-cold-cache` reaches `delivered v1` and rerun no-op.

## Phase 5: Console (Slice 4; PRs 4a-4d)

### PR 4a: runtime. Start: 3b-5 merged, V.1 and V.2 recorded. Finish: CSP media, scope models/readOnly, FSA directory write, verdict kind. Verify: `node --test test/console-*.test.mjs` plus `node scripts/verify.js --only=console`. Rollback: revert PR 4a.

- [ ] 4a.1 RED `test/console-csp.test.mjs`: shell CSP contains `img-src 'self' file: data: blob: https:` and `media-src 'self' file:  blob:`. Fails: no `media-src`. (innfo-console-runtime) [V2-fallback: assert inlined posters and `target=_blank` links instead]
- [ ] 4a.2 GREEN `CON/artifact_shell.html`.
- [ ] 4a.3 RED `test/console-scope-models.test.mjs` (jsdom): `consoleScope.models` narrows payload, `readOnly` disables edit controls, per-scope draft-store key, label. (console-scope, console-view-registry)
- [ ] 4a.4 GREEN `CON/nn-runtime.js` scope models/readOnly (design G6); `writeConsole` gains `scope: {view?, models?, readOnly?, outFile?}`.
- [ ] 4a.5 RED `test/console-direct-write.test.mjs` with a fake `showDirectoryPicker`: folder accepted only if `domaiNN_NN.md` `workspace_id` matches; handle stored in IndexedDB keyed by `workspace_id`; on submit `queryPermission` -> `requestPermission` then write `changes/<ws>_<reviewer>_<stamp>_changes_NN.md` with `wx` semantics; no API -> download. (console-changes-direct-write) [V1-fallback: no IndexedDB, re-pick per session]
- [ ] 4a.6 GREEN `CON/nn-runtime.js` reuse the `showSaveFilePicker` seam (G5).
- [ ] 4a.7 RED+GREEN `verdict` draft kind -> exported as `review_gate` with frontmatter `author_kind: human`, `origin: console`, `reviewer` (asked once, kept in `localStorage`, reject empty/default name) [Q9]; `preview` carries scene slice hash, `budget` the episode `plan_hash`. (innfo-console-feedback, D-C4)
- [ ] 4a.8 RED+GREEN writer locator moved to `CORE/src/console/locate-writer.ts` and exported through the mirror; `MCP/src/tools/console-regeneration.ts` imports it. Rebuild mirror. (console-regeneration)
- [ ] 4a.9 REFACTOR; regenerate and commit `nn-core.generated.cjs`.

### PR 4b: view data module. Start: 4a merged. Finish: data layer for the unified view using engine modules, no reimplementation. Verify: `node --test T/console-conntent-data.test.mjs`. Rollback: revert PR 4b.

- [ ] 4b.1 RED `T/console-conntent-data.test.mjs`: tree Domain -> Series -> Episode; Pending inbox lists every open gate with its re-open cause; every field returns effective value + source level from the same cascade trace; hashes equal `review-hash.mjs` output. Fails: module missing. (conntent-domain-console, conntent-console-views removed)
- [ ] 4b.2 GREEN `BP/assets/console-view-conntent.data.mjs` calling `layout`, `cascade`, `gates`, `review-hash`, `library`.
- [ ] 4b.3 RED+GREEN `scripts/export-console.mjs`: episode discovery under `episodes/`, regeneration hooks, scope `{models, readOnly, outFile}`.
- [ ] 4b.4 RED+GREEN stale-translation flag when the original scene hash changes (`translation_of`). (conntent-domain-console, D4 display)
- [ ] 4b.5 RED+GREEN superseded deliveries marked in display only (`v1` after `v2`). (proposal question 4)

### PR 4c: unified view and regeneration. Start: 4b merged. Finish: one registered `conntent` view; old views deleted. Verify: `node --test test/console-conntent-view.test.mjs`. Rollback: revert PR 4c.

- [ ] 4c.1 RED `test/console-conntent-view.test.mjs` (jsdom): Pending inbox is home; sections Domain (Config, Catalog and voices, Status), Series (Board, Config, Scene Kinds, Chrome and Presets), Episode (Review, Config, Status, Deliveries); no "Deliver" button and no "Clean orphans" control. (conntent-domain-console, console-view-registry; X7)
- [ ] 4c.2 GREEN `BP/assets/console-view-conntent.js`, registered `conntent`; follows `console-mockup/domaiNN_console_mockup.html`.
- [ ] 4c.3 RED+GREEN approval flow: verdict draft -> `changes/`; an approval whose `reviewed_hash` no longer matches is refused with the C7 message. (console-regeneration, C7)
- [ ] 4c.4 RED+GREEN regeneration after every engine exit and every applied changeset (`pipeline.mjs` `finally`). 
- [ ] 4c.5 Delete `BP/assets/console-view-episode-review.*`, `BP/assets/console-view-series.*`; fix references (`rg "console-view-episode-review|console-view-series"` returns nothing). Accept: no dangling imports.
- [ ] 4c.6 RED+GREEN domaiNN console stays small regardless of episode count (size assertion with 50 fixture episodes).

### PR 4d: delivery view and picker. Start: 4c merged. Finish: read-only per-episode delivery HTML. Verify: `node --test test/console-delivery-view.test.mjs`. Rollback: revert PR 4d.

- [ ] 4d.1 RED `test/console-delivery-view.test.mjs`: `conntent-delivery` view is read-only, scoped to one episode via `consoleScope.models`, omits spend, budgets, ledger and image prompts, shows script, media, QA result and review history (gate, reviewer, time). [Q6] (conntent-domain-console "Read-only delivery view", conntent-delivery)
- [ ] 4d.2 GREEN second registration id in `console-view-conntent.js`; `delivery.mjs` writes `deliveries/v<N>/<slug>_delivery.html` through the same writer; bundle size stays under ~830 KB runtime.
- [ ] 4d.3 RED+GREEN component-portfolio picker showing `preview.mp4`, slot, variables. (conntent-component-portfolio, D18)
- [ ] 4d.4 RED+GREEN delivery HTML loads media by relative path from `file://` [V2-fallback: poster + "Open"].
- [ ] 4d.5 REFACTOR; `node scripts/verify.js --only=console`.

## Phase 6: Procedures (Slice 5; PRs 5a-5b)

### PR 5a: six procedures. Start: 4d merged. Finish: one document, tool per step. Verify: `node --test T/procedures.test.mjs`. Rollback: revert PR 5a.

- [ ] 5a.1 RED `T/procedures.test.mjs`: `BP/procedures/usage_procedures_NN.md` has exactly six procedures (Set up the Domain, Define a Frame, Define a Character, Create a Series, Plan an Episode, Produce an Episode); every step declares a tool (agent|engine|console|human); no "Deliver" procedure; setup procedures end in a `proposed` changeset. Fails: seven episode-level steps. (conntent-procedures)
- [ ] 5a.2 GREEN rewrite `usage_procedures_NN.md`; library files inert until referenced; the closing changeset holds the references plus one `produce_artifact` per created file with sha256 (D-R2, X4).
- [ ] 5a.3 RED+GREEN Create a Series ends with a dry-run test episode; the human chooses keep or discard at the last step; keeping makes it the first episode (no spend). [Q7]
- [ ] 5a.4 RED+GREEN Plan an Episode reads `CHARACTER.md` prose for the sealed scene draft.
- [ ] 5a.5 Superseded `conntent-template` handled per 2e.7.

### PR 5b: entry point and refusal. Start: 5a merged. Finish: state-aware entry; `nn-video-script` refuses. Verify: `node --test T/detect-state.test.mjs` plus the `nn-video-script` tests. Rollback: revert PR 5b.

- [ ] 5b.1 RED `T/detect-state.test.mjs`: `detectState(root)`: no `domaiNN_NN.md` -> Set up the Domain; no frame/character and no series -> Define a Frame/Character, skippable [Q5]; once a series exists they are never proposed again; no series -> Create a Series; series without episode -> Plan; open gate or draft -> Produce; legacy layout -> the `layout.mjs` message; after each procedure the next is proposed. (conntent-skill, conntent-procedures "State-aware entry point")
- [ ] 5b.2 GREEN `skills/nn-conntent/SKILL.md` and `E/lib/detect-state.mjs`.
- [ ] 5b.3 RED+GREEN `nn-video-script` refuses when `domaiNN_NN.md` pins coNNtent or `series/*/*_coNNtent_NN.md` exists, with a pointer to `nn-conntent` (skill tests under `skills/nn-video-script/`). (F13)
- [ ] 5b.4 RED+GREEN simulate U1-U7 on a fresh domaiNN fixture end to end (fake providers).

## Phase 7: Living specs, release, verification, archive

- [ ] 7.1 Merge the 41 delta specs into `LIVE` (remove `conntent-review`, `conntent-console-views`; apply deltas on `innfo-console-feedback`, `console-*`, `changeset-*`); respect `check:spec-urls` (no bare `cogNNitive/iNNfo` slug); check `console-review-mode` and `review-workflow` for overlap and add deltas only if requirements changed.
- [ ] 7.2 Run `node scripts/build-core-mirrors.mjs`, `node scripts/build-field-registry` equivalent, `node scripts/sync-versions.mjs`; confirm generated files committed; `SHIPPED_TEMPLATE_VERSIONS` guard green.
- [ ] 7.3 Full gate on the tracker: `node scripts/verify.js` (preflight tests with empty `USERPROFILE`+`HOME`), `npm run verify:fast`. All green.
- [ ] 7.4 Fresh-context review per PR before merging into the tracker (adversarial, unaware of the author's reasoning); extra attention on 3a-i/3a-ii (cross-blueprint contract), 4a (runtime CSP/FSA) and 3b-4 (QA heuristic).
- [ ] 7.5 Release (tracker to `main`, one run): use `nn-dev-release` (templates tag, nn-core / nn-mcp / nn-console versions derived); verify the templates pin on main; confirm the Pages deploy.
- [ ] 7.6 Recreate `coNNtent_NN/series/botijos-today` in the new layout using the procedures (no migration); run use cases U1-U7.
- [ ] 7.7 Fresh-context audit of the final tracker diff vs. the success criteria checklist in `proposal.md`.
- [ ] 7.8 Archive with `sdd-archive`; diff and `wc -l` every archived artifact against its source (haiku archiving has truncated artifacts before).

## Spec coverage matrix

| Capability | Tasks |
|---|---|
| conntent-library | 1b.1-1b.6 |
| conntent-frame | 2c.1-2c.4 |
| conntent-character | 2d.1-2d.5, 5a.4 |
| conntent-component-portfolio | 2e.1-2e.6, 4d.3 |
| conntent-captions | 2b.6, 3b-3.1-3b-3.9 |
| conntent-review-gates | 2b.6, 3b-1.1-3b-1.8, 3b-2.3-3b-2.5 |
| conntent-qa | 3b-4.1-3b-4.5 |
| conntent-delivery | 3b-5.1-3b-5.3, 4d.1-4d.2 |
| conntent-domain-console | 1a.3, 4b.1-4b.5, 4c.1-4c.6, 4d.1, 4d.3 |
| conntent-procedures | 5a.1-5a.5, 5b.1 |
| changeset-review-gate | 3a-i.1-3a-i.6 |
| console-changes-direct-write | 3b-2.9, 4a.5-4a.6 |
| conntent-folder-contract | 1a.1-1a.2, 1a.5-1a.6 |
| conntent-series-folders | 1a.1-1a.2 |
| conntent-production-hierarchy | 1a.8 |
| conntent-asset-pipeline | 1b.5, 1c.1-1c.2 |
| conntent-blueprint | 1a.5-1a.6, 1c.8 |
| conntent-model | 2a.3, 2a.5-2a.6, 2b.1-2b.3 |
| conntent-field-registry | 2a.1-2a.3, 2a.8, 2b.6 |
| conntent-presets | 2d.3-2d.4 |
| conntent-scene-kinds | 2a.5-2a.6 |
| conntent-model-catalog | 1c.5-1c.6, 2b.4-2b.5 |
| two-phase-thumbnail | 1c.1, 2b.6, 3b-5.4-3b-5.5 |
| conntent-produce-command | 3b-2.1-3b-2.10 |
| conntent-episode-lifecycle | 3b-1.6-3b-1.7 |
| conntent-run-facts | 1c.3-1c.4, 1c.7, 3b-1.2 |
| conntent-publication-description | 1c.1, 3b-5.6 |
| cognnitive-conntent-engine | 1c.1, 3b-5.7 |
| conntent-skill-dependency-bundling | 2e.4-2e.5, 3b-3.7-3b-3.8 |
| changeset-document-model | 3a-i.1-3a-i.2 |
| changeset-apply-engine | 3a-i.5-3a-i.6, 3a-ii.1-3a-ii.2 |
| changeset-propose-tool | 3a-ii.1-3a-ii.2 |
| innfo-console-feedback | 3a-ii.4, 4a.7, 7.1 |
| console-scope | 4a.3-4a.4, 4d.1 |
| console-view-registry | 4a.3, 4c.1-4c.2 |
| innfo-console-runtime | 4a.1-4a.2 |
| console-regeneration | 4a.8, 4c.3-4c.4 |
| conntent-skill | 1c.8, 5b.1-5b.2 |
| conntent-template | 2e.7, 5a.5 |
| conntent-review (removed) | 2b.6, 3b-1.3-3b-1.4, 7.1 |
| conntent-console-views (removed) | 4c.5, 7.1 |

All 41 capabilities are covered.

## Open-question dependency index

| Q | Default planned | Tasks to patch if the answer changes |
|---|---|---|
| Q1 | budget gate before TTS/images | 3b-2.4, 3b-2.5 |
| Q2 | `captions-words-unsupported` error | 3b-3.4, 3b-3.5 |
| Q3 | Chrome `music` is kind-level `background_audio` | 2a.5, 2a.6 |
| Q4 | `missing-voice` required, no default | 2b.2, 2d.5 |
| Q5 | Define Frame/Character proposed only before a series exists | 2c.3, 5b.1 |
| Q6 | delivery view omits spend/prompts | 4d.1 |
| Q7 | human keeps or discards the dry-run episode | 5a.3 |
| Q8 | thumbnail defaults | 2b.6, 3b-5.4 |
| Q9 | any non-empty name other than `reviewer` | 3a-i.5, 4a.7 |
| Q10 | unset `budget` -> exit 11 | 3b-2.3 |
| Q11 | animatic 640 px / 15 fps | 3b-2.6 |
