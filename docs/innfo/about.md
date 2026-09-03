---
title: About — iNNfo
description: Learn about iNNfo, the hub for the iNNfo ecosystem — the iNNfo Modeler, innfo-core, innfo-mcp, and the spec chain.
html_url: https://innfo.cognnitive.com/about
generator: https://actionn.cognnitive.com/nn-design-presets
---

# About iNNfo

The monorepo that ties the iNNfo ecosystem together.

## Architecture

npm workspaces monorepo — one editor app, two shared packages, and the spec chain:

```
iNNfo/
├── apps/
│   └── innfo-editor/     ← Vue 3 workspace editor (the iNNfo Modeler)
├── packages/
│   ├── innfo-core/       ← TS parser, resolver, validator
│   └── innfo-mcp/        ← MCP server for AI agents
├── specs/                ← defiNNe, iNNfo, templates, samples
└── docs/                 ← This website
```

## App

**iNNfo Modeler** (`@cognnitive/innfo-editor`) — a Vue 3 workspace editor:
- File System Access API to open a workspace folder
- Single recursive parse pass into one normalized model graph
- Block sheets, a table view, and metamodel-driven forms for editing
- Automatic validation against the iNNfo spec on every parse
- Graph viewer, matrix grids, and an AI-guidance sidebar
- IndexedDB handle persistence for a fast reopen

## Packages

**@cognnitive/innfo-core** — framework-agnostic TypeScript library with:
- The iNNfo parser
- Model types (Concept, Element, Field, Marker, Matrix, Relationship)
- IO drivers for the browser and Node
- Validator against template schemas
- Parent-spec-chain resolver

**@cognnitive/innfo-mcp** — a Model Context Protocol server (stdio) wrapping innfo-core. Exposes seven semantic tools — `list_models`, `read_model`, `get_spec`, `get_template`, `validate_model`, `apply_change`, `validate_model_url` — so any MCP-capable AI agent can read, validate, and safely mutate iNNfo models.

## Specifications

- **Level 0: defiNNe** — Meta-specification (structure, SemVer, RFC 2119)
- **Level 1: iNNfo** — Central spec; single-file `_NN.md` models with YAML frontmatter
- **Level 2: Templates** — business, procedures, organization
- **Level 3: Models** — Concrete data instances (Ghostbusters, Engineering Team)

## Open Knowledge Format compatibility

iNNfo is **100% compatible** with [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (Open Knowledge Format) by Google Cloud Platform. Every iNNfo document is a valid OKF knowledge bundle:

- **Shared substrate**: Both use Markdown + YAML frontmatter. No proprietary tooling.
- **Conformance**: OKF's three conformance rules (parseable frontmatter, non-empty `type`, reserved filenames) are fully met by iNNfo's structure.
- **Tolerant extensions**: OKF explicitly tolerates unknown frontmatter keys and unknown `type` values — iNNfo's richer metadata (`spec_version`, `level`, `parent`, `concepts`, `markers`, `matrices`) is fully compatible.
- **A workspace = an OKF Bundle**: an iNNfo workspace produces exactly the directory tree OKF defines as a knowledge bundle. Each `_NN.md` is an OKF concept document.

[Home](https://innfo.cognnitive.com/)
