# Design: Video Folder Contract

Change: `2026-11-01-video-folder-contract`. Ships after `2026-11-01-video-presets` (`V_0-14-0`) as its own release, `V_0-14-1`. Inputs: `exploration.md`, `proposal.md`, the presets design (naming convention). Roots: `<bp>` = `iNNfo/specs/bluepriNNts/video-script/`, `<skill>` = `<bp>skills/nn-video-script/`, `<scripts>` = `<skill>scripts/`. `E` = episode folder, `B` = `E/build/`.

## Technical Approach

- One layout, written once in `video-folder-contract`. Episodes stay at `series/<s>/assets/<slug>/`, which means no episode moves.
- Every engine-generated file goes under one gitignored `E/build/`.
- Deliverables are written in place at their final, slug-prefixed, dimension-named paths, so nothing is promoted.
- The 1920x1920 master size becomes a declared parameter. Every other format is a crop or scale of the master file.
- `description.md` is agent-authored; finalize prints its chapters from measured durations.
- The workflow keeps the three engine commands in order: `compile` → `synthesize-avatar` → `render`.
- Series roots come from the nn-core scope chain only.
- No cache key changes (see the cache-key audit), so no re-billing exception is needed.

## Settled defaults

| # | Default | Verdict | Evidence / reason |
|---|---|---|---|
| 1 | Engine outputs in one gitignored `build/` | **Confirmed, promotion dropped** | Render writes the master straight to `E/<slug>_1920x1920.mp4` (temp file in `B`, then a same-volume rename). Promotion copied hundreds of MB for nothing, and `finalize-video.mjs:85` reads a `renders/<ref>/` that is never produced |
| 2 | Crop by default, blur opt-in | **Confirmed.** `--fill crop\|blur`; blur outputs carry `_blur` | Open Gate protocol (`thumbnail-and-asset-pipeline.md:63-71`). Blur stays a pure function of the master (invariant 12) |
| 3 | `assets/<slug>/`; working files without slug or `V_`; deliverables slug-prefixed | **Confirmed, with one change.** The script keeps `<slug>_video-script_<series>_NN.md`, because it is a domain-indexed document and stems must be unique (`nn-core.generated.cjs:7491-7510` indexes by stem; `build-script-from-draft.mjs:44` already writes this name). Authored `Hyperframes/` is tolerated, not renamed: `build/hyperframes/` already removes the collision and a rename would edit `asset::` paths |
| 4 | `master_resolution` in package Video Defaults, single option | **Confirmed.** D4 | Real script `resolution::`/`format::` are undeclared and never read |
| 5 | Drop all legacy markers; scope document only | **Confirmed, without conversion.** A folder holding only `series_NN.md` is simply not a series; nothing is renamed | `loadCascadeBags` fallback (`video-scope.mjs:159-163`). No real series is affected |
| 6 | Thumbnails stay 16:9 2560x1440 stills | **Confirmed.** Delivered as `<slug>_thumbnail_<W>x<H>.png`; the caller passes `--out` | `render-thumbnail.mjs:250-251` |
| 7 | #425: search `sounds/` only | **Confirmed.** No file is copied: a sound that only exists under `shared/audio/` becomes a pre-spend error naming the searched folders | `video-engine-cli.mjs:209-218` |
| 8 | Keyless placeholders stored offline | **Confirmed and widened**: images too | `asset-synthesizer.mjs:417-418` (TTS) and `:584-586` (a local SVG stored under the real image key) |
| 9 | `audio/` handoff dropped | **Confirmed.** `synthesize-avatar` reads the TTS cache entry directly | The bytes are identical by construction (D7); compile already passes the cache path (`video-engine-cli.mjs:653`) |
| 10 | Version | `V_0-14-1`, after the presets release | Release-guard merge-base rule |
| 11 | `produce` command | **Rejected.** The three commands stay separate | A re-run is already idempotent, compile#2 is a free cache read, and the flags object is shared by construction (`video-engine-cli.mjs:507,517`; `synthesize-avatar.mjs:119`) |
| 12 | Shipped `procedures/` | **Deferred** to #429 | The blueprint inventory/catalog treatment of a new `procedures/` folder is unverified; unrelated to this contract |

