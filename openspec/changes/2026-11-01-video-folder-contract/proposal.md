# Proposal: Video Folder Contract

Standalone change. It ships **after** `2026-11-01-video-presets` as its own release (`V_0-14-1`) and consumes that change's naming convention. Inputs: `exploration.md` (authoritative for the real-domain findings), `design.md`. Roots: `<bp>` = `iNNfo/specs/bluepriNNts/video-script/`, `<skill>` = `<bp>skills/nn-video-script/`.

## Intent

The `video-script` bluepriNNt documents a folder layout, file names, master formats and a workflow that the engine does not produce and that the real domain does not use.

| Problem | Evidence |
|---|---|
| Three sources disagree on the layout | living spec `video-folder-contract` (`series/{s}/videos/{v}/`), `references/folder-contract.md` (`assets/<video-slug>/`, `shared/`), real domain (`assets/<episode>/`, `shared/audio/`) |
| Documented but never produced | `renders/<ref>/` (finalize throws "No render refs found"), `.cognnitive-video/`, `voiceover.<ext>`, Series as `{Name}_V_x-y-z_video_NN.md` |
| Produced but undocumented | `manifest.json`, `public/`, `hyperframes/`, `audio/`, `draft_thumbs/`, `*_reviewed.json`, consoles, `.nn-emit.json`, `descripcion_youtube.md`; `.gitignore` misses all of them |
| Five names for one artifact | series record and script naming; slug repeated 3-4 times per path; `V_` on some files only; `Hyperframes/` vs `hyperframes/` case collision |
| Master formats contradict | dual-master 9:16 recompile, `--format`, a `-c copy` "square" labelled 1080x1080 that is 1920x1920, blur-fill shrinking content by about 44%, against the Open Gate crop protocol |
| Description written before durations exist | chapter timestamps guessed (00:23 vs measured 26.2 s); YouTube-only name in Spanish |
| Series root anchored by dead files | `SERIES_MARKERS` ignores `*_scope_NN.md`; `script_template.md` is dead but load-bearing |

Goal: one canonical folder and naming scheme, one 1920x1920 master, a measured platform-neutral `description.md`, and a simpler workflow, without one repeated provider request.

## Scope

### In Scope
- **A** Contract reconciliation: one canonical folder and file naming scheme across living specs, `references/folder-contract.md`, SKILL.md, engine and finalize; `.gitignore` guidance matching real engine outputs; removal of the legacy `_draft_<version>.html` alias.
- **B** Single 1920x1920 master; derived formats as pure functions of it; retire the 9:16 recompile, `--format`, `--width/--height` and the mislabelled square copy.
- **C** Platform-neutral `description.md`; finalize prints its chapters from the manifest's measured durations and the agent writes the file.
- **D** Workflow simplification that preserves the cache: engine output under one `build/` folder, one staging layer, finalize that matches what render writes, truthful `asset_plan.md` boilerplate, keyless placeholders stored offline.
- **E** Legacy series markers removal: `findSeriesRoot` delegates to the nn-core scope chain (`*_scope_NN.md`); `SERIES_MARKERS`, the `series_NN.md` fallback and `video.series.json` stop anchoring anything.
- **F** Resolve issues #425 (named sounds only in `sounds/`) and #428 (closed as superseded by B).

