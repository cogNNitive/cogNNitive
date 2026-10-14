# Delta for workspace-template-upgrade

## MODIFIED Requirements

### Requirement: nn-upgrade Guided Migration Skill

The skill `nn-upgrade` MUST own exactly one migration flow: the consent-gated bluepriNNt version upgrade of a domain already in the canonical layout (Flow B). It MUST NOT migrate an old-layout or broken domain in place: for such a domain it MUST direct the user to create a new domain and import the old one as a Source (`migrate-domain.js --import-as-source`), from which the agent derives changesets that cite the import. It MAY offer `--freeze-slugs` as a maintenance command. The Flow B steps MUST be, in order:

1. **Detect** — run the Tier-3 upgrade scan and present the per-model classification.
2. **Inform & consent** — present `[a] (Recommended) Upgrade / [b] Continue` before any
   mutation. Consent is mandatory; no file is written without it.
3. **Backup** — create a timestamped backup **outside** the workspace (a sibling backup
   directory or a zip archive). The backup MUST include `kNNowledge/`, `specs/`,
   `sources/import/` (and `sources/conversations/`), `procedures/`, and `domaiNN_NN.md`. A manual-backup fallback instruction
   MUST be shown when the automated backup is unavailable.
4. **Impact analysis** — for each model to migrate, compare the pinned template against
   the adopted template. Mapping questions MUST be asked **only** when the schema diff
   removes, renames, or re-types a Concept/Field/Matrix/Marker that the model actually
   uses. No mapping question MAY be asked for additive or unchanged definitions.
5. **Migrate** — hydrate the adopted template package into the workspace (write-once,
   leaving the pinned frozen template intact), repoint the model's `parent_spec` to the
   adopted version, apply the agreed mappings, and re-validate every migrated model
   through `innfo-mcp`.
6. **Confirm** — present a before/after report (version, gap, mapping decisions, and
   validation outcome) on the console output and close the flow.

The skill MUST NOT touch local specialization templates as migration targets; it MUST
report them `unlisted` and direct them to the documented backlog guidance. (Previously: the skill also owned an in-place domain layout migration (Flow A) and a batch layout migration over sibling domains (Flow C).)

#### Scenario: Consent before any mutation
- GIVEN a model classified `upgrade-available`
- WHEN the user runs the `nn-upgrade` flow
- THEN the skill presents `[a] Upgrade / [b] Continue`
- AND no workspace file is written until the user chooses `[a]`

#### Scenario: Backup precedes migration
- GIVEN a user choosing to upgrade
- WHEN the migration phase begins
- THEN a timestamped backup outside the workspace is created
- AND every migrated model is re-validated before the flow reports success

#### Scenario: Mapping question is only asked on real impact
- GIVEN a pinned template `V_0-1-0` where the adopted template `V_0-2-0` only **adds** a
  new optional Field
- WHEN the migration runs for a model using no removed/renamed/re-typed definition
- THEN no mapping question is asked
- AND the model is repointed and re-validated

#### Scenario: An old-layout domain is not migrated in place
- GIVEN a domain whose layout the legacy detector flags
- WHEN the user asks `nn-upgrade` to migrate it
- THEN the skill writes nothing into that domain
- AND it directs the user to a new domain with the old one imported as a Source

### Requirement: Migration never deletes user data

No `nn-upgrade` command MAY delete or rewrite a file of the domain it reads. `--import-as-source` MUST only read the old domain and copy it into the new domain's `sources/import/`; Flow B writes only the files its migrate step names (hydrated templates, repointed and mapped models) after consent and backup. Content with no destination (for example `sources/archive/` snapshots, ledgers, transcripts with pasted blocks) MUST be left in place. (Previously: the requirement constrained the in-place layout rewriter, which is retired.)

#### Scenario: Import leaves the old domain untouched
- GIVEN an old domain with `sources/archive/metrics/V1/metrics.md` and a retired `feedback-ledger.jsonl`
- WHEN `--import-as-source` imports it into a new domain
- THEN every file of the old domain is byte-identical afterwards
- AND the new domain holds a copy under `sources/import/`

## REMOVED Requirements

### Requirement: Layout and naming migration

(Reason: maintainer decision 2026-10-13 — no in-place migration of old domains. An old domain is imported as a Source into a new domain; the agent re-derives its content as changesets.)
(Migration: None. Old-layout domains stay readable as files and are recognised by the legacy detector, which points at the new-domain recipe.)

### Requirement: Citations into `sources/archive/` are reported as warnings

(Reason: the warnings were part of the layout migration's detector and rewriter reports, which are deleted with Flow A.)
(Migration: None. Archive snapshots stay excluded by the deep `archive` exclusion and are copied as-is by `--import-as-source`.)