## Cache-key audit (HARD CONSTRAINT)

| Identity | Computed at | Contains a path or name? | Effect of this design |
|---|---|---|---|
| TTS key | `cache-manager.mjs:67-75`, `asset-synthesizer.mjs:400-401` | No: narration plus voice options | None |
| Image key | `video-engine-cli.mjs:463-469` → `asset-synthesizer.mjs:572` | Display names `"<scene> — <layer>"`, no path | None. No heading is renamed. **Rule:** the square master MUST NOT add `size` to `mediaOptions`; `options.size` is read at `asset-synthesizer.mjs:635`, and any key added to `options` enters the hash |
| Avatar key | `avatar-jobs.mjs:70-75` | No: image bytes plus audio bytes plus `{model, resolution}` | Audio now comes from the TTS cache instead of `audio/` (D7). Same bytes, same key |
| Avatar fallback key | `asset-synthesizer.mjs:481` `` `${imagePath}:${audioPath}` `` | **Yes** | Not reached: its only caller passes `cacheKey` (`synthesize-avatar.mjs:290-296`), and compile only reads the cache (`avatar-jobs.mjs:171-189`). Left untouched |
| `bgmusic:<file>` | `scene-compiler.mjs:688` | **Yes** (the authored relative path) | **Not a cache key.** It is a manifest track field with no reader under `scripts/` (grep finds only this producer). It triggers no provider call, and no music file is moved |
| Staged names | `video-engine-cli.mjs:275-294` | Basename plus content sha12 | Only the staging folder moves (invariant 9) |
| Domain root | `findDomainRoot` = nearest `domaiNN_NN.md` (`nn-core.generated.cjs:7404,7452-7464`); `?? start` at `video-guard.mjs:102` | n/a | `build/` sits under the episode, so the root is unchanged |
| Plan hash | `plan-approval.mjs:42-51` | Script text plus models | Not a cache |
| `master_resolution` default | blueprint bag | n/a | Read by neither `buildTtsVoiceOptions` nor the image options |

## Architecture Decisions

### D1: Canonical layout and naming

**Context.** Three sources disagree. **Options:** keep `assets/<slug>/` (chosen) or use `videos/<slug>/` (rejected: it moves every real episode). **Consequence:** `assets/` means two things, the domain library and the episode folder. Both follow the iNNfo `{modelDir}/assets/` rule, so this is accepted.

```
<domain>/                                   THE CONTRACT ("*" = the earlier shape, left alone)
  domaiNN_NN.md  video-defaults_NN.md  video-guard.json  .gitignore(*managed block)
  .cognnitive/{cache/video/{tts,images,temp}, video-ledger.jsonl, pending-predictions.jsonl, locks/}
  sounds/ components/ frames/ procedures/ assets/<library>/   + any other domaiNN content
  series/<s>/
    <s>_scope_NN.md                          only anchor (*was also series_rules.md, script_template.md, video.series.json: now ignored)
    shared/<kind>/  sounds/  components/  frames/  procedures/
    assets/<slug>/
      <slug>_video-script_<s>_NN.md          Video record + script (unchanged)
      draft.json  reviewed.json  review_console.html  draft_thumbs/   (*<slug>_draft_V_x-y-z.json, <slug>_reviewed.json, <slug>_review_console.html, legacy <slug>_draft_<v>.html)
      media/  animations/<project>/          (*Hyperframes/ tolerated, not migrated)
      asset_plan.md  asset_plan.approved.json
      description.md                         (*descripcion_youtube.md)
      <slug>_1920x1920.mp4                   master (*master.mp4)
      <slug>_1080x1920.mp4 <slug>_1920x1080.mp4 <slug>_1080x1080.mp4   (*master_<WxH>.mp4 family)
      <slug>_thumbnail_2560x1440.png  <slug>_thumbnail_1080x1920.png  (*thumbnail.png, thumbnail_vertical.png)
      build/                                 gitignored (*public/, hyperframes/, audio/, manifest.json at E root)
        .nn-build  manifest.json  render.tmp.mp4
        hyperframes/{index.html, compositions/, components/, authored/, assets/, .nn-emit.json, .hyperframes/}
```

