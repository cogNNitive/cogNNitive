# Delta for canonical-vocabulary

Living spec read: `openspec/specs/canonical-vocabulary/spec.md`. Existing requirements are unchanged (canonical terms `defiNNition`, `iNNfo`, `bluepriNNt`, `kNNowledge`, `domaiNN`; deprecated aliases; stable identifiers; console as the UI term). This delta adds the storage vocabulary. The final names are decided in design (working terms: compact storage, distributed storage, instance model, element, collection, placement rule); the requirement fixes that each concept has exactly one entry and that "catalog" is not reused. The living spec names the rendered page `docs/innfo/documentation/vocabulary.md`; the root `AGENTS.md` names `docs/documentation/content/vocabulary.md`. The generator output path is a verification item for the task phase.

## ADDED Requirements

### Requirement: Storage terms are canonical

`iNNfo/specs/vocabulary.json` MUST define one entry for each of: compact storage, distributed storage, instance model, collection and placement rule, plus the hierarchical id as the identity form of a model. The generated vocabulary page MUST render them, and the root and `iNNfo` `AGENTS.md` vocabulary blocks MUST stay consistent with the dictionary (the vocabulary consistency check). The entries MUST state that these are concepts of the kNNowledge level, not new levels, and that an instance model is a kNNowledge document.

#### Scenario: Dictionary entries exist
- GIVEN `vocabulary.json`
- WHEN parsed
- THEN entries exist for compact storage, distributed storage, instance model, collection, placement rule and hierarchical id, each with a definition

#### Scenario: Docs page renders the terms
- GIVEN the generated vocabulary page
- WHEN read
- THEN it lists the six terms with their definitions

#### Scenario: Dictionary and AGENTS blocks agree
- GIVEN the dictionary
- WHEN the vocabulary consistency check runs
- THEN no mismatch is reported

### Requirement: "Catalog" is not reused

The dictionary MUST NOT define or use "catalog" for the storage concepts. The existing meaning of `catalog` (the `nature.structure` value and the catalog documents `sources`, `procedures`, `artifacts`) MUST be unchanged. "Collection" is the term for the domaiNN-wide set of instances of a concept, and the dictionary entry MUST state its relation to the declared `members` collection of the `changes` bluepriNNt (the same word, one meaning: the set of units of one kind).

#### Scenario: No storage entry says catalog
- GIVEN `vocabulary.json`
- WHEN the storage entries are read
- THEN none uses "catalog" as its term or as an alias

#### Scenario: Existing catalog meaning intact
- GIVEN the `catalog` structure value and the catalog documents
- WHEN the dictionary is read after this change
- THEN their entries are unchanged

### Requirement: Removed address vocabulary is recorded

The dictionary MUST record that "title" is display-only for addressing, and MUST NOT list title-qualified reference, stem id or path-flipped id as accepted forms. Terms that existed only for the removed forms MUST NOT remain as live entries.

#### Scenario: Title is display-only
- GIVEN the vocabulary page
- WHEN the entry for title is read
- THEN it states that a title never resolves an address
