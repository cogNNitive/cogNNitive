# video-script-model Specification

## Purpose

Defines the native iNNfo modeling of video scripts. A video script IS a Level-3 kNNowledge document governed by the Level-2 `video-script` blueprint; the engine consumes that structured model directly and never re-implements or re-parses the script's markdown grammar. The model is tool-agnostic and declares no timing.
## Requirements
### Requirement: Script Is an iNNfo Level-3 Document

The video script MUST be an iNNfo Level-3 kNNowledge document whose `parent_spec` is the Level-2 `video-script` blueprint. The blueprint MUST define every Concept and Field the script may use. The engine's scene compiler MUST consume a structured iNNfo model and MUST NOT re-parse the script's markdown. The canonical source of that model is innfo-core `read_knowledge`; when an installed, zero-dependency skill cannot reach innfo-core, a thin structural adapter MAY emit the same `read_knowledge` shape — it MUST NOT re-implement the scene grammar and MUST be drift-guarded against innfo-core's model shape.

#### Scenario: Script validates against its blueprint

- GIVEN a script authored against the `video-script` blueprint
- WHEN it is validated as an L3 document
- THEN it validates with no schema errors

#### Scenario: Engine consumes the structured model

- GIVEN a valid L3 script document
- WHEN the engine reads it
- THEN it receives Concepts, Fields, and element order from a structured `read_knowledge`-shaped model
- AND the scene compiler performs no script markdown grammar parsing

### Requirement: Video-Scene-Layer Concept Hierarchy

The blueprint MUST define the root Concept `Video` containing `Scene` elements, each `Scene` containing `Layer` child elements, plus a top-level `Template` Concept. A video script MUST author `Layer` elements as nested `### NN Layer:` headings inside their parent `Scene`, setting `parentSlug` to the enclosing Scene slug. Flat headings SHALL remain supported for backward compatibility. A `Layer` MUST NOT exist at `Video` level.

#### Scenario: Scene owns its layers

- GIVEN a script with one Video and two Scenes
- WHEN the model is inspected
- THEN each Scene owns its own Layer elements
- AND no Layer is a direct child of the Video

#### Scenario: Nested layer establishes syntactic ownership

- GIVEN a script with `### NN Layer:` headings under a `## NN Scene:`
- WHEN parsed
- THEN each Layer element has `parentSlug` set to the Scene slug

### Requirement: One Video Per One Script

The model MUST map exactly one `Video` to exactly one script document. The model MUST NOT provide any versioning mechanism.

#### Scenario: A second Video is rejected

- GIVEN a script document that already declares one Video
- WHEN a second Video is added
- THEN validation fails naming the single-Video constraint

### Requirement: Narration Is the Scene Prose Body

Narration MUST be authored as the free-form prose BODY of the `Scene` element, after its `::` fields. Narration MUST NOT be a Field and MUST NOT be a Concept.

#### Scenario: Scene body is narration

- GIVEN a Scene with `::` fields followed by prose
- WHEN the model is read
- THEN the prose is exposed as the Scene body
- AND it is not represented as a Field or Concept

### Requirement: Layer `type::` Discriminator

Every `Layer` MUST declare a `type::` select field. The blueprint MUST define the allowed values
`presenter`, `background`, `b-roll`, `title`, `lower-third`, `caption`, `brand`, and `quote`.
Fields MAY differ per `type::` and validation MUST be conditional on it. A `caption` Layer is
**static text** for its own duration (e.g. a source credit); it MUST NOT be interpreted as
word-level narration subtitles (see "Narration Subtitles Are Not A Layer").
(Previously: `caption` defaulted to the owning Scene's narration body at the guard's discretion,
blurring static captions and narration subtitles.)

#### Scenario: Unknown layer type is rejected

- GIVEN a Layer whose `type::` value is not one of the allowed values
- WHEN the script is validated
- THEN validation fails naming the invalid `type::`

#### Scenario: Conditional fields are enforced

- GIVEN a Layer of `type::` `lower-third`
- WHEN it omits a field required for that type
- THEN validation fails for the missing field

#### Scenario: Caption is static text, not narration

- GIVEN a `caption` Layer declaring `text:: Fuente: The Guardian, 2026-10-24`
- WHEN the scene compiles
- THEN the overlay carries that static text for the Layer's duration
- AND it is never replaced by the Scene's narration body

