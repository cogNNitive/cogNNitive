# Proposal: Overlays As Intent

## Intent

Keep semantic overlays modelled as **intent** in the iNNfo `video-script` model (the script
keeps describing the video), and let HyperFrames render them: the engine instantiates a
HyperFrames **registry block** per overlay `type::` by default, with a per-series/per-scene
escape to a custom block. At the same time, remove the one thing that never belonged in the
model: **narration subtitles** (word-level captions) become a global renderer feature, not a
`Layer`.

This is decision **(II)** of the 2026-10-26 grill, plus decision **(A)** (registry default +
series escape) and the `caption` clarification (change 3's sibling).

## Why Now

The overlay vocabulary (`title`, `lower-third`, `caption`, `quote`, `watermark`, `b-roll`) is
inherited from the pre-native model but is not dead: iNNfo's premise is that the script IS the
model of the video, so semantic overlays MUST stay declared and validated. What changes with the
HyperFrames migration is **who renders them**, not **who models them**.

Two facts force the split:

- In iNNteresante `caption` is used as a **source credit** ("Fuente: The Guardian…"), i.e.
  static per-scene content — while HyperFrames treats captions as a single whole-video
  word-level track.
- Word-level narration subtitles are **derived** from the narration + timings, not authored
  content; modelling them as a `Layer` was a design error.

## Scope

| Slice | Content | Owner |
|---|---|---|
| 1 | Overlays render through HyperFrames registry blocks; engine leaves a stable overlay host per scene | this change |
| 2 | Per-series/per-scene escape to a custom HyperFrames block | this change |
| 3 | Narration subtitles leave the model → global renderer feature | this change |
| 4 | `caption` is clarified as a static text overlay (source credit) | this change |
| 5 | Overlay hosts markup / registry pin | this change |
| 6 | HF block emission plumbing | change `video-hyperframes-renderer` (anchor) |

### Non-goals

- Changing the overlay `type::` vocabulary (only `caption` semantics are clarified, nothing removed).
- Modelling layout geometry (decision 7).
- Changing the sequential scheduling of `quote`/`lower-third`/`b-roll`.
- Reimplementing the old React components as blueprint HTML (rejected option (B)).

## Approach (binding maintainer decisions)

| # | Decision | Rejected alternative and why |
|---|---|---|
| D-OV1 | (II) semantic overlays stay modelled as intent; HyperFrames paints them via a series frame | (III) move all overlays to the composition: the script stops describing the video, losing validation and draft review |
| D-OV2 | (A) default = a HyperFrames registry block per `type::`, parameterized with variables; escape = a series/scene block id | (B) blueprint-owned HTML: reimplements what the registry already ships and drifts from HF |
| D-OV3 | Narration subtitles are a **global renderer feature** (one root captions host), NOT a Layer | Keep `caption` as narration: two concepts collapsed under one name |
| D-OV4 | `caption` = static per-scene text (source credit), overlay semantics unchanged | Merge credit + subtitles: the two uses diverge in practice |

## Capabilities

### New Capabilities
- None.

### Modified Capabilities

- `ephemeral-overlays`: overlays are modelled as intent and rendered by a HyperFrames block/template;
  adds the series escape and removes the Remotion-render implication.
- `video-script-model`: `caption` is clarified as static text; narration subtitles are explicitly
  NOT a Layer and MUST NOT be modelled.
- `cognnitive-video-engine`: overlay rendering is delegated to HyperFrames blocks; adds a global
  narration-caption host independent of the Layer model.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A registry block name/version changes under us | Med | The HF CLI is pinned; the block id lives behind one seam (`componentMap`) |
| Series frames drift in look | Med (intended) | The default set keeps the common case consistent; the escape is opt-in |
| Existing scripts using `caption` as narration | Low | Verified: iNNteresante uses it as a source credit; clean break (change `video-model-cascade` D-BC) |

## Rollback Plan

Revert per slice on `dev`. Reverting slice 3 restores the (unused) caption-as-narration path;
no workspace data is migrated.

## Success Criteria

- [ ] A scene with `lower-third`, `quote`, `b-roll`, `watermark`, `title` and a source-credit
      `caption` emits HyperFrames blocks and passes `hyperframes check` with 0 errors.
- [ ] A series frame override renders in place of a default block (RED-then-GREEN).
- [ ] No `Layer` of `type:: caption` is interpreted as narration subtitles.
- [ ] `node scripts/verify.js` is green.
