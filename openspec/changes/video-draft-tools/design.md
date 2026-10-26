# Design: Draft Tools Promoted To The Blueprint

## Context

Two workspace tools implement the review-before-spend workflow:

- `series/innteresante/tools/build-draft-html.mjs <draft.json>` → a self-contained
  `<slug>_draft_V_x-y-z.html` with base64 thumbnails and a "Guardar revisión" button exporting
  `<slug>_reviewed.json`.
- `series/innteresante/tools/build-script-from-draft.mjs <reviewed.json> --draft <draft.json> --out <script>`
  → the L3 `video-script` document.

Both embed iNNteresante specifics (template names, music path, filename, avatar model).

## Seam 1 — Series config (`video.series.json`)

A small, series-owned config the tools read instead of hardcoding:

```
{
  "series": "innteresante",
  "scriptTemplate": "templates_V_0-1-0_innteresante_NN.md",
  "templateFull": "iNNteresante :: Lucas Full",
  "templateSection": "iNNteresante :: Lucas Section",
  "defaultMusic": "../../shared/music/jazz.mp3",
  "defaultMusicVolume": "0.4",
  "scriptFilename": "<slug>_video-script_innteresante_NN.md",
  "defaultAvatarModel": "pruna-ai/p-video-2-pro/avatar",
  "defaultTransition": "fade"
}
```

The tools take `--series <dir>` (or discover it via the series root) and read `video.series.json`.
Absent config → sensible neutral defaults + a warning.

## Seam 2 — Tool interface (blueprint)

Moved under `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/`:

```
build-draft-html.mjs      <draft.json> --series <dir> --out <html>
build-script-from-draft.mjs <reviewed.json> --draft <draft.json> --series <dir> --out <script>
thumbnail-v1.mjs          (unchanged interface; already neutral)
```

The draft JSON schema is renamed to `video-script.draft.v1` (the shape is unchanged:
`{schema, slug, config, overlays, scenes[]}` with per-scene choices).

## Seam 3 — Editorial docs

`series_rules.md` keeps tone/structure/visual/format rules and DROPS model ids (those move to the
Template L3 through the cascade, change `video-model-cascade`). `script_template.md` is retired
(marked deprecated) because the script is generated, not copied.

## Data structures

- `VideoSeriesConfig` (new, series-owned).
- Draft JSON `video-script.draft.v1` (renamed from `innteresante.scene-decisions.v1`).

## Package boundaries

The promoted tools live in the skill's `scripts/` beside the engine. They depend on no engine
module except the neutral helpers. The workspace copies that already exist are left in place until
the series migrates to the promoted tools.

## Open questions (for design sign-off)

1. `video.series.json` discovery: series root via `series_rules.md` (as the engine does) or an
   explicit `--series`?
2. Whether `thumbnail-v1.mjs` is truly series-neutral today or also needs a config seam.
3. Whether the series config is a separate file or folded into the series `spec_NN.md` frontmatter.
