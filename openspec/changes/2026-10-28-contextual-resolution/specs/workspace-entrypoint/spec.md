# Delta for workspace-entrypoint

Scope: the root a workspace operation uses is the nearest `domaiNN_NN.md`, found by walking
up via `findScopeChain` (see `scope-chain`). Entrypoint model naming and the legacy
fallbacks are unchanged by this delta.

## ADDED Requirements

### Requirement: Root Is Located By The domaiNN Marker Walk

Every operation that needs the domaiNN root (`recursiveParse()`, manifest sync, MCP tools
that take a workspace location) MUST obtain it from `findScopeChain`, starting from the
given path and walking up to the nearest `domaiNN_NN.md`. No operation MAY locate the root
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

## Out of scope

Per-scope manifests and indexes are deferred (per-scope `aggregate`). See the proposal's
Deferred table (`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
