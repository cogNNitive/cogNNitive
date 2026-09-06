# Spec: Generic Source Integrity Audit

## ADDED Requirements

### Requirement: Universal Source Subtree Scanning

The preflight integrity check runner (`preflight-check.js`) and audit verification commands MUST inspect all three source subtrees within a workspace:
1. `sources/import/`: External raw source documents, images, and data.
2. `sources/export/`: Deliverables promoted from `export/` into the knowledge base.
3. `sources/conversations/`: Transcripts and summaries promoted from `conversations/`.

The auditor MUST evaluate each discovered source file against the canonical representations in `sources/nn/`.

#### Scenario: Workspace with multiple source subtrees
- GIVEN a workspace containing:
  - `sources/import/specs/api.pdf`
  - `sources/export/reports/summary.md`
  - `sources/conversations/2026-09-06_planning_summary.md`
- WHEN the integrity audit runs
- THEN it discovers source files across all three subtrees
- AND it inspects `sources/nn/` for the corresponding normalized artifacts for each file

---

### Requirement: Detection of Unnormalized Sources

The audit runner MUST detect and report any source file present in `sources/import/`, `sources/export/`, or `sources/conversations/` that does not possess an up-to-date normalized counterpart in `sources/nn/`. A source file SHALL be flagged as unnormalized if:
1. No corresponding Markdown file exists in `sources/nn/`; OR
2. The normalized Markdown file exists in `sources/nn/`, but the `hash:` stored in its frontmatter does not match the current SHA-256 hash of the source file.

Unnormalized sources MUST be reported under `## Warnings` in human-readable output and MUST prompt or suggest running normalization (`nn-trannsform --scan`).

#### Scenario: Newly added import file not yet normalized
- GIVEN `sources/import/contract.pdf` exists
- AND no corresponding file exists in `sources/nn/import/contract.md` (or `sources/nn/contract.md`)
- WHEN the preflight audit runs
- THEN the audit reports a Warning indicating `sources/import/contract.pdf` is unnormalized
- AND the exit code is `1` (requiring user confirmation/action or alerting to pending sync)

#### Scenario: Source file modified after normalization
- GIVEN `sources/conversations/2026-09-06_kickoff_summary.md` has been modified since its initial normalization
- AND the normalized file in `sources/nn/` has an outdated hash in frontmatter
- WHEN the preflight audit runs
- THEN the audit detects the hash discrepancy and reports `sources/conversations/2026-09-06_kickoff_summary.md` as outdated/unnormalized

---

### Requirement: Detection of Dangling Normalized Sources

The audit runner MUST verify that every normalized Markdown file in `sources/nn/` (excluding `index.md`) points to a raw source file that physically exists in one of the active source subtrees (`sources/import/`, `sources/export/`, or `sources/conversations/`). If the target `file:` or `source_file:` referenced in frontmatter cannot be resolved on disk, the auditor MUST report the file as an orphaned/dangling normalized source.

#### Scenario: Source file deleted while normalized file remains
- GIVEN `sources/nn/import/old_notes.md` referencing `sources/import/old_notes.txt`
- AND `sources/import/old_notes.txt` has been deleted from the filesystem
- WHEN the preflight audit runs
- THEN the audit reports a Warning identifying `sources/nn/import/old_notes.md` as an orphaned source reference

---

### Requirement: Structured Audit Reporting and Machine-Readable Output

When invoked with `--json`, `preflight-check.js` MUST emit a `sources_integrity` property within the JSON payload detailing:
- `ok`: Boolean indicating whether all sources are synchronized and normalized.
- `subtrees`: An object tracking file counts and statuses for `import`, `export`, and `conversations`.
- `unnormalized`: An array of objects each containing `{ path: string, subtree: string, reason: "missing" | "hash_mismatch" }`.
- `orphaned`: An array of objects each containing `{ path: string, missing_source: string }`.

In human-readable mode, source integrity findings MUST be output in the standard Preflight report sections (`## Warnings`, `## Blockers`, `## OK`).

#### Scenario: All sources normalized and verified
- GIVEN a workspace where all files in `sources/import/`, `sources/export/`, and `sources/conversations/` have matching hashes in `sources/nn/`
- AND no orphaned files exist in `sources/nn/`
- WHEN `node scripts/preflight-check.js --json` runs
- THEN `sources_integrity.ok` evaluates to `true`
- AND `sources_integrity.unnormalized` is empty
- AND the command exits `0` (assuming other preflight checks pass)