### Requirement: Music Is a Scene Field

Music MUST be declared as a `music::` field on the `Scene`. Music MUST NOT be modeled as a `Layer`.

#### Scenario: Scene music does not become a layer

- GIVEN a Scene with a `music::` field
- WHEN the model is read
- THEN the music value is exposed as the Scene field
- AND no music Layer is emitted

### Requirement: Tool-Agnostic Script

The script model MUST be tool-agnostic: it MUST NOT contain a voice id, a model id, or a resolution. Any such value MUST live in a Template instance, not in the script.

#### Scenario: Tool data is absent from the script

- GIVEN a valid script document
- WHEN it is inspected
- THEN it contains no voice id, model id, or resolution value

### Requirement: Template Concept and `template::` Reference

The blueprint MUST define a `Template` Concept whose instances (carrying tool, voice, and model
configuration) live in an L3 document shipped by a Series. A `Scene` **or the `Video`** MAY
reference a Template instance through a `template::` reference field. A `Video`-level reference
MUST apply to every Scene of that Video unless a Scene (or a Layer, for avatars) overrides it.
(Previously: only a `Scene` could reference a Template.)

#### Scenario: Scene resolves its template

- GIVEN a Scene with a `template::` reference to a Template instance in the Series' L3 Template document
- WHEN the reference is resolved
- THEN the Template instance's tool, voice, and model configuration is available to the engine

#### Scenario: Video-level template applies to all scenes

- GIVEN a Video with a `template::` and a Scene without one
- WHEN the Scene resolves its template
- THEN it inherits the Video-level Template instance

#### Scenario: Scene template overrides the video template

- GIVEN a Video with a `template::` and a Scene with a different `template::`
- WHEN the Scene resolves its template
- THEN the Scene's own Template instance wins

### Requirement: Native Hierarchy and List Order

Scene nesting and ordering MUST use the native iNNfo hierarchy `# NN index` block. Scene order MUST equal list order. The model MUST NOT declare explicit ordering fields.

#### Scenario: Scene order follows the index list

- GIVEN a script with three Scenes in `# NN index` order
- WHEN the engine enumerates Scenes
- THEN they are returned in list order

### Requirement: No Declared Duration or Timing

The model MUST NOT declare duration or timing on any Concept. Duration and timing MUST be derived by the engine from synthesized media.

#### Scenario: Declared duration is rejected

- GIVEN a script declaring a duration or timing field
- WHEN it is validated
- THEN validation fails because the field is not defined by the blueprint

### Requirement: Model Selection Cascade

Model selection MUST follow one documented precedence, most specific first:

```
layer model:: (avatar)  >  scene template::  >  video template::  >  series Template  >  workspace guard defaults  >  blueprint default
```

A single resolver MUST be the only code path that returns a model id, and it MUST report the scope
that supplied it. No other component (guard, compiler, estimator) may select a model id
independently. An explicit CLI override MAY sit above the `layer` scope for a run, and when present
it MUST be recorded in the plan.

#### Scenario: Precedence is deterministic

- GIVEN a value set at more than one scope for the same kind
- WHEN the resolver runs
- THEN it returns the most specific value and names that scope

#### Scenario: One selection path

- GIVEN the engine scripts
- WHEN they are searched for model-id selection
- THEN every selection goes through the resolver

#### Scenario: CLI override is auditable

- GIVEN a run with `--avatar-model X`
- WHEN the plan is produced
- THEN the resolved avatar model is X with source `cli`
- AND the override is part of the plan approval

### Requirement: Narration Subtitles Are Not A Layer

Word-level narration subtitles MUST NOT be modelled as a `Layer` or any script element: they are
**derived** from the narration prose and the measured timings. If a video enables narration
captions, that is a video-level renderer feature, not script content. The blueprint MUST NOT
define a `type::` value whose semantics are narration subtitles, and validation MUST NOT require a
Layer for them.

#### Scenario: No Layer produces narration subtitles

- GIVEN a script whose video is configured with narration captions
- WHEN the model is inspected
- THEN no `Layer` is present for the subtitles

#### Scenario: Caption layer does not imply subtitles

- GIVEN a Scene with a `caption` Layer
- WHEN narration captions are disabled
- THEN the `caption` Layer renders as static text and no subtitles are emitted

