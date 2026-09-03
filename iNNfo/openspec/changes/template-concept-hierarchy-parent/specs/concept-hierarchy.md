# Spec: Concept Hierarchy via Parent Property

## Scenarios

### Scenario 1: Level 2 Template parses `parent::` into `Concept.parent` and builds taxonomy
- **Given** a Level 2 template with:
  ```markdown
  # NN Concept Definition
  ## NN Concept Definition: Architecture
  type:: category

  # NN Concept Definition
  ## NN Concept Definition: Services
  parent:: [[Architecture]]
  type:: text
  ```
- **When** `extractTemplateSchema` is executed
- **Then** `concepts` includes `Services` with `parent: 'Architecture'`
- **And** `taxonomy` contains `{ parent: '', child: 'Architecture' }` and `{ parent: 'Architecture', child: 'Services' }`

### Scenario 2: Level 2 Template falls back to `# NN index` if no `parent::` fields are defined
- **Given** a legacy Level 2 template containing `# NN index` with nested wikilinks and concepts without `parent::`
- **When** `extractTemplateSchema` is executed
- **Then** `taxonomy` matches the edges parsed from `# NN index`

### Scenario 3: Validation flags non-existent `parent` in Level 2 template
- **Given** a Level 2 template where `Services` declares `parent:: [[NonExistent]]`
- **When** `validateFormatContent` is run
- **Then** a validation error `template-parent-not-found` is emitted naming `NonExistent`

### Scenario 4: Validation flags circular taxonomy in Level 2 template
- **Given** a Level 2 template where `A` declares `parent:: [[B]]` and `B` declares `parent:: [[A]]`
- **When** `validateFormatContent` is run
- **Then** a validation error `template-parent-cycle` is emitted

### Scenario 5: Level 3 model warns when `# NN index` is declared
- **Given** a Level 3 model with `# NN index`
- **When** `validateFormatContent` is run
- **Then** a validation warning `l3-index-ignored` is emitted indicating taxonomy belongs to Level 2

### Scenario 6: Hierarchy consistency validator uses template taxonomy over Level 3 index
- **Given** a template with taxonomy `Parent -> Child`
- **And** a Level 3 model declaring an index with contradictory taxonomy
- **When** `validateTaxonomyHierarchy` is run
- **Then** it validates element references against `templateTaxonomy` and ignores the Level 3 index
