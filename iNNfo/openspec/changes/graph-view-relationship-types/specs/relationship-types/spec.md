# relationship-types Specification

## Purpose

Relationship edges on normalized Blocks (`ModelNode.relationships`) carry a required `origin` exposing the three documented relationship levels (`matrix`, `field`, `mention`) plus explicit `graph_edge` to all consumers. innfo-core builds all origins via one model-wide Element-name resolution pass; the graph keeps consuming `relationships` and renders each origin distinctly. Scenarios map to Vitest tests (core: normalize; editor: useGraphData). Bounded to V_0-1-0.

## Requirements

| # | Requirement | S | Description |
|---|-------------|---|-------------|
| R1 | Origin on every edge | MUST | Every relationship carries a required `origin` in {matrix, field, mention, graph_edge}; none emitted without one. |
| R2 | Matrix edges unchanged | MUST | Current label/value preserved; only `origin: 'matrix'` added. |
| R3 | Field edges | MUST | Template `reference` fields and inline `[[...]]` in string values → `origin: 'field'`, label = field name. |
| R4 | Mention edges | MUST | `[[...]]` in Element description or root `rawSections.description` (never `rawContent`) → `origin: 'mention'`, label `mentions`, no value. |
| R5 | Model-wide resolution | MUST | Targets resolve against model-wide Element names, case-insensitive; only matches create edges. |
| R6 | Dangling policy | MUST | Unmatched targets skipped (no edge), non-fatal, `warning` issue, path `${sourcePath}#${ElementName}`. |
| R7 | Empty wikilinks | MUST | `[[]]`/whitespace-only targets skipped silently — no edge, no issue. |
| R8 | Dedup | MUST | Exact duplicates (targetId+label+origin+value) emitted once; different origins kept parallel. |
| R9 | graph_edges origin | MUST | Frontmatter `graph_edges` → `origin: 'graph_edge'`, label = edge label, value = weight. |
| R10 | Graph renders origins | MUST | Graph consumes `node.relationships`; each origin visually distinct; legend labels all four. |
| R11 | Collision policy | MUST | Duplicate Element names stay parse issues; first-registered Element wins; unchanged. |
| N1 | Docs taxonomy | MUST NOT | `docs/documentation/relationships.md` unchanged. |
| N2 | Matrix behavior | MUST NOT | Matrix parsing, cell values, edge set unchanged beyond `origin`. |
| N3 | BlockConnections | MUST NOT | `useNodeConnections.ts`/BlockConnections not refactored or removed. |
| N4 | No editor UI | MUST NOT | No relationship editor UI; no cross-file/workspace resolution. |

## Scenarios

| R | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| R1 | All origins tagged | Fixture with all four edge sources | Normalized | Every relationship has `origin` in {matrix, field, mention, graph_edge} |
| R2 | Matrix tagged | WORK→ROLES cell = `Responsible` | Normalized | Edge {label: WORK→ROLES, value: Responsible, origin: 'matrix'}; set otherwise unchanged |
| R3 | Reference field | `depends_on` reference-typed, matching an Element | Normalized | Edge {targetId, label: 'depends_on', origin: 'field'} |
| R3 | Inline wikilink | Field `assigned_to:: [[Padres]]` | Normalized | Edge {targetId: Padres, label: 'assigned_to', origin: 'field'} |
| R4 | Mention edge | Description contains `[[Formulario DS-2019]]` | Normalized | Edge {targetId: Formulario, label: 'mentions', origin: 'mention'} |
| R5 | Case-insensitive | Element `Visado`; field `note:: [[visado]]` | Normalized | Resolves to Visado, origin 'field' |
| R5 | Prose false positive | Field `cost:: [[USD 500]]`; no such Element | Normalized | No edge; R6 warning applies |
| R6 | Dangling non-fatal | Description contains `[[Missing Element]]` | Normalized | Parse completes; no edge; `warning` issue `<source>#<Element>`; siblings intact |
| R6 | Nested brackets | Description `[[see [[Alpha]] here]]` | Normalized | Target `see [[Alpha` unmatched → skipped, warning, no crash |
| R7 | Empty target | Field `note:: [[]]` and `[[  ]]` | Normalized | No edges, no issues |
| R8 | Duplicate dedup | Field `tags:: [[X]] and [[X]]` | Normalized | Exactly one field edge to X |
| R8 | Parallel origins | Element B via matrix, field, description | Normalized | Three edges to B, one per origin |
| R9 | graph_edge origin | `graph_edges: [{target: "X", label: "depends"}]` | Normalized | Edge {targetId: X, label: 'depends', origin: 'graph_edge'} |
| R10 | Distinct rendering | Graph fixture with all four origins | useGraphData builds edges | One GEdge per relationship; origins distinct; legend lists four |
| R11 | Duplicate name | Two Elements `Alpha` in different Concepts | Normalized | Duplicate parse issue; `[[Alpha]]` → first-registered |
