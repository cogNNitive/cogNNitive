# Handoff — coNNtent bluepriNNt Redesign

Tracker: `feat/conntent-redesign` · worktree `../cogNNitive-conntent-redesign-sdd` · HEAD `551394e7`.
Everything below is committed and pushed. The primary checkout is read-only; work in the worktree.

## State at handoff

| Slice | State |
|---|---|
| 3a (review_gate in nn-core + nn-mcp) | **complete** |
| 3b-1 (hashes, gates, lifecycle) | **complete** |
| 3b-2 (pipeline order, spend, animatic) | complete except 2.2 (`pipeline.mjs` extraction) and 2.8 (cold-cache E2E) |
| 3b-3 (captions) | core landed (align/runner/cache/fixture); produce wiring, consent check and caption skin remain |
| 3b-4 (QA) | not started — **live tier**; now unblocked, real frames exist |
| 3b-5 (delivery, thumbnails, description) | complete except 5.7/.8 (renderer description reconciliation, `delivered v1` E2E) |
| 4a (console runtime) | **complete** |
| 4b (console data + writeConsole scope) | 4b.1/.2/.3 complete; 4b.4 (stale translation) and 4b.5 (superseded deliveries, partially shown) remain |
| 4c (unified view) | 4c.1/.2/.3/.5 complete; **4c.4 and 4c.6 remain** |
| 4d (delivery view + picker) | not started |
| 5a (procedures) | **complete** |
| 5b (entry point) | 5b.1/.2 complete; 5b.4 (U1-U7 E2E) remains |
| Phase 7 | not started |

Green gates at handoff: `node scripts/verify.js --only=conntent`, `--only=console`.
The full `node scripts/verify.js` is only run at Phase 7.3 and the final merge.

## What landed most recently (this session)

- `71c695c1` **4c.3 approval flow**: `propose()` accepts `kind: 'verdict'`, validates
  `gate` / `verdict` / 64-hex `reviewed_hash` (and a reason for `needs-change`); the draft store
  keeps verdict drafts without an element `base_hash`; the changeset targets `<stem>@<scene>`.
  The Pipeline view has a gate strip, one card per scene (still, narration audio, layer pills,
  editable narration), `Approve` / `Needs change` and `Approve <gate> for N scenes`.
- `219fdf57` reused `ctx.ui.FieldRow` and `ctx.ui.Toast` instead of hand-built rows/toast.
- `36999293`, `388afcdd`, `ba1ff879`, `551394e7` reworked the fields block: flat "Fields" list,
  origin badge per row, lightbox for media, origin colours, `background_audio_volume` is a number.
- `d316e626` committed the skill lockfile (pinned HyperFrames + GSAP).
- `9a199332` corrected this document: the acceptance domaiNN is an **end-user domain on disk**.

## The end-user domaiNN (acceptance bench, NOT in the repo)

`D:\Users\lucas\Documents\_NN\coNNtent_NN` — a real user's domaiNN. It is never committed: the
repo carries code and tests, the domain carries videos, deliveries and caches. It already holds:

- `series/villabotijos-today/` with kinds `Gancho/Intro/Noticia/Cierre` and Chrome `es`
- `episodes/pepper-mapache/` (6 scenes) — **produced and delivered as v1**
  (`deliveries/v1/`: 3 formats, 2 thumbnails, description with chapters, `delivery.json`)
- `library/` (character `celedonio`, frame `villabotijos`, music, sounds, intro video)
- `specs/bluepriNNts/coNNtent/spec_NN.md` + `V_0-17-0/spec_NN.md`: a LOCAL copy of the blueprint
  that pins the version. **After any blueprint edit, refresh both copies** or the export keeps
  using the stale one.

## Remaining work, in order

1. **4c.4** regenerate the console after every engine exit and every applied changeset (the
   `finally` in the future `pipeline.mjs`). `4c.6` console size assertion with 50 fixture episodes.
2. **Catalog picklists** (conntent-domain-console "Picklists come from the catalog"): `image_model`,
   `avatar_model`, `voice_model` and `voice` are free-text today. Blocked by three facts:
   the blueprint parser drops undeclared field keys; the console payload carries catalog **slugs**,
   not the provider **`api_id`** the fields expect; and a `select` with no options renders an empty
   list. Work: carry the merged catalog (with `api_id`) into the payload, add the schema hook, then
   declare the fields as picklists. `scripts/export-console.mjs` already contains an **inert**
   `options_from` resolution block: wire it or delete it.
3. **4b.4/.5** stale-translation flag (`translation_of`) and the "served" case of superseded
   deliveries.
