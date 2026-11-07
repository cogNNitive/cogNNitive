# console-payload-builder Delta Spec

## MODIFIED Requirements

### Requirement: Precomputed File Inventory in Console Payload

The payload builder (`buildConsolePayload` in `nn-core` and domain assembly in `scripts/export-console.mjs`) MUST precompute a `files` object under `model.files` in the console payload.

The `files` structure MUST contain:
1. `inventory`: An array of file descriptors covering workspace content across `sources/` (including `sources/import/`, `sources/sync/`, `sources/assets/`, `sources/evidence/`, `sources/conversations/`), `assets/`, `evidence/`, `artifacts/`, and `conversations/`. Each entry MUST carry:
   - `id`: Unique POSIX path relative to the workspace root.
   - `path`: POSIX relative path.
   - `category`: Exactly one of `'source' | 'asset' | 'evidence' | 'artifact' | 'unclassified'`. A file that matches no known layout MUST be `unclassified`; the builder MUST NOT fall back to `source`. Files under `sources/sync/` are `source`.
   - `size`: Size in bytes.
   - `sha256`: Full 64-character lowercase hex SHA-256 of the file bytes.
   - `mimeType`: Detected MIME type string.
   - `mtime` (optional): ISO 8601 last-modified timestamp.
   - `sidecar` (optional): Status object `{ path: string; exists: boolean; valid: boolean; sourceFile?: string; sha256?: string; sha256Matches?: boolean; sourceFormat?: string; author?: string; normalizedAt?: string; error?: string }`.
   - `citationsCount`: Number of knowledge unit citations targeting this file.
   - `excerptCount`: Number of those citations that carry an excerpt.
   - `changesCount`: Number of changeset records referencing this file as evidence.
   - `uncited`: Boolean, true for a source-like file (category `source`) with `citationsCount === 0` and `changesCount === 0`.
   - `snippet` (optional): Bounded text excerpt (see the Payload Bloat Invariant).
   - `snippetTruncated` (optional): Boolean, true when the excerpt was cut.
2. `origins`: An array of origin descriptors derived only from Synchronization elements of the sources model and from the origin keys of sidecars (`OriginDescriptor { id: string; alias?: string; origin: string; kind: 'file' | 'folder' | 'url'; state: 'active' | 'paused' | 'adhoc'; files: string[] }`). `alias`, `kind` (`file`/`folder`) and `state` (`active`/`paused`) come from the Synchronization element; an origin known only from sidecar origin keys has `state: 'adhoc'` and `kind: 'url'` when its `origin_uri` is a URL. `files` lists the inventory ids attributed to the origin. The array MUST be empty when neither source exists, and the builder MUST NOT derive an origin from a folder name.
3. `stats`: Aggregate workspace file statistics (see "Precomputed Gap Metrics and Sidecar Validation"). `stats.categoryCounts` and `stats.storageByCategory` MUST NOT contain `watch_root` or `imported_domain`.
4. `lineage`: Reverse lineage mapping (see "Artifact Reverse Lineage Precomputation").

The payload MUST NOT contain `watchRoots`.

Categorization MUST follow the real workspace layout: `sources/import/` holds imported source documents, media under `sources/assets/` is an `asset`, and models mirrored under `sources/sync/` stay out of the consumer's own model list.

Non-content exclusions: sidecar documents, console build outputs (`domaiNN_console*.html`, `artifacts/<id>_console/`, `artifacts/<id>_view/`) and append-only `.jsonl`/`.ndjson` logs MUST NOT appear as inventory entries. Console outputs would embed the console inside itself; logs are application state.

Payload Bloat Invariant:
The builder MUST NOT serialize full raw contents for tracked files. A text preview (`snippet`) MUST be an excerpt capped at the citation excerpt cap (`EXCERPT_CHAR_CAP`, 500 characters) and bounded by a global preview budget. Binary and image files MUST NOT be inlined in any form.

Determinism Invariant:
Two exports of an unchanged workspace MUST produce byte-identical `model.files` payloads.
(Previously: `category` included `watch_root` and `imported_domain`, unknown files fell back to `source`, and the payload carried `watchRoots` synthesized from folders.)

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

#### Scenario: Unknown file is unclassified
- GIVEN a file `misc/notes.bin` that matches no known layout
- WHEN the file inventory is assembled
- THEN its `category` is `"unclassified"`

#### Scenario: Origins come from Synchronization and sidecars
- GIVEN a sources model with Synchronization `org` and a sidecar whose `synchronization` is `org`
- WHEN the payload is built
- THEN `model.files.origins` has one entry with `alias: "org"` and the element's `origin`, `kind` and `state`
- AND `files` lists the files the sidecars attribute to `org`

#### Scenario: Empty origins
- GIVEN a domaiNN with no Synchronization element and no sidecar origin keys
- WHEN the payload is built
- THEN `model.files.origins` is an empty array
- AND the payload has no `watchRoots` key

#### Scenario: Folder names never create origins
- GIVEN a workspace with a folder named `external` and no Synchronization
- WHEN the domain payload is assembled by `export-console.mjs`
- THEN no origin entry exists for `external`

#### Scenario: Category counts have no legacy categories
- GIVEN any workspace
- WHEN `stats.categoryCounts` is read
- THEN it has no `watch_root` and no `imported_domain` key

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
