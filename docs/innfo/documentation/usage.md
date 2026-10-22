# Usage Guide

## Creating an iNNfo kNNowledge document

An iNNfo kNNowledge document is a single Markdown file (`_NN.md`) with YAML frontmatter following the spec chain conventions. Files live in the domaiNN's `kNNowledge/` folder and are named `<Name>_<blueprint>_NN.md` — the version is carried by `knowledge_version`, never by a `_V_` token in the filename.

```markdown
---
level: 3
parent_spec:
  name: "business_V_0-5-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/business/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "My kNNowledge"
---

# NN Strategy

## NN Strategy: Core Objective
slug:: core-objective
tags:: [priority]
Build the next generation of...

# NN Metrics

## NN Metrics: KPI
slug:: monthly-active-users
Monthly active users
```

Concepts are `# NN <Concept>` headings, elements are `## NN <Concept>: <Element>` headings, fields are `key:: value` lines, and the free text after the field lines is the element body. Element and field names must come from the parent bluepriNNt. In `iNNfo_V_0-5-0` there is no `Marker` primitive: categorise with the built-in `tags` Field instead.

## bluepriNNts

Level 2 bluepriNNts declare the concepts, fields, and relationship types available to a kNNowledge document:

- **business** — business strategy modeling
- **procedures** — workflows, SOPs, processes
- **organization** — organizational structure modeling

See the [bluepriNNts overview](templates) for the full catalog.
## Working with the ecosystem

1. Create or open a domaiNN folder and let your AI agent author the kNNowledge through [nn-mcp](nn-mcp).
2. Generate the domain console (`domaiNN_console.html`) with `export-console.mjs` or the MCP `regenerate_console` tool and open it in a browser; see [offline consoles](offline-consoles).
3. Validation runs on every write through [nn-mcp](nn-mcp) (`validate_knowledge`).
4. Reviewers export `changes/*_changes_NN.md` changesets, which you apply with `apply_change`; see the [reviewer guide](reviewer-guide).
5. Change kNNowledge through the agent or a changeset, not by hand; see [editing kNNowledge by hand](manual-editing-risks).

## Generating the console

```bash
# From the iNNfo repo root
node scripts/export-console.mjs <domainRoot> --domain
```

The command writes `domaiNN_console.html` at the domain root; open it in a browser.
