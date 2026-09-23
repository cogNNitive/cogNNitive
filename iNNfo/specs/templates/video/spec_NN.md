---
spec_version: "V_0-2-1"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/video/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"
template_version: "V_0-2-0"
title: "Video App"
procedures:
  - id: "generate-anydeo-script"
    name: "Generate Anydeo Script"
    path: "procedures/generate_anydeo_script_NN.md"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: false
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[Video]]

# NN Concept Definition

## NN Concept Definition: Video
icon:: video
type:: category
color:: blue
weight:: 100

# NN Field Definition

## NN Field Definition: title
concept:: Video
type:: string
description:: Title of the video.

## NN Field Definition: description
concept:: Video
type:: markdown_inline
description:: Short description of the video scope.

## NN Field Definition: script
concept:: Video
type:: file
description:: The Anydeo V_0-3-3 script, stored in the video's own folder.

## NN Field Definition: thumbnail
concept:: Video
type:: image
description:: Cover image of the video.

## NN Field Definition: voiceover
concept:: Video
type:: audio
description:: Master voiceover track of the video.

## NN Field Definition: master
concept:: Video
type:: video
description:: Rendered video file of the video.

## NN Field Definition: status
concept:: Video
type:: select
options:: [draft, scripting, rendering, published, archived]
description:: Production state of the video.

# Video App

## A minimal schema for one video: its metadata, its own media folder, and traceability to its sources

## Philosophy

The Video App models one video as a single Element that owns its own media folder. The script is a **generated artifact** authored in Anydeo V_0-3-3 syntax (scenes `@`, layers `@@`, `layer_type`, `scene_templates`, `scene_tts_model`, avatars) and owned by the `anydeo-script-builder` skill — it is not re-modelled as iNNfo data. The Element records where its files live and which sources it derives from (`sources::`), so the model never re-encodes structure Anydeo already expresses.

This replaces the retired `video-generator` pipeline, which modelled `Script`, `Storyboard`, `Asset` and three directional matrices in parallel with Anydeo and drifted on every script change.

## The video folder

Every file-backed field of a video resolves to one folder named after the video Element:

```
{modelDir}/assets/{video-slug}/{filename}
```

The field values are **bare filenames** — they do not repeat the folder, because the folder already identifies the video. So `script:: script.md` on the Element `Recruitment Spot` (slug `recruitment-spot`) resolves to:

```
assets/recruitment-spot/script.md
```

Renaming the Element renames its folder with it. One video, one folder, all of its media inside.

## Objectives

- Provide a valid Level 2 template usable as `parent_spec` for video models.
- Model one video per Element: `title`, `description`, `status`, and its media fields.
- Keep every file of a video inside that video's own folder.
- Keep traceability to input documents through the reserved `sources::` property.
- Delegate script, scene, layer, and asset structure to the Anydeo specification.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **Video** | `category` | One video, its metadata, and its media folder |

### Fields

| Concept | Field | Type | Purpose |
|---|---|---|---|
| Video | `title` | string | Video title |
| Video | `description` | markdown_inline | Scope description |
| Video | `script` | file | Anydeo V_0-3-3 script (`assets/{slug}/`) |
| Video | `thumbnail` | image | Cover image (`assets/{slug}/`) |
| Video | `voiceover` | audio | Master voiceover track (`assets/{slug}/`) |
| Video | `master` | video | Rendered video file (`assets/{slug}/`) |
| Video | `status` | select | draft / scripting / rendering / published / archived |

Each file-backed field holds exactly one filename. A video that needs several images or several voice clips keeps them in its folder as attachments.

### Reserved Properties

`sources::` is an optional reserved property of the iNNfo meta-template used on an Element to cite the source documents the video derives from. It requires no Field Definition and is written as a bracketed list of `sources/nn/<file>#<heading-slug>`.

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ❌ | Not applicable — pipeline structure lives in Anydeo |
| Graph edge | ❌ | Not applicable |
| Sequence | ❌ | Not applicable |

### Migrating from Video Generator

A workspace authored against the retired `video-generator` template stays valid: that template is frozen and remains resolvable at its canonical path. To move to this template, create a new model whose `parent_spec` points here, keep one `Video` Element per video, put its files in `assets/{video-slug}/`, and cite the original sources with `sources::`. The old `Script`, `Storyboard`, and `Asset` elements are dropped — Anydeo already owns that structure.

# Concept Guidance Documentation

## Video

### Summary

One video: its title, description, and status, plus the file-backed fields `script`, `thumbnail`, `voiceover`, and `master`, all stored in the video's own folder.

### Description

The `Video` concept is the only concept of this template. One `## NN Video: <name>` Element models one video. Its `title`, `description`, and `status` describe the video; its file-backed fields (`script`, `thumbnail`, `voiceover`, `master`) point at files inside `assets/{video-slug}/` using bare filenames. Traceability to input material is expressed with the reserved `sources::` property rather than with a separate `Source` concept.

### Methodologies

- One `Video` Element per video, kept as the single entry point of the model.
- Treat the script as an external artifact: point at it with `script`, never inline it.
- Keep all of a video's media in its own folder; never scatter files across the workspace.
- Keep `sources::` as the single traceability channel back to normalized sources.

### Prompts

- "Create a `Video` named `<title>` describing `<scope>`."
- "Set `script` of `<video>` to `script.md` and status to `published`."
- "Which sources does `<video>` derive from?"
