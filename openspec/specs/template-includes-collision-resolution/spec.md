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
