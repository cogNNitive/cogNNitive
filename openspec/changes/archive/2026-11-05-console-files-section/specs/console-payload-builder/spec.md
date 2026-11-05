# Delta for console-payload-builder

Scope: precompute and serialize workspace file inventory, metadata, reverse lineage graph, and gap metrics into the console payload JSON (`model.files`), enabling zero-overhead client rendering without runtime filesystem or MCP access.

## ADDED Requirements

### Requirement: Precomputed File Inventory in Console Payload

The payload builder (`buildConsolePayload` in `nn-core` and domain assembly in `scripts/export-console.mjs`) MUST precompute a `files` object under `model.files` in the console payload.

The `files` structure MUST contain:
1. `inventory`: An array of file descriptors covering workspace content across `sources/` (including `sources/import/`, `sources/assets/`, `sources/evidence/`, `sources/conversations/`), `assets/`, `evidence/`, `artifacts/`, `conversations/`, watch roots, and imported domain snapshots. Each entry MUST carry:
   - `id`: Unique POSIX path relative to the workspace root.
   - `path`: POSIX relative path.
   - `category`: Exactly one of `'watch_root' | 'source' | 'imported_domain' | 'asset' | 'evidence' | 'artifact'`.
   - `size`: Size in bytes.
   - `sha256`: Full 64-character lowercase hex SHA-256 of the file bytes.
   - `mimeType`: Detected MIME type string.
   - `mtime` (optional): ISO 8601 last-modified timestamp.
   - `sidecar` (optional): Status object `{ path: string; exists: boolean; valid: boolean; sourceFile?: string; sha256?: string; sha256Matches?: boolean; sourceFormat?: string; author?: string; normalizedAt?: string; error?: string }`.
   - `citationsCount`: Number of knowledge unit citations targeting this file.
   - `excerptCount`: Number of those citations that carry an excerpt.
   - `changesCount`: Number of changeset records referencing this file as evidence.
   - `uncited`: Boolean, true for a source-like file (`source` or `imported_domain`) with `citationsCount === 0` and `changesCount === 0`.
   - `snippet` (optional): Bounded text excerpt (see the Payload Bloat Invariant).
   - `snippetTruncated` (optional): Boolean, true when the excerpt was cut.
2. `watchRoots`: An array of watch directory descriptors (`{ path: string; status: 'active' | 'idle' | 'offline'; fileCount: number; lastSync?: string }`). `lastSync` MUST be derived from the newest observed mtime under the root, never from wall-clock time.
3. `stats`: Aggregate workspace file statistics (see "Precomputed Gap Metrics and Sidecar Validation").
4. `lineage`: Reverse lineage mapping (see "Artifact Reverse Lineage Precomputation").

Categorization MUST follow the real workspace layout: `sources/import/` holds imported source documents, media under `sources/assets/` is an `asset`, and a foreign domain snapshot lives under `imported/`, `.domains/` or `domains/import/`.

Non-content exclusions: sidecar documents, console build outputs (`domaiNN_console*.html`, `artifacts/<id>_console/`, `artifacts/<id>_view/`) and append-only `.jsonl`/`.ndjson` logs MUST NOT appear as inventory entries. Console outputs would embed the console inside itself; logs are application state.

Payload Bloat Invariant:
The builder MUST NOT serialize full raw contents for tracked files. A text preview (`snippet`) MUST be an excerpt capped at the citation excerpt cap (`EXCERPT_CHAR_CAP`, 500 characters) and bounded by a global preview budget. Binary and image files MUST NOT be inlined in any form.

Determinism Invariant:
Two exports of an unchanged workspace MUST produce byte-identical `model.files` payloads.

#### Scenario: Export CLI builds model.files slot
- GIVEN a domain workspace with sources, assets, changes, and artifacts
- WHEN `export-console.mjs` generates the console payload
- THEN `payload.model.files` exists
- AND `payload.model.files.inventory` lists tracked workspace files with their categories, sizes, and hashes

#### Scenario: File categorization
- GIVEN a file located in `sources/import/factura.pdf`
- WHEN the file inventory is assembled
- THEN its `category` is `"source"`
- AND `sources/assets/logo.png` has category `"asset"`
- AND a file in `artifacts/report.html` has category `"artifact"`

#### Scenario: Raw contents are not inlined
- GIVEN a 5 MB image asset in `assets/diagram.png`
- WHEN the file entry is serialized
- THEN `entry.size` is `5242880`
- AND no base64, raw byte payload or text snippet is attached to the entry

