# Delta for video-blueprint

## ADDED Requirements

### Requirement: Native L2 Video-Script Blueprint

The Level 2 blueprint `video-script` MUST define the Concepts and Fields for a native video script (`Video`, `Scene`, `Layer`, `Template`) using iNNfo `::` field syntax, and MUST be the schema an L3 script document adopts via `parent_spec`. The blueprint MUST NOT define VUS `scene_*` or `layer_*` fields.

#### Scenario: Blueprint defines the native concepts

- GIVEN the Level 2 `video-script` blueprint
- WHEN it is inspected
- THEN it defines `Video`, `Scene`, `Layer`, and `Template` Concepts with `::` Fields
- AND it defines no `scene_*` or `layer_*` fields

#### Scenario: An L3 script adopts the blueprint

- GIVEN an L3 script document whose `parent_spec` is the `video-script` blueprint
- WHEN the document is validated
- THEN its Concepts and Fields are checked against the blueprint

## REMOVED Requirements

### Requirement: Level 2 Video Blueprint Template Schema

(Reason: replaced by the native `video-script` blueprint; the `@template`/`@caption_template`/`@broll_template` VUS definitions no longer exist.)
(Migration: model reusable definitions as `Template` Concept instances in the Series' L3 Template document, referenced via `template::`.)

### Requirement: Blueprint Inheritance and Override

(Reason: the selective "series override wins" mechanism is replaced by a Series blueprint plus L3 Template-instance resolution.)
(Migration: a Series ships a blueprint (schema) plus an L3 Template-data document; scripts reference `template::`.)

### Requirement: Script-to-Blueprint Reference Resolution

(Reason: blueprint referencing is now native iNNfo `parent_spec` resolution, not bespoke VUS reference resolution.)
(Migration: adopt the blueprint via `parent_spec`; drop the external `@blueprint` reference.)