| Class | Rule | slug | `V_` | Case |
|---|---|---|---|---|
| Domain-indexed documents (`_NN.md`) | `<stem>_<blueprint-or-role>_NN.md`; stem unique domain-wide | yes when per-episode or per-series | no | stems kebab |
| Working files inside `E` | fixed role names | no | no (git holds history) | `snake_case` |
| Deliverables leaving `E` (uploaded files) | `<slug>_<what>_<W>x<H>.<ext>` by TRUE dimensions; blur adds `_blur` | yes | no | slug kebab, separators `_` |
| `description.md` | pasted, not uploaded | no | no | lowercase |
| Folders | lowercase; plural when they hold many items (`assets`, `sounds`, `components`, `frames`, `animations`, `procedures`), mass nouns singular (`media`, `shared`, `build`) | — | — | lowercase |
| Engine output | only under `B`, gitignored | — | — | — |

Every file and folder name this contract produces is in English. Files that already exist with another name are left alone; nothing is renamed.

### D2: Engine output location (`build/`)

| Hardcoded site | Old | New |
|---|---|---|
| `video-engine-cli.mjs:670` `publicDir` | `E/public` | `B/hyperframes/assets`, the ONE staging layer |
| `:703-711` | copies the TTS cache to `E/audio/<id>_voiceover.mp3` | removed (D7) |
| `:509` approval | `E/asset_plan.approved.json` | unchanged (tracked governance file; survives `rm -rf build`) |
| `:726-729` manifest | only when `--output` is given | always `B/manifest.json`; `--output`/`--out` removed |
| `:782` `projectDir` | `dirname(output)/hyperframes` | `B/hyperframes` from `manifest.metadata.buildDir` |
| render output | `--output` | `B/render.tmp.mp4`, then renamed to `E/<slug>_1920x1920.mp4` |
| `hyperframes-render.mjs:53-57` | copies `public/` into `<project>/assets` on every render | skipped when `publicDir === assetsDir`; `projectDir` becomes required (`:125` default removed) |
| `scene-project.mjs:103-105` | defaults to 1920x1080, `isHorizontal` | width and height required from the manifest; `isHorizontal` and `center 12%` (`:85-89`) deleted |
| `finalize-video.mjs:85` | `renders/<ref>/` | reads `E/<slug>_1920x1920.mp4` and `B/manifest.json`; `--ref` removed |
| `synthesize-avatar.mjs:123` | approval next to the script | unchanged. Its audio source (`:142`) becomes the TTS cache |

**Manifest absolute paths** (`scriptSource`, `publicDir`, `frame.path`, `components[].path`) stay absolute. `render` accepts only a script and recompiles every time (free on a full cache). A stale manifest therefore cannot be rendered. Finalize rejects a manifest whose `scriptSource` is not the episode script, or which is older than the script.

**Collision fix:** engine output lives at `B/hyperframes/`, never at `E/hyperframes/`.

**`.gitignore` (SKILL domain setup):** `**/build/`, `**/draft_thumbs/`, `.cognnitive/cache/`. `audio/` is NOT ignored: real episodes hold authored audio there (`adelanto-electoral/audio/00_gancho.wav`).

### D3: One master

| Option | Verdict |
|---|---|
| Keep `--format`/`--width`/`--height` | Rejected: the maintainer must remember them |
| Native dual master | Rejected by the single-master decision |
| **Declared `master_resolution`** | **Chosen** |

