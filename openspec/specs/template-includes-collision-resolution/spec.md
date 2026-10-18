# Template Includes Collision Resolution

## Purpose

Define collision detection rules, mandatory explicit renaming schema via frontmatter `alias` maps, and deterministic merging logic during `includes` template composition in `innfo-core`.
## Requirements
### Requirement: Frontmatter Alias Schema for Composition Includes

Level 2 template YAML frontmatter MUST support an `alias` mapping block under `includes` items. The `alias` block MAY contain `concepts` and `fields` sub-maps, mapping original concept or field names in the included template to renamed symbols in the composite template.

#### Scenario: Declaring concept aliasing in includes frontmatter
- GIVEN a composite template `business-projects` including base template `business`
- WHEN `includes` specifies:
  ```yaml
  includes:
    - name: "business"
      url: "https://cognnitive.com/innfo/specs/templates/business/V_0-2-0/spec_NN.md"
      alias:
        concepts:
          "Task": "BusinessTask"
  ```
- THEN `resolveTemplateSchema()` renames concept `Task` to `BusinessTask` before merging into the composite schema

#### Scenario: Declaring field scope aliasing in includes frontmatter
- GIVEN an included template with a field `status` under concept `Item`
- WHEN `includes` specifies `alias: fields: { "Item.status": "Item.business_status" }`
- THEN `resolveTemplateSchema()` renames the field target accordingly during composition

---

### Requirement: Composition Collision Detection and Diagnostic Rejection

When `resolveTemplateSchema()` or `validate_template` detects that two or more included base templates define identical concept names or field scopes without explicit `alias` maps resolving the conflict, template validation MUST fail with a blocking `[COMPOSITION_COLLISION]` error.

#### Scenario: Un-aliased concept collision fails validation
- GIVEN included template `business` defines concept `Task`
- AND included template `projects` also defines concept `Task`
- WHEN composite template includes both `business` and `projects` without an `alias` mapping for `Task`
- THEN `validate_template` fails validation with error code `[COMPOSITION_COLLISION]`
- AND the diagnostic message explicitly names both source templates and specifies how to resolve using `alias`

#### Scenario: Multi-level inheritance collision detection
- GIVEN template `A` includes `B` and `C`
- AND `B` transitively includes `D` which defines concept `Resource`
- AND `C` directly defines concept `Resource`
- WHEN `resolveTemplateSchema()` evaluates the composite inheritance tree
- THEN the un-aliased collision on `Resource` is detected and rejected

---

### Requirement: Deterministic Renaming and Merging

When explicit `alias` mappings are provided, `resolveTemplateSchema()` MUST apply renamings across all references in the included schema—including concept definitions, field scopes, matrix row/column concepts, and constraint expressions—before performing schema merging.

#### Scenario: Explicit aliasing resolves concept collision deterministically
- GIVEN included template `business` defines concept `Task` aliased to `BusinessTask`
- AND included template `projects` defines concept `Task` aliased to `ProjectTask`
- WHEN composition executes
- THEN both `BusinessTask` and `ProjectTask` co-exist in the resolved composite schema without error

#### Scenario: Matrix row and column concept renaming via alias
- GIVEN an included template defining a matrix table with row concept `Task`
- WHEN concept `Task` is aliased to `BusinessTask` in `includes`
- THEN matrix table definition row concepts are automatically updated to `BusinessTask` in the output schema

### Requirement: Star and Multi-Concept Fields in Composition

When composing `includes`, a Field with `concept:: *` or a concept list MUST be expanded after composition, at each composition level, over the effective schema of the bluepriNNt that DECLARES it: that bluepriNNt's own concepts plus those of its own includes. A `*` declared by an included bluepriNNt therefore MUST NOT reach the concepts of sibling includes or of the including bluepriNNt. Only the root bluepriNNt's `*` reaches every concept of the composite. Identical star Fields declared by several included bluepriNNts (compared by canonical form) MUST deduplicate without `COMPOSITION_COLLISION`. Star Fields of the same name that differ in definition (for example one open and one closed `tags` Field) MUST still raise `COMPOSITION_COLLISION` unless `alias` resolves it, even when their reaches do not overlap, because one Field name has one meaning per composite; there is no union-of-`options` merge rule, and a closed vocabulary that has to coexist uses its own Field name. A concept-specific or list Field beats a `*` Field of the same name silently. There is no Marker deduplication: Marker Definitions are not composed.

#### Scenario: Identical star Fields dedupe
- GIVEN included bluepriNNts `analysis` and `organization`, each declaring the same open `tags` Field with `concept:: *`
- WHEN the composite resolves
- THEN every concept has exactly one `tags` Field and no collision is raised

#### Scenario: Conflicting star Fields collide
- GIVEN one included bluepriNNt declaring open `tags` and another declaring `tags` with `options`
- WHEN the composite resolves without an alias
- THEN `COMPOSITION_COLLISION` names the Field

#### Scenario: Star covers included concepts
- GIVEN a composite whose own `tags` Field uses `concept:: *`
- WHEN it resolves
- THEN concepts contributed by included bluepriNNts carry `tags`

#### Scenario: An included star does not reach sibling includes
- GIVEN composite `business` including `organization` (Field `complexity`, `concept:: *`) and `analysis` (no `complexity` Field)
- WHEN the composite resolves
- THEN every concept contributed by `organization` carries `complexity`
- AND no concept contributed by `analysis` carries it

#### Scenario: Marker Definitions are not merged
- GIVEN an included bluepriNNt that still declares a Marker Definition
- WHEN the composite is validated
- THEN `MARKERS_REMOVED` is reported and no marker is composed

