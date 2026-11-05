# Workspace Template Upgrade Flow — Lineage Update Delta

## RENAMED Requirements

- FROM: `### Requirement: Tier-3 Upgrade Detection Scan`
- TO: `### Requirement: Lineage Audit`

- FROM: `### Requirement: nn-upgrade Guided Migration Skill`
- TO: `### Requirement: nn-update Lineage Reconciliation Skill`

- FROM: `### Requirement: A concept is upgraded for every instance or for none`
- TO: `### Requirement: A concept is reconciled for every instance or for none`

- FROM: `### Requirement: A pre-existing skew blocks a partial upgrade`
- TO: `### Requirement: A pre-existing skew blocks a partial reconciliation`

## MODIFIED Requirements

### Requirement: Template Catalog Artifact

A Level-2 blueprint catalog MUST exist as a committed, machine-readable JSON file at
`iNNfo/specs/bluepriNNts/catalog.json`. For every canonical blueprint discovered in the
`iNNfo/specs/bluepriNNts/` tree, the catalog MUST record:

- `name` — the canonical blueprint name (e.g. `business`, `workspace`, `documentation`).
- `versions` — the published immutable versions found on disk, each with its
  `blueprint_version`, its `spec_version` and the exact `url` used to pin a model to it.
- `adopted` — the published version with the highest `blueprint_version`; this is the
  version a domain update targets.

The catalog MUST be produced by the deterministic generator `scripts/blueprint-catalog.mjs`
(it self-reports as `generator` in the emitted file). The generator MUST exit non-zero with
a drift report when invoked with `--check` and the committed `catalog.json` is stale, so the
artifact cannot silently rot. The catalog MUST NOT include local/specialization blueprints
that are not canonical (they are never an update target).

#### Scenario: Generator produces and validates the catalog
- GIVEN the canonical blueprints `business_V_0-2-0`, `business_V_0-1-0` in the specs tree
- WHEN `scripts/blueprint-catalog.mjs` runs without `--check`
- THEN it writes `catalog.json` where `business.versions` contains both versions
- AND `business.adopted == "V_0-2-0"`

#### Scenario: Drift is detected
- GIVEN a committed `catalog.json` that is missing a newly added blueprint version
- WHEN `scripts/blueprint-catalog.mjs --check` runs
- THEN it exits non-zero and reports the stale entries

### Requirement: Lineage Audit

The preflight runner MUST detect blueprint lineage updates for a domain without mutating it.
When `preflight-check.js` is invoked with `--workspace-dir` (or the alias
`--audit-lineage`), it SHALL:

1. Discover all Level-3 models in the domain (compact root models and distributed
   collection models alike).
2. Read each model's `parent_spec.name` and `parent_spec.url`.
3. Match the blueprint basename against the committed catalog.
4. Classify the model against the catalog's `adopted` version:

   - `current` — the model's blueprint version equals the catalog `adopted` version.
   - `update-available` — a newer published version exists and is the `adopted` version;
     the bump gap (`major` / `minor` / `patch` per `defiNNe` §7) MUST be reported.
   - `ahead` — the model is pinned to a published version newer than the catalog
     `adopted` version.
   - `unlisted` — the blueprint is not in the catalog (e.g. a local specialization).

5. Detect and report a pre-existing **version skew**: two models in the same domain pinned
   to different versions of the same blueprint.

The audit MUST be read-only and MUST NOT flip the preflight exit code to a blocker. An
available update SHALL be reported as an informational/actionable item, not a blocker. If
the catalog cannot be resolved, the audit MUST degrade to an `offline` notice rather than
fail the run. The canonical key is `update-available`; `upgrade-available` MAY remain as a
deprecated alias in machine-readable output for one release.

#### Scenario: Model is current
- GIVEN a domain model pinned to the catalog `adopted` version of `business`
- WHEN the lineage audit runs
- THEN the model is classified `current`
- AND no update is offered

