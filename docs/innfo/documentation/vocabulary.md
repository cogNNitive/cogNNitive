# Vocabulary: Canonical Terms

The cogNNitive ecosystem pins a canonical vocabulary so every editor label, doc, and
skill refers to the same concept by the same name. The authoritative source is the
machine-readable dictionary at
[`iNNfo/specs/vocabulary.json`](https://github.com/cogNNitive/cogNNitive/blob/main/iNNfo/specs/vocabulary.json);
this page is the human-readable rendering of it.

## The canonical term: **App**

**app** is the canonical, user-facing name for the **Level-2 schema** — the
`_spec_NN.md` document pinned by a model's `parent_spec` (for example `business`,
`organization`, `procedures`). Use **app** when describing the Level-2 schema
conceptually.

| Field | Value |
|-------|-------|
| Canonical term | **app** |
| Sense | Level-2 schema (`_spec_NN.md` pinned by `parent_spec`) |
| Status | canonical (adopted) |

## Deprecated alias: **template**

**template** is the former name for the Level-2 schema. It remains a **documented
deprecated alias** for one release window: it is still understood, still resolves, and
still appears inside technical identifiers, but user-facing copy should use **app**.

> Deprecation lifecycle: `app` is canonical; `template` is accepted as a documented
> deprecated alias for one release, then removed from user-facing copy. Technical
> identifiers are NOT renamed in this change.

## Excluded senses

The rename does **not** touch these other senses of the word "template":

| Excluded sense | Example |
|----------------|---------|
| nn-trannsform transformation templates | `traNNsformations/`, CLI `--apply <name>` |
| Vue SFC `<template>` blocks | `<template>` markup in `.vue` files |
| Generic English usage | "a template for a document", "sample template" |

## Stable identifiers (NOT renamed)

The following identifiers are resolution-bearing and stay **byte-identical** during
the user-facing rename. They are recorded here so the deprecation contract is auditable:

- `specs/templates/` — template directory paths
- `template_version` / `template_name` — frontmatter and field identifiers
- `get_template` — MCP tool name
- `templates:` — manifest section key
- `ref_key: templates` — manifest reference key
- `templates-v*` — immutable version tags
- `SHIPPED_TEMPLATE_VERSIONS` — engine keys
- `parent_spec.url`, `spec_url` — spec URL fields

## Planned migrations

The following identifier migrations are planned but **out of scope** for the
user-facing rename. They are tracked as a future mechanical migration (see the
cogNNitive backlog):

- `specs/templates/` → `specs/apps/`
- MCP tool names (e.g. `get_template`)
- manifest `templates:` key
- `templates-v*` tags

## Consumer notes

- **Editor labels** read `vocabulary.json` (read-only) to drive user-facing copy.
- **Skill copy** references the same dictionary for consistency.
- `iNNfo/AGENTS.md` mirrors this page in its Ubiquitous Language glossary block.