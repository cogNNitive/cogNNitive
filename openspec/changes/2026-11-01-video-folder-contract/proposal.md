# Proposal: Video Folder Contract

Companion of `2026-11-01-video-presets` (CHANGE-1), stacked after it. Inputs: `exploration.md` (authoritative), CHANGE-1 proposal/design/tasks. Roots: `<bp>` = `iNNfo/specs/bluepriNNts/video-script/`, `<skill>` = `<bp>skills/nn-video-script/`.

## Intent

The `video-script` bluepriNNt documents a folder layout, file names, master formats and a workflow that the engine does not produce and the real domain does not use.

| Problem | Evidence (exploration) |
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
- **C** Platform-neutral `description.md` whose chapter block is generated after compile from measured durations.
- **D** Workflow simplification that preserves the cache (engine output location, one staging layer, finalize that matches what render writes, truthful `asset_plan.md` boilerplate).
- **E** Legacy series markers removal: `findSeriesRoot` learns `*_scope_NN.md`; `series_NN.md`, `series_rules.md`, `script_template.md`, `video.series.json` stop anchoring anything (absorbs `video-legacy-series-markers`).
- **F** Migration step group `layout` in CHANGE-1's pipeline.
- **G** Resolve issues #425 and #428.

### Out of Scope
- Layers in Presets.
- Any nn-core resolver or loader change.
- Console features #426/#427 (sequenced after both changes); #429 pre-draft gate (consumes this contract later).
- Vector actor catalog, `sample-media-fields`.
- Migrating the external `video_NN` domain: only the `layout` step is provided; the maintainer runs it once.
- Renaming Scene or Layer display names (invariant 3: re-bills images); tone/sound-tag duplication (reported only); quality-tier vocabulary (#426/#427).
- A render, format or thumbnail cache (invariant 11).

## Capabilities

### New Capabilities
- `video-publication-description`: platform-neutral `description.md` per episode; chapter block generated from the compiled manifest's measured scene starts; attribution section; distinct from the Video `description` field.

### Modified Capabilities
- `video-folder-contract`: canonical episode/series/domain layout and file names; no-upward-escape aligned with the relaxed spec; ephemeral set = real engine outputs plus `.cognnitive/` at the domain root (drop `.cognnitive-video/`); finalize promotes from where render writes, not `renders/<ref>/`.
- `video-asset-pipeline`: REQ-3 naming aligned with the canonical scheme (thumbnail names).
- `video-production-hierarchy`: REMOVE "Series Represented as a Reused Video-Template Model"; Series = folder anchored by its scope document. Builds on CHANGE-1's wording delta.
- `video-template`: generation procedure requirement aligned with the simplified workflow (single master, description after compile).
- `cognnitive-video-engine`: "Format variants with blur fill" replaced by derivation from the 1920x1920 master; master size declared, not a CLI flag; engine output location; keyless TTS placeholder never stored under a real key (if decision 8 holds).
- `video-script-skill`: "Render Step" (drop native `--format 9:16` vertical master); workflow steps; finalize; series root by scope marker; review-file names; `layout` migration step.
- `two-phase-thumbnail`: series lookup by scope document instead of `series_NN.md`; output names and size per decision 6.
- `video-series-folders` (created by CHANGE-1): series level anchored by the scope document; `sounds/` as the single named-sound location (#425).

### Removed Capabilities
- None (only the requirements named above).

## Approach

| WS | Approach |
|---|---|
| A | Write the canonical scheme once in `video-folder-contract`; `folder-contract.md` and SKILL.md restate it and nothing else. ASSUMED layout: episode `series/<s>/assets/<slug>/` (iNNfo `{modelDir}/assets/{slug}/` rule, zero moves in the real domain), series shared `series/<s>/shared/`, engine outputs in one episode `build/` folder (decision 1). Working files inside a slug folder carry neither slug nor `V_`; deliverables that leave the folder carry the slug. Consume CHANGE-1's naming convention; new names listed here only. |
| B | Master size is a declared value in the package Video Defaults (`master_resolution`, single option `1920x1920`); remove `FORMAT_PRESETS`, `--format/--width/--height`, `isHorizontal` headroom, the 9:16 route. `render-formats` derives `<slug>_<W>x<H>.mp4` by true dimensions; square is a real 1080x1080 scale. Derivation per decision 2. Close #428. |
| C | Skill script reads `manifest.json` `tracks.scenes[].fromFrame/fps` and `props.title`, writes or refreshes only the chapter block of `description.md`; prose and attribution stay agent-authored. Step moves after compile #2. |
| D | Every hardcoded location (`video-engine-cli.mjs:670,703,509,782`, `finalize-video.mjs:85`, `synthesize-avatar.mjs:123`) moves together. One staging layer (design picks `public/` or `hyperframes/assets/`); `audio/` handoff kept, moved under `build/` (ASSUMED). Compile-twice kept (free on cache). |
| E | `findSeriesRoot` delegates to the nn-core scope chain (`*_scope_NN.md`); `SERIES_MARKERS` deleted; dev tooling stops reading `video.series.json`. |
| F | Add `layout` to the pipeline; rename script to `migrate-video-domain.mjs` (ASSUMED). Renames `descripcion_youtube.md`, relocates engine outputs, collapses `master_*`/`<slug>_*`, removes undeclared `resolution::`/`format::`, updates the domain `.gitignore`; lists leftovers and legacy markers, never deletes them; a series anchored only by a legacy marker is a conflict (no writes). |
| G | #425: one lookup rule, `sounds/` walk; drop `shared/audio` and `audio` searches (`audio/` also collides with the engine handoff). #428: closed as superseded by B. |

## Cache preservation (success criteria; a violation is a defect)

A change that alters any cache key, or makes a re-run repeat a provider request the cache satisfies, is a defect. Each invariant is a checkable criterion:

1. Cache stays at `<findDomainRoot>/.cognnitive/cache/video/{tts,images,temp}`; domain-root detection unchanged (no `?? scriptDir` relocation).
2. TTS key = narration + `{model, voice, speed?, emotion?, modelOverride?, voiceId?}`; no path, name or dimension enters it.
3. Image key keeps `"<scene.name> — <layer.name>"`; no display name is renamed by code or migration.
4. Avatar key = image bytes + audio bytes + `{model, resolution}`; `temp/*.mp4` kept, never garbage-collected.
5. Audio fed to `synthesize-avatar` is byte-identical to the TTS cache entry.
6. Approval hash = full script text + `--*-model` flags; script edits force re-approval at zero spend.
7. Compile and `synthesize-avatar` receive identical `--*-model` flags.
8. Any folder move is followed by a recompile (absolute paths in `manifest.metadata`); the report says so.
9. Content-addressed staging names `<base>_<sha12>` kept.
10. Ledger, journal, locks, `video-guard.json` stay at the domain root.
11. No render/format/thumbnail cache is introduced.
12. Derived formats are pure functions of the 1920x1920 master file.

## Coordination with CHANGE-1

- **Migration**: one script, ordered steps `--steps presets[,layout]`, one document scan, one dry-run report, one atomic `--apply`, idempotent. This change adds `layout` without altering the `presets` contract.
- **Release**: same unreleased `V_0-14-0` train, no further bump (ASSUMED); if CHANGE-1 reaches `main` first, this change needs `V_0-14-1`. Neither merges to `main` alone; `feature-branch-chain` on CHANGE-1's tracker, or a held `dev`->`main` batch.
- **Order**: stacked after CHANGE-1; archives after it (the `video-series-folders` delta targets a capability CHANGE-1 creates).
- **Vocabulary**: CHANGE-1 "Naming convention" is consumed, not redefined. New names introduced here: `description.md`, `build/`, `master_resolution`, `<slug>_<W>x<H>.mp4`, step `layout`.
- **Real domain**: migrated ONCE, after both land, with `--steps presets,layout`.

| Blocker | Blocks |
|---|---|
| CHANGE-1 1.11 (pipeline CLI) | F |
| CHANGE-1 1.6a/1.6d (real-domain fixture, before-golden) | this change's cache test (extends the same fixture with layout cases) |
| CHANGE-1 1.5 (retired-vocabulary scan) | A/B/F retired names added to the same scan |
| CHANGE-1 2.8 (`lib/video-scope.mjs`) | E (same file) |
| CHANGE-1 4.4/4.6 (`build-script-from-draft`, `draft-template.html`, SKILL.md, references) | A, C, D doc and tool edits |
| CHANGE-1 archive | this change's archive |
| This change, all slices | real-domain migration; #426/#427/#429 |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Moving engine outputs leaks a path into a key or relocates the cache | Med | Before/after cache-identity test on the shared fixture; invariant 1 test |
| `bgmusic:<file>` hash (CHANGE-1 D5) may contain a path; sound moves (#425) could change it | Med | Design verifies before F; if path-bearing, F moves no referenced file |
| Crop cuts `lower-third` (`bottom:12%`) and `caption` (`bottom:10%`) | High | Safe-zone offsets in the same slice as B |
| Blur-filled variants are still published (2026-10-27 assumption for iNNteresante) | Med | Decision 2 keeps blur as an opt-in mode |
| Series anchored only by legacy markers loses its root | Med | F reports it as a conflict before apply |
| Rebase conflicts with CHANGE-1 on shared files | High | Stack strictly after the listed blockers |
| Proposal exceeds the 450-word skill budget | Certain | Requested coordination content; tables used |

## Rollback

Revert this change's slice commits on the chain; CHANGE-1 stays intact. The real domain is restored from its pre-migration copy (dry-run default, report lists every change). Cache keys are untouched by construction, so the cache stays valid in both directions; only `manifest.json` needs a recompile.

## Success Criteria

- [ ] Invariants 1-12 each covered by a test; on the real-domain-shaped fixture, `--steps presets,layout` leaves TTS, image and avatar identities equal to CHANGE-1's golden (except its listed precedence-fix scenes).
- [ ] A re-run of compile, avatar synthesis and render after `layout` on a full cache makes zero provider requests (zero new ledger entries).
- [ ] `rg` outside `archive/` and migration fixtures finds no `videos/{`, `.cognnitive-video`, `renders/<ref>`, `--format 9:16`, `master_vertical`, `descripcion_youtube`, `SERIES_MARKERS`, `_draft_<version>.html`.
- [ ] ffprobe of every derived output equals its name's `<W>x<H>`; deriving twice gives identical files.
- [ ] `description.md` chapter starts equal manifest `fromFrame/fps`, floored to seconds.
- [ ] A fixture series with only `*_scope_NN.md` resolves its root; legacy markers are never read.
- [ ] `layout`: dry-run writes nothing, second run reports zero changes, leftovers and markers listed never deleted.
- [ ] Spec, `folder-contract.md` and SKILL.md describe one layout (cross-check test).
- [ ] #425 and #428 closed with links; `node scripts/verify.js` green.

## Delivery

Expected well above 400 changed lines; chained PRs on CHANGE-1's tracker:

1. Contract and docs (A, spec deltas, retired-name scan).
2. Series anchoring (E) and #425.
3. Single master and derived formats (B), safe zones, #428.
4. Engine output location and workflow (D), cache-identity test first.
5. `description.md` (C).
6. `layout` migration step (F), last because it encodes final names.

`sdd-tasks` must forecast per slice; slices 3, 4 and 6 are likely High risk.

## Decisions needed from the maintainer (ordered by importance)

| # | Decision | Recommendation (default if unanswered) | Cost of the alternative |
|---|---|---|---|
| 1 | Engine outputs location | One gitignored `build/` per episode, no `<ref>` level, deliverables promoted to the episode root by finalize. ASSUMED | Keep at root: per-file `.gitignore`, case collision stays, finalize still needs a rewrite |
| 2 | Derived formats: crop vs blur | Crop by default (Open Gate protocol), blur kept as opt-in mode. ASSUMED | Blur only: content about 44% smaller, contradicts the protocol; crop only: drops variants iNNteresante may publish |
| 3 | File naming scheme | Episode `assets/<slug>/`; working files without slug or `V_`; deliverables slug-prefixed; authored `Hyperframes/` renamed so it cannot collide. ASSUMED | `videos/<slug>/`: moves every real episode, deviates from the iNNfo element-folder rule |
| 4 | Master size declaration | `master_resolution` in package Video Defaults, single option `1920x1920`; `fps` reported only. ASSUMED | CLI flags: the maintainer must remember them; undeclared `resolution::` stays |
| 5 | Legacy series markers | Drop all; scope document only; marker-only series is a migration conflict. ASSUMED | Keep: dead files keep anchoring roots, `video-legacy-series-markers` stays open |
| 6 | Thumbnails | Stay 16:9 2560x1440, independent of the master; vertical still named by dimensions. ASSUMED | Derive from master: frame-grab quality, contradicts the 2026-10-27 separate-design decision |
| 7 | #425 sound location | `sounds/` walk only. ASSUMED | Keep `shared/audio`/`audio`: two rules, `audio/` collides with the engine handoff |
| 8 | Keyless TTS placeholder under the real key | Fix here, test-first, with an offline suffix like avatars. ASSUMED | Defer: a keyless run can poison the cache the migration relies on |
| 9 | `audio/` handoff | Keep, under `build/`. ASSUMED | Read cache directly: synthesize-avatar must resolve the exact cache path (invariants 1, 5, 7) |
| 10 | Script rename to `migrate-video-domain.mjs` | Yes, in slice 6. ASSUMED | Keep name: misleading once `layout` exists |
| 11 | Version | Same `V_0-14-0` train. ASSUMED | `V_0-14-1`: required only if CHANGE-1 reaches `main` first |

## Proposal question round

Not asked directly (sub-agent). For maintainer review:

1. Which deliverables per episode actually ship today (square, vertical, horizontal; blur or crop)? Drives decision 2.
2. Must a downloaded deliverable be self-identifying outside its folder? Drives decision 3.
3. Which platforms consume `description.md`, and do any need sections the others must not see?
4. Do any series other than `cognitive-use-cases` rely only on legacy markers?
