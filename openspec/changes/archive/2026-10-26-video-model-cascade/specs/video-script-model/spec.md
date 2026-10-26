# Delta for video-script-model

Scope: adds a video-level `template::` and fixes the model-selection precedence. The script stays
tool-agnostic (a `template::` is a reference, not an id).

## MODIFIED Requirements

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

## ADDED Requirements

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
