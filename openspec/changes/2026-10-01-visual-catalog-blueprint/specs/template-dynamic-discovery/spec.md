# Delta for Template Dynamic Procedure & Skill Discovery

## MODIFIED Requirements

### Requirement: Frontmatter Procedure and Skill Declarations

Level 2 blueprint YAML frontmatter MUST support optional `procedures` and `skills` declaration arrays. Each `procedures` entry MUST specify `id`, `name`, and relative `path`, and every declared `path` MUST resolve to an existing file inside the package's `procedures/` directory. Each `skills` entry MUST specify `name`, `repo`, and relative `path`.
(Previously: declared procedure paths were not required to resolve to an existing package file.)

#### Scenario: Template declares attached SOP procedure and agent skill
- GIVEN a Level 2 template `relevamiento` frontmatter containing:
  ```yaml
  procedures:
    - id: "relevar-vivienda"
      name: "Relevamiento de Vivienda"
      path: "procedures/relevamiento_vivienda_NN.md"
  skills:
    - name: "nn-reforma-casa"
      repo: "cogNNitive/actioNN"
      path: "skills/nn-reforma-casa"
  ```
- WHEN the template frontmatter is parsed by `innfo-core`
- THEN the declared procedure and skill metadata are validated and structured into schema attributes

#### Scenario: Declared procedure path must resolve

- GIVEN a blueprint declaring `procedures: [{id: ingest-visual-catalog, name: ..., path: procedures/ingest_visual_catalog_NN.md}]`
- WHEN the package is validated
- THEN the declared path resolves to an existing file inside the package
- AND a missing or out-of-package path is reported as an error
