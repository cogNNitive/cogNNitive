# Cognitivize in Place (Delta, new capability)

## Purpose

`cognitivize(path)` makes any file in a domaiNN citable without moving it: it writes a co-located sidecar `<file>.<ext>_sidecar_NN.md`. One core operation backs the nn-trannsform CLI and the innfo-mcp tool. Raw imports land verbatim in `sources/import/` and are cognitivized there.

## ADDED Requirements

### Requirement: Cognitivize is one innfo-core operation

innfo-core MUST export `cognitivize(path, options)` as the only code that creates or refreshes a sidecar. The nn-trannsform CLI and the innfo-mcp `cognitivize` tool MUST both call it. No other module MAY write a sidecar.

#### Scenario: CLI and MCP produce the same sidecar
- GIVEN `sources/import/notes.md`
- WHEN it is cognitivized once through the CLI in one copy of the workspace and once through MCP in another identical copy
- THEN both sidecars are byte-identical apart from `normalized_at`

#### Scenario: No second writer
- GIVEN the repository after this change
- WHEN searched for code writing `_sidecar_NN.md` files outside `cognitivize`
- THEN none exists

### Requirement: Sidecar is co-located and carries origin metadata

`cognitivize` MUST write the sidecar in the same directory as the raw file, named per `nn-naming-contract`. Its frontmatter MUST contain `source_file` (workspace-relative path), `sha256` (hash of the raw bytes), `size_bytes`, `normalized_at` (UTC ISO 8601), and `parent_spec` naming the `sidecar` bluepriNNt. For markdown, CSV, and JSON files the sidecar MUST NOT contain a normalized body. For every other (binary) format it MUST contain the normalized markdown body produced by the injected normalizer so headings stay citable. Metadata the normalizer returns (for example `source_type`, a CSV column profile, or origin URL) MAY be added to the frontmatter.

#### Scenario: Text-native file gets a bodyless sidecar
- GIVEN `sources/import/prices.csv`
- WHEN `cognitivize('sources/import/prices.csv')` runs
- THEN `sources/import/prices.csv_sidecar_NN.md` exists with `source_file`, `sha256`, `size_bytes`, and `normalized_at`
- AND the sidecar has no normalized body

#### Scenario: Binary file gets a body
- GIVEN `sources/import/report.pdf` and an injected normalizer returning `# Summary` content
- WHEN `cognitivize('sources/import/report.pdf')` runs
- THEN `report.pdf_sidecar_NN.md` exists next to it with the `# Summary` content as its body

#### Scenario: Raw file is not moved or changed
- GIVEN any file
- WHEN it is cognitivized
- THEN the raw file's bytes and path are unchanged

#### Scenario: Hash covers raw bytes only
- GIVEN a CSV with CRLF line endings
- WHEN it is cognitivized
- THEN `sha256` equals the SHA-256 of the file's bytes exactly as stored

### Requirement: Cognitivize is idempotent and refreshes on change

When a sidecar already exists and its `sha256` equals the hash of the current raw bytes, `cognitivize` MUST write nothing and MUST report `unchanged`, preserving the existing `normalized_at`. When the hashes differ, `cognitivize` MUST rewrite the sidecar and report `refreshed`.

#### Scenario: Second run writes nothing
- GIVEN a cognitivized file with unchanged bytes
- WHEN `cognitivize` runs again
- THEN no file is modified and the result is `unchanged`

#### Scenario: Edited unsuffixed file is refreshed
- GIVEN a user-dropped `sources/import/notes.md` whose bytes changed after cognitivizing
- WHEN `cognitivize` runs
- THEN the sidecar `sha256` equals the new bytes and the result is `refreshed`

### Requirement: Sidecars are not cognitivized

`cognitivize` MUST reject a path whose role is `sidecar` with an explicit error and MUST NOT write a sidecar of a sidecar.

#### Scenario: Sidecar of a sidecar
- GIVEN `sources/import/prices.csv_sidecar_NN.md`
- WHEN `cognitivize` is called on it
- THEN it returns an error and writes nothing

### Requirement: The normalizer is injected

innfo-core `cognitivize` MUST accept a normalizer function as an option and MUST NOT import any format converter. When a binary file is cognitivized without a normalizer, `cognitivize` MUST fail with an explicit error and MUST NOT write a partial sidecar. nn-trannsform MUST inject its converters (`scanner-converters`, `process-images`).

#### Scenario: Missing normalizer for a binary
- GIVEN `report.pdf` and no injected normalizer
- WHEN `cognitivize` runs
- THEN it fails explicitly and no sidecar exists afterwards

#### Scenario: Text-native file needs no normalizer
- GIVEN `notes.md` and no normalizer
- WHEN `cognitivize` runs
- THEN the sidecar is written

