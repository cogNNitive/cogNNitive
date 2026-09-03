# Delta for procedures-template

Modifies the Procedures template to decouple organizational concepts, focusing purely on workflow RACI mapping.

## MODIFIED Requirements

### R-PRC-01: Stripped Procedures Schema
The system MUST remove `Person` and `Position` concepts, and `positions-roles` and `persons-positions` matrices, from the `Procedures` template (`procedures_NN.md` and versioned equivalent).

#### Scenario: Modified Procedures model validation
- GIVEN a Procedures template instance
- WHEN validation is performed
- THEN the schema MUST NOT contain `Person`, `Position`, `positions-roles`, or `persons-positions` declarations

### R-PRC-02: Starter Model Updates
The starter models (`Procedures_V_1-0-0_starter_NN.md` in app starter directories) MUST be updated to reference `procedures_V_0-2-0` parent spec and remove any `Person` and `Position` instances or matrices.

#### Scenario: Starter model validation
- GIVEN the updated Procedures starter model
- WHEN loaded by the app or validator
- THEN it MUST load successfully using the simplified template and contain no references to the removed concepts
