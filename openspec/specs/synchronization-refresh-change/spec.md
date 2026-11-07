# synchronization-refresh-change Specification

## Purpose
TBD - created by archiving change domain-synchronizations. Update Purpose after archive.
## Requirements
### Requirement: Refresh is an explicit command with no MCP tool

A refresh MUST be triggered through the `nn-sources` CLI as `--sync [alias]` (no value refreshes all active Synchronizations), accompanied by an agent instruction that tells agents when to run it. The system MUST NOT add an MCP tool for it. The flag name does not collide with the MCP tool `sync_domain_manifest`; the skill section "Workspace Manifest Synchronization" is renamed "Workspace Manifest Reconciliation" to avoid a documentation collision.

#### Scenario: CLI refreshes one alias
- GIVEN active Synchronizations `org` and `legal`
- WHEN `nn-sources --sync org` runs
- THEN only `org` is refreshed

#### Scenario: No MCP surface
- GIVEN the `innfo-mcp` server after this change
- WHEN its tools are listed
- THEN no tool refreshes a Synchronization

### Requirement: A refresh that changes the mirror prints one change payload

Each refresh of one Synchronization that adds, replaces or removes at least one file MUST print exactly one ready `propose_changeset` payload; the CLI MUST NOT apply it or write to `changes/` (applying stays in nn-mcp, and the agent applies the payload). The payload MUST contain one `comment` change with `target: sources/sync/<alias>` (no `@`), `evidence: decision`, and `notes` listing, per file, `path before->after` sha256 values (an absent value means added or removed). A refresh that alters nothing MUST print no payload.

#### Scenario: Refresh with a changed model
- GIVEN a mirrored `org_NN.md` and an origin copy with different bytes
- WHEN the Synchronization is refreshed
- THEN one payload is printed that names the alias in its target
- AND its notes record the SHA-256 of the file before and after

#### Scenario: Refresh with no differences
- GIVEN a mirror equal to its origin
- WHEN the Synchronization is refreshed
- THEN no payload is printed

#### Scenario: One payload per refreshed Synchronization
- GIVEN two Synchronizations that both changed at their origins
- WHEN both are refreshed in one command
- THEN two payloads are printed, one per alias

#### Scenario: The CLI does not write the change
- GIVEN a refresh that printed a payload
- WHEN the refresh completes
- THEN `changes/` is unchanged

### Requirement: A refresh never blocks

A refresh MUST complete even when its result invalidates consumer content. It MUST NOT roll back, abort or require confirmation because a consumer reference no longer resolves, and it MUST NOT edit consumer models to repair references.

#### Scenario: Origin renamed a slug
- GIVEN a consumer field `reference` pointing at `sources/sync/org/org_NN.md@puesto-a` and an origin where that slug no longer exists
- WHEN the Synchronization is refreshed
- THEN the refresh completes and the mirror is updated
- AND the consumer model files are unchanged

### Requirement: Broken references surface as ordinary validation errors

After a refresh, a consumer `type:: reference` field whose target model or slug no longer exists in the mirror MUST be reported by the existing workspace reference validation as `REF_MODEL_NOT_FOUND` or `REF_ELEMENT_NOT_FOUND`, with no synchronization-specific severity or suppression.

#### Scenario: Renamed position is reported
- GIVEN the refresh in the previous scenario
- WHEN `check_domain` runs on the consumer
- THEN an error names the field holding the stale reference

#### Scenario: Refresh restores a link
- GIVEN a broken reference whose slug reappears at the origin
- WHEN the Synchronization is refreshed and `check_domain` runs
- THEN the error is gone

### Requirement: Copied changesets stay out of the consumer's change log

A changeset file found under the root `sources/` folder (for example a copied `*_changes_NN.md`) MUST NOT be loaded as a change by the consumer's change log, MUST NOT contribute to lineage snapshots, and MUST NOT appear in the consumer's `changes` collection. `isChangesetPath` MUST return false for any path under root `sources/` (via the exported `isUnderRootSources`) instead of requiring the file to live in `changes/`. The filesystem lineage snapshot MUST prune only the `sources/sync/` subtree (it only ever holds `_NN.md` models); raw sources and sidecars elsewhere under `sources/` stay in the lineage.

#### Scenario: Copied changeset is ignored
- GIVEN `sources/import/org/x_changes_NN.md` present in the consumer
- WHEN the consumer's change log is loaded
- THEN it contains no change from that file

#### Scenario: Mirror folder is pruned from lineage
- GIVEN files under `sources/sync/org/`
- WHEN the filesystem lineage snapshot is built
- THEN no file under `sources/sync/` appears in the snapshot

#### Scenario: Other sources stay in lineage
- GIVEN a sidecar under `sources/import/`
- WHEN the filesystem lineage snapshot is built
- THEN the sidecar appears in the snapshot

#### Scenario: Real changesets still load
- GIVEN `changes/ws_agent_20261007T120000Z_changes_NN.md`
- WHEN the change log is loaded
- THEN its changes are present

