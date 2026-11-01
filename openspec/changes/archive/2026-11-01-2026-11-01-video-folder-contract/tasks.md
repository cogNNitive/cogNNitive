# Tasks: Video Folder Contract

Standalone change, shipped after `2026-11-01-video-presets` (`V_0-14-0`) as its own release `V_0-14-1`. Roots: `<bp>` = `iNNfo/specs/bluepriNNts/video-script/`, `<skill>` = `<bp>skills/nn-video-script/`, `<scripts>` = `<skill>scripts/`, `<t>` = `<skill>test/`, `<dev>` = `scripts/dev/`. `E` = episode folder, `B` = `E/build/`.

Root-level contract tests live in `test/` (pattern of `test/video-script-contract-additions.test.mjs`); engine tests live in `<t>`.

Strict TDD: in every slice, RED (failing test) precedes GREEN, then REFACTOR. A guard test that characterizes behaviour which must NOT change (cache identity) is written first and is expected green before and after; it is marked "guard". Runner: `node --test <file>`; filtered gate: `node scripts/verify.js --only=<file stem>`; fast pass: `npm run verify:fast`.

**Scope guard rails.** No migration tool, no rename script, no layout step, no `produce` command, no `--allow-still-avatars`, no shipped `procedures/`, no hand-rolled image-header parsing. Existing episodes, documents and folders are never moved, renamed or rewritten by this change; a script written for an earlier blueprint version is rejected, not converted.

Work units: each slice lists commits (`Na`, `Nb`, …); one reviewable commit = its tests + code + the docs it changes. Conventional commits, no AI attribution lines.

Environment: never `npm ci` from a worktree (node_modules are junctions into the primary checkout). If a build is needed use `node <repo>/node_modules/typescript/bin/tsc`. Do not edit `openspec/changes/archive/**`. **No nn-core change and no `lib/nn-core.generated.cjs` mirror rebuild** — D9 reuses the existing `findScopeChain`. Task 0.3 proves the premise; if it fails, stop and report.

Spec shorthand: FC = video-folder-contract, VE = cognnitive-video-engine, VSS = video-script-skill, VPD = video-publication-description, VAP = video-asset-pipeline, TPT = two-phase-thumbnail, VPH = video-production-hierarchy, VT = video-template, VB = video-blueprint, VSM = video-script-model, VSF = video-series-folders, WDC = workspace-directory-conventions. D1..D10 = design decisions.

## Prerequisite

This change branches from the tip of the presets change (`V_0-14-0` merged into `dev`), not from an older `dev`. Files it shares with that change: `spec_NN.md`, `video-defaults_NN.md`, both catalogs, `video-scope.mjs`, `scene-compiler.mjs`, `scene-project.mjs`, `video-engine-cli.mjs`, `avatar-jobs.mjs`, `synthesize-avatar.mjs`, `asset-synthesizer.mjs`, `asset-cost-estimator.mjs`, `build-script-from-draft.mjs`, `build-draft-html.mjs`, `draft-template.html`, `SKILL.md`, `references/`. If the presets change moves after this branch exists, rebase and re-run the guards of 1.1 and 3.1 before pushing.

---

## Slice 0: Pre-flight (read-only; commit only if a delta needs a fix)

- [ ] 0.1 FIRST TASK: `openspec validate 2026-11-01-video-folder-contract` and `npm run check:openspec` on the 12 deltas. Fix structural errors in the delta files only. Record which errors are composition-only (a MODIFIED target that exists only after the presets change archives, for example VSF) versus real. `video-publication-description/spec.md` is a full new-capability file (Purpose + Requirements), not a delta: confirm the validator accepts it. Verify: both commands exit 0, or only the recorded composition-only errors remain.
- [ ] 0.2 Composition check against the presets deltas: for each full-copy MODIFIED block (VSM: Series Concept, The Video Concept Carries The Episode Record, Shared Field Definitions, Video Defaults Concept; VSS: Blueprint-Ships Draft Authoring Tools; VSF: Series, Domain And Episode Extension Folders) diff it against the same requirement in the presets change. Only the edits named in each "(Previously: …)" may differ; no scenario of the presets version may be lost. Verify: written diff note in apply-progress.
- [ ] 0.3 Heading existence: every MODIFIED/REMOVED heading in this change exists byte-exact in `openspec/specs/<cap>/spec.md` (FC Three-Level Asset Scoping, Ephemeral Engine Directories Are Not Artifacts, Finalize/Register Step Promotes Rendered Output; VE Headless Video Rendering CLI, Format variants with blur fill; VSS Render Step Uses The HyperFrames Pipeline; TPT REQ-2; VPH Series Represented as a Reused Video-Template Model; VT Video Generation Procedure Migration; WDC both) or in the presets change's deltas; every ADDED heading collides with none. **Known exception to record:** the living `video-asset-pipeline` spec spells its headings `### REQ-3:` with no `Requirement:` prefix, so this change's MODIFIED target cannot merge as written; task 6.2 fixes it at archive time. Verify: `rg -n '^### Requirement:'` output reviewed; mismatches fixed in the delta.
- [ ] 0.4 Prove "no nn-core change": confirm `findScopeChain`, `findDomainRoot` and the `scope: true` recognition (`lib/nn-core.generated.cjs` around 7404, 7452-7464, 8339, 8355) are exported through the mirror used by `<scripts>/lib/video-scope.mjs`. Verify: note in apply-progress; if not exported, STOP and report.
- [ ] 0.5 Release baseline (read-only git): confirm `origin/main` carries `V_0-14-0` (the presets release). If not, STOP: this change assumes it. Verify: `git show origin/main:iNNfo/specs/bluepriNNts/video-script/spec_NN.md`.
- [ ] 0.6 Baseline: `npm run verify:fast` on the branch tip and `node --test` for every file in `<t>`; list reds present before slice 1 so none is blamed on this change.
- [ ] 0.7 Maintainer answer recorded: are blur variants still published (no gate; blur stays opt-in)? Is the poisoned-cache audit filed separately (M.3)? Verify: answers copied into apply-progress.

