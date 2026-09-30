# Tasks: Fix Video Engine Runtime References

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120-180 (about 50 source, 100-130 tests) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Both runtime-ref fixes plus regression tests | PR 1 | Base: dev. Tests included, no docs or manifest changes |

Spec note: the last scenario of the Observable Renderer Fallback requirement ("No warning when Remotion is not attempted as fallback") was dropped from `specs/cognnitive-video-engine/spec.md`. It is unreachable: `@remotion/*` is not installed and `remotion-entry.tsx` does not exist, so `renderVideo` never completes without falling back, and the warning lives in `renderVideo`, not in the seam. The `rendered: true` path is covered by a seam unit test (task 1.4).

All paths are under `skills/nn-video-script/`. Tasks 1.x are independent of 2.x until phase 3. Phase 1 tasks can run in parallel; 1.4 to 1.6 and 1.7 touch the same test file, so run them sequentially.

## Phase 1: RED (write failing tests first)

- [ ] 1.1 `test/cost-estimator.test.mjs`: scene without `scene_duration`, 10-word narration, expect `durationSeconds === 4` (Scenario: Scene without duration is estimated). Fails with `ReferenceError`.
- [ ] 1.2 `test/cost-estimator.test.mjs`: scene without duration, empty narration, expect 3 (Scenario: Empty narration falls back to the minimum).
- [ ] 1.3 `test/cost-estimator.test.mjs`: `[scene_duration=8]` with long narration stays 8 (Scenario: Explicit duration is preserved). Guard test, expected green already.
- [ ] 1.4 `test/video-engine-cli.test.mjs`: `tryRemotionRender` with stub `loadModule` and temp `scriptsDir` holding `remotion-entry.tsx`; expect `rendered: true` and `bundle` called with `<tmp>/remotion-entry.tsx`. Fails: export missing.
- [ ] 1.5 `test/video-engine-cli.test.mjs`: stub `bundle` throws; expect resolve (no reject) with `reason` matching `/^error: /` (Scenario: Unexpected Remotion error is reported).
- [ ] 1.6 `test/video-engine-cli.test.mjs`: `resolveRemotionEntryPoint()` returns an absolute path under `scripts/` without throwing (Scenario: Entry-point resolution does not throw); also `loadModule` returning null gives `reason: 'modules-unavailable'`.
- [ ] 1.7 `test/video-engine-cli.test.mjs`: spawn CLI `render manifest.json`; expect exit 0 and stderr matching `/Remotion render skipped \(modules-unavailable\)/` (Scenario: Missing entry point is reported, then falls back). Fails: stderr silent.
- [ ] 1.8 Run `npm run test` and confirm 1.1, 1.2, 1.4-1.7 fail for the expected reasons. Record the output.

## Phase 2: GREEN (minimal fixes)

- [ ] 2.1 `scripts/asset-cost-estimator.mjs` (~line 181): declare `wordCount` from `narration.split(/\s+/).filter(Boolean).length` (missing narration = 0); keep `max(3, words / 2.5)`. Turns 1.1-1.3 green.
- [ ] 2.2 `scripts/video-engine-cli.mjs`: add `const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url))`; export `resolveRemotionEntryPoint(scriptsDir = SCRIPTS_DIR)` (no existence check). Replace `__dirname` use. Turns 1.6 green.
- [ ] 2.3 `scripts/video-engine-cli.mjs`: export `tryRemotionRender(input, deps)` with injectable `loadModule` and `scriptsDir`; return `{rendered, reason}` with reasons `modules-unavailable`, `entry-point-missing: <path>`, `error: <msg>`; never throw. Turns 1.4, 1.5 green.
- [ ] 2.4 `scripts/video-engine-cli.mjs`: in `renderVideo`, replace the inline Remotion block and empty `catch` (~242) with `tryRemotionRender`; on `rendered: false` emit one `console.warn("[video-engine-cli] Remotion render skipped (<reason>); falling back to FFmpeg")`. FFmpeg/mock path unchanged. Turns 1.7 green.

## Phase 3: Verification and cleanup

- [ ] 3.1 Run `npm run test`, `npm run lint`, `npm run typecheck`; all green.
- [ ] 3.2 Confirm `RenderSummary` shape is unchanged and no frontmatter, manifest, package or spec-version files changed (`git diff --stat`).
- [ ] 3.3 REFACTOR: remove any leftover `__dirname` references and dead code in `video-engine-cli.mjs`; re-run tests.
