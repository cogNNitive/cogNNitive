# Capability Spec: `design-presets-template`

## Purpose

A structured iNNfo Level-2 template that MUST define multi-modal design tokens (web, video, illustration) as first-class, machine-queryable data entities.

## Requirements

### R1: Level 2 Template Definition
The template MUST be placed at `iNNfo/specs/templates/design-presets/spec_NN.md` with:
- `spec_version: "V_0-2-1"`
- `template_version: "V_0-1-0"`
- `level: 2`
- `parent_spec`: `iNNfo_V_0-2-1`

#### Scenario: Template header declares the required metadata
- GIVEN the `design-presets` template package
- WHEN its `spec_NN.md` header is inspected
- THEN `spec_version`, `template_version`, `level` and `parent_spec` are declared

### R2: Concepts and Fields
The template MUST define:
- Concept `DesignPreset`
- Fields:
  - `name`: string
  - `description`: markdown_inline
  - `category`: select (`web`, `video`, `illustration`, `unified`)
  - `palette`: string
  - `typography_ui`: string
  - `typography_video_title`: string
  - `typography_video_subtitle`: string
  - `illustration_prompt_anchor`: string
  - `illustration_negative_prompt`: string
  - `sample_preview`: image

#### Scenario: Preset concept exposes the token fields
- GIVEN the `DesignPreset` concept
- WHEN its declared fields are read
- THEN `palette`, both typography fields, the illustration prompt fields and `sample_preview` are present

### R3: Canonical Sample
A canonical Level-3 sample MUST be provided under `iNNfo/specs/templates/design-presets/samples/Ghostbusters_V_0-1-0_design-presets_NN.md` compliant with the Ghostbusters Inc. sample universe.

#### Scenario: Canonical sample is present
- GIVEN the `design-presets` template package
- WHEN its `samples/` folder is inspected
- THEN the Ghostbusters Inc. canonical sample exists and conforms to the template
