# Model Scaffold Robustness Specification

## Purpose

Trustworthy scaffold output: matching frontmatter versions, BOM-safe validation, one write path, explicit procedures blocks.
## Requirements
### Requirement: Version-Aware Frontmatter Inference

The scaffold (the shared `scaffoldKnowledgeDocument`, used by `add_model` and therefore by `init_knowledge`) MUST set `knowledge_version` to the explicit value when one is provided, else to the resolved parent bluepriNNt `blueprint_version` (or `spec_version` when it declares none), else to `V_0-1-0`. An explicit value that differs from the parent version MUST be accepted: `knowledge_version` is decoupled from the parent version (see `knowledge-version-and-snapshot`), and no `VERSION_MISMATCH` refusal exists. (Previously: required refusing a differing version, which contradicted the decoupling requirement and was never implemented.)

#### Scenario: Version inferred

- GIVEN a parent bluepriNNt at a minor version, no override
- WHEN the scaffold runs
- THEN frontmatter carries that same version

#### Scenario: Override wins

- GIVEN an explicit version override
- WHEN the scaffold runs
- THEN frontmatter carries the override version

#### Scenario: Differing override accepted

- GIVEN an explicit version that differs from the parent version
- WHEN the scaffold runs
- THEN frontmatter carries the explicit version and no `VERSION_MISMATCH` error is raised

### Requirement: BOM Tolerance with Warning

The validator MUST strip a leading byte-order mark before parsing, MUST parse the stripped content normally, and MUST emit a non-blocking warning. A BOM MUST NEVER cause a hard error.

#### Scenario: BOM warns

- GIVEN a model file starting with a BOM
- WHEN validation runs
- THEN parsing succeeds on stripped content with a BOM warning

#### Scenario: No BOM, no warning

- GIVEN a model file without a BOM
- WHEN validation runs
- THEN no BOM warning is emitted

### Requirement: Canonical Markdown Write Path

Skill-driven `.md` writes MUST go through a single canonical write command defined by the skills. The command MUST preserve encoding and trailing newlines so files validate cleanly.

#### Scenario: Clean validation

- GIVEN content written via the canonical command
- WHEN validation runs on the file
- THEN no encoding or line-joining diagnostics appear

#### Scenario: Accents preserved

- GIVEN content with accented characters
- WHEN written via the canonical command
- THEN the characters round-trip byte-identical

### Requirement: Explicit Procedures Block per Template

Every template MUST declare a procedures block even when empty. The declaration MUST be explicit — an empty block present on the template — rather than implied by discovery yielding no procedures. The creation wizard MUST announce an empty block instead of silently presenting a template with nothing executable.

(Previously: required a procedures block but did not pin the explicit empty declaration.)

#### Scenario: Empty block declared

- GIVEN a template with no executable procedures
- WHEN the template is inspected
- THEN an explicit empty procedures block is present

#### Scenario: Discovery agrees with the declared block

- GIVEN a template carrying an explicit empty procedures block
- WHEN procedures are discovered dynamically
- THEN discovery yields an empty set consistent with the declaration

#### Scenario: Wizard announces it

- GIVEN a template with an empty procedures block
- WHEN the wizard presents the template
- THEN it announces that no executable procedures exist

### Requirement: Scaffold Validity by Construction

The scaffold generator MUST produce content that validates cleanly against its own resolved template on the first attempt. For a `type:: reference` field with no concrete target available at scaffold time, the generator MUST omit the placeholder rather than emit an unsatisfiable dangling wikilink. For a `type:: text` concept that requires element markers, the generator MUST emit at least one `## NN Concept: Element` marker per such concept.

#### Scenario: Reference field with no target omits placeholder

- GIVEN a template field of `type:: reference` with no concrete target resolvable at scaffold time
- WHEN the scaffold body is generated
- THEN the field's placeholder value is omitted rather than emitting `[[Target Element]]`

#### Scenario: Markered concept receives a real element marker

- GIVEN a template concept of `type:: text` that requires element markers
- WHEN the scaffold body is generated
- THEN the concept includes at least one `## NN Concept: Element` marker

#### Scenario: business and blank templates scaffold clean on first attempt

- GIVEN the `business` or `blank` template
- WHEN `init_model` scaffolds a new document
- THEN the generated content validates against its own template with no "No NN element markers found" diagnostic

### Requirement: Failed Init Never Returns a Success-Shaped Payload

When `init_knowledge` fails — the `add_model` change is rejected or conflicted, or the created document fails validation — the tool response MUST NOT include `filePath` or `content` fields, and `success` MUST be `false`. A caller MUST be able to distinguish "persisted" from "not persisted" by response shape alone, without relying solely on the `success` flag. (Previously: stated for `initModel()` pre-write validation only.)

#### Scenario: Validation failure omits filePath and content

- GIVEN scaffold validation fails during the apply of the `add_model` change
- WHEN `init_knowledge` returns
- THEN the response has `success: false` and no `filePath` or `content` field

#### Scenario: Existing model omits filePath and content

- GIVEN the target model already exists
- WHEN `init_knowledge` returns
- THEN the response has `success: false`, a `MODEL_EXISTS` error, and no `filePath` or `content` field

#### Scenario: Successful init returns filePath and content

- GIVEN the `add_model` change applies and the file is written
- WHEN `init_knowledge` returns
- THEN the response has `success: true`, `filePath`, `content` and `changeset`

### Requirement: Scaffold Emits No Marker Constructs

`init_knowledge` and the scaffold generator MUST NOT seed an `item-markers matrix`, a `Markers` concept or any marker row, whatever the bluepriNNt declares. A scaffolded document MUST validate against its own resolved bluepriNNt on the first attempt with no `MARKERS_REMOVED`. For a bluepriNNt that declares a `tags` Field, the scaffold MUST NOT emit a placeholder `tags` value; concept-level values are emitted only when the author supplied them.

#### Scenario: No item-markers matrix is seeded
- GIVEN a bluepriNNt that declares a multi-valued `tags` Field and a valued `complexity` Field
- WHEN `init_knowledge` scaffolds a new document
- THEN the content has no `item-markers matrix` and no marker row
- AND it validates with no `MARKERS_REMOVED`

#### Scenario: No placeholder tags
- GIVEN the same bluepriNNt
- WHEN the document is scaffolded
- THEN no element carries a placeholder `tags::` line

