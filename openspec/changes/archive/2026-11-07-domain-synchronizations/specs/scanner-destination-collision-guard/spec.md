# scanner-destination-collision-guard Delta Spec

## ADDED Requirements

### Requirement: Same-name files from different origin folders do not collide

Files that share a name but come from different origin-relative directories MUST be written to different destinations and MUST be indexed as different sources. Content deduplication MUST still group files with identical `sha256` as aliases, regardless of their directory.

#### Scenario: Two README files stay separate
- GIVEN `a/README.pdf` and `b/README.pdf` with different bytes imported by one Synchronization
- WHEN `indexWorkspaceSources` runs
- THEN two sources exist with distinct paths
- AND they are not grouped as aliases

#### Scenario: Identical bytes in two folders are aliases
- GIVEN `a/logo.png` and `b/logo.png` with identical bytes imported by one Synchronization
- WHEN `indexWorkspaceSources` runs
- THEN both are grouped under the same `sha256` and one is reported as an alias
