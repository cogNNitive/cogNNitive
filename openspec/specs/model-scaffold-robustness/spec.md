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