---

## Slice 1: Series anchoring (E) and #425

### Phase 1.1 RED

- [ ] 1.1 (guard, first) Cache identity: extend the presets change's `preset-cache-preservation.test.mjs` with a fixture series anchored by `<s>_scope_NN.md` only; TTS options hash, image key and avatar key equal its golden; `findDomainRoot` from the script and from an `E/build/` path is unchanged (no `?? start` relocation). Verify: `node --test <t>preset-cache-preservation.test.mjs`.
- [ ] 1.2 New `<t>series-root.test.mjs`: scope-only series resolves; nested scopes resolve to the outermost; `DUPLICATE_SCOPE_MARKER` surfaced (error, no root); a folder holding only `series_NN.md`, `series_rules.md` or `script_template.md` is no series; an episode outside a scope folder has no series; recognition by `scope: true` not filename. Covers FC Series Root Is Anchored On Scope Documents, FC Three-Level Asset Scoping, VPH Series Is A Folder Anchored By Its Scope Document, VSM Series Concept. Verify: fails.
- [ ] 1.3 Update `<t>series-scope.test.mjs` fixtures to `<s>_scope_NN.md`; add: stale `series_NN.md` (`transition:: wipe`) supplies no cascade value; text assertion that `lib/video-scope.mjs` contains no `SERIES_MARKERS`; scope document defines the series level (`frame:: brand`). Covers FC Legacy Series Markers Are Not Recognised, VSM Series Concept, VSF Series, Domain And Episode Extension Folders. Verify: fails.
- [ ] 1.4 #425 sounds tests in `<t>video-engine-cli.test.mjs` and `<t>sound-events.test.mjs`: `shared/audio/click.mp3` only → `MissingAssetError` naming `click`, level `series`, the searched `sounds/` dirs, without `shared/audio`, before any spend and with no ledger entry; `series/s/sounds/click.mp3` used; domain `sounds/whoosh.mp3` shared by two series. Covers VE Named Sounds Are Found Only In sounds/, VSF (sound scenarios). Verify: fails.
- [ ] 1.5 Thumbnail and builder tests: `<t>render-thumbnail-series.test.mjs` (subtitle and badge read `Other Series` from the scope document; stale `series_NN.md` title `Old` ignored when the scope says `New`), `<t>build-script-from-draft.test.mjs` (scope title and frontmatter; duplicate scope marker fails naming `DUPLICATE_SCOPE_MARKER`), `<t>build-draft-html.test.mjs` (series root via scope). Covers VSS Skill Scripts Use The Scope-Anchored Series Root, TPT REQ-2. Verify: fails.
- [ ] 1.6 Dev tooling tests in `<dev>*.test.mjs`: `series-values` output reflects the scope document when `video.series.json` differs; `adopt-video-plan` and `validate-scope-golden` never read it. Covers VSS Dev Tooling Does Not Read video.series.json. Verify: fails.
- [ ] 1.7 New `test/no-retired-layout-vocabulary.test.mjs`, a separate `todo`-gated suite: fails on `videos/{`, `.cognnitive-video`, `renders/<ref>`, `--format`, `master_vertical`, `descripcion_youtube`, `SERIES_MARKERS`, `series_rules.md`, `script_template.md`, `video.series.json`, `FORMAT_PRESETS`, `isHorizontal`, `_draft_<version>.html` under `<bp>` and `<dev>`, excluding `openspec/changes/archive/**`. Covers VSS Retired Layout Vocabulary Is Absent. Verify: red on a planted name; gated until 5.10.

### Phase 1.2 GREEN

- [ ] 1.8 Edit `<scripts>/lib/video-scope.mjs`: add `findSeriesRoot(startDir)` = outermost folder scope link below the domain root of `findScopeChain`, surface `!ok`; delete `SERIES_MARKERS` and the `series_NN.md` fallback in `loadCascadeBags` (`:23,122-132,159-163`). Verify: 1.2, 1.3 green.
- [ ] 1.9 Edit `<scripts>/video-engine-cli.mjs`: series root through `findSeriesRoot` (`:675`); `resolveSoundFiles` searches only `sounds/` (delete `:209-218`), the error lists every searched dir. Verify: 1.4 green.
- [ ] 1.10 Edit `<scripts>/render-thumbnail.mjs`: series lookup and title via the scope document; usage text says scope. Verify: 1.5 thumbnail cases green.
- [ ] 1.11 Edit `<scripts>/build-script-from-draft.mjs` (`:67-136`) and `<scripts>/build-draft-html.mjs` (`:10`): `findSeriesRoot`, title and frontmatter from the scope document, scope errors surfaced. Output names stay unchanged until 5.4. Verify: 1.5 green.
- [ ] 1.12 Edit `<dev>lib/series-values.mjs`, `<dev>adopt-video-plan.mjs`, `<dev>validate-scope-golden.mjs`: stop reading `video.series.json`. Verify: 1.6 green.

