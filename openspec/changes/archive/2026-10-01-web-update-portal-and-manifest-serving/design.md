# Design: Public Web Update Portal and CDN Manifest Serving

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │               GitHub Pages / CDN             │
                    │           https://cognnitive.com/            │
                    └───────┬──────────────────────────────┬───────┘
                            │                              │
             /use/manifest.md /update/manifest.md   /update/ (Docsify/HTML)
                            │                              │
                            ▼                              ▼
             ┌─────────────────────────────┐┌─────────────────────────────┐
             │ Preflight & Lifecycle Tools ││ Human & AI Upgrade Center   │
             │ (nn-preflight, nn-upgrade)  ││ (Changelog, Matrices, Prompts)│
             └─────────────────────────────┘└─────────────────────────────┘
```

## Decisions

1. **CDN Endpoints with Graceful Offline Fallback**:
   - `DEFAULT_MANIFEST_URL` points to `https://cognnitive.com/use/manifest.md` as primary source.
   - If network request fails or times out (500ms), fallback to local cache or embedded snapshot without breaking offline CLI operations.
2. **Docsify & Static Site Routing**:
   - Add `docs/update/index.html` with Docsify configuration.
   - Include `_sidebar.md` and `README.md` in `docs/update/` detailing upgrade steps, blueprint versions, and CLI triggers.
3. **Deterministic Staging in `build-docs.mjs`**:
   - Ensure generated manifests (`manifest/source.yaml` rendered as markdown) are staged into both `docs/use/` and `docs/update/`.
