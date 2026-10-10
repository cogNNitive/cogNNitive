# video-blueprint Specification

## Purpose

The Level 2 `video-script` blueprint is the canonical schema for native video scripts. It defines the `Video`, `Scene`, `Layer`, and `Template` Concepts and Fields using iNNfo `::` syntax and is the schema an L3 script document adopts via `parent_spec`. The retired `video` blueprint and its `@template` definitions no longer exist.

## Requirements

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
