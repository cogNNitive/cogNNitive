# Delta for console-payload-builder

## ADDED Requirements

### Requirement: Declared Field Definitions in the Schema Slot

`buildConsoleSchemaSlot` MUST emit `schema.fields` as a flat array with one entry per declared field, flattened from `schema.concepts[].fields`, where each entry carries `concept` (the owning concept name), `name`, `type` and, when declared, `options`, `target_concepts` and `target_blueprint`. The domain payload assembled by `scripts/export-console.mjs` MUST aggregate these arrays across models, de-duplicated by the pair (`concept`, `name`) with the first definition winning (the same order in which concepts are de-duplicated), and MUST NOT emit `schema.fields` as an object keyed by field name. A test MUST export a real fixture domaiNN whose bluepriNNt declares typed fields and assert on the exported slot; a hand-built schema object MUST NOT be the only evidence. (S3b P0-1.)

#### Scenario: Concept fields are flattened with their concept
- GIVEN a bluepriNNt schema whose concept `Initiative` declares `stage` (`type: select`, `options: [idea, build]`) and `owner` (`type: reference`, `target_concepts: [Person]`)
- WHEN `buildConsoleSchemaSlot` builds the slot
- THEN `schema.fields` contains `{ concept: "Initiative", name: "stage", type: "select", options: ["idea", "build"] }`
- AND it contains `{ concept: "Initiative", name: "owner", type: "reference", target_concepts: ["Person"] }`

#### Scenario: Same field name in two concepts is kept twice
- GIVEN concept `Task` declares `status` as `select` and concept `Note` declares `status` as `string`
- WHEN the slot is built
- THEN `schema.fields` has two `status` entries, one with `concept: "Task"` and one with `concept: "Note"`

#### Scenario: Domain export carries the declared fields (regression)
- GIVEN a fixture domaiNN of two models whose bluepriNNts declare typed fields
- WHEN `export-console.mjs --domain` exports it
- THEN the `innfo-schema` slot's `fields` is a non-empty array whose entries each carry `concept`, `name` and `type`
- AND it is not an object keyed by field name (today it is `{}`)

#### Scenario: Duplicate definition across models keeps the first
- GIVEN two models of the same bluepriNNt that both declare (`Task`, `status`)
- WHEN the domain payload is assembled
- THEN `schema.fields` holds exactly one (`Task`, `status`) entry

### Requirement: Element Tags in the Payload

Every payload element MUST carry `tags`, a de-duplicated array of lowercase strings holding the element's own `tags::` followed by the concept-level `tags::` of its concept (as parsed by `parseTagList`), and an empty array when there are none. `tags` MUST NOT be an input of `computeElementHash`: adding, removing or inheriting tags MUST NOT change an element's `hash`, so the hash still equals `hashParsedElement` for the same node and the `base_hash` precondition of `changeset-apply-engine` is unaffected. (S3b P0-4.)

#### Scenario: Element tags reach the payload
- GIVEN an element with `tags:: Pricing, AI`
- WHEN the payload is built
- THEN the element carries `tags: ["pricing", "ai"]`

#### Scenario: Concept-level tags are inherited
- GIVEN a concept section with `tags:: core` and an element of it with `tags:: ai, core`
- WHEN the payload is built
- THEN the element carries `tags: ["ai", "core"]` (union, no duplicate)

#### Scenario: Tags do not move the hash
- GIVEN the same element built once without any `tags::` and once with element and concept tags
- WHEN both payloads are built
- THEN both elements have the same `hash`
- AND that hash equals `hashParsedElement` for the node

#### Scenario: A real export carries tags (regression)
- GIVEN a fixture domaiNN whose elements carry `tags::`
- WHEN `export-console.mjs --domain` exports it
- THEN those elements carry non-empty `tags` in the `innfo-model` slot (today 0 of 336 sample elements do)
