# samples-version-coherence Specification

## Purpose
TBD - created by archiving change 2026-10-04-samples-version-coherence-guard. Update Purpose after archive.
## Requirements
### Requirement: Sample Pins Track Shipped Blueprint Versions

Every Level 3 sample listed in `SAMPLE_MAPPINGS` MUST declare a pinned blueprint
version, and that pin MUST NOT lag the shipped blueprint's `blueprint_version`
unless a sibling sample for the same blueprint already tracks the current version.

The authoritative version source is the shipped spec
`iNNfo/specs/bluepriNNts/<blueprint>/spec_NN.md` field `blueprint_version`. The
guard MUST NOT read the global user cache under `~/.agents/bluepriNNts/`, which
diverges from the shipped specs and is unavailable to an offline, deterministic
`verify.js`.

#### Scenario: Sample pinned to the current blueprint version
- GIVEN a blueprint whose shipped spec declares `blueprint_version: "V_0-4-0"`
- AND a sample in `SAMPLE_MAPPINGS` pinning `parent_spec.name: "<bp>_V_0-4-0"`
- WHEN the guard runs
- THEN the sample is reported coherent and the guard does not fail on its account.

#### Scenario: Blueprint advanced but no sample follows
- GIVEN a blueprint whose shipped spec declares `blueprint_version: "V_0-4-0"`
- AND the only sample for that blueprint pins `V_0-2-3`
- WHEN the guard runs
- THEN the guard FAILS with `STALE_PIN` for that sample
- AND the guard FAILS with `NO_CURRENT_SAMPLE` for that blueprint.

#### Scenario: Historical sample retained beside a current one
- GIVEN a blueprint at `blueprint_version: "V_0-4-0"`
- AND two samples: one pinned `V_0-1-0` (historical) and one pinned `V_0-4-0`
- WHEN the guard runs
- THEN both samples are accepted and the guard does not fail.

---

### Requirement: The Guard Fails, It Does Not Auto-Fix

The version-coherence guard MUST report drift and exit non-zero. It MUST NOT
rename, rewrite, or regenerate any sample. A blueprint version bump changes a
sample's schema and content, not only its version number; an automatic rename
would produce an updated filename over an obsolete body.

#### Scenario: Drift is reported, not repaired
- GIVEN a stale sample pin
- WHEN the guard runs
- THEN it exits non-zero and prints the offending sample and versions
- AND no file on disk is modified.

---

### Requirement: Malformed Pins Are Reported

A sample whose `parent_spec.name` (or `knowledge_version`) MUST be reported as
`MALFORMED_PIN` when it carries no parseable `V_<major>-<minor>-<patch>` version.
A versionless pin MUST NOT be silently skipped.

#### Scenario: Versionless parent spec name
- GIVEN a sample pinning `parent_spec.name: "video"` (no version)
- WHEN the guard runs
- THEN the guard FAILS with `MALFORMED_PIN` for that sample.

---

### Requirement: Template Sample Coherence

A Level 2 template package's `samples/` directory MUST contain at least one
sample pinned to the blueprint's current `blueprint_version` (extending the
existing `template-package-structure` contract). Additional historical samples
MAY remain, provided the current-version tracker exists.

#### Scenario: Package has only historical samples
- GIVEN a template package with samples at `V_0-1-0` and `V_0-2-3`
- AND the blueprint is at `V_0-4-0`
- WHEN the guard runs
- THEN the package FAILS with `NO_CURRENT_SAMPLE`.

#### Scenario: Package has a current tracker
- GIVEN the same package with an added sample pinned `V_0-4-0`
- WHEN the guard runs
- THEN the package is accepted.

