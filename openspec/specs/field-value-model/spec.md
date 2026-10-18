# field-value-model Specification

## Purpose
TBD - created by archiving change fields-replace-markers-and-tags. Update Purpose after archive.
## Requirements
### Requirement: Field Definition Concept Targets

A Field Definition MUST be able to target one concept, a list of concepts, or every concept (`concept:: *`). `*` and list targets MUST be expanded after composition, at each composition level, against the effective schema of the bluepriNNt that declares the Field (its own concepts plus those of its own `includes`). `*` therefore means every Concept Definition of the declaring bluepriNNt's effective schema except those with `type:: text`, and only the root bluepriNNt's `*` reaches every concept of a composite. Expansion MUST happen on both the path with `includes` and the path without. A list target naming an unknown concept MUST be an ERROR. A Field declared for a specific concept (or a list) MUST win over a `*` Field of the same name for that concept, silently. Two different `*` Fields with the same name MUST raise `COMPOSITION_COLLISION`. Consumers of the resolved schema MUST see one Field entry per concept, never an unexpanded `*`.

#### Scenario: Star Field reaches every concept
- GIVEN a bluepriNNt with concepts `Goal` and `Risk` and a Field `complexity` with `concept:: *`
- WHEN the schema is resolved
- THEN `Goal` and `Risk` each carry a `complexity` Field

#### Scenario: Star reaches included concepts
- GIVEN bluepriNNt `business` including `organization`, and `business` declares `tags` with `concept:: *`
- WHEN the schema is resolved
- THEN concepts that come from `organization` carry the `tags` Field

#### Scenario: An included star stays inside its bluepriNNt
- GIVEN composite `business` including `projects` (Field `health`, `concept:: *`) and `metrics`
- WHEN the schema is resolved
- THEN concepts that come from `projects` carry `health`
- AND concepts that come from `metrics` do not

#### Scenario: Specific Field beats star
- GIVEN a `*` Field `priority` and concept `Task` declaring its own `priority` (`select`, closed options)
- WHEN the schema is resolved
- THEN `Task.priority` is the closed `Task` definition and every other concept gets the `*` definition

#### Scenario: List target
- GIVEN a Field with `concept:: [Goal, Risk]`
- WHEN the schema is resolved
- THEN exactly `Goal` and `Risk` carry it

#### Scenario: Star skips text concepts
- GIVEN a bluepriNNt with a concept declared `type:: text` and a Field `tags` with `concept:: *`
- WHEN the schema is resolved
- THEN the text concept carries no `tags` Field and every other concept does

#### Scenario: Unknown list member is an error
- GIVEN a Field with `concept:: [Goal, Ghost]` and no concept `Ghost`
- WHEN the bluepriNNt is validated
- THEN an ERROR names `Ghost`

#### Scenario: Different star Fields of one name collide
- GIVEN two included bluepriNNts each declaring `tags` with `concept:: *` but different definitions
- WHEN the composite is resolved without an alias
- THEN `COMPOSITION_COLLISION` names `tags`

#### Scenario: Identical star Fields dedupe under includes
- GIVEN two included bluepriNNts each declaring an identical `tags` Field with `concept:: *`
- WHEN the composite is resolved
- THEN composition succeeds with one `tags` Field per concept and no `COMPOSITION_COLLISION`

### Requirement: Multi-Valued Fields

A Field MUST be able to declare that it holds several values with the property `multiple:: true`. `multiple` is legal only on `type:: select`; on any other type the metaschema MUST report an ERROR. The canonical value form is a bracketed list `[a, b]`. A multi-valued Field MUST accept an array of values; a single bare scalar written for it MUST be treated as a one-element list. A bare comma-separated value (`a, b`, no brackets) is ONE value and MUST raise the warning `MULTI_VALUE_UNBRACKETED`. A Field without `multiple` MUST remain single-valued and MUST reject an array value. Order of values MUST be preserved on round trip. `multiple` decides inheritance: true means union with the concept-level value, false means the element overrides.

#### Scenario: Array validates
- GIVEN a multi-valued `select` Field `tags`
- WHEN an element carries `tags:: [pricing, ai]`
- THEN validation passes and the element has two values

#### Scenario: Scalar is a one-element list
- GIVEN the same Field and an element with `tags:: urgent`
- WHEN the model is parsed
- THEN the effective value is the list `[urgent]`

#### Scenario: Unbracketed comma list is one value
- GIVEN the same Field and an element with `tags:: a, b`
- WHEN the model is validated
- THEN the value is the single string `a, b` and `MULTI_VALUE_UNBRACKETED` is raised as a warning

