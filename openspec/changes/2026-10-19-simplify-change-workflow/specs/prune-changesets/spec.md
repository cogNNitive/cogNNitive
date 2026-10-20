# Delta for prune-changesets

The whole capability is removed. At archive time `openspec/specs/prune-changesets/` MUST be
deleted. The MCP tool `prune_changesets` and its registration are deleted with it.

## REMOVED Requirements

### Requirement: Only finished, unreferenced changesets are pruned

(Reason: field history is a chain through `replaced_sources`; a file that no model cites
directly can still be a middle link of that chain, so pruning can break lineage. The growth
of `changes/` is the audit trail.)
(Migration: none. Files under `changes/` are removed only by hand, through normal git review.)

#### Scenario: No prune tool
- GIVEN the innfo-mcp tool list
- WHEN it is listed
- THEN it contains no `prune_changesets`

### Requirement: Dry run

(Reason: it only qualified the removed tool.)
(Migration: none.)

### Requirement: Manifest refresh only

(Reason: it only qualified the removed tool; manifest reconciliation after an apply is
unchanged and belongs to `apply_change`.)
(Migration: none.)
