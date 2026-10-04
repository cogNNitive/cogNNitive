# Canonical Vocabulary (Delta)

## Purpose

Add the two terms this change introduces, so that docs, editor labels, and skill copy use one meaning.

## ADDED Requirements

### Requirement: `sidecar` and `cognitivize` are canonical terms

`iNNfo/specs/vocabulary.json` MUST define `sidecar` (the co-located `<file>.<ext>_sidecar_NN.md` document that carries a file's hash, size, metadata, and, for binary files, a normalized body) and `cognitivize` (the operation that creates or refreshes a sidecar in place). `docs/innfo/documentation/vocabulary.md` MUST render both. The terms MUST be noted as concepts, not as new levels: a `sidecar` is a kNNowledge-level document that is never a model. The root and `iNNfo` `AGENTS.md` vocabulary blocks MUST stay consistent with the dictionary.

#### Scenario: Dictionary entries exist
- GIVEN `vocabulary.json`
- WHEN parsed
- THEN entries for `sidecar` and `cognitivize` exist with definitions

#### Scenario: Docs page renders the terms
- GIVEN the generated vocabulary page
- WHEN read
- THEN it lists `sidecar` and `cognitivize` with their definitions

#### Scenario: Dictionary and AGENTS blocks agree
- GIVEN the canonical dictionary
- WHEN the vocabulary consistency check runs
- THEN no mismatch is reported

### Requirement: Release notes list procedure and layout renames

The release notes for this change MUST list every renamed procedure file and the retired folders, because URLs pinned to older `templates-v*` tags keep resolving and no redirect is provided.

#### Scenario: Notes complete
- GIVEN the release handoff notes
- WHEN compared with the renamed procedure files
- THEN every rename is listed