#### Scenario: `multiple` on a non-select Field is an error
- GIVEN a Field `owner` with `type:: string` and `multiple:: true`
- WHEN the bluepriNNt is validated against the metaschema
- THEN an ERROR names the Field and states that `multiple` requires `type:: select`

#### Scenario: Single-valued Field rejects an array
- GIVEN a single-valued `select` Field `health`
- WHEN an element carries `health:: [nominal, warning]`
- THEN validation reports an error naming the Field

### Requirement: Select Vocabulary, Open or Closed

A `select` Field without `options` MUST have an open vocabulary: any non-empty value is valid and appears in facets. A `select` Field with `options` MUST have a closed vocabulary: every value (each member, when multi-valued) MUST be one of the options, otherwise validation MUST report a diagnostic naming the Field, the offending value and the allowed options. Each bluepriNNt decides per Field. Values MUST be stored verbatim (no lowercasing on parse). For a `multiple` select, every comparison MUST use one key function, `valueKey(v) = trim().toLowerCase()`: options membership, union de-duplication, filter membership and tag colour. A single-valued select keeps exact option matching. A single implementation, `validateFieldValue`, MUST validate own and concept-level values alike. Under `includes`, identical open `tags` Fields de-duplicate (canonical-form rule) and differing `options` raise `COMPOSITION_COLLISION`; a closed vocabulary that must coexist uses its own Field name.

#### Scenario: Open vocabulary accepts a new value
- GIVEN a multi-valued `select` Field `tags` with no `options`
- WHEN an element carries `tags:: [never-seen-before]`
- THEN validation passes

#### Scenario: Closed vocabulary rejects an unknown member
- GIVEN a multi-valued `select` Field `scope` with options `[core, edge]`
- WHEN an element carries `scope:: [core, other]`
- THEN validation reports `other` as outside `[core, edge]` and accepts `core`

#### Scenario: Closed vocabulary accepts all members
- GIVEN the same Field
- WHEN an element carries `scope:: [edge, core]`
- THEN validation passes

#### Scenario: Multi-valued comparison ignores case, storage does not
- GIVEN the same Field and an element carrying `scope:: [Core]`
- WHEN the model is validated and then serialized
- THEN validation passes (`valueKey` match against `core`)
- AND the stored value is still `Core`

### Requirement: Widgets on Fields

A Field Definition MAY declare `widget` (`boolean`, `cycle`, `scale`, `set`, `text`) and `widget_config`. `type` is the value contract and `widget` is optional interaction; the metaschema MUST enforce this widget/type compatibility as an ERROR: `scale` requires `number`, `boolean` requires `boolean`, `cycle` requires a single-valued `select` with `options`, `set` requires a `select` with `multiple`, `text` requires `string`. The accepted `widget_config` keys per widget MUST be one table, identical in the L1 specification (`iNNfo_V_0-5-0`), the metaschema validator and the console, and it covers Field and Matrix alike: `scale {min,max,step,unit}`, `set {max_selections}`, `cycle {}`, `boolean {true_label,false_label}`, `text {max_length}`. An unknown `widget_config` key MUST be an ERROR naming the key and the widget, and no shipped bluepriNNt MAY trigger one. `scale` bounds and `step` MUST be validated (ERROR on a value outside `min..max` or off-`step`). Marker Definitions no longer carry widgets.

#### Scenario: Valid widget config
- GIVEN a `number` Field with `widget:: scale` and `widget_config` `{"min":0,"max":100,"step":5}`
- WHEN the bluepriNNt is validated
- THEN no widget diagnostic is raised

#### Scenario: Unknown config key
- GIVEN a Field with `widget:: cycle` and a `widget_config` key not in the table
- WHEN the bluepriNNt is validated
- THEN an ERROR names the key and the widget

#### Scenario: Widget incompatible with type
- GIVEN a `string` Field with `widget:: scale`
- WHEN the bluepriNNt is validated
- THEN an ERROR states that `scale` requires `type:: number`

#### Scenario: Scale bounds are enforced
- GIVEN a `number` Field with `widget:: scale` and `widget_config` `{"min":0,"max":100,"step":5}`
- WHEN an element carries `62` and another carries `105`
- THEN validation reports both values as outside the declared bounds or step

#### Scenario: Shipped bluepriNNts are clean
- GIVEN every shipped L2 bluepriNNt
- WHEN validated against the metaschema
- THEN none raises a widget or `widget_config` diagnostic

### Requirement: Number and Boolean Field Types

`FIELD_TYPES` MUST include `number` and `boolean` in addition to the existing types. A `number` Field MUST accept only numeric values and a `boolean` Field only `true` or `false`; `validateFieldValue` MUST reject any other value with a diagnostic naming the Field and the offending value. Element-level `certainty`-style heterogeneity (a score in one place, a flag in another) is therefore a validation error, not an accepted shape.

