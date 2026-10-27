## Why

The `video` blueprint — the one that gave an episode its catalogue record (`slug`, `status`,
`script`, `master`, `thumbnail`, `voice_id`) — was torn down by `1378a150a` and no longer exists; the
living `video-blueprint` spec already records that. The survivor, `video-script`, models the *script*
(`Video` → `Scene` → `Layer`) and declares none of those fields, so `video_NN/series/*` still builds
four series models on a blueprint that is gone. Their elements use `slug`, `title`, `description`,
`status`, `script`, `master`, `master_vertical`, `thumbnail`, `thumbnail_vertical` and `voice_id`; of
those only `title` exists in `video-script`. The domain's own `plan_alineacion_video.md` records the
symptom — 19 models pin a local `spec_NN.md` instead of a canonical versioned blueprint.

Two concepts named `Video` coexisted because of that split, so one `concept:Video` facet merged the
episode record and the script root. Folding the catalogue fields onto the survivor's `Video` concept
removes the ambiguity **without a rename**: the concept is already called `Video`, and with the
delivery fields on it, it *is* the episode. The retired blueprint's role is absorbed.

## What Changes

- `video-script`'s `Video` concept gains six fields: `description`, `status`, `script`, `master`,
  `thumbnail`, `voice_id`. `slug` is the reserved iNNfo identity property, not a Field Definition of
  this blueprint, so it is not declared.
- Blueprint version bump (`V_0-13-7` — the convention increments the last digit per change) and the
  `adopted` field in `iNNfo/specs/bluepriNNts/catalog.json` plus its
  `docs/innfo/blueprints/catalog.json` mirror, released as a `blueprints-v*` tag. `video-script` is
  distributed on demand: it has no `manifest/source.yaml` entry.
- `video_NN`'s four series models re-parent to `video-script`. Their `## NN Video:` headings do not
  change: both blueprints name the concept `Video`.
- No field is removed, no concept renamed, and the engine path is untouched — it writes
  `# NN Video` (`build-script-from-draft.mjs`) and reads the script root (`scene-compiler.mjs`).

## Decisions (resolved, task 1)

- **Format variants are engine-level, not modelled.** `render-formats.mjs` derives variants from the
  square master by convention (`slugFromMaster()` strips the `_<W>x<H>` suffix; `variantName()` →
  `` `${slug}_${width}x${height}.mp4` ``; `FORMAT_PRESETS.vertical` is 1080x1920). `master_vertical`
  and `thumbnail_vertical` are therefore **not** added: the variant path is computable from `master`.
  Consequence: the four series models lose those two fields and the console stops showing them; the
  files stay on disk. The information was duplicated, not lost.
- **The `series:` frontmatter block needs no blueprint change.** The engine locates a series by
  convention — `nearest.mjs` `SERIES_MARKERS = ['series_NN.md', 'series_rules.md',
  'script_template.md']`, and the `series-script-templates` spec already allows one `series_NN.md` as
  the `series` cascade level. The frontmatter block was the retired blueprint's AD1 convention; its
  keys map to files the engine already finds by name, so this is domain work, not blueprint work.
- **No delta for the retirement.** `openspec/specs/video-blueprint/spec.md` already states that the
  retired `video` blueprint no longer exists.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `video-script-model`: the `Video` concept also carries the episode's catalogue and delivery fields,
  and derived format variants are never modelled.

## Impact

- One concept gains six fields; nothing is removed and no engine behavior changes.
- Affects the four `video_NN` series models, plus any other domain still built on the retired
  blueprint.
- Needs a release: the fields only reach consumers through a `blueprints-v*` tag.
- The domain migration is its own changeset path (re-parent, add the `series_NN.md` documents, drop
  the frontmatter `series:` block).
