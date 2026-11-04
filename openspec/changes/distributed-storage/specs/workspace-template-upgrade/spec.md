# Delta for workspace-template-upgrade

Living spec read: `openspec/specs/workspace-template-upgrade/spec.md`. Unchanged: the template catalog, the Tier-3 per-model detection scan and its classification (`current`, `upgrade-available`, `ahead`, `unlisted`), the Flow B steps (detect, consent, backup, impact analysis, migrate, confirm), and "Migration never deletes user data". Added: the upgrade unit becomes the concept, not the single model (decision 4: one bluepriNNt version per concept across the domaiNN). Related: `version-uniformity-check`.

## ADDED Requirements

### Requirement: A concept is upgraded for every instance or for none

`nn-upgrade` Flow B MUST treat all models that hold instances of a concept (every instance model of a distributed concept, and every model holding the concept as elements) as one upgrade unit. It MUST repoint and re-validate every such model, or none. It MUST NOT leave a domaiNN with a concept pinned to two versions at the end of the flow. Consent, backup and impact analysis apply to the unit as a whole.

#### Scenario: All Video instances move together
- GIVEN 24 Video instance models pinning `video-script_V_0-14-1` and an adopted version `V_0-15-0`
- WHEN the user accepts the upgrade
- THEN all 24 models are repointed to `V_0-15-0` and re-validated
- AND `check_domain` reports no version skew

#### Scenario: One instance fails validation
- GIVEN the same upgrade where instance `innteresante/intro` fails re-validation against `V_0-15-0`
- WHEN the migrate step runs
- THEN no instance is left repointed: all 24 models are restored from the pre-migration state
- AND the report names `innteresante/intro` and the failure

#### Scenario: Consent covers the unit
- GIVEN a concept with 24 instances classified `upgrade-available`
- WHEN the flow presents `[a] Upgrade / [b] Continue`
- THEN the prompt states the number of models in the unit
- AND no file is written until `[a]` is chosen

### Requirement: Mapping questions are asked once per concept

When the impact analysis finds a removed, renamed or re-typed Concept, Field or Matrix that instances use, the mapping question MUST be asked once for the concept and the answer applied to every instance. No question MAY be asked per instance.

#### Scenario: Renamed field asked once
- GIVEN a field renamed between versions and used by 24 instances
- WHEN the impact analysis runs
- THEN exactly one mapping question is asked
- AND the answer is applied to all 24 instances

### Requirement: A pre-existing skew blocks a partial upgrade

When a concept is already skewed, the flow MUST report the skew first and MUST upgrade the whole unit to the adopted version, never only the instances on a particular version.

#### Scenario: Already skewed
- GIVEN Video instances pinning `V_0-13-6` and `V_0-14-1`
- WHEN the flow detects
- THEN the skew is reported
- AND, if accepted, every instance ends on the adopted version
