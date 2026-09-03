# Delta for spec-versioning

Adoption housekeeping for `iNNfo_V_0-2-0` as the adopted Level-1 format spec.
These requirements constrain what "an L1 version is adopted" MUST mean
structurally. They do NOT restate the L1 V_0-2-0 rule changes themselves (the
`includes` duplicate-name merge rule and the `model` type-enum addition) — those
live in `specs/iNNfo_V_0-2-0_NN.md` and are locked by `innfo-core` tests.

## ADDED Requirements

### Requirement: R-SV-09: Adopted L1 Version Invariant

`apps/innfo-editor/src/utils/constants.ts` `DEFAULT_INNFO_VERSION` is the single
source of truth for the adopted Level-1 iNNfo format version. When it holds
`V_x-y-z`, the file `specs/iNNfo_V_x-y-z_NN.md` MUST exist, and that file's
frontmatter `status` MUST be `"Stable"` — a value drawn from `defiNNe`'s declared
`Draft | Stable | Deprecated` vocabulary. The adopted L1 spec file MUST NOT carry
`status: "Draft"`, and MUST NOT carry a value outside that vocabulary (in
particular not `"Active"`). Superseded L1 spec files are immutable (R-SV-02) and
keep whatever `status` they were published with.

#### Scenario: Adopted constant points at a Stable, existing L1 spec
- GIVEN `DEFAULT_INNFO_VERSION` is `V_0-2-0`
- WHEN the repository is inspected
- THEN `specs/iNNfo_V_0-2-0_NN.md` exists
- AND its frontmatter `status` is `"Stable"`

#### Scenario: Out-of-vocabulary status is rejected
- GIVEN a proposed `status` of `"Active"` on the adopted L1 spec file
- WHEN the adoption invariant is checked
- THEN it fails, because `"Active"` is not in the `Draft | Stable | Deprecated` vocabulary declared by the `defiNNe` version that spec points at

#### Scenario: Superseded L1 spec is left untouched
- GIVEN `V_0-2-0` is adopted
- WHEN `specs/iNNfo_V_0-1-0_NN.md` is compared to its pre-change state
- THEN it is byte-identical, still `status: "Draft"`

### Requirement: R-SV-10: Template-Set Completeness at the Adopted L1 Version

Every L2 template shipped under `specs/templates/` MUST have at least one template
file whose frontmatter `parent_spec.name` resolves to the adopted L1 version named
by `DEFAULT_INNFO_VERSION`. A template MAY additionally retain older-version
files; each such older file MUST stay frozen and unedited (R-SV-02). A
first-revision template file that is already L1-compliant MAY keep its older
`template_version` and `_V_0-1-0_` filename while declaring `spec_version` at the
adopted version (R-SV-03) — it needs no new file.

#### Scenario: Every template folder resolves at the adopted L1
- GIVEN `DEFAULT_INNFO_VERSION` is `V_0-2-0`
- WHEN each folder under `specs/templates/` is inspected
- THEN each has at least one file whose `parent_spec.name` is `iNNfo_V_0-2-0`

#### Scenario: Bumped template freezes its older sibling
- GIVEN `blank` gains `blank_V_0-2-0_NN.md`
- WHEN `blank_V_0-1-0_NN.md` is compared to its pre-change state
- THEN it is byte-identical (not edited in place)
- AND the new file differs from its source only in `spec_version`, `spec_url`, `parent_spec.name`, `parent_spec.url`, and `template_version`

#### Scenario: First-revision compliant template needs no new file
- GIVEN `analysis_V_0-1-0_NN.md` declares `spec_version: V_0-2-0` and was never published at V_0-1-0
- WHEN template-set completeness is checked
- THEN the invariant is satisfied without adding an `_V_0-2-0_` file

### Requirement: R-SV-11: Frozen-Reference Allow-List

The change MUST define an explicit allow-list of files permitted to reference a
superseded L1 version indefinitely. The allow-list MUST include: the immutable
superseded L1 spec file (`specs/iNNfo_V_0-1-0_NN.md`) and the L0 spec
(`specs/defiNNe_V_0-1-0_NN.md`); each template's frozen `_V_0-1-0_` file and its
`_V_0-1-0_` shipped samples; the composite `includes` URLs that point at a
frozen first-revision sub-template; released and historical sections of
`CHANGELOG.md`; everything under `openspec/changes/archive/**`; and legacy
FOLDER-mode `_F.md` fixtures. A "stale reference" is any `source`, `doc`,
`skill`, `test`, or active-`fixture` file NOT on the allow-list that treats a
superseded version as the current one. After the change, every
superseded-version reference outside the allow-list MUST be eliminated or
individually justified in the verify report. A "zero superseded-version matches"
CI gate MUST NOT be required, because frozen files match the version string
forever; the allow-list review is the gate.

#### Scenario: Frozen file may keep the old version forever
- GIVEN `specs/templates/procedures/procedures_V_0-1-0_NN.md`
- WHEN the residual-reference scan runs
- THEN its superseded-version references are accepted, because the file is on the allow-list

#### Scenario: Stale source assumption is a defect
- GIVEN a non-allow-listed source file that treats `V_0-1-0` as the current default version
- WHEN the residual-reference scan runs
- THEN the file is reported as a stale reference that MUST be fixed or justified

#### Scenario: A residual reference outside the allow-list is either fixed or justified
- GIVEN the verify phase finds a `doc` file citing the superseded version as current
- WHEN it is not on the allow-list
- THEN the verify report MUST either record it as fixed or carry an explicit per-file justification

### Requirement: R-SV-12: Cross-Repo Bundled-Template Fidelity

When an L2 template is bundled into a downstream skill in another repository
(today: `workspace_spec_NN` under `cogNNitive/actioNN/skills/nn-innfo/templates/`),
the bundled copy MUST be byte-identical to the canonical `specs/templates/` file
it is copied from. It MUST NOT contain divergent edits, legacy pre-`NN` grammar,
or a stale `spec_version`.

#### Scenario: Bundled copy matches canonical
- GIVEN `cogNNitive/actioNN/skills/nn-innfo/templates/workspace_spec_NN.md`
- WHEN it is compared to `iNNfo/specs/templates/workspace_spec_NN.md`
- THEN the two files are byte-identical

#### Scenario: Divergent bundled copy is a defect
- GIVEN a bundled template carrying `spec_version: V_1-0-0` and pre-`NN` field grammar
- WHEN bundled-template fidelity is checked
- THEN it fails until the file is re-synced verbatim from the canonical file
