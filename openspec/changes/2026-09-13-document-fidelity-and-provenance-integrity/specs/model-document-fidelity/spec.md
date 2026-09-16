# Spec: Model Document Fidelity

Governs `parseModel` / `serializeModel` in `@cognnitive/innfo-core`, the single
write path shared by `innfo-mcp` (`apply_change`) and `innfo-editor`
(`recursiveSerializer`).

## Canonical Form

The canonical serialized form is the one the Level-1 specification documents
(`iNNfo/specs/iNNfo_V_0-2-1_NN.md`, "Unified Syntax"), and the one every shipped
sample already uses:

```markdown
# NN Stakeholders

## NN Stakeholders: Customer
importance:: high
needs:: [speed, accuracy]
Customer description text follows the properties.
```

Properties are written at **column 0**, list values keep their **bracket form**,
and elements are separated by a **single blank line**.

## Specification Requirements

### Requirement 1: Round-Trip Identity

`serializeModel(parseModel(content))` MUST equal `content` for every document
that is already in canonical form.

- **GIVEN** any `*_NN.md` file under `_samples_nn/models/`, `_samples_nn/`, or
  `iNNfo/specs/templates/*/samples/`
- **WHEN** it is parsed and immediately re-serialized
- **THEN** the output MUST be byte-identical to the input

### Requirement 2: Idempotency

Serialization MUST be idempotent for **all** documents, including those not yet
in canonical form.

- **GIVEN** any parsable iNNfo document `d`
- **WHEN** `once = serializeModel(parseModel(d))` and
  `twice = serializeModel(parseModel(once))`
- **THEN** `once` MUST equal `twice`

This closes the unbounded indentation growth observed in
`Ghostbusters_video-generator_NN.md`, where each save added two further spaces
to a description line without bound. The parser MUST strip the canonical
property/description indentation on read so the writer cannot re-apply it.

### Requirement 3: Matrix Axis Labels

`parseModel` MUST capture the two axis labels from a matrix table header into
`MatrixData.source` and `MatrixData.target`.

- **GIVEN** a matrix section whose header row reads `| Metrics \ Variables | … |`
- **WHEN** the document is parsed
- **THEN** `matrix.source` MUST be `"Metrics"` and `matrix.target` MUST be
  `"Variables"`
- **AND WHEN** the model is re-serialized
- **THEN** the header MUST read `| Metrics \ Variables | … |`

`serializeModel` MUST NOT emit the `Row` / `Col` placeholders for a matrix whose
axis labels are known. The placeholders MAY remain only for a matrix constructed
programmatically with no axis labels.

### Requirement 4: Section Order Preservation

`parseModel` MUST record the order in which `# NN` sections appear, and
`serializeModel` MUST emit them in that order.

- **GIVEN** a document whose sections are `# NN Analysis`, `# NN Assumptions`,
  `# NN Risks`, `# NN matrices: …`
- **WHEN** it is parsed and re-serialized
- **THEN** the sections MUST appear in that same order, regardless of whether a
  section is element-bearing, a `text`-type raw section, or a matrix

Sections added by a mutation after parsing MUST be appended after the recorded
sections, in insertion order.

### Requirement 5: Property Value Form Preservation

A list-valued property MUST round-trip in the form the author wrote.

- **GIVEN** `tags:: [market, seasonality]`
- **WHEN** parsed and re-serialized
- **THEN** the output MUST be `tags:: [market, seasonality]`, NOT
  `tags:: market, seasonality`

This requirement already holds for citation fields via `serializeCitationValue`;
it MUST be extended to every list-valued property.

### Requirement 6: Indentation

`serializeModel` MUST write element properties and description lines at column
0, matching the Level-1 specification and every shipped document.

### Requirement 7: Fidelity Is Enforced, Not Assumed

The repository MUST carry a test that asserts Requirements 1 and 2 across every
file in `_samples_nn/` and `iNNfo/specs/templates/*/samples/`, so a future
serializer change cannot silently reintroduce drift.

## Out of Scope

Preserving cosmetic variation that the canonical form does not define — multiple
consecutive blank lines, trailing whitespace, or non-canonical property
indentation — is NOT required. Such documents MUST converge to canonical form on
the first save (Requirement 2 guarantees they then stay put).
