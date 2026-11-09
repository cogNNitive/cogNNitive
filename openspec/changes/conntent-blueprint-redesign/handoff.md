# Handoff — coNNtent bluepriNNt Redesign

Tracker: `feat/conntent-redesign` · worktree `../cogNNitive-conntent-redesign-sdd` · HEAD `0459fbc0`.
Everything below is committed and pushed. The primary checkout is read-only; work in the worktree.

## State at handoff

| Slice | State |
|---|---|
| 3a (review_gate in nn-core + nn-mcp) | **complete** |
| 3b-1 (hashes, gates, lifecycle) | **complete** |
| 3b-2 (pipeline order, spend, animatic) | complete except 2.2 (`pipeline.mjs` extraction) and 2.8 (cold-cache E2E) |
| 3b-3 (captions) | core landed (align/runner/cache/fixture); produce wiring, consent check and caption skin remain |
| 3b-4 (QA) | not started — **live tier** (real renders + V.4 calibration) |
| 3b-5 (delivery, thumbnails, description) | complete except 5.7/.8 (renderer description reconciliation, `delivered v1` E2E) |
| 4a (console runtime) | **complete** |
| 4b (console data + writeConsole scope) | 4b.1/4b.2/4b.3 complete; 4b.4/.5 are display-only, go with 4c/4d |
| 4c (unified view) | 4c.1/.2/.5 complete; 4c.3/.4/.6 remain |
| 4d (delivery view) | not started |
| 5a (procedures) | **complete** |
| 5b (entry point) | 5b.1/.2 complete; 5b.3 moot (`nn-video-script` no longer exists); 5b.4 needs the live tier |
| Phase 7 | not started |

Green gates at handoff: `verify.js --only=conntent`, `verify.js --only=console`, full nn-core
(`2576/2576`), nn-mcp `apply-change` (`21/21`).

## Decisions already made (do not re-open)

- **Delivery protocol**: unit = PR slice; one RED per module with table-driven cases; targeted
  runner in the loop; one `verify.js --only=<area>` per slice; one `verify:fast` per PR; one push.
- **V.1** keep D-C2 (FSA): verified on Chrome 156; handle round-trips through IndexedDB.
- **V.2** keep D-C1 (CSP media): `file:` images and `media-src` load on `file://`.
- **V.3** Parakeet: whisper is not installable on this machine; Parakeet returns per-word
  `{id,text,start,end}`. Engine is `hyperframes transcribe --engine auto`.
- No backwards compatibility: legacy layouts, `published`, `script_review`, `video-guard.json`
  are rejected, never adapted.
- `review_gates: []` is autopilot (an explicit empty list wins in the cascade).
- A `review_gate` is non-mutating: verdict-only changesets annotate and leave the model
  byte-identical; the intake seal covers `author_kind`/`origin`/`reviewer`.

## Remaining work, in order

1. **3b-3.6** wire captions into `produce`: after TTS/images, before the animatic. Per scene with
   narration and `captions !== off`: tts cache key → audio path → `runTranscribe` → `alignCaptions`
   (or `alignCaptionLines`), stop with `caption-alignment-failed` (exit 1) under 90%.
2. **3b-3.7/.8** ASR runtime check before spend (`asr-missing`, consent-gated install notice;
   `captions: off` never blocked); **3b-3.9** `caption-skin.html` from the active frame.
3. **4c.3/.4/.6** approval flow in the view (verdict draft → `changes/`, stale hash refused with
   the C7 message), regeneration after every engine exit, size assertion with 50 episodes.
4. **4d** delivery view (`conntent-delivery`, read-only, `writeConsole` `scope.outFile` into
   `deliveries/v<N>/<slug>_delivery.html`) + component portfolio picker.
5. **3b-2.2/.8** extract `pipeline.mjs` from `produce.mjs`; cold-cache E2E with fake providers.
6. **3b-5.7/.8** reconcile the description renderer with HyperFrames; E2E reaches `delivered v1`
   and a rerun is a no-op.
