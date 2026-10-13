# Delta for console-payload-builder

## MODIFIED Requirements

### Requirement: Element Ids and Hashes

Every element MUST carry `id = element.slug`, the frozen, immutable element slug (`stable-element-identity`), and `hash`, the first 16 hex characters of the sha256 of the canonical JSON of `{concept, name, description, fields, markers}`. The builder MUST NOT derive an id from the concept or name: when any element of the model has no explicit (frozen) slug, `buildConsolePayload` MUST fail with `UNFROZEN_MODEL`, naming the model and telling the user to freeze its slugs (the `freeze_slugs` operation or `migrate-domain.js --freeze-slugs`). The hash MUST NOT change on a version-only edit and MUST change when a field changes. (Previously: `id = slugify(concept + ' ' + name)`, made unique in document order with a `-1`, `-2` suffix, and the slug was a separate field.)

#### Scenario: Id equals the frozen slug
- GIVEN an element with `slug:: element-1b`
- WHEN the payload is built
- THEN `element.id` is `element-1b`

#### Scenario: Duplicate names keep distinct ids
- GIVEN two elements of one concept named `Customer` with slugs `customer` and `customer-2`
- WHEN built
- THEN their ids are `customer` and `customer-2`

#### Scenario: An unfrozen model is rejected
- GIVEN a model with an element lacking `slug::`
- WHEN the payload is built
- THEN the build fails with `UNFROZEN_MODEL` naming the model and the freeze remedy
- AND no payload is produced

#### Scenario: Hash tracks content only
- GIVEN a model edited only in its version
- WHEN rebuilt
- THEN every element `hash` is unchanged