`FORMAT_PRESETS`, `resolveFormatSize`, `--format/--width/--height` (`video-engine-cli.mjs:898-915,919-923,1004-1008`), the 9:16 recompile, and the `width/height` defaults in `scene-compiler.mjs:272-279,428-429,592-593` are all deleted. The compiler takes its size from `resolve('master_resolution', bags)`, parsed as `^(\d+)x(\d+)$`. Any other value is an `unsupported-master-resolution` error, raised before any spend.

### D4: Field Definition rows (post-change)

| Field | concept:: | type | options | Default (blueprint `video-defaults_NN.md`) | description |
|---|---|---|---|---|---|
| master_resolution | Video Defaults | select | [1920x1920] | `1920x1920` | Pixel size of the single rendered master. Every delivery format is derived from it; no format is rendered on its own. |
| master (rewrite) | Video | video | – | – | The episode's square master `<slug>_1920x1920.mp4`. Delivery formats are derived by `render-formats` and never modeled. |
| position (rewrite) | Layer | unchanged | unchanged | – | Overlay anchor inside the central safe square (the central 1080x1080 of the master). |

`resolution::`, `format::` and `fps::` stay undeclared and are never read. Because an undeclared Field is a validation error, a script written against the new blueprint must not carry them; a script that does is rejected, which is the version boundary.

### D5: Derivation, safe zones, thumbnails, finalize

All outputs use these common arguments: `-map 0:v:0 -map 0:a? -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a copy -movflags +faststart -map_metadata -1 -fflags +bitexact`.

| Format | Output | `-vf` |
|---|---|---|
| vertical | `<slug>_1080x1920.mp4` | `crop=1080:1920:420:0` |
| horizontal | `<slug>_1920x1080.mp4` | `crop=1920:1080:0:420` |
| square | `<slug>_1080x1080.mp4` | `scale=1080:1080:flags=lanczos` (a real scale, replacing the `-c copy` at `render-formats.mjs:39,135-136`) |
| blur (opt-in, vertical/horizontal) | `<slug>_<W>x<H>_blur.mp4` | existing `buildBlurFillFilter` (`:77-84`) |

- `render-formats` refuses a master that ffprobe does not report as 1920x1920.
- The slug comes from `<slug>_1920x1920.mp4`.
- An existing output is skipped unless `--force`, because a blur variant may already have been published.

**Safe zones.** Only the central 1080x1080 square survives every derivation, so its inset is 420 px = **21.875%**. The overlay components (`lower-third`, `caption`, `title`, `quote`, `watermark`, `b-roll`) set `#root { inset: 21.875%; overflow: visible }` and keep their percentages relative to that square. Inheriting through a CSS variable was rejected: whether HyperFrames sub-compositions inherit custom properties is unverified.

| Component | Master px | Horizontal crop | Vertical crop |
|---|---|---|---|
| lower-third | bottom 549.6, left 474, max-w 756 | bottom 129.6 (= 12%) | left 54 (= 5%), bottom 28.6% |
| caption | bottom 528, right 474, max-w 648 | bottom 108 (= 10%) | right 54 |

The square variant scales text by 0.5625 (40 px becomes 22.5 px). That is accepted.

**Thumbnails** stay separate stills (2560x1440 default; vertical via `--width 1080 --height 1920`). `render-thumbnail.mjs` keeps `--out` required; the caller passes `<slug>_thumbnail_<W>x<H>.png`. The series title is read from the scope document.

**Finalize:** `node finalize-video.mjs <episode-dir> [--formats vertical,horizontal,square] [--fill crop|blur] [--force] [--dry-run]`. It derives the formats, prints the chapters (D6), and prints the field values `master:: <slug>_1920x1920.mp4` and `thumbnail:: <slug>_thumbnail_2560x1440.png`. It never writes the model. `master_vertical` and voiceover promotion are removed.

**Issues.** #428 (deprecate `render-formats` for an Open Gate dual master) is CLOSED as superseded: `render-formats` becomes THE derivation. #425 is CLOSED by D9.

### D6: `description.md`

