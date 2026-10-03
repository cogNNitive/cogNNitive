# Visual Catalog Blueprint Specification

## Purpose

Define the Level-2 blueprint `visual-catalog` for cataloging image-derived entries with traceability to their witness image and normalized source, plus a bundled SOP.

## Requirements

### Requirement: Blueprint package and frontmatter

The blueprint MUST be packaged at `iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md` with frontmatter declaring `spec_version: "V_0-3-0"`, `level: 2`, `parent_spec` on `iNNfo_V_0-3-0`, `title: "Visual Catalog App"`, `blueprint_version: "V_0-1-0"`, `relationship_types.evaluable_matrix: true`, and a `procedures:` array. `spec_url` MUST point at `cogNNitive-web` on `main`.

#### Scenario: Frontmatter is valid

- GIVEN the `visual-catalog` package
- WHEN its frontmatter is validated
- THEN all declared metadata matches the requirements
- AND `spec_url` targets `cogNNitive-web` on `main`

### Requirement: Entry concept

The blueprint MUST define `Entry` with `name`, `category`, `description`, `attributes`, `status`, and `tags`. `name` MUST be a stable domain identity and MUST NOT be derived from any filename. `category` MUST be a `type:: reference` targeting `Category`. `status` MUST be a select of `candidate`, `confirmed`, `rejected`.

#### Scenario: Entry identity is independent of filename

- GIVEN two differently named images describing the same real thing
- WHEN one Entry is recorded
- THEN `Entry.name` is domain identity, not a filename

### Requirement: Category concept

The blueprint MUST define a hierarchical `Category` with `name`, `parent` (`type:: reference` targeting `Category`), and `description`.

#### Scenario: Nested category

- GIVEN Category `Tickets` with parent `Documents`
- WHEN the catalog is parsed
- THEN the hierarchy edge is resolvable

### Requirement: Evidence concept

The blueprint MUST define `Evidence` with `image` (`type:: image`), `captured_at`, `original_ref`, `source` (`type:: citation` to a normalized source under `sources/nn/`), and `notes`. The first `type:: image` field declared MUST be the main image.

#### Scenario: Evidence links image and normalized source

- GIVEN Evidence with `image:: type:: image` and `source:: sources/nn/photo.md#capture`
- WHEN parsed
- THEN the image is main and the citation resolves to the normalized source

### Requirement: Entry x Evidence free matrix

The blueprint MUST declare a Free Matrix `Entry x Evidence` (`source:: Entry`, `target:: Evidence`) with values `[primary, visible, partial]` and MUST allow N:M cells.

#### Scenario: Many-to-many evidence

- GIVEN Entries `Museum pass` and `Ticket stub` seen in one photo
- WHEN both cells are set to `visible`
- THEN both Entries reference the same Evidence with independent cells

### Requirement: Markers

The blueprint MUST declare markers `confidence` (scale) and `review` (boolean/cycle).

#### Scenario: Marker values persist

- GIVEN an Entry marked `confidence:: 0.6` and `review:: false`
- WHEN the catalog is re-read
- THEN both marker values are preserved

### Requirement: Standalone Level-3 catalog document

A catalog document MUST be a standalone Level-3 doc linked via `type:: knowledge` with `target_blueprint: visual-catalog`.

#### Scenario: Catalog links its blueprint

- GIVEN a catalog doc with `blueprint:: type:: knowledge` and `target_blueprint: visual-catalog`
- WHEN validated
- THEN the blueprint is its enforced `parent_spec`

### Requirement: Bundled ingestion SOP

The `procedures:` array MUST declare a SOP at `procedures/ingest_visual_catalog_NN.md`. It MUST define the pipeline normalize → derive/optimize with double hash → multimodal extraction → dedupe → idempotent upsert → validate, and MUST reference — never duplicate — `iNNfo/specs/bluepriNNts/workspace/procedures/import_and_analyze_visual_source_NN.md`.

#### Scenario: SOP declared and referencing

- GIVEN the blueprint `procedures:` array
- WHEN the SOP is inspected
- THEN it is declared under `procedures/` and references, not copies, the workspace procedure

### Requirement: Deterministic idempotency

Ingestion MUST use a deterministic key: Entry stable `name`, Evidence `image` path/hash, and matrix cell key. Re-ingestion MUST NOT duplicate records.

#### Scenario: Re-ingestion is a no-op

- GIVEN a source ingested once
- WHEN it is ingested again
- THEN records update in place with no duplicates

### Requirement: Hash pairing is SOP-enforced

Original ↔ derivative hash pairing MUST be guaranteed by the SOP, not by any new Level-1 or validator primitive.

#### Scenario: No new hash-pairing primitive

- GIVEN the SOP records original `sha256` and derivative `media_sha256`
- WHEN ingestion validates a source
- THEN pairing is checked by SOP steps, not a validator primitive
