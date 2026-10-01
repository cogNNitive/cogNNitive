# Delta for Template Procedures Manifest and Discovery

## MODIFIED Requirements

### R-TPD-02: Transitive Procedure Discovery from Disk and Frontmatter
`list_blueprint_procedures` and `discoverTransitiveAssets` MUST discover executable SOP procedures declared in blueprint frontmatter AND procedure markdown files residing within the blueprint's `procedures/` package directory, deduplicating by procedure `id` and reporting the source blueprint.
(Previously: scoped to `listTemplateProcedures`/templates; blueprint-declared procedures were not explicitly covered and the source blueprint was not reported.)

#### Scenario: Querying procedures of a package shipping a procedures folder
- GIVEN a blueprint package with `procedures/ingest_visual_catalog_NN.md`
- WHEN `list_blueprint_procedures` is called for that blueprint
- THEN the returned procedures list MUST contain `ingest-visual-catalog` with its title, path (`procedures/ingest_visual_catalog_NN.md`), and source blueprint `visual-catalog`.

#### Scenario: Deduplication across a composition tree
- GIVEN a host blueprint includes `visual-catalog`, which declares `ingest-visual-catalog`
- WHEN `list_blueprint_procedures` runs for the host
- THEN `ingest-visual-catalog` appears once in the aggregate result
