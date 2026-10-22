# site-blueprint Specification

## Purpose
Defines the domaiNN-local `site` bluepriNNt that models a public site as kNNowledge: the `Site` and `Page` elements, page kinds, slug and order constraints, citation sources, document naming, and isolation from the shipped bluepriNNt distribution. The bluepriNNt lives inside the `site_NN/` domaiNN and is NOT shipped under `iNNfo/specs/bluepriNNts/`.
## Requirements
### Requirement: Domain-local bluepriNNt resolution

The `site_NN/` domaiNN root MUST declare `knowledge_dir:: kNNowledge/` and
`blueprints_dir:: specs/bluepriNNts/`, and every `site` kNNowledge document MUST resolve its
`parent_spec.url` (relative to the workspace root, inside it) to
`site_NN/specs/bluepriNNts/site/spec_NN.md`. Both nn-core validation and MCP validation
MUST accept that local resolution without network access. The proof MUST be a vitest spec
at `iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts` that runs `validateKnowledge`
against `site_NN/`.

#### Scenario: nn-core validates a local-bluepriNNt document

- GIVEN `site_NN/domaiNN_NN.md` declares `blueprints_dir::` and a Page document whose
  `parent_spec.url` is the local `site` spec
- WHEN the document is parsed and validated with nn-core
- THEN validation reports no unresolved-bluepriNNt error

#### Scenario: MCP validates a local-bluepriNNt document

- GIVEN the same domaiNN and no network access
- WHEN the MCP validation tool is run on the Page document
- THEN it resolves the local spec first and reports no unresolved-bluepriNNt error

#### Scenario: Resolution failure stops the change (fallback B)

- GIVEN nn-core or MCP rejects the local `parent_spec.url`
- WHEN the slice-1 resolution test runs
- THEN the failing test records the rejection reason
- AND no later slice of this change is applied until fallback B is chosen explicitly

### Requirement: Site and Page model

The `site` bluepriNNt MUST define exactly two element types: `Site` (singleton) and
`Page`. It MUST NOT define `Section` or `Navigation` elements.

- `Site` (name = site title) MUST carry required `tagline` (string) and `base_url`
  (string, absolute, ending in `/`), and MAY carry `repository_url`.
- `Page` (name = page title; there is no `title` field) MUST carry `kind`, `order`
  (integer) and `summary` (string), MAY carry `sources`, and has a prose body. Its URL
  slug is the reserved element property `slug::` (see "Slug and order constraints").

A domaiNN MUST contain exactly one `Site` element, held in `kNNowledge/site_NN.md`.

nn-core has no required-field or singleton mechanism, so required-ness (`tagline`, `base_url`,
`kind`, `order`, `summary`) and the Site singleton are enforced by the site model check
(`loadSite`, Slice 3a), not by `validateKnowledge`. `sources` is the reserved citation
property, not a Field declared by the bluepriNNt. The only inline `validateKnowledge`
rejection of Page data is the `kind` select.

#### Scenario: A conforming Page validates

- GIVEN a Page `## NN Page: Install` with `slug:: install`, `kind`, `order` and `summary`
- WHEN the document is validated against the `site` bluepriNNt
- THEN validation passes

#### Scenario: A Page missing a required field is rejected

- GIVEN a Page with no `summary`
- WHEN the site model check (`loadSite`, Slice 3a) runs
- THEN it fails and names the missing field `summary`

#### Scenario: A relative base_url is rejected

- GIVEN a Site with `base_url:: /next`
- WHEN the compiler or the site model check reads it
- THEN it fails because `base_url` is not absolute and slash-terminated

#### Scenario: A second Site element is rejected

- GIVEN a document with two `Site` elements
- WHEN the site model check (`loadSite`, Slice 3a) runs
- THEN it fails with a singleton violation

### Requirement: Page kind set

`Page.kind` MUST be a select limited to `tutorial`, `guide`, `concept`, `reference`,
`pitch` and `legal`. Any other value MUST fail validation. Legal, privacy and contact
content MUST use `kind: legal`.

#### Scenario: Each kind is accepted

- GIVEN six Pages, one per allowed `kind`
- WHEN the domaiNN is validated
- THEN all six pass

#### Scenario: An unknown kind is rejected

- GIVEN a Page with `kind: blog`
- WHEN the document is validated
- THEN validation fails and lists the allowed kinds

### Requirement: Slug and order constraints

The Page slug MUST be given with nn-core's reserved element property `slug::`; the
bluepriNNt MUST NOT declare `slug` as a Field. The slug MUST match
`^[a-z0-9]+(-[a-z0-9]+)*$`, MUST be unique across the whole domaiNN, and exactly one Page
MUST have the slug `index` (the home Page). `Page.order` MUST be an integer. Site-wide
uniqueness and the single `index` MUST be enforced by the compiler (see `site-compiler`)
because nn-core only enforces per-document uniqueness.

#### Scenario: A malformed slug is rejected

- GIVEN a Page with `slug:: Getting Started`
- WHEN the site model is loaded
- THEN it fails on the slug pattern

#### Scenario: The blueprint does not declare slug

- GIVEN `site_NN/specs/bluepriNNts/site/spec_NN.md`
- WHEN its Page fields are listed
- THEN no Field named `slug` exists