#### Scenario: Number Field accepts numbers
- GIVEN a `number` Field `complexity`
- WHEN an element carries `complexity:: 75`
- THEN validation passes and the value is the number 75

#### Scenario: Number Field rejects text
- GIVEN the same Field
- WHEN an element carries `complexity:: high`
- THEN validation reports an error naming `complexity` and `high`

#### Scenario: Boolean Field
- GIVEN a `boolean` Field `shipped`
- WHEN an element carries `shipped:: true` and another carries `shipped:: maybe`
- THEN the first passes and the second reports an error naming `shipped`

### Requirement: No Reserved `tags` Property

The parser MUST NOT treat `tags::` specially. `tags` is an ordinary Field resolved through the schema like any other: a declared `tags` Field is validated and exposed as a Field value; an undeclared `tags::` is handled exactly as any other undeclared property. Tag-specific parse results (`ElementNode.tags`, `conceptTags`) MUST NOT exist. Values are stored verbatim; case-insensitive comparison applies only through `valueKey` for multi-valued selects.

#### Scenario: Declared tags is an ordinary Field
- GIVEN a bluepriNNt declaring `tags` (`select`, multi-valued, open) and an element with `tags:: [a, b]`
- WHEN the model is parsed
- THEN `tags` appears among the element's field values, not as a dedicated tag property

#### Scenario: Undeclared tags behaves like any undeclared property
- GIVEN a bluepriNNt that does not declare `tags` and an element with `tags:: [a]`
- WHEN the model is validated
- THEN the value is treated as any undeclared property is, with no tag-specific behavior

#### Scenario: Tags lose symbol, icon and color
- GIVEN the `tags` Field Definition
- WHEN its properties are inspected
- THEN it carries no symbol, icon or color
- AND no Field Definition has `icon` or `color` properties (only the existing `description`)

### Requirement: Concept-Level Field Values

A concept section MAY carry Field values as property lines directly under its `# NN <Concept>` heading, before the first element heading. Parsing MUST stop at the first line that is not a property line, so later prose is never consumed. A `key:: value` line found later in the concept prologue (after prose, before the first element) MUST stay prose and MUST raise the WARNING `CONCEPT_FIELD_AFTER_PROSE` naming the concept and the key, so that a value is never lost silently. The concept text excludes the property block: `update_concept_text` MUST replace the text only and MUST preserve the property block byte-identically. Serialization MUST reproduce the section byte-identically, including a concept section that holds only concept-level values and no elements.

#### Scenario: Concept-level values are parsed
- GIVEN `# NN Goals` followed by `tags:: [core]` and then `## NN Goals: Grow`
- WHEN the model is parsed
- THEN concept `Goals` holds `tags = [core]`

#### Scenario: Prose is not swallowed
- GIVEN a concept section whose first lines are prose and a later line reads `note:: x`
- WHEN the model is parsed
- THEN no concept-level value is created and the prose is preserved

#### Scenario: A late property line warns
- GIVEN `# NN Goals` followed by a prose paragraph and then `tags:: [core]`, before the first element
- WHEN the model is validated
- THEN concept `Goals` has no concept-level `tags`
- AND the WARNING `CONCEPT_FIELD_AFTER_PROSE` names `Goals` and `tags`

#### Scenario: Concept text update keeps the values
- GIVEN `# NN Goals` with `tags:: [core]` and a prose paragraph
- WHEN `update_concept_text` replaces the prose
- THEN the `tags:: [core]` line is unchanged and the new prose follows it

#### Scenario: Values-only section round-trips
- GIVEN a concept section with concept-level values and no elements
- WHEN the model is parsed and serialized
- THEN the output equals the input byte for byte

### Requirement: Concept-Level Inheritance

Every element MUST inherit the concept-level values of its concept. For a multi-valued Field the effective value MUST be the de-duplicated union of the concept-level and element values. For a single-valued Field the element value MUST override the concept-level value; when the element has none, the concept-level value applies. Inherited values MUST be computed on read, never written into the element, and MUST NOT be touched by element mutations (update, rename, delete cascades act on own values only). The core MUST compute an inheritance delta, `inherited[field] = {value, from: concept}`: for a multi-valued Field it holds only the concept-level values the element does not already have, and for a single-valued Field a value only when the element has none. Consumers compute the effective value without knowing the rule (concatenate arrays, or `own ?? inherited`). Concept-level values MUST be validated once against the concept's Field. This replaces `applies_to: Concept` marker scoring. There is no exclusion syntax: an element MUST NOT be able to drop an inherited multi-valued value or to clear an inherited single value (it can only override it). A value that some elements of a concept must not carry belongs on those elements, not at concept level.

