# Proposal: HyperFrames Renderer (replace Remotion)

## Intent

Replace the Remotion renderer of the `cognnitive-video-engine` with HyperFrames as the
scene compositor, while keeping the deterministic, tool-agnostic Composition Manifest as
the contract. The engine lowers the structured iNNfo `video-script` model into the manifest
(unchanged), then emits a **valid, deterministic HyperFrames project** from that manifest and
renders it headlessly. That project is the Studio-editable unit of truth.

This is decision **(c)** of the 2026-10-26 grill: engine stays the headless renderer
(the cost guard, TTS and avatars need headless automation) but its output is a real
HyperFrames project, not opaque React.

## Why Now

The iNNteresante field work (2026-10-24/25) migrated the series' animation and clip
production to HyperFrames (`npx hyperframes@0.8.192`) and left Remotion only as the final
master compositor. Remotion now:

- is the single hard install (`ensure-engine.mjs`: `@remotion/renderer` + bundler + Chromium, ~120 MB);
- owns the only React code (7 overlay components) that has to be re-implemented anyway;
- **does not even render transitions**: the compiler emits `transition::` descriptors but no
  `.tsx` consumes them (verified grep = 0) — the field is decorative today;
- pins the engine to a third-party product whose licence the user must accept.

HyperFrames does the same job better (deterministic HTML → MP4, GSAP motion, lint, Studio,
captions and overlays as first-class features) and the team already depends on it.

## Scope

| Slice | Content | Owner |
|---|---|---|
| 1 | `manifest → HyperFrames project` emitter + headless `hyperframes render`; transitions via GSAP; duration via `ffprobe`; `ensure-hyperframes`; preview → Studio | this change |
| 2 | Retire Remotion: delete `remotion-*.mjs`/`.tsx`, `ensure-engine.mjs`, the `@remotion/*` frontmatter; `--allow-mock` stays as a CI seam | this change |
| 3 | Overlay intent + registry blocks + narration captions out of the model | **change `video-overlays-as-intent`** |
| 4 | Model cascade + video-level `template::` + guard gate-only | **change `video-model-cascade`** |
| 5 | Draft tools promoted to the blueprint | **change `video-draft-tools`** |
| 6 | Standalone bugfix: `asset-cost-estimator.mjs` junction-unsafe entry guard | this change |

### Non-goals

- Changing the Composition Manifest shape (it is the stable contract).
- Changing the overlay vocabulary or scheduling.
- Adding layout geometry to the model (rich layouts become a HyperFrames composition — decision 7).
- Writing the HF overlay blocks themselves (change `video-overlays-as-intent`).
- Editing the cost guard policy (change `video-model-cascade`).

## Approach (binding maintainer decisions, 2026-10-26 grill)

| # | Decision | Rejected alternative and why |
|---|---|---|
| D-HF1 | **(c) hybrid**: the engine emits a deterministic HF project and renders it headless | (a) engine emits opaque HTML: loses editability. (b) Studio-first: breaks the headless cost guard |
| D-HF2 | Keep the manifest as the contract; add an emitter `manifest → index.html + compositions/` | Rewriting the compiler: needless churn, the manifest is tool-agnostic already |
| D-HF3 | Audio (narration + music) lives at the **root composition** with global times | Per-scene nested media with nonzero `data-start` has ambiguous timing basis (learned 2026-10-24) |
| D-HF4 | Transitions implemented with GSAP on a **child wrapper** of each scene `.clip` | Tweening a `.clip` (`display`/`visibility`/`autoAlpha`) is forbidden by the HF contract |
| D-HF5 | Audio duration measured with **`ffprobe`**, provider-reported duration as fallback | `@remotion/media-parser` disappears; the "no FFmpeg-from-PATH" rule existed only to avoid a binary the pipeline already uses |
| D-HF6 | `ensure-hyperframes` replaces `ensure-engine`; preview opens HF Studio; `--allow-mock` stays a CI-only seam | Keeping Remotion installed in parallel is the thing being removed |

## Capabilities

### New Capabilities
- None.

### Modified Capabilities

- `cognnitive-video-engine`: scene compilation now targets a HyperFrames project; the render
  CLI drives `hyperframes render`; asset staging writes into the HF project; media layers render
  through HF clips; audio duration comes from `ffprobe`; transitions become rendered; the runtime
  installer provisions HyperFrames. Removes the "Remotion is the only renderer" and
  "without FFmpeg-from-PATH" contracts.
- `remotion-video-scenes`: the Remotion component pipeline (chapter/parallax/sequence) is retired
  and replaced by the HyperFrames project contract.
- `video-script-skill`: frontmatter engine/renderer and the tooling steps move from Remotion to
  HyperFrames; the skill version bumps.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| HF render output differs from Remotion frame-for-frame | High (intended) | Golden test: `hyperframes check` = 0 and an ffprobe assertion on codec/size/fps/duration |
| HF CLI version drift breaks the emitter | Med | `ensure-hyperframes` verifies the pinned `0.8.192`; the emitter targets the documented contract |
| Audio at root changes the manifest→project mapping | Med | The manifest is unchanged; only the emitter decides placement (design seam) |
| The estimator junction bug is orthogonal but blocks the pipeline | High | Folded as slice 6, its own commit |

## Rollback Plan

Each slice is revertible on `dev`. Reverting slice 1 restores `ensure-engine` + the Remotion
renderer (kept in one commit until slice 2 removes them). No workspace data is migrated; the
manifest is untouched, so any persisted manifest still renders under the old engine.

## Success Criteria

- [ ] `node <skill>/scripts/video-engine-cli.mjs render <script> --output master.mp4` produces an
      MP4 via HyperFrames with no Remotion module installed.
- [ ] The emitted project passes `npx hyperframes check --json` with 0 errors.
- [ ] A declared `transition::` is visible in the output (RED-then-GREEN test).
- [ ] `probeAudioDuration` returns a duration with no `@remotion/*` present.
- [ ] `node scripts/verify.js` is green; no `@remotion` import remains in the skill.
