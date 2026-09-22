# Design: Scanner Destination Collision Guard & Content Deduplication

## Architectural Context

In the cogNNitive pipeline, `nn-trannsform` is responsible for ingesting external and native source documents into canonical normalized markdown files in `sources/nn/`. These normalized files are subsequently cited by domain models (`models/*.md`), lineages (`# NN Sources`), and semantic impact checks.

### Vulnerability Identified
When source files have generic names (e.g. `Tutorias.xls`, `Summary.pdf`, `Data.csv`) downloaded into different directories or dropped sequentially into `sources/import/`, multiple distinct source documents can map to the exact same relative target path in `sources/nn/`.
Prior to this change:
1. `processOkFile()` compared `readExistingSha256(destPath)` against the raw file hash.
2. When the hash differed, it assumed the file was simply a newer version of the same source, generated an archive snapshot, and overwrote `destPath`.
3. As a result, previous source data was destroyed or swapped, while downstream models pointing to `destPath` silently cited data from an entirely different origin.

## Design Decisions

### 1. Ownership Check in `processOkFile`
Before executing conversion or creating archive snapshots, inspect the existing normalized file:
- Read `existingFields = getExistingFrontmatterFields(destPath, sourceFileField)`.
- Extract `existingSource = existingFields.source_file || existingFields.file`.
- Normalize POSIX paths (replace `\\` with `/`).
- If `existingSource` is present and does not equal `sourceFileField`:
  - If the existing source file still exists on disk at `existingSource`, this is an active ownership collision.
  - Reject the overwrite and return status: `❌ Error`, action: `Destination collision: Destination path already belongs to '${existingSource}'. Incoming source '${sourceFileField}' cannot overwrite it without renaming or unlinking.`
  - Set `outcome: 'failed'` or `'collision'`.

### 2. Normalized Body Hashing in `duplicate-guards.js`
In `indexWorkspaceSources()`:
- Separate frontmatter from body using standard delimiter `---`.
- Trim leading/trailing whitespace of the markdown body.
- Compute SHA-256 of the normalized body:
  `const bodyHash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');`
- Group entries by `bodyHash` in `byHash` map.
- Retain both `rawSha256` (from frontmatter) and `bodySha256` in index entries for multi-dimensional querying.

### 3. Surface Collision in Scan Output and Return Codes
- When a collision occurs during `--scan`, `scanAndProcess` aggregates collision errors into a `collisions` list.
- If collisions are detected, print prominent warnings in the console summary table and return an error outcome so automated workflows fail loudly instead of proceeding with corrupted lineage.

## Test Strategy
- Unit test in `skills/nn-trannsform/test/unit/test-scanner-collision.js`:
  1. Create a dummy workspace in `temp/test-collision-workspace`.
  2. Ingest `sources/import/ProgA/Data.txt` into `sources/nn/import/Data.md` (or flat).
  3. Attempt to ingest `sources/import/ProgB/Data.txt` mapping to the same `destPath`.
  4. Assert collision is detected, error returned, and original file untouched.
  5. Ingest updated `sources/import/ProgA/Data.txt` and verify it updates normally.
- Unit test in `skills/nn-trannsform/test/unit/test-duplicate-body-hash.js`:
  1. Create two files with different frontmatter `source_file` but identical markdown body.
  2. Run `indexWorkspaceSources()` and assert they are grouped as content aliases.
