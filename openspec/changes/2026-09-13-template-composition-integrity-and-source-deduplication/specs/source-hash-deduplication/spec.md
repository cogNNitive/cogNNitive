# Specification: Source Content-Hash Deduplication

## Requirement: Automated SHA-256 Deduplication for Workspace Sources

Workspace source discovery and audit routines must identify identical files across different folders using cryptographic content hashing rather than path comparison alone.

### Scenario: Suppressing duplicate imports from un-cited source reports
- **GIVEN** a source file `sources/nn/sessions/recording_1.md`
- **AND** an identical copy at `sources/nn/import/sessions/recording_1.md` with the same SHA-256 hash
- **WHEN** the agent or workspace scanner audits un-cited sources against model `sources::` references
- **THEN** the system must identify `sources/nn/import/sessions/recording_1.md` as an alias of `sources/nn/sessions/recording_1.md`
- **AND** report only the primary canonical source in the list of un-cited or newly available sources
- **AND** avoid prompting the user to incorporate duplicate copies.

### Scenario: Distinct files with identical basenames
- **GIVEN** two files in different folders with the same file name but different contents (distinct SHA-256 hashes)
- **WHEN** workspace source audit runs
- **THEN** both files are treated as distinct independent sources and audited separately.
