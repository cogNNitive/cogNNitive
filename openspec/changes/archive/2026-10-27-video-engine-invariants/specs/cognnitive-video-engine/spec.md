# Delta for cognnitive-video-engine

## ADDED Requirements

### Requirement: Provider Clips Are Cached As Delivered

The engine MUST cache a provider video clip exactly as delivered, with no `+faststart` remux and
no `.needs-faststart` marker: a raw clip whose `moov` atom follows `mdat` renders through the
pinned HyperFrames CLI unchanged. Final deliverables MAY still be remuxed by `render-formats.mjs`.

#### Scenario: Avatar clip is not remuxed

- GIVEN a synthesized avatar clip
- WHEN it is cached and later compiled
- THEN no ffmpeg remux runs and no `.needs-faststart` file exists
