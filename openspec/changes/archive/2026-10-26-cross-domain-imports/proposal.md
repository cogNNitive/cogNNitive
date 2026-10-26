# Proposal: Cross-DomaiNN Imports

## Intent

Enable a domaiNN to import models or concepts from another local domaiNN as read-only snapshot projections, keeping data authoritative at the origin, referencing units by origin address, and managing updates exclusively through proposed changesets triggered on explicit user demand.

## Why Now

Currently, all knowledge units and references are strictly contained within a single domaiNN root (`sourceRef.resolveUnitPath` rejects paths outside the domain). As teams and domain boundaries scale (e.g. separating an `inbox` intake domain from business domain slices, or separating `organization` from `business`), developers need a clean way to share and cite units across domains without copying data manually, creating uncontrolled drift, or allowing ad-hoc file mutations.

## Scope

### In Scope
1. **Origin Domain Declaration**: Declare external origin domains with relative paths in `domaiNN_NN.md`.
2. **Import Target & Query**: Import a whole model or a specific concept filtered by a deterministic `queryUnits` expression (including `op.in` and `op.not`).
3. **Snapshot Projections**: Persist imported units in a single snapshot file per import at `kNNowledge/imports/<alias>/<import-name>_NN.md`.
4. **Refresh Changesets**: Refreshing a snapshot calculates diffs and generates a standard `proposed` changeset with evidence pointing to origin addresses.
5. **Origin-Based Citations**: References across domains cite the canonical origin address (`alias>model@slug`). Citing an out-of-scope unit is rejected by the validator.
6. **Console Visibility**: Snapshots render as read-only models in the importer's console with edit actions redirecting to the origin domain.
7. **Explicit Scan Trigger**: Scans occur only on explicit user command or via the cogNNitive interactive startup menu.

### Non-Goals
- Transitive imports (importing from another domain's snapshot is a validation error).
- Automatic background polling or silent disk writes.
- Network / remote URL origins (relative local filesystem paths only).
- Granularity finer than concept (no hand-picked unit lists).

## Approach & Binding Decisions

| # | Decision | Tradeoff / Rationale |
|---|---|---|
| 1 | **Data stays at origin** | Importer stores one snapshot projection containing only filtered units. Readers need no filter awareness. |
| 2 | **Refresh via Changesets** | Snapshot updates create standard changesets with origin evidence. Empty diff produces no changeset. |
| 3 | **Relative Origin Declarations** | Origin declared in `domaiNN_NN.md` with relative path (`## NN Imported Domain: <alias>`). Unreachable paths mark origin `DISCONNECTED`. |
| 4 | **No Transitive Imports** | Import only from authoritative origin models to prevent circularity and stale cascading snapshots. |
| 5 | **Origin Unit Addresses** | Citations use `alias>model@slug`. Validated against snapshot projection. |
| 6 | **Read-Only Console Model** | Importer console displays snapshot as read-only; attempts to edit link back to origin. |
| 7 | **Deterministic Filter** | Import query uses `nn-core` address query: `from:: inbox>noticias@concept:noticias?categoria=A`. |
| 8 | **Explicit Scans Only** | Triggered only via explicit command or startup menu; no background watch or polling. |
| 9 | **Snapshot Location** | Stored at `kNNowledge/imports/<alias>/<import-name>_NN.md` under canonical knowledge directory. |

## Ponytail Ceilings & Future Enhancements (Tag: potential-enhancement)

### Ceilings in This Change
- **Local relative paths only**: External domains must reside on the local filesystem (`path:: ../inbox`). Remote git repositories and URLs are excluded to prevent network flakiness and credential complexity.
  - *Upgrade condition*: When teams require cross-repository domain federation across distinct Git remotes.
- **Single flat snapshot file**: Each import writes one static markdown file (`kNNowledge/imports/<alias>/<import-name>_NN.md`), rather than multi-file projections or live virtualized proxies.
  - *Upgrade condition*: When single imports exceed 10,000 units and file I/O becomes a measurable bottleneck.
- **Explicit on-demand refresh only**: Scans occur only when invoked by the user or script. Background file watchers and automated polling are deliberately omitted.
  - *Upgrade condition*: When an interactive authoring environment demands zero-latency background synchronization.

### Potential Future Enhancements
- `future: remote-domain-imports`: Support HTTPS and Git remote URLs in `path::` (e.g. `path:: https://github.com/org/domain.git`) with shallow cloning and credential management.
- `future: transitive-domain-imports`: Support multi-hop domain imports with cycle detection and cascading snapshot refreshes.
- `future: background-watch-sync`: File system watcher sidecar service for continuous real-time synchronization between local domains.

