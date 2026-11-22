# Delta for executions

A procedure says what should happen; nothing records what did happen in one run. Runs cannot live in the `procedures` bluepriNNt: every model of it has the role `catalog` or `procedure` (`roleOf`), so a run would be loaded as a procedure definition and would not be discovered as kNNowledge. This change adds the Core bluepriNNt `executions`, built on the concept write policy and the closing event.

## ADDED Requirements

### Requirement: The executions bluepriNNt records runs as append-only logs

The bluepriNNt `executions` MUST declare `Procedure Execution` as a distributed concept placed at `executions/{slug}/`, with the header fields `procedure` (address), `def_rev` and `params`, and `Execution Event` as its child concept with `write_policy:: append-only` and the fields `kind`, `step`, `field`, `value`, `actor` and `at`.
`kind` MUST offer `started`, `step_started`, `step_completed`, `input_recorded`, `artifact_produced`, `interrupted`, `resumed`, `completed`, `failed` and `cancelled`.
The bluepriNNt MUST compose against iNNfo V_0-8-0 with no diagnostic.

#### Scenario: A run is recorded, then frozen
- GIVEN a domaiNN with the `executions` bluepriNNt and no run yet
- WHEN a run is created, events are added and filled, and the run is closed with `close_model`
- THEN the run lives under `executions/<slug>/`
- AND changing a value an event already holds is rejected with `WRITE_POLICY_DENIED`
- AND removing the run is rejected with `WRITE_POLICY_DENIED`
- AND adding an event after the closure is rejected with `MODEL_CLOSED`

### Requirement: executions is a Core bluepriNNt

`executions` MUST be classified `core` in the bluepriNNt catalog, MUST be declared in `manifest/source.yaml` so it is always installed, and MUST be embedded in the canonical registry so it resolves offline.

#### Scenario: The catalog marks it core
- GIVEN the generated `catalog.json`
- WHEN the `executions` entry is read
- THEN its tier is `core`

### Requirement: The first instance of a distributed concept is placed by its declaration

When an `add_model` change creates an instance of a concept its bluepriNNt declares distributed, `apply_change` MUST place it by that declaration even when no model of the domaiNN uses the bluepriNNt yet. (Previously: the first instance of a bluepriNNt no model used was created as a compact model under `kNNowledge/`.)

#### Scenario: The first run of a domaiNN
- GIVEN a domaiNN where no model uses `executions`
- WHEN an `add_model` of a `Procedure Execution` named `onboard-acme` is applied
- THEN the model is written under `executions/onboard-acme/`

### Requirement: Only a closed model is citable as evidence

A change MAY cite a model as evidence only by its id, as `<model id>@<element>`, and `apply_change` and `propose_changeset` MUST accept such a citation only when the model exists, holds the element and is closed (`closed: true`, set by `close_model`). Citing an open model MUST be reported as `CITATION_NOT_CLOSED`, and a missing model or element as `CITATION_UNRESOLVED`. For an accepted citation, `evidence_sha256` MUST record the sha256 of the model file. (Previously: a model id citation never resolved and was reported as `CITATION_UNRESOLVED`.)

#### Scenario: A computed value cites the run that computed it
- GIVEN a run `onboard-acme` with an event `e-001`
- WHEN a change cites `onboard-acme@e-001` while the run is open
- THEN it is rejected with `CITATION_NOT_CLOSED`
- AND once the run is closed with `close_model`, the same citation is accepted and its file hash is recorded in `evidence_sha256`

### Requirement: The changes bluepriNNt documents the origins of a value

The changes bluepriNNt MUST document that evidence always points outside the living knowledge graph and MUST list the origins of a value: a person's decision, an AI agent's decision or proposal, a conversation, an external document, a run of a procedure, a computed value (the closed run that computed it) and an unknown origin.

#### Scenario: The origins are listed
- GIVEN the changes bluepriNNt
- WHEN its specification is read
- THEN it lists the seven origins and the closed-model citation rule
