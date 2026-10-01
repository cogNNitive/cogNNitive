# Proposal: Fix Video Engine Runtime References

## Why

Two undefined identifiers in the `skills/nn-video-script` skill (actioNN) break the
`cognnitive-video-engine` capability at runtime:

1. **`video-engine-cli.mjs:214`** calls `path.resolve(__dirname, ...)` in an ES module
   (only `fileURLToPath` is imported). The `ReferenceError` is swallowed by the empty
   `catch` at ~242, so `renderVideo` always degrades to FFmpeg/mock with no signal.
2. **`asset-cost-estimator.mjs:181`** reads an undefined `wordCount` whenever a scene has
   no explicit duration — the common case. `estimateScriptCost` throws.

Existing tests stayed green because every fixture in `test/cost-estimator.test.mjs`
sets `[scene_duration=...]`, and no test exercises the Remotion branch.

## What Changes

- Resolve the Remotion entry point from `dirname(fileURLToPath(import.meta.url))`.
- Replace the empty `catch` with an observable fallback: emit the reason (warning to
  stderr) before falling through to FFmpeg; the fallback itself stays.
- Derive `wordCount` from the scene narration (whitespace-split, empty narration = 0)
  so the existing `max(3, words / 2.5)` heuristic works.
- Regression tests written first (RED): a scene without explicit duration, and a check
  that the Remotion entry-point resolution no longer throws.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `cognnitive-video-engine`: add scenarios for (a) cost estimation of scenes without an
  explicit duration and (b) Remotion-to-FFmpeg fallback being reported, not silent.

## Impact

| Area | Impact | Description |
|---|---|---|
| `skills/nn-video-script/scripts/video-engine-cli.mjs` | Modified | `__dirname` fix, observable fallback |
| `skills/nn-video-script/scripts/asset-cost-estimator.mjs` | Modified | Define `wordCount` |
| `skills/nn-video-script/test/{cost-estimator,video-engine-cli}.test.mjs` | Modified | Regression tests |

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `remotion-entry.tsx` does not exist in `scripts/`, so fixing `__dirname` does NOT revive Remotion rendering — `existsSync` still skips it | High (verified) | Scope is "no crash + visible reason"; shipping the entry point is a non-goal (see question round) |
| Remotion branch hard to test (dynamic `@remotion/*` imports) | Med | Design extracts entry-point resolution into a testable seam |
| New stderr warning noisy on every FFmpeg render | Low | One line per render, only on fallback |

### Rollback
Revert the two script edits and the tests in one commit; no data, manifest, or spec
version changes.

### Success criteria
- [ ] `estimateScriptCost` succeeds on a scene without `scene_duration`, duration >= 3s.
- [ ] No `ReferenceError` reachable in `renderVideo`; the fallback reason is emitted.
- [ ] New tests fail on current `dev` and pass after the fix.
- [ ] `npm run test`, `lint`, `typecheck` green.

### Out of scope
- `remotion-scene-compiler.mjs` changes and parser duplication.
- Authoring `remotion-entry.tsx` / making Remotion rendering actually work.

## Proposal question round

Not asked directly (sub-agent); assumptions need user review:

1. **Remotion entry point missing** — accept that Remotion stays unreachable after this
   fix (only the crash and silence are fixed), or open a follow-up change to ship it?
2. **Fallback visibility** — is a stderr warning enough, or should `RenderSummary`
   expose the renderer used (`remotion | ffmpeg | mock`)?
3. **Duration heuristic** — keep the existing 2.5 words/second, 3s floor as-is?
