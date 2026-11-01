# Tasks: Video Folder Contract

Change `2026-11-01-video-folder-contract`, stacked after CHANGE-1 = `2026-11-01-video-presets` (its task ids are written `C1 x.y`). Size note: the 530-word skill budget is overridden on purpose (orchestrator asked for the cross-change table, traceability and per-slice forecast); tables carry most of it. The Review Workload Forecast is the last section.

Roots: `<bp>` = `iNNfo/specs/bluepriNNts/video-script/`, `<skill>` = `<bp>skills/nn-video-script/`, `<scripts>` = `<skill>scripts/`, `<t>` = `<skill>test/`, `<dev>` = `scripts/dev/`, `<c1>` = `openspec/changes/2026-11-01-video-presets/`, `<fc>` = `openspec/changes/2026-11-01-video-folder-contract/`. `E` = episode folder, `B` = `E/build/`. Root-level contract tests live in `test/` (pattern of `test/video-script-contract-additions.test.mjs`); engine tests live in `<t>`.

Strict TDD: in every slice, RED (failing test) precedes GREEN, then REFACTOR. A guard test that characterizes behaviour which must NOT change (cache identity) is written first and is expected green before and after; it is marked "guard". Runner: `node --test <file>`; filtered gate: `node scripts/verify.js --only=<file stem>` (shape discovery covers `scripts/`, `test/` and the blueprint skill tests); fast pass: `npm run verify:fast`.

Work units: each slice lists commits (`Na`, `Nb`, ...); one reviewable commit = its tests + code + the docs it changes. Conventional commits, no AI attribution lines. Commit message hint is given per commit.

Environment: never `npm ci` from a worktree (node_modules are junctions into the primary checkout). If a build is needed use `node <repo>/node_modules/typescript/bin/tsc`. Do not edit `openspec/changes/archive/**`. **No nn-core change and no `lib/nn-core.generated.cjs` / mirror rebuild** (design D9 reuses the existing `findScopeChain`; "Out of Scope: any nn-core resolver or loader change"). Task 0.4 proves the premise; if it fails, stop and report.

Spec shorthand: FC = video-folder-contract, VE = cognnitive-video-engine, VSS = video-script-skill, VPD = video-publication-description, VAP = video-asset-pipeline, TPT = two-phase-thumbnail, VPH = video-production-hierarchy, VT = video-template, VB = video-blueprint, VSM = video-script-model, VSF = video-series-folders, WDC = workspace-directory-conventions. D1..D11 and L1..L11 = design decisions / layout rules.

## Cross-change dependencies

### A. Tasks here that need a companion task first

| Task(s) here | Needs first (CHANGE-1 id) | Companion slice that must be merged | Reason |
|---|---|---|---|
| 0.2, 0.3 | `<c1>specs/**` (planning artifacts only) | none | read-only composition check against C1 deltas |
| 1.1, 3.1, 6.2 | C1 1.6a, 1.6d, 2.1a | S1 (fixture, golden), S2 (2.1a test) | cache golden and fixture are extended, never regenerated |
| 1.3, 1.8 | C1 2.8, 2.12 | S2 | same file `lib/video-scope.mjs`; `series-scope` test already rewritten to presets |
| 1.7, 5.11 | C1 1.5, 1.6b, 4.7 | S1 (scan), S4 (un-gate) | our names are added to the same scan, gated separately |
| 1.9 | C1 2.10 | S2 | `video-engine-cli.mjs` presets wiring |
| 1.11 | C1 4.4 | S4 | `build-script-from-draft.mjs`, `build-draft-html.mjs` |
| 1.12 | C1 4.5 | S4 | dev tooling (`series-values`, `adopt-video-plan`, `validate-scope-golden`) |
| 2.2, 2.6, 2.7 | C1 1.4, 1.7, 1.8 | S1 | `spec_NN.md` at `V_0-14-0`, defaults, contract test file |
| 2.8, 2.16 | C1 1.13, 1.14, 1.15 | S1 | catalogs and guards, regenerated again on top |
| 2.9, 2.10 | C1 2.9, 2.10, 3.5, 3.6 | S2, S3 | `scene-compiler.mjs`, `scene-project.mjs`, CLI |
| 3.8 | C1 3.5 | S3 | `avatar-jobs.mjs`, `synthesize-avatar.mjs` |
| 3.9, 3.10 | C1 3.6 | S3 | `asset-synthesizer.mjs`, `asset-cost-estimator.mjs` |
| 3.1 (green gate) | C1 3.9 | S3 | `preset-cache-preservation.test.mjs` must be green at the base |
| 4.5, 4.6 | C1 1.7 | S1 | Video `description` field read by the skeleton |
| 5.6, 5.8, 5.9, 5.12 | C1 4.1a, 4.4, 4.6 | S4 | tools, SKILL.md, references |
| 6.1 to 6.15 | C1 1.6, 1.6a, 1.6c, 1.6d, 1.11, 2.1a | S1 (pipeline), S2 | step registry, fixture, golden |
| 7.2 to 7.5 (archive) | C1 4.10 (C1 archived) | all | the VSF delta targets a capability C1 creates |

### B. Companion tasks this change affects, and what waits on this change

| Item | Effect |
|---|---|
| C1 1.11 / 1.6 (`migrate-video-presets.mjs` and its tests) | Our 6.8 renames the script and test with no alias; the `presets` contract is unchanged. C1 tests keep passing after the rename (6.13). |
| C1 1.5 / 4.7 (retired scan) | We append names in a separate gated block (1.7) so C1's un-gating at 4.7 does not turn our block red early; un-gate at 5.11. |
| C1 4.11 / D3 legacy `series_NN.md` source | Delivered here (1.8): recorded as the CHANGE-1 D3 follow-up in apply-progress. |
| C1 4.12 (hand-off check) | Reads this change's artifacts; confirm in 7.1. No C1 task waits for this change to complete. |
| Waits on this change | real-domain migration (maintainer), #426/#427/#429, and the merge to `main` (neither chain merges alone). |

### C. Merge and rebase order, and the start rule

Order (`feature-branch-chain`, design coordination map): C1 S1 -> S2 -> S3 -> S4, then this change S1 -> S2 -> S3 -> S4 -> S5 -> S6, each PR based on the previous PR branch; only the tracker merges to `main`.

**Rule: do not start slice N of this change before the companion slice M below is merged into the feature branch.** The stack is linear, so in practice every slice is based on the tip of C1 S4 (after C1 4.9 gate); column M is the minimum that carries the actual file overlap.

| Our slice | Do not start before | Also requires |
|---|---|---|
| 0 pre-flight | nothing (read-only) | |
| 1 series anchoring | C1 S4 (4.4, 4.5), C1 S2 (2.8, 2.10) | C1 4.9 gate green |
| 2 single master | C1 S3 (scene-compiler 3.5/3.6) and S1 (spec bump) | our S1 merged |
| 3 build layout | C1 S3 (3.5, 3.6, 3.9) | our S2 merged |
| 4 description | C1 S1 (Video fields) | our S3 merged (manifest at `build/`) |
| 5 contract + docs | C1 S4 (4.1a, 4.4, 4.6, 4.7) | our S4 merged |
| 6 layout migration | C1 S1 (1.11) minimum; effective C1 S4 | our S5 merged; C1 4.12 recorded |

Rebase rule: if any C1 slice changes after our chain branched, rebase our chain in order and re-run guards 1.1, 3.1 and 6.2 before pushing.

---

## Slice 0: Pre-flight (read-only; commit only if a delta needs a fix)

