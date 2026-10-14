# Delta for model-scaffold-robustness

## MODIFIED Requirements

### Requirement: Version-Aware Frontmatter Inference

The scaffold (the shared `scaffoldKnowledgeDocument`, used by `add_model` and therefore by `init_knowledge`) MUST set `knowledge_version` to the explicit value when one is provided, else to the resolved parent bluepriNNt `blueprint_version` (or `spec_version` when it declares none), else to `V_0-1-0`. An explicit value that differs from the parent version MUST be accepted: `knowledge_version` is decoupled from the parent version (see `knowledge-version-and-snapshot`), and no `VERSION_MISMATCH` refusal exists. (Previously: required refusing a differing version, which contradicted the decoupling requirement and was never implemented.)

#### Scenario: Version inferred

- GIVEN a parent bluepriNNt at a minor version, no override
- WHEN the scaffold runs
- THEN frontmatter carries that same version

#### Scenario: Override wins

- GIVEN an explicit version override
- WHEN the scaffold runs
- THEN frontmatter carries the override version

#### Scenario: Differing override accepted

- GIVEN an explicit version that differs from the parent version
- WHEN the scaffold runs
- THEN frontmatter carries the explicit version and no `VERSION_MISMATCH` error is raised

### Requirement: Failed Init Never Returns a Success-Shaped Payload

When `init_knowledge` fails — the `add_model` change is rejected or conflicted, or the created document fails validation — the tool response MUST NOT include `filePath` or `content` fields, and `success` MUST be `false`. A caller MUST be able to distinguish "persisted" from "not persisted" by response shape alone, without relying solely on the `success` flag. (Previously: stated for `initModel()` pre-write validation only.)

#### Scenario: Validation failure omits filePath and content

- GIVEN scaffold validation fails during the apply of the `add_model` change
- WHEN `init_knowledge` returns
- THEN the response has `success: false` and no `filePath` or `content` field

#### Scenario: Existing model omits filePath and content

- GIVEN the target model already exists
- WHEN `init_knowledge` returns
- THEN the response has `success: false`, a `MODEL_EXISTS` error, and no `filePath` or `content` field

#### Scenario: Successful init returns filePath and content

- GIVEN the `add_model` change applies and the file is written
- WHEN `init_knowledge` returns
- THEN the response has `success: true`, `filePath`, `content` and `changeset`
