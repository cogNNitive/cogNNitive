# Tasks

## 1. Decisions — resolved

- [x] 1.1 `master_vertical` / `thumbnail_vertical`: **engine-level, not modelled.**
      `render-formats.mjs` derives variants from `master` by convention (`slugFromMaster()` +
      `variantName()`), so no field is added.
- [x] 1.2 The `series:` frontmatter block: **no blueprint change.** The engine locates a series by
      convention (`SERIES_MARKERS = series_NN.md | series_rules.md | script_template.md`) and
      `series-script-templates` already allows the `series_NN.md` document. Domain work.
- [x] 1.3 Retirement capability: **none needed.** `video-blueprint`'s Purpose already records that
      the retired `video` blueprint no longer exists.

## 2. Blueprint (`video-script`)

- [x] 2.1 Added the six Field Definitions to the `Video` concept: `description`, `status`, `script`,
      `master`, `thumbnail`, `voice_id`. `slug` is the reserved iNNfo identity property and is not
      redeclared. The `## Video` Concept Guidance now documents the record and the derived-variant
      rule. `# NN index` lists concepts only, so it does not change.
- [x] 2.2 Bumped `blueprint_version` to `V_0-13-7` and regenerated
      `iNNfo/specs/bluepriNNts/catalog.json` with `node scripts/blueprint-catalog.mjs` (2 lines:
      `adopted` and `versions[0].blueprint_version`); `--check` is green. There is no
      `manifest/source.yaml` entry for `video-script`.
- [x] 2.3 **No-op.** `video-script` ships no `samples/` directory and has no `SAMPLE_MAPPINGS` entry,
      so `samples-version-coherence` has nothing to check.

## 3. Capability delta

- [ ] 3.1 `specs/video-script-model/spec.md`: the `Video` concept carries the episode record, and
      derived format variants are never modelled. (Written; the normative line is a single physical
      line to satisfy the `check-openspec-deltas.mjs` guard.)

## 4. Domain migration (`video_NN`, separate changeset path)

- [ ] 4.1 Re-parent the four series models to `video-script` and drop the local
      `specs/bluepriNNts/video/V_0-7-3` pin.
- [ ] 4.2 Drop `master_vertical` / `thumbnail_vertical` from the models and let the variant paths be
      derived.
- [ ] 4.3 Add the `series_NN.md` documents and retire the frontmatter `series:` blocks.
- [ ] 4.4 Regenerate the domain console and the lineage record; confirm one `Video` entry per episode.

## 5. Release and gates

- [ ] 5.1 `node scripts/verify.js` + green CI on `dev`.
- [ ] 5.2 `nn-dev-release`: `blueprints-v*` tag.
- [ ] 5.3 Confirm the tag's workflow run and that consumers resolving the remote blueprint see the
      new fields.
