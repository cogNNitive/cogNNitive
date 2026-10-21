# external-watch-roots Specification

## Purpose
TBD - created by archiving change watch-roots-discoverability. Update Purpose after archive.
## Requirements
### Requirement: Watch roots are declared in the lineage record

A domaiNN MUST declare external folders to watch in a `## NN External Watch Roots:` block of its lineage record (`domaiNN_NN.md`, or `<Project>_cogNNitive_NN.md`). Each entry MUST support `Root` (required), `Cadence` (`dynamic` | `static`, default `dynamic`), `Recursive` (default `true`) and `Filter` (a list of extensions or names). The block is hand-authored and MUST be preserved byte-for-byte by lineage regeneration; it MUST NOT be a managed view section.

#### Scenario: Roots are parsed from the record
- GIVEN a lineage record containing a `## NN External Watch Roots:` block with two `Root` entries
- WHEN the watch roots are parsed
- THEN both roots are returned with their declared `Cadence`, `Recursive` and `Filter`
- AND a root with no `Cadence` defaults to `dynamic`

#### Scenario: No block declares no roots
- GIVEN a lineage record without a `## NN External Watch Roots:` block
- WHEN the watch roots are parsed
- THEN the parsed set is empty
- AND no error is raised

### Requirement: On-demand scan classifies external changes

`--scan-external` MUST inspect external file metadata (`mtimeMs` and `size`) as a fast path, hash only files whose metadata changed, and classify each changed item as `NEW`, `EVOLVED_DYNAMIC`, `STATIC_ALERT` or `DISCONNECTED`. An unchanged item MUST be reported as `UNCHANGED`. The scan MUST be read-only with respect to the watch roots. `--json` MUST emit the classified result as stable JSON containing only changed items.

#### Scenario: New and evolved items are classified
- GIVEN a `dynamic` root with one new file and one changed file
- WHEN `--scan-external` runs
- THEN the new file is classified `NEW`
- AND the changed file is classified `EVOLVED_DYNAMIC`

#### Scenario: Static change raises an alert
- GIVEN a `static` root whose file bytes changed
- WHEN `--scan-external` runs
- THEN the item is classified `STATIC_ALERT`

#### Scenario: Unreachable root is disconnected
- GIVEN a declared root whose directory does not exist
- WHEN `--scan-external` runs
- THEN the root is reported `DISCONNECTED`
- AND no item is emitted for it

#### Scenario: Fast path avoids rehashing
- GIVEN a root whose files were scanned and are unchanged
- WHEN `--scan-external` runs again
- THEN the unchanged files are classified `UNCHANGED`
- AND their bytes are not rehashed

### Requirement: Watch roots are read-only and imports are write-once

The scan and every import MUST only read the watch roots. A candidate imported from a root MUST land under `sources/import/` as a write-once, UTC-suffixed family member (`<stem>_<YYYYMMDDTHHmmssZ>.<ext>`) and be cognitivized in place; identical bytes MUST be deduplicated and changed bytes MUST add a new member without touching earlier ones. The `static`/`dynamic` cadence MUST only control how often a root is re-checked — it MUST NOT change whether imports are suffixed. (The observe-only and write-once rules remain owned by `cognitivize-in-place`; this requirement records that watch-root imports obey them.)

#### Scenario: Import never writes to the root
- GIVEN a `dynamic` root with a new candidate file
- WHEN the candidate is imported
- THEN the file is copied into `sources/import/` with a UTC suffix
- AND no file under the watch root is created, changed or deleted

#### Scenario: Identical bytes deduplicate
- GIVEN a candidate whose bytes are already the latest member of its family
- WHEN the candidate is imported
- THEN the import is reported as deduplicated
- AND no new family member is written

### Requirement: Session-start digest is read-only and decision-gated

`--watch-digest` MUST render the scan filtered to items still awaiting a decision, MUST be read-only (never writing to `sources/`), and MUST print nothing when no watch roots are declared. Each item MUST carry a content-addressed key derived from `(root, relPath, sha256)`. `--digest-decide "<key>" --status <ignore|postpone|import>` MUST persist the decision in `.cognnitive/watch-digest.json` (a workspace-local cache, never a source and never a citation target): `ignore` suppresses that exact content permanently, `postpone` re-offers it, and `import` copies it as a write-once member and cognitivizes it. An edited file (new hash) MUST be re-offered; an unchanged, ignored file MUST NOT.

#### Scenario: Digest is empty without roots
- GIVEN a workspace with no declared watch roots
- WHEN `--watch-digest` runs
- THEN it prints nothing and writes nothing

#### Scenario: Ignored content is not re-offered
- GIVEN an item decided `ignore` for its current hash
- WHEN `--watch-digest` runs again
- THEN the item is not listed

#### Scenario: Edited content is re-offered
- GIVEN an item previously decided `ignore`
- WHEN the file's bytes change (new hash)
- THEN the item is listed again under its new key

#### Scenario: Import decision ingests the item
- GIVEN a pending digest item
- WHEN `--digest-decide "<key>" --status import` runs
- THEN the file is copied into `sources/import/` as a write-once member and cognitivized
- AND the decision is recorded in `.cognnitive/watch-digest.json`

### Requirement: The router can detect declared watch roots

To make the capability discoverable, the `nn-preflight` domain probe MUST report watch-root state in its JSON output under a `watch_roots` key containing at least the number of declared roots (`declared`). The probe MUST remain fully offline and MUST NOT invoke the `nn-sources` scan (no cross-skill dependency, no root filesystem walk beyond reading the lineage record). When no record or no block is present, `declared` MUST be `0`.

#### Scenario: Declared roots are counted
- GIVEN a lineage record declaring two watch roots
- WHEN `domain-probe.js --json` runs
- THEN `watch_roots.declared` is `2`

#### Scenario: Absent block reports zero
- GIVEN a lineage record with no `## NN External Watch Roots:` block
- WHEN `domain-probe.js --json` runs
- THEN `watch_roots.declared` is `0`
- AND the probe exits with its pre-existing status code

#### Scenario: Probe stays offline
- GIVEN a machine with no network access
- WHEN `domain-probe.js --json` runs
- THEN it completes and reports `watch_roots` without any network call

