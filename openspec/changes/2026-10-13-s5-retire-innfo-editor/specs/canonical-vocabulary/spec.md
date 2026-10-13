# Delta for canonical-vocabulary

## MODIFIED Requirements

### Requirement: Canonical term dictionary is machine-readable and human-visible

The system MUST provide a canonical term dictionary in two forms: a machine-readable map (`vocabulary.json` under `iNNfo/specs/`) that drives console labels and skill copy, and a human-readable page under `docs/innfo/documentation/vocabulary.md`. The `iNNfo/AGENTS.md` and root `AGENTS.md` "Canonical Vocabulary & Ubiquitous Language" block MUST match. (Previously: the dictionary drove `innfo-editor` labels.)

#### Scenario: Dictionary consumed by console labels

- GIVEN the canonical dictionary published as `vocabulary.json`
- WHEN the console renders a label for a Level-2 schema
- THEN the label MUST use the canonical term `bluepriNNt` for the schema sense

#### Scenario: Dictionary rendered as docs page

- GIVEN the canonical dictionary
- WHEN `docs/innfo/documentation/vocabulary.md` is generated
- THEN it lists every canonical term (`defiNNition`, `iNNfo`, `bluepriNNt`, `kNNowledge`, `domaiNN`) with its deprecated aliases and sense exclusions

### Requirement: Excluded senses of "template"

The rename MUST NOT apply to: nn-trannsform's transformation templates (`traNNsformations/` directory, CLI `--apply <name>`), HTML `<template>` elements, or generic English usage. The dictionary MUST record these exclusions explicitly. (Previously: the exclusion named Vue SFC `<template>` blocks in `innfo-editor`, which is retired.)

#### Scenario: nn-trannsform vocabulary untouched

- GIVEN `nn-trannsform` skill copy
- WHEN it refers to its transformation templates
- THEN the term `template` remains valid in that context and is NOT renamed

#### Scenario: Source code syntax untouched

- GIVEN console sources using HTML `<template>` elements
- WHEN inspected after this change
- THEN those elements are byte-identical
