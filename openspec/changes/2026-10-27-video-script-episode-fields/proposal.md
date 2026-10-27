## Why

The `video` blueprint — the one that gave an episode its catalogue record (`slug`, `status`,
`script`, `master`, `thumbnail`, `voice_id`) — was torn down by `1378a150a` ("tear down VUS parser
package, mirror and old video blueprint"). It is no longer shipped and has no entry in
`manifest/source.yaml`; the only `## NN Concept Definition: Video` left in the repository is the one
in `video-script`.

The survivor models only the *script* (`Video` → `Scene` → `Layer`) and declares none of the
catalogue fields. So `video_NN/series/*` still builds four series models on a blueprint that no
longer exists: `Cosicah_V_0-1-0_video_NN.md`, `INNteresante_video_NN.md`,
`INNtrevistas_V_0-1-0_video_NN.md` and `VillabotijosToday_video_NN.md`. Their elements use `slug`,
`title`, `description`, `status`, `script`, `master`, `master_vertical`, `thumbnail`,
`thumbnail_vertical` and `voice_id`; of those, only `title` exists in `video-script`. The domain's
own `plan_alineacion_video.md` already records the symptom — 19 models pin a local `spec_NN.md`
instead of a canonical versioned blueprint.

Two concepts named `Video` coexisted because of that split: the catalogue entry and the script root.
One `concept:Video` facet merged them, so a single video counted more than once. Retiring the
catalogue blueprint and folding its fields onto the survivor's `Video` concept removes the ambiguity
**without a rename** — the surviving concept is already called `Video`, and with the delivery fields
on it, it *is* the episode.

## What Changes

- `video-script` gains the episode's catalogue and delivery fields on its `Video` concept: `slug`,
  `description`, `status`, `script`, `master`, `thumbnail`, `voice_id`, plus the vertical
  deliverables the domain already uses (`master_vertical`, `thumbnail_vertical`).
- Blueprint version bump, `manifest/source.yaml`, catalog and version-parity regeneration, released
  as a `blueprints-v*` tag.
- `video_NN`'s four series models re-parent to `video-script` from the retired blueprint. Their
  `## NN Video:` headings do not change: both blueprints name the concept `Video`.
- No field is removed and no concept is renamed. The engine path is untouched — it writes
  `# NN Video` (`build-script-from-draft.mjs`) and reads the script root (`scene-compiler.mjs`).

## Open Decisions (task 1)

- Whether `master_vertical` / `thumbnail_vertical` belong in the blueprint at all, or stay
  engine-level formats (`render-vertical.mjs`, `render-formats.mjs`).
- Whether the domain's `series:` frontmatter block (procedure, script_template, rules, shared_assets,
  config) maps onto `video-script`'s `Series` concept, or stays a frontmatter convention to be
  specified.
- Which capability owns the retired blueprint's record — `video-blueprint`, `video-template` or a new
  one.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `video-script-model`: the `Video` concept also carries the episode's catalogue and delivery fields.
- `video-blueprint` (or `video-template`): the catalogue blueprint is retired and its role is
  absorbed by `video-script`.

## Impact

- One blueprint gains fields; nothing is removed and no engine behavior changes.
- Affects the four `video_NN` series models, plus any other domain still built on the retired
  blueprint.
- Needs a release: the fields only reach consumers through a `blueprints-v*` tag.
- The domain migration is a separate changeset path (re-parent + validate), not a repo change.
