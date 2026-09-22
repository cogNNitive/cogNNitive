---
spec_version: "V_0-2-1"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/video/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"
template_version: "V_0-1-0"
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

* [[VideoProject]]

# NN Concept Definition

## NN Concept Definition: VideoProject
icon:: video
type:: category
color:: blue
weight:: 100

# NN Field Definition

## NN Field Definition: title
concept:: VideoProject
type:: string
description:: Title of the video project.

## NN Field Definition: description
concept:: VideoProject
type:: markdown_inline
description:: Short description of the video scope.

## NN Field Definition: script_path
concept:: VideoProject
type:: string
description:: Workspace-relative path to the generated Anydeo script artifact.

## NN Field Definition: status
concept:: VideoProject
type:: select
options:: [draft, scripting, rendering, published, archived]
description:: Production state of the video project.

# Video App

## A minimal schema for a video project: metadata and traceability to its sources

## Philosophy

The Video App models only what iNNfo uniquely contributes: the identity and provenance of a video project. The script itself is a **generated artifact**, authored in Anydeo V_0-3-3 syntax (scenes `@`, layers `@@`, `layer_type`, `scene_templates`, `scene_tts_model`, avatars) and owned by the `anydeo-script-builder` skill — it is not re-modelled as iNNfo data. The project element records where that artifact lives (`script_path`) and which sources it derives from (`sources::`), so the model never re-encodes structure Anydeo already expresses.

This replaces the retired `video-generator` pipeline, which modelled `Script`, `Storyboard`, `Asset` and three directional matrices in parallel with Anydeo and drifted on every script change.

## Objectives

- Provide a valid Level 2 template usable as `parent_spec` for video-project models.
- Model the project container only: `title`, `description`, `script_path`, `status`.
- Keep traceability to input documents through the reserved `sources::` property.
- Delegate script, scene, layer, and asset structure to the Anydeo specification.

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **VideoProject** | `category` | The video project container |

### Fields

| Concept | Field | Type | Purpose |
|---|---|---|---|
| VideoProject | `title` | string | Project title |
| VideoProject | `description` | markdown_inline | Scope description |
| VideoProject | `script_path` | string | Path to the generated Anydeo script artifact |
| VideoProject | `status` | select | draft / scripting / rendering / published / archived |

### Reserved Properties

`sources::` is an optional reserved property of the iNNfo meta-template used on an
Element to cite the source documents the project derives from. It requires no Field
Definition and is written as a bracketed list of `sources/nn/<file>#<heading-slug>`.

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) |
| Evaluable matrix | ❌ | Not applicable — pipeline structure lives in Anydeo |
| Graph edge | ❌ | Not applicable |
| Sequence | ❌ | Not applicable |

### Migrating from Video Generator

A workspace authored against the retired `video-generator` template stays valid: that
template is frozen and remains resolvable at its canonical path. To move to this
template, create a new model whose `parent_spec` points here, keep one `VideoProject`
element per video, move the script to an Anydeo `.md`/`.anydeo` artifact and record its
path in `script_path`, and cite the original sources with `sources::`. The old `Script`,
`Storyboard`, and `Asset` elements are dropped — Anydeo already owns that structure.

# Concept Guidance Documentation

## VideoProject

### Summary

A single video project container described by `title`, `description`, and `status`, pointing at the generated Anydeo script through `script_path`.

### Description

The `VideoProject` concept is the only concept of this template. One `## NN VideoProject: <name>` element models one video. Its fields hold the title, a short scope description, the workspace-relative path to the generated Anydeo script, and the production `status`. Traceability to input material is expressed with the reserved `sources::` property rather than with a separate `Source` concept.

### Methodologies

- One `VideoProject` element per video, kept as the single entry point of the model.
- Treat the script as an external artifact: point at it with `script_path`, never inline it.
- Keep `sources::` as the single traceability channel back to normalized sources.

### Prompts

- "Create a `VideoProject` named `<title>` describing `<scope>`."
- "Set `script_path` of `<project>` to `<path>` and status to `<published>`."
- "Which sources does `<project>` derive from?"
