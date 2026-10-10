# Lineage Timeline View Specification

## Purpose

TBD - created by archiving a changeset change. Update Purpose after archive.

## Requirements

### Requirement: Lineage style switch defaults to Timeline

The Lineage surface MUST offer two styles: `Timeline` and `Graph`. When the
Lineage view is first shown, `Timeline` MUST be the active style. The Graph style
MUST remain available and MUST render the existing Mermaid definition unchanged.

#### Scenario: Lineage opens on Timeline

- GIVEN a previewed source file with lineage information
- WHEN the user activates the Lineage view
- THEN the Timeline style is rendered
- AND the Graph style is not rendered until the user selects it

#### Scenario: Switching to Graph renders Mermaid

- GIVEN the Lineage view is showing the Timeline style
- WHEN the user selects the Graph style
- THEN the Mermaid graph renders as before

### Requirement: Timeline renders the known provenance chain

The Timeline MUST render, in order, the provenance chain available for the focal
file: the upstream node (the focal file's `source_file`, when present), the focal
node (the current file), each citing model element (downstream citations), and any
rendered related elements. The Timeline MUST NOT require recursive upstream
resolution; a single upstream hop is the required minimum.

#### Scenario: Upstream, focal, and citations render

- GIVEN a source file whose frontmatter declares `source_file`
- AND a model element cites that source file
- WHEN the Timeline renders
- THEN it shows the upstream node, the focal node, and the citing element in order

#### Scenario: No upstream still renders focal and citations

- GIVEN a source file with no `source_file` in frontmatter
- WHEN the Timeline renders
- THEN it shows the focal node and any citing elements
- AND it does not show an empty or broken upstream node

#### Scenario: No lineage shows the empty state

- GIVEN a file with neither upstream nor citations
- WHEN the Timeline renders
- THEN the empty-state message is shown

### Requirement: Timeline nodes expose element identity

Every Timeline node MUST display its identity: the file path for file-level nodes,
and the element `id` (qualifiedId) for model-element nodes. When the element has a
`slug`, the slug MUST be displayed. When the citation carries a heading or unit
reference, the `file#heading` / `file@unit` reference MUST be displayed.

#### Scenario: Model element shows id and slug

- GIVEN a citing element with `id: "Compras/Pagos/Registrar"` and `slug: "registrar-pago"`
- WHEN the Timeline renders that element
- THEN both the id and the slug are visible on its timeline row

### Requirement: Timeline is built from an extensible chain structure

The Timeline MUST be built from an ordered data structure of chain steps that can
later be extended with additional upstream hops (recursive chaining) without
changing the Timeline rendering contract.

#### Scenario: Chain structure is the render input

- GIVEN a focal file with one upstream hop and two citations
- WHEN the Timeline render input is computed
- THEN it is an ordered list of steps, one per node, and each step carries its
  identity fields
