# Design: Video Composition Media Types

## Technical Approach

Two seams, one contract each:

1. **Compile-time resolve+stage** (`compileVideo`): every media reference the
   compiler emits is resolved against the **script directory**, copied into a
   Remotion-served public root, and rewritten in the manifest to a stable,
   bundle-relative name. The public root is recorded in the manifest so a later
   `render manifest.json` can find it.
2. **Render-time dispatch** (`Scene.tsx`): the component reads the already-resolved
   name and picks the Remotion primitive by `layer_type`. No path logic in the
   component beyond `staticFile()`.

This keeps `Scene.tsx` presentational: it never touches the filesystem, never
resolves `../` paths, and never guesses media kinds.

## Architecture Decisions

| Decision | Option A (chosen) | Option B rejected | Rationale |
|---|---|---|---|
| Asset delivery to Remotion | Stage into `<scriptDir>/public/` + `staticFile(name)` + `bundle({publicDir})` | Inline `data:` URIs / copy into scripts/ dir | `staticFile()` is the official Remotion resolver; keeps the manifest path-agnostic and the copy out of the skill tree. |
| Stage location | `<scriptDir>/public/` (durable, next to the media) | OS temp dir | A `render manifest.json` run must re-find the staged media; temp dies between runs. Mirrors the existing `layers/`/`audio/` staging convention. |
| Staged name | content-hash suffix (`intro_creadores_ab12.mp4`) | original basename | Two sources may share a basename (`../shared/x.mp4` vs `assets/x.mp4`); hashing guarantees uniqueness without a collision map. |
| Manifest rewrite | Replace `layer_asset_source` + audio `assetPath` with the staged name | Leave raw paths + resolve in component | Component purity: the same manifest renders on any host; all resolution happened once, at compile. |
| publicDir carried in | `manifest.metadata.publicDir` (absolute) | A sibling sidecar file | Zero new files; the manifest is already the render contract and is written next to the media. |
| Video primitive | `<OffthreadVideo>` from `remotion` | `<Img>` / `<Video>` | `<Img>` on an MP4 throws `EncodingError` (the reported bug). `OffthreadVideo` is Remotion's frame-accurate video primitive. |
| Avatar primitive | New `AvatarFrame.tsx` (framed styled image) | Reuse the generic image path | The spec asks for a distinct treatment; a named component makes the intent legible and testable. |
| Missing asset | Collect during staging; throw `VideoRenderError` | Skip silently / fall back to color | Spec: a genuinely missing asset fails loudly; no silent scene loss. |

## Data Flow

    script.md ─► compileVideo
        ├─ parse ─► scenes[].layers[].layer_asset_source (raw: assets/…, ../shared/…)
        ├─ for each layer + audio track:
        │     resolve(scriptDir, src)  ─exists?─► copy to <scriptDir>/public/<name>_<hash>.<ext>
        │     missing ─► collect into `missing[]`
        ├─ rewrite manifest: layer_asset_source/assetPath := <name>_<hash>.<ext>
        ├─ manifest.metadata.publicDir := <scriptDir>/public
        └─ missing.length ─► throw VideoRenderError (no silent loss)

    manifest.json ─► renderVideo ─► tryRemotionRender
        ├─ publicDir := manifest.metadata.publicDir
        ├─ bundle({ entryPoint, publicDir })
        ├─ selectComposition({ serveUrl, id: 'script-composition', inputProps: manifest })
        └─ renderMedia({ composition, serveUrl, ... })

    Scene.tsx  (pure)
        layer_type 'video'          ─► <OffthreadVideo src={staticFile(name)} />
        layer_type 'talking_avatar' ─► <AvatarFrame src={staticFile(name)} />
        layer_type 'image' / default─► <Img src={staticFile(name)} />
        no layer resolves            ─► backgroundColor fill

## Interfaces / Contracts

**Staging seam (testable without Remotion)** — a pure helper exported from
`video-engine-cli.mjs`:

    resolveMediaLayers({ scenes, audioTracks, scriptDir, publicDir })
      → { layers: RewrittenLayer[], audio: RewrittenAudio[], staged: number, missing: string[] }