#### Scenario: Union for multi-valued
- GIVEN concept `Goals` with `tags:: [core]` and an element with `tags:: [ai, core]`
- WHEN the effective value is read
- THEN it is `[ai, core]` with no duplicate

#### Scenario: Element overrides single-valued
- GIVEN concept `Projects` with `health:: warning` and an element with `health:: nominal`
- WHEN the effective value is read
- THEN it is `nominal`

#### Scenario: Concept value applies when element is silent
- GIVEN concept `Projects` with `health:: warning` and an element without `health`
- WHEN the effective value is read
- THEN it is `warning`, and the element's own values do not contain `health`

#### Scenario: Inheritance delta carries provenance
- GIVEN concept `Goals` with `tags:: [core, ai]` and an element with `tags:: [ai]`
- WHEN the inheritance delta is computed
- THEN `inherited.tags` is `{value: [core], from: "Goals"}` (only the values the element lacks)

#### Scenario: Inherited values are not written back
- GIVEN an element inheriting `tags:: [core]`
- WHEN a field of that element is updated through a changeset
- THEN the serialized element does not gain `tags`

#### Scenario: An inherited value cannot be excluded
- GIVEN concept `Goals` with `tags:: [core]` and an element with `tags:: [ai]`
- WHEN the effective value is read
- THEN it is `[ai, core]`, and no element-level syntax removes `core`

#### Scenario: Invalid inherited value is reported
- GIVEN a concept-level value outside the closed options of the concept's Field
- WHEN the model is validated
- THEN a diagnostic names the concept and the Field

### Requirement: Shipped Field Catalogue

Shipped bluepriNNts MUST declare Fields instead of Marker Definitions, per this mapping. These L2s MUST each declare one identical open-vocabulary `tags` Field (`type:: select`, `multiple:: true`, no `options`, `concept:: *`): `analysis`, `artifacts`, `blank`, `business-model`, `changes`, `cogNNitive`, `design-presets`, `documentation`, `domaiNN`, `innovation`, `metrics`, `organization`, `procedures`, `projects`, `repository`, `sources`, `video-script`, `visual-catalog` and `workspace` (`workspace_spec_NN.md` and its `nn-innfo` template copy). `business` declares none and gets it by composition. `sidecar` MUST NOT declare it. BluepriNNts that declared a `tags` `type:: string` Field (`sources`, `artifacts`, `visual-catalog`, `documentation`) MUST use it instead.

| bluepriNNt | Result |
|---|---|
| organization, procedures | Field `complexity`, `type:: number`, `concept:: *`, `widget:: scale` 0-100 step 5 |
| projects | Field `health`, `concept:: *`, single-valued `select` `[nominal, warning, critical]`, `widget:: cycle` |
| repository | tag `shipped` |
| visual-catalog | Field `confidence` on `Entry`, `type:: number`, `widget:: scale` 0-10; tag `reviewed` |
| cogNNitive, domaiNN, workspace | tag `verified` |
| all | no `importance`, `completion`, `priority`, `rating`, `certainty`, `is_variable`, `is_formula`, `is_derived` marker or Field |

#### Scenario: Ad-hoc tagging is first-class
- GIVEN any shipped content bluepriNNt
- WHEN an element carries `tags:: [anything]`
- THEN validation passes and the value is a facet value

#### Scenario: Health values
- GIVEN the `projects` bluepriNNt
- WHEN an element carries `health:: critical`
- THEN validation passes, and `health:: failing` is rejected

#### Scenario: Evaluative markers are gone
- GIVEN the shipped bluepriNNts and the six Ghostbusters samples
- WHEN searched for the five generic evaluative markers and metrics markers
- THEN none is declared or scored; sample flags appear as tags (`!` priority, `*` important, `>` complete, `?` uncertain, `+` starred)

### Requirement: Tags Concept Deleted

The `domaiNN` and workspace bluepriNNts MUST NOT declare a `Tags` concept, its Fields, or `# NN Tags` instances, and shipped domain files MUST NOT contain a `# NN Tags` section. A domain file that still contains it is reported by the ordinary undefined-concept validation; no tolerance or alias exists.

#### Scenario: Blueprints lack the concept
- GIVEN the resolved `domaiNN` and workspace schemas
- WHEN concepts are listed
- THEN `Tags` is absent

#### Scenario: Shipped domain files are clean
- GIVEN the shipped and sample domain files
- WHEN searched for `# NN Tags`
- THEN there are zero hits

#### Scenario: Stale Tags section fails ordinarily
- GIVEN a user domain file with a `# NN Tags` section
- WHEN validated
- THEN the existing undefined-concept diagnostic is reported and no special handling applies

