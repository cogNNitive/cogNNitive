# Delta for cogNNitive Video Engine

## ADDED Requirements

### Requirement: Cost Estimation Without Explicit Scene Duration

The cost estimator MUST produce an estimate for every scene, including scenes that declare no explicit duration. For such scenes it SHALL derive duration from the scene narration word count (whitespace-separated tokens; empty or missing narration counts as 0) at 2.5 words per second, with a minimum of 3 seconds. Scenes with an explicit duration MUST keep using that value unchanged.

#### Scenario: Scene without duration is estimated

- GIVEN a script whose scene has narration and no `scene_duration`
- WHEN `estimateScriptCost` is executed
- THEN it completes without throwing
- AND the scene duration equals `max(3, words / 2.5)` seconds

#### Scenario: Empty narration falls back to the minimum

- GIVEN a scene with no `scene_duration` and empty or missing narration
- WHEN `estimateScriptCost` is executed
- THEN the scene duration is exactly 3 seconds

#### Scenario: Explicit duration is preserved

- GIVEN a scene with `[scene_duration=8]`
- WHEN `estimateScriptCost` is executed
- THEN the scene duration is 8 seconds regardless of narration length

---

### Requirement: Observable Renderer Fallback

The render CLI MUST resolve the Remotion entry point relative to its own module location, and resolution MUST NOT throw in an ES module context. When the Remotion path cannot be used (entry point missing, dependency unavailable, or render error), the CLI MUST write a single-line warning naming the reason to stderr before falling back to FFmpeg/mock rendering. The fallback itself MUST be preserved. The CLI MUST NOT swallow errors silently. Shipping the Remotion entry point is out of scope.

#### Scenario: Entry-point resolution does not throw

- GIVEN the render CLI running as an ES module
- WHEN it resolves the Remotion entry point path
- THEN no `ReferenceError` is raised and a path is returned

#### Scenario: Missing entry point is reported, then falls back

- GIVEN the Remotion entry point file does not exist
- WHEN `renderVideo` is invoked
- THEN one warning line stating the reason is written to stderr
- AND rendering continues via FFmpeg/mock and produces a render summary

#### Scenario: Unexpected Remotion error is reported

- GIVEN the Remotion path throws during setup or render
- WHEN `renderVideo` handles the error
- THEN the error message appears in the stderr warning
- AND the fallback renderer runs instead of the error propagating
