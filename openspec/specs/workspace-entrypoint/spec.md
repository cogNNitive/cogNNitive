# Workspace Entrypoint

## Purpose

Establish first-class support for formal workspace entrypoint models (`workspace_NN.md`) conforming to the Level 2 workspace template (`workspace_V_0-3-0_spec_NN.md`), while maintaining full backward compatibility with legacy `index.md` files and fallback directory scans.
## Requirements
### Requirement: Primary Entrypoint Discovery and Parsing

The canonical primary entrypoint is a workspace model named `workspace_NN.md` (or matching `workspace_*_NN.md`) conforming to the versioned template `workspace_V_0-3-0_spec_NN.md` or later; the unversioned alias `workspace_spec_NN.md` MUST NOT be referenced as the conformance target. The `*_base_NN.md` overview-root pattern no longer exists: `recursiveParse()` MUST NOT give any file named `*_base_*.md` precedence over `workspace*.md`.
(Previously: the `*_base_NN.md` overview-root precedence was retained for legacy workspaces.)

#### Scenario: Workspace root contains workspace_NN.md (canonical)
- GIVEN a workspace root directory containing `workspace_01.md` conforming to `workspace_V_0-3-0_spec_NN.md`
- WHEN `recursiveParse()` initializes the workspace
- THEN `workspace_01.md` is loaded as the primary entrypoint model
- AND no legacy entrypoint fallback warnings are logged

#### Scenario: Custom-named workspace model discovery
- GIVEN a workspace root containing `workspace_system_01.md`
- WHEN `recursiveParse()` scans the workspace root
- THEN `workspace_system_01.md` is identified and loaded as the primary workspace model

#### Scenario: A base-named file gets no precedence
- GIVEN a workspace root containing both `acme_base_01.md` and `workspace_01.md`
- WHEN `recursiveParse()` initializes the workspace
- THEN `workspace_01.md` is loaded as the primary entrypoint
- AND `acme_base_01.md` receives no entrypoint treatment

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

The parser MUST extract referenced submodels from both traditional markdown/wikilink syntax (`[[target.md]]`, `[label](target.md)`) AND structured `Models` element properties (e.g. `path::` fields with `type:: model`).

#### Scenario: Submodels declared via Models path fields
- GIVEN a `workspace_01.md` containing `## 01 Models: Core Engine` with `path:: models/core_engine_01.md`
- WHEN `recursiveParse()` processes the workspace entrypoint
- THEN `models/core_engine_01.md` is queued and parsed as a submodel in the workspace graph

#### Scenario: Submodels declared via wikilinks in entrypoint content
- GIVEN a `workspace_01.md` body containing `[[models/analytics_01.md]]`
- WHEN `recursiveParse()` extracts links from the entrypoint
- THEN `models/analytics_01.md` is parsed and linked in the workspace graph

---

### Requirement: Level 2 Workspace Template Definition

The canonical Level 2 workspace template MUST be the versioned `workspace_V_0-3-0_spec_NN.md` provided under `iNNfo/specs/bluepriNNts/`. It MUST define core workspace concept primitives including `Workspace` (`type:: text`), `Models` (`type:: model`), and `Tag` (`type:: category`), with standard properties (`path`, `template`, `status`). The unversioned alias `workspace_spec_NN.md` SHALL NOT be used as the distribution or conformance name; the alias file MUST be physically removed from `iNNfo/specs/bluepriNNts/` and from `actioNN/skills/nn-innfo/templates/`, while git history preserves it byte-identical.

#### Scenario: Workspace model validates against the versioned template
- GIVEN `workspace_01.md` declaring `parent_spec:: workspace_V_0-3-0_spec_NN.md`
- WHEN metamodel validation runs against the versioned template
- THEN `Workspace`, `Models`, and `Tag` concept definitions are recognized as valid metamodel concepts

#### Scenario: Alias is absent from distribution surfaces
- GIVEN the change is applied
- WHEN the template directories are inspected
- THEN `workspace_spec_NN.md` exists in neither `iNNfo/specs/bluepriNNts/` nor `actioNN/skills/nn-innfo/templates/`
- AND the canonical versioned copy is present in the nn-innfo skill bundle

### Requirement: Root Is Located By The domaiNN Marker Walk

Every operation that needs the domaiNN root (`recursiveParse()`, manifest sync, MCP tools that take a workspace location) MUST obtain it from `findScopeChain`, starting from the given path and walking up to the nearest `domaiNN_NN.md`. No operation MAY locate the root
through `.git`, through a single-directory prefix heuristic, or through a root-handle-only
lookup. A domaiNN MUST work with no git repository present.

#### Scenario: MCP tool called from a subdirectory

- GIVEN `acme/domaiNN_NN.md` and an MCP workspace tool invoked with `acme/programs/alpha`
- WHEN the tool resolves its workspace root
- THEN the root is `acme`

#### Scenario: Manifest sync in a domaiNN without git

- GIVEN a domaiNN with `domaiNN_NN.md`, models, and no `.git` in its ancestry
- WHEN workspace manifest sync runs
- THEN it finds the root and completes without a missing-repository error

#### Scenario: Manifest sync does not absorb a nested domaiNN

- GIVEN `outer/domaiNN_NN.md` and `outer/vendor/inner/domaiNN_NN.md`
- WHEN manifest sync runs for `outer`
- THEN the models under `outer/vendor/inner/` are not listed in the outer manifest

#### Scenario: No marker found

- GIVEN a path with no `domaiNN_NN.md` in its ancestry
- WHEN a workspace operation resolves its root
- THEN it reports that no domaiNN root was found and lists the directories searched
- AND it does not fall back to the repository root

