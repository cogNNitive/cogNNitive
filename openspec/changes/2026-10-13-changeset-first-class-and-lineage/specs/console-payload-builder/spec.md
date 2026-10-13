# Delta for console-payload-builder

## MODIFIED Requirements

### Requirement: Element Ids and Hashes

Every element MUST carry `id = element.slug` (the frozen, immutable element slug per
`stable-element-identity`), falling back to a derived slug only when a document predates
the freeze. The `id` MUST equal the D5 element address segment so that console keys,
relations and drafts align with the lineage addresses. `hash` MUST remain the first 16
hex characters of the sha256 of the canonical JSON of
`{concept, name, description, fields, markers}` and MUST NOT change on a version-only
edit. (Previously: `id = slugify(concept + ' ' + name)` made unique in document order
with a `-1` suffix.)

#### Scenario: Id equals the frozen slug
- GIVEN an element with `slug:: element-1b`
- WHEN the payload is built
- THEN `element.id` is `element-1b`

#### Scenario: Hash tracks content only
- GIVEN a model edited only in its version
- WHEN rebuilt
- THEN every element `hash` is unchanged

## ADDED Requirements

### Requirement: Changes collection in the domain payload

The domain payload MUST carry a `changes` collection derived at export time from
`changes/*_changes_NN.md`: one entry per changeset with `{ changesetId, path, author,
status, appliedAt, changes: [{ id, op, target, author, notes, status }] }`. The
collection MUST be empty (not absent) when the domain has no changesets, and MUST NOT be
persisted into any model. The changeset history per element (`element.history`) MUST be
derived from the same source.

#### Scenario: Changes carried into the domain console
- GIVEN a domain with two changesets in `changes/`
- WHEN the domain console is exported
- THEN the payload carries both with their changes
- AND no model file contains the collection

#### Scenario: Empty is present, not missing
- GIVEN a domain with no `changes/` directory
- WHEN the payload is built
- THEN `changes` is an empty collection and nothing throws
