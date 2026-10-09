# Delta for router-governance

## ADDED Requirements

### Requirement: Procedure Routing and Precedence

The `nn` front controller MUST route any intent to run a procedure to the
procedure-execution owner skill, and MUST resolve procedure names by precedence
model > blueprint > domain > workspace. `nn` MUST NOT contain the execution steps
itself.

#### Scenario: Intent routed to the owner

- GIVEN a user asks `nn` to run a procedure
- WHEN `nn` handles the intent
- THEN `nn` activates the owner skill's procedure-execution protocol
- AND does not execute steps from its own text

#### Scenario: Precedence applied at routing

- GIVEN a procedure name present in both the active model and the domain blueprint
- WHEN `nn` routes the intent
- THEN the model definition takes precedence

#### Scenario: Ambiguous name across all sources

- GIVEN the same procedure name in model, blueprint, domain, and `workspace/procedures/`
- WHEN `nn` resolves it
- THEN the model definition MUST be selected

#### Scenario: No procedure found

- GIVEN an intent naming a procedure that no source declares
- WHEN `nn` attempts to resolve it
- THEN `nn` MUST report that the procedure is unknown and MUST NOT invent one