- **Author:** the agent writes the whole file: `# <title>`, the summary (the Video `description` field may seed it), the chapter block, sources and attribution.
- **Chapters:** finalize prints them. Input: `B/manifest.json` `tracks.scenes[]`: start = `floor(fromFrame / fps)` and title = `props.title`. Format: one line per scene, `MM:SS Title`, or `H:MM:SS` when the total is 1 h or more; the first line is `00:00`. Nothing is written to the file and no marker comments exist.
- **When:** after render, so the timestamps are measured.
- **Relation to the Video field:** the `description` field stays the 1-2 sentence record. `description.md` is the publication body. No new field is added.

### D7: `audio/` handoff dropped

`assertAudioFresh` (`avatar-jobs.mjs:95-107`) already computes the TTS key and requires `audio/` to equal the cache entry byte for byte. Its lookup is extracted as `ttsCachePathFor(sc, {cacheManager, config, models, bags})`. `synthesize-avatar` passes it as `audioFor` to `collectAvatarJobs`, so the key is `sha256(bytes)` of the same bytes. Scenes without narration keep `sceneAudioPath`'s explicit `audio_asset_source`/`voiceover` branch. The "stale staged audio" failure mode disappears; a cache miss says "run compile first".

### D8: Simplified pipeline

| # | Step | Actor | Inputs | Outputs | Removed or merged; why it is cache-safe |
|---|---|---|---|---|---|
| 1 | Domain setup | agent | package defaults | `video-defaults_NN.md`, `.gitignore` block | unchanged |
| 2 | Series setup | agent | – | `<s>_scope_NN.md` (`scope: true`) | `series_rules.md`, `script_template.md` and `video.series.json` are retired; they never fed a key |
| 3 | Media + draft | agent | scope `fills` | `media/`, `animations/`, `draft.json`, `draft_thumbs/` | no keys involved |
| 4 | Console | `build-draft-html.mjs draft.json` | draft | `review_console.html` | legacy `_draft_<v>.html` alias removed |
| 5 | Human review | human | console | `reviewed.json` | – |
| 6 | Script | `build-script-from-draft.mjs reviewed.json` | reviewed | `<slug>_video-script_<s>_NN.md` | `--draft` is optional (reviewed carries every scene) |
| 7 | Estimate | `asset-cost-estimator.mjs <script>` | script, cache | `asset_plan.md` | boilerplate fixes, D10 |
| 8 | Approve | human in chat, `approve the plan <hash8>` → agent `approve-plan.mjs asset_plan.md --delegated "<phrase>"` | plan | `asset_plan.approved.json` | wording unified; the check is unchanged (`plan-approval.mjs:103-106`) |
| 9 | Compile | `video-engine-cli.mjs compile <script> [model flags]` | approval | `B/manifest.json` | stage 1 |
| 10 | Avatars | `video-engine-cli.mjs synthesize-avatar <script> [model flags]` | approval, TTS cache | `B/hyperframes/assets` entries | stage 2; needs the TTS bytes, hence the order |
| 11 | Render | `video-engine-cli.mjs render <script> [model flags]` | approval | `E/<slug>_1920x1920.mp4` | compiles again first; a pure cache read |
| 12 | Thumbnails | `render-thumbnail.mjs` | base image | `<slug>_thumbnail_<W>x<H>.png` | stills, no cache |
| 13 | Finalize | `finalize-video.mjs <E>` | master, manifest | derived formats, printed chapters, printed fields | promotion removed |
| 14 | Description prose + attribution | agent | printed chapters, sources | `description.md` | after durations exist |
| 15 | Retrospective | agent | – | – | – |

Three commands, one approval, one shared flags object. A re-run of the sequence on a full cache makes no provider request. `render` refuses when an avatar clip is missing so minutes are not spent on a still-image render.

### D9: Series root and #425

`findSeriesRoot(startDir)` returns the outermost folder scope link below the domain root of `findScopeChain` (`nn-core.generated.cjs:8355`). Scope markers are recognised by frontmatter `scope: true` (`:8339`), not by filename.

