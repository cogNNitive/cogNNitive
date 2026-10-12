# Delta for video-script-model

## MODIFIED Requirements

### Requirement: Video-Scene-Layer Concept Hierarchy

The blueprint MUST define root Concept `Video` containing `Scene` elements, and `Scene` containing `Layer` child elements. A video script MUST author `Layer` elements as nested `### NN Layer:` headings inside their parent `Scene`, setting `parentSlug` to the enclosing Scene slug. Flat headings SHALL remain supported for backward compatibility. A `Layer` MUST NOT exist at `Video` level.

#### Scenario: Scene owns its layers

- GIVEN a script with one Video and two Scenes
- WHEN inspected
- THEN each Scene owns its Layer elements
- AND no Layer exists at Video level

#### Scenario: Nested layer establishes syntactic ownership

- GIVEN a script with `### NN Layer:` headings under a `## NN Scene:`
- WHEN parsed
- THEN each Layer element has `parentSlug` set to the Scene slug
