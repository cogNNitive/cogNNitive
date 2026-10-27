# Tasks: video-engine-invariants

Both behaviors already ship on `dev`; this change only records them as living requirements.

## Slice 1: Overlay host timeline declaration (spec: ephemeral-overlays)

- [x] 1.1 `resolveComponents` records `noTimeline` from the resolved component's root.
- [x] 1.2 `overlayMount` emits `data-no-timeline` on the host when the component is static.
- [x] 1.3 `scene-project` passes `noTimeline` through; unit tests cover both cases.
- [x] 1.4 Verified against the pinned CLI: render 63.5s -> 20.3s, no readiness timeout (PR #387).

## Slice 2: Provider clips cached as delivered (spec: cognnitive-video-engine)

- [x] 2.1 S3 spike PASS: a `moov`-at-end clip renders with no timeout, exact duration, no freeze.
- [x] 2.2 Deleted `lib/faststart.mjs`, the marker retry and the `postProcess`/`ffmpegRun` seams.
- [x] 2.3 `render-formats.mjs` keeps `+faststart` for final deliverables (design D8).
- [x] 2.4 Residue guard `no-faststart.test.mjs` (PR #388).

## Slice 3: Record the requirements

- [x] 3.1 Add the `ephemeral-overlays` and `cognnitive-video-engine` deltas.
- [x] 3.2 `openspec validate`; archive to sync the living specs.
