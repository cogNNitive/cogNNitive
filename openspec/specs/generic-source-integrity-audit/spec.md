# Generic Source Integrity Audit

## Purpose

Preflight audits the co-located sidecars against their raw files: missing sidecars, hash mismatches (the hash guard), and orphaned sidecars.

## Requirements

### Requirement: Universal Source Subtree Scanning

The preflight runner (`preflight-check.js`) and audit commands MUST inspect `sources/import/` and `sources/conversations/` and MUST evaluate each raw file there against its co-located sidecar. Sidecar files MUST NOT be treated as raw files. `staging/` MUST be ignored.

#### Scenario: Workspace with multiple source subtrees
- GIVEN `sources/import/specs/api.pdf` and `sources/conversations/2026-09-06_planning_20260906T120000Z.md`
- WHEN the integrity audit runs
- THEN both raw files are discovered and each is checked against its own co-located sidecar path

### Requirement: Detection of Unnormalized Sources

The audit MUST report a raw file as unnormalized when (1) no co-located sidecar exists (`missing`), or (2) the sidecar `sha256` differs from the SHA-256 of the raw bytes (`hash_mismatch`). Findings MUST appear under `## Warnings` and MUST suggest `nn-trannsform --scan` or `--cognitivize <path>`.

#### Scenario: Newly added import not yet cognitivized
- GIVEN `sources/import/contract.pdf` with no `contract.pdf_sidecar_NN.md`
- WHEN the audit runs
- THEN a Warning reports it as unnormalized with reason `missing`
- AND the exit code is `1`

#### Scenario: Raw modified after cognitivizing
- GIVEN a raw file whose bytes changed after its sidecar was written
- WHEN the audit runs
- THEN it is reported with reason `hash_mismatch`

### Requirement: Detection of Dangling Normalized Sources

The audit MUST report any sidecar whose `source_file` does not resolve to an existing raw file as an orphaned sidecar. It MUST NOT delete it.

#### Scenario: Raw deleted while sidecar remains
- GIVEN `sources/import/old_notes.txt_sidecar_NN.md` and no `old_notes.txt`
- WHEN the audit runs
- THEN a Warning identifies the sidecar as orphaned and nothing is deleted

### Requirement: Structured Audit Reporting and Machine-Readable Output

With `--json`, `preflight-check.js` MUST emit `sources_integrity` with:
- `ok`: true when every raw has an up-to-date sidecar and no orphan exists.
- `subtrees`: counts and statuses for `import` and `conversations`.
- `unnormalized`: array of `{ path, subtree, reason: "missing" | "hash_mismatch" }`.
- `orphaned`: array of `{ path, missing_source }` where `path` is the sidecar.

In human-readable mode findings MUST appear in `## Warnings`, `## Blockers`, and `## OK`. The audit MUST also warn when the domaiNN has no `.gitattributes` containing `* -text`.

#### Scenario: All sources cognitivized and verified
- GIVEN every raw has a matching sidecar and there are no orphans
- WHEN `node scripts/preflight-check.js --json` runs
- THEN `sources_integrity.ok` is `true`, `unnormalized` is empty, and the exit is `0` (other checks passing)

#### Scenario: Missing text policy
- GIVEN a domaiNN without `* -text` in `.gitattributes`
- WHEN preflight runs
- THEN a Warning reports the missing policy