#### Scenario: Model has an update available
- GIVEN a domain model pinned to `business_V_0-1-0`
- AND the catalog `adopted` version of `business` is `V_0-2-0`
- WHEN the lineage audit runs
- THEN the model is classified `update-available`
- AND the gap is reported as `minor`
- AND the preflight exit code stays `0`

#### Scenario: Catalog is offline
- GIVEN a domain whose catalog cannot be resolved
- WHEN the lineage audit runs
- THEN the audit reports an `offline` notice
- AND does not classify models as `update-available` or `current`

### Requirement: nn-update Lineage Reconciliation Skill

The skill `nn-update` MUST own exactly one flow: the consent-gated **Blueprint Lineage
Reconciliation** of a domain already in the canonical layout. It MUST NOT migrate an
old-layout or broken domain in place: for such a domain it MUST direct the user to create a
new domain and import the old one as a Source (`migrate-domain.js --import-as-source`), from
which the agent derives changesets that cite the import. It MAY offer `--freeze-slugs` as a
maintenance command. The reconciliation steps MUST be, in order:

1. **Audit** — run the Lineage Audit and present the per-model classification.
2. **Plan** — group models into reconciliation units by blueprint and compute the
   `planHash` (see *Grouped Reconciliation Planning*).
3. **Inform & consent** — present the exact model count, the target version and any
   breaking change before any mutation. Consent is mandatory; no file is written without it.
4. **Backup** — create a timestamped backup **outside** the workspace (a sibling backup
   directory or a zip archive). The backup MUST include `kNNowledge/`, `specs/`,
   `sources/import/` (and `sources/conversations/`), `procedures/`, and `domaiNN_NN.md`. A
   manual-backup fallback instruction MUST be shown when the automated backup is unavailable.
5. **Impact analysis** — for each model to reconcile, compare the pinned blueprint against
   the adopted blueprint. Mapping questions MUST be asked **only** when the schema diff
   removes, renames, or re-types a Concept/Field/Matrix that the model actually uses. No
   mapping question MAY be asked for additive or unchanged definitions. A pinned blueprint
   that declares Marker Definitions, or a model that holds an `item-markers matrix`, is not
   mapped by this flow: the skill MUST report `MARKERS_REMOVED` and direct the user to the
   `nn-innfo` migration recipe, which proposes a reviewable changeset.
6. **Reconcile** — hydrate the adopted blueprint package into the workspace (write-once,
   leaving the pinned frozen blueprint intact), generate one changeset per unit with the
   typed lineage operations, apply it through the standard transaction pipeline, and
   re-validate every reconciled model.
7. **Confirm** — present a before/after report (version, gap, mapping decisions, and
   validation outcome) on the console output and close the flow.

The skill MUST NOT touch local specialization blueprints as reconciliation targets; it MUST
report them `unlisted` and direct them to the documented backlog guidance. `nn-upgrade` MAY
exist only as a thin deprecation pointer that forwards to `nn-update` and logs a notice; it
MUST NOT own a flow of its own.

#### Scenario: Consent before any mutation
- GIVEN a model classified `update-available`
- WHEN the user runs the `nn-update` flow
- THEN the skill states the exact model count and target version
- AND no workspace file is written until the user consents

#### Scenario: Backup precedes reconciliation
- GIVEN a user consenting to the update
- WHEN the reconciliation phase begins
- THEN a timestamped backup outside the workspace is created
- AND every reconciled model is re-validated before the flow reports success

#### Scenario: Mapping question is only asked on real impact
- GIVEN a pinned blueprint `V_0-1-0` where the adopted blueprint `V_0-2-0` only **adds** a
  new optional Field
- WHEN the reconciliation runs for a model using no removed/renamed/re-typed definition
- THEN no mapping question is asked
- AND the model is repinned and re-validated

