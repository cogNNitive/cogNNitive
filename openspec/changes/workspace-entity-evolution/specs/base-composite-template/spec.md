# Base Composite Template

## Purpose

Define a new Level-2 composite template package `base_V_0-1-0` that composes `workspace_V_0-2-0` and `cogNNitive_V_0-2-0` via `includes`, providing an opt-in overview-root document pattern that makes the inventory manifest and the provenance model siblings under one parsed parent, without altering either published template.

## Requirements

### Requirement: `base` Package Composition

The `base_V_0-1-0` Level-2 template MUST declare `includes: [workspace_V_0-2-0, cogNNitive_V_0-2-0]`. It MUST define an `Overview` concept with two `type:: model` fields: `manifest` (`target_template:: workspace_V_0-2-0`) and `provenance` (`target_template:: cogNNitive_V_0-2-0`). The package MUST NOT modify `workspace_V_0-2-0_spec_NN.md` or `cogNNitive_V_0-2-0_NN.md` in place.

#### Scenario: base template composes both peers additively
- GIVEN the `base_V_0-1-0` template package
- WHEN `resolveTemplateSchema()` composes it
- THEN the resolved schema includes all concepts, fields, markers, and matrices from both `workspace_V_0-2-0` and `cogNNitive_V_0-2-0` alongside `base`'s own `Overview` concept
- AND neither included template's source file is modified

#### Scenario: No composition collision between workspace and cogNNitive
- GIVEN `workspace_V_0-2-0` and `cogNNitive_V_0-2-0` define disjoint concept and field names
- WHEN `base_V_0-1-0` includes both without an `alias` map
- THEN composition succeeds with no `[COMPOSITION_COLLISION]` error

### Requirement: Opt-In Overview-Root Entrypoint Pattern

A Level-3 model conforming to `base_V_0-1-0` (filename pattern `*_base_NN.md`) MAY act as the workspace's overview root. When such a file is present at the workspace root, it MUST be discovered as the primary entrypoint ahead of `workspace*.md` (per the `workspace-entrypoint` capability). Its `manifest` and `provenance` fields make the pure-inventory manifest and the cogNNitive provenance model children of the overview root in the parsed graph. Workspaces that do not adopt this pattern MUST remain byte-for-byte unaffected.

#### Scenario: Overview root composes manifest and provenance as children
- GIVEN `acme_base_01.md` conforming to `base_V_0-1-0` with `manifest:: [[workspace_01.md]]` and `provenance:: [[acme_cogNNitive_01.md]]`
- WHEN the workspace is parsed
- THEN `workspace_01.md` and `acme_cogNNitive_01.md` both appear as children of `acme_base_01.md` in the parsed graph

#### Scenario: Adoption is opt-in and non-breaking
- GIVEN an existing workspace with only `workspace_01.md` and no `*_base_NN.md` file
- WHEN the workspace is parsed
- THEN parsing behaves identically to before this capability existed

### Requirement: `base` as the Sanctioned Composer of `workspace`

The `base_V_0-1-0` specification MUST explicitly state that `base` is the one sanctioned composer of `workspace_V_0-2-0` via `includes`, since `workspace_V_0-2-0_spec_NN.md` itself states no domain template includes it.

#### Scenario: base spec documents the exception
- GIVEN the published note in `workspace_V_0-2-0_spec_NN.md` that no domain template `includes` it
- WHEN `base_V_0-1-0_spec_NN.md` is authored
- THEN it explicitly documents that `base` is a structural, sanctioned exception to that note, not a domain vocabulary
