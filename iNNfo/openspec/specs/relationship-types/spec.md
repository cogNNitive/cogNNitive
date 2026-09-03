# relationship-types Specification

## Purpose
TBD - created by archiving change graph-view-relationship-types. Update Purpose after archive.
## Requirements
### Requirement: Origin on every edge
Every relationship carries a required `origin` in {matrix, field, mention, graph_edge}; none emitted without one.

#### Scenario: All origins tagged
- **GIVEN** a fixture with all four edge sources
- **WHEN** normalized
- **THEN** every relationship has `origin` in {matrix, field, mention, graph_edge}

### Requirement: Matrix edges unchanged
Current label/value preserved; only `origin: 'matrix'` added.

#### Scenario: Matrix tagged
- **GIVEN** a WORK to ROLES cell with value `Responsible`
- **WHEN** normalized
- **THEN** edge has label WORK to ROLES, value Responsible, origin 'matrix'

### Requirement: Field edges
Template reference fields and inline `[[...]]` in string values get `origin: 'field'`, label = field name.

#### Scenario: Reference field
- **GIVEN** `depends_on` reference-typed, matching an Element
- **WHEN** normalized
- **THEN** edge has targetId, label 'depends_on', origin 'field'

### Requirement: Mention edges
`[[...]]` in Element description or root `rawSections.description` get `origin: 'mention'`, label `mentions`, no value.

#### Scenario: Mention edge
- **GIVEN** description containing `[[Formulario DS-2019]]`
- **WHEN** normalized
- **THEN** edge has targetId Formulario, label 'mentions', origin 'mention'

### Requirement: Model-wide resolution
Targets resolve against model-wide Element names, case-insensitive; only matches create edges.

#### Scenario: Case-insensitive
- **GIVEN** Element `Visado` and field `note:: [[visado]]`
- **WHEN** normalized
- **THEN** resolves to Visado, origin 'field'

### Requirement: Dangling policy
Unmatched targets skipped (no edge), non-fatal, `warning` issue, path `${sourcePath}#${ElementName}`.

#### Scenario: Dangling non-fatal
- **GIVEN** description containing `[[Missing Element]]`
- **WHEN** normalized
- **THEN** parse completes, no edge, warning issue, siblings intact

### Requirement: Empty wikilinks
`[[]]`/whitespace-only targets skipped silently — no edge, no issue.

#### Scenario: Empty target
- **GIVEN** field `note:: [[]]`
- **WHEN** normalized
- **THEN** no edges, no issues

### Requirement: Dedup
Exact duplicates (targetId+label+origin+value) emitted once; different origins kept parallel.

#### Scenario: Duplicate dedup
- **GIVEN** field `tags:: [[X]] and [[X]]`
- **WHEN** normalized
- **THEN** exactly one field edge to X

### Requirement: graph_edges origin
Frontmatter `graph_edges` get `origin: 'graph_edge'`, label = edge label, value = weight.

#### Scenario: graph_edge origin
- **GIVEN** `graph_edges: [{target: "X", label: "depends"}]`
- **WHEN** normalized
- **THEN** edge has targetId X, label 'depends', origin 'graph_edge'

### Requirement: Graph renders origins
Graph consumes `node.relationships`; each origin visually distinct; legend labels all four.

#### Scenario: Distinct rendering
- **GIVEN** graph fixture with all four origins
- **WHEN** useGraphData builds edges
- **THEN** one GEdge per relationship, origins distinct, legend lists four

### Requirement: Collision policy
Duplicate Element names stay parse issues; first-registered Element wins.

#### Scenario: Duplicate name
- **GIVEN** two Elements `Alpha` in different Concepts
- **WHEN** normalized
- **THEN** duplicate parse issue, first-registered wins

