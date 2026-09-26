# Delta for Workspace Manifest Reconciliation

## MODIFIED Requirements

### Requirement: Discovery Scope for Level-3 Model Files

Reconciliation MUST discover candidate files by: frontmatter `level: 3` with
`parent_spec` present, filename matching `*_NN.md`, located outside
`{backups, archive, specs}`, excluding the manifest itself and any document
whose `parent_spec.name` matches a non-model spec app — the lineage-record apps
(`cogNNitive`, `workspace`) and the catalog apps that own their own
workspace-manifest section (`procedures`, `sources`, `artifacts`), any
version/suffix (`/^(cognnitive|workspace|procedures|sources|artifacts)(_|$)/i`).
Discovery MUST NOT run against ingested sources (`## NN Sources:` elements in a
provenance model are never treated as `Models` candidates).

(Previously: only the manifest itself and `cogNNitive`/`workspace` lineage
records were excluded, so `procedures_NN.md` / `sources_NN.md` /
`artifacts_NN.md` catalogs were proposed as `## NN Models` entries, duplicating
the entries their own sections already carry.)

#### Scenario: Level-3 domain model is discovered
- GIVEN a file `startups/acme_business_NN.md` with `level: 3` and `parent_spec: business_V_0-2-0`, outside `backups/archive/specs`
- WHEN discovery runs
- THEN it is included as a candidate for manifest reconciliation

#### Scenario: Catalog app excluded regardless of location
- GIVEN `procedures/procedures_NN.md` (`parent_spec.name: "procedures"`), `sources/sources_NN.md`, `artifacts/artifacts_NN.md`, and a `procedures/<name>_procedures_NN.md` detail model
- WHEN discovery runs
- THEN none is treated as a `Models` candidate

#### Scenario: cogNNitive provenance model and ingested sources excluded
- GIVEN `acme_cogNNitive_NN.md` (conforms to a `cogNNitive` template) and its `## NN Sources:` elements
- WHEN discovery runs
- THEN neither the provenance model nor its ingested sources are treated as `Models` candidates