- [ ] 0.1 FIRST TASK, never run before: `openspec validate 2026-11-01-video-folder-contract` and `npm run check:openspec` on the 12 deltas in `<fc>specs/*/spec.md`. Fix structural errors in the delta files only. Record which errors are composition-only (a MODIFIED/REMOVED target that exists only after C1 archives, for example VSF) versus real. `video-publication-description/spec.md` is a full new-capability file (Purpose + Requirements), not a delta: confirm the validator accepts it. Verify: both commands exit 0, or only the recorded composition-only errors remain. Covers all specs.
- [ ] 0.2 Composition check now, against C1 deltas: for each full-copy MODIFIED block (VSM: Series Concept, The Video Concept Carries The Episode Record, Shared Field Definitions, Video Defaults Concept; VSS: Video Presets Migration Script, Blueprint-Ships Draft Authoring Tools; VSF: Series, Domain And Episode Extension Folders) diff it against the same requirement in `<c1>specs/<cap>/spec.md`. Only the edits named in each "(Previously: ...)" may differ; no scenario of the C1 version may be lost. Verify: written diff note in apply-progress.
- [ ] 0.3 Heading existence: every MODIFIED/REMOVED heading in `<fc>specs/**` exists byte-exact in `openspec/specs/<cap>/spec.md` (FC Three-Level Asset Scoping, Ephemeral Engine Directories Are Not Artifacts, Finalize/Register Step Promotes Rendered Output; VE Headless Video Rendering CLI, Format variants with blur fill; VSS Render Step Uses The HyperFrames Pipeline; VAP REQ-3; TPT REQ-2; VPH Series Represented as a Reused Video-Template Model; VT Video Generation Procedure Migration; WDC both) or in `<c1>specs` (C1-created or C1-modified); our ADDED headings collide with no C1 heading (`rg -n '^### Requirement:' <c1>specs <fc>specs`). Verify: rg output reviewed; mismatches fixed in the delta.
- [ ] 0.4 Prove "no nn-core change": confirm `findScopeChain`, `findDomainRoot` and the `scope: true` recognition (`lib/nn-core.generated.cjs` around 7404, 7452-7464, 8339, 8355) are exported through the mirror used by `<scripts>/lib/video-scope.mjs`. Verify: note in apply-progress; if not exported, STOP and report (would require an nn-core change, out of scope).
- [ ] 0.5 Release baseline (read-only git): `git show origin/main:iNNfo/specs/bluepriNNts/video-script/spec_NN.md` and read `blueprint_version`. If `V_0-14-0` is already on `origin/main`, set the flag "use V_0-14-1" for 2.6/2.7/2.8/2.16; otherwise stay on `V_0-14-0`. Covers VB Folder Contract Change Rides The Same Version Train.
- [ ] 0.6 Baseline: `npm run verify:fast` on the stack tip and `node --test` for every file in `<t>`; list reds present before slice 1 so none is blamed on this change.
- [ ] 0.7 Maintainer answers recorded (design Open questions): D8 `produce` plus `--allow-still-avatars` (gates 3.13, 3.14), D8 English procedures now vs defer to #429 (gates 5.4, 5.7), D5 blur still published (no gate: blur stays opt-in), D10 poisoned-cache audit filed separately (M.3). Defaults used if unanswered: yes, yes, opt-in, file separately. Verify: answers copied into apply-progress.

---

## Slice 1: Series anchoring (E) and #425

### Phase 1.1 RED