### Requirement: MCP never converts binaries

The innfo-mcp `cognitivize` tool MUST cognitivize markdown, CSV, and JSON files in place. For any binary format it MUST return a non-throwing structured result with status `requires-cli` whose message contains the text "use the nn-trannsform CLI", and MUST write nothing. The tool MUST reject paths outside the workspace root.

#### Scenario: MCP cognitivizes markdown
- GIVEN `sources/import/notes.md`
- WHEN the MCP `cognitivize` tool is called with that path
- THEN the sidecar is written and the result reports success

#### Scenario: MCP defers a binary
- GIVEN `sources/import/report.pdf`
- WHEN the MCP `cognitivize` tool is called
- THEN the result status is `requires-cli`, the message contains "use the nn-trannsform CLI", and no sidecar is written

#### Scenario: Path traversal rejected
- GIVEN the path `../outside.md`
- WHEN the MCP tool is called
- THEN it returns an error and writes nothing

### Requirement: CLI surface

nn-trannsform MUST expose cognitivize through the CLI as `--cognitivize <path>` accepting a file, and a directory (recursive, skipping sidecars and `staging/`). The scan command (`--scan`) MUST cognitivize every uncognitivized or stale file under `sources/import/` and `sources/conversations/` through the same operation.

#### Scenario: Directory cognitivize
- GIVEN `sources/import/` with two files and one existing sidecar
- WHEN `--cognitivize sources/import` runs
- THEN sidecars exist for both files and no sidecar-of-sidecar is created

#### Scenario: Scan uses the same operation
- GIVEN an uncognitivized `sources/import/a.md`
- WHEN `--scan` runs
- THEN `a.md_sidecar_NN.md` exists, written by `cognitivize`

### Requirement: Raw imports land verbatim in `sources/import/`

Importing an external file MUST copy its bytes unchanged into `sources/import/` (the only canonical raw-import location) through the write-once path (see `write-once-artifacts`), then cognitivize the copy in place. Files the user places in `sources/import/` by hand are unsuffixed family members and MUST NOT be renamed.

#### Scenario: Verbatim copy
- GIVEN an external `C:/drop/budget.xlsx`
- WHEN it is imported
- THEN `sources/import/budget_<UTC suffix>.xlsx` has the same SHA-256 as the original
- AND a sidecar exists next to it

#### Scenario: Re-import of identical bytes
- GIVEN an imported file whose source is unchanged
- WHEN the import runs again
- THEN no new file and no new sidecar is written

#### Scenario: Changed source adds a family member
- GIVEN the external file changed
- WHEN the import runs
- THEN a new suffixed member and its sidecar are written and the earlier member's bytes are unchanged

### Requirement: Watch roots only observe

External watch roots (`## NN External Watch Roots`) MUST only be read. The `static`/`dynamic` cadence MUST control only how often a watch root is re-checked; it MUST NOT change whether imports are suffixed.

#### Scenario: Static cadence import is suffixed
- GIVEN a `static` watch root with a new file
- WHEN the scan imports it
- THEN the copy in `sources/import/` carries a UTC suffix

#### Scenario: Watch root is never written
- GIVEN any import
- WHEN it completes
- THEN no file under the watch root was created, changed, or deleted

### Requirement: Retired source folders do not exist at runtime

The ingest path MUST NOT read or write `sources/nn/`, `sources/original/`, `sources/export/`, or `sources/archive/`. Only code carrying a `legacy:cognitivize-in-place/<id>` marker (the migration detector and rewriter) MAY mention these paths. Sidecar field `staging_file` MUST be removed.

#### Scenario: Path gate
- GIVEN the repository after this change
- WHEN `rg -n "sources/(nn|original|export|archive)/"` runs over `iNNfo/packages`, `iNNfo/apps`, `skills`, and `scripts` (excluding generated files and fixtures)
- THEN every match is on a line marked `legacy:cognitivize-in-place/*`

### Requirement: `staging/` is scratch

`staging/` MUST NOT be discovered, cited, or projected as a lineage node, and MUST NOT be subject to write-once.

#### Scenario: Staging file is invisible
- GIVEN `staging/draft.md`
- WHEN lineage projection, discovery, and `--cognitivize` on a directory run
- THEN `staging/draft.md` is not listed and no sidecar is written for it

### Requirement: Conversation promotion is cognitivized in place

A transcript promoted to `sources/conversations/` MUST be a write-once markdown raw file, cognitivized in place. The `sources/nn/conversations/` mirror MUST NOT exist.

#### Scenario: Promoted transcript has a co-located sidecar
- GIVEN a finalized transcript promoted with `[full]`
- WHEN promotion completes
- THEN `sources/conversations/<slug>_source_<UTC suffix>.md` and its `_sidecar_NN.md` sit side by side