### Phase 1.3 REFACTOR and gate

- [ ] 1.13 One `resolveSeriesRoot` helper shared by the four consumers; remove dead marker imports. Verify: slice 1 tests green.
- [ ] 1.14 Gate: `--only=series-root`, `--only=series-scope`, `--only=preset-cache-preservation`; `npm run verify:fast`. Confirm no diff in nn-core or the generated mirror.

Commits: 1a `refactor(video-script): anchor series root on scope documents` (1.1-1.3, 1.8, 1.13); 1b `fix(video-script): look up named sounds only in sounds folders` (1.4, 1.9); 1c `refactor(video-script): read series title from scope document` (1.5, 1.6, 1.10-1.12); 1d `test(video-script): gate retired layout vocabulary scan` (1.7, 1.14).

---

## Slice 2: Single master (B), safe zones, #428, and the version bump

### Phase 2.1 RED

- [ ] 2.1 (guard, first) In `preset-cache-preservation.test.mjs`: with the 1920x1920 master compile, image `mediaOptions` has no `size` key and no key derived from the master resolution; image key equals the golden; TTS options do not read `master_resolution`; avatar key unchanged. Covers VE Cache Identity Image Options Never Gain Size. Verify: green now, stays green.
- [ ] 2.2 Extend `test/video-script-contract-additions.test.mjs`: `master_resolution` is `select`, options `[1920x1920]`, `concept:: Video Defaults` only (absent from Video, Scene, Layer, Series, Preset); resolves `1920x1920` with source `blueprint`, `domain` when declared; package defaults declare it; `1280x720` in a domain defaults and `master_resolution` on a Video fail validation; `resolution`, `format`, `fps` undeclared; `master` and `position` descriptions equal the exact texts of D4; `spec_NN.md` has no `center 12%` and no `dual`; defaults still declare none of `presets`, `voice_speed`, `voice_emotion`, `voice_tone`; `blueprint_version` is `V_0-14-1`. Covers VB, VSM (all five requirements), VPD Distinct From The Video Description Field. Verify: fails.
- [ ] 2.3 New `<t>master-resolution.test.mjs`: manifest width and height come from the cascaded value (`^(\d+)x(\d+)$`); `wide` → `unsupported-master-resolution` before any provider call and any ledger entry (fake provider counters); no default width/height/orientation in `scene-compiler.mjs`/`scene-project.mjs`; emission without width/height fails with a named error, no 1920x1080 assumption; `isHorizontal` and `center 12%` absent; `--format`, `--width`, `--height` are a usage error that lists none of them; `FORMAT_PRESETS` and the 9:16 route absent. Covers VE Single Square Master Declared By master_resolution, VE Format Flags Are Removed From The Engine CLI. Verify: fails.
- [ ] 2.4 Rewrite `<t>render-formats.test.mjs` (replace the `-c copy` expectation at `:61-66`): common args, `crop=1080:1920:420:0`, `crop=1920:1080:0:420`, `scale=1080:1080:flags=lanczos` and no `-c copy`; names and ffprobe dims equal the name (ffprobe seam; real ffmpeg cases skipped when absent); refuse a master ffprobe does not report as 1920x1920 with no output; slug read from `<slug>_1920x1920.mp4`; existing output skipped unless `--force`; default fill `crop` writes no `_blur`; `--fill blur` writes `<slug>_<W>xH_blur.mp4` beside the unchanged crop file, vertical and horizontal only; square ignores blur; two derivations on one machine are identical files. Covers VE Delivery Formats Are Derived From The Master By Crop, Blur Fill Is Opt-In And Suffixed, Derivation Guards Its Input And Its Outputs, REMOVED Format variants with blur fill. Verify: fails.
- [ ] 2.5 New `<t>safe-zone.test.mjs`: the six overlay components (`lower-third`, `caption`, `title`, `quote`, `watermark`, `b-roll`) declare `#root { inset: 21.875%; overflow: visible }`; computed boxes: lower-third 549.6 / 474 / 756 px on the master, 129.6 px bottom in the horizontal crop, 54 px left in the vertical crop; caption 528 / 474 / 648 px, 108 px, 54 px. Covers VE Overlay Components Respect The Central Safe Square. Verify: fails.

### Phase 2.2 GREEN

