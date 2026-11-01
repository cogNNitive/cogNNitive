# Design: Video Folder Contract

Change: `2026-11-01-video-folder-contract`, stacked after `2026-11-01-video-presets` (CHANGE-1). Inputs: `exploration.md`, `proposal.md`, CHANGE-1 `design.md`/`tasks.md`/specs. Roots: `<bp>` = `iNNfo/specs/bluepriNNts/video-script/`, `<skill>` = `<bp>skills/nn-video-script/`, `<scripts>` = `<skill>scripts/`. `E` = episode folder, `B` = `E/build/`.

Size note: the orchestrator asked for full trees, mappings and a coordination map, so this exceeds the skill's 800-word budget on purpose. Tables carry most of it.

## Technical Approach

- One layout, written once in `video-folder-contract`. Episodes stay at `series/<s>/assets/<slug>/`, which means no episode moves.
- Every engine-generated file goes under one gitignored `E/build/`.
- Deliverables are written in place at their final, slug-prefixed, dimension-named paths, so nothing is promoted.
- The 1920x1920 master size becomes a declared parameter. Every other format is a crop or scale of the master file.
- `description.md` gets a generated chapter block from measured durations.
- The workflow collapses to `estimate -> approve -> produce -> thumbnails -> finalize`.
- Series roots come from the nn-core scope chain only.
- A `layout` step joins CHANGE-1's migration pipeline.

No cache key changes (see the cache-key audit), so no re-billing exception is needed.

## Settled proposal defaults

| # | ASSUMED default | Verdict | Evidence / reason |
|---|---|---|---|
| 1 | Engine outputs in one gitignored `build/`, deliverables promoted by finalize | **Changed in part.** `build/` is kept. Promotion is dropped: render writes the master straight to `E/<slug>_1920x1920.mp4` (temp file in `B`, then a same-volume rename), and finalize writes the derived formats in place | Promotion copied a file of hundreds of MB for nothing. `finalize-video.mjs:85` reads a `renders/<ref>/` that is never produced |
| 2 | Crop by default, blur opt-in | **Confirmed.** `--fill crop\|blur`; blur outputs carry a `_blur` suffix | Open Gate protocol (`thumbnail-and-asset-pipeline.md:63-71`). Blur is still a pure function of the master (invariant 12) |
| 3 | `assets/<slug>/`; working files without slug or `V_`; deliverables slug-prefixed; rename `Hyperframes/` | **Changed in part.** (a) The script keeps `<slug>_video-script_<series>_NN.md`, because it is a domain-indexed document and stems must be unique (`nn-core.generated.cjs:7491-7510` indexes by stem; `build-script-from-draft.mjs:44` already writes this name). (b) `Hyperframes/` is NOT renamed by the migration: moving engine output to `build/hyperframes/` already removes the collision, and a rename would edit `asset::` paths and force re-approval. New episodes use `animations/` | Zero real episode moves |
| 4 | `master_resolution` in package Video Defaults, single option; `fps` reported only | **Confirmed.** Rows in D4 | Real script `resolution::` / `format::` are undeclared and never read |
| 5 | Drop all legacy markers; a series with only a marker is a conflict | **Confirmed, with one refinement.** A folder holding only `series_NN.md` is converted, not flagged: it is renamed to `<s>_scope_NN.md` and gains `scope: true`. The values are identical, so the keys are identical | `loadCascadeBags` fallback (`video-scope.mjs:159-163`) |
| 6 | Thumbnails stay 16:9 2560x1440, independent of the master | **Confirmed.** Named `<slug>_thumbnail_<W>x<H>.png` | `render-thumbnail.mjs:250-251` |
| 7 | #425: search `sounds/` only | **Confirmed.** The migration copies (never moves) any sound file that today resolves only under `shared/audio/` into `<s>/sounds/` | `video-engine-cli.mjs:209-218`. The real `shared/audio/` holds intro audio that is also referenced by path |
| 8 | Fix the keyless TTS placeholder | **Confirmed and widened**: keyless image placeholders also poison the real key | `asset-synthesizer.mjs:417-418` (TTS) and `:584-586` (a local SVG stored under the real image key) |
| 9 | Keep the `audio/` handoff, under `build/` | **Changed: dropped.** `synthesize-avatar` reads the TTS cache entry directly | The bytes are identical by construction (D7), and compile's avatar pickup already passes the cache path (`video-engine-cli.mjs:653`) |
| 10 | Rename the script to `migrate-video-domain.mjs` | **Confirmed**, in slice 6, with no alias | No-backwards-compat preference |
| 11 | Same `V_0-14-0` train | **Confirmed.** `V_0-14-1` only if `main` carries `V_0-14-0` first | Release-guard merge-base rule |

