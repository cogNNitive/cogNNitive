# external-watch-roots Specification (delta)

## ADDED Requirements

### Requirement: Watch roots are declared in the domaiNN entrypoint

A domaiNN MUST declare external folders to watch in a `## NN External Watch Roots:` block of its entrypoint document (`domaiNN_NN.md`, role `entrypoint`). Each entry MUST support `Root` (required), `Cadence` (`dynamic` | `static`, default `dynamic`), `Recursive` (default `true`) and `Filter` (a list of extensions or names). The block is hand-authored; no tool regenerates the entrypoint, and the block is parsed unchanged from its previous grammar. Watch roots MUST NOT be read from any other document, and the `RECORD_TOKENS` substring scan MUST NOT exist. The block is a free-form `## NN` heading tolerated by `RESERVED_STRUCTURAL_HEADINGS`; it is not a declared concept. (Previously: the block lived in the lineage record, preserved by lineage regeneration.)

#### Scenario: Roots are parsed from the entrypoint
- GIVEN a `domaiNN_NN.md` containing a `## NN External Watch Roots:` block with two `Root` entries
- WHEN the watch roots are parsed
- THEN both roots are returned with their declared `Cadence`, `Recursive` and `Filter`
- AND a root with no `Cadence` defaults to `dynamic`

#### Scenario: No block declares no roots
- GIVEN an entrypoint without a `## NN External Watch Roots:` block
- WHEN the watch roots are parsed
- THEN the parsed set is empty
- AND no error is raised

#### Scenario: A block in another document is ignored
- GIVEN a `## NN External Watch Roots:` block inside a file that is not the entrypoint
- WHEN the watch roots are parsed
- THEN the block is not read

## MODIFIED Requirements

### Requirement: The router can detect declared watch roots

To make the capability discoverable, the `nn-preflight` domain probe MUST report watch-root state in its JSON output under a `watch_roots` key containing at least the number of declared roots (`declared`). The probe MUST remain fully offline and MUST NOT invoke the `nn-sources` scan (no cross-skill dependency, no root filesystem walk beyond reading the entrypoint). When no entrypoint or no block is present, `declared` MUST be `0`. (Previously: the probe read the lineage record.)

#### Scenario: Declared roots are counted
- GIVEN an entrypoint declaring two watch roots
- WHEN `domain-probe.js --json` runs
- THEN `watch_roots.declared` is `2`

#### Scenario: Absent block reports zero
- GIVEN an entrypoint with no `## NN External Watch Roots:` block
- WHEN `domain-probe.js --json` runs
- THEN `watch_roots.declared` is `0`
- AND the probe exits with its pre-existing status code

#### Scenario: Probe stays offline
- GIVEN a machine with no network access
- WHEN `domain-probe.js --json` runs
- THEN it completes and reports `watch_roots` without any network call

## REMOVED Requirements

### Requirement: Watch roots are declared in the lineage record
(Reason: replaced by "Watch roots are declared in the domaiNN entrypoint" because the lineage record is deleted.)
(Migration: none — legacy out of scope. A domaiNN whose roots were declared in a record must copy the block into `domaiNN_NN.md` by hand.)
