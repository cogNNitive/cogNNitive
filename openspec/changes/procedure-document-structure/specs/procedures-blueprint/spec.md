# Delta for procedures-blueprint

Scope: one procedure document holds exactly one `Procedure` element, which is the procedure's header, with its `Work` steps nested under it through the Level 1 parentage primitive; the custom containment and catalog-link fields are removed, and the actor is split between how a step runs and who answers for it.

## ADDED Requirements

### Requirement: A Procedure Document Holds One Procedure Header

A procedure document MUST declare exactly one `Procedure` element, and that element is the procedure's header: its `summary`, `category`, `inputs_required` and `outputs_expected` describe the procedure, and its body documents it.
The bluepriNNt's `# NN index` MUST declare `Work` as a direct child of `Procedure`, and every `Work` element of a procedure document MUST be nested under the `Procedure` element with a hierarchical heading (`### NN Work: <name>` under `## NN Procedure: <name>`), so its parent is assigned by the Level 1 parser and never by a field.
Validation MUST reject a procedure document with zero or with more than one `Procedure` element, and MUST reject a `Work` element that is not nested under the document's `Procedure`.
The procedure catalog MUST be derived from the `Procedure` header of every procedure document and MUST NOT be a hand-written document.

#### Scenario: a well-formed procedure document

- GIVEN `review_procedures_NN.md` with one `## NN Procedure: Review a Draft` and three `### NN Work:` headings under it
- WHEN the document is validated
- THEN it is valid, and each of the three steps has the procedure as its parent without declaring any field for it

#### Scenario: two headers in one document

- GIVEN a document with `## NN Procedure: A` and `## NN Procedure: B`
- WHEN the document is validated
- THEN validation reports that a procedure document holds exactly one `Procedure` element

#### Scenario: the catalog is derived

- GIVEN two procedure documents, each with its `Procedure` header carrying a `summary`
- WHEN the procedure catalog is listed
- THEN it shows both procedures with their `summary`, and no catalog document exists on disk

### Requirement: A Procedure Without Steps Is Declared

A `Procedure` element with no nested `Work` MUST be valid and MUST be listed in the catalog as a declared procedure.
Starting a run of a declared procedure MUST be refused with `PROCEDURE_NOT_IMPLEMENTED`, and the refusal MUST write nothing.

#### Scenario: a declared procedure

- GIVEN `rfp_procedures_NN.md` with one `Procedure` element and no `Work`
- WHEN a run of it is started
- THEN the start is refused with `PROCEDURE_NOT_IMPLEMENTED` and no execution instance is created

### Requirement: A Skill-Backed Procedure Is A Step That Uses The Skill

A procedure that an agent skill carries out MUST be modeled as a `Procedure` with one `Work` step whose `executor` is `agent` and whose `tool` references the skill as a `Tools` element; no field of `Procedure` links to a skill file.

#### Scenario: a skill-backed procedure

- GIVEN the procedure "Triage an Issue" carried out by the `nn-dev-issue-tracking` skill
- WHEN it is modeled
- THEN it has one `Work` step with `executor:: agent` and `tool::` naming the `Tools` element for that skill

## MODIFIED Requirements

### Requirement: Executor Says How A Step Runs

`executor` MUST be the only field that says how a step runs, with the values `human`, `agent` and `engine`, and a step that declares no `executor` MUST be performed by an agent; that default MUST be defined in one place.
`tool` MUST NOT be read as an executor: `tool` references the `Tools` element a step uses and nothing else.
Who answers for a step MUST be expressed by the `work-roles matrix` (Responsible, Accountable, Consulted, Informed), and a consumer MUST resolve a matrix row to its step the way the procedure graph resolves a reference: by slug first, then by element name.

#### Scenario: a step with a console tool and no executor

- GIVEN a `Work` step with `tool:: console` and no `executor`
- WHEN the procedure graph is built
- THEN the step's executor is `agent`, and `console` is resolved only as a `Tools` reference

### Requirement: Step Body Prose Mood

The body of the `Procedure` element MUST document the procedure in the third person and state what it covers, what it does not cover and what triggers it; the body of a `Work` step MUST open with the verb the actor performs, in the imperative.

#### Scenario: the header documents, the step instructs

- GIVEN a procedure document
- WHEN its bodies are read
- THEN the `Procedure` body describes the procedure, and each `Work` body opens with an imperative verb

## REMOVED Requirements

### Requirement: Work Parent Field

The `parent` field of `Work` is removed: containment is the Level 1 parentage of a `Work` nested under the document's `Procedure`, and a root `Work` no longer represents the procedure.

### Requirement: Procedure Model Link

The `procedure_model` field of `Procedure` is removed: the `Procedure` element lives in the document that defines its steps, so it never points at another document.

### Requirement: Executed By

The `executed_by` field of `Procedure` is removed: how a step runs is `executor`, who answers for it is the `work-roles matrix`, and who performed an attempt is recorded by the run as the author of that attempt's changeset.

### Requirement: Tool Aliases For The Executor

The reading of `tool:: engine`, `tool:: agent`, `tool:: human` and `tool:: console` as an executor is removed.
