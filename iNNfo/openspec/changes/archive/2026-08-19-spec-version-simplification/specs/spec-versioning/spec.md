# Spec Versioning Specification

## Purpose

Immutable, filename-encoded versioning for L0/L1/L2 spec artifacts under a single
flat `specs/` tree, replacing the `specs/latest/` alias and the parallel
`v0.2.0`/`v0.2.1` snapshot folders. Makes the write-once guarantee in
`spec-resolution` R-LSR-02 structurally satisfiable: no spec artifact may ever be
addressed by a versionless or mutable path.

## Requirements

### Requirement: R-SV-01: Canonical Flat Spec Tree Layout

The `specs/` directory MUST contain L0 and L1 spec files directly at its root (no
`level0/`/`level1/` subfolders), and MUST group each L2 template under
`specs/templates/{template-name}/`, with that template's shipped samples under
`specs/templates/{template-name}/samples/`. No other top-level grouping (`latest/`,
`v0.2.0/`, `v0.2.1/`) may exist.

#### Scenario: L0 and L1 resolve at the specs/ root
- GIVEN the repository's `specs/` directory
- WHEN the resolver looks up the L1 iNNfo spec
- THEN it finds `specs/iNNfo_V_x-y-z_NN.md` directly under `specs/`, with no `level1/` segment

#### Scenario: L2 template and its samples share one folder
- GIVEN the `business` template at version `V_0-1-0`
- WHEN a consumer resolves the template or one of its shipped samples
- THEN both resolve under `specs/templates/business/` — the template file directly inside, samples inside `specs/templates/business/samples/`

### Requirement: R-SV-02: Filename-Encoded Immutable Versioning

Every file under `specs/` MUST encode its own version as a `V_x-y-z` segment in its
filename. A version bump MUST always create a new file; an already-published spec
file MUST NOT be edited in place or deleted while any model still references it.
This requirement extends `spec-resolution` R-LSR-02's write-once guarantee: because
every filename already carries its version, no versionless path can violate it.

#### Scenario: Bumping a template creates a new file, keeps the old one
- GIVEN `specs/templates/procedures/procedures_V_0-1-0_NN.md` is published and referenced by an existing model
- WHEN the template is bumped to `V_0-2-0`
- THEN `specs/templates/procedures/procedures_V_0-2-0_NN.md` is created as a new file
- AND `procedures_V_0-1-0_NN.md` remains unchanged and is not deleted

### Requirement: R-SV-03: `template_version` Field on L2 Templates

Every L2 template file MUST declare a `template_version` frontmatter field carrying
its own filename-encoded version, independent of `specification_version` (which
tracks L1 compliance, not template identity). `template_version` MUST change only
when the template's filename changes.

#### Scenario: Template declares its own version independent of the parent spec
- GIVEN a `business` template file compliant with L1 spec `V_0-1-0`
- WHEN the template is authored at its own third revision
- THEN its frontmatter declares both `specification_version: "V_0-1-0"` and `template_version: "V_0-1-2"`, differing independently

### Requirement: R-SV-04: `parent_spec` Remains a `{name, url}` Object

`parent_spec` on L3 models MUST remain a `{name, url}` object. It MUST NOT be
collapsed into a single URL string: independent consumers read `parent_spec.name`
for display without parsing `url`, and the validator/serializer require both
fields with distinct error paths.

#### Scenario: parent_spec keeps both fields after migration
- GIVEN an L3 model migrated to reference a new-layout template
- WHEN its frontmatter is inspected
- THEN `parent_spec` is an object with both `name` and `url`, not a bare string

### Requirement: R-SV-05: Reserved, Inert `specializes` Field

L2 templates MAY declare an optional `specializes` field naming a base template
for structural inheritance. This field is reserved and documented but MUST NOT be
interpreted or enforced by any resolver, validator, or mutation tool in this
change — it MUST remain a no-op, kept distinct from `template_version` so
specialization and versioning are never conflated.

#### Scenario: specializes is accepted but inert
- GIVEN a template file with `specializes: "business"` in its frontmatter
- WHEN the template is validated
- THEN validation passes without acting on `specializes`, and no template-inheritance logic is triggered

### Requirement: R-SV-06: Removal of Legacy and Orphan Spec Trees

`specs/latest/`, `specs/v0.2.0/`, `specs/v0.2.1/`, `specs/latest/INDEX.md`,
`specs/CHANGELOG.md`, and `models/specs/` MUST be deleted. The orphan L2 template
folders `businessV2/`, `cogNNitive/`, and `biz/` MUST be deleted outright — not
archived, not migrated into `specs/templates/`.

#### Scenario: No trace of the legacy trees remains
- GIVEN the migration has landed
- WHEN the repository is scanned for `specs/latest/`, `specs/v0.2.0/`, `specs/v0.2.1/`, or `models/specs/`
- THEN none of those paths exist

#### Scenario: Orphan templates are gone, not relocated
- GIVEN the migration has landed
- WHEN the full repository is searched for `businessV2/`, `cogNNitive/`, or `biz/` template folders
- THEN none exist anywhere, including under `specs/templates/`

### Requirement: R-SV-07: Atomic Single-Change Migration

The new `specs/` tree and the removal of the old trees (`specs/latest/`,
`specs/v0.2.0/`, `specs/v0.2.1/`, `models/specs/`) MUST land in the same
change/commit. No intermediate, reviewable, or merged state may contain both the
old and the new tree simultaneously.

#### Scenario: No commit has both trees present
- GIVEN the full commit history of the migration change
- WHEN each commit's file tree is inspected
- THEN no single commit contains both `specs/templates/` (new) and `specs/latest/` (old)

### Requirement: R-SV-08: L3 `parent_spec.url` Must Pin a Versioned Filename

An L3 model's `parent_spec.url` MUST resolve to a specific versioned template
filename (e.g., `specs/templates/business/business_V_0-1-2_NN.md`) and MUST NOT
point at a mutable alias such as a `latest/` path. Shipped samples MUST follow the
same rule.

#### Scenario: Shipped sample pins a versioned filename
- GIVEN the shipped sample `CodeReviewProcess_V_1-0-0_procedures_NN.md`
- WHEN its `parent_spec.url` is inspected
- THEN it points at a specific versioned file under `specs/templates/procedures/`, not at any `latest/` path

#### Scenario: A latest/ alias no longer resolves as a parent_spec.url target
- GIVEN a model whose `parent_spec.url` points at a path containing `specs/latest/`
- WHEN the model is validated after this migration lands
- THEN validation fails because no `specs/latest/` path exists in the repository to resolve against
