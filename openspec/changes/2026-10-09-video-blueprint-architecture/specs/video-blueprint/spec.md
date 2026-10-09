# Delta for video-blueprint

## ADDED Requirements

### Requirement: Level 2 Video Blueprint Template Schema

The system MUST define reusable template definitions inside the Level 2 video blueprint (`iNNfo/specs/bluepriNNts/video/spec_NN.md`): `@template` (scene), `@caption_template`, and `@broll_template`. Each template MUST declare its style, animation, and positioning contract. The blueprint MUST be the canonical home for these reusable definitions, so they are shared across every video series that inherits from it.

#### Scenario: Template kinds are declared in the blueprint

- GIVEN the Level 2 video blueprint
- WHEN it is inspected
- THEN it declares `@template`, `@caption_template`, and `@broll_template` definitions
- AND each definition exposes a style, animation, and positioning contract

#### Scenario: Caption overlay resolves its contract from the blueprint

- GIVEN a `@caption_template` declaring typography and enter/exit animation
- WHEN a caption overlay is compiled
- THEN its styling and animation are sourced from that declaration

### Requirement: Blueprint Inheritance and Override

The system MUST support a domain-level shared blueprint plus series-level overrides. A series-level override MUST take precedence over the domain default. When a referenced template or blueprint is missing, the system MUST fall back to sensible system defaults and MUST NOT fail rendering.

#### Scenario: Series override wins over the domain default

- GIVEN a domain default and a series-level override for the same template name
- WHEN the series' video is compiled
- THEN the series-level definition is applied

#### Scenario: Missing template falls back without failing

- GIVEN a script that references an undefined template
- WHEN the script is compiled
- THEN system default styling and animation are applied
- AND compilation succeeds with no crash

### Requirement: Script-to-Blueprint Reference Resolution

A VUS script MUST be able to reference an external video blueprint. The scene compiler MUST resolve template definitions from the referenced blueprint and compose them into the scene styling, with no manual JSON authored in the script.

#### Scenario: External blueprint is resolved and composed

- GIVEN a VUS script referencing an external video blueprint
- WHEN the scene compiler processes it
- THEN the referenced templates are resolved and applied to the compiled scenes

#### Scenario: Missing blueprint reference is non-fatal

- GIVEN a VUS script referencing a blueprint that does not exist
- WHEN the scene compiler processes it
- THEN it applies system defaults and emits a warning
- AND it does not abort compilation