#### Scenario: Missing or duplicate index

- GIVEN a domaiNN with no Page slugged `index`, or with two
- WHEN the site model is loaded
- THEN it fails naming the problem

### Requirement: `sources` reserved for citations

`Page.sources` MUST hold only citations in the form `<path>@<unit>`, written as ONE bracketed,
comma-separated list: `[<path>@<unit>, <path>@<unit>]` (nn-core splits a bracketed list on
commas, so separate brackets would corrupt the citations). The
bluepriNNt MUST NOT define a `source` field on `Page` or `Site`. Free-text references
MUST NOT be stored in `sources`.

#### Scenario: A non-citation value in `sources` is rejected

- GIVEN a Page with `sources:: see the README`
- WHEN the site model check (`loadSite`, Slice 3a) runs
- THEN it fails because the value is not a citation token

#### Scenario: A resolvable header-unit citation passes

- GIVEN a Page with `sources:: [sources/import/code-facts/mcp-tools_<stamp>.md@## innfo_validate]`
  (`<stamp>` = `YYYYMMDDTHHMMSSZ`) and that heading exists in the file
- WHEN `validateCitations` runs
- THEN it reports no `KU_UNKNOWN_SLUG` error

### Requirement: Document naming and encoding

Every `site` kNNowledge document MUST live under `site_NN/kNNowledge/`: `site_NN.md` for
the Site singleton and one `<kind>_site_NN.md` per kind for Pages. The files MUST be valid UTF-8 with no U+FFFD. The
bluepriNNt MUST NOT use retired keys (`template_version`, `models_dir`, `type:: model`).

#### Scenario: A misnamed document fails the name guard

- GIVEN `site_NN/kNNowledge/Pages_NN.md`
- WHEN the nn-name-invariant guard runs
- THEN it fails and requires the `site_NN.md` / `<kind>_site_NN.md` naming

#### Scenario: A conforming domaiNN passes the repo guards

- GIVEN the full `site_NN/` tree
- WHEN the name-invariant, text-encoding and legacy-write guards run
- THEN all pass

### Requirement: Prose-safe body convention

Because nn-core reads any `key:: value` line after a heading as a field (even mid-prose
or inside a code fence) and silently drops repeated element names within one document, the
seed content MUST use one kNNowledge document per `kind`, and only the contiguous `key::`
block immediately after a Page heading MAY contain `key::` lines. Any later line matching
`^\s*[\w-]+::\s`, including inside fences, MUST be rejected.

#### Scenario: A prose line that looks like a field is detected

- GIVEN a Page body containing the line `note:: remember this` (also when inside a fence)
- WHEN the site model is loaded
- THEN it reports the line as an ambiguity and fails

#### Scenario: Duplicate element names are detected

- GIVEN one document with two Pages sharing the same element name
- WHEN the compiler reads the domaiNN
- THEN it fails and names the duplicate rather than silently dropping a Page

### Requirement: Seed content coverage

The domaiNN MUST ship at least one Page of each of the six `kind` values, and at least
one `reference` Page whose `sources` cites a header unit of a code-fact snapshot. Seed
Pages MUST be written for the primary reader: an end user who installs the skills and MCP
and creates a domaiNN.

#### Scenario: Every kind is represented

- GIVEN the seed domaiNN
- WHEN the content test groups Pages by `kind`
- THEN each of the six kinds has at least one Page

#### Scenario: A reference Page cites a snapshot

- GIVEN the seed domaiNN
- WHEN the content test inspects `reference` Pages
- THEN at least one has a `sources` entry pointing at a `code-facts` snapshot header unit
- AND `validateCitations` passes for it

### Requirement: Isolation from shipped bluepriNNt distribution

This change MUST NOT add a `site` folder under `iNNfo/specs/bluepriNNts/`, MUST NOT edit
`manifest/source.yaml` or `catalog.json`, and MUST NOT require a `blueprints-v*` tag.

#### Scenario: No distribution file changes

- GIVEN the change branch compared with its base
- WHEN the diff is inspected for the protected paths
- THEN `iNNfo/specs/bluepriNNts/`, `manifest/source.yaml`, `catalog.json`, `build-docs.mjs`,
  CI workflows and release tooling show no changes

### Requirement: Procedure documents

The `site` bluepriNNt MUST ship `procedures/compile_site_procedures_NN.md` (the
`compile-site` procedure, with `tool:: scripts/site/compile-site.mjs`, repo-relative) and
`procedures/usage_procedures_NN.md`. It MUST also ship `assets/shell.html` (slots
`{{title}} {{description}} {{site}} {{tagline}} {{nav}} {{content}} {{sources}}`) and
`assets/site.css`.

#### Scenario: The procedure names an existing tool

- GIVEN `compile_site_procedures_NN.md`
- WHEN its `tool::` value is resolved relative to the repository root
- THEN `scripts/site/compile-site.mjs` exists

#### Scenario: Shell and CSS exist

- GIVEN the `site` bluepriNNt folder
- WHEN `assets/` is listed
- THEN `shell.html` and `site.css` are present and the shell contains the seven slots

#### Scenario: The usage procedure exists

- GIVEN the `site` bluepriNNt folder
- WHEN the usage-procedure check inspects it
- THEN `procedures/usage_procedures_NN.md` is present
