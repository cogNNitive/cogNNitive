# Workspace Entrypoint

## Purpose

Establish first-class support for formal workspace entrypoint models (`workspace_NN.md`) conforming to the Level 2 workspace template (`workspace_spec_NN.md`), while maintaining full backward compatibility with legacy `index.md` files and fallback directory scans.

## Requirements

### Requirement: Primary Entrypoint Discovery and Parsing

Before matching `workspace_NN.md` / `workspace_*_NN.md`, the workspace parser MUST check the root directory for a file matching the `*_base_NN.md` overview-root pattern conforming to the `base` composite template. When such a file is present, `recursiveParse()` MUST parse it as the primary Level-3 workspace entrypoint, taking precedence over `workspace*.md`. When no `*_base_NN.md` file is present, the parser MUST search for a workspace model file named `workspace_NN.md` (or matching `workspace_*_NN.md`) at the root directory during workspace initialization, exactly as before. When present, `recursiveParse()` MUST parse this file as the primary Level 3 workspace entrypoint conforming to `workspace_spec_NN.md`.

#### Scenario: Workspace root contains workspace_NN.md
- GIVEN a workspace root directory containing `workspace_01.md` conforming to `workspace_spec_01.md`
- WHEN `recursiveParse()` initializes the workspace
- THEN `workspace_01.md` is loaded as the primary entrypoint model
- AND no legacy entrypoint fallback warnings are logged

#### Scenario: Custom-named workspace model discovery
- GIVEN a workspace root containing `workspace_system_01.md`
- WHEN `recursiveParse()` scans the workspace root
- THEN `workspace_system_01.md` is identified and loaded as the primary workspace model

#### Scenario: Overview-root entrypoint takes precedence when present
- GIVEN a workspace root containing both `acme_base_01.md` (conforming to `base_V_0-1-0`) and `workspace_01.md`
- WHEN `recursiveParse()` initializes the workspace
- THEN `acme_base_01.md` is loaded as the primary entrypoint
- AND `workspace_01.md` is discovered as its child via the `manifest` `type:: model` field, not as a separate root

#### Scenario: workspace_NN.md remains entrypoint when no overview root exists
- GIVEN a workspace root containing only `workspace_01.md` and no `*_base_NN.md` file
- WHEN `recursiveParse()` initializes the workspace
- THEN `workspace_01.md` is loaded as the primary entrypoint exactly as before
- AND behavior is byte-for-byte unchanged from workspaces that never adopt `base`

---

### Requirement: Legacy Index and Directory Fallback

If no `workspace_NN.md` or `workspace_*_NN.md` file exists at the root, the parser MUST attempt to fall back to `index.md`. If `index.md` is also absent, `recursiveParse()` MUST fall back to scanning root `.md` files and emit a fallback warning issue.

#### Scenario: Fallback to legacy index.md
- GIVEN a workspace root lacking any `workspace_NN.md` file but containing `index.md`
- WHEN `recursiveParse()` executes entrypoint resolution
- THEN `index.md` is parsed as the legacy entrypoint file
- AND workspace model parsing succeeds with a legacy compatibility notice

#### Scenario: Fallback to directory scan when no entrypoint exists
- GIVEN a workspace root with neither `workspace_NN.md` nor `index.md`
- WHEN `recursiveParse()` executes entrypoint resolution
- THEN root directory `.md` files are scanned and incorporated into the model graph
- AND a missing entrypoint warning issue is reported in the parse results

---

### Requirement: Submodel Reference Extraction

The parser MUST extract referenced submodels from both traditional markdown/wikilink syntax (`[[target.md]]`, `[label](target.md)`) AND structured `ModelRef` element properties (e.g. `path::` fields with `type:: model`).

#### Scenario: Submodels declared via ModelRef path fields
- GIVEN a `workspace_01.md` containing `## 01 ModelRef: Core Engine` with `path:: models/core_engine_01.md`
- WHEN `recursiveParse()` processes the workspace entrypoint
- THEN `models/core_engine_01.md` is queued and parsed as a submodel in the workspace graph

#### Scenario: Submodels declared via wikilinks in entrypoint content
- GIVEN a `workspace_01.md` body containing `[[models/analytics_01.md]]`
- WHEN `recursiveParse()` extracts links from the entrypoint
- THEN `models/analytics_01.md` is parsed and linked in the workspace graph

---

### Requirement: Level 2 Workspace Template Definition

A Level 2 workspace template (`workspace_spec_NN.md`) MUST be provided under `specs/templates/workspace_spec_NN.md`. It MUST define core workspace concept primitives including `Workspace` (`type:: text`), `ModelRef` (`type:: model`), `Folder` (`type:: category`), and `Asset` (`type:: list`), with standard properties (`path`, `template`, `status`).

#### Scenario: Workspace model validates against workspace_spec_NN.md
- GIVEN `workspace_01.md` declaring `parent_spec:: workspace_spec_01.md`
- WHEN metamodel validation runs against `workspace_spec_01.md`
- THEN `Workspace`, `ModelRef`, `Folder`, and `Asset` concept definitions are recognized as valid metamodel concepts
