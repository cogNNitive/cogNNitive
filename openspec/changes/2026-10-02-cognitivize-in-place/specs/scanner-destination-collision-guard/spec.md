# Scanner Destination Collision Guard (Delta)

## Purpose

Destination collisions cannot occur when every written path is unique and sidecars are co-located with their raw file. The ownership guard goes away; content deduplication stays, re-keyed on sidecars.

## REMOVED Requirements

### Requirement: Destination Path Ownership Verification
(Reason: a mirror path under `sources/nn/` no longer exists, and raw imports are write-once with unique suffixed names, so two raw files cannot claim one destination.)
(Migration: none.)

## MODIFIED Requirements

### Requirement: Normalized Markdown Body Deduplication

`duplicate-guards.js` and workspace indexing MUST determine duplicate/alias identity from co-located sidecars:
1. `indexWorkspaceSources()` MUST group sources by the sidecar `sha256` of the raw bytes.
2. For sidecars that carry a normalized body (binary sources), it MUST additionally group by the SHA-256 of that body, excluding mutable frontmatter.
3. The primary canonical path in a group MUST be chosen by the existing canonical rules (shortest path, standard naming); the others are reported as aliases.
4. Sidecars themselves MUST NOT be indexed as sources.
(Previously: identity was computed from files under `sources/nn/` by normalized body hash only.)

#### Scenario: Identical raw bytes under different names
- GIVEN `sources/import/a.csv` and `sources/import/copy_of_a.csv` with identical bytes and sidecars
- WHEN `indexWorkspaceSources` runs
- THEN both are grouped under the same `sha256` and one is reported as an alias

#### Scenario: Different binaries with identical normalized body
- GIVEN `sources/import/q.pdf` and `sources/import/q.docx` whose sidecars have byte-identical bodies
- WHEN `indexWorkspaceSources` runs
- THEN they are grouped as content aliases

#### Scenario: Sidecars are not sources
- GIVEN a workspace with sidecars
- WHEN `indexWorkspaceSources` runs
- THEN no sidecar appears as an indexed source entry
