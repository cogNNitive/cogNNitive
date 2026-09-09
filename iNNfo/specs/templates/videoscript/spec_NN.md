---
spec_version: "V_0-2-1"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/videoscript/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"
template_version: "V_0-1-0"
title: "VideoScript Template"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: false
  graph_edge:
    enabled: false
  sequence:
    enabled: true
    via: "order field"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[VideoScript]]
* [[Section]]
* [[Scene]]
* [[Layer]]
* [[ReleaseInfo]]

# NN Concept Definition

## NN Concept Definition: VideoScript
icon:: clapperboard
type:: text
color:: blue
weight:: 100

## NN Concept Definition: Section
icon:: folder
type:: list
color:: blue
weight:: 90

## NN Concept Definition: Scene
icon:: film
type:: list
color:: orange
weight:: 80

## NN Concept Definition: Layer
icon:: layers
type:: list
color:: green
weight:: 70

## NN Concept Definition: ReleaseInfo
icon:: tag
type:: text
color:: gray
weight:: 60

# NN Field Definition

## NN Field Definition: video_anydeo_specification
concept:: VideoScript
type:: string
description:: Pinned VUS specification version emitted as the `//ANYDEO_SPEC` header line. Confirmed set only; currently `V_0-3-3`.

## NN Field Definition: video_title
concept:: VideoScript
type:: string
description:: Human-readable title of the video, emitted under `# Video` as `- video_title:`.

## NN Field Definition: scene_voice
concept:: Scene
type:: string
description:: Default narration voice for the scene, emitted under `# Templates` (`@template base`) and per scene. Individual scenes may override the inherited voice.

## NN Field Definition: layer_type
concept:: Layer
type:: string
description:: Media kind of the layer (for example `image` or `text`), emitted as `- layer_type:` under `@@ <Name>`.

## NN Field Definition: layer_level
concept:: Layer
type:: string
description:: Stacking band of the layer as a numeric string: 0-10 background, 20-40 primary, 50+ overlay. Never emit `layer_z_index`.

## NN Field Definition: layer_asset_source
concept:: Layer
type:: string
description:: Asset reference for the layer, resolved from `![...](...)` references and emitted as `- layer_asset_source:`.

## NN Field Definition: layer_generation_subject
concept:: Layer
type:: string
description:: Generation subject prompt used when the layer asset is synthesized rather than referenced, emitted as `- layer_generation_subject:` (canonical V_0-3-3 key per VidGeNN oracle).

## NN Field Definition: layer_effects
concept:: Layer
type:: string
description:: Visual effect applied to the layer, emitted as `- layer_effects:`.

## NN Field Definition: layer_effect_speed
concept:: Layer
type:: string
description:: Playback speed of the layer effect, emitted as `- layer_effect_speed:`.

## NN Field Definition: layer_text_content
concept:: Layer
type:: string
description:: On-screen text of a text layer, emitted as `- layer_text_content:` (canonical V_0-3-3 key, proven by oracle round-trip 2026-09-09).

## NN Field Definition: order
concept:: Section
type:: string
description:: Deterministic sequence number (numeric string) of the section within its video. Output order follows ascending `order`, never authoring order.

## NN Field Definition: order
concept:: Scene
type:: string
description:: Deterministic sequence number (numeric string) of the scene within its section. Output order follows ascending `order`, never authoring order.

## NN Field Definition: order
concept:: Layer
type:: string
description:: Deterministic sequence number (numeric string) of the layer within its scene. Output order follows ascending `order`, never authoring order.

## NN Field Definition: video
concept:: Section
type:: reference
target_concepts:: [VideoScript]
description:: The VideoScript element this section belongs to.

## NN Field Definition: section
concept:: Scene
type:: reference
target_concepts:: [Section]
description:: The Section element this scene belongs to.

## NN Field Definition: scene
concept:: Layer
type:: reference
target_concepts:: [Scene]
description:: The Scene element this layer belongs to.

## NN Field Definition: release_version
concept:: ReleaseInfo
type:: string
description:: Version label of this VideoScript release. Model metadata only; never emitted to VUS.

## NN Field Definition: release_notes
concept:: ReleaseInfo
type:: string
description:: Free-form notes describing what changed in this VideoScript release. Model metadata only; never emitted to VUS.

# NN Marker Definition

## NN Marker Definition: importance
applies_to:: [Element]
symbol:: *
icon:: plus
color:: blue

# NN Matrix Definition

# VideoScript Template

## A minimal standalone template for authoring video scripts exported as pure VUS for VidGeNN

## Philosophy

