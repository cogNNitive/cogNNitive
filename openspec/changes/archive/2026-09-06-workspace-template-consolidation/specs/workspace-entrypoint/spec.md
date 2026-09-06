# Delta for Workspace Entrypoint

## MODIFIED Requirements

### Requirement: Primary Entrypoint Discovery and Parsing

The `*_base_NN.md` overview-root precedence is retained **solely for legacy workspaces**: when such a file is present at the root, `recursiveParse()` MUST still parse it as the primary Level-3 workspace entrypoint, taking precedence over `workspace*.md`. New workspaces MUST NOT adopt `base`, which is frozen. For all workspaces, the canonical primary entrypoint is a workspace model named `workspace_NN.md` (or matching `workspace_*_NN.md`) conforming to the versioned template `workspace_V_0-3-0_spec_NN.md`; the unversioned alias `workspace_spec_NN.md` MUST NOT be referenced as the conformance target.
(Previously: `*_base_NN.md` precedence was current sanctioned behavior and `workspace_spec_NN.md` was the referenced Level-2 workspace template.)

#### Scenario: Workspace root contains workspace_NN.md (canonical)
- GIVEN a workspace root directory containing `workspace_01.md` conforming to `workspace_V_0-3-0_spec_NN.md`
- WHEN `recursiveParse()` initializes the workspace
- THEN `workspace_01.md` is loaded as the primary entrypoint model
- AND no legacy entrypoint fallback warnings are logged

#### Scenario: Custom-named workspace model discovery
- GIVEN a workspace root containing `workspace_system_01.md`
- WHEN `recursiveParse()` scans the workspace root
- THEN `workspace_system_01.md` is identified and loaded as the primary workspace model

#### Scenario: Legacy overview-root entrypoint takes precedence when present
- GIVEN a legacy workspace root containing both `acme_base_01.md` (conforming to `base_V_0-1-0`) and `workspace_01.md`
- WHEN `recursiveParse()` initializes the workspace
- THEN `acme_base_01.md` is loaded as the primary entrypoint
- AND `workspace_01.md` is discovered as its child via the `manifest` `type:: model` field, not as a separate root

#### Scenario: workspace_NN.md remains entrypoint when no legacy overview root exists
- GIVEN a workspace root containing only `workspace_01.md` and no `*_base_NN.md` file
- WHEN `recursiveParse()` initializes the workspace
- THEN `workspace_01.md` is loaded as the primary entrypoint exactly as before
- AND behavior is byte-for-byte unchanged from workspaces that never adopt `base`

### Requirement: Level 2 Workspace Template Definition

The canonical Level 2 workspace template MUST be the versioned `workspace_V_0-3-0_spec_NN.md` provided under `iNNfo/specs/templates/`. It MUST define core workspace concept primitives including `Workspace` (`type:: text`), `Models` (`type:: model`), and `Tag` (`type:: category`), with standard properties (`path`, `template`, `status`). The unversioned alias `workspace_spec_NN.md` SHALL NOT be used as the distribution or conformance name; the alias file MUST be physically removed from `iNNfo/specs/templates/` and from `actioNN/skills/nn-innfo/templates/`, while git history preserves it byte-identical.
(Previously: the template was provided and referenced unversioned as `workspace_spec_NN.md`.)

#### Scenario: Workspace model validates against the versioned template
- GIVEN `workspace_01.md` declaring `parent_spec:: workspace_V_0-3-0_spec_NN.md`
- WHEN metamodel validation runs against the versioned template
- THEN `Workspace`, `Models`, and `Tag` concept definitions are recognized as valid metamodel concepts

#### Scenario: Alias is absent from distribution surfaces
- GIVEN the change is applied
- WHEN the template directories are inspected
- THEN `workspace_spec_NN.md` exists in neither `iNNfo/specs/templates/` nor `actioNN/skills/nn-innfo/templates/`
- AND the canonical versioned copy is present in the nn-innfo skill bundle