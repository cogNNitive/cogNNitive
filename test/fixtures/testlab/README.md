# TestLab coverage domain

Synthetic English-only test domain. It exercises every field type, the Concept 1 x Concept 2 matrix, markers, and all traceability paths (markdown, CSV row, JSON pointer, image/video/audio/PDF sidecars, artifact second-hop, review console). It also ships a procedures model that guides the lineage and citation checks in the generated domain console.

## Layout

- `domaiNN_NN.md` — workspace manifest (entrypoint the app opens; declares the models below).
- `specs/TestLab_V_0-1-0_spec_NN.md` — Level 2 blueprint (Concept 1, Concept 2, Edge Cases).
- `kNNowledge/TestLab_coverage_TestLab_NN.md` — Level 3 model. `parent_spec.url` is repo-relative; validate with the repo root as MCP root.
- `kNNowledge/TestLab_procedures_TestLab_procedures_NN.md` — Level 3 procedures model (`parent_spec.name` `procedures_V_0-3-2`). Guides the console walkthrough: open the console, enable Review mode, open Element 1B, read the changeset lineage and the resolved citations.
- `changes/testlab_reviewer_20261010T120000Z_changes_NN.md` — an applied `comment` changeset (fb-001) targeting Element 1B `photo`. It is the lineage the console shows for Element 1B.
- `sources/import/` — primary sources. Binaries (`pdf`, `png`, `mp4`, `mp3`) are placeholders; always cite their `*_sidecar_NN.md`.
- `artifacts/` — `testlab-report.md` (reusable as a second-hop source at `@## Result`) and `testlab-review.json` (console review fixture, item `fb-001` targets Element 1B `photo`).

## Rules proven here

- Binaries are never citation targets (`KU_BINARY_TARGET`); cite the sidecar.
- `sources::` is always a bracketed list, even for one entry.
- `reference` values use `[[Element Name]]` WikiLinks.
- Omitting `sources::` is legal (see Sourceless probe).
- Renaming `artifacts/testlab-report.md@## Result` must break the review and artifact-as-source probes.
