# Tasks: Video Composition Media Types

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~320–420 (adds ~220; modifies ~120) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | single-change |
| Chain strategy | n/a |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: n/a
400-line budget risk: Medium

> Stacked on `2026-10-03-self-contained-video-skill-deps` (branch
> `session/video-dep-bundle`) — base this session's branch on that branch, not on
> bare `dev`.

## Phase 1: Asset Staging & Path Resolution

- [ ] 1.1 RED: `skills/nn-video-script/test/scene-media-types.test.mjs` — `resolveMediaLayers` copies an in-dir (`assets/x.jpeg`) and an out-of-dir (`../shared/y.mp4`) source into `publicDir`, rewrites both to unique bundle-relative names, and reports `missing: []`.
- [ ] 1.2 GREEN: add `resolveMediaLayers({ scenes, audioTracks, scriptDir, publicDir })` to `video-engine-cli.mjs` (no Remotion import). Resolve each source as `path.resolve(scriptDir, src)`; absolute sources as-is; copy to `<name>_<hash>.<ext>`; skip copy when the destination already matches; collect unresolved into `missing`.
- [ ] 1.3 RED: test — `compileVideo` on a script referencing a non-existent `../shared/missing.mp4` surfaces an error (loud), and never stages a partial manifest.
- [ ] 1.4 GREEN: wire `resolveMediaLayers` into `compileVideo`: stage into `<scriptDir>/public/`, rewrite `layer_asset_source` + audio `assetPath` in the manifest, set `manifest.metadata.publicDir`, throw on non-empty `missing`.
- [ ] 1.5 Replace the cwd-relative `fs.existsSync(src)` layer/audio staging loop with the resolved `publicDir` staging.

## Phase 2: Layer → Primitive Dispatch

- [ ] 2.1 RED: test `pickLayerPrimitive` maps `video → 'video'`, `talking_avatar → 'avatar'`, `image`/unknown → `'image'`.
- [ ] 2.2 GREEN: export `pickLayerPrimitive(layerType)` (pure) from `Scene.tsx` (or a sibling module it imports).
- [ ] 2.3 Create `scripts/scene/AvatarFrame.tsx` — distinct framed/styled avatar image treatment.
- [ ] 2.4 Update `Scene.tsx`: replace `resolveBackgroundImage` with a layer loop that renders each drawable layer via `staticFile()` + the primitive from `pickLayerPrimitive` (`<Img>` / `<OffthreadVideo>` / `<AvatarFrame>`); keep the solid-color fallback when no layer resolves.

## Phase 3: Render Wiring

- [ ] 3.1 RED: extend `video-engine-cli.test.mjs` (or the new test) — the fake `@remotion/bundler` asserts `bundle` receives `publicDir` taken from `manifest.metadata.publicDir`.
- [ ] 3.2 GREEN: `tryRemotionRender` reads `manifest.metadata.publicDir` and passes `publicDir` to `bundle({ entryPoint, webpackOverride, publicDir })`; omit when absent.

## Phase 4: Verification

- [ ] 4.1 Real-media check: `node scripts/ensure-engine.mjs` then `compile` + `render` the automovil domaiNN; assert no `EncodingError`, 16 scenes, audio bound. (Skip if the engine/keys are unavailable in-session; record the reason.)
- [ ] 4.2 `node scripts/verify.js` green (auto-discovers the new `*.test.mjs`).
- [ ] 4.3 `node scripts/check-integrity.js` green before push/PR.
- [ ] 4.4 Confirm `ScriptRoot.tsx` `COMPOSITION_ID` (`script-composition`) and the `RemotionCompositionManifest` shape are unchanged.
