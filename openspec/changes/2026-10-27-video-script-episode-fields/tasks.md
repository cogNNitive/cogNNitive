# Tasks

## 1. Decide the shape (before any code)

- [ ] 1.1 `master_vertical` / `thumbnail_vertical`: blueprint fields, or engine-level formats? Check
      `render-vertical.mjs` / `render-formats.mjs` and the `video-asset-pipeline` and
      `two-phase-thumbnail` specs first.
- [ ] 1.2 Does the domain's `series:` frontmatter block map onto `video-script`'s `Series` concept,
      or stay a frontmatter convention? Read the retired blueprint's AD1 note (Series reuses the
      video template) and `video-production-hierarchy`.
- [ ] 1.3 Name the capability that records the retirement (`video-blueprint` vs `video-template`).

## 2. Blueprint (`video-script`)

- [ ] 2.1 Add the Field Definitions to the `Video` concept and update field tables, Concept Guidance
      and the `# NN index` taxonomy.
- [ ] 2.2 Bump `blueprint_version`; update `manifest/source.yaml`, the catalog and version parity.
- [ ] 2.3 Update the Ghostbusters sample and `_samples_nn` so samples stay valid.

## 3. Capability deltas

- [ ] 3.1 `specs/video-script-model/spec.md`: the `Video` concept carries the episode's catalogue and
      delivery fields.
- [ ] 3.2 Capability delta for the retirement (per 1.3).

## 4. Domain migration (`video_NN`, separate changeset path)

- [ ] 4.1 Re-parent the four series models to `video-script` and drop the local
      `specs/bluepriNNts/video/V_0-7-3` pin.
- [ ] 4.2 Confirm the vertical deliverables and the `series:` block resolve against the decision from
      task 1.
- [ ] 4.3 Regenerate the domain console and the lineage record; confirm the `concept:Video` count
      drops to one entry per video.

## 5. Release and gates

- [ ] 5.1 `node scripts/verify.js` + green CI on `dev`.
- [ ] 5.2 `nn-dev-release`: `blueprints-v*` tag.
- [ ] 5.3 Confirm the tag's workflow run and that consumers resolving the remote blueprint see the
      new fields.