- [ ] 2.6 Edit `<bp>spec_NN.md`: add Field Definition `master_resolution` (D4 row), rewrite the `master` and `position` descriptions, drop the 16:9/dual wording, set `blueprint_version` to `V_0-14-1`. Verify: 2.2 spec-side cases green.
- [ ] 2.7 Edit `<bp>defaults/video-defaults_NN.md`: `master_resolution:: 1920x1920`; `parent_spec` → `video-script_V_0-14-1`. Verify: 2.2 green.
- [ ] 2.8 Regenerate both catalogs with `node scripts/blueprint-catalog.mjs`; update every pinned `V_0-14-0` string that names this blueprint. Verify: `--only=catalog`.
- [ ] 2.9 Edit `<scripts>/scene-compiler.mjs` (delete width/height defaults `:272-279,428-429,592-593`; size from `resolve('master_resolution', bags)`; named error before spend) and `<scripts>/scene-project.mjs` (`:85-89,103-105`; width/height required; delete `isHorizontal`). Verify: 2.1, 2.3 green.
- [ ] 2.10 Edit `<scripts>/video-engine-cli.mjs`: delete `FORMAT_PRESETS`, `resolveFormatSize`, `--format/--width/--height` (`:898-915,919-923,1004-1008`) and the 9:16 recompile; do not add `size` to image `mediaOptions` (`:463-469`; `asset-synthesizer.mjs:635` reads `options.size`). `--output` stays until 3.9. Verify: 2.1, 2.3 green.
- [ ] 2.11 Edit `<scripts>/render-formats.mjs` per D5 (shared args constant, crops, lanczos scale replacing `:39,135-136`, 1920x1920 refusal, slug from master, skip/`--force`, `--fill`, `_blur`); header comment states it is THE derivation (#428). Verify: 2.4 green.
- [ ] 2.12 Edit the six `<skill>components/*.html`: `#root` inset and percentages relative to it (lower-third bottom 12%, left 5%, max-width 70%; caption bottom 10%, right 5%, max-width 60%). Verify: 2.5 green.
- [ ] 2.13 Rewrite existing tests that assume 16:9 or the removed flags (find with `rg -n "1920x1080|isHorizontal|--format|1080" <t>`): `scene-compiler`, `scene-project`, `scene-project-mount`, `overlay-emission`, `video-engine-cli`, `hyperframes-render`. Verify: `node --test` green for these files.

### Phase 2.3 REFACTOR, release guards, gate

- [ ] 2.14 One `parseMasterResolution` shared by compiler and projector; ffmpeg common args as one constant. Verify: slice 2 tests green.
- [ ] 2.15 Release guards: `node scripts/guard-template-immutability.js`; `--only=metaschema`, `--only=field-catalogue`, `--only=no-legacy`; `npm run check:versions`. Verify: exit 0.
- [ ] 2.16 Gate: `npm run verify:fast`; `rg` the engine scripts for `FORMAT_PRESETS|isHorizontal|center 12%` (none).

Commits: 2a `feat(video-script): declare master_resolution and bump to V_0-14-1` (2.2, 2.6-2.8, 2.15); 2b `refactor(video-script): take master size from master_resolution` (2.1, 2.3, 2.9, 2.10, 2.13, 2.14); 2c `feat(video-script): derive delivery formats from the square master` (2.4, 2.11); 2d `feat(video-script): keep overlays inside the central safe square` (2.5, 2.12, 2.16).

---

## Slice 3: Build layout and workflow (D). Cache tests first.

### Phase 3.1 RED (in this order)

- [ ] 3.1 (guard, first) New `<t>build-layout-cache-identity.test.mjs`: TTS, image and avatar identities are equal before and after compile into `B`; cache dir is `<domain root>/.cognnitive/cache/video` with `build/` present, and the domain root resolves identically from the script and from `E/build/`; ledger, `pending-predictions.jsonl`, `locks/`, `video-guard.json` stay at the domain root; the episode folder name is not a key input (two folders, equal keys); staged names `<base>_<sha12>` unchanged; `temp/*.mp4` never deleted; compile + avatar + render re-run on a full cache after the move makes zero provider requests and adds zero ledger entries. Covers VE Layout-Independent, Cache Identity Location And Domain Root Unchanged, FC Deleting Build Is Safe. Verify: guard; must stay green at every later task.
- [ ] 3.2 Avatar audio from the TTS cache (add to 3.1 file): avatar key from an `audio/` copy equals the key from the cache entry; `ttsCachePathFor(sc, {cacheManager, config, models, bags})` equals the `assertAudioFresh` lookup (this also proves `_withResolvedVoice` and `resolveRegisteredVoice` give equal options); the explicit `audio_asset_source`/`voiceover` branch is kept for non-narrated scenes; the cache-miss message contains "run compile first"; compile creates no `audio/<sceneId>_voiceover.mp3`. Covers VE Avatar Synthesis Reads The TTS Cache Directly, Cache Identity Avatar Audio. Verify: fails.
- [ ] 3.3 New `<t>keyless-placeholder.test.mjs`: keyless TTS stored as `<key>-offline`, nothing under the real key; a later keyed run misses and calls the provider once; keyless image placeholder SVG (1920x1920) under `<key>-offline`, not under the real image key and not part of any key; pre-existing real entries still hit. Covers VE Cache Identity Keyless Placeholders Are Stored Offline. Verify: fails.
- [ ] 3.4 Compile layout tests in `<t>video-engine-cli.test.mjs`, `<t>media-staging.test.mjs`, `<t>hyperframes-render.test.mjs`: `B/manifest.json` always written; `--output`/`--out` is a usage error; staging only in `B/hyperframes/assets`, named `<base>_<sha12>`; `E/public`, `E/hyperframes`, `E/audio` (engine-written) and root `manifest.json` absent; `B/.nn-build` created; project emitted at `B/hyperframes`; the renderer does no copy when `publicDir === assetsDir`; `projectDir` required; authored `animations/` or `Hyperframes/` never collides; `asset_plan.approved.json` stays at `E`; deleting `build/` then re-running leaves the approval and the deliverables untouched; manifest absolute paths stay absolute. Covers VE Engine Output Is Written Only Under build/, FC Engine Output Lives Only Under build/, FC Fully produced episode. Verify: fails.
- [ ] 3.5 Render tests: `render <script>` only (a manifest argument is a usage error); recompiles every run (stale manifest regenerated); renders to `B/render.tmp.mp4` then same-volume rename to `E/<slug>_1920x1920.mp4`, the final path absent or the previous complete master during render; `render.tmp.mp4` gone after; a rename failure on an open target yields a message explaining the open file; a missing avatar clip refuses before rendering and names the synthesis command. Covers VE Render Compiles Every Time And Writes The Master In Place, Render Refuses Missing Avatar Clips, FC Deliverables Are Written In Place. Verify: fails.
- [ ] 3.6 Estimator and plan tests (`<t>plan-approval.test.mjs`, new `<t>asset-cost-estimator.test.mjs`): cached items $0 and `total_usd` is the uncached sum; an image is quoted only with a prompt; a cache emptied after an all-cached estimate makes compile refuse; the plan shows `approve the plan <hash8>`, no `approve-plan.mjs <this file>` line, stamped model ids, no `- [ ]` list, no "Recommended", no "Speech 2.5 HD"; the `checkApproval` hint has the same phrase; `ok, go ahead with 1a2b3c4d` is accepted. Covers VE Estimate Reflects What The Run Will Charge, Plan Boilerplate Is Truthful, VSS Approval Uses One In-Chat Phrase. Verify: fails.

### Phase 3.2 GREEN

- [ ] 3.7 Edit `<scripts>/lib/avatar-jobs.mjs` (extract `ttsCachePathFor` from `assertAudioFresh` `:95-107`) and `<scripts>/synthesize-avatar.mjs` (audio source `:142`; keep the explicit branch; "run compile first"). The fallback avatar key at `asset-synthesizer.mjs:481` stays untouched. Verify: 3.2 green, 3.1 still green.
- [ ] 3.8 Edit `<scripts>/asset-synthesizer.mjs`: `-offline` keys for keyless TTS (`:417-418`) and images (`:584-586`, mirroring `:493`); offline SVG 1920x1920. Verify: 3.3 green.
- [ ] 3.9 Edit `<scripts>/asset-cost-estimator.mjs` (`:473,:509-514,:150,:407-409`, image predicate = compile's `:461-462`, cached = $0) and `<scripts>/lib/plan-approval.mjs:119` hint. Verify: 3.6 green.
- [ ] 3.10 Edit `<scripts>/video-engine-cli.mjs` compile path: `publicDir` → `B/hyperframes/assets` (`:670`), remove the audio handoff (`:703-711`), manifest always `B/manifest.json` (`:726-729`), remove `--output/--out`, `projectDir` from `manifest.metadata.buildDir` (`:782`), create `B/.nn-build`; leave `:509` approval and the domain-root logic untouched. Verify: 3.1, 3.4 green.
- [ ] 3.11 Edit `<scripts>/hyperframes-render.mjs` (skip the copy when `publicDir === assetsDir` `:53-57`, `projectDir` required `:125`) and the `scene-project.mjs` emit location. Verify: 3.4 green.
- [ ] 3.12 Edit the render command: script-only, always compile, `render.tmp.mp4` then rename, open-file message, still-avatar refusal. Verify: 3.5 green.
- [ ] 3.13 Rewrite existing tests touched by the move: `video-engine-cli`, `hyperframes-render`, `asset-synthesizer`, `media-staging`, `synthesizer-guard`, `plan-approval`, `scene-project*`. Verify: `node --test` green.

### Phase 3.3 REFACTOR and gate

- [ ] 3.14 One `buildDir(E)` helper used by engine, renderer and (slice 4) finalize; remove dead `public/` and `audio/` references. Verify: slice 3 tests green.
- [ ] 3.15 Gate: `--only=build-layout-cache-identity`, `--only=preset-cache-preservation`, `--only=keyless`; `rg "E/public|renders/|voiceover.mp3" <scripts>` (none); `npm run verify:fast`. Real HyperFrames and ffmpeg renders are behind seams; record "not run for real" in apply-progress.

Commits: 3a `refactor(video-script): write engine output only under build` (3.1, 3.4, 3.10, 3.11); 3b `refactor(video-script): feed avatar synthesis from the tts cache` (3.2, 3.7); 3c `feat(video-script): render the master in place` (3.5, 3.12); 3d `fix(video-script): store keyless placeholders offline and price cached items at zero` (3.3, 3.6, 3.8, 3.9); 3e `test(video-script): rewrite the tests touched by the build move` (3.13-3.15).

---

## Slice 4: description.md (C) and finalize

### Phase 4.1 RED

- [ ] 4.1 (guard, first) In `<t>finalize-video.test.mjs`: finalize leaves `.cognnitive/cache/**` byte-identical (including `temp/*.mp4`) and creates nothing at the domain root. Covers VE Cache Identity Avatar Audio (temp kept). Verify: guard.
- [ ] 4.2 New `<t>description.test.mjs`: `floor(fromFrame/fps)` (786 at 30 = `00:26`), first line `00:00`, `MM:SS Title`, `H:MM:SS` on every line at 3700 s, starts equal the manifest for any input, titles from `props.title`; the printed block holds only `MM:SS Title` lines; finalize writes no `description.md` and no other file; the name is `description.md` and no `descripcion_youtube.md`/`youtube*.md` is produced. Covers VPD (all four requirements), VSS Finalize Prints The Chapter Block. Verify: fails.
- [ ] 4.3 Rewrite `<t>finalize-video.test.mjs`: usage `<episode-dir> [--formats] [--fill] [--force] [--dry-run]`; `--ref` and `renders/` gone; reads `E/<slug>_1920x1920.mp4` and `B/manifest.json`; derives the three formats beside the master; prints `master:: <slug>_1920x1920.mp4` and `thumbnail:: <slug>_thumbnail_2560x1440.png`; the Video document is byte-unchanged; a stale manifest (script newer) and a foreign `scriptSource` are rejected naming `render`, nothing written; `--dry-run` lists and creates nothing; no `master_vertical` or voiceover promotion. Covers VSS Finalize Derives Formats In Place, FC Deliverables Are Written In Place, FC REMOVED Finalize/Register Step Promotes Rendered Output. Verify: fails.
- [ ] 4.4 Thumbnail tests (`<t>render-thumbnail.test.mjs`): default output 2560x1440; `--width 1080 --height 1920` gives 1080x1920; size unchanged under `master_resolution:: 1920x1920`; no `sharp`. Covers TPT Thumbnails Are Separate Stills Named By Dimensions. Verify: fails or characterization green; record which.

### Phase 4.2 GREEN

- [ ] 4.5 New `<scripts>/lib/description.mjs`: chapter formatting (`MM:SS`, `H:MM:SS`), manifest reader, stale check helper. Verify: 4.2 green.
- [ ] 4.6 Rewrite `<scripts>/finalize-video.mjs` (`:85` and callers): reads the master and manifest via `buildDir`, validates the manifest, derives formats through `render-formats.mjs` (imported, not spawned), prints the chapters, prints the two field lines, never writes the model or a file. Verify: 4.1, 4.3 green.
- [ ] 4.7 `<scripts>/render-thumbnail.mjs`: edit only if 4.4 is red (usage text names `<slug>_thumbnail_<W>x<H>.png`; the tool's `--out` stays required). When the thumbnail file is missing, finalize warns and does not print its line. Verify: 4.4 green.

### Phase 4.3 REFACTOR and gate

- [ ] 4.8 Share the manifest loader and stale check between finalize and the render command; dedupe time formatting. Verify: slice 4 tests green.
- [ ] 4.9 Gate: `--only=description`, `--only=finalize-video`, `--only=build-layout-cache-identity`; `npm run verify:fast`.

Commits: 4a `feat(video-script): print chapters from measured durations` (4.2, 4.5); 4b `refactor(video-script): finalize derives formats in place` (4.1, 4.3, 4.4, 4.6-4.9).

---

## Slice 5: Contract, docs, authoring names (A)

### Phase 5.1 RED

- [ ] 5.1 Discovery before authoring: whether any scanner of workspace folders (nn-trannsform, manifest reconciliation) would pick up `build/` or `draft_thumbs/`. The contract states they are gitignored and not knowledge inputs; no code in the repo implements an exclusion today. Verify: written note; if a scanner would pick them up, STOP and report (outside this design). Covers FC Ephemeral Engine Directories Are Not Artifacts, WDC Gitignored Ephemeral Engine Directories.
- [ ] 5.2 New `test/folder-contract-crosscheck.test.mjs`: the canonical path list is one constant, asserted present in `<skill>references/folder-contract.md`, `<skill>SKILL.md` and the FC spec (read the delta if it exists, else the living spec, so the test survives archive); retired strings absent (`videos/{`, `renders/<ref>`, `.cognnitive-video`, `master_vertical`, a rule that paths stay inside `series/<slug>/`); SKILL.md lists the workflow steps in order with `compile`, `synthesize-avatar` and `render` consecutive and no `produce`; approval wording `approve the plan <hash8>` everywhere and no `apruebo el plan`; domain setup names `**/build/`, `**/draft_thumbs/`, `.cognnitive/cache/`; `audio/` is not ignored; thumbnail names in `thumbnail-and-asset-pipeline.md` and no `thumbnail_[topic].jpeg`. Covers FC One Contract Across Spec Reference And Skill, Canonical Layout, Naming Scheme, Authored And Engine-Generated Files Are Distinct, VSS Workflow, Approval Uses One In-Chat Phrase, Domain Setup Documents The Gitignore Block, VAP REQ-3, WDC Series and Video Folder Layout. Verify: fails.
- [ ] 5.3 Tool-name tests: `build-draft-html.mjs draft.json` writes `review_console.html` and no `*_draft_*.html`; the console exports `reviewed.json`; `build-script-from-draft.mjs reviewed.json` works with no `draft.json` and writes `<slug>_video-script_<s>_NN.md`; check whether `draft-template.html` embeds its own filename. Covers VSS Blueprint-Ships Draft Authoring Tools (fixed default names and no alias), FC Naming Scheme. Verify: fails.

### Phase 5.2 GREEN

- [ ] 5.4 Edit `<scripts>/build-draft-html.mjs` and `<scripts>/build-script-from-draft.mjs` (defaults `draft.json`, `reviewed.json`, `review_console.html`; `--draft` optional; remove the `_draft_<version>.html` alias), and `<scripts>/draft-template.html` only if 5.3 found an embedded filename. Verify: 5.3 green.
- [ ] 5.5 Edit `<skill>SKILL.md`: the workflow of D8, one approval phrase, the domain-setup gitignore block, the scope-anchored series, finalize usage, the tooling table without removed flags; bump the skill `version:` once for this release. Verify: 5.2 SKILL cases green.
- [ ] 5.6 Edit `<skill>references/folder-contract.md` (the one tree), `thumbnail-and-asset-pipeline.md` (names by dimensions, Open Gate crop), `overlay-slots.md` (safe square inset), `cost-guardrails.md` (cached $0, phrase); delete duplicated layout prose in SKILL.md. Verify: 5.2 green.
- [ ] 5.7 Regenerate catalogs if the catalog enumerates references; run the inventory/catalog guards and `node scripts/guard-template-immutability.js`. Verify: `--only=catalog`, `--only=metaschema`, `--only=field-catalogue`.
- [ ] 5.8 Un-gate `test/no-retired-layout-vocabulary.test.mjs` (1.7) and fix every hit outside `archive/`. Covers VSS Retired Layout Vocabulary Is Absent. Verify: `node --test test/no-retired-layout-vocabulary.test.mjs`.
- [ ] 5.9 VT check: `rg -n "generate_video_script_NN|generate-video-script"` finds no procedure file, so the VT delta is spec-only; confirm the described order is one 1920x1920 render before derivation and the chapters after render. Verify: note in apply-progress. Covers VT Video Generation Procedure Migration.

### Phase 5.3 REFACTOR and gate

- [ ] 5.10 Remove stale cross-links. Verify: 5.2 green.
- [ ] 5.11 Gate: `--only=folder-contract-crosscheck`, `--only=no-retired-layout`, `--only=build-draft-html`, `--only=build-script-from-draft`; `npm run verify:fast`.

Commits: 5a `refactor(video-script): fix default names of review files` (5.3, 5.4); 5b `docs(video-script): reconcile folder contract, skill and reference` (5.1, 5.2, 5.5-5.11).

---

## Slice 6: Release checklist and archive-time edits (verification, no new product code)

- [ ] 6.1 Release checklist: (a) blueprint `V_0-14-1` in `spec_NN.md`, defaults `parent_spec`, both catalogs and every pinned string, all in the slice-2 commit; (b) catalogs regenerated after 2.8 and 5.7; (c) `bluepriNNt-field-catalogue` and `metaschema-selfdescribe` green; (d) `guard-template-immutability` green; (e) skill `version:` bumped once; (f) `npm run check:spec-urls` passes; (g) each new test file is discovered (`verify.js --only=<stem>` lists it). Covers VB This Change Bumps The Blueprint To Its Own Version.
- [ ] 6.2 By-hand edits at archive time (deltas cannot make them), in `openspec/specs/`: rename `### REQ-3: Canonical Asset Naming Pattern` in `video-asset-pipeline/spec.md` to `### Requirement: REQ-3: …` before merging this change's block; rewrite the stale `Design Decision` section of `video-production-hierarchy` so a Series is a folder anchored by its scope document; `Purpose` of `video-series-folders`, `video-folder-contract` and `video-blueprint` to match the deltas. Exact wording is not fixed by the design: write it from the delta "Scope" lines.
- [ ] 6.3 Archive precondition: the presets change is archived first (its 4.11 done). Re-run the composition check of 0.2 against the LIVE `openspec/specs/`, not the presets deltas.
- [ ] 6.4 Archive hygiene: do not edit `openspec/changes/archive/**`; after archiving, `diff` and `wc -l` every copied artifact (an archiver once truncated design/tasks/apply-progress); `video-publication-description/spec.md` becomes a new living spec; run `npm run check:openspec` and `npm run check:spec-urls`.
- [ ] 6.5 Record in apply-progress: the presets hand-off (naming convention consumed, no requirement redefined), and that #425, #426/#427 and #429 are unblocked by this change.

---

## Maintainer tasks (gh and domain actions are NOT performed by the apply agent)

- [ ] M.1 Close #428 as superseded with links to the slice-2 PR: `render-formats` is THE derivation from the single master (D5).
- [ ] M.2 Close #425 with a link to the slice-1 PR (`sounds/` is the only lookup, D9); rewrite the body first if it still names `shared/audio`.
- [ ] M.3 File a separate issue, out of scope here: audit the real cache for keyless placeholders stored under real keys (silence detection), per design D10.
- [ ] M.4 Comment on #429 (pre-draft gate) that the folder contract now exists; #426/#427 stay sequenced after this change.

---

## Requirement traceability

| Spec | Requirement (short) | Tasks |
|---|---|---|
| FC | Canonical Layout | 5.2, 5.6 |
| FC | Naming Scheme By File Class | 5.2, 5.3 |
| FC | Deliverables Are Written In Place | 3.5, 3.12, 4.3, 4.6 |
| FC | Engine Output Lives Only Under build/ | 3.1, 3.4, 3.10, 3.11 |
| FC | Managed Gitignore Block | 5.2, 5.5 |
| FC | Series Root Anchored On Scope Documents | 1.2, 1.8, 1.9, 1.11 |
| FC | Legacy Series Markers Not Recognised | 1.3, 1.7, 1.8, 1.12 |
| FC | Authored And Engine-Generated Distinct | 5.2, 5.6 |
| FC | One Contract Across Spec, Reference, Skill | 5.2 |
| FC | MOD Three-Level Asset Scoping | 1.2, 5.2 |
| FC | MOD Ephemeral Engine Directories | 5.1, 5.2, 5.6 |
| FC | REMOVED Finalize/Register Promotes | 4.3, 4.6, 6.3 |
| VE | Single Square Master | 2.3, 2.9 |
| VE | Format Flags Removed | 2.3, 2.10 |
| VE | Derived By Crop; Blur Opt-In; Derivation Guards | 2.4, 2.11 |
| VE | Overlay Components Safe Square | 2.5, 2.12 |
| VE | Engine Output Only Under build/ | 3.4, 3.10, 3.11 |
| VE | Render Compiles Every Time; Refuses Missing Clips | 3.5, 3.12 |
| VE | Avatar Reads TTS Cache | 3.2, 3.7 |
| VE | Named Sounds Only In sounds/ | 1.4, 1.9 |
| VE | Estimate Reflects Charge; Plan Boilerplate | 3.6, 3.9 |
| VE | Cache Identity (layout-independent, image size, avatar audio, location) | 1.1, 2.1, 3.1, 3.2 |
| VE | Cache Identity Keyless Placeholders | 3.3, 3.8 |
| VE | MOD Headless Video Rendering CLI | 3.5, 3.12 |
| VE | REMOVED Format variants with blur fill | 2.4, 2.11, 6.3 |
| VSS | Workflow; Approval Phrase | 3.6, 5.2, 5.3, 5.5 |
| VSS | Finalize Derives In Place; Prints Chapters | 4.2, 4.3, 4.6 |
| VSS | Domain Setup Gitignore | 5.1, 5.2, 5.5 |
| VSS | Scope-Anchored Root; Dev Tooling | 1.5, 1.6, 1.10-1.12 |
| VSS | Retired Layout Vocabulary | 1.7, 5.8 |
| VSS | MOD Draft Authoring Tools; Render Step | 5.3, 5.4; 3.5, 3.12 |
| VPD | all four requirements | 4.2, 4.5, 4.6 |
| VAP | REQ-3 | 5.2, 5.6, 6.2 |
| TPT | Separate Stills; REQ-2 | 4.4, 4.7; 1.5, 1.10 |
| VPH | Series Anchored; REMOVED reused video-template | 1.2; 6.2 |
| VT | Video Generation Procedure Migration | 5.9 |
| VB | master_resolution; Text; Own Version | 2.2, 2.6, 2.7; 0.5, 2.8, 2.15, 6.1 |
| VSM | Master Resolution; Descriptions; Series Concept; Episode Record; Shared Fields; Video Defaults | 2.2, 2.6, 2.7; 1.2, 1.3, 1.8 |
| VSF | MOD Series, Domain And Episode Extension Folders | 1.3, 1.4, 1.8, 1.9, 6.2 |
| WDC | Series and Video Folder Layout; Gitignored Ephemeral Dirs | 5.1, 5.2, 5.6 |

## Not grounded in the design (decide at apply, record in apply-progress)

- Which test reads the FC spec for the cross-check once the change is archived (5.2 uses a fallback path).
- Location of the single gitignore block constant (5.2 and 5.5 compare equal text).
- Finalize behaviour when the thumbnail is missing (4.7); whether `render-thumbnail.mjs` derives the `<slug>_thumbnail_<W>x<H>` name (the spec says no).
- Exact wording of the archive-time `Purpose` edits (6.2); whether `generate_video_script_NN.md` exists anywhere (5.9: not in this worktree).
- Poisoned-cache audit: out of scope, M.3.

## Review Workload Forecast

| Slice | Est. changed lines (add + delete, tests and fixtures included) | 400-line budget risk | Chained PRs recommended |
|---|---|---|---|
| 0 Pre-flight | 0-60 | Low | No |
| 1 Series anchoring + #425 | 500-900 | High | Yes |
| 2 Single master + safe zones + bump | 900-1500 | High | Yes |
| 3 Build layout + workflow | 1000-1700 | High | Yes (split 3a-3e) |
| 4 description.md + finalize | 400-700 | High | Yes |
| 5 Contract, docs, names | 600-1000 | High | Yes |
| 6 Release/archive | 0-80 | Low | No |
| **Total** | **3400-5940** | **High** | **Yes** |

Decision needed before apply: No (scope decided: no migration).
Chained PRs recommended: Yes.
Chain strategy: one PR per slice; PR 1 base = the presets release tip, each later PR base = the previous PR branch.