#### Scenario: Binary digests hash bytes
- GIVEN a binary file whose bytes are not valid UTF-8
- WHEN its digest is computed
- THEN `entry.sha256` equals the SHA-256 of the raw bytes

#### Scenario: Sidecar documents are never inventory entries
- GIVEN `sources/import/spec.md_sidecar_NN.md`
- WHEN the inventory is assembled
- THEN no entry has that path
- AND the entry for `sources/import/spec.md` carries the sidecar status

### Requirement: Artifact Reverse Lineage Precomputation

The payload builder MUST precompute the reverse lineage mapping for all artifacts in `payload.model.files.lineage`:
```ts
lineage: Record<string, {
  artifactId: string
  artifactPath: string
  unitIds: string[]
  changesetIds: string[]
  sourcePaths: string[]
}>
```

The mapping MUST be computed across four tiers:
1. `Artifact to Units`: Derived from artifact frontmatter, generated manifest mappings, or address comments embedded in the artifact.
2. `Units to Changes`: Derived from unit `history` and domain `changes` records.
3. `Changes/Units to Sources`: Derived from unit citations (`el.citations`) and change evidence citations (`c.evidence`).

When a link in the lineage chain cannot be resolved (e.g., an artifact references a unit that does not cite an original source), the builder MUST record the available tiers without failing the build and MUST NOT emit fabricated links.

#### Scenario: Multi-tier reverse lineage is resolved
- GIVEN an artifact `artifacts/executive-summary.html` built from unit `initiative-pricing`
- AND unit `initiative-pricing` has history from changeset `2026-10-01-pricing`
- AND changeset `2026-10-01-pricing` cites evidence `sources/market-survey.csv`
- WHEN the payload builder computes the lineage
- THEN `lineage["artifacts/executive-summary.html"]` carries `unitIds: ["initiative-pricing"]`, `changesetIds: ["2026-10-01-pricing"]`, and `sourcePaths: ["sources/market-survey.csv"]`

#### Scenario: Missing upstream link degrades gracefully
- GIVEN an artifact derived from a unit with no citations and no changeset history
- WHEN the reverse lineage is precomputed
- THEN `lineage[artifactId].unitIds` contains the unit id
- AND `lineage[artifactId].sourcePaths` is an empty array
- AND the build succeeds

### Requirement: Precomputed Gap Metrics and Sidecar Validation

The payload builder MUST calculate workspace health and gap metrics and expose them under `payload.model.files.stats`:
- `totalFiles`: Total count of files in the inventory.
- `totalBytes`: Combined byte count across inventory files.
- `categoryCounts`: Record mapping each category name to its file count.
- `storageByCategory`: Record mapping each category name to its combined byte size.
- `sourceCoverageRate`: Number between `0.0` and `1.0` representing cited source-like files over total source-like files.
- `uncitedSourceCount`: Count of source-like files with `uncited === true`.
- `sidecarMissingCount`: Count of source-like files with no sidecar.
- `sidecarInvalidCount`: Count of sidecars that exist but fail frontmatter validation.
- `sidecarMismatchCount`: Count of valid sidecars whose recorded digest no longer matches the file.
- `excerptCount`: Total number of citations that carry an excerpt.

Sidecar Convention and Resilience:
A sidecar is the canonical `<file>.<ext>_sidecar_NN.md` document (see the naming contract). Its YAML frontmatter MUST declare `source_file` and a 64-character `sha256`; the builder MUST verify that digest against the computed file digest and expose the verdict as `sidecar.sha256Matches`. When a sidecar is malformed, the builder MUST NOT throw or abort the build: it MUST record `sidecar.valid: false` with `sidecar.error` and increment `sidecarInvalidCount`.

#### Scenario: Gap metrics calculated across sources and sidecars
- GIVEN five source-like files, where two are uncited
- WHEN the payload stats are computed
- THEN `stats.uncitedSourceCount` is `2`
- AND `stats.sourceCoverageRate` is `0.6`

#### Scenario: Stale sidecar digest is surfaced
- GIVEN a source file whose sidecar records a digest that no longer matches the file
- WHEN `export-console.mjs` runs
- THEN the build succeeds
- AND the entry records `sidecar.valid: true` and `sidecar.sha256Matches: false`
- AND `stats.sidecarMismatchCount` is incremented

#### Scenario: Malformed sidecar recorded without build failure
- GIVEN a sidecar document `sources/note.md_sidecar_NN.md` with no frontmatter
- WHEN `export-console.mjs` runs
- THEN the build finishes with success
- AND `stats.sidecarInvalidCount` is incremented
- AND the file entry for `sources/note.md` records `sidecar.valid: false` and `sidecar.error`