## Cache-key audit (HARD CONSTRAINT)

| Identity | Computed at | Contains a path or name? | Effect of this design |
|---|---|---|---|
| TTS key | `cache-manager.mjs:67-75`, `asset-synthesizer.mjs:400-401` | No: narration plus voice options | None |
| Image key | `video-engine-cli.mjs:463-469` → `asset-synthesizer.mjs:572` | Display names `"<scene> — <layer>"`, no path | None. No heading is renamed. **Rule:** the square master MUST NOT add `size` to `mediaOptions`. `options.size` is read at `asset-synthesizer.mjs:635`, and any key added to `options` enters the hash |
| Avatar key | `avatar-jobs.mjs:70-75` | No: image bytes plus audio bytes plus `{model, resolution}` | Audio now comes from the TTS cache instead of `audio/` (D7). Same bytes, same key |
| Avatar fallback key | `asset-synthesizer.mjs:481` `` `${imagePath}:${audioPath}` `` | **Yes** | Not reached: its only caller passes `cacheKey` (`synthesize-avatar.mjs:290-296`), and compile only reads the cache (`avatar-jobs.mjs:171-189`). Left untouched |
| `bgmusic:<file>` | `scene-compiler.mjs:688` | **Yes** (the authored relative path) | **Not a cache key.** It is a manifest track field with no reader under `scripts/` (grep finds only this producer and tests). It triggers no provider call. No music file is moved |
| Staged names | `video-engine-cli.mjs:275-294` | Basename plus content sha12 | Only the staging folder moves (invariant 9) |
| Domain root | `findDomainRoot` = nearest `domaiNN_NN.md` (`nn-core.generated.cjs:7404,7452-7464`); `?? start` at `video-guard.mjs:102` | n/a | `build/` sits under the episode, so the root is unchanged. The migration refuses when there is no `domaiNN_NN.md` and never moves `domaiNN_NN.md`, `.cognnitive/` or `video-guard.json` |
| Plan hash | `plan-approval.mjs:42-51` | Script text plus models | Not a cache. Migration edits to script text force re-approval at zero spend |
| `master_resolution` default | blueprint bag | n/a | Read by neither `buildTtsVoiceOptions` nor the image options. Covered by CHANGE-1's D9 golden |

## Architecture Decisions

### D1: Canonical layout and naming

**Context.** Three sources disagree. **Options:** keep `assets/<slug>/` (chosen) or use `videos/<slug>/` (rejected: it moves every real episode). **Consequence:** `assets/` means two things, the domain library and the episode folder. Both follow the iNNfo `{modelDir}/assets/` rule, so this is accepted.

