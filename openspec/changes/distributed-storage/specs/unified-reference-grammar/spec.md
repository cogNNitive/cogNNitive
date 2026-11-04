# unified-reference-grammar Specification

## Purpose

One syntax addresses kNNowledge units everywhere: `<hierarchical-id>[@<slug>[&<field>]]`. It is used by references between models, by change targets and by citations of kNNowledge units. Titles are display-only: no tool resolves an address by title. The three syntaxes that coexist today are replaced: `[[Title :: Name]]` (title-based references), `<model>@<slug>&<field>` with a stem-or-path model part (change targets), and `<path>@## NN Change: c-09` (citations of a model by path and heading).

The `@` part also carries the unit forms already defined by `knowledge-unit-address` (`@concept:<slug>`, `@matrix:<slug>`, matrix cells `&<row>&<col>`); this change does not alter them. Citations of raw files (`sources/...` with a heading, CSV row or JSON Pointer unit) address files, not kNNowledge units, and keep the path grammar of `citation-parser-resolver`. The characters that wrap a reference inside a field value are a design decision; the scenarios show the address only.

Backwards compatibility is not provided: the removed forms are rejected.

## Requirements

### Requirement: One grammar for references, change targets and citations of kNNowledge units

innfo-core MUST expose one parser and one serializer for `<hierarchical-id>[@<slug>[&<field>]]`. References in `reference` and `model` typed fields, the `target` of every changeset operation, and citations whose target is a kNNowledge unit MUST all use it. No consumer outside innfo-core MAY implement a parser for these forms.

#### Scenario: Model, element and field addresses
- GIVEN the addresses `villabotijos-today/pepper-mapache`, `villabotijos-today/pepper-mapache@00-gancho` and `villabotijos-today/pepper-mapache@00-gancho-presenter&asset`
- WHEN each is parsed
- THEN the results are a model address, an element address and a field address
- AND the model part of each is `villabotijos-today/pepper-mapache`

#### Scenario: A change target uses the same grammar
- GIVEN an `update_field` change on the `voice` field of Scene `00-gancho`
- WHEN its `target` is written
- THEN it is `villabotijos-today/pepper-mapache@00-gancho&voice`
- AND the same string parses as a reference value

#### Scenario: A citation of a kNNowledge unit uses the same grammar
- GIVEN a `sources::` entry citing the Scene `00-gancho` of `villabotijos-today/pepper-mapache`
- WHEN it is parsed
- THEN it is an element address, not a path with a heading anchor

### Requirement: Removed forms are rejected

The following MUST be rejected with a diagnostic that names the removed form and the grammar to use: `[[Title :: Name]]` as a cross-model reference; a model part that is a filename stem or a domain-relative path flipped on collision; and `<path>@## NN Change: <id>` as a citation of a kNNowledge or changeset document. No alias, fallback or auto-conversion MAY exist.

#### Scenario: Title-qualified reference is rejected
- GIVEN a field value `[[Villabotijos Today :: Celedonio Full]]`
- WHEN the domaiNN is validated
- THEN a diagnostic reports the title-qualified form as removed
- AND the value is not resolved by title

#### Scenario: Change-heading citation is rejected
- GIVEN a citation `changes/lc_tutorias_20261012T173127Z_changes_NN.md@## NN Change: c-09`
- WHEN it is validated
- THEN a diagnostic reports the form as removed
- AND no heading lookup is attempted

#### Scenario: No title resolution remains in live code
- GIVEN the repository after this change
- WHEN searched outside write-once files and archived changes
- THEN no code resolves a model or element address by title, and no code parses `@## NN Change:` citations

### Requirement: Titles are display-only

Resolution of an address MUST NOT use any `title`. Two models sharing a frontmatter `title` MUST NOT be an error. Reference rendering (console, diagnostics) MAY show the target's title, but the stored value is always the address.

#### Scenario: Equal titles are legal
- GIVEN the series scope document and two other documents of the same series, all titled `Villabotijos Today`
- WHEN the domaiNN is validated
- THEN no duplicate-title diagnostic is emitted

#### Scenario: Stored by id, shown by title
- GIVEN a field storing `villabotijos-today/pepper-mapache`
- WHEN the console renders the field
- THEN it shows `El mapache fuera de la ley`
- AND the file keeps `villabotijos-today/pepper-mapache`

### Requirement: Authoring surfaces autocomplete by title and write the id

Console authoring of a reference MUST let the author search by title and MUST store the selected target's address. When several targets match, each candidate MUST be shown with its address and none MAY be chosen automatically.

#### Scenario: Autocomplete writes the id
- GIVEN a reference field and the query `mapache`
- WHEN the author selects `El mapache fuera de la ley (villabotijos-today/pepper-mapache)`
- THEN the stored value is `villabotijos-today/pepper-mapache`

#### Scenario: Equal titles are disambiguated by id
- GIVEN Videos `villabotijos-today/intro` and `innteresante/intro`, both titled `Intro`
- WHEN the author searches `Intro`
- THEN both candidates are listed with their ids
- AND no value is written until one is selected

### Requirement: An address resolves exactly or not at all

An address MUST resolve only when its full hierarchical id matches one model. A partial id (the slug without its container) MUST NOT resolve, even if only one model has that slug today, because adding a second model would change its meaning. An unresolved address MUST be an error that names the address and lists the candidate ids whose last segment equals the given slug.

#### Scenario: Bare slug is not an id
- GIVEN only `villabotijos-today/intro` exists
- WHEN `intro` is used as a model address
- THEN it is reported as unresolved
- AND the diagnostic lists `villabotijos-today/intro` as a candidate

#### Scenario: Ambiguous slug lists every candidate
- GIVEN `villabotijos-today/intro` and `innteresante/intro`
- WHEN `intro` is used as a model address
- THEN the diagnostic lists both candidates and resolves neither

#### Scenario: Dangling element
- GIVEN `villabotijos-today/pepper-mapache@no-such-scene`
- WHEN the domaiNN is validated
- THEN an error names the model, which exists, and the unresolved element slug

#### Scenario: Stale address after a move names the successor
- GIVEN an instance moved from `innteresante/intro` to `villabotijos-today/intro` through a recorded change and a reference to the old id
- WHEN the reference is validated
- THEN the error names the old id and SHOULD name `villabotijos-today/intro` as its recorded successor

### Requirement: Raw-file citations keep the path grammar

A citation whose target is a raw file (markdown, CSV or JSON under `sources/` and other non-kNNowledge paths) MUST keep the path grammar and unit kinds of `citation-parser-resolver`. The two classes MUST be distinguishable by the parser without consulting the filesystem.

#### Scenario: Both classes side by side
- GIVEN `sources:: [sources/import/interview.md@## Clients, villabotijos-today/pepper-mapache@00-gancho]`
- WHEN the field is parsed
- THEN the first entry is a file citation with a `header` unit
- AND the second is a kNNowledge unit address

### Requirement: Membership checks apply to resolved addresses

The concept and template membership checks of `cross-model-reference-validation` (`target_concepts`, `target_template`) MUST apply to the target an address resolves to, whatever the storage form of the target.

#### Scenario: Wrong concept warns
- GIVEN a field declaring `target_concepts: [Video]` and a value addressing a Series instance
- WHEN the domaiNN is validated
- THEN a warning reports the concept mismatch
