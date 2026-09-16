# Spec: Citation Provenance Typing

Governs which element fields carry provenance Citations, and how a Citation is
written back to disk.

## Context

`SOURCE_FIELD_NAMES = new Set(['sources', 'source'])`
(`innfo-core/src/sourceRef.ts`) currently decides what is provenance by field
**name**. The `documentation` template declares a field named `source` with
`type:: markdown_file` — a workspace-relative content path, not provenance — and
the workspace validator reports it as a broken Citation, producing 7
`KU_DANGLING_FILE` errors against the shipped documentation sample. No template
can name a field `source` for any other purpose.

The schema already carries a real type system. Provenance MUST be derived from
it.

## Specification Requirements

### Requirement 1: `citation` Field Type

The Level-1 metaschema (`iNNfo/specs/iNNfo_V_0-2-*_NN.md`) MUST declare
`citation` as a legal `Field Definition` `type`, alongside `string`, `select`,
`reference`, `image`, `file`, `video`, `audio`, `url`, `markdown_inline`,
`markdown_file`, and `model`.

A field declared `type:: citation` holds one or more provenance pointers in the
knowledge-unit grammar (`<path>@<unit>` or the deprecated `<path>#<slug>`).

### Requirement 2: Citation Fields Resolve From The Schema

`validateWorkspaceSources` MUST determine a field's citation status from the
resolved template schema, not from its name.

- **GIVEN** a template declaring `## NN Field Definition: source` with
  `type:: markdown_file`
- **WHEN** an element in a conforming model writes `source:: overview.md`
- **THEN** no `KU_*` diagnostic SHALL be emitted for that field

- **GIVEN** a template declaring a field with `type:: citation`
- **WHEN** an element writes a value on that field
- **THEN** the full `KU_*` citation validation SHALL apply, whatever the field
  is named

### Requirement 3: Name Matching Is The Documented Fallback

When no schema is available for a document, the validator MUST fall back to the
existing name set (`sources`, `source`) so schemaless and offline validation
keeps working.

- **GIVEN** a document whose template cannot be resolved
- **WHEN** workspace source validation runs
- **THEN** fields named `sources` or `source` MUST still be validated as
  Citations, and the behaviour MUST be documented at the call site as a fallback

### Requirement 4: Shipped Templates Declare Their Intent

Every shipped template that means provenance MUST declare `type:: citation` on
that field. The `documentation` template's `source` field MUST remain
`type:: markdown_file`. Each template whose field type changes MUST bump its
`template_version`.

### Requirement 5: Citation Text Fidelity

`serializeKnowledgeUnitRef` MUST emit the human-readable unit text, not the
derived slug.

- **GIVEN** a user writes `sources:: [market-report-2026.md@## Q4 Outlook]`
- **WHEN** an agent or the editor writes the document back
- **THEN** the citation MUST still read `@## Q4 Outlook`, NOT `@##q4-outlook`
- **AND** `parseKnowledgeUnitRef` MUST continue to derive the slug on read, so
  resolution is unaffected

### Requirement 6: Citation Lists Are Deduplicated On Write

- **GIVEN** a citation field whose value contains the same pointer twice
- **WHEN** the document is serialized
- **THEN** the duplicate MUST be removed, preserving first-occurrence order

Deduplication compares the parsed pointer (path plus unit plus subunits), so
`file.md@## X` and `sources/nn/file.md@##x` are recognised as the same citation.