#### Scenario: Marker-bearing model is routed to the recipe
- GIVEN a model holding an `item-markers matrix`
- WHEN the impact analysis runs
- THEN no mapping question is asked about markers
- AND the report shows `MARKERS_REMOVED` with a pointer to the `nn-innfo` migration recipe

#### Scenario: An old-layout domain is not migrated in place
- GIVEN a domain whose layout the legacy detector flags
- WHEN the user asks `nn-update` to migrate it
- THEN the skill writes nothing into that domain
- AND it directs the user to a new domain with the old one imported as a Source

#### Scenario: Legacy skill name forwards
- GIVEN a user invoking `nn-upgrade`
- WHEN the skill loads
- THEN it logs that the canonical name is `nn-update`
- AND forwards to the same flow with identical gates

### Requirement: Migration never deletes user data

`nn-update` MUST NOT delete or rewrite any file of the domain it reads.
`--import-as-source` MUST only read the old domain and copy it into the new domain's
`sources/import/`; the reconciliation flow writes only the files its reconcile step names
(hydrated blueprints, repinned and mapped models) after consent and backup. Content with no
destination (for example `sources/archive/` snapshots, ledgers, transcripts with pasted
blocks) MUST be left in place. (Previously: the requirement constrained the in-place layout
rewriter, which is retired.)

#### Scenario: Import leaves the old domain untouched
- GIVEN an old domain with `sources/archive/metrics/V1/metrics.md` and a retired `feedback-ledger.jsonl`
- WHEN `--import-as-source` imports it into a new domain
- THEN every file of the old domain is byte-identical afterwards
- AND the new domain holds a copy under `sources/import/`

### Requirement: A concept is reconciled for every instance or for none

`nn-update` MUST treat all models that hold instances of a concept (every instance model of
a distributed concept, and every model holding the concept as elements) as one reconciliation
unit. It MUST repin and re-validate every such model, or none. It MUST NOT leave a domaiNN
with a concept pinned to two versions at the end of the flow. Consent, backup and impact
analysis apply to the unit as a whole.

#### Scenario: All instances move together
- GIVEN 24 distributed instance models pinning `coNNtent_V_0-14-1` and an adopted version `V_0-15-0`
- WHEN the user consents to the update
- THEN all 24 models are repinned to `V_0-15-0` and re-validated
- AND `check_domain` reports no version skew

#### Scenario: One instance fails validation
- GIVEN the same update where instance `innteresante/intro` fails re-validation against `V_0-15-0`
- WHEN the reconcile step runs
- THEN no instance is left repinned: all 24 models are restored from the pre-run state
- AND the report names `innteresante/intro` and the failure

#### Scenario: Consent covers the unit
- GIVEN a concept with 24 instances classified `update-available`
- WHEN the flow requests consent
- THEN the prompt states the number of models in the unit
- AND no file is written until consent is given

### Requirement: Mapping questions are asked once per concept

The mapping question MUST be asked once for the concept and the answer applied to every
instance when the impact analysis finds a removed, renamed or re-typed Concept, Field or
Matrix that instances use. No question MAY be asked per instance. The resolved mapping MUST
be translated into the same typed operations in every instance changeset of the unit.

#### Scenario: Renamed field asked once
- GIVEN a field renamed between versions and used by 24 instances
- WHEN the impact analysis runs
- THEN exactly one mapping question is asked
- AND the answer is applied to all 24 instances

### Requirement: A pre-existing skew blocks a partial reconciliation

When a concept is already skewed, the flow MUST report the skew first and MUST reconcile the
whole unit to the adopted version, never only the instances on a particular version.

#### Scenario: Already skewed
- GIVEN instances pinning `V_0-13-6` and `V_0-14-1`
- WHEN the flow detects
- THEN the skew is reported
- AND, if accepted, every instance ends on the adopted version

## ADDED Requirements

### Requirement: Canonical Lineage Vocabulary

