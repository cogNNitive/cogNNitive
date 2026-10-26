# cross-domain-imports Specification

## ADDED Requirements

### Requirement: Origin Domain and Import Declaration
A domaiNN entrypoint (`domaiNN_NN.md`) MUST support declaring imported domains using relative filesystem paths, and declaring imports scoped to a model or concept with deterministic query filters:
- Origin domain section: `## NN Imported Domain: <alias>` followed by `path:: <relative-path>`.
- Import section: `## NN Import: <import-name>` followed by `from:: <alias>><model>[@concept:<slug>][?<filters>]`.
Absolute paths, URLs, and paths containing `..` escaping above authorized workspace boundaries MUST be rejected.

#### Scenario: Declaring valid relative origin and filtered concept import
- GIVEN a `domaiNN_NN.md` containing:
  ```markdown
  ## NN Imported Domain: inbox
  path:: ../inbox

  ## NN Import: noticias-a
  from:: inbox>noticias@concept:noticias?categoria=A
  ```
- WHEN parsed by the domain loader
- THEN `inbox` is registered as an imported domain with path `"../inbox"`
- AND `noticias-a` is registered with source address `"inbox>noticias@concept:noticias?categoria=A"`.

---

### Requirement: Snapshot Projection Isolation and Read-Only Model
Imports MUST persist matching units to a single snapshot file at `kNNowledge/imports/<alias>/<import-name>_NN.md`.
The snapshot MUST carry frontmatter declaring `imported_from`, `origin_hash`, and `read_only: true`.
The console MUST present snapshot models as read-only and disallow direct editing.

#### Scenario: Direct editing of snapshot is prohibited
- GIVEN a snapshot model with `read_only: true` in frontmatter
- WHEN an authoring tool or console attempts mutation
- THEN the operation is rejected with an error directing edits to the origin domain.

---

### Requirement: Explicit Refresh Changesets
Refreshing an import MUST execute on explicit user command.
The refresh process MUST compute diffs between the origin query results and the local snapshot:
- If unchanged, no changeset is generated.
- If changed, a changeset in `proposed` state MUST be created with `evidence` pointing to the origin address and target pointing to the snapshot file.
- If an existing local reference points to a unit that has left the filter scope, the changeset MUST report broken references.

#### Scenario: Reclassified item leaving filter scope generates proposed refresh
- GIVEN an item in origin domain reclassified such that it no longer matches the import filter
- WHEN an explicit refresh is executed
- THEN a proposed changeset is created updating the snapshot projection
- AND any local references to that item are reported as broken.
