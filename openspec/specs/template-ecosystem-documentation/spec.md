# Template Ecosystem Documentation Synchronization

## Purpose

Synchronize technical specifications and user-facing documentation across `iNNfo`, `actioNN`, and `eNNvironment` to accurately reflect template packaging, composition collision handling, procedure/skill discovery, and bootstrap manifest integration.

## Requirements

### Requirement: iNNfo Metamodeling Core & MCP Documentation

`iNNfo` documentation MUST be updated to formalize template package layout specs (`docs/template-package-spec.md`) and document all new MCP tools (`list_templates`, `hydrate_template`, `prune_orphaned_specs`, `list_template_procedures`, `list_template_skills`) alongside composition `alias` mapping schemas in `packages/innfo-mcp/README.md`.

#### Scenario: Template package spec documentation updated
- GIVEN `docs/template-package-spec.md` in `iNNfo`
- WHEN updated for template packaging
- THEN it details the `specs/templates/<name>/<version>/` directory structure and package contents (`spec_NN.md`, `samples/`, `procedures/`, `skills/`)

#### Scenario: MCP Server README updated with tool endpoints and frontmatter schemas
- GIVEN `packages/innfo-mcp/README.md`
- WHEN updated for `template-package-and-composition`
- THEN all new tool parameters, default options (`dry_run: true`, `backup: true`), and composition `alias` YAML frontmatter examples are documented

---

### Requirement: actioNN Lifecycle Documentation Parity

`actioNN` documentation (`docs/skills-manager.md` and `AGENTS.md`) MUST document dynamic discovery of procedures and skills from Level 2 templates and execution routing via `nn-innfo`.

#### Scenario: Documenting dynamic SOP and skill discovery in actioNN
- GIVEN `docs/skills-manager.md` and `AGENTS.md` in `actioNN`
- WHEN updated for template dynamic discovery
- THEN instructions detail how `nn-innfo` interacts with `innfo-mcp` to resolve procedures and skills from composite template trees

---

### Requirement: eNNvironment Manifest Specification Parity

`eNNvironment` documentation (`docs/use/manifest.md`) MUST be updated to specify how `agent-bootstrap` manifests integrate with template package structure, version pinning, and multi-tier resolution order. After this change, prose describing the schema concept uses **app**; the `templates:` section key, `ref_key: templates`, and `templates-v*` tags remain unchanged.

#### Scenario: Updating agent-bootstrap manifest docs in eNNvironment
- GIVEN `docs/use/manifest.md` in `eNNvironment`
- WHEN updated for template packaging
- THEN schema specifications for `templates` entries, local caching in `~/.agents/templates/`, and version verification rules are fully documented
- AND conceptual prose uses `app` for the Level-2 schema sense
- AND `templates:` / `ref_key: templates` / `templates-v*` identifiers are written verbatim

---

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
