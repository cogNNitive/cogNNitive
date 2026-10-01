# Delta for Template Package Structure

## ADDED Requirements

### Requirement: Blueprint Package Source Layout

Level-2 blueprint packages in the source repository MUST use canonical unversioned filenames under `iNNfo/specs/bluepriNNts/<blueprint-name>/`, with the primary specification at `spec_NN.md` and optional `procedures/`, `samples/`, and `assets/` subdirectories. The authoritative version MUST be declared in frontmatter as `blueprint_version`. Source paths MUST NOT encode a semantic version.

#### Scenario: New blueprint package is created

- GIVEN the blueprint `visual-catalog` on `main`
- WHEN it is stored at `iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md`
- THEN the file carries `blueprint_version` in its frontmatter
- AND no `_V_x-y-z_` token appears in the path
- AND `procedures/` is present because the blueprint declares procedures