```
<domain>/                                   AFTER (BEFORE differs only where marked *)
  domaiNN_NN.md  video-defaults_NN.md  video-guard.json  .gitignore(*managed block)
  .cognnitive/{cache/video/{tts,images,temp}, video-ledger.jsonl, pending-predictions.jsonl, locks/}
  sounds/ components/ frames/ procedures/ assets/<library>/
  series/<s>/
    <s>_scope_NN.md                          only anchor (*was also series_rules.md, script_template.md, video.series.json; now listed leftovers)
    shared/<kind>/  sounds/  components/  frames/
    assets/<slug>/
      <slug>_video-script_<s>_NN.md          Video record + script (unchanged)
      draft.json  reviewed.json  review_console.html  draft_thumbs/   (*<slug>_draft_V_x-y-z.json, <slug>_reviewed.json, <slug>_review_console.html, legacy <slug>_draft_<v>.html)
      media/  animations/<project>/          (*Hyperframes/ tolerated, not migrated)
      asset_plan.md  asset_plan.approved.json
      description.md                         (*descripcion_youtube.md)
      <slug>_1920x1920.mp4                   master (*master.mp4)
      <slug>_1080x1920.mp4 <slug>_1920x1080.mp4 <slug>_1080x1080.mp4   (*master_<WxH>.mp4 and <slug>_* families)
      <slug>_thumbnail_2560x1440.png  <slug>_thumbnail_1080x1920.png  (*thumbnail.png, thumbnail_vertical.png)
      build/                                 gitignored (*public/, hyperframes/, audio/, manifest.json at E root)
        .nn-build  manifest.json  render.tmp.mp4
        hyperframes/{index.html, compositions/, components/, authored/, assets/, .nn-emit.json, .hyperframes/}
        _legacy/                             migration parking for old engine outputs
```

| Class | Rule | slug | `V_` | Case |
|---|---|---|---|---|
| Domain-indexed documents (`_NN.md`) | `<stem>_<blueprint-or-role>_NN.md`; stem unique domain-wide | yes when per-episode or per-series | no | stems kebab |
| Working files inside `E` | fixed role names | no | no (git holds history) | `snake_case` |
| Deliverables leaving `E` (uploaded files) | `<slug>_<what?>_<W>x<H>.<ext>` by TRUE dimensions; blur adds `_blur` | yes | no | slug kebab, separators `_` |
| `description.md` | pasted, not uploaded | no | no | lowercase |
| Folders | lowercase; plural when they hold many items (`assets`, `sounds`, `components`, `frames`, `animations`, `procedures`), mass nouns singular (`media`, `shared`, `build`) | — | — | lowercase |
| Engine output | only under `B`, gitignored | — | — | — |

Every file and folder name is in English. Spanish names in the real domain are reported, not renamed.

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

**Manifest absolute paths** (`scriptSource`, `publicDir`, `frame.path`, `components[].path`) stay absolute. `render` now accepts only a script and recompiles every time (free on a full cache). A stale manifest therefore cannot be rendered, and invariant 8 holds by construction. Finalize rejects a manifest whose `scriptSource` is not the episode script, or which is older than the script.

**Collision fix:** engine output now lives at `B/hyperframes/`, never at `E/hyperframes/`.

**`.gitignore` (SKILL domain setup, plus a migration-managed block):** `**/build/`, `**/draft_thumbs/`, `.cognnitive/cache/`. `audio/` is NOT ignored: real episodes hold authored audio there (`adelanto-electoral/audio/00_gancho.wav`).

### D3: One master

**Options:**

| Option | Verdict |
|---|---|
| Keep `--format`/`--width`/`--height` | Rejected: the maintainer must remember them |
| Native dual master | Rejected by maintainer decision 4 |
| **Declared `master_resolution`** | **Chosen** |

`FORMAT_PRESETS`, `resolveFormatSize`, `--format/--width/--height` (`video-engine-cli.mjs:898-915,919-923,1004-1008`), the 9:16 recompile, and the `width/height` defaults in `scene-compiler.mjs:272-279,428-429,592-593` are all deleted. The compiler takes its size from `resolve('master_resolution', bags)`, parsed as `^(\d+)x(\d+)$`. Any other value is an `unsupported-master-resolution` error, raised before any spend.

### D4: Field Definition rows (post-change)

| Field | concept:: | type | options | Default (blueprint `video-defaults_NN.md`) | description |
|---|---|---|---|---|---|
| master_resolution | Video Defaults | select | [1920x1920] | `1920x1920` | Pixel size of the single rendered master. Every delivery format is derived from it; no format is rendered on its own. |
| master (rewrite) | Video | video | – | – | The episode's square master `<slug>_1920x1920.mp4`. Delivery formats are derived by `render-formats` and never modeled. |
| position (rewrite) | Layer | unchanged | unchanged | – | Overlay anchor inside the central safe square (the central 1080x1080 of the master). |