- **Errors:** `!ok` (for example `DUPLICATE_SCOPE_MARKER`) is surfaced, not swallowed.
- **Deleted:** `SERIES_MARKERS` and the `series_NN.md` fallback in `loadCascadeBags` (`video-scope.mjs:23,122-132,159-163`). Preset lookup then uses scope documents only.
- **Updated consumers:** `video-engine-cli.mjs:675`, `render-thumbnail`, `build-script-from-draft.mjs:67-136`, `build-draft-html.mjs:10`.
- **Dev tooling:** stops reading `video.series.json`.
- **#425:** `resolveSoundFiles` searches only `sounds/` (`:209-218` deleted). A sound found only under `shared/audio/` becomes a pre-spend error naming the searched folders.

### D10: Workflow fixes that do not touch keys

`asset-cost-estimator.mjs`:

- `:473` gives the in-chat phrase instead of `approve-plan.mjs <this file>`.
- The `- [ ]` list (`:509-514`) is replaced by the stamped model list.
- The hard-coded "Recommended" tier and "Speech 2.5 HD" (`:150,407-409`) are replaced by resolved ids.
- Images are quoted with compile's own predicate (prompt present, `video-engine-cli.mjs:461-462`).
- Cached items are priced at $0, so `total_usd` reflects what the run will actually charge. This also tightens the 1.25x cap. A cache emptied after the estimate makes compile refuse, which is the safe direction.

`checkApproval` hint (`:119`) uses the same phrase. Keyless TTS and image placeholders are stored under `<key>-offline`, mirroring avatars (`asset-synthesizer.mjs:493`). The offline SVG becomes 1920x1920 and is not part of any key.

## Test Strategy (Strict TDD) and slices

| # | Slice | RED tests first (in order) | Files |
|---|---|---|---|
| 1 | Series anchoring (E) + #425 | scope-only series resolves; marker-only does not; nested scopes resolve to the outermost; `DUPLICATE_SCOPE_MARKER` is surfaced; no `series_NN.md` fallback; `shared/audio` no longer searched (the error names the searched dirs); thumbnail and script builder read the scope title; dev tools ignore `video.series.json`; retired-name scan additions (todo-gated) | `lib/video-scope.mjs`, `video-engine-cli.mjs` (sounds, seriesRoot), `render-thumbnail.mjs`, `build-script-from-draft.mjs`, `build-draft-html.mjs`, `scripts/dev/{lib/series-values,adopt-video-plan,validate-scope-golden}.mjs`, `test/series-scope.test.mjs`, new `test/series-root.test.mjs` |
| 2 | Single master (B) + safe zones + #428 | contract: `master_resolution` row; image options carry no `size` (key equals the golden); unsupported value refused before spend; manifest is 1920x1920; `--format/--width/--height` are a usage error; derivation args, names, refusal of a non-1920 master (ffprobe seam), real square scale (rewrite `render-formats.test.mjs:61-66`), `_blur` naming, skip existing; components carry the inset; no `center 12%` | `<bp>spec_NN.md`, `<bp>defaults/video-defaults_NN.md`, both catalogs, `scene-compiler.mjs`, `scene-project.mjs`, `video-engine-cli.mjs`, `render-formats.mjs`, `components/*.html`, new `test/master-resolution.test.mjs`, `test/safe-zone.test.mjs` |
| 3 | Build layout + workflow (D) | **cache first:** avatar key from the `audio/` copy equals the key from the cache entry; TTS and image keys unchanged; cache dir = `<root>/.cognnitive/cache/video` with `build/` present; keyless TTS and image go to `-offline` and a later keyed run bills. **Then:** compile writes `B/manifest.json` and stages only into `B/hyperframes/assets` with no `public/` or `audio/`; render takes a script only and writes the master atomically; refuses missing avatar clips; a full-cache re-run adds zero ledger entries; estimator boilerplate strings | `video-engine-cli.mjs`, `hyperframes-render.mjs`, `synthesize-avatar.mjs`, `lib/avatar-jobs.mjs`, `asset-synthesizer.mjs`, `asset-cost-estimator.mjs`, `lib/plan-approval.mjs`, new `test/build-layout-cache-identity.test.mjs`, `test/keyless-placeholder.test.mjs` |
| 4 | `description.md` (C) + finalize | printed chapters `floor`, `MM:SS`/`H:MM:SS`, first line `00:00`, stale-manifest refusal; finalize has no `renders/`, derives formats, prints fields, writes nothing to the Video document | `finalize-video.mjs`, new `lib/description.mjs`, `test/finalize-video.test.mjs` (rewrite), new `test/description.test.mjs` |
| 5 | Contract, docs, authoring names (A) | cross-check test: the spec, `folder-contract.md` and SKILL.md describe one tree; default names `draft.json`/`reviewed.json`/`review_console.html`; no legacy alias; retired-name scan un-gated | SKILL.md, `references/{folder-contract,thumbnail-and-asset-pipeline,overlay-slots,cost-guardrails}.md`, `build-draft-html.mjs`, `build-script-from-draft.mjs`, new `test/folder-contract-crosscheck.test.mjs` |