- [ ] 1.1 (guard, first) Cache identity: extend C1 `<t>preset-cache-preservation.test.mjs` with a fixture series anchored by `<s>_scope_NN.md` only; TTS options hash, image key and avatar key equal the C1 1.6d golden; `findDomainRoot` from script and from an `E/build/` path is unchanged (no `?? start` relocation). A `series_NN.md`-only series is documented as expected to differ here (converted by L8 in 6.5). Covers VE Cache Identity Location And Domain Root Unchanged, Layout-Independent. Verify: `node --test <t>preset-cache-preservation.test.mjs`.
- [ ] 1.2 New `<t>series-root.test.mjs`: scope-only series resolves; nested scopes resolve to the outermost; `DUPLICATE_SCOPE_MARKER` surfaced (error, no root); marker-only folder (`series_NN.md`, `series_rules.md`, `script_template.md`) is no series; episode outside a scope folder has no series; recognition by `scope: true` not filename; a series-shared asset reference `shared/audio/intro.mp3` is accepted by the existing folder-contract check (find it with `rg -n "folder-contract|escape" <scripts>`; if none exists record in apply-progress). Covers FC Series Root Is Anchored On Scope Documents, FC Three-Level Asset Scoping, VPH Series Is A Folder Anchored By Its Scope Document, VSM Series Concept. Verify: fails.
- [ ] 1.3 Update `<t>series-scope.test.mjs` fixtures to `<s>_scope_NN.md`; add: stale `series_NN.md` (`transition:: wipe`) supplies no cascade value; text assertion that `lib/video-scope.mjs` contains no `SERIES_MARKERS`; scope document defines the series level (`frame:: brand`). Covers FC Legacy Series Markers Are Not Recognised, VSM Series Concept, VSF Series, Domain And Episode Extension Folders. Verify: fails.
- [ ] 1.4 #425 sounds tests in `<t>video-engine-cli.test.mjs` and `<t>sound-events.test.mjs`: `shared/audio/click.mp3` only -> `MissingAssetError` naming `click`, level `series`, the searched `sounds/` dirs, without `shared/audio`, before any spend and with no ledger entry; `series/s/sounds/click.mp3` used; domain `sounds/whoosh.mp3` shared by two series. Covers VE Named Sounds Are Found Only In sounds/, VSF (sound scenarios). Verify: fails.
- [ ] 1.5 Thumbnail and builder tests: `<t>render-thumbnail-series.test.mjs` (subtitle and badge read `Other Series` from the scope document; stale `series_NN.md` title `Old` ignored when scope says `New`), `<t>build-script-from-draft.test.mjs` (scope title and frontmatter; duplicate scope marker fails naming `DUPLICATE_SCOPE_MARKER`), `<t>build-draft-html.test.mjs` (series root via scope). Covers VSS Skill Scripts Use The Scope-Anchored Series Root, TPT REQ-2. Verify: fails.
- [ ] 1.6 Dev tooling tests in `<dev>*.test.mjs`: `series-values` output reflects the scope document when `video.series.json` differs; `adopt-video-plan` and `validate-scope-golden` never read it. Covers VSS Dev Tooling Does Not Read video.series.json. Verify: fails.
- [ ] 1.7 New `test/no-retired-layout-vocabulary.test.mjs`, a separate `todo`-gated suite (not appended to C1's test, so C1 4.7 cannot ungate it): fails on `videos/{`, `.cognnitive-video`, `renders/<ref>`, `--format`, `master_vertical`, `descripcion_youtube`, `SERIES_MARKERS`, `series_rules.md`, `script_template.md`, `video.series.json`, `FORMAT_PRESETS`, `isHorizontal`, `_draft_<version>.html` under `<bp>` and `<dev>`, excluding `openspec/changes/archive/**` and the migration fixture directory (reuse C1 1.6b exclusion, with the assertion that the exclusion is limited to it). Covers VSS Retired Layout Vocabulary Is Absent. Verify: red on a planted name; gated until 5.11.

### Phase 1.2 GREEN

- [ ] 1.8 Edit `<scripts>/lib/video-scope.mjs`: add `findSeriesRoot(startDir)` = outermost folder scope link below the domain root of `findScopeChain`, surface `!ok`; delete `SERIES_MARKERS` and the `series_NN.md` fallback in `loadCascadeBags` (`:23,122-132,159-163`). Record as the CHANGE-1 D3 follow-up. Verify: 1.2, 1.3 green.
- [ ] 1.9 Edit `<scripts>/video-engine-cli.mjs`: series root through `findSeriesRoot` (`:675`); `resolveSoundFiles` searches only `sounds/` (delete `:209-218`), error lists every searched dir. Verify: 1.4 green.
- [ ] 1.10 Edit `<scripts>/render-thumbnail.mjs`: series lookup and title via scope document; usage text says scope. Verify: 1.5 thumbnail cases green.
- [ ] 1.11 Edit `<scripts>/build-script-from-draft.mjs` (`:67-136`) and `<scripts>/build-draft-html.mjs` (`:10`): `findSeriesRoot`, title and frontmatter from the scope document, scope errors surfaced. Output names stay unchanged until 5.6. Verify: 1.5 green.
- [ ] 1.12 Edit `<dev>lib/series-values.mjs`, `<dev>adopt-video-plan.mjs`, `<dev>validate-scope-golden.mjs`: stop reading `video.series.json`. Verify: 1.6 green.

### Phase 1.3 REFACTOR and gate

- [ ] 1.13 One `resolveSeriesRoot` helper shared by the four consumers; remove dead marker imports. Verify: slice 1 tests green.
- [ ] 1.14 Gate: `node scripts/verify.js --only=series-root`, `--only=series-scope`, `--only=preset-cache-preservation`; `npm run verify:fast`. Confirm no diff in nn-core or the generated mirror.

Commits: 1a `refactor(video-script): anchor series root on scope documents` (1.1-1.3, 1.8, 1.13); 1b `fix(video-script): look up named sounds only in sounds folders` (1.4, 1.9); 1c `refactor(video-script): read series title from scope document` (1.5, 1.6, 1.10-1.12); 1d `test(video-script): gate retired layout vocabulary scan` (1.7, 1.14).

---

## Slice 2: Single master (B), safe zones, #428

### Phase 2.1 RED

- [ ] 2.1 (guard, first) In `preset-cache-preservation.test.mjs`: with the 1920x1920 master compile, image `mediaOptions` has no `size` key and no key derived from the master resolution; image key equals the C1 1.6d golden; TTS options do not read `master_resolution`; avatar key unchanged. Covers VE Cache Identity Image Options Never Gain Size, VSM Video Defaults Concept note. Verify: green now, stays green.
- [ ] 2.2 Extend `test/video-script-contract-additions.test.mjs`: `master_resolution` is `select`, options `[1920x1920]`, `concept:: Video Defaults` only (absent from Video, Scene, Layer, Series, Preset); resolves `1920x1920` with source `blueprint`, `domain` when declared; package defaults declare it; `1280x720` in a domain defaults and `master_resolution` on a Video fail validation; `resolution`, `format`, `fps` undeclared; `master` and `position` descriptions equal the exact texts of D4; `spec_NN.md` has no `center 12%` and no `dual`; Defaults still declare none of `presets`, `voice_speed`, `voice_emotion`, `voice_tone`; no Video field refers to `description.md`. Covers VB Blueprint Declares master_resolution With One Option, VB Blueprint Text Describes A Single Square Master, VSM Master Resolution Is A Declared Video Default, VSM Master And Position Descriptions, VSM Shared Field Definitions, VSM Video Defaults Concept, VSM The Video Concept Carries The Episode Record, VPD Distinct From The Video Description Field. Verify: fails.
- [ ] 2.3 New `<t>master-resolution.test.mjs`: manifest width and height come from the cascaded value (`^(\d+)x(\d+)$`); `wide` -> `unsupported-master-resolution` before any provider call and any ledger entry (fake provider counters); no default width/height/orientation in `scene-compiler.mjs`/`scene-project.mjs`; emission without width/height fails with a named error, no 1920x1080 assumption; `isHorizontal` and `center 12%` absent; `--format`, `--width`, `--height` are a usage error that lists none of them; `FORMAT_PRESETS`, `resolveFormatSize` and the 9:16 route absent. Covers VE Single Square Master Declared By master_resolution, VE Format Flags Are Removed From The Engine CLI. Verify: fails.
- [ ] 2.4 Rewrite `<t>render-formats.test.mjs` (replace the `-c copy` expectation at `:61-66`): common args, `crop=1080:1920:420:0`, `crop=1920:1080:0:420`, `scale=1080:1080:flags=lanczos` and no `-c copy`; names and ffprobe dims equal the name (ffprobe seam; real ffmpeg cases skipped when absent); refuse a master ffprobe does not report as 1920x1920 with no output; slug read from `<slug>_1920x1920.mp4`; existing output skipped unless `--force`; default fill `crop` writes no `_blur`; `--fill blur` writes `<slug>_<W>x<H>_blur.mp4` beside the unchanged crop file, vertical and horizontal only; square ignores blur; two derivations on one machine are identical files. Covers VE Delivery Formats Are Derived From The Master By Crop, Blur Fill Is Opt-In And Suffixed, Derivation Guards Its Input And Its Outputs, REMOVED Format variants with blur fill. Verify: fails.
- [ ] 2.5 New `<t>safe-zone.test.mjs`: the six overlay components (`lower-third`, `caption`, `title`, `quote`, `watermark`, `b-roll`) declare `#root { inset: 21.875%; overflow: visible }`; computed boxes: lower-third 549.6 / 474 / 756 px on the master, 129.6 px bottom in the horizontal crop, 54 px left in the vertical crop; caption 528 / 474 / 648 px, 108 px, 54 px. Covers VE Overlay Components Respect The Central Safe Square. Verify: fails.

### Phase 2.2 GREEN

- [ ] 2.6 Edit `<bp>spec_NN.md`: add Field Definition `master_resolution` (D4 row), rewrite `master` and `position` descriptions, drop 16:9/dual wording; `blueprint_version` stays `V_0-14-0` (or `V_0-14-1` when 0.5 says so, in this same task). Verify: 2.2 spec-side cases green.
- [ ] 2.7 Edit `<bp>defaults/video-defaults_NN.md`: `master_resolution:: 1920x1920`; `parent_spec` matches the blueprint version (`V_0-14-1` only on the 0.5 branch). Verify: `node --test test/video-script-contract-additions.test.mjs`.
- [ ] 2.8 Regenerate both catalogs with `node scripts/blueprint-catalog.mjs`. Verify: `node scripts/verify.js --only=catalog`.
- [ ] 2.9 Edit `<scripts>/scene-compiler.mjs` (delete width/height defaults `:272-279,428-429,592-593`; size from `resolve('master_resolution', bags)`; named error before spend) and `<scripts>/scene-project.mjs` (`:85-89,103-105`; width/height required; delete `isHorizontal`). Verify: 2.1, 2.3 green.
- [ ] 2.10 Edit `<scripts>/video-engine-cli.mjs`: delete `FORMAT_PRESETS`, `resolveFormatSize`, `--format/--width/--height` (`:898-915,919-923,1004-1008`) and the 9:16 recompile; do not add `size` to image `mediaOptions` (`:463-469`; `asset-synthesizer.mjs:635` reads `options.size`). `--output` stays until 3.11. Verify: 2.1, 2.3 green.
- [ ] 2.11 Edit `<scripts>/render-formats.mjs` per D5 (shared args constant, crops, lanczos scale replacing `:39,135-136`, 1920x1920 refusal, slug from master, skip/`--force`, `--fill`, `_blur`); header comment states it is THE derivation (#428). Verify: 2.4 green.
- [ ] 2.12 Edit the six `<skill>components/*.html`: `#root` inset and percentages relative to it (lower-third bottom 12%, left 5%, max-width 70%; caption bottom 10%, right 5%, max-width 60%). Verify: 2.5 green.
- [ ] 2.13 Rewrite existing tests that assume 16:9 or the removed flags (find with `rg -n "1920x1080|isHorizontal|--format|1080" <t>`): `scene-compiler`, `scene-project`, `scene-project-mount`, `overlay-emission`, `video-engine-cli`, `hyperframes-render`. Verify: `node --test <t>*.test.mjs` green for these files.

### Phase 2.3 REFACTOR, release guards, gate

- [ ] 2.14 One `parseMasterResolution` shared by compiler and projector; ffmpeg common args as one constant. Verify: slice 2 tests green.
- [ ] 2.15 Release guards: `node scripts/guard-template-immutability.js` (no edit to a published `_V_x-y-z_` file; version per 0.5), `--only=metaschema`, `--only=field-catalogue`, `--only=no-legacy`; on the `V_0-14-1` branch also `rg -n "V_0-14-0|SHIPPED_TEMPLATE_VERSIONS" iNNfo scripts test` and update every pin. Covers VB Folder Contract Change Rides The Same Version Train.
- [ ] 2.16 Gate: `npm run verify:fast`; `rg` the engine scripts for `FORMAT_PRESETS|isHorizontal|center 12%` (none).

Commits: 2a `feat(video-script): declare master_resolution in the blueprint` (2.2, 2.6-2.8, 2.15); 2b `refactor(video-script): take master size from master_resolution` (2.1, 2.3, 2.9, 2.10, 2.13, 2.14); 2c `feat(video-script): derive delivery formats from the square master` (2.4, 2.11); 2d `feat(video-script): keep overlays inside the central safe square` (2.5, 2.12, 2.16).

---

## Slice 3: Build layout and workflow (D). Cache tests first.

### Phase 3.1 RED (in this order)

- [ ] 3.1 (guard, first) New `<t>build-layout-cache-identity.test.mjs`: on the C1 fixture, TTS, image and avatar identities are equal before and after compile into `B`; cache dir is `<domain root>/.cognnitive/cache/video` with `build/` present, and domain root resolves identically from the script and from `E/build/`; ledger, `pending-predictions.jsonl`, `locks/`, `video-guard.json` stay at the domain root; episode folder name is not a key input (two folders, equal keys); staged names `<base>_<sha12>` unchanged; `temp/*.mp4` never deleted; compile + avatar + render re-run on a full cache after the move makes zero provider requests and adds zero ledger entries (reuse the C1 2.1a counters). Covers VE Layout-Independent, Location And Domain Root Unchanged, Avatar Audio (temp kept), FC Deleting Build Is Safe. Verify: guard; must stay green at every later task.
- [ ] 3.2 Avatar audio from the TTS cache (add to 3.1 file): avatar key from an `audio/` copy equals the key from the cache entry; `ttsCachePathFor(sc, {cacheManager, config, models, bags})` equals the `assertAudioFresh` lookup (this also proves `_withResolvedVoice` and `resolveRegisteredVoice` give equal options, the one inference the design left unrun); explicit `audio_asset_source`/`voiceover` branch kept for non-narrated scenes; cache miss message contains "run compile first"; compile creates no `audio/<sceneId>_voiceover.mp3`. Covers VE Avatar Synthesis Reads The TTS Cache Directly, Cache Identity Avatar Audio. Verify: fails.
- [ ] 3.3 New `<t>keyless-placeholder.test.mjs`: keyless TTS stored as `<key>-offline`, nothing under the real key; a later keyed run misses and calls the provider once; keyless image placeholder SVG (1920x1920) under `<key>-offline`, not under the real image key and not part of any key; pre-existing real entries still hit. Covers VE Cache Identity Keyless Placeholders Are Stored Offline. Verify: fails.
- [ ] 3.4 Compile layout tests in `<t>video-engine-cli.test.mjs`, `<t>media-staging.test.mjs`, `<t>hyperframes-render.test.mjs`: `B/manifest.json` always written; `--output`/`--out` is a usage error; staging only in `B/hyperframes/assets`, named `<base>_<sha12>`; `E/public`, `E/hyperframes`, `E/audio` (engine-written) and root `manifest.json` absent; `B/.nn-build` created; project emitted at `B/hyperframes`; renderer does no copy when `publicDir === assetsDir`; `projectDir` required; authored `animations/` or `Hyperframes/` never collides; `asset_plan.approved.json` stays at `E`; deleting `build/` then `produce` leaves approval and deliverables untouched; manifest absolute paths stay absolute. Covers VE Engine Output Is Written Only Under build/, FC Engine Output Lives Only Under build/, FC Fully produced episode. Verify: fails.
- [ ] 3.5 Render tests: `render <script>` only (manifest argument -> usage error); recompiles every run (stale manifest regenerated); renders to `B/render.tmp.mp4` then same-volume rename to `E/<slug>_1920x1920.mp4`, final path absent or previous complete master during render; `render.tmp.mp4` gone after; rename failure on an open target yields a message explaining the open file; missing avatar clip refuses before rendering and names the synthesis command unless `--allow-still-avatars`. Covers VE Render Compiles Every Time And Writes The Master In Place, Render Refuses Missing Avatar Clips, Headless Video Rendering CLI, FC Deliverables Are Written In Place. Verify: fails.
- [ ] 3.6 New `<t>produce.test.mjs`: compile, avatar synthesis, render in order with one identical `--*-model` flags object; avatar exit 3 -> `produce` exits 3 printing the resume command, render not run; full-cache re-run adds zero requests and zero ledger entries; `compile`, `synthesize-avatar`, `render` still callable; usage lists `compile`, `render`, `produce`, not `preview`; `render-vertical.mjs` and `assemble-video.mjs` absent. Covers VE Produce Command, VSS Render Step Uses The HyperFrames Pipeline. Verify: fails.
- [ ] 3.7 Estimator and plan tests (`<t>plan-approval.test.mjs`, new `<t>asset-cost-estimator.test.mjs`): cached items $0 and `total_usd` is uncached sum; image quoted only with a prompt; cache emptied after an all-cached estimate makes compile refuse; plan shows `approve the plan <hash8>`, no `approve-plan.mjs <this file>` line, stamped model ids, no `- [ ]` list, no "Recommended", no "Speech 2.5 HD"; `checkApproval` hint has the same phrase; `ok, go ahead with 1a2b3c4d` accepted. Covers VE Estimate Reflects What The Run Will Charge, Plan Boilerplate Is Truthful, VSS Approval Uses One In-Chat Phrase. Verify: fails.

### Phase 3.2 GREEN

- [ ] 3.8 Edit `<scripts>/lib/avatar-jobs.mjs` (extract `ttsCachePathFor` from `assertAudioFresh` `:95-107`) and `<scripts>/synthesize-avatar.mjs` (`audioFor` source `:142`; keep the explicit branch; "run compile first"). Fallback avatar key `asset-synthesizer.mjs:481` untouched. Verify: 3.2 green, 3.1 still green.
- [ ] 3.9 Edit `<scripts>/asset-synthesizer.mjs`: `-offline` keys for keyless TTS (`:417-418`) and images (`:584-586`, mirroring `:493`); offline SVG 1920x1920. Verify: 3.3 green.
- [ ] 3.10 Edit `<scripts>/asset-cost-estimator.mjs` (`:473,:509-514,:150,:407-409`, image predicate = compile's `:461-462`, cached = $0) and `<scripts>/lib/plan-approval.mjs:119` hint. Verify: 3.7 green.
- [ ] 3.11 Edit `<scripts>/video-engine-cli.mjs` compile path: `publicDir` -> `B/hyperframes/assets` (`:670`), remove audio handoff (`:703-711`), manifest always `B/manifest.json` (`:726-729`), remove `--output/--out`, `projectDir` from `manifest.metadata.buildDir` (`:782`), create `B/.nn-build`; `:509` approval and domain-root logic untouched. Verify: 3.1, 3.4 green.
- [ ] 3.12 Edit `<scripts>/hyperframes-render.mjs` (skip copy when `publicDir === assetsDir` `:53-57`, `projectDir` required `:125`) and `<scripts>/scene-project.mjs` emit location. Verify: 3.4 green.
- [ ] 3.13 Edit `video-engine-cli.mjs` render: script-only, always compile, `render.tmp.mp4` then rename, open-file message, still-avatar refusal with `--allow-still-avatars` (gated by 0.7). Verify: 3.5 green.
- [ ] 3.14 Add `produce <script>` to `video-engine-cli.mjs` (compile, `synthesizeAvatars` only for uncached jobs with the same flags object, render; exit 3 propagation) (gated by 0.7). Verify: 3.6 green, 3.1 green.
- [ ] 3.15 Rewrite existing tests touched by the move: `video-engine-cli`, `hyperframes-render`, `asset-synthesizer`, `media-staging`, `synthesizer-guard`, `plan-approval`, `scene-project*`. Verify: `node --test <t>*.test.mjs`.

### Phase 3.3 REFACTOR and gate

- [ ] 3.16 One `buildDir(E)` helper used by engine, renderer and (S4) finalize; remove dead `public/` and `audio/` references. Verify: slice 3 tests green.
- [ ] 3.17 Gate: `node scripts/verify.js --only=build-layout-cache-identity`, `--only=preset-cache-preservation`, `--only=produce`, `--only=keyless`; `rg "E/public|renders/|voiceover.mp3" <scripts>` (none outside `_legacy` handling); `npm run verify:fast`. Real HyperFrames and ffmpeg renders are behind seams; record "not run for real" in apply-progress.

Commits: 3a `refactor(video-script): write engine output only under build` (3.1, 3.4, 3.11, 3.12); 3b `refactor(video-script): feed avatar synthesis from the tts cache` (3.2, 3.8); 3c `feat(video-script): add produce and write the master in place` (3.5, 3.6, 3.13, 3.14); 3d `fix(video-script): store keyless placeholders offline and price cached items at zero` (3.3, 3.7, 3.9, 3.10). Then 3.15-3.17 in 3d or a closing `test` commit.

---

## Slice 4: description.md (C) and finalize

### Phase 4.1 RED

- [ ] 4.1 (guard, first) In `<t>finalize-video.test.mjs`: finalize leaves `.cognnitive/cache/**` byte-identical (including `temp/*.mp4`) and creates nothing at the domain root. Covers VE Cache Identity Avatar Audio (temp kept). Verify: guard.
- [ ] 4.2 New `<t>description.test.mjs`: `floor(fromFrame/fps)` (786 at 30 = `00:26`), first line `00:00`, `MM:SS Title`, `H:MM:SS` on every line at 3700 s, starts equal the manifest for any input, titles from `props.title`; bytes outside the markers identical after two runs; refresh changes only the block; skeleton (H1, Video `description` as summary, Chapters block, Sources, Attribution); insertion after the H1 plus report of `^\d{1,2}:\d{2}` lines (not deleted); warnings for fewer than 3 chapters and any chapter under 10 s without failing; block holds only `MM:SS Title` lines; stale manifest leaves the file unchanged; name is `description.md`, no `descripcion_youtube.md`/`youtube*.md`. Covers VPD (all 7 requirements), VSS Finalize Refreshes The Chapter Block. Verify: fails.
- [ ] 4.3 Rewrite `<t>finalize-video.test.mjs`: usage `<episode-dir> [--formats] [--fill] [--force] [--dry-run]`; `--ref` and `renders/` gone; reads `E/<slug>_1920x1920.mp4` and `B/manifest.json`; derives the three formats beside the master; prints `master:: <slug>_1920x1920.mp4` and `thumbnail:: <slug>_thumbnail_2560x1440.png`; Video document byte-unchanged; stale manifest (script newer) and foreign `scriptSource` rejected naming `render`/`produce`, nothing written; `--dry-run` lists and creates nothing; no `master_vertical` or voiceover promotion. Covers VSS Finalize Derives Formats In Place, FC Deliverables Are Written In Place, FC REMOVED Finalize/Register Step Promotes Rendered Output. Verify: fails.
- [ ] 4.4 Thumbnail tests (`<t>render-thumbnail.test.mjs`): default output 2560x1440; `--width 1080 --height 1920` gives 1080x1920; size unchanged under `master_resolution:: 1920x1920`; no `sharp` (existing). Covers TPT Thumbnails Are Separate Stills Named By Dimensions. Verify: fails or characterization green; record which.

### Phase 4.2 GREEN

- [ ] 4.5 New `<scripts>/lib/description.mjs`: marker constants, chapter formatting, skeleton, H1 insertion, handwritten-timestamp report, warnings, stale check helper. Verify: 4.2 green.
- [ ] 4.6 Rewrite `<scripts>/finalize-video.mjs` (`:85` and callers): reads master and manifest via `buildDir`, validates manifest, derives formats through `render-formats.mjs` (imported, not spawned), calls `description.mjs`, prints the two field lines, never writes the model. Verify: 4.1, 4.3 green.
- [ ] 4.7 `<scripts>/render-thumbnail.mjs`: edit only if 4.4 is red (usage text names `<slug>_thumbnail_<W>x<H>.png`; the tool's `--out` stays required, naming is on the delivered file). When the thumbnail file is missing finalize warns and does not print its line (behaviour not fixed by the design; record the choice). Verify: 4.4 green.

### Phase 4.3 REFACTOR and gate

- [ ] 4.8 Share the manifest loader and stale check between finalize and `produce`; dedupe time formatting. Verify: slice 4 tests green.
- [ ] 4.9 Gate: `--only=description`, `--only=finalize-video`, `--only=build-layout-cache-identity`; `npm run verify:fast`.

Commits: 4a `feat(video-script): generate chapter block from measured durations` (4.2, 4.5); 4b `refactor(video-script): finalize derives formats in place` (4.1, 4.3, 4.4, 4.6-4.9).

---

## Slice 5: Contract, docs, authoring names (A)

### Phase 5.1 RED

- [ ] 5.1 Discovery before authoring: how `scripts/verify.js` and the blueprint inventory/catalog guards treat a new `<bp>procedures/` folder (`rg -n "procedures|inventory|catalog" scripts/verify.js scripts/blueprint-catalog.mjs`, plus `manifest/source.yaml` and the Template Inventory Guard). Also list every scanner of workspace folders (nn-trannsform, manifest reconciliation) and confirm none picks up `build/` or `draft_thumbs/` (no code in the repo implements the exclusion today; design assumes none is needed). Verify: written note; if a scanner would pick them up, STOP and report (outside this design). Covers VSS Blueprint Ships Produce And Draft Procedures, FC Ephemeral Engine Directories Are Not Artifacts, WDC Gitignored Ephemeral Engine Directories.
- [ ] 5.2 New `test/folder-contract-crosscheck.test.mjs`: the canonical path list is one constant, asserted present in `<skill>references/folder-contract.md`, `<skill>SKILL.md` and the FC spec (read `<fc>specs/video-folder-contract/spec.md` if it exists, else `openspec/specs/video-folder-contract/spec.md`, so the test survives archive); retired strings absent (`videos/{`, `renders/<ref>`, `.cognnitive-video`, `master_vertical`, a rule that paths stay inside `series/<slug>/`); SKILL.md lists the 13 workflow steps in order with `produce` replacing compile/avatar/render, no `--format 9:16`, no second compile; approval wording `approve the plan <hash8>` everywhere and no `apruebo el plan`; domain setup names `**/build/`, `**/draft_thumbs/`, `.cognnitive/cache/`; `audio/` not ignored; the three entry classes (authored, tool-written, generated) cover every episode entry exactly once; thumbnail names in `thumbnail-and-asset-pipeline.md` and no `thumbnail_[topic].jpeg`; `git check-ignore` (temp repo under the OS temp dir) ignores `build/manifest.json`, `draft_thumbs/a.png`, not `audio/00_hook.wav`. Covers FC One Contract Across Spec Reference And Skill, Canonical Layout, Naming Scheme, Authored And Engine-Generated Files Are Distinct, Managed Gitignore Block, VSS Workflow, Approval Uses One In-Chat Phrase, Domain Setup Documents The Gitignore Block, VAP REQ-3, WDC Series and Video Folder Layout. Verify: fails.
- [ ] 5.3 Tool-name tests: `build-draft-html.mjs draft.json` writes `review_console.html` and no `*_draft_*.html`; console exports `reviewed.json`; `build-script-from-draft.mjs reviewed.json` works with no `draft.json` (`--draft` optional) and writes `<slug>_video-script_<s>_NN.md`; check whether `draft-template.html` embeds its own filename (design left it unverified). Covers VSS Workflow Is Estimate, Approve, Produce, Thumbnails, Finalize (script builds from reviewed alone), Blueprint-Ships Draft Authoring Tools (fixed default names and no alias), FC Naming Scheme. Verify: fails.
- [ ] 5.4 Procedure shape test (in 5.2 file or `test/video-script-procedures.test.mjs`): `<bp>procedures/produce-video_procedures_NN.md` and `draft-scene-visuals_procedures_NN.md` exist, are English, contain `{{slot:series_profile}}` and `{{slot:avatar_recipe}}`, contain no Spanish approval phrase and no #429 pre-draft gate, and pass the guards found in 5.1 (model the frontmatter on `iNNfo/packages/nn-core/tests/fixtures/video-golden/procedures/`). Covers VSS Blueprint Ships Produce And Draft Procedures. Verify: fails. Gated by 0.7.

### Phase 5.2 GREEN

- [ ] 5.6 Edit `<scripts>/build-draft-html.mjs` and `<scripts>/build-script-from-draft.mjs` (defaults `draft.json`, `reviewed.json`, `review_console.html`; `--draft` optional; remove the `_draft_<version>.html` alias), and `<scripts>/draft-template.html` only if 5.3 found an embedded filename. Verify: 5.3 green.
- [ ] 5.7 Create the two English procedures in `<bp>procedures/` encoding the D8 table (estimate, in-chat approval, produce, thumbnails, finalize, description prose after finalize) with the two slots; no edit to a Spanish real-domain procedure. Verify: 5.4 green.
- [ ] 5.8 Edit `<skill>SKILL.md`: 13-step workflow, `produce`, single approval phrase, domain setup gitignore block, scope-anchored series, finalize usage, tooling table without removed flags; skill `version:` bumped exactly once for the whole train (inspect the value at the stack tip first; if C1 already bumped it in the unreleased train do not bump again; record). Verify: 5.2 SKILL cases green.
- [ ] 5.9 Edit `<skill>references/folder-contract.md` (the one tree), `thumbnail-and-asset-pipeline.md` (names by dimensions, Open Gate crop), `overlay-slots.md` (safe square inset), `cost-guardrails.md` (cached $0, phrase); delete duplicated layout prose in SKILL.md (it restates, nothing more). Verify: 5.2 green.
- [ ] 5.10 Regenerate catalogs (`node scripts/blueprint-catalog.mjs`) if the catalog enumerates `procedures/`; run the inventory/catalog guards and `node scripts/guard-template-immutability.js`. Verify: `node scripts/verify.js --only=catalog`, `--only=metaschema`, `--only=field-catalogue`.
- [ ] 5.11 Un-gate `test/no-retired-layout-vocabulary.test.mjs` (1.7) and fix every hit outside archive and migration fixtures (C1 4.7 must already be merged). Covers VSS Retired Layout Vocabulary Is Absent. Verify: `node --test test/no-retired-layout-vocabulary.test.mjs`.
- [ ] 5.12 VT check: `rg -n "generate_video_script_NN|generate-video-script"` finds no procedure file in the worktree (only specs, a naming test and the openspec living spec), so the VT delta is spec-only; confirm the shipped `produce-video` procedure orders one 1920x1920 render before derivation and the chapter block after render. Verify: note in apply-progress. Covers VT Video Generation Procedure Migration.

### Phase 5.3 REFACTOR and gate

- [ ] 5.13 Remove stale cross-links (for example the C1 `series-template-convention` replacement, `migrate-video-presets` name until 6.13). Verify: 5.2 green.
- [ ] 5.14 Gate: `--only=folder-contract-crosscheck`, `--only=no-retired-layout`, `--only=build-draft-html`, `--only=build-script-from-draft`; `npm run verify:fast`.

Commits: 5a `refactor(video-script): fix default names of review files` (5.3, 5.6); 5b `feat(video-script): ship produce and draft procedures` (5.1, 5.4, 5.7, 5.10); 5c `docs(video-script): reconcile folder contract, skill and reference` (5.2, 5.8, 5.9, 5.11-5.14).

---

## Slice 6: `layout` migration (F). Last: it encodes the final names.

### Phase 6.1 RED (cache first)

- [ ] 6.1 Extend the C1 1.6a real-domain fixture (extend, never fork or regenerate the golden) with layout cases: episode with `public/`, `hyperframes/.nn-emit.json`, root `manifest.json`, `audio/00_hook_voiceover.mp3` + authored `audio/00_gancho.wav`, `renders/`; `master.mp4` (ffprobe stub 1920x1920) and a wrong-size one; `master_<WxH>.mp4`; `<slug>_<WxH>.mp4`; `descripcion_youtube.md`; `<slug>_draft_V_0-1-0.json` + `V_0-2-0`, `<slug>_reviewed.json`, `<slug>_review_console.html`, legacy `<slug>_draft_*.html`; generated `thumbnail.png` 2560x1440 and `thumbnail_vertical.png` 1080x1920; authored `Hyperframes/`; `.bak-outro1/`, `_tmp_notes.md`, `x-proto/`, `_tts-ab-test/`; series with only `series_NN.md`, one with `series_NN.md` beside a scope document, one with `series_rules.md`/`script_template.md`/`video.series.json`; `shared/audio/whoosh.mp3` only; domain `.gitignore` with obsolete lines; domain `components/lower-third.html` without inset; `*_video_NN.md`, `templates_*`, a Spanish procedure; `.cognnitive/` with cache entries and `temp/*.mp4`. Verify: fixture builds; tests below fail.
- [ ] 6.2 (guard, `todo`-gated until 6.12) New `<dev>migrate-video-domain.cache.test.mjs`: after `--steps presets,layout --apply` on a temp copy, TTS, image and avatar identities (avatar audio from the cache) equal the C1 1.6d golden except C1's precedence-fix scenes; a planted unexpected difference fails the test; `.cognnitive/**` byte-identical except the new journal; `temp/*.mp4` kept; then `produce` on the full cache after re-approval makes zero provider requests and adds zero ledger entries; the converted `series_NN.md`-only series keeps its keys (same values, same keys); script text changes force a new plan hash and the estimate prices everything at $0. Covers VSS Layout Migration Preserves Cache Identity, VE Cache Identity Re-Run After Layout Migration Spends Nothing.
- [ ] 6.3 Pipeline tests in `<dev>migrate-video-domain.test.mjs` (renamed from C1's test, 6.8): `migrate-video-domain.mjs` exists, `migrate-video-presets.mjs` does not; default `--steps presets,layout`; `--steps layout,presets` still runs `presets` first; `--steps layout` plans only layout ops; `--steps nope` exits 2 naming known steps; one scan, one report (also `--json`, one parseable document); dry run writes nothing; exit 0/1/2 aligned with C1 1.11; journal `<root>/.cognnitive/migrations/<iso>.json` with inverse operations exists before the first write; injected failure on the third operation restores the tree; second run reports zero changes; protected paths untouched (`.cognnitive/**` except journal, `domaiNN_NN.md`, `video-guard.json`, `media/`, `shared/`, domain `assets/`, Scene and Layer headings); no episode folder is moved. Covers VSS Layout Migration Step Group, Applies Atomically And Idempotently, Video Presets Migration Script, FC Canonical Layout (episodes stay). Verify: fails.
- [ ] 6.4 L1 to L5 tests (S11): engine output parked under `build/_legacy/` with `build/.nn-build`; `hyperframes/` moved only with `.nn-emit.json`; authored audio stays, only `<sceneId>_voiceover.mp3` moves; `master.mp4` renamed when 1920x1920 and target absent, else parked with "re-render, zero provider spend"; `master_<WxH>.mp4` parked; `<slug>_<WxH>.mp4` kept; `descripcion_youtube.md` -> `description.md`; newest draft version -> `draft.json` (older listed), reviewed and console renamed, legacy html parked; thumbnails named by IHDR/SOF dimensions, `thumbnail:: thumbnail.png` rewritten and `thumbnail:: other.png` not; `master::` exact-match rewrite. Covers VSS Layout Migration Moves Engine Output And Deliverables. Verify: fails.
- [ ] 6.5 L6 to L8 tests (S12): Video `resolution::`/`format::` removed, `fps::` reported and kept; authored `Hyperframes/` reported; `series_NN.md` only -> `<s>_scope_NN.md` + `scope: true`, same values and keys; beside a scope document = conflict exit 1 no writes; `series_rules.md`/`script_template.md` without scope document = conflict; with a scope document they and `video.series.json` are listed, never deleted; `*_video_NN.md` listed not read; the `presets` fallback target `series_NN.md` (C1) followed by the `layout` rename works in one virtual plan. Covers VSS Layout Migration Rewrites Scripts And Series Markers, VPH Series Is A Folder Anchored By Its Scope Document (old record). Verify: fails.
- [ ] 6.6 L9 and L10 tests (S13): `shared/audio/whoosh.mp3` only -> copy to `series/s/sounds/whoosh.mp3`, original remains; managed block `**/build/`, `**/draft_thumbs/`, `.cognnitive/cache/` added once over two `--apply` runs; obsolete lines `.cognnitive-video/`, `.anydeo/`, `.remotion/`, `renders/` reported and kept; the block text equals the constant tested in 5.2. Covers VSS Layout Migration Copies Sounds And Updates The Gitignore, FC Managed Gitignore Block. Verify: fails.
- [ ] 6.7 L11, conflicts, invalidation tests (S14, S15, S17): listed and never deleted: `.bak*`, `_tmp_*`, `*-proto`, `_tts-ab-test`, `*_video_NN.md`, `templates_*`, Spanish procedures (name unchanged), components without the inset (not edited); conflicts exit 1 with nothing written: both description files, rename target with different content, `build/` without `.nn-build`, no `domaiNN_NN.md`, series-marker conflicts; report lists every changed script (L5, L6, presets) for re-estimate and re-approval at zero spend and every episode for `produce` or `render`. Covers VSS Layout Migration Lists Leftovers And Never Deletes, Conflicts Write Nothing, Reports Invalidation, FC Naming Scheme (Spanish names reported). Verify: fails.

### Phase 6.2 GREEN

- [ ] 6.8 `git mv` `<dev>migrate-video-presets.mjs` -> `<dev>migrate-video-domain.mjs` and its test (no alias); extend C1's step registry in `<dev>lib/video-presets-migration.mjs` so steps run in canonical order from one scan; add `<dev>lib/video-layout-migration.mjs` with the virtual file plan (`rename`, `write`, `mkdir`, `copy`), journal, temp-write + same-volume rename apply, rollback, idempotence, exit codes. The `presets` contract is unchanged. Verify: 6.3 green.
- [ ] 6.9 Implement L1 to L5 in `video-layout-migration.mjs` (ffprobe behind a seam; PNG IHDR and JPEG SOF reader in pure JS). Verify: 6.4 green.
- [ ] 6.10 Implement L6 to L8. Verify: 6.5 green.
- [ ] 6.11 Implement L9 and L10 (managed block constant imported by the 5.2 test). Verify: 6.6 green.
- [ ] 6.12 Implement L11, conflict detection, invalidation report; remove the `todo` gate of 6.2. Verify: 6.2, 6.7 green.
- [ ] 6.13 Replace the old name everywhere outside archive (`rg -n "migrate-video-presets"`: SKILL.md, references, `package.json` scripts, docs, C1 test and fixture paths); document in SKILL.md the one-time procedure: back up the domain, dry run, `--apply`, re-estimate and re-approve (zero spend), `produce`. Verify: `rg` empty; C1 migration cases green under the new name.

### Phase 6.3 REFACTOR, verification, gate

- [ ] 6.14 Refactor: one operation-kind table shared by plan, journal and report. Verify: slice 6 tests green.
- [ ] 6.15 Gate: `--only=migrate-video-domain`, `--only=preset-cache-preservation`, `--only=build-layout-cache-identity`; `npm run verify:fast`; full `node scripts/verify.js` is the maintainer's batch gate.
- [ ] 6.16 Real-domain dry run (verification only; the apply is the maintainer's): `node <dev>migrate-video-domain.mjs D:\Users\lucas\Documents\_NN\video_NN --steps presets,layout --json`, NO `--apply`, output redirected outside the domain. Before and after, capture a read-only listing hash of the domain (`fd -t f . <domain>` plus sizes and mtimes) and require equality. Compare the report with the exploration section "Impact on the real domain": zero conflicts or each conflict explained, every L1 to L11 class appears, Spanish names reported. Needs maintainer permission to read outside the worktree; if denied the maintainer runs it. Covers VSS Layout Migration Step Group (dry run).

Commits: 6a `refactor(video-script): rename migration script and add layout pipeline` (6.1, 6.3, 6.8, 6.13); 6b `feat(video-script): migrate engine output and deliverables to the folder contract` (6.4, 6.9); 6c `feat(video-script): migrate series markers, sounds and gitignore` (6.5, 6.6, 6.10, 6.11); 6d `feat(video-script): report leftovers and guard cache identity in layout migration` (6.2, 6.7, 6.12, 6.14-6.16).

---

## Slice 7: Release checklist and archive-time edits (verification, no new product code)

- [ ] 7.1 Release checklist (same `V_0-14-0` train; no partial release): (a) blueprint version `V_0-14-0` unless 0.5 says `V_0-14-1` (then `spec_NN.md`, defaults `parent_spec`, both `catalog.json`, `SHIPPED_TEMPLATE_VERSIONS`/pinned strings, all in the slice-2 commit, and a note that every later slice stays on `V_0-14-1`); (b) catalogs regenerated after 2.8 and 5.10; (c) `bluepriNNt-field-catalogue` and `metaschema-selfdescribe` green; (d) `guard-template-immutability` green; (e) `procedures/` accepted by inventory/catalog guards and `manifest/source.yaml` where required; (f) skill `version:` bumped once for the train; (g) `npm run check:spec-urls` passes (no bare slug in `openspec/specs`); (h) each new test file is discovered (`node scripts/verify.js --only=<stem>` lists it); (i) hold the `dev` -> `main` batch until both chains complete (a mid-train merge forces `V_0-14-1` on every later slice). Covers VB Folder Contract Change Rides The Same Version Train.
- [ ] 7.2 Archive precondition: C1 archived first (its 4.10 done). Re-run the composition check of 0.2 against the LIVE `openspec/specs/` (not the C1 deltas): every full-copy MODIFIED block in VSM, VSS and VSF replaces the C1 text with only its "(Previously: ...)" differences.
- [ ] 7.3 By-hand edits at archive time (deltas cannot make them), in `openspec/specs/`: remove or rewrite the stale `Design Decision` section of `video-production-hierarchy` so it says a Series is a folder anchored by its scope document; `Purpose` of `video-series-folders` to say "scope document" instead of `series_NN.md`; `Purpose` of `video-folder-contract` to describe the single `build/` layout, in-place deliverables and scope-anchored series; `Purpose` of `video-blueprint` free of the 16:9 and dual-master wording (C1 4.10 also touches this Purpose: build on its text). Exact wording is not fixed by the design: write it from the delta "Scope" lines.
- [ ] 7.4 Archive hygiene: do not edit `openspec/changes/archive/**`; after archiving `diff` and `wc -l` every copied artifact (an archiver once truncated design/tasks/apply-progress); `video-publication-description/spec.md` becomes a new living spec; run `npm run check:openspec` and `npm run check:spec-urls`.
- [ ] 7.5 Record in apply-progress: C1 D3 legacy-source follow-up delivered (1.8), C1 4.12 hand-off confirmed, and that #426/#427/#429 are unblocked by this change.

---

## Maintainer tasks (gh and domain actions are NOT performed by the apply agent)

- [ ] M.1 Close #428 as superseded with links to the S2 PR: `render-formats` is THE derivation from the single master (D5).
- [ ] M.2 Close #425 with a link to the S1 PR (`sounds/` is the only lookup, D9); rewrite the body first if it still names `shared/audio`.
- [ ] M.3 File a separate issue, out of scope here: audit the real cache for keyless placeholders stored under real keys (silence detection), per design D10 and its open question.
- [ ] M.4 Comment on #429 (pre-draft gate) that the contract and the shipped `draft-scene-visuals` procedure now exist; #426/#427 stay sequenced after both changes.
- [ ] M.5 After both chains are merged: back up `video_NN`, run `--steps presets,layout` dry run, then `--apply`, re-estimate and re-approve each episode, run `produce` and confirm the ledger gains no entry.

---

## Requirement traceability (every delta requirement has at least one task)

| Spec | Requirement (short) | Tasks |
|---|---|---|
| FC | Canonical Layout | 5.2, 5.9, 6.3 |
| FC | Naming Scheme By File Class | 5.2, 5.3, 6.7 |
| FC | Deliverables Are Written In Place | 3.5, 3.13, 4.3, 4.6 |
| FC | Engine Output Lives Only Under build/ | 3.1, 3.4, 3.11, 3.12 |
| FC | Managed Gitignore Block | 5.2, 6.6, 6.11 |
| FC | Series Root Anchored On Scope Documents | 1.2, 1.8, 1.9, 1.11 |
| FC | Legacy Series Markers Not Recognised | 1.3, 1.7, 1.8, 1.12 |
| FC | Authored And Engine-Generated Distinct | 5.2, 5.9 |
| FC | One Contract Across Spec, Reference, Skill | 5.2 |
| FC | MOD Three-Level Asset Scoping | 1.2, 5.2 |
| FC | MOD Ephemeral Engine Directories | 5.1, 5.2, 5.9 |
| FC | REMOVED Finalize/Register Promotes | 4.3, 4.6, 7.2 |
| VE | Single Square Master | 2.3, 2.9 |
| VE | Format Flags Removed | 2.3, 2.10 |
| VE | Derived By Crop; Blur Opt-In; Derivation Guards | 2.4, 2.11 |
| VE | Overlay Components Safe Square | 2.5, 2.12 |
| VE | Engine Output Only Under build/ | 3.4, 3.11, 3.12 |
| VE | Render Compiles Every Time; Refuses Missing Clips | 3.5, 3.13 |
| VE | Produce Command | 3.6, 3.14 |
| VE | Avatar Reads TTS Cache | 3.2, 3.8 |
| VE | Named Sounds Only In sounds/ | 1.4, 1.9 |
| VE | Estimate Reflects Charge; Plan Boilerplate | 3.7, 3.10 |
| VE | Cache Identity (layout-independent, image size, avatar audio, location) | 1.1, 2.1, 3.1, 3.2, 6.2 |
| VE | Cache Identity Keyless Placeholders | 3.3, 3.9 |
| VE | Cache Identity Re-Run After Migration | 6.2 |
| VE | MOD Headless Video Rendering CLI | 3.5, 3.13 |
| VE | REMOVED Format variants with blur fill | 2.4, 2.11, 7.2 |
| VSS | Workflow; Approval Phrase | 3.7, 5.2, 5.3, 5.8 |
| VSS | Finalize Derives In Place; Chapter Block | 4.2, 4.3, 4.6 |
| VSS | Procedures; Domain Setup Gitignore | 5.1, 5.4, 5.7, 5.8 |
| VSS | Scope-Anchored Root; Dev Tooling | 1.5, 1.6, 1.10-1.12 |
| VSS | Retired Layout Vocabulary | 1.7, 5.11 |
| VSS | Layout Migration (step group, outputs, markers, sounds, leftovers, conflicts, atomic, invalidation, cache) | 6.2-6.12 |
| VSS | MOD Migration Script; Draft Authoring Tools; Render Step | 6.3, 6.8; 5.3, 5.6; 3.6, 3.14 |
| VPD | all 7 requirements | 4.2, 4.5, 4.6 (D6 also 2.2) |
| VAP | REQ-3 | 5.2, 5.9 |
| TPT | Separate Stills; REQ-2 | 4.4, 4.7; 1.5, 1.10 |
| VPH | Series Anchored; REMOVED reused video-template | 1.2, 6.5; 7.3 |
| VT | Video Generation Procedure Migration | 5.7, 5.12 |
| VB | master_resolution; Text; Same Version Train | 2.2, 2.6, 2.7; 0.5, 2.8, 2.15, 7.1 |
| VSM | Master Resolution; Descriptions; Series Concept; Episode Record; Shared Fields; Video Defaults | 2.2, 2.6, 2.7; 1.2, 1.3, 1.8 |
| VSF | MOD Series, Domain And Episode Extension Folders | 1.3, 1.4, 1.8, 1.9, 7.3 |
| WDC | Series and Video Folder Layout; Gitignored Ephemeral Dirs | 5.1, 5.2, 6.3, 6.6 |

## Not grounded in the design (decide at apply, record in apply-progress)

- Which test reads the FC spec for the cross-check once the change is archived (5.2 uses a fallback path); location of the single gitignore block constant (6.6 and 5.2 compare equal text).
- The "folder-contract check" named by the FC scenario "Series shared asset is found" (1.2); no code that excludes `build/`/`draft_thumbs/` from artifact discovery (5.1 is a discovery task).
- Finalize behaviour when the thumbnail is missing (4.7); whether `render-thumbnail.mjs` derives the `<slug>_thumbnail_<W>x<H>` name (spec says no).
- Exact wording of the archive-time `Purpose` edits (7.3); whether `generate_video_script_NN.md` exists anywhere (5.12: not in this worktree).
- Skill `version:` coordination with C1 (5.8) and the exit-code alignment with C1 1.11 (6.3) depend on C1's final state.
- Poisoned-cache audit: out of scope, M.3.

## Review Workload Forecast

| Slice | Est. changed lines (add + delete, tests and fixtures included) | 400-line budget risk | Chained PRs recommended |
|---|---|---|---|
| 0 Pre-flight | 0-60 | Low | No |
| 1 Series anchoring + #425 | 500-900 | High | Yes |
| 2 Single master + safe zones | 900-1500 | High | Yes |
| 3 Build layout + workflow | 1700-2800 | High | Yes (split 3a-3d) |
| 4 description.md + finalize | 550-850 | High | Yes |
| 5 Contract, docs, names | 700-1300 | High | Yes |
| 6 `layout` migration | 1400-2300 | High | Yes (split 6a-6d) |
| 7 Release/archive | 0-80 | Low | No |
| **Total** | **5750-9800** | **High** | **Yes** |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Suggested split: one PR per slice, with slices 3 and 6 each cut into the four commit-level PRs listed (3a-3d, 6a-6d), because a single review of either exceeds 1500 lines. Design recommends `feature-branch-chain` on CHANGE-1's tracker: CHANGE-1 S1 to S4 first, then this change S1 to S6, PR 1 base = tracker, each later PR base = the previous PR branch. Delivery strategy: ask-on-risk (not supplied; default assumed).

Release-train note: same unreleased `V_0-14-0` train as CHANGE-1, no partial release and no mid-train merge to `main` (a merged `V_0-14-0` forces `V_0-14-1` on every later slice); chain strategy is pending the maintainer's choice.
