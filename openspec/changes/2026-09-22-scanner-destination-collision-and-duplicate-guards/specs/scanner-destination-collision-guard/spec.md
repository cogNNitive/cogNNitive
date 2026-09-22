# Scanner Destination Collision Guard & Content Deduplication

## Purpose

Enforce strict destination path ownership and content-based deduplication during source normalization. Ensures that when raw source files are ingested into `sources/nn/`, no existing normalized file can be silently overwritten or claimed by a different raw source file without explicit user action, and duplicate source contents are accurately identified across all source trees.

## Requirements

### Requirement: Destination Path Ownership Verification

During source normalization (`processOkFile` / `scanAndProcess`), before writing or archiving any target file at `destPath` under `sources/nn/`:
1. The scanner MUST inspect any existing file at `destPath`.
2. If `destPath` exists and contains frontmatter specifying `source_file` (or `file`), the scanner MUST verify whether the existing source path matches the incoming raw's `sourceFileField` (normalized to POSIX relative path).
3. If the existing `source_file` belongs to a different raw file and the existing file is not an orphaned/synthetic record explicitly being migrated, the scanner MUST NOT overwrite the destination.
4. The scanner MUST record a collision status (e.g. `❌ Collision / Error`) and report an actionable error identifying both the existing source file and the incoming raw file.

#### Scenario: Distinct raw files colliding on the same normalized destination
- GIVEN an existing normalized file `sources/nn/import/Tutorias.md` with frontmatter `source_file: sources/import/MAD-11/Tutorias.xls`
- WHEN the scanner processes an incoming raw file `sources/import/VIR-3/Tutorias.xls` configured or resolving to the same `destPath` (`sources/nn/import/Tutorias.md`)
- THEN the scanner detects the ownership conflict (`MAD-11/Tutorias.xls` vs `VIR-3/Tutorias.xls`)
- AND it halts or flags the file with a collision error without modifying `sources/nn/import/Tutorias.md` or creating a false historical snapshot

#### Scenario: Same raw file updating with new content
- GIVEN an existing normalized file `sources/nn/import/Tutorias.md` with frontmatter `source_file: sources/import/Tutorias.xls`
- WHEN the scanner processes an updated `sources/import/Tutorias.xls` with a different hash
- THEN the scanner confirms the `source_file` matches
- AND it snapshots the old version to `sources/archive/` and writes the updated normalized content

---

### Requirement: Normalized Markdown Body Deduplication

`duplicate-guards.js` and workspace indexing MUST determine duplicate/alias identity based on the normalized Markdown body content rather than raw file hashes:
1. The indexing function `indexWorkspaceSources()` MUST extract the normalized body (content without mutable frontmatter headers) and compute its SHA-256 hash.
2. Normalized files sharing the same body content SHA-256 MUST be grouped as content aliases.
3. The primary canonical source path MUST be determined according to canonical rules (e.g. shortest path, standard naming) while secondary instances are recognized as duplicate aliases.

#### Scenario: Duplicate normalized bodies across different raw names
- GIVEN `sources/nn/import/CRL-10_2026-07.md` and `sources/nn/import/CRL-10_Backup.md` having distinct `source_file` fields but byte-identical normalized body text
- WHEN `indexWorkspaceSources` runs
- THEN both files are grouped under the same content body hash
- AND duplicate/alias warnings or reports accurately reflect the shared content
