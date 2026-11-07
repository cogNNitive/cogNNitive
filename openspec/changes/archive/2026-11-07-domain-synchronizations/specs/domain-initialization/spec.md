# domain-initialization Delta Spec

## MODIFIED Requirements

### Requirement: `init_domain` scaffolds an empty conformant domaiNN

The MCP MUST expose `init_domain` (`dir`, `name`, optional `workspace_id`) that creates
an empty domaiNN container from one pure scaffold plan (`planDomainScaffold` in
`innfo-core`). It MUST refuse a `dir` that exists and is not empty. The plan MUST create
`kNNowledge/`, `sources/import/`, `sources/sync/`, `sources/conversations/`, `conversations/`,
`artifacts/`, `procedures/`, `staging/` and `changes/`; a `.gitattributes` holding
`* -text`; `sources/sources_NN.md`, a Level-3 document of the `sources` bluepriNNt with no
Synchronization element; and `domaiNN_NN.md`, a Level-3 document of the `domaiNN` bluepriNNt
(`level: 3`, `parent_spec` with `name: domaiNN` and the canonical bluepriNNt URL,
`knowledge_version: V_0-1-0`, `title`, `workspace_id` defaulting to the slug of `name`)
carrying the document notice and no kNNowledge entries. `init_domain` is not a changeset:
a changeset lives inside a domain, and the manifest is the record of the domain.
(Previously: the plan did not create `sources/sources_NN.md` or `sources/sync/`.)

#### Scenario: Fresh domain is accepted
- GIVEN an empty directory
- WHEN `init_domain` runs with `name: ACME`
- THEN `check_domain` on it reports no errors
- AND `validate_knowledge` on `domaiNN_NN.md` returns `valid: true`
- AND `changes/` and `sources/import/` exist

#### Scenario: Sources model is scaffolded
- GIVEN an empty directory
- WHEN `init_domain` runs with `name: ACME`
- THEN `sources/sources_NN.md` exists and `validate_knowledge` on it returns `valid: true`
- AND it contains no Synchronization element

#### Scenario: Non-empty directory refused
- GIVEN a directory containing a file
- WHEN `init_domain` runs on it
- THEN it fails and writes nothing

#### Scenario: Models can be added next
- GIVEN a domain created by `init_domain`
- WHEN an `add_model` changeset is applied to it
- THEN the model is created under `kNNowledge/`
