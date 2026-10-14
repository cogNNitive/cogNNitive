# domain-initialization Specification

## Purpose
TBD - created by archiving change 2026-10-13-s6-console-regeneration-and-propose. Update Purpose after archive.
## Requirements
### Requirement: `init_domain` scaffolds an empty conformant domaiNN

The MCP MUST expose `init_domain` (`dir`, `name`, optional `workspace_id`) that creates
an empty domaiNN container from one pure scaffold plan (`planDomainScaffold` in
`innfo-core`). It MUST refuse a `dir` that exists and is not empty. The plan MUST create
`kNNowledge/`, `sources/import/`, `sources/conversations/`, `conversations/`,
`artifacts/`, `procedures/`, `staging/` and `changes/`; a `.gitattributes` holding
`* -text`; and `domaiNN_NN.md`, a Level-3 document of the `domaiNN` bluepriNNt
(`level: 3`, `parent_spec` with `name: domaiNN` and the canonical bluepriNNt URL,
`knowledge_version: V_0-1-0`, `title`, `workspace_id` defaulting to the slug of `name`)
carrying the document notice and no kNNowledge entries. `init_domain` is not a changeset:
a changeset lives inside a domain, and the manifest is the record of the domain.

#### Scenario: Fresh domain is accepted
- GIVEN an empty directory
- WHEN `init_domain` runs with `name: ACME`
- THEN `check_domain` on it reports no errors
- AND `validate_knowledge` on `domaiNN_NN.md` returns `valid: true`
- AND `changes/` and `sources/import/` exist

#### Scenario: Non-empty directory refused
- GIVEN a directory containing a file
- WHEN `init_domain` runs on it
- THEN it fails and writes nothing

#### Scenario: Models can be added next
- GIVEN a domain created by `init_domain`
- WHEN an `add_model` changeset is applied to it
- THEN the model is created under `kNNowledge/`

### Requirement: Import-as-source reuses the domain scaffold

`migrate-domain.js --import-as-source --new-domain-dir <dir>` MUST create the new domain
from the same `planDomainScaffold` plan and MUST copy the old domain into
`sources/import/<old-domain-folder>/` (the canonical raw-import location). It MUST NOT
write its own manifest and MUST NOT create `sources/legacy/`. Migrating content is the
agent's job through changesets: `add_model` and `add_element` changes whose `sources`
cite files under the imported folder. No further migration code exists.

#### Scenario: Imported domain is canonical
- GIVEN an old domain directory
- WHEN `--import-as-source` runs into an empty target
- THEN the target matches a fresh `init_domain` scaffold plus `sources/import/<old-domain-folder>/`
- AND no `sources/legacy/` directory exists

#### Scenario: Migration changes cite the old domain
- GIVEN an imported old domain
- WHEN an `add_model` change carries `sources:: sources/import/old/kNNowledge/strategy_NN.md`
- THEN the citation resolves through `createFsSourceResolver`

