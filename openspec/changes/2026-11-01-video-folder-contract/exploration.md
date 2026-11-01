# Exploration: video-folder-contract

Companion of `openspec/changes/2026-11-01-video-presets/` (referred to as CHANGE-1). This change reshapes the folder layout, file/folder naming and workflow of the `video-script` bluepriNNt. It is ABSOLUTELY coordinated with CHANGE-1 (see Coordination contract). Evidence comes from three read-only reviews on 2026-11-01: backlog/issues overlap, the maintainer's real domain `D:\Users\lucas\Documents\_NN\video_NN` (latest episode `series/cognitive-use-cases/assets/startup-founder`), and the cache/staging/master-format verification.

Roots: blueprint `iNNfo/specs/bluepriNNts/video-script/`; skill `SK = <blueprint>/skills/nn-video-script/`.

## Maintainer decisions (authoritative)

1. Two changes, absolutely coordinated (this one stacks after CHANGE-1).
2. The caching mechanism MUST be preserved: re-running generation from a script must never repeat provider requests or processing that the cache already satisfies. Some file copies exist for that purpose.
3. The YouTube description file becomes platform-neutral (it serves several platforms). Working name `description.md` (English artifact name; the Video record's `description` field stays the short 1-2 sentence summary). Chapter timestamps must come from measured durations.
4. The ONLY valid master is 1920x1920 (square, Open Gate). Every other aspect is derived from it; the 9:16 recompile route and any native dual-master route are retired.
5. `presets` syntax and all renames are fixed by CHANGE-1; this change consumes them and defines no field names of its own beyond those it explicitly lists.
6. No backwards-compatibility aliases (maintainer preference); hard rename plus migration.

## Coordination contract with CHANGE-1

- One migration script, ordered steps: `scripts/dev/migrate-video-presets.mjs` is built by CHANGE-1 with CLI `--steps presets[,layout]`; this change adds step group `layout` and may rename the script to `migrate-video-domain.mjs` in the same stroke. One dry-run report, one atomic `--apply`, idempotent.
- One release train: CHANGE-1 bumps the blueprint to `V_0-14-0`; this change bumps within the same unreleased train. Neither merges to `main` alone (the version guard compares against main's merge-base; once main carries `V_0-14-0` every later slice needs a further bump). Chain strategy: `feature-branch-chain` or hold the dev-to-main batch.
- This change is stacked after CHANGE-1 and MUST NOT archive before it. The real domain is migrated ONCE, after both land.
- Vocabulary and naming convention are defined once in CHANGE-1 (`subject` / `subject_attribute`, bare-noun file fields, plural lists, snake_case fields, kebab-case values). This change consumes them.
- It absorbs the follow-up named `video-legacy-series-markers` in CHANGE-1 (design D3/tasks) and the open issues #425 and #428.

## Backlog / issues finding

No pending item or change is dedicated to folder layout or file naming. Related: issue #425 (`resolveSoundFiles` also searches `shared/audio` and `audio`; the real domain uses `shared/audio/`), #428 (deprecate `render-formats` for Open Gate dual-master: CONFLICTS with decision 4, must be closed or rewritten), #429 (pre-draft gate for `assets/<slug>/media/`; edits `procedures/draft-scene-visuals_procedures_NN.md`, which the blueprint does not ship: only a test fixture exists under `iNNfo/packages/nn-core/tests/fixtures/video-golden/procedures/`), #426/#427 (console thumbnails/lightbox/quality tiers; sequence after CHANGE-1, both touch `draft-template.html`). Backlog items `video-vector-actor-catalog`, `sample-media-fields`, console review view idea: unrelated, keep separate.

## Contract vs reality (documents contradict each other and the real episode)

- Video folder: living spec `video-folder-contract` says `series/{s}/videos/{v}/` and series scope `series/{s}/assets/`; `SK/references/folder-contract.md` says `assets/<video-slug>/` and `shared/`. SKILL.md and #429 follow the md file; #425 and the real domain use `shared/audio/`.
- No-upward-escape: spec relaxed to domaiNN root / nearest `isolate` scope; `folder-contract.md` still says paths must stay inside `series/<slug>/`.
- Documented but never produced: `renders/<ref>/` promotion (`finalize-video.mjs:85` reads `renders/<ref>/`; the real episode has no `renders/` and finalize throws "No render refs found"), `voiceover.<ext>`, `.cognnitive-video/` (the engine uses `.cognnitive/` at the domain root), a Video record with `master::`/`script::`/`status::`, Series L3 doc `<SeriesName>_V_x-y-z_video-script_NN.md` (real: `templates_V_0-1-0_<series>_NN.md`), video doc `<Video>_V_x-y-z_video-script_NN.md` (code writes `<slug>_video-script_<series>_NN.md`, `build-script-from-draft.mjs:44`), thumbnail `thumbnail_[topic].jpeg` (real: `thumbnail.png`, `thumbnail_vertical.png`).
- Produced but documented nowhere: draft JSON, `*_reviewed.json`, console/quine HTML (+ legacy `_draft_<version>.html` alias), `draft_thumbs/`, `manifest.json`, `public/`, `hyperframes/`, `audio/`, `.nn-emit.json`, `descripcion_youtube.md`, derived format variants, `thumbnail_vertical.png`.
- Series root anchoring: `SERIES_MARKERS = [series_NN.md, series_rules.md, script_template.md]` (`lib/video-scope.mjs:23,122-132`); `findSeriesRoot` does not know `*_scope_NN.md`, so in `cognitive-use-cases` the legacy `series_rules.md` / `script_template.md` are the only things anchoring the series root (media staging, thumbnails). `script_template.md` is otherwise dead and stale. `video.series.json` only feeds dev tooling and duplicates the scope marker. The legacy markers cannot be dropped until `findSeriesRoot` learns the scope marker.
- Living specs `video-production-hierarchy` and `video-template` still describe a Series as a `video`-template L3 model (`series/{slug}/{Name}_V_x-y-z_video_NN.md`); `series-script-templates` is superseded in CHANGE-1 by `video-series-folders`.
- Tone/sound-tag rules "live once" is violated: `tone` appears in the series blueprint element, `templates_*`, `series_rules.md` and scope `fills`.
- `.gitignore` covers `renders/`, `.cognnitive-video/`, `.anydeo/`, `.remotion/` but not the real engine outputs (`public/`, `hyperframes/`, `audio/`, `manifest.json`, `draft_thumbs/`, root-level `master*.mp4`).

## Naming findings (real domain)

- Five conventions for the same artifact (series record: `Cosicah_V_0-1-0_video_NN.md`, `INNteresante_video_NN.md`, `VillabotijosToday_video_NN.md`, none; script: `script.md`, `<slug>_V_0-1-0_video-script_NN.md`, `<slug>_video-script_<series>_NN.md`).
- `V_` version tag on some files only (`templates_V_0-1-0_*`, `*_draft_V_0-1-0.json`) and not on `*_reviewed.json`, `*_review_console.html`, `*_video-script_*`.
- The slug is repeated 3-4 times in a path (`assets/startup-founder/startup-founder_video-script_cognitive-use-cases_NN.md`); `assets/` means two things (domain asset library and `series/<s>/assets/<episode>/`); an episode folder then has three asset-like dirs (`media/`, `public/`, `hyperframes/assets/`).
- Case collision: authored animation projects in `Hyperframes/` vs engine output `hyperframes/` at `dirname(--output)` (`video-engine-cli.mjs:782`); same folder on Windows/macOS when output sits at the episode root (not verified at runtime).
- Two parallel output name families for the same derived formats (`master_*` and `<slug>_*`); `FORMAT_PRESETS.square` is a stream copy labelled `1080x1080` (`render-formats.mjs:39`) although the master is 1920x1920.
- Scene naming drift across `series_rules.md`, script, scope `fills` and slugs (`01 Challenge` / `01 Reality and Pain` / `01 Reality & Pain`); layer slug stutters (`00-hook-hook-title`); compiler scene id `scene_00-hook` vs slug `00-hook`.
- Language mix in names (`descripcion_youtube.md`, `guia_estilo_narrativo.md`; Spanish procedures; Spanish CLI strings) in an English series.
- Leftovers: `.bak-outro*`, `_tmp_noticias_*.md`, `_tts-ab-test`, `*-proto`, `renders/` full of `render1..13.log`; unversioned and versioned copies of one script.

## Cache and staging truth (read-only verification)

The engine caches provider outputs ONLY; renders, format variants and thumbnails are recomputed every time.

| Location | Key / name | Class |
|---|---|---|
| `<domainRoot>/.cognnitive/cache/video/tts/<sha256>.mp3` | sha256 of NFC-trimmed narration + sorted `{model, voice, speed?, emotion?, modelOverride?, voiceId?}` (`cache-manager.mjs:67-75`, `lib/tts-options.mjs:20-40`, `asset-synthesizer.mjs:400-402`) | cache identity |
| `.../cache/video/images/<sha256>.png` | prompt + `{provider, model, title:"<scene.name> — <layer.name>", accentColor, modelOverride?}` (`video-engine-cli.mjs:463-473`) | cache identity (display names are in the key) |
| `.../cache/video/temp/<sha256>.mp4` | avatar clips: sha256(image bytes) + sha256(audio bytes) + `{normalized model, resolution}` (`lib/avatar-jobs.mjs:25-26,70-75`) | cache identity (despite the name, durable) |
| `<scriptDir>/audio/<sceneId>_voiceover.mp3` | plain copy of the TTS entry, overwritten each compile (`video-engine-cli.mjs:702-711`) | handoff: read only by `synthesize-avatar` (bytes for the key, duration to bill, staleness check) |
| `<scriptDir>/public/<base>_<sha12>.<ext>` | content-addressed staging (`stageAsset`, `video-engine-cli.mjs:275-294`) | re-derivable staging for the renderer |
| `<outDir>/hyperframes/assets/` | unconditional copy of every `public/` file per render (`hyperframes-render.mjs:53-57`) | re-derivable staging |
| `manifest.json` | relative staged names + ABSOLUTE `metadata.scriptSource/publicDir/frame.path/components[].path` | compile-to-render handoff; stale after any folder move, recompile (free on a full cache) |
| ledger, `pending-predictions.jsonl`, `locks/`, `video-guard.json` | domain root | safety state |
| `asset_plan.approved.json` | `plan_hash` = sha256(normalized FULL script text + canonical CLI models) (`lib/plan-approval.mjs:42-51`) | gate; an all-cached run needs no approval (`lib/video-guard.mjs:534`) |

Conclusion: the earlier "4 copies of each TTS mp3" finding was wrong to treat them as one kind. One is the cache identity (deleting it re-bills); `audio/` is a handoff; `public/` and `hyperframes/assets/` are two staging layers. No cache key contains a path, folder, output name or width/height, so a pure layout/naming change cannot change a key.

### Invariants any design in this change must satisfy

1. Keep `<findDomainRoot>/.cognnitive/cache/video/{tts,images,temp}` and keep domain-root detection unchanged (`lib/video-guard.mjs:102,189-191`: the `?? scriptDir` fallback silently relocates the cache and re-bills everything).
2. TTS key stays narration + `{model, voice, speed?, emotion?, modelOverride?, voiceId?}`; no path, name or dimension may enter it (CHANGE-1 renames fields but keeps the internal keys).
3. The image key keeps `"${scene.name} — ${layer.name}"`: renaming display names re-bills prompt-generated images; slugs are safe.
4. The avatar key stays image-bytes + audio-bytes + `{model, resolution}`; keep `temp/` and `.mp4`; never garbage-collect it.
5. Audio fed to `synthesize-avatar` must be byte-identical to the TTS cache entry; dropping `audio/` requires reading the cache directly.
6. The approval hash covers the full script text + `--*-model` flags: any script text edit forces re-approval (zero spend when cached).
7. Compile and `synthesize-avatar` must receive identical `--*-model` flags (`modelOverride` is in the keys).
8. Recompile after any folder move (absolute paths in `manifest.metadata`).
9. Keep content-addressed staging naming (`<base>_<sha12>`).
10. Ledger, journal, locks and `video-guard.json` stay at the domain root.
11. There is no render/format/thumbnail cache; if "no re-render" is wanted it is a new feature.
12. Derived formats must be pure functions of the 1920x1920 master file.

Safe to simplify: keep one of `public/` or `hyperframes/assets/` (manifest keeps referencing staged names), `audio/` only if `synthesize-avatar` reads the cache directly, duplicate `master_*`/`<slug>_*` families, orphans in `public/`, the `-c copy` "1080" square preset, `.nn-emit.json`/`hyperframes/.hyperframes/` (regenerable; the hand-edit guard may be wanted). Must keep: cache dirs and keys, `asset_plan.approved.json` behaviour, ledger/journal/locks, `modelOverride` and `voiceId` key inputs, content-addressed staging, `video-guard.json`.

Latent cache bug found (not caused by these changes): with no `WAVESPEED_API_KEY`, `synthesizeTTS` stores silent placeholder audio under the REAL TTS key (`asset-synthesizer.mjs:417-418`), so a later keyed run gets a "hit" on silence; avatars avoid this with an `-offline` suffix (`:493`), TTS does not. Candidate fix to include or to file separately.

## Master format (single 1920x1920) contradictions to retire

- `SK/SKILL.md:106-112` step 6 "dual-master" with a second `--format 9:16` compile; `:112` headroom `center 12%`; `:113-117` step 6c optional `render-formats` with `master_1080x1080.mp4`; `:127` `master_vertical::`; `:152-153` `--format` presets and "square master -> _1080x1080 (copy)".
- `scripts/video-engine-cli.mjs:898-915,919,922-923,1004-1008` `FORMAT_PRESETS` and `--width/--height/--format`; `scripts/scene-compiler.mjs:272,278-279,428-429,592-593` and `scripts/scene-project.mjs:103-105` default 1920x1080; `isHorizontal` (`scene-project.mjs:105`) drives the `center 12%` headroom (`:85-89`), dead under a square master.
- `scripts/render-formats.mjs:38-42,135-136` `square` preset is `-c copy` labelled 1080x1080 (a 1920x1920 file named `_1080x1080`); pinned by `test/render-formats.test.mjs:61-66`. Blur-fill graph `render-formats.mjs:77-84` plus spec `cognnitive-video-engine` "Format variants with blur fill" shrinks a 1920x1920 source to 1080x1080 content inside 1920x1080 (about 44% smaller).
- `references/thumbnail-and-asset-pipeline.md:63-71` Open Gate protocol (critical content in the central 1080x1080; 420 px margins crop safely): consistent with CROP derivation, in conflict with blur-fill.
- `components/lower-third.html:5` (`bottom:12%`) and `components/caption.html:5` (`bottom:10%`) sit inside the 420 px band a crop would cut.
- `spec_NN.md:123` (Video `master` description mentions native dual masters 16:9 and 9:16 via HyperFrames) and `spec_NN.md:209` (`position` mentions 16:9 `center 12%` and 9:16 behaviour): rewrite. `spec_NN.md:369-370` ("never model a format variant", render-formats naming) already compatible.
- `scripts/finalize-video.mjs:90-113` and `test/finalize-video.test.mjs`: candidates `master.mp4`, `<ref>.mp4`, `master_vertical.mp4`, comment "YouTube 16:9 + Shorts 9:16".
- `scripts/render-thumbnail.mjs:26-27,250-251` defaults 2560x1440 and 16:9 base: thumbnails are stills, not video derivatives; whether they move is a maintainer decision.
- `scripts/asset-synthesizer.mjs:614,678` offline fallback image 1920x1080; real domain procedure `draft-scene-visuals_procedures_NN.md:57` renders Roll-A animations at 1080x1080 (upscaled into a 1920x1920 master).
- The real script carries `resolution:: 1920x1920`, `format:: 1:1`, `fps:: 30`, none declared in the blueprint and none read by code; the 1920x1920 manifest came from CLI `--width/--height`. The master size must become a declared, cascaded parameter instead of a flag the maintainer has to remember.
- Naming of derived formats: by true dimensions `<slug>_<W>x<H>.mp4` (already the convention, `render-formats.mjs:54-66`); no output name feeds any key; name-keyed code is only `finalize-video` candidates, the `master::`/`master_vertical::` fields and their tests.

## Description file facts

- No script in SK produces or reads `descripcion_youtube.md`; the agent creates it from the real procedure `D:\Users\lucas\Documents\_NN\video_NN\procedures\draft-scene-visuals_procedures_NN.md` (`:121-130` generate, `:132-141` third-party attribution edits the same file, `:220-222` artifact, RACI rows `:289,306,323`). Other mentions of "youtube": comments in `finalize-video.mjs:102` and `thumbnail-and-asset-pipeline.md:49`, `openspec/specs/two-phase-thumbnail/spec.md:5`.
- The step runs BEFORE estimate/TTS/compile, so chapter timestamps are guessed (real: 00:11/00:23/00:37/00:48 vs manifest 11.5/26.2/42.5/54.6 s). Durations are available after compile in `manifest.json` `tracks.scenes[].fromFrame/fps` with titles in `props.title`.
- Conceptual collision only: Video field `description` (1-2 sentences, `spec_NN.md:104-107`) vs the long publication body in the file.

## Workflow findings (pipeline as built)

Steps: domain setup (manual `cp` of defaults/guard/series files) -> front controller -> segment scenes -> produce Roll-A media and avatar image -> write draft JSON -> build console (+ legacy alias) -> human review/export `reviewed.json` -> build final script -> write YouTube description -> third-party attribution -> estimate + approve -> ensure HyperFrames -> compile #1 -> synthesize-avatar -> compile #2 -> render -> formats (`render-formats` or a 9:16 recompile) -> thumbnails -> finalize/record fields -> retrospective.

- State is spread over six places: ledger, cache, `asset_plan.approved.json`, `reviewed.json`, quine HTML, `.nn-emit.json`.
- Compile runs twice (before and after avatars) and a 9:16 route would recompile a third time.
- `build-script-from-draft` is given `--draft` although `reviewed.json` carries every scene; the procedure's "GOTCHA: overlays are read from `--draft`" is wrong (`sceneOverlayLayers(scene, r ? r.overlays : ...)` reads reviewed first, `build-script-from-draft.mjs:204-247`); the real draft JSON is stale (different title, narration, sources).
- Avatar image is declared in four places (draft config `avatar_image`, `reviewed.choice.asset`, script presenter `asset::`, scope `fills.avatar_recipe`); the episode's `media/avatar_lucas.png` is unused.
- Series-local forks of skill tools (`series/*/tools/build-review-console.mjs` clones a villabotijos console and hardcodes `replaceAll('Celedonio','Lucas')` plus a Downloads path).
- Approval: SKILL says "approve the plan <hash>", procedure says "apruebo el plan <hash>", code only checks the 8-char hash is contained in the message (`lib/plan-approval.mjs:103-106`); `asset_plan.md` boilerplate is wrong (says to run `approve-plan.mjs <this file>`, "Recommended" tier $1.3162 vs actual $0.3048, lists "Speech 2.5 HD", unchecked boxes, still quotes image prices for images that already exist).
- Quality vocabulary differs: procedure `BAJA/MEDIA/ALTA`, draft `ALTA/MEDIA`, reviewed `ESTÁNDAR`.
- `findSeriesRoot` and finalize assumptions as above; the blueprint ships no `procedures/` folder although #429 and `video-template` assume `draft-scene-visuals` and `generate_video_script_NN.md`.
- Domain setup is manual; `defaults/video-defaults_NN.md` `parent_spec` drift (`V_0-13-6`) is fixed in CHANGE-1.

## Impact on the real domain (to be covered by the `layout` migration step)

Files whose names or locations would change: `descripcion_youtube.md` -> `description.md`; output families (`master_*`, `<slug>_*`) -> `<slug>_<W>x<H>.mp4` derived from the 1920x1920 master; legacy markers `series_rules.md`, `script_template.md`, `video.series.json` and `templates_*` stay or go per design; leftovers listed by name in the report, never deleted; `.gitignore` of the domain updated to the real engine outputs. Any change that edits script text invalidates `asset_plan.approved.json` (re-estimate and re-approve: zero spend on a full cache) and `manifest.json` must be regenerated by compile.

## Open decisions for design (recommendations noted)

1. Derived formats: CROP from the 1920x1920 master (vertical 1080x1920 = central 1080 columns, horizontal 1920x1080 = central 1080 rows, square = scale to 1080x1080) versus today's contain+blur. Recommendation: crop, consistent with the Open Gate protocol; requires safe-zone-aware offsets for `lower-third` and `caption` and a thumbnail decision.
2. Engine outputs location: keep at episode root, or move engine-generated files (`manifest.json`, `public/`, `hyperframes/`, `audio/`, derived masters) under one build folder, deliverables promoted. Must respect the invariants above; every hardcoded location (`video-engine-cli.mjs:670,703,509,782`, `finalize-video.mjs:85`, `synthesize-avatar.mjs:123`) changes together.
3. Whether the master size/format becomes a declared cascade parameter (e.g. `master_resolution`) replacing the undeclared `resolution::`/`format::` and the CLI flags.
4. Whether thumbnails (stills) remain 16:9 2560x1440 independent of the master.
5. `findSeriesRoot` learning `*_scope_NN.md` and dropping the three legacy markers in this change (recommended: yes, it absorbs `video-legacy-series-markers`).
6. File naming scheme: one convention for series record, script, review files; whether the slug is repeated inside files already under a slug folder; whether `V_` appears on review/draft files; casing of `Hyperframes/` vs `hyperframes/`.
7. Keyless TTS placeholder poisoning of the real key: fix here or file separately.
8. #425 `shared/audio` vs `sounds/`; #428 closed/rewritten by decision 4 of this change.