4. **4d** delivery view (`conntent-delivery`, read-only, `writeConsole` `scope.outFile` into
   `deliveries/v<N>/<slug>_delivery.html`) + the component-portfolio picker.
5. **3b-3.6-.9** captions: wire into `produce` (after TTS/images, before the animatic; under 90%
   alignment stops with exit 1), ASR consent check before spend, `caption-skin.html` from the frame.
6. **3b-2.2/.8** extract `pipeline.mjs` from `produce.mjs`; cold-cache E2E with fake providers.
7. **3b-5.7/.8** reconcile the description renderer with HyperFrames; E2E reaches `delivered v1`
   and a rerun is a no-op.
8. **Live tier**: 3b-4 QA (`qa.test.mjs`, `lib/qa.mjs`, output-set checkpoint) and calibrate
   `QA_TEXT_EDGE_MIN` on the pilot's real frames (V.4).
9. **5b.4** simulate U1-U7 on a fresh domaiNN fixture, fake providers.
10. **Phase 7**: merge the 41 delta specs into `openspec/specs/` (remove `conntent-review` and
    `conntent-console-views`); regen; full `node scripts/verify.js`; release via `nn-dev-release`;
    run U1-U7 against the end-user domain; archive.
11. **Final**: merge the tracker into `dev` only with `verify.js` green.

## Decisions already made (do not re-open)

- **Delivery protocol**: unit = PR slice; one RED per module with table-driven cases; targeted
  runner in the loop; one `verify.js --only=<area>` per slice; one `verify:fast` per PR; one push.
- **V.1** keep D-C2 (FSA): verified on Chrome 156. **V.2** keep D-C1 (CSP media on `file://`).
  **V.3** Parakeet: whisper is not installable here; `hyperframes transcribe --engine auto`.
- No backwards compatibility: legacy layouts, `published`, `script_review`, `video-guard.json`
  are rejected, never adapted.
- `review_gates: []` is autopilot (an explicit empty list wins in the cascade).
- A `review_gate` is non-mutating: verdict-only changesets leave the model byte-identical, and
  only `author_kind: human` + `origin: console` + a named reviewer (not `reviewer`) count.
- **Reuse over reinvention**: prefer the console's existing primitives (`ctx.ui.FieldRow`,
  `ctx.ui.FieldValue`, `ctx.ui.Toast`, `nn-lightbox`, `nn-visual-card`, `nn-scene-card`,
  `nn-verdict`, `nn-cascade-chip`) over new markup.

## Gotchas (learned the hard way)

- **Blueprint encoding**: `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md` is **UTF-8**. Never restore
  it with a PowerShell redirect or `Set-Content` (they write UTF-16, the package resolver reads it
  as UTF-8 and reports "bluepriNNt package not found"). Edit it with a UTF-8-aware tool.
- **Local blueprint copy**: after editing the blueprint, copy it into the domaiNN's
  `specs/bluepriNNts/coNNtent/` (both files) before exporting.
- **Render toolchain**: `npm install` inside `skills/nn-conntent` provides the pinned
  `hyperframes 0.8.192` + `gsap 3.14.2`; `ensure-hyperframes.mjs --check` must pass.
- **`produce` needs the TTS cache first**: run `compile` (or `produce` after a compile) or avatar
  scenes fail with "no TTS cache entry". One guard config everywhere: `loadGuardWithVoices`
  (`scripts/lib/guard-config.mjs`) builds the voice registry the TTS cache key depends on.
- **Layer vocabulary**: `type:: avatar|media|text|animation` plus `style:: title|lower-third|
  caption|watermark|quote` for text. `type:: presenter/background/title` is the retired line and
  the validator rejects it.
- **`background_audio` is `type:: file`**, a path (`../../../../library/music/x.m4a`), not a
  library name.
- **Console view**: `kind: 'editable'`; `ctx.store.propose({kind:'verdict', …})` emits the draft.
  `FieldRow` must be called **without** `inherited` — that flag replaces the field label with
  "inherited from …" and points the address at `concept:<level>`, which the console marks
  non-editable (the modal then says "Use review mode or edit controls…").
- **`ctx.viewData`** is the per-view entry (`opts.viewData[viewId]`), not the whole map.
- Console view icons come from a closed set (`play`, `layers`); `clapperboard` does not exist.
- PowerShell: use `;`, never `&&`. Git hooks block `reset --hard`, `clean`, `stash`, `checkout`
  of the primary tree, and `Remove-Item -Recurse -Force` outside the cwd.
- After touching nn-core: `npm run regen`. After touching console sources: `npm run build:console`.
