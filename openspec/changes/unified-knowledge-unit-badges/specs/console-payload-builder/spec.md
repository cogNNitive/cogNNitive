# Delta for Console Payload Builder

## MODIFIED Requirements

### Requirement: Single Payload Builder

`buildConsolePayload` MUST be the only payload builder. The CLI (`scripts/export-console.mjs`) MUST delegate to it and MUST NOT hand-build payloads.

The payload contract is extended with unit identity facts:
- `meta.domain`: an object `{ title, address, modelCount, sourceCount }` where `address` equals `"domaiNN_NN.md"`.
- `meta.models[]`: each entry carries `family` (the slugified blueprint family name).
- Schema definitions (`schema.concepts`, `schema.fields`, `schema.matrices`) MUST carry `declaredBy: { family, version, location }`.
- Domain schema de-duplication MUST use the composite key `(family, name)` (instead of bare name), ensuring definitions retain their declaring blueprint identity and version.
- `matrices[]` MUST carry `slug` (the matrix slug).

(Previously: `meta.domain` had no `address`, definitions did not carry `declaredBy`, and de-duplication was by bare name.)

#### Scenario: Domain descriptor carries address and counts
- GIVEN a domain with two models and three sources
- WHEN the domain payload is assembled
- THEN `meta.domain.address` is `"domaiNN_NN.md"`
- AND `meta.domain.modelCount` is `2` and `sourceCount` is `3`

#### Scenario: Schema definitions retain declaredBy
- GIVEN bluepriNNt `"business"` declaring concept `"Goal"` and field `"owner"`
- WHEN the schema slot is built
- THEN `concept.declaredBy.family` is `"business"`
- AND `field.declaredBy.family` is `"business"`

#### Scenario: Multi-blueprint field definitions survive dedup
- GIVEN two included bluepriNNts each declaring a field of the same name under their respective concepts
- WHEN domain schema de-duplication runs
- THEN both definitions are preserved with their distinct `declaredBy` bluepriNNts

---

### Requirement: Element Ids and Hashes

Every element MUST carry `id = element.slug`, the frozen immutable element slug, and `hash`, the first 16 hex characters of the sha256 of canonical JSON `{concept, name, description, fields, markers}`.

In addition:
- `element.canonicalUnit` is RENAMED to `element.location` (carrying the human-readable header location, e.g. `"file_NN.md@## NN Concept: Name"`).
- `element.unitSlug` is REMOVED without backwards-compatibility alias.
- Normalization of drafts MUST assign `draft.address`, the canonical unit address targeting the element or value.

(Previously: the location property was named `canonicalUnit`, and `unitSlug` was emitted on elements.)

#### Scenario: Location replaces canonicalUnit
- GIVEN an element in the parsed model
- WHEN the payload element is built
- THEN `element.location` is populated with the human location
- AND `element.canonicalUnit` is undefined
- AND `element.unitSlug` is undefined

#### Scenario: Normalized draft has canonical address
- GIVEN a draft targeting element `"element-1b"` with field `"photo"` in model `"strategy"`
- WHEN the draft is normalized
- THEN `draft.address` is `"strategy@element-1b&photo"`

---

### Requirement: Matrix Header Metadata

`ConsolePayloadMatrix` MUST provide a `head` object carrying per-header identity metadata:
```ts
head?: {
  rows: Record<string, { label?: string; concept?: string; slug?: string; kind?: "element" | "marker" }>
  cols: Record<string, { label?: string; concept?: string; slug?: string; kind?: "element" | "marker" }>
}
```

For free matrices, `slug` MUST be populated with the header element's frozen slug. When no slug exists, it falls back to `slugifyHeading(label)`.

(Previously: `head` entries carried `label`, `concept`, `kind`, but did not require `slug`.)

#### Scenario: Header element slug emitted
- GIVEN a free matrix whose row represents element `"Strategy A"` with slug `"strategy-a"`
- WHEN the matrix payload is built
- THEN `head.rows["Strategy A"].slug` is `"strategy-a"`
- AND `head.rows["Strategy A"].kind` is `"element"`
