# Delta for template-procedures-manifest-and-discovery

Scope: MCP procedure listing becomes scope-aware and exposes shadowing, forks and slots.
Package discovery and asset hydration are unchanged.

## ADDED Requirements

### Requirement: Scope-Aware Procedure Listing

The MCP procedure listing MUST accept an optional document or scope path. When given, it
MUST locate the chain through `findScopeChain` and list the procedures visible from that
scope per `procedure-execution` precedence. Each entry MUST carry its `id`, the scope or
source that supplies it (a scope path, `model`, or `blueprint`), and a status of
`selected` or `shadowed`. A shadowed entry MUST name the entry that shadows it. Entries
MUST also carry their declared slots, and fork records and warnings per
`procedure-extension-points`. When no path is given, the listing MUST behave as before,
except that it no longer drops a procedure that loses a name clash (see
`procedure-execution`, "No silent drop").

The domaiNN root `procedures/` folder (`workspace/procedures/`) is supplied by the root
scope, which is identified by the empty scope path as in `explain`. The bluepriNNt
package's own procedures are the floor: they are supplied by the `blueprint` source, they
rank below every scope, and they are located through the same package resolution as the
floor document of `resolve_effective`. Scope procedures are never read from the
bluepriNNt, and the floor is never read by the scope-chain loader in the core.

#### Scenario: Listing from a project scope

- GIVEN `generate-status-report` defined in the bluepriNNt and overridden in program `alpha`
- WHEN the listing is requested with a path inside `alpha`
- THEN `generate-status-report` is returned once as `selected`, supplied by `alpha`
- AND the bluepriNNt definition is returned as `shadowed`, naming the `alpha` entry

#### Scenario: Slots and fork warnings are included

- GIVEN a forked procedure whose original has advanced, and a slotted procedure
- WHEN the listing is requested for the forking scope
- THEN the entries carry the slot declarations, the fork record and the original-advanced warning

#### Scenario: Floor procedures are listed and shadowed by a scope procedure

- GIVEN `status-report` and `floor-only` defined in the package of the bluepriNNt named by the scope's `parent_spec`
- AND `status-report` also defined in the domaiNN root `procedures/` folder
- WHEN the listing is requested with a path inside the root scope
- THEN `floor-only` is returned once as `selected`, supplied by the `blueprint` source
- AND `status-report` is returned as `selected`, supplied by the root scope
- AND the bluepriNNt `status-report` is returned as `shadowed`, naming the root scope

#### Scenario: Root procedures are listed as the root scope

- GIVEN procedures in the domaiNN root `procedures/` folder
- WHEN the listing is requested with a path inside any scope of that domaiNN
- THEN each root procedure is listed with the root scope (the empty scope path) as its supplier
- AND a root procedure is shadowed by a same-id procedure in a nearer scope of the chain

#### Scenario: Sibling scope procedures are not listed

- GIVEN `beta-only` defined in sibling program `beta` and `alpha-review` in program `alpha`
- WHEN the listing is requested with a path inside `alpha`
- THEN `alpha-review` is listed and `beta-only` is not

#### Scenario: No path given

- GIVEN a call without a scope path
- WHEN the listing runs
- THEN the result matches the previous listing for the bluepriNNt package
- AND entries carry status `selected`
- AND a procedure that loses a name clash between the packages of a bluepriNNt chain is
  additionally returned as `shadowed`, naming the entry that shadows it

#### Scenario: Path outside any domaiNN

- GIVEN a path with no `domaiNN_NN.md` in its ancestry
- WHEN the listing is requested with that path
- THEN a structured error is returned listing the directories searched
- AND the listing does not silently fall back to the unscoped result

## Out of scope

Per-scope bluepriNNt version pins and per-scope catalog aggregation are deferred. See the
proposal's Deferred table (`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
