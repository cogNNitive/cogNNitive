# Delta for innfo-console-runtime

## ADDED Requirements

### Requirement: Declared Field Lookup by Concept and Field

The runtime SHALL resolve a field's declared definition (`type`, `options`, `target_concepts`) from `schema.fields` by the pair (element concept, field name), compared case-insensitively, for read rendering (`FieldValue`), for the concept guide and for the edit modal target built by `review.js`. It MUST NOT match on the field name alone. When no definition matches, read rendering MUST fall back to the existing value-shape renderers and the edit modal MUST infer the widget from the value shape under the rules of `console-ui-kit` "Edit Modal Value Type Safety". The bundle MUST be rebuilt from the sources. A test MUST boot the console in jsdom on the output of `export-console.mjs` for a real fixture domaiNN, not on a hand-fed schema. (S3b P0-1.)

#### Scenario: Same field name, different concepts
- GIVEN `schema.fields` declares (`Task`, `status`) as `select` with options `[open, closed]` and (`Note`, `status`) as `string`
- WHEN a `Task` element and a `Note` element with `status` values render and their `status` edit modals open
- THEN the `Task` value is an `.innfo-field-select` pill and its modal offers a `select`
- AND the `Note` value is plain text and its modal offers a text input (today the first name match wins for both)

#### Scenario: A real export reaches the renderers (regression)
- GIVEN a fixture domaiNN whose bluepriNNt declares a `select` field on concept `Initiative`
- WHEN it is exported with `export-console.mjs --domain` and the console boots in jsdom
- THEN at least one `.innfo-field-select` node exists for an `Initiative` element (today none does in any exported console)

#### Scenario: Undeclared field falls back to shape
- GIVEN an element field `order: 3` with no declared definition
- WHEN its edit modal opens
- THEN the widget is `input[type=number]`

### Requirement: Tag Facet Matching

The filter SHALL treat `tag:<t>` as exact, case-insensitive membership in `element.tags`, and multiple `tag:` tokens MUST combine with AND. `tag-any:<t>` tokens MUST form one OR group: an element matches the group when it carries at least one of them. The `tag:` set, the `tag-any:` group and every other facet MUST combine with AND. Substring matching MUST NOT be used for tags. `element.tags` is the only tag source: a field that happens to be named `tags` or `tag` MUST NOT be read by the tag facet (full-text search still finds its value). Model and concept facets keep their OR semantics; the asymmetry MUST be stated in the filter help text or documentation. (S3b P0-4.)

#### Scenario: Tags narrow with AND
- GIVEN elements A `tags: [ai, pricing]` and B `tags: [ai]`
- WHEN the filter is `tag:ai tag:pricing`
- THEN only A is listed (today A and B are, by OR)

#### Scenario: Exact match, not substring
- GIVEN an element with `tags: [retail]`
- WHEN the filter is `tag:ai`
- THEN it is not listed (today `ai` matches inside `retail`)

#### Scenario: tag-any widens with OR
- GIVEN elements A `tags: [ai]`, B `tags: [pricing]`, C `tags: [ops]`
- WHEN the filter is `tag-any:ai tag-any:pricing`
- THEN A and B are listed and C is not

#### Scenario: Mixed AND and OR
- GIVEN elements A `tags: [core, ai]`, B `tags: [core, pricing]`, C `tags: [ai]`
- WHEN the filter is `tag:core tag-any:ai tag-any:pricing`
- THEN A and B are listed and C is not

#### Scenario: A field named tags is not a tag source
- GIVEN an element with no `tags` and a string field `tags: "ai"`
- WHEN the filter is `tag:ai`
- THEN it is not listed

### Requirement: Knowledge Field Click-Through

A field declared `knowledge` SHALL render as a pill naming the bound model. When the value (ignoring `[[ ]]`, a leading `kNNowledge/` path and the `_NN.md`/`.md` suffix, case-insensitively) matches the file stem, `id` or `title` of an entry of `meta.models`, clicking the pill MUST apply the same `model:` filter the rail applies for that model. When it matches no model the pill MUST be inert and clicking it MUST NOT throw. The console MUST NOT offer to create or bind a model. (S3b P1-9.)

#### Scenario: Pill opens the bound model
- GIVEN a domain console with models `pricing` and `roadmap`, and an element whose `knowledge` field is `[[kNNowledge/roadmap_NN.md]]`
- WHEN the pill is clicked
- THEN the active filter is `model:roadmap` and only `roadmap` elements are listed

#### Scenario: Unknown model is inert
- GIVEN a `knowledge` value naming no model in `meta.models`
- WHEN the pill is clicked
- THEN the filter is unchanged and no error is thrown

#### Scenario: No creation affordance
- GIVEN any `knowledge` field
- THEN no control to create or bind a model exists

### Requirement: Open Original Source File

The citation detail dialog SHALL show, for every entry that carries an `href` (see `console-export-cli` "Console Links Are Relative to the Console File"), an "Open original" link (`a`, `target="_blank"`, `rel="noopener noreferrer"`) to the source file. The link MUST be rendered only when the `href` is a relative path or an `http:`/`https:` URL; error entries and entries without `href` MUST show no link. The console MUST NOT add preview, code or lineage modes for the file. (S3b P1, minimal `FilePreviewModal` port.)

#### Scenario: Open original from a citation
- GIVEN a field citation resolved to `sources/nn/interview.md` with `href: "sources/nn/interview.md"`
- WHEN its citation dialog opens
- THEN it contains an `a` with that `href`, `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: Error entry has no link
- GIVEN a citation entry with `error` set
- WHEN the dialog renders it
- THEN no "Open original" link exists for it

#### Scenario: Unsafe href is not a link
- GIVEN an entry whose `href` is `javascript:alert(1)`
- WHEN the dialog renders it
- THEN no `a` element is created for it
