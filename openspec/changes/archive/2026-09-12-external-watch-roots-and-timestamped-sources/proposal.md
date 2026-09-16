# Proposal: External Watch Roots and Immutable Timestamped Primary Sources

## Intent

Establish an external primary source ingestion pipeline that allows cogNNitive workspaces to watch external directories on-demand, import external raw files (Primary Sources) with strict user consent and zero external file mutation, and manage dynamic source evolution using an **Immutable Timestamped (Append-Only)** model (`<basename>_YYYYMMDD-HHmmss.<ext>`) rather than mutable folder archiving, preventing link rot and preserving permanent citation integrity across models.

## Scope

### In Scope

1. **Declarative External Watch Roots in Provenance Models**:
   - Formalize the `## NN External Watch Roots:` section in `<Project>_V_0-2-0_cogNNitive_NN.md`.
   - Declare external paths, recursive traversal flags, extension filters, and source cadence classification (`dynamic` vs `static`).

2. **Strict Read-Only External Scanner Engine (Zero External Mutation)**:
   - Provide an on-demand scanning mechanism (`--scan-external` in `actioNN/skills/nn-trannsform/scripts/`).
   - Strict read-only guarantee outside workspace boundaries: only `fs.stat`, `fs.readFile`, and `fs.copyFile` towards `sources/import/`. Never modify, move, or delete external files.
   - High-performance Fast Path: inspect file metadata (`mtime` + `size_bytes`) first before computing full SHA-256 hashes to prevent disk I/O bottlenecks.

3. **Immutable Timestamped Ingestion (`YYYYMMDD-HHmmss`)**:
   - Dynamic sources are ingested with timestamps in their filename: `<basename>_<YYYYMMDD-HHmmss>.<ext>`.
   - Eliminates reliance on `sources/archive/` relocations for dynamic source evolution.
   - Guarantees 100% citation permanence: previous normalized snapshots remain in `sources/nn/import/` forever without broken paths.

4. **Interactive Ingestion Gate & Multi-Snapshot Impact Audit**:
   - Present a structured summary of candidate changes (`NEW`, `EVOLVED_DYNAMIC`, `STATIC_ALERT`, `DISCONNECTED`).
   - Require explicit user confirmation before copying any files into `sources/import/`.
   - Update `impact-checker.js` to recognize time-series source families (`<stem>_<timestamp>`) and offer automated reference upgrades in Level 3 models from previous snapshots to newer ones.

### Out of Scope

- Installing permanent background daemon/watcher services (e.g. resident chokidar background tasks).
- Deleting or archiving files inside or outside the workspace without explicit user intervention.
- Automated silent rewriting of model citations without user review.

## Capabilities

### New Capabilities
- `external-watch-roots`: Declarative specification and scanner for external file systems with Fast Path delta detection.
- `immutable-timestamped-sources`: Append-only source versioning using precise date-time stamps (`YYYYMMDD-HHmmss`) ensuring zero link rot.

### Modified Capabilities
- `scanner-source-lifecycle`: Extended to support external scan integration, family grouping, and timestamp-based normalization.
- `dynamic-sources-impact-check`: Enhanced to detect newer time-series snapshots and guide model reference migrations.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/` | Modified | Add `## NN External Watch Roots:` definition to Provenance template specification |
| `actioNN/skills/nn-trannsform/scripts/lib/external-scanner.js` | New | Read-only external directory scanner with Fast Path mtime/size checks |
| `actioNN/skills/nn-trannsform/scripts/lib/scanner-core.js` | Modified | Support timestamped ingestion and family grouping |
| `actioNN/skills/nn-trannsform/scripts/lib/impact-checker.js` | Modified | Detect timestamped snapshot evolution across source families |
| `actioNN/skills/nn-trannsform/scripts/index.js` | Modified | Add `--scan-external` and interactive import CLI prompt |
| `actioNN/skills/nn-trannsform/SKILL.md` | Modified | Document external watch roots and immutable timestamp conventions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Heavy I/O when scanning large external directories | Med | Fast Path: compare `mtime` and `size_bytes` via `fs.stat`; only hash files when timestamp or size differs |
| Timestamp clock skew / multiple scans within the same second | Low | Standardized second-precision format `YYYYMMDD-HHmmss`; append counter if colliding within same second |
| Model citation confusion with multiple historical snapshots | Low | Provenance model maintains active/latest pointer while preserving full historical index |

## Rollback Plan

Remove `external-scanner.js` and revert changes to `scanner-core.js`, `impact-checker.js`, and `index.js`. Existing flat files in `sources/import/` and `sources/nn/` remain functional.

## Success Criteria

- [ ] External roots defined in `<Project>_V_0-2-0_cogNNitive_NN.md` are scanned without modifying external directories.
- [ ] Fast Path metadata checks skip hashing for unmodified external files.
- [ ] Dynamic sources ingest into `sources/import/` and normalize into `sources/nn/import/` with `YYYYMMDD-HHmmss` timestamp suffixes.
- [ ] Existing model citations to earlier timestamped snapshots remain intact and valid.
- [ ] Impact checker detects newer snapshot siblings and offers citation updates.
