# Delta for procedure-runner

Scope: a run addresses a procedure document, never a container element inside it; the step graph is the `Work` steps of that document, and the shipped procedure documents are migrated to the one-header structure.

## MODIFIED Requirements

### Requirement: A Run Addresses A Procedure Document

A run MUST name its procedure by the procedure document, and the runner MUST NOT accept an `<document>@<container>` address that selects a sub-tree of a document.
The step graph of a run MUST be every `Work` step of the document, and its start MUST be the one step with no incoming `next`; a document with more than one such step MUST be refused with `MULTIPLE_STARTS`.

#### Scenario: a container address is refused

- GIVEN a domaiNN with `usage_procedures_NN.md`
- WHEN a run is started with the address `usage_procedures_NN.md@define-a-frame`
- THEN the start is refused with `PROCEDURE_NOT_FOUND` and nothing is written

#### Scenario: the start is the step with no incoming next

- GIVEN a procedure document whose steps are `draft` -> `review` -> `publish`
- WHEN a run is started
- THEN the run's first step is `draft`

## ADDED Requirements

### Requirement: Shipped Procedures Use The One-Header Structure

Every procedure document shipped by a bluepriNNt, sample or fixture MUST follow the one-`Procedure`-header structure, so no shipped document declares `parent`, `procedure_model`, `executed_by` or an executor through `tool`.
A shipped document whose `Work` forest has more than one root MUST be split into one procedure document per root, and each of the new documents MUST be addressable and listed in the catalog.

#### Scenario: a multi-root document is split

- GIVEN a shipped document whose `Work` forest has six roots
- WHEN it is migrated
- THEN six procedure documents exist, each with one `Procedure` header, and the catalog lists all six