`resolution::`, `format::` and `fps::` stay undeclared. The migration removes the first two from scripts and reports `fps::`.

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

The square variant scales text by 0.5625 (40 px becomes 22.5 px). That is accepted. Domain components that ignore the contract are listed by the migration.

**Thumbnails** stay separate stills (2560x1440 default; vertical via `--width 1080 --height 1920`), named `<slug>_thumbnail_<W>x<H>.png`. The series title is read from the scope document.

**Finalize:** `node finalize-video.mjs <episode-dir> [--formats vertical,horizontal,square] [--fill crop|blur] [--force] [--dry-run]`. It derives the formats, refreshes the chapters in `description.md` (D6), and prints the field values `master:: <slug>_1920x1920.mp4` and `thumbnail:: <slug>_thumbnail_2560x1440.png`. It never writes the model. `master_vertical` and `voiceover` promotion are removed.

**Issues.** #428 (deprecate `render-formats` for an Open Gate dual master) is CLOSED as superseded: `render-formats` becomes THE derivation. #425 is CLOSED by D9.

### D6: `description.md`

- **Producer:** `finalize-video.mjs` through a new `lib/description.mjs`. The engine writes only the block between `<!-- nn:chapters:begin -->` and `<!-- nn:chapters:end -->`. The agent writes title, summary, sources and attribution.
- **When:** at finalize, after render. Before this change it was written before TTS.
- **Input:** `B/manifest.json` `tracks.scenes[]`: start = `floor(fromFrame / fps)` and title = `props.title`.
- **Format:** one line per scene, `MM:SS Title`, or `H:MM:SS` when the total is 1 h or more. The first line is `00:00`. It warns when there are fewer than 3 chapters or a chapter is under 10 s, because platforms may ignore those.
- **Creating the file:** if it is absent, finalize writes a skeleton (`# <title>`, the Video `description` field as the summary, Chapters, Sources, Attribution).
- **No markers in an existing file:** finalize inserts the block after the H1 and reports any handwritten `^\d{1,2}:\d{2}` lines.
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
| 6 | Script | `build-script-from-draft.mjs reviewed.json` | reviewed (+ sibling `draft.json`) | `<slug>_video-script_<s>_NN.md` | `--draft` is optional (reviewed carries every scene, `:204-247`) |
| 7 | Estimate | `asset-cost-estimator.mjs <script>` | script, cache | `asset_plan.md` (default next to the script) | boilerplate fixes, D10 |
| 8 | Approve | human in chat, `approve the plan <hash8>` → agent `approve-plan.mjs asset_plan.md --delegated "<phrase>"` | plan | `asset_plan.approved.json` | wording unified. The check is unchanged and accepts any phrase containing the hash (`plan-approval.mjs:103-106`) |
| 9 | Produce | `video-engine-cli.mjs produce <script> [model flags]` | approval | `B/manifest.json`, `E/<slug>_1920x1920.mp4` | see below |
| 10 | Thumbnails | `render-thumbnail.mjs` | base image | `<slug>_thumbnail_<W>x<H>.png` | stills, no cache |
| 11 | Finalize | `finalize-video.mjs <E>` | master, manifest | derived formats, chapter block, printed fields | promotion removed |
| 12 | Description prose + attribution | agent | sources | `description.md` outside the markers | moved after durations exist |
| 13 | Retrospective | agent | – | – | – |

**`produce` as one command.** The avatar key needs the TTS bytes, so the order inside `produce` stays compile → avatar → render. compile#2 is a pure cache read (`applyCachedAvatars`, `video-engine-cli.mjs:649-654`), so it folds into `render <script>`, which always compiles.

`produce` runs three phases:

1. compile: TTS and images; one approval.
2. `synthesizeAvatars`, only for jobs that are not cached, with the same flags object (invariant 7 now holds structurally).
3. render.

