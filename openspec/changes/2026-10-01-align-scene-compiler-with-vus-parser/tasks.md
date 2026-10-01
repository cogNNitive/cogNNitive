# Tasks: Align the Scene Compiler with the Vendored VUS Parser

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250-450 total (compiler adapter + tests + TTS fidelity) |
| 400-line budget risk | Low-Medium |
| Chained PRs recommended | No (single cohesive unit: parser→manifest adapter) |
| Delivery strategy | single |
| User approval required before apply | Yes |

Decision needed before apply: No.
Chained PRs recommended: No.
400-line budget risk: Low-Medium.

---

## Phase 1: RED — Compiler Contract Tests

- [ ] 1.1 Add a fixture VUS script exercising `# Sets`, `@template`, `@scene`
      scene headers, and `@@layer` children (mirroring a real Series script).
      `[cognnitive-video-engine:Requirement:Programmatic Remotion Scene Compilation]`
- [ ] 1.2 Add a failing test asserting `RemotionSceneCompiler` produces one
      scene track per VUS scene (count + order + names) for the fixture.
      `[cognnitive-video-engine:Requirement:Programmatic Remotion Scene Compilation]`
- [ ] 1.3 Add a failing test asserting per-scene layer mapping (background +
      avatar/video layers) resolves to the correct scene, not a single merged
      scene. `[cognnitive-video-engine:Requirement:Programmatic Remotion Scene Compilation]`
- [ ] 1.4 Add a failing test asserting the compiler's scene list matches the
      vendored parser's `Project` scenes for the same input (parity test).
      `[cognnitive-video-engine:Requirement:Programmatic Remotion Scene Compilation]`

## Phase 2: GREEN — Consume the Parser

- [ ] 2.1 Add the `@cognnitive/innfo-video-parser` dependency to the skill's
      resolution path (in-repo import; no external checkout, no env var).
      `[video-script-skill:Requirement:Internal Parser Resolution]`
- [ ] 2.2 Replace `parseScript()`'s line-scanning with an adapter that lowers the
      parser's `Project` into the existing internal parsed shape.
      `[cognnitive-video-engine:Requirement:Programmatic Remotion Scene Compilation]`
- [ ] 2.3 Make the compiler fail loudly (named error, non-zero) when the parser
      reports blocking issues, instead of compiling a malformed manifest.
      `[cognnitive-video-engine:Requirement:Programmatic Remotion Scene Compilation]`
- [ ] 2.4 Keep the `RemotionCompositionManifest` output shape stable so `render`,
      `preview`, and `render-thumbnail` are unaffected.
      `[cognnitive-video-engine:Requirement:Headless Video Rendering CLI]`

## Phase 3: GREEN — TTS & Layer Fidelity

- [ ] 3.1 Bind TTS options from the parsed scene's resolved properties
      (`scene_tts_model` and per-model `<model>/voice_id|speed|emotion|pitch|intensity`),
      removing the generic `scene_voice`-only path.
      `[cognnitive-video-engine:Requirement:Deterministic Media & TTS Asset Synthesis]`
- [ ] 3.2 Ensure TTS synthesis runs once per parsed scene with narration, never
      over a merged multi-scene blob.
      `[cognnitive-video-engine:Requirement:Deterministic Media & TTS Asset Synthesis]`
- [ ] 3.3 Resolve voice/model values from the vendored spec at run time; add no
      literal voice IDs to skill prose.
      `[video-script-skill:Requirement:No-Prose-Copy of VUS Syntax Facts]`

## Phase 4: Repoint + Verify

- [ ] 4.1 Point `vus-parse` consumers and the compiler at the in-repo parser with
      no external-checkout environment variable set.
      `[video-script-skill:Requirement:Internal Parser Resolution]`
- [ ] 4.2 **Verify**: `node scripts/check-script.mjs <fixture> --series-root <dir>`
      and `node scripts/vus-parse.mjs <fixture>` pass on the fixture.
      `[video-script-skill:Requirement:Internal Parser Resolution]`
- [ ] 4.3 **Verify**: `npm run lint`, `npm run typecheck`, and the
      `innfo-video-parser` + skill test suites are green; zero NEW format drift.
      `[cognnitive-video-engine:Requirement:Programmatic Remotion Scene Compilation]`
- [ ] 4.4 Re-sync the installed skill copy (`~/.config/opencode/skills/...`) from
      the repo so local consumption matches the source of truth.
      `[video-script-skill:Requirement:Owned Skill With No External Dependency]`