7. **Live tier (needs the maintainer)**: 3b-4 QA + `QA_TEXT_EDGE_MIN` calibration on real frames
   (V.4), botijos U1-U7, final visual check.
8. **Phase 7**: merge the 41 delta specs into `openspec/specs/` (remove `conntent-review` and
   `conntent-console-views`); regen; full `node scripts/verify.js`; release via `nn-dev-release`
   (tag confirmation required); recreate botijos; archive.
9. **Final**: merge the tracker into `dev` only with `verify.js` green.

## Migration plan for `botijos-today` (awaiting maintainer confirmation)

Source: `D:\Users\lucas\Documents\_NN\video_NN\series\villabotijos-today` (old layout, read-only).
Target: a NEW domaiNN `coNNtent_NN/` in the repo (empty now; no migration code).

**Copy (assets only; no old documents, no old layout):**

| From | To | Why |
|---|---|---|
| `shared/avatar/celedonio_presentador.jpeg` (932 KB) | `coNNtent_NN/library/characters/celedonio/avatars/` | the presenter avatar |
| `shared/avatar/celedonio_mapache.jpeg` (414 KB) | same folder | second pose/outfit |
| `shared/avatar/set.jpeg` (1.2 MB) | `library/characters/celedonio/backgrounds/` | default background |
| `shared/music/pasodoble-loop.m4a` | `library/music/pasodoble-loop.m4a` | series bed |
| `shared/audio/cabecera_villabotijos_tudei.mp3` | `library/music/` | intro cabecera audio |
| `shared/audio/{click,whoosh,pop,glitch}.mp3` | `library/sounds/` | sound effects |
| `shared/villabotijos_tudei_intro.mp4` (15 MB) | `library/media/villabotijos_tudei_intro.mp4` | the fixed intro scene |
| `assets/pepper-mapache/media/*` | `library/media/` or the pilot episode `media/` | the pilot episode's visuals |

**Author new (do not copy):**

- `domaiNN_NN.md`, `video-defaults_NN.md` (copy the package default, then tune).
- `series/villabotijos-today/villabotijos-today_coNNtent_NN.md` with the old values:
  `language:: es`, voice `Villabotijos01`, model `minimax/speech-2.8-hd`, speed 1.0, emotion
  happy, `music:: pasodoble-loop`, `music_volume:: 0.06`, `transition:: fade`,
  `output_formats:: [1920x1920, 1080x1920, 1920x1080]`.
- `library/characters/celedonio/CHARACTER.md` (voices `es: Villabotijos01`, default pose,
  avatar model/resolution, default background).
- `library/frames/villabotijos/FRAME.md` (colors/typography from the old style guide, authored).
- One pilot episode under `series/villabotijos-today/episodes/pepper-mapache/` from the old
  narration text (`.md`), not from its old `_video-script_NN.md` model.
- Catalog `Voice` for `Villabotijos01` if the new catalog lacks it (voice sample
  `shared/dale-a-like-voz.mp3` can be copied only if the clone needs it).

**Do NOT copy:** `assets/` tree, `public/`, `renders/`, masters, thumbnails, `asset_plan*`,
`spec_NN.md`, `tools/`, root `sounds/`, `script_template.md*`, `_tmp_noticias*`,
`procedures/generate_video_script_procedures_NN.md` (superseded by the new procedures).

## Gotchas

- PowerShell: use `;`, never `&&` or `>` for UTF-8 content; `git -C <worktree>` with literal paths.
- After touching nn-core: `npm run regen` (core mirrors + console payload) or the pre-push blocks.
- Skill tests: `cd iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/test && node --test <file>`.
- `ctx.viewData` is the per-view entry (`opts.viewData[viewId]`), not the whole map.
- Console view icons come from a closed set; `play`/`layers` exist, `clapperboard` does not.
- A `review_gate` changeset needs `author_kind: human`, `origin: console`, a non-empty reviewer
  other than `reviewer`; preview carries the scene slice `plan_hash`, budget the episode plan hash.
- `verify.js --only=console` runs ~2 min; `--only=conntent` ~1.5 min. Full `verify.js` is the
  batch gate, not the inner loop.