Behaviour:

- **Avatar exit 3:** `produce` exits 3 with the resume command. A re-run of `produce` is idempotent.
- **Primitives kept:** `compile`, `synthesize-avatar` and `render` remain available for dry-run and resume.
- **Missing clips:** `render` refuses when avatar clips are missing, unless `--allow-still-avatars` is passed, so minutes are not spent on a still-image render.
- **Removed:** `render <manifest.json>`.

**Shipped procedures.** The blueprint ships English `<bp>procedures/produce-video_procedures_NN.md` and `draft-scene-visuals_procedures_NN.md`, encoding this table with `{{slot:series_profile}}` / `{{slot:avatar_recipe}}`. The #429 pre-draft gate stays out of scope. The real domain's Spanish procedures are reported as superseded and are not edited.

### D9: Series root and #425

`findSeriesRoot(startDir)` returns the outermost folder scope link below the domain root of `findScopeChain` (`nn-core.generated.cjs:8355`). Scope markers are recognised by frontmatter `scope: true` (`:8339`), not by filename.

- **Errors:** `!ok` (for example `DUPLICATE_SCOPE_MARKER`) is surfaced, not swallowed.
- **Deleted:** `SERIES_MARKERS` and the `series_NN.md` fallback in `loadCascadeBags` (`video-scope.mjs:23,122-132,159-163`). This removes the legacy source that CHANGE-1 D3 names; preset lookup then uses scope documents only.
- **Updated consumers:** `video-engine-cli.mjs:675`, `render-thumbnail`, `build-script-from-draft.mjs:67-136`, `build-draft-html.mjs:10`.
- **Dev tooling:** stops reading `video.series.json`.
- **#425:** `resolveSoundFiles` searches only `sounds/` (`:209-218` deleted). A sound found only under `shared/audio/` becomes a D21 error before spend.
- **Marker conflicts:** see D11 L8.

### D10: Workflow fixes that do not touch keys

`asset-cost-estimator.mjs`:

- `:473` gives the in-chat phrase instead of `approve-plan.mjs <this file>`.
- The `- [ ]` list (`:509-514`) is replaced by the stamped model list.
- The hard-coded "Recommended" tier and "Speech 2.5 HD" (`:150,407-409`) are replaced by resolved ids.
- Images are quoted with compile's own predicate (prompt present, `video-engine-cli.mjs:461-462`).
- Cached items are priced at $0, so `total_usd` reflects what the run will actually charge. This also tightens the 1.25x cap. A cache emptied after the estimate makes compile refuse, which is the safe direction.

`checkApproval` hint (`:119`) uses the same phrase.

Keyless TTS and image placeholders are stored under `<key>-offline`, mirroring avatars (`asset-synthesizer.mjs:493`). Real keys are untouched. The offline SVG becomes 1920x1920, and it is not part of any key.

### D11: `layout` migration step

**CLI:** `node scripts/dev/migrate-video-domain.mjs <domain-dir> [--steps presets,layout] [--apply] [--json]`. This renames CHANGE-1's script with no alias.

- **Steps:** the default becomes `presets,layout`. Execution order is always canonical (`presets` then `layout`), whatever the argument order.
- **One scan, one report.** CHANGE-1's content selection is reused for the documents.
- **Virtual file plan:** `presets` emits content edits and `layout` emits `rename`, `write` and `mkdir` operations over the presets result.
- **Dry run** is the default and writes nothing.
- **`--apply` journal:** writes `<root>/.cognnitive/migrations/<iso>.json` (inverse operations) before any write. The operations are temp writes, then same-volume renames. Any failure rolls back from the journal.
- **Moves are renames, never copies.** The one exception is L9, which copies.
- **Exit codes:** 0 = ok or nothing to do; 1 = conflict (nothing written); 2 = usage error. The usage code must be aligned with CHANGE-1 1.11.
- **Never touched:** `.cognnitive/**` (except the journal), `domaiNN_NN.md`, `video-guard.json`, `media/`, `shared/`, the domain `assets/`, and Scene/Layer headings.

