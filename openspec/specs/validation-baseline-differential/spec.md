# Validation Baseline Differential Specification

## Purpose

Suppress known pre-existing validation noise so that only NEW errors surface, with suppressed items counted and linked to a backlog.

## Requirements

### Requirement: Versioned Baseline File

The system MUST maintain a versioned known-errors baseline file at the proposal default path, approved solely by the maintainer on `dev` and reviewed like code. Each entry MUST identify an error by stable location, rule code, and message fingerprint.

#### Scenario: New error surfaces

- GIVEN a validation error absent from the baseline
- WHEN validation runs with the baseline present
- THEN the error appears in the main output

#### Scenario: Known error suppressed with backlog link

- GIVEN a validation error matching a baseline entry
- WHEN validation runs with the baseline present
- THEN the error is hidden from the main output
- AND the summary reports the suppressed count with a backlog link

#### Scenario: Missing baseline means full output

- GIVEN no baseline file exists
- WHEN validation runs
- THEN all errors appear in the output with no suppression

### Requirement: Baseline Entry Lifecycle

The system MUST report baseline entries matching no current error as stale without failing validation. Deleting the baseline MUST restore full output. Baseline threshold changes MUST go through maintainer approval on `dev`.

#### Scenario: Stale entry reported without failure

- GIVEN a baseline entry matching no current error
- WHEN validation runs
- THEN a stale-entry notice is reported
- AND validation still succeeds

#### Scenario: Baseline deleted restores full output

- GIVEN the baseline file was deleted
- WHEN validation runs
- THEN every error appears in the main output

### Requirement: Verify Gate Diffs the Baseline

The verification gate MUST diff validation output against the baseline and MUST fail when a NEW error appears that matches neither the baseline nor an approved update.

#### Scenario: Regression blocked by the gate

- GIVEN a run introducing an error absent from the baseline
- WHEN the verification gate runs
- THEN the gate fails naming the new error

#### Scenario: Clean run passes the gate

- GIVEN a run with zero errors outside the baseline
- WHEN the verification gate runs
- THEN the gate passes