The VideoScript Template covers the smallest slice that can drive a video generator: a scripted sequence of scenes and layers plus the release metadata that identifies the cut. It deliberately models nothing else — no sources, no storyboards, no asset pipeline. Those concerns belong to the pipeline-orchestration track (backlog #11), which may later reference this template as its output stage. The generated VUS `.md` file is the only interface to VidGeNN; no parsing, validation, or rendering logic lives in this template or in core/MCP code.

## Objectives

- Provide a minimal, valid Level 2 template usable as `parent_spec` for any video-script model.
- Constrain VUS output to the confirmed 9-property conformance floor until the oracle is pinned for more.
- Guarantee deterministic output through explicit numeric `order` fields on Section, Scene, and Layer.
- Keep the body valid against the `iNNfo_V_0-2-0` meta-template (the four root primitives instantiated in the body, no `concepts:`/`fields:` frontmatter).

## Specification

### Concepts

| Concept | Type | Purpose |
|---|---|---|
| **VideoScript** | `text` | Root script element carrying the VUS spec pin and video title |
| **Section** | `list` | Grouping of scenes; emits a grouping comment only, never VUS syntax |
| **Scene** | `list` | Narrated beat emitted as `@base <Title>` with a bare plain-text narration line |
| **Layer** | `list` | Visual layer emitted as `@@ <Name>` with confirmed props only |
| **ReleaseInfo** | `text` | Version label and notes for the cut; model metadata, never emitted |

### Fields

| Field | Concept | Purpose |
|---|---|---|
| `video_anydeo_specification` | VideoScript | VUS spec pin (`V_0-3-3`) |
| `video_title` | VideoScript | Video title |
| `scene_voice` | Scene | Default narration voice, inheritable |
| `layer_type` | Layer | Media kind (`image`, `text`, ...) |
| `layer_level` | Layer | Stacking band (0-10 bg / 20-40 primary / 50+ overlay) |
| `layer_asset_source` | Layer | Referenced asset path |
| `layer_generation_subject` | Layer | Generation subject prompt for synthesized assets |
| `layer_effects` | Layer | Visual effect name |
| `layer_effect_speed` | Layer | Effect playback speed |
| `order` | Section / Scene / Layer | Deterministic sequence number |
| `video` / `section` / `scene` | Section / Scene / Layer | Parent linkage references |
| `release_version` / `release_notes` | ReleaseInfo | Release metadata (never emitted) |

### Markers

| Marker | Purpose |
|---|---|
| `importance` | Core importance score (1–10) |

### Matrices

None by default. Add `# NN Matrix Definition` elements as your schema grows.

### Relationship Types

| Type | Enabled | Representation |
|---|---|---|
| Hierarchy | ✅ | index block (wikilinks) + parent linkage references (`video`, `section`, `scene`) |
| Evaluable matrix | ❌ | Not applicable by default |
| Graph edge | ❌ | Not applicable |
| Sequence | ✅ | Via `order` field — ascending numeric sequence within each parent |

## Template

### Level 3 Model Template (Lightweight)

To create a videoscript model, create a level 3 FILE mode document with:

```yaml
---
level: 3
parent_spec:
  name: "videoscript_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/videoscript/spec_NN.md"
model_version: "V_x-y-z"
title: "<Your Video Title>"
---

> [!NOTE]
> This is an **iNNfo document**...

# NN VideoScript

## NN VideoScript: <Title>
video_anydeo_specification:: V_0-3-3
video_title:: <Title>
<Opening prose here.>

# NN Section

## NN Section: <Section>
order:: 1
video:: [[<Title>]]
<Grouping prose here.>
```

The application will resolve the `parent` URL, download this template, and use its Concept, Field, Marker, and Matrix Definitions to validate and render your model. Scene narration is written as free prose under each `## NN Scene:` element (a bare plain-text line, never `- ` prefixed, never quoted). Unconfirmed properties must be dropped before oracle pin, never invented as VUS syntax.

## Examples

### Canonical Sample

See `samples/Ghostbusters_V_0-1-0_videoscript_NN.md` — the Ghostbusters-Inc. canonical sample (English-only, 1 Section, 2 Scenes, 2 Layers each) exercising every template field.

### Parent Chain

```yaml
# This template's parent:
parent_spec:
  name: "iNNfo_V_0-2-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-1_NN.md"
```

Models targeting this template set:

```yaml
parent_spec:
  name: "videoscript_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/videoscript/spec_NN.md"
```

# Concept Guidance Documentation

## VideoScript

### Summary
The root script element carrying the VUS specification pin and the video title.

### Description
A VideoScript element is the single entry point of a model. It declares which VUS specification version the output conforms to (`video_anydeo_specification`, currently `V_0-3-3`) and the human-readable `video_title` emitted under `# Video`. Write opening prose beneath the element to summarize the cut for human readers; prose is never emitted to VUS.

## Section

### Summary
A grouping of scenes that structures the script without emitting VUS syntax.

### Description
A Section element organizes scenes into acts or chapters. It carries an `order` number fixing its position in the output and a `video` reference linking it to its VideoScript parent. Sections serialize to a grouping comment only — they produce no `@`/`@@` blocks — so their child scenes emit under `# Scenes` in ascending `order`.

## Scene

### Summary
A narrated beat emitted as `@base <Title>` with a default voice and a plain-text narration line.

### Description
A Scene element is one beat of the video. It carries an `order` number, a `section` reference to its parent, and a `scene_voice` default inherited by its narration unless overridden. The element prose is the narration itself: serialize it as a bare plain-text line (never `- ` prefixed, never quoted) directly after the `@base <Title>` and `- scene_voice:` lines.

## Layer

### Summary
A single visual layer emitted as `@@ <Name>` with confirmed properties only.

### Description
A Layer element is one visual stacked on its scene. It carries an `order` number, a `scene` reference to its parent, and only the confirmed layer properties (`layer_type`, `layer_level`, `layer_level` bands 0-10 background / 20-40 primary / 50+ overlay, `layer_asset_source`, `layer_generation_subject`, `layer_effects`, `layer_effect_speed`). `![...](...)` references resolve to `layer_asset_source`. Unconfirmed properties are dropped before the oracle pin — never invented as VUS syntax — and `layer_z_index` must never appear.

## ReleaseInfo

### Summary
Version label and notes identifying a cut of the script.

### Description
A ReleaseInfo element records `release_version` and `release_notes` for the current cut of the VideoScript. It is pure model metadata for human traceability and is never emitted to the VUS output.
