# Procedure Execution Specification

## Purpose

Define one documented agent protocol for discovering and running a procedure. The
agent executes by following it. Exactly one owner skill holds it; others link to
it. Out of scope: an executor tool, human gates, and run audit/resume logs.

## Requirements

### Requirement: Single Owner Protocol

The canonical procedure-execution protocol SHALL live in exactly one owner skill.
Every other skill that mentions running a procedure MUST link to the owner and MUST
NOT restate the protocol.

#### Scenario: Non-owner skill links instead of restating

- GIVEN a skill (`nn`, `nn-innfo`, or `nn-sources`) whose flow may run a procedure
- WHEN its instructions are read
- THEN the execution steps appear only as a reference to the owner skill
- AND no step-order or precedence text is duplicated

### Requirement: Procedure Discovery Sources

The agent MUST discover candidate procedures from every source: (a) `procedures:`
frontmatter of bluepriNNt specs, (b) `## NN Procedure:` sections of the active model,
and (c) `workspace/procedures/*_NN.md` files. Discovery MUST NOT require an executor
tool.

#### Scenario: Procedures found across all sources

- GIVEN a blueprint declaring `procedures:`, a model with a `## NN Procedure:` section, and a file in `workspace/procedures/`
- WHEN the agent lists available procedures
- THEN all three appear, each with a name and its source

#### Scenario: No procedures found

- GIVEN a workspace with no procedures in any source
- WHEN the agent lists available procedures
- THEN the agent MUST report that none were found and MUST NOT fabricate one

### Requirement: Name-Clash Precedence

When the same procedure name appears in more than one source, the agent MUST resolve
it by precedence: model > blueprint > domain > workspace.

#### Scenario: Model overrides workspace

- GIVEN `compile-console` in both the active model and `workspace/procedures/`
- WHEN the agent resolves the name
- THEN the model's definition MUST be selected

### Requirement: Step-Order Execution

The agent MUST run a procedure's steps in declared order. The start step is the one
not targeted by any `next::` reference; each step's `next::` references determine
the following step(s).

#### Scenario: Follow next:: chain

- GIVEN a procedure whose `Work` step has no incoming `next::` and points to `Validate` via `next::`
- WHEN the agent runs the procedure
- THEN it starts at `Work` and proceeds to `Validate`

#### Scenario: Broken reference

- GIVEN a step whose `next::` targets a non-existent step
- WHEN the agent reaches that step
- THEN the agent MUST stop and report the broken reference

### Requirement: Output Placement

Procedure outputs MUST be written to the destination the procedure declares; when
none is declared, the agent MUST ask the user before writing.

#### Scenario: Declared destination

- GIVEN a procedure step declaring an output path under `artifacts/`
- WHEN the step completes
- THEN the output MUST be written to that path

### Requirement: Delegation to Declared Skills

When a step declares an NN Tool or an embedded skill, the agent MUST delegate to that
skill rather than reimplementing it.

#### Scenario: Delegated step

- GIVEN a step whose NN Tools section references `nn-video-script`
- WHEN the agent reaches the step
- THEN it invokes that skill and continues after it returns

### Requirement: Ingestion and Lineage Owned by nn-sources

Source ingestion and lineage SHALL be owned solely by `nn-sources`. The former
`nn-trannsform` MUST be renamed to `nn-sources` across triggers, `manifest/source.yaml`,
docs pages, generated docs, and tests. No backwards-compatibility alias SHALL exist.
The protocol MUST reference ingestion as `nn-sources`.

#### Scenario: Rename applied everywhere

- GIVEN the repository after the change
- WHEN `nn-trannsform` is searched across skills, manifest, docs, and tests
- THEN none remains
- AND `nn-sources` resolves as the ingestion skill

#### Scenario: No shim

- GIVEN an installed copy named `nn-trannsform`
- WHEN the new release is installed
- THEN it installs as `nn-sources`
- AND no alias makes `nn-trannsform` resolvable
