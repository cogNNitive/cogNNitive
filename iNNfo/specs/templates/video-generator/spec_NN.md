---
spec_version: "V_0-2-1"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/video-generator/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"
template_version: "V_0-1-1"
title: "Video Generator Template"
relationship_types:
  hierarchy:
    enabled: true
    via: index block
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: true
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[VideoProject]]
  * [[Source]]
  * [[Script]]
  * [[Storyboard]]
  * [[Asset]]

# NN Concept Definition

## NN Concept Definition: VideoProject
icon:: video
type:: category
color:: blue
weight:: 100

## NN Concept Definition: Source
icon:: file-text
type:: weight
color:: blue
weight:: 80

## NN Concept Definition: Script
icon:: scroll-text
type:: sequence
color:: green
weight:: 90

## NN Concept Definition: Storyboard
icon:: layout-panel-top
type:: list
color:: purple
weight:: 70

## NN Concept Definition: Asset
icon:: clapperboard
type:: list
color:: orange
weight:: 60

# NN Field Definition

## NN Field Definition: title
concept:: VideoProject
type:: string
description:: Title of the video project.

## NN Field Definition: description
concept:: VideoProject
type:: markdown_inline
description:: Short description of the video scope.

## NN Field Definition: source_file
concept:: Source
type:: markdown_file
description:: Workspace-relative path to the source document.

## NN Field Definition: source_type
concept:: Source
type:: select
options:: [paper, transcript, footage, article]
description:: Kind of source material.

## NN Field Definition: source_url
concept:: Source
type:: url
description:: Optional canonical URL of the source.

## NN Field Definition: section
concept:: Script
type:: string
description:: Script section identifier.

## NN Field Definition: scene
concept:: Script
type:: string
description:: Scene identifier within the section.

## NN Field Definition: voiceover
concept:: Script
type:: markdown_inline
description:: Voiceover text for the scene.

## NN Field Definition: visual
concept:: Storyboard
type:: markdown_inline
description:: Visual description for the storyboard frame.

## NN Field Definition: sequence
concept:: Storyboard
type:: string
description:: Frame order within the storyboard.

## NN Field Definition: asset_path
concept:: Asset
type:: string
description:: Workspace-relative path to the produced asset.

## NN Field Definition: format
concept:: Asset
type:: select
options:: [video, audio, image, subtitle, vus]
description:: Output format of the produced asset.

## NN Field Definition: produced_at
concept:: Asset
type:: string
description:: ISO timestamp when the asset was produced.

# NN Marker Definition

## NN Marker Definition: rendered
applies_to:: [Element]
widget:: boolean
symbol:: ✓
icon:: clapperboard
color:: green
description:: Marked when the scene or asset has been rendered to its final form.

# NN Matrix Definition

## NN Matrix Definition: script source relations
source:: Script
target:: Source
widget:: set
widget_config:: {"max_selections": 1}
values:: [derived_from]
description:: A script section is derived from one source (directional: row script derives from column source).

## NN Matrix Definition: storyboard script relations
source:: Storyboard
target:: Script
widget:: set
widget_config:: {"max_selections": 1}
values:: [visualizes]
description:: A storyboard frame visualizes one script scene (directional).

## NN Matrix Definition: asset storyboard relations
source:: Asset
target:: Storyboard
widget:: set
widget_config:: {"max_selections": 1}
values:: [renders]
description:: A produced asset renders one storyboard frame (directional).

# Video Generator Template

## A schema for modelling the pipeline that turns a source into a video

## Philosophy

The Video Generator Template models the end-to-end pipeline that transforms a source (paper, transcript, footage, or article) into a finished video: a `Script` is derived from the `Source`, a `Storyboard` visualizes the script scene by scene, and each frame renders into an `Asset`. Sequence ordering on the `Script` concept captures the playback order.

## Objectives

- Provide a valid Level 2 template usable as `parent_spec` for video-pipeline models.
- Model the four-stage pipeline: Source → Script → Storyboard → Asset.
- Express stage-to-stage derivations as evaluable matrices.
- Keep the body valid against the `iNNfo_V_0-2-1` meta-template.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **VideoProject** | `category` | The video project container |
| **Source** | `weight` | Input material |
| **Script** | `sequence` | Ordered script sections |
| **Storyboard** | `list` | Visual frames |
| **Asset** | `list` | Produced outputs |

### Fields

