## Why

Two engine behaviors shipped as fix-forward PRs (#387, #388) are not captured as living
requirements, so the specs no longer describe the engine: a static overlay host must skip
HyperFrames' sub-composition timeline-readiness wait, and provider clips are cached exactly as
delivered. Capturing both keeps OpenSpec the source of truth for the video engine.

## What Changes

- Document that an overlay host whose resolved component is static (its root declares
  `data-no-timeline`) MUST carry `data-no-timeline`, so HyperFrames does not wait its 45s
  sub-composition readiness timeout; a host whose component registers a timeline MUST NOT.
- Document that provider video clips MUST be cached exactly as delivered — no `+faststart`
  remux and no `.needs-faststart` marker — while final deliverables MAY still be remuxed by
  `render-formats.mjs`.
- No code change: both behaviors already ship on `dev` (PRs #387 and #388).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ephemeral-overlays`: the overlay host declares whether its component has a timeline.
- `cognnitive-video-engine`: provider clips are cached as delivered.

## Impact

- `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/overlay-blocks.mjs`,
  `scene-project.mjs`, `video-engine-cli.mjs`, `asset-synthesizer.mjs`, `synthesize-avatar.mjs`.
- No new dependencies. `render-formats.mjs` keeps `+faststart` for final deliverables.
