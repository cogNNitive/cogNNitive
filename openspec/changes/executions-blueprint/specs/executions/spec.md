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
