# TestLab coverage domain

Synthetic English-only test domain. It exercises every field type, the Concept 1 x Concept 2 matrix, markers, and all traceability paths (markdown, CSV row, JSON pointer, image/video/audio/PDF sidecars, artifact second-hop, review console).

## Layout

- `domaiNN_NN.md` — workspace manifest (entrypoint the app opens; declares the model below).
- `specs/TestLab_V_0-1-0_spec_NN.md` — Level 2 blueprint (Concept 1, Concept 2, Edge Cases).
- `kNNowledge/TestLab_coverage_TestLab_NN.md` — Level 3 model. `parent_spec.url` is repo-relative; validate with the repo root as MCP root.
- `sources/import/` — primary sources. Binaries (`pdf`, `png`, `mp4`, `mp3`) are placeholders; always cite their `*_sidecar_NN.md`.
- `artifacts/` — `testlab-report.md` (reusable as a second-hop source at `@## Result`) and `testlab-review.json` (console review fixture, item `fb-001` targets Element 1B `photo`).

## Rules proven here

- Binaries are never citation targets (`KU_BINARY_TARGET`); cite the sidecar.
- `sources::` is always a bracketed list, even for one entry.
- `reference` values use `[[Element Name]]` WikiLinks.
- Omitting `sources::` is legal (see Sourceless probe).
- Renaming `artifacts/testlab-report.md@## Result` must break the review and artifact-as-source probes.