**Retired names added to the scan:** `videos/{`, `.cognnitive-video`, `renders/<ref>`, `--format`, `master_vertical`, `descripcion_youtube`, `SERIES_MARKERS`, `series_rules.md`, `script_template.md`, `video.series.json`, `FORMAT_PRESETS`, `isHorizontal`, `_draft_<version>.html`.

**Release checklist:**

- [ ] Bump to `V_0-14-1` in slice 2 (`spec_NN.md`, defaults `parent_spec`, both catalogs, pinned strings, skill `version:`) in one commit.
- [ ] `bluepriNNt-field-catalogue` and `metaschema-selfdescribe` tests green.
- [ ] `guard-template-immutability` green.
- [ ] `check:spec-urls` passes.
- [ ] `verify.js` shape-discovery picks up the new tests.

## Relationship to the presets change

Sequential, not parallel: this change branches from the presets tip and rebases on it. Shared files: `spec_NN.md`, `video-defaults_NN.md`, both catalogs, `video-scope.mjs`, `scene-compiler.mjs`, `scene-project.mjs`, `video-engine-cli.mjs`, `avatar-jobs.mjs`, `synthesize-avatar.mjs`, `asset-synthesizer.mjs`, `asset-cost-estimator.mjs`, `build-script-from-draft.mjs`, `build-draft-html.mjs`, `draft-template.html`, `SKILL.md` and `references/`. Two of its requirements are full copies of the presets change's versions (`Series Concept`, `Blueprint-Ships Draft Authoring Tools`); everything else has a distinct heading. No requirement is added twice and no file is created by both.

## Open questions (maintainer)

- [ ] D5: are blur variants still published (iNNteresante)? Blur stays opt-in regardless.
- [ ] D10: the real cache may already hold poisoned keyless placeholders under real keys. An audit (silence detection) is out of scope; file it separately.

## Not covered / verified only by reading

I had no shell, so nothing was run. Everything below comes from reading code and from read-only listings of `video_NN`.

- HyperFrames behaviour when `publicDir === assetsDir`, and whether CSS custom properties are inherited by sub-compositions (D5 avoids depending on the latter).
- That `fs.renameSync` replaces an existing master on Windows when the file is not open (an open file gives EPERM, which the error message must explain).
- Byte-identical derivations across ffmpeg builds (`-fflags +bitexact` only covers container metadata). The test asserts dimensions plus same-machine determinism.
- `scope: true` was confirmed in `cognitive-use-cases_scope_NN.md` and in all five real series (each has exactly one scope document and also legacy markers that will simply be ignored).
- The dimensions of the real `thumbnail_vertical.png`.
- That `_withResolvedVoice` (compile) and `resolveRegisteredVoice` (`assertAudioFresh`) produce equal options. This is inferred from `assertAudioFresh` succeeding today; slice 3's test proves it.
