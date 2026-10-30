# Delta for console-payload-builder

Scope: the payload exposes the link between a procedure's catalog entry (`Procedure`) and
its executable workflow (root `Work`), so console views join the two tiers by key instead
of matching names or paths.

## ADDED Requirements

### Requirement: Procedure Catalog Link Is Emitted

The payload MUST emit the link between a `Procedure` and its executable workflow as a
relation. For every `Procedure` element whose document declares a `procedure_model::`
value, the payload MUST emit a `relation` (`field: "procedure_model"`) whose target is the
root `Work` element of the named model, resolved per document. When the target cannot be
resolved, the payload MUST NOT emit a dangling relation and MUST NOT fail the build; the
view reports the missing link per `innfo-console-runtime` "Procedure Tab Shows The Catalog
Entry".

The `Procedure` concept MUST declare `procedure_model` as a `reference` field
(`target_concepts:: [Work]`), so the relation is model-legal and survives validation.

#### Scenario: Relation emitted

- GIVEN a document with a `Procedure` whose `procedure_model::` names a model that holds a root `Work`
- WHEN the payload is built
- THEN the `Procedure` element carries a `procedure_model` relation targeting that root `Work`'s id

#### Scenario: Unresolved link is omitted, not dangling

- GIVEN a `Procedure` whose `procedure_model::` names a model with no root `Work`
- WHEN the payload is built
- THEN no `procedure_model` relation is emitted for it
- AND the build succeeds

#### Scenario: No name-convention join is required

- GIVEN a `Procedure` named `Generate Cosicah Video` and its root `Work` named `Generate Cosicah Video Workflow`
- WHEN a view joins the catalog with the execution tree
- THEN it uses the emitted relation, not the name similarity between the two elements