| Concept | Field | Type | Purpose |
|---|---|---|---|
| VideoProject | `title` | string | Video title |
| VideoProject | `description` | markdown_inline | Scope description |
| Source | `source_file` | markdown_file | Source document path |
| Source | `source_type` | select | paper/transcript/footage/article |
| Source | `source_url` | url | Canonical URL |
| Script | `section` | string | Section identifier |
| Script | `scene` | string | Scene identifier |
| Script | `voiceover` | markdown_inline | Voiceover text |
| Storyboard | `visual` | markdown_inline | Frame visual description |
| Storyboard | `sequence` | string | Frame order |
| Asset | `asset_path` | string | Output path |
| Asset | `format` | select | video/audio/image/subtitle/vus |
| Asset | `produced_at` | string | ISO timestamp |

### Markers

| Marker | Applies to | Widget | Meaning |
|---|---|---|---|
| `rendered` | Element | boolean | The scene or asset reached its final form |

### Matrices

| Matrix | Source | Target | Values | Meaning |
|---|---|---|---|---|
| `script source relations` | Script | Source | `[derived_from]` | A script derives from one source |
| `storyboard script relations` | Storyboard | Script | `[visualizes]` | A frame visualizes one scene |
| `asset storyboard relations` | Asset | Storyboard | `[renders]` | An asset renders one frame |

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ✅ | stage-to-stage relations |
| Graph edge | ❌ | Not applicable |
# Concept Guidance Documentation

## VideoProject

### Summary

A single video project container, described by `title` and `description`, that groups its `Source`, `Script`, `Storyboard`, and `Asset` elements.

### Description

The `VideoProject` concept models the container: one `## NN VideoProject: <name>` element per project. Its fields hold the title and a short scope description. The pipeline stages live under the `Source`, `Script`, `Storyboard`, and `Asset` concepts.

### Methodologies

- One `VideoProject` element per video, kept as the single entry point of the model.
- Keep the `description` short and stable; it names the scope, not the stage list.

### Prompts

- "Create a `VideoProject` named `<title>` describing `<scope>`."
- "List every `Asset` produced for this `VideoProject`."

## Source

### Summary

The input material for the video, referenced by file or URL.

### Description

Each `Source` element carries `source_file` (a workspace-relative `markdown_file`), `source_type` (paper/transcript/footage/article), and an optional `source_url`. The `script source relations` matrix ties each script section back to the source it derives from.

### Methodologies

- One `Source` per distinct input document or footage file.
- Prefer the `source_url` over prose when the source is canonical online.

### Prompts

- "Add a `Source` of type `<transcript>` from `<path>`."
- "Which `Script` sections derive from this `Source`?"

## Script

### Summary

The ordered script: sections and scenes with voiceover, in playback order.

### Description

Each `Script` element carries `section`, `scene`, and `voiceover`. Because the `Script` concept is `sequence`, the index order encodes playback order. The `storyboard script relations` matrix links each frame to the scene it visualizes.

### Methodologies

- Keep the index order equal to the playback order; reorder via the index block, never via free text.
- One `Script` element per scene; group scenes under `section`.

### Prompts

- "Add a `Script` scene `<scene>` under section `<section>` with voiceover `<text>`."
- "Reorder the `Script` to play `<section>` before `<section>`."

## Storyboard

### Summary

Visual frames, each with a `sequence` number and a `visual` description.

### Description

Each `Storyboard` element carries `visual` (a frame description) and `sequence` (order). The `asset storyboard relations` matrix links each produced asset to the frame it renders.

### Methodologies

- One `Storyboard` frame per `Script` scene; keep `sequence` aligned with the script order.
- Record frame-to-scene links only through the `storyboard script relations` matrix.

### Prompts

- "Add a `Storyboard` frame for scene `<scene>` with visual `<description>`."
- "Which `Asset` renders this `Storyboard` frame?"

## Asset

### Summary

Produced outputs, referenced by path and format.

### Description

Each `Asset` element carries `asset_path`, `format` (video/audio/image/subtitle/vus), and `produced_at`. The `rendered` marker distinguishes finished assets from drafts. VUS (AnyDeo script) exports are a first-class format, reusing the AnyDeo scene/layer vocabulary.

### Methodologies

- One `Asset` per produced file; keep `asset_path` workspace-relative.
- Mark `rendered` only when the asset reached its final export form.

### Prompts

- "Add an `Asset` of format `<video>` at `<path>` produced at `<timestamp>`."
- "Which `Asset` elements are marked `rendered`?"