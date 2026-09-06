# Template Immutability Guard

## Purpose

Enforce immutability of versioned iNNfo templates (`iNNfo/specs/templates/*_V_*.md`). A zero-dependency Node script (`scripts/guard-template-immutability.js`) errors on in-place modification (`M`) of a versioned template, cross-checks the frontmatter `template_version` against the filename version for added (`A`) templates, permits renames and deletions, supports fixture-driven runs without a real git repository, and is wired into `scripts/verify.js` as a verification step.

## Requirements

### Requirement: In-place modification of versioned templates is an error

A zero-dependency Node script `scripts/guard-template-immutability.js` MUST
detect in-place mutation of versioned templates: for any
`iNNfo/specs/templates/*_V_*.md` file whose git status is `M` (modified, not
renamed) relative to `HEAD`, the guard MUST report an error with a clear
remediation message stating that a content change to a versioned template MUST
be delivered as a `template_version` bump plus a new versioned filename.

#### Scenario: Modified versioned template fails the guard

- GIVEN `iNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md` has git status `M` relative to `HEAD`
- WHEN `guard-template-immutability.js` runs
- THEN it exits 1 with an error naming the file and the bump-and-rename remediation

---

### Requirement: Added templates must declare a matching template_version

For ADDED versioned template files (git status `A`), the guard MUST verify that
the frontmatter `template_version` matches the version embedded in the
filename. A mismatch MUST be reported as an error.

#### Scenario: template_version mismatch on an added template

- GIVEN a newly added `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md`
- AND its frontmatter declares `template_version: V_0-2-0`
- WHEN the guard runs
- THEN it exits 1 and reports the mismatch

#### Scenario: Matching template_version on an added template

- GIVEN a newly added `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md`
- AND its frontmatter declares `template_version: V_0-3-0`
- WHEN the guard runs
- THEN no error is reported for that file

---

### Requirement: Renames are not treated as errors

Renames (git status `R`) of versioned template files MUST NOT be reported as
errors, because renaming implies a version change.

#### Scenario: Renamed versioned template passes

- GIVEN a versioned template whose git status is `R`
- WHEN the guard runs
- THEN no error is reported for that file

---

### Requirement: Guard is runnable without a real git repository

The guard MUST accept a `--diff-file <path>` option reading a fixture file with
lines in `git diff --name-status` format (`<STATUS>\t<path>`). When the option
is absent, it MUST default to running `git diff --name-status HEAD`.

#### Scenario: Fixture-driven run without git

- GIVEN a `--diff-file` fixture listing `M\tiNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md`
- WHEN the guard runs with that option in a plain-Node test
- THEN it evaluates the fixture and exits 1 without invoking git

---

### Requirement: Guard exit codes

The guard MUST exit 0 when no versioned template file is modified or added
incorrectly, and MUST exit 1 otherwise.

#### Scenario: Clean diff exits zero

- GIVEN no versioned template is `M` or a mismatched `A`
- WHEN the guard runs
- THEN it exits 0

---

### Requirement: verify.js includes the immutability guard

`scripts/verify.js` MUST include the immutability guard as a verification step.

#### Scenario: verify runs the guard

- GIVEN `scripts/verify.js` runs
- THEN `guard-template-immutability.js` executes as one of its verification steps