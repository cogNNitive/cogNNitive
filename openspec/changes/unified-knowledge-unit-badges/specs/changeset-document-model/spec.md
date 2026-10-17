# Delta for Changeset Document Model

## MODIFIED Requirements

### Requirement: Changeset Mutation and Comment Operations

Each change in a changeset document MUST be represented as an element heading `## NN Change: <id>` conforming to the `changes` blueprint concept `Change`. Each change MUST specify an `op` property.

The target format (`target::`) for content operations MUST equal the canonical unit address defined by `knowledge-unit-address`:
1. `update_field`: Mutates a field on an existing element. `target` is `<model_slug>@<element_slug>&<field_name>`, matching the canonical own value address.
2. `update_concept_field`: Mutates a concept-level field. `target` is `<model_slug>@concept:<concept_slug>&<field_name>`, matching the canonical concept value address.
3. `add_element`: Adds a new element to a concept in a model. `target` is `<model_slug>`.
4. `remove_element`: Removes an element. `target` is `<model_slug>@<element_slug>`.
5. `rename_element`: Renames an element's display name. `target` is `<model_slug>@<element_slug>`.
6. `rename_concept`: Renames a concept's display name. `target` is `<model_slug>@concept:<concept_slug>`.
7. `update_matrix_cell`: Updates or inserts a cell in a matrix. `target` is `<model_slug>@<matrix_slug>&<row_slug>&<col_slug>`, matching the canonical matrix cell address.
8. `comment`: Represents review feedback or discussion annotations. `target` MAY be any valid canonical unit address (including structure definitions, sections, elements, values, cells, or Sources).
9. `add_model`: Creates a new Level-3 kNNowledge document. `target` is `<model_slug>`.

(Previously: target addresses used informal descriptions, and matrix cells permitted legacy parameter syntax.)

#### Scenario: Element and value targets equal canonical addresses
- GIVEN a changeset with `op:: update_field`
- WHEN targeted at field `"vision"` of element `"statement"` in model `"strategy"`
- THEN `target` is `"strategy@statement&vision"`
- AND this string equals `unitAddress.value("strategy@statement", "vision")`

#### Scenario: Matrix cell target equals canonical cell address
- GIVEN a changeset with `op:: update_matrix_cell`
- WHEN targeted at matrix `"swot"`, row `"r1"`, column `"c1"` in model `"strategy"`
- THEN `target` is `"strategy@swot&r1&c1"`
- AND this string equals `unitAddress.cell("strategy", "swot", "r1", "c1")`

#### Scenario: Comment target accepts structure definition
- GIVEN a review comment on field definition `"owner"` of concept `"Goal"` in blueprint `"business"`
- WHEN the comment draft is serialized
- THEN `target` is `"specs/business@concept:goal&owner"`
- AND `op` is `"comment"`
