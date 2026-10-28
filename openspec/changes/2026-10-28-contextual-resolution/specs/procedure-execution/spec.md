# Delta for procedure-execution

Scope: name-clash precedence becomes a rule implemented in code over the scope chain, and
a shadowed procedure is reported instead of dropped.

## MODIFIED Requirements

### Requirement: Name-Clash Precedence

When the same procedure name appears in more than one source, procedure resolution MUST
apply this precedence, implemented in code and not only in prose: model, then the scope
chain from the nearest scope outward to the domaiNN root, then the bluepriNNt. Procedures
from `workspace/procedures/*_NN.md` belong to the domaiNN root scope. A procedure that
loses a name clash MUST NOT be dropped silently: it MUST be reported as shadowed, naming
the winning source. Resolution MUST be deterministic for a given workspace state.
(Previously: the agent resolved name clashes by prose precedence model > blueprint >
domain > workspace; the implementation kept the first procedure seen by id and discarded
the others without a report.)

#### Scenario: Model overrides workspace

- GIVEN `compile-console` in both the active model and `workspace/procedures/`
- WHEN procedure resolution runs
- THEN the model's definition MUST be selected
- AND the `workspace/procedures/` definition is reported as shadowed by the model

#### Scenario: Nearest scope wins over farther scope and bluepriNNt

- GIVEN `status-report` defined in the bluepriNNt, in the domaiNN root, and in program scope `alpha`
- WHEN procedures are resolved for a document in `alpha`
- THEN the `alpha` definition is selected
- AND the root and bluepriNNt definitions are each reported as shadowed

#### Scenario: Scope procedure outranks the bluepriNNt

- GIVEN `status-report` in the domaiNN root and in the bluepriNNt only
- WHEN procedures are resolved for a document in the root
- THEN the root definition is selected and the bluepriNNt definition is reported as shadowed

#### Scenario: No silent drop

- GIVEN any set of sources with clashing names
- WHEN the full procedure list is requested
- THEN every procedure found in any source appears either as selected or as shadowed
- AND the number of selected plus shadowed entries equals the number of procedures discovered

## ADDED Requirements

### Requirement: Scope-Aware Resolution Context

Procedure discovery MUST take the document or scope the agent is working in as its
context, and MUST include procedures defined in every scope of that context's chain.
Procedures defined in a sibling scope or in a scope below the context MUST NOT be offered.

#### Scenario: Sibling procedures are not visible

- GIVEN `alpha` defines `alpha-only` and `beta` defines `beta-only`
- WHEN procedures are listed for a document in `alpha`
- THEN `alpha-only` is listed and `beta-only` is not

## Out of scope

An executor tool, human gates and run audit logs remain out of scope as before. Per-scope
aggregation of procedure catalogs is deferred. See the proposal's Deferred table
(`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