### Out of Scope
- **Any migration or conversion of existing documents, episodes or domains.** This change ships no migration tool, no rename script and no layout step; an episode produced with an earlier blueprint version stays exactly as it is. Folders and files of existing episodes are not moved or renamed by this change.
- The `produce` command and a still-avatar override flag. The engine keeps `compile`, `synthesize-avatar` and `render` as separate commands in that order.
- Shipping `procedures/` inside the blueprint. Issue #429 owns that.
- Layers in Presets.
- Any nn-core resolver or loader change.
- Console features #426/#427 (sequenced after this change); #429 pre-draft gate (consumes this contract later).
- Vector actor catalog, `sample-media-fields`.
- Renaming Scene or Layer display names (invariant 3: re-bills images); tone/sound-tag duplication (reported only, never edited); quality-tier vocabulary (#426/#427).
- A render, format or thumbnail cache (invariant 11).

## Capabilities

### New Capabilities
- `video-publication-description`: platform-neutral `description.md` per episode, whose chapters are printed from the compiled manifest's measured scene starts; distinct from the Video `description` field.

### Modified Capabilities
- `video-folder-contract`: canonical episode/series/domain layout and file names; no-upward-escape unchanged; ephemeral set = real engine outputs plus `.cognnitive/cache/` at the domain root (drop `.cognnitive-video/`); finalize reads the master and manifest, not `renders/<ref>/`.
- `video-asset-pipeline`: REQ-3 naming aligned with the canonical scheme (thumbnail names).
- `video-production-hierarchy`: REMOVE "Series Represented as a Reused Video-Template Model"; Series = folder anchored by its scope document.
- `video-template`: generation procedure requirement aligned with the simplified workflow (single master, description after compile).
- `cognnitive-video-engine`: format variants derived from the 1920x1920 master by crop; master size declared, not a CLI flag; engine output under `build/`; render writes the master in place and refuses missing avatar clips; avatar synthesis reads the TTS cache; keyless placeholders never stored under a real key; cache identity is layout-independent.
- `video-script-skill`: workflow (estimate, approve, compile, avatar, render, thumbnails, finalize); finalize; series root by scope marker; review-file names; one in-chat approval phrase.
- `two-phase-thumbnail`: series lookup by scope document; output names and size unchanged in spirit (separate stills, named by dimensions).
- `video-series-folders` (created by the presets change): `sounds/` as the single named-sound location (#425).
- `video-blueprint`: `master_resolution` and the single-master Field descriptions; this change's own version bump.
- `video-script-model`: `master_resolution`, the `master`/`position` texts, and the `Series` carried set.
- `workspace-directory-conventions`: the scope-anchored series tree and the gitignored engine directories.

## Approach

| WS | Approach |
|---|---|
| A | Write the canonical scheme once in `video-folder-contract`; `folder-contract.md` and SKILL.md restate it and nothing else. Episode `series/<s>/assets/<slug>/` (the iNNfo `{modelDir}/assets/{slug}/` rule, zero moves in the real domain), series shared `series/<s>/shared/`, engine outputs in one episode `build/` folder. Working files inside a slug folder carry neither slug nor `V_`; deliverables that leave the folder carry the slug. |
| B | Master size is a declared value in the package Video Defaults (`master_resolution`, single option `1920x1920`); remove `FORMAT_PRESETS`, `--format/--width/--height`, `isHorizontal` headroom and the 9:16 route. `render-formats` derives `<slug>_<W>x<H>.mp4` by true dimensions; square is a real 1080x1080 scale. Close #428. |
| C | `lib/description.mjs` + finalize read `manifest.json` `tracks.scenes[].fromFrame/fps` and `props.title` and print `MM:SS Title` lines; the agent writes title, summary, chapters, sources and attribution. |
| D | Every hardcoded location (`video-engine-cli.mjs:670,703,509,782`, `finalize-video.mjs:85`, `synthesize-avatar.mjs:123`) moves together. One staging layer (`build/hyperframes/assets`). The `audio/` handoff is dropped: `synthesize-avatar` reads the TTS cache directly. `render` compiles every time (free on cache). |
| E | `findSeriesRoot` delegates to the nn-core scope chain (`*_scope_NN.md`); `SERIES_MARKERS` and the `series_NN.md` fallback deleted; dev tooling stops reading `video.series.json`. |
| F | #425: one lookup rule, `sounds/` walk; drop the `shared/audio` search. #428: closed as superseded by B. |

## Cache preservation (success criteria; a violation is a defect)

1. Cache stays at `<findDomainRoot>/.cognnitive/cache/video/{tts,images,temp}`; domain-root detection unchanged (no `?? scriptDir` relocation).
2. TTS key = narration + `{model, voice, speed?, emotion?, modelOverride?, voiceId?}`; no path, name or dimension enters it.
3. Image key keeps `"<scene.name> — <layer.name>"`; no display name is renamed by code.
4. Avatar key = image bytes + audio bytes + `{model, resolution}`; `temp/*.mp4` kept, never garbage-collected.
5. Audio fed to `synthesize-avatar` is byte-identical to the TTS cache entry (now read from the cache itself).
6. Approval hash = full script text + `--*-model` flags; script edits force re-approval at zero spend.
7. Compile and `synthesize-avatar` receive identical `--*-model` flags.
8. `render` compiles from the script on every run, so a manifest written before a script or folder edit can never be rendered.
9. Content-addressed staging names `<base>_<sha12>` kept.
10. Ledger, journal, locks, `video-guard.json` stay at the domain root.
11. No render/format/thumbnail cache is introduced.
12. Derived formats are pure functions of the 1920x1920 master file.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Moving engine output leaks a path into a key or relocates the cache | Med | Cache-identity test first; invariants 1 and 9 covered by a guard test |
| `bgmusic:<file>` hash may contain a path; a sound move could change it | Low | Verified: it is a manifest field with no reader under `scripts/` (`scene-compiler.mjs:688` is the only producer) and no file is moved by this change |
| Crop cuts `lower-third` (`bottom:12%`) and `caption` (`bottom:10%`) | High | Safe-zone inset in the same slice as B |
| Blur-filled variants are still published (2026-10-27 assumption for iNNteresante) | Med | Blur kept as an opt-in mode with a `_blur` suffix |
| Series anchored only by legacy markers loses its root | Low | Not present in the real domain (all 5 series carry a scope document); the code surfaces `DUPLICATE_SCOPE_MARKER` and never falls back to a marker |
| Rebase conflicts with the presets change on shared files | High | This change is stacked after it: branches from the presets tip, not from `dev` |

## Rollback

Revert this change's slice commits; the presets release stays intact. Existing episodes and their documents are untouched by construction, so nothing in a domain needs restoring. Cache keys are untouched, so the cache stays valid in both directions.

## Success Criteria

- [ ] Invariants 1-12 each covered by a test.
- [ ] A re-run of compile, avatar synthesis and render on a full cache after the `build/` move makes zero provider requests (zero new ledger entries).
- [ ] `rg` outside `archive/` finds no `master_vertical`, `descripcion_youtube`, `SERIES_MARKERS`, `FORMAT_PRESETS`, `isHorizontal`, `_draft_<version>.html`, `renders/<ref>` or `--format 9:16`.
- [ ] ffprobe of every derived output equals its name's `<W>x<H>`; deriving twice gives identical files.
- [ ] Printed chapter starts equal manifest `fromFrame/fps`, floored to seconds.
- [ ] A fixture series with only `*_scope_NN.md` resolves its root; legacy markers are never read.
- [ ] Spec, `folder-contract.md` and SKILL.md describe one layout (cross-check test).
- [ ] #425 and #428 closed with links; `node scripts/verify.js` green.

## Delivery

Expected well above 400 changed lines; chained PRs, branched from the presets tip:

1. Series anchoring (E) and #425.
2. Single master and derived formats (B), safe zones, #428.
3. Engine output location and workflow (D), cache-identity test first.
4. `description.md` (C) and finalize in place.
5. Contract and docs (A), retired-name scan un-gated.

## Decisions taken

| # | Decision | Verdict | Cost of the alternative |
|---|---|---|---|
| 1 | Engine outputs location | One gitignored `build/` per episode, no `<ref>` level; deliverables written in place, no promotion | Keeping them at the root keeps the case collision, needs per-file `.gitignore` and leaves finalize guessing |
| 2 | Derived formats: crop vs blur | Crop by default, blur opt-in with `_blur` | Blur only: content about 44% smaller, contradicts the Open Gate protocol |
| 3 | File naming scheme | Episode `assets/<slug>/`; working files without slug or `V_`; deliverables slug-prefixed; authored `Hyperframes/` tolerated, new episodes use `animations/`; the script keeps `<slug>_video-script_<s>_NN.md` (domain-indexed, stems unique) | `videos/<slug>/` would move every episode and deviate from the iNNfo element-folder rule |
| 4 | Master size declaration | `master_resolution` in package Video Defaults, single option `1920x1920` | CLI flags: the maintainer must remember them, and the undeclared `resolution::` stays |
| 5 | Legacy series markers | Drop all; scope document only; no conversion of existing folders | Keeping: dead files keep anchoring roots |
| 6 | Thumbnails | Stay separate 16:9 2560x1440 stills, independent of the master, named by dimensions | Deriving them from the master: frame-grab quality, contradicts the 2026-10-27 separate-design decision |
| 7 | #425 sound location | `sounds/` walk only | Two rules, and `audio/` collides with the engine handoff |
| 8 | Keyless placeholders | Stored under `<key>-offline`, mirroring avatars, for TTS and images | A keyless run poisons the cache a later keyed run reads |
| 9 | `audio/` handoff | Dropped; `synthesize-avatar` reads the TTS cache | Keeping it means preserving a copy whose only purpose was the key input |
| 10 | Version | `V_0-14-1`, its own release after the presets release | Sharing the presets bump would make two releases impossible |