| Op | Rule |
|---|---|
| L1 | Engine outputs move to `B/_legacy/`: `public/`, `hyperframes/` only when it contains `.nn-emit.json`, `manifest.json`, `audio/<sceneId>_voiceover.mp3` files only (other files in `audio/` are authored and stay), and episode `renders/`. `B/.nn-build` is created |
| L2 | `master.mp4` becomes `<slug>_1920x1920.mp4` when the target is absent and ffprobe reports 1920x1920; otherwise it goes to `_legacy/` and the report says "re-render, zero provider spend". `master_<WxH>.mp4` goes to `_legacy/`. Existing `<slug>_<WxH>.mp4` files are kept |
| L3 | `descripcion_youtube.md` becomes `description.md`. Both present = conflict |
| L4 | Review files: the newest `<slug>_draft_V_*.json` becomes `draft.json` (older versions are listed); `<slug>_reviewed.json` becomes `reviewed.json`; `<slug>_review_console.html` becomes `review_console.html`; the legacy `<slug>_draft_*.html` goes to `_legacy/` |
| L5 | `thumbnail*.png\|jpe?g` becomes `<slug>_thumbnail_<W>x<H>.<ext>`, with dimensions from the PNG IHDR / JPEG SOF header. `thumbnail::`/`master::` values in selected documents are rewritten only on an exact match against the old relative path |
| L6 | The Video element's `resolution::` and `format::` are removed; `fps::` is reported |
| L7 | Authored `Hyperframes/` is reported only (D1 #3) |
| L8 | `series_NN.md` without a scope document becomes `<s>_scope_NN.md` plus `scope: true`. `series_NN.md` next to a scope document = conflict. `series_rules.md`/`script_template.md` with no scope document = conflict. With a scope document they are listed, as is `video.series.json` |
| L9 | #425: a resolved sound key whose file exists only under `shared/audio/` is copied into `<s>/sounds/` |
| L10 | Domain `.gitignore`: adds the managed block idempotently and reports obsolete lines (`.cognnitive-video/`, `.anydeo/`, `.remotion/`, `renders/`) |
| L11 | Lists, never deletes: `.bak*`, `_tmp_*`, `*-proto`, `_tts-ab-test`, Series-as-template records `*_video_NN.md`, `templates_*`, Spanish procedures, and domain `components/` lacking the safe inset. Forks are already listed by CHANGE-1 |

- **Conflicts (nothing written):** any of the conflicts above; a rename target with different content; a `build/` without `.nn-build`; or no `domaiNN_NN.md`.
- **Invalidation notice:** every script whose text changed (L5, L6, presets) is listed for re-estimate and re-approval (zero spend). Every episode is listed for `produce` or `render` (manifest regeneration).
- **Cache check:** the CHANGE-1 1.6a fixture gains layout cases. After `--steps presets,layout`, the TTS, image and avatar identities (avatar audio read from the cache) MUST equal the 1.6d golden, except CHANGE-1's listed precedence-fix scenes.

## Testing Strategy (Strict TDD) and slices

The proposal's slice order is changed so that the docs land after the behaviour they describe, and the migration lands last.

| # | Slice | RED tests first (in order) | Files |
|---|---|---|---|
| 1 | Series anchoring (E) + #425 | scope-only series resolves; marker-only does not; nested scopes resolve to the outermost; `DUPLICATE_SCOPE_MARKER` is surfaced; no `series_NN.md` fallback; `shared/audio` no longer searched (D21 error names searched dirs); thumbnail and script builder read the scope title; dev tools ignore `video.series.json`; retired-name scan additions (todo-gated) | `lib/video-scope.mjs`, `video-engine-cli.mjs` (sounds, seriesRoot), `render-thumbnail.mjs`, `build-script-from-draft.mjs`, `build-draft-html.mjs`, `scripts/dev/{lib/series-values,adopt-video-plan,validate-scope-golden}.mjs` + tests, `test/series-scope.test.mjs`, new `test/series-root.test.mjs` |
| 2 | Single master (B) + safe zones + #428 | contract: `master_resolution` row; image options carry no `size` (key equals golden); unsupported value refused before spend; manifest is 1920x1920; `--format/--width/--height` are a usage error; derivation args, names, refusal of a non-1920 master (ffprobe seam), real square scale (rewrite `render-formats.test.mjs:61-66`), `_blur` naming, skip existing; components carry the inset; no `center 12%` | `<bp>spec_NN.md`, `<bp>defaults/video-defaults_NN.md`, both catalogs, `scene-compiler.mjs`, `scene-project.mjs`, `video-engine-cli.mjs`, `render-formats.mjs`, `components/*.html`, new `test/master-resolution.test.mjs`, `test/safe-zone.test.mjs` |
| 3 | Build layout + workflow (D) | **cache first:** avatar key from the `audio/` copy equals the key from the cache entry; TTS and image keys unchanged on the golden fixture; cache dir = `<root>/.cognnitive/cache/video` with `build/` present; keyless TTS and image go to `-offline` and a later keyed run bills. **Then:** compile writes `B/manifest.json` and stages only into `B/hyperframes/assets` with no `public/` or `audio/`; render takes a script only and writes the master atomically; refuses still avatars; `produce` ordering with fakes (one flags object, exit 3 propagated); full-cache re-run adds zero ledger entries; estimator boilerplate strings | `video-engine-cli.mjs`, `hyperframes-render.mjs`, `synthesize-avatar.mjs`, `lib/avatar-jobs.mjs`, `asset-synthesizer.mjs`, `asset-cost-estimator.mjs`, `lib/plan-approval.mjs`, new `test/build-layout-cache-identity.test.mjs`, `test/produce.test.mjs`, `test/keyless-placeholder.test.mjs` |
| 4 | `description.md` (C) + finalize | chapters `floor`, `MM:SS`/`H:MM:SS`, outside-marker text preserved, skeleton, handwritten-timestamp report, stale-manifest refusal; finalize has no `renders/`, derives formats, prints fields | `finalize-video.mjs`, new `lib/description.mjs`, `test/finalize-video.test.mjs` (rewrite), new `test/description.test.mjs` |
| 5 | Contract, docs, authoring names (A) | cross-check test: the spec, `folder-contract.md` and SKILL.md describe one tree; default names `draft.json`/`reviewed.json`/`review_console.html`; no legacy alias; shipped procedures validate; retired-name scan un-gated | SKILL.md, `references/{folder-contract,thumbnail-and-asset-pipeline,overlay-slots,cost-guardrails}.md`, `build-draft-html.mjs`, `build-script-from-draft.mjs`, `draft-template.html` (only if needed), `<bp>procedures/*_procedures_NN.md`, new `test/folder-contract-crosscheck.test.mjs` |
| 6 | `layout` migration (F) | each L1-L11 rule; dry run writes nothing; injected-failure rollback; second run reports zero; conflicts exit 1; usage exit 2; one combined report; golden identities after `presets,layout`; `.gitignore` idempotent | `scripts/dev/migrate-video-domain.mjs` (renamed), `scripts/dev/lib/video-layout-migration.mjs` (new), CHANGE-1 migration lib (step registry), tests and fixtures |

**Retired names added to CHANGE-1's scan:** `videos/{`, `.cognnitive-video`, `renders/<ref>`, `--format`, `master_vertical`, `descripcion_youtube`, `SERIES_MARKERS`, `series_rules.md`, `script_template.md`, `video.series.json`, `FORMAT_PRESETS`, `isHorizontal`, `_draft_<version>.html`. Migration fixtures are excluded.

**Release checklist:**

- [ ] No version bump (same unreleased `V_0-14-0`), or `V_0-14-1` in slice 2 if `main` already has `V_0-14-0`.
- [ ] Catalogs regenerated after slice 2.
- [ ] `bluepriNNt-field-catalogue` and `metaschema-selfdescribe` tests green.
- [ ] `guard-template-immutability` green.
- [ ] Shipped `procedures/` folder checked against the blueprint inventory/catalog guards.
- [ ] Skill `version:` bumped once (slice 5), coordinated with CHANGE-1.
- [ ] `check:spec-urls` passes: no bare slug in `openspec/specs`.
- [ ] `verify.js` shape-discovery picks up the new tests.

## Coordination map

| Cross-dependency | CHANGE-1 id | Blocks | Merge / rebase order |
|---|---|---|---|
| Pipeline CLI, step registry, atomic apply | D8, task 1.11 | CHANGE-1 1.11 → our slice 6 | slice 6 rebased on CHANGE-1 slice 4 tip |
| Real-domain fixture + before-golden | D9, 1.6a/1.6d, 2.1a | → our slices 3 and 6 | extend the fixture; never regenerate the golden |
| Retired-vocabulary scan | 1.5, 1.6b, 4.7 | → our slice 1 (additions), slice 5 (un-gate after 4.7) | — |
| `video-scope.mjs` (`bagsToChain`, `loadCascadeBags`, D3 legacy `series_NN.md` source) | D3, 2.8 | 2.8 → our slice 1 | we delete the D3 legacy source; this is recorded as a CHANGE-1 D3 follow-up |
| `scene-compiler.mjs`, `scene-project.mjs` | 2.9, 3.5, 3.6 | → our slice 2 | — |
| `synthesize-avatar.mjs`, `avatar-jobs.mjs`, `asset-synthesizer.mjs`, `asset-cost-estimator.mjs` | 3.5, 3.6 | → our slice 3 | — |
| `spec_NN.md` V_0-14-0, defaults, catalogs | 1.7, 1.8, 1.13, 2.11 | → our slice 2 | same train, no extra bump |
| `build-script-from-draft`, `build-draft-html`, `draft-template.html` | 4.4, 4.1a | → our slices 1 and 5 | — |
| Dev tooling (`series-values`, `adopt-video-plan`, `validate-scope-golden`) | 4.5 | → our slice 1 | — |
| SKILL.md, references | 4.6 | → our slice 5 | — |
| `video-series-folders`, VPH deltas | VSF, VPH specs | our deltas modify capabilities CHANGE-1 creates | our archive after CHANGE-1 4.10 |
| Legacy-marker follow-up | 4.11, 4.12 | received here (D9) | — |
| Release | slice-1 bump | neither merges alone | `feature-branch-chain`: CHANGE-1 S1→S4, then ours S1→S6, stacked; the tracker merges once |
| Real-domain migration | — | both chains merged | maintainer runs `--steps presets,layout` once |

## Open questions (maintainer)

- [ ] D8: approve `produce` and the `render` refusal of still avatars (`--allow-still-avatars`)?
- [ ] D8: ship English procedures in the blueprint now, or defer to #429?
- [ ] D5: are blur variants still published (iNNteresante)? Blur stays opt-in regardless.
- [ ] D10: the real cache may already hold poisoned keyless placeholders under real keys. An audit (silence detection) is not in scope. File it separately?

## Not covered / verified only by reading

I had no shell, so nothing was run. Everything below comes from reading code and from read-only listings of `video_NN`.

- HyperFrames behaviour when `publicDir === assetsDir`, and whether CSS custom properties are inherited by sub-compositions (D5 avoids depending on the latter).
- That `fs.renameSync` replaces an existing master on Windows when the file is not open (an open file gives EPERM, which the error message must explain).
- Byte-identical derivations across ffmpeg builds (`-fflags +bitexact` only covers container metadata). The test asserts dimensions plus same-machine determinism.
- `scope: true` was confirmed only in `cognitive-use-cases_scope_NN.md`; the other series markers were not opened.
- The dimensions of the real `thumbnail_vertical.png`, and whether the quine console embeds its own filename.
- That `_withResolvedVoice` (compile) and `resolveRegisteredVoice` (`assertAudioFresh`) produce equal options. This is inferred from `assertAudioFresh` succeeding today; slice 3's test proves it.
