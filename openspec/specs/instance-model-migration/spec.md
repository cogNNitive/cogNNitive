# instance-model-migration Specification

## Purpose

A recorded operation converts the instances of a concept from compact to distributed storage: each element of a compact model becomes an instance model at its placement path. The operation is recorded so drift detection does not fire on the moved units and strict replay reproduces the result. This change ships the operation as a tool; migrating the existing domaiNNs (`video_NN`, `LC_programas`) is out of scope and happens in a later change. The reverse direction (distributed to compact) is not specified.

How the operation is named, parameterized and recorded is a design decision.

Audit fact: `checkProvenance` reports `EDITED_WITHOUT_RECORD` and `UNIT_WITHOUT_RECORD` for units that moved between files without a record; the migration operation exists to prevent exactly those reports.

## Requirements

### Requirement: Compact instances become instance models

For a concept declared distributed, the migration MUST create one instance model per selected element of a compact model, at the placement path derived from the element's slug and its container. The instance model MUST carry the element's own fields, its descendant elements (for a Video: Scenes and Layers) with their existing slugs, and its citations, unchanged in value.

#### Scenario: Registry of two Videos becomes two instance models
- GIVEN a compact model `InnteresanteVideos` holding Videos `intro` and `nuevo` in series `innteresante`
- WHEN the migration runs for the `Video` concept
- THEN `series/innteresante/assets/intro/` and `series/innteresante/assets/nuevo/` hold instance models with ids `innteresante/intro` and `innteresante/nuevo`
- AND each Scene keeps its slug, for example `innteresante/intro@00-gancho`
- AND each field value and `sources` citation is equal to the registry element's

#### Scenario: Source elements are removed
- GIVEN the same migration
- WHEN it completes
- THEN `InnteresanteVideos` no longer holds `intro` or `nuevo`
- AND placement validation reports no double storage

### Requirement: The migration is recorded and drift-free

The operation MUST be recorded in the changeset chain so that `check_domain` reports neither `EDITED_WITHOUT_RECORD` nor `UNIT_WITHOUT_RECORD` for the moved units, and strict replay from the recorded creation of the registry through the migration reproduces both the instance models and the reduced registry.

#### Scenario: No drift after migration
- GIVEN a registry whose Videos were created through recorded changes, then migrated
- WHEN `check_domain` runs
- THEN no drift diagnostic is reported for the moved units

#### Scenario: Strict replay across the migration
- GIVEN the same history
- WHEN strict provenance checking runs
- THEN the instance models and the reduced registry both match their replay

#### Scenario: The same move done by hand
- GIVEN the same layout produced by cutting and pasting files without the operation
- WHEN `check_domain` runs
- THEN drift diagnostics are reported, as they are today

### Requirement: Addresses recorded for the old location still resolve

Targets recorded before the migration for `InnteresanteVideos@intro` (and its descendants) MUST resolve to `innteresante/intro` (and its descendants) afterwards, without editing sealed proposals.

#### Scenario: Old element target
- GIVEN an applied change targeting `InnteresanteVideos@intro&status`
- WHEN the migration has run and `check_domain` runs
- THEN the target resolves to `innteresante/intro` and no drift is reported

### Requirement: The migration is all or nothing

If any selected element cannot become a valid instance model (placement path occupied, identity already exists, container missing, validation failure), the operation MUST be rejected as a whole: no instance model is created and no element is removed.

#### Scenario: One destination occupied
- GIVEN `series/innteresante/assets/nuevo/` already exists
- WHEN the migration runs for `intro` and `nuevo`
- THEN the operation is rejected naming `innteresante/nuevo`
- AND `innteresante/intro` is not created and both registry elements remain

### Requirement: Versions follow the existing rules

Each created instance model MUST record only a `result_version` (as `add_model` does), and each source model MUST be bumped once. The migration MUST NOT alter field values.

#### Scenario: Version entries
- GIVEN the two-Video migration
- WHEN it is applied
- THEN `models` holds `innteresante/intro` and `innteresante/nuevo` with `result_version` only, and the registry with a base and result version

### Requirement: Migrating existing domaiNNs is out of scope

This change MUST NOT migrate `video_NN` or `LC_programas`. It MUST NOT include a compatibility mode that lets them validate under the new release without being migrated.

#### Scenario: Unmigrated domaiNN is untouched
- GIVEN `video_NN` as it is today
- WHEN the new release is installed
- THEN no file of `video_NN` is modified by the installation or by validation
