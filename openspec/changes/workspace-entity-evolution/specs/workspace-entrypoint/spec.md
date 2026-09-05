# Delta for Workspace Entrypoint

## MODIFIED Requirements

### Requirement: Primary Entrypoint Discovery and Parsing

Before matching `workspace_NN.md` / `workspace_*_NN.md`, the workspace parser MUST check the root directory for a file matching the `*_base_NN.md` overview-root pattern conforming to the `base` composite template. When such a file is present, `recursiveParse()` MUST parse it as the primary Level-3 workspace entrypoint, taking precedence over `workspace*.md`. When no `*_base_NN.md` file is present, the parser MUST search for a workspace model file named `workspace_NN.md` (or matching `workspace_*_NN.md`) at the root directory during workspace initialization, exactly as before. When present, `recursiveParse()` MUST parse this file as the primary Level 3 workspace entrypoint conforming to `workspace_spec_NN.md`.

(Previously: only `workspace_NN.md` / `workspace_*_NN.md` was checked as the primary entrypoint pattern, with no awareness of a composite overview-root document.)

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
