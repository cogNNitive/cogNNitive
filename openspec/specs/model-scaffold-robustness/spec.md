# Model Scaffold Robustness Specification

## Purpose

Trustworthy scaffold output: matching frontmatter versions, BOM-safe validation, one write path, explicit procedures blocks.

## Requirements

### Requirement: Version-Aware Frontmatter Inference

The scaffold MUST infer the frontmatter version from the resolved parent spec. An explicit override MUST win when provided. The scaffold MUST NEVER emit a differing version.

#### Scenario: Version inferred

- GIVEN a parent spec at a minor version, no override
- WHEN the scaffold runs
- THEN frontmatter carries that same version

#### Scenario: Override wins

- GIVEN an explicit version override
- WHEN the scaffold runs
- THEN frontmatter carries the override version

#### Scenario: Mismatch refused

- GIVEN options that would emit a differing version
- WHEN the scaffold runs
- THEN it refuses with a version-mismatch error

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

When `initModel()`'s pre-write validation fails, the tool response MUST NOT include `filePath` or `content` fields, and `success` MUST be `false`. A caller MUST be able to distinguish "persisted" from "not persisted" by response shape alone, without relying solely on the `success` flag.

#### Scenario: Validation failure omits filePath and content

- GIVEN scaffold validation fails before the write
- WHEN `initModel()` returns
- THEN the response has `success: false` and no `filePath` or `content` field

#### Scenario: Successful init returns filePath and content

- GIVEN scaffold validation passes and the file is written
- WHEN `initModel()` returns
- THEN the response has `success: true`, `filePath`, and `content`
