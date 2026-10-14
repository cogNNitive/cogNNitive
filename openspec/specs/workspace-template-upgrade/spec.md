# Workspace Template Upgrade Flow

## Purpose

Give workspaces a safe, consent-gated path to adopt newer canonical template versions. A committed, generator-produced Level-2 template catalog (`iNNfo/specs/bluepriNNts/catalog.json`) records every published template version and the `adopted` (highest) version; the preflight runner performs a non-mutating Tier-3 scan classifying each Level-3 model as `current` / `upgrade-available` / `ahead` / `unlisted`; and a dedicated `nn-upgrade` skill owns the detect → consent → backup → impact analysis → migrate → confirm flow, asking mapping questions only on real schema impact and never targeting local specialization templates.
## Requirements
### Requirement: Template Catalog Artifact

A Level-2 template catalog MUST exist as a committed, machine-readable JSON file at
`iNNfo/specs/bluepriNNts/catalog.json`. For every canonical template discovered in the
`iNNfo/specs/bluepriNNts/` tree, the catalog MUST record:

- `name` — the canonical template name (e.g. `business`, `workspace`, `documentation`).
- `versions` — the published immutable versions found on disk, each with its
  `template_version` and the exact `spec_url` used to pin a model to it.
- `adopted` — the published version with the highest `template_version`; this is the
  version a workspace upgrade targets.

The catalog MUST be produced by a deterministic generator
(`scripts/template-catalog.mjs`). The generator MUST exit non-zero with a drift report
when invoked with `--check` and the committed `catalog.json` is stale, so the artifact
cannot silently rot. The catalog MUST NOT include local/specialization templates that are
not canonical (they are never an upgrade target).

#### Scenario: Generator produces and validates the catalog
- GIVEN the canonical templates `business_V_0-2-0`, `business_V_0-1-0` in the specs tree
- WHEN `scripts/template-catalog.mjs` runs without `--check`
- THEN it writes `catalog.json` where `business.versions` contains both versions
- AND `business.adopted == "V_0-2-0"`

#### Scenario: Drift is detected
- GIVEN a committed `catalog.json` that is missing a newly added template version
- WHEN `scripts/template-catalog.mjs --check` runs
- THEN it exits non-zero and reports the stale entries

### Requirement: Tier-3 Upgrade Detection Scan

The preflight runner MUST detect template upgrades for a workspace without mutating it.
When `preflight-check.js` is invoked with `--workspace-dir`, it SHALL:

1. Discover all Level-3 models in the workspace (from `models/` and the workspace root).
2. Read each model's `parent_spec.url` (or `spec_url`).
3. Match the template basename against the committed catalog.
4. Classify the model against the catalog's `adopted` version:

   - `current` — the model's template version equals the catalog `adopted` version.
   - `upgrade-available` — a newer published version exists and is the `adopted` version;
     the bump gap (`major` / `minor` / `patch` per `defiNNe` §7) MUST be reported.
   - `ahead` — the model is pinned to a published version newer than the catalog
     `adopted` version.
   - `unlisted` — the template is not in the catalog (e.g. a local specialization).

The detection scan MUST be non-mutating and MUST NOT flip the preflight exit code to a
blocker. An available upgrade SHALL be reported as an informational/actionable item, not
a blocker. If the catalog cannot be resolved, the scan MUST degrade to an `offline`
notice rather than fail the run.

#### Scenario: Model is current
- GIVEN a workspace model pinned to the catalog `adopted` version of `business`
- WHEN the Tier-3 scan runs
- THEN the model is classified `current`
- AND no upgrade is offered

#### Scenario: Model has an upgrade available
- GIVEN a workspace model pinned to `business_V_0-1-0`
- AND the catalog `adopted` version of `business` is `V_0-2-0`
- WHEN the Tier-3 scan runs
- THEN the model is classified `upgrade-available`
- AND the gap is reported as `minor`
- AND the preflight exit code stays `0`

#### Scenario: Catalog is offline
- GIVEN a workspace whose catalog cannot be resolved
- WHEN the Tier-3 scan runs
- THEN the scan reports an `offline` notice
- AND does not classify models as upgrade-available or current

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

