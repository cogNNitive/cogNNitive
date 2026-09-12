# Delta for Template Ecosystem Documentation

## ADDED Requirements

### Requirement: User-facing documentation uses `app` for the Level-2 schema sense

`iNNfo`, `actioNN`, and `docs/` user-facing documentation MUST refer to the Level-2 schema (`_spec_NN.md` pinned by `parent_spec`) as **app**, not **template**, when describing it conceptually. Technical identifiers (paths, URLs, tool names, manifest keys, tags) MUST remain unchanged. The dictionary in `canonical-vocabulary` is the authoritative source for the term and its deprecated alias.

The documentation MUST NOT rename nn-trannsform's own transformation-template concept (`traNNsformations/`), Vue SFC `<template>` syntax, or generic English usage.

#### Scenario: Docs prose uses app for the schema sense

- GIVEN a user-facing doc describing how a model pins its schema
- WHEN the doc is reviewed after this change
- THEN the conceptual term is `app`
- AND `template` appears only as a documented deprecated alias reference, if at all

#### Scenario: Tool names unchanged in docs

- GIVEN `docs/use/manifest.md` or MCP README prose
- WHEN it references an MCP tool or manifest key
- THEN the identifier (`get_template`, `templates:` etc.) is written verbatim, not renamed

#### Scenario: nn-trannsform transformation templates untouched

- GIVEN `nn-trannsform` documentation describing its transformation pipeline
- WHEN reviewed after this change
- THEN its own `template` concept (`traNNsformations/`) is unchanged

## MODIFIED Requirements

### Requirement: eNNvironment Manifest Specification Parity

`eNNvironment` documentation (`docs/use/manifest.md`) MUST be updated to specify how `agent-bootstrap` manifests integrate with template package structure, version pinning, and multi-tier resolution order. After this change, prose describing the schema concept uses **app**; the `templates:` section key, `ref_key: templates`, and `templates-v*` tags remain unchanged.
(Previously: used `template` throughout; identifiers unchanged)

#### Scenario: Updating agent-bootstrap manifest docs in eNNvironment

- GIVEN `docs/use/manifest.md` in `eNNvironment`
- WHEN updated for template packaging
- THEN schema specifications for `templates` entries, local caching in `~/.agents/templates/`, and version verification rules are fully documented
- AND conceptual prose uses `app` for the Level-2 schema sense
- AND `templates:` / `ref_key: templates` / `templates-v*` identifiers are written verbatim