It touches the filesystem (copy) but imports nothing from Remotion, so the test
can call it directly on a tmp fixture tree.

**Layer field ownership** — the compiler keeps emitting `layer_asset_source` as
authored (`assets/…`, `../shared/…`); only `compileVideo` rewrites it to the
staged name. `Scene.tsx` treats whatever is in the manifest as a
`staticFile()`-relative name.

**Asset resolution rule** — resolve a source as `path.resolve(scriptDir, src)`
whether or not it is out-of-dir. Absolute sources are used as-is. This single
rule covers `assets/…`, `../shared/…`, and synthesized cache paths (already
absolute), replacing the cwd-relative `fs.existsSync(src)` that never matched.

## File Changes

| File | Action | Description |
|---|---|---|
| `skills/nn-video-script/scripts/video-engine-cli.mjs` | Modify | Add `resolveMediaLayers`; wire into `compileVideo` (stage+rewrite, set `metadata.publicDir`, throw on missing); pass `publicDir` to `bundle()` in `tryRemotionRender`. |
| `skills/nn-video-script/scripts/scene/Scene.tsx` | Modify | Replace `resolveBackgroundImage` with `renderLayer` dispatch: `Img` / `OffthreadVideo` / `AvatarFrame`, each via `staticFile()`; keep color fallback. |
| `skills/nn-video-script/scripts/scene/AvatarFrame.tsx` | Create | Distinct framed/styled avatar image treatment. |
| `skills/nn-video-script/test/scene-media-types.test.mjs` | Create | Layer→primitive mapping + in-dir/out-of-dir resolution + loud-missing-asset tests. |
| `openspec/specs/cognnitive-video-engine/spec.md` | Modify | MODIFIED requirements for media rendering and asset resolution. |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `resolveMediaLayers` copies in-dir + out-of-dir sources into `publicDir`, rewrites to unique names, reports `missing` | tmp fixture tree; assert files exist + paths rewritten; no Remotion import |
| Unit | `compileVideo` throws `VideoRenderError` (or equivalent) when a referenced asset is absent | tmp script referencing a non-existent `../shared/x.mp4` |
| Unit | Layer→primitive mapping | export the pure `pickLayerPrimitive(layerType)` decision (returns `'video' \| 'avatar' \| 'image'`) and assert each mapping; `Scene.tsx` consumes it |
| Integration | `bundle()` receives `publicDir` from the manifest | fake `@remotion/bundler` via existing `loadModule` seam; assert `bundle` args include `publicDir` |
| Regression | `ScriptRoot.tsx` `COMPOSITION_ID` and manifest shape unchanged | grep + existing `video-engine-cli.test.mjs` pass |

The primitive mapping is expressed as a **pure function** (`pickLayerPrimitive`)
exported alongside `Scene.tsx` logic so the test needs no React/Remotion runtime.

## Migration / Rollout

No data migration. Compile now writes a `public/` dir next to the script (a local
build artifact, gitignored by the workspace). Existing manifests without
`metadata.publicDir` still render as color-or-image backgrounds (the renderer
falls back to no `publicDir`). Rollback = revert the commits.

## Resolved Questions

- [x] **Where does the staged public root live?** RESOLVED — `<scriptDir>/public/`, next to the media and the existing `layers/`/`audio/` staging dirs. Durable across compile→render invocations; documented in `manifest.metadata.publicDir`.
- [x] **How does `render manifest.json` find the staged media?** RESOLVED — the absolute public root is persisted in `manifest.metadata.publicDir`; the renderer reads it and passes it as `bundle({ publicDir })`. An absent value degrades to image-or-color (no crash).
- [x] **Does staging belong in the compiler or the CLI?** RESOLVED — the CLI (`compileVideo`), mirroring the existing `layers/`/`audio/` staging. The compiler stays a pure manifest producer; `Scene.tsx` stays presentational.
- [x] **Is `staticFile()` in the component a purity violation?** RESOLVED — No. `staticFile()` is a pure name→URL mapping with no filesystem access; it is the idiomatic Remotion resolver and the component stays free of path logic.