The workspace management system MUST use the canonical iNNfo vocabulary for domain updates.
Legacy terms MAY survive only as deprecated compatibility aliases and MUST NOT appear in new
specifications, primary documentation or console output.

#### Scenario: Audit report uses the canonical vocabulary
- GIVEN a domain with models pinned to older blueprints
- WHEN the lineage audit runs
- THEN the report classifies models as `update-available`
- AND describes the next step as Blueprint Lineage Reconciliation

#### Scenario: Retired vocabulary is not shipped in living specifications
- GIVEN the living specifications under `openspec/specs/`
- WHEN the specification integrity gate runs
- THEN no specification describes the flow as `Flow B` or a `Tier-3 upgrade scan`

### Requirement: Grouped Reconciliation Planning

A Reconciliation Plan MUST group models by blueprint and be verifiable for staleness before
execution.

1. **The unit of reconciliation is the blueprint group, never an individual model.**
2. Every model in the domain pinning that blueprint MUST be a member of the unit.
3. The plan MUST compute a deterministic `planHash` over the canonicalized member paths and
   their current pins.
4. Before any mutation, the runner MUST call `isPlanFresh(plan, workspaceDir)`. On mismatch it
   MUST abort with `PLAN_STALE` and write nothing.

#### Scenario: Multiple instances reconciled as one unit
- GIVEN a distributed concept with 24 instance models pinning `coNNtent_V_0-14-1`
- WHEN a reconciliation plan is generated
- THEN the plan contains exactly one unit with all 24 members
- AND the consent count states 24 models

#### Scenario: Plan staleness aborts execution
- GIVEN a generated plan with a valid `planHash`
- WHEN a model file is modified or added before execution
- THEN the run aborts with `PLAN_STALE`
- AND no file is written

### Requirement: Changeset-Driven Lineage Mutation

All model mutations during reconciliation MUST be generated and applied through the formal
iNNfo changeset engine; no reconciliation step MAY patch document text with a regular
expression.

1. The builder MUST parse each model with `parseKnowledge()`.
2. It MUST diff the pinned schema against the target schema and produce a typed
   `ChangesetDocument` whose operations include `repin_blueprint` (updates
   `parent_spec.name`, `parent_spec.url` and `blueprint_version`), `rename_concept`,
   `rename_field` and `set_field_default`.
3. Every generated operation MUST be a declared member of `CHANGE_OPS`, with the same
   validation and provenance guarantees as any other change.
4. Each generated changeset MUST pass `validateKnowledge()` against the target schema before
   application.
5. Application MUST go through the single transaction pipeline (`executeChangesetApply`),
   never through a skill-local writer.

#### Scenario: Model frontmatter repinned via a changeset
- GIVEN a model document pinned to `coNNtent_V_0-14-1`
- WHEN reconciliation targets `V_0-15-0`
- THEN a changeset with a `repin_blueprint` operation is generated
- AND applied through the transaction pipeline
- AND the resulting document pins `coNNtent_V_0-15-0`
- AND no unrelated byte or comment is corrupted

#### Scenario: An undeclared operation is rejected
- GIVEN a lineage changeset naming an operation absent from `CHANGE_OPS`
- WHEN it is submitted for application
- THEN it is rejected before any file is written

### Requirement: Pre-write backup and all-or-none rollback

A reconciliation run MUST be recoverable in full.

1. **Pre-write backup**: a timestamped backup outside the workspace root, with a SHA-256
   manifest, MUST exist before the first write.
2. **All-or-none**: if post-mutation validation fails for any member of the unit, every
   modified file MUST be restored to its pre-run content.
3. The workspace MUST NEVER be left partially updated or skewed.

#### Scenario: Validation failure restores the pre-run state
- GIVEN a unit of 10 models
- WHEN 9 validate and the 10th fails post-mutation validation
- THEN the run aborts with `UNIT_REVALIDATION_FAILED`
- AND all 10 models are restored from the backup
- AND the failed path and diagnostic are reported
