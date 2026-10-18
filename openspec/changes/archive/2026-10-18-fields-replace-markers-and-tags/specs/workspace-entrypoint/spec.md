# Delta for Workspace Entrypoint

Consequence of D13 (the legacy `base` bluepriNNt is deleted): the `*_base_NN.md` overview-root precedence has no remaining consumer and its code (`OVERVIEW_ROOT_RE` / `isOverviewRoot` in `recursiveParser/workspace.ts`) is removed.

## MODIFIED Requirements

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
