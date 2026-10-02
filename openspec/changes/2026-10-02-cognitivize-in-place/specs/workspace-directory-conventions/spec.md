# Workspace Directory Conventions (Delta)

## Purpose

Folders are write destinations; roles come from names. The layout drops `sources/nn`, `sources/original`, `sources/export`, `sources/archive`, and `export/`, and adds `artifacts/` and a text policy.

## ADDED Requirements

### Requirement: Canonical domaiNN layout

The conventions MUST define these write destinations: `kNNowledge/` (documents), `sources/import/` (the only canonical raw-import location), `sources/conversations/` (promoted transcripts), `conversations/` (live session transcripts), `artifacts/` (every producer output), `procedures/`, and `staging/` (scratch). `sources/nn/`, `sources/original/`, `sources/export/`, `sources/archive/`, and `export/` MUST NOT be part of the layout. Sidecars live next to their raw file; there is no mirror tree.

#### Scenario: Fresh bootstrap
- GIVEN a new domaiNN bootstrapped by `nn-trannsform`
- WHEN the directory tree is listed
- THEN `sources/import/`, `sources/conversations/`, `artifacts/`, and `staging/` exist
- AND none of the retired folders exist

### Requirement: Retired layouts are never resolved at runtime

Runtime code MUST NOT read or fall back to retired folders. Only the migration detector and rewriter, marked `legacy:cognitivize-in-place/<id>` with a matching `legacy-ledger.yaml` entry, MAY refer to them.

#### Scenario: Retired folder present
- GIVEN a workspace that still contains `export/report.md`
- WHEN the lineage projection and discovery run
- THEN `export/report.md` is ignored and the detector (not the runtime) reports the legacy layout

#### Scenario: Ledger guard
- GIVEN the migration code
- WHEN `node scripts/lib/legacy-ledger-guard.js` runs
- THEN every `legacy:cognitivize-in-place/*` marker maps 1:1 to a ledger entry

### Requirement: Text policy for byte-stable hashing

Bootstrap MUST ensure the domaiNN root `.gitattributes` contains the line `* -text`, preserving existing lines. Hashing MUST use raw bytes only.

#### Scenario: Bootstrap writes the policy
- GIVEN a new domaiNN
- WHEN bootstrap completes
- THEN `.gitattributes` contains `* -text`

#### Scenario: Existing file preserved
- GIVEN an existing `.gitattributes` without the policy
- WHEN bootstrap runs
- THEN `* -text` is added and the existing lines remain

#### Scenario: CRLF fixture keeps its hash
- GIVEN a CRLF CSV committed with `* -text`
- WHEN it is checked out on Windows and cognitivized
- THEN its sidecar `sha256` equals the hash of the committed bytes

### Requirement: Staging is scratch

`staging/` MUST NOT be discovered, cited, or projected as a lineage node, and write-once rules MUST NOT apply to it.

#### Scenario: Staging ignored
- GIVEN files in `staging/`
- WHEN scans and projections run
- THEN they are not listed or hashed into the record
