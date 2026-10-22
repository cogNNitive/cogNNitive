---
title: About — iNNfo
description: Learn about iNNfo, the hub for the iNNfo ecosystem — the domain console, nn-core, nn-mcp, and the spec chain.
html_url: https://cognnitive.com/innfo/about
generator: https://cognnitive.com/skills/nn-design-presets
---

# About iNNfo

The monorepo that ties the iNNfo ecosystem together.

## Architecture

iNNfo is organized as an npm workspaces monorepo — two shared
packages and the spec chain:

```
iNNfo/
├── packages/
│   ├── nn-core/    // TS parser, resolver, validator
│   └── nn-mcp/     // MCP server for AI agents
├── specs/             // defiNNition, iNNfo, bluepriNNts, samples
└── docs/             // This website
```

## Domain console

domaiNN_console.html

### iNNfo domain console

One self-contained HTML file per domaiNN, generated locally by
`export-console.mjs` or the MCP `regenerate_console` tool. It
shows the domain's kNNowledge, its lineage and citations, and reviews it through
changesets. No server and no account are needed; open the file in a browser.

## Packages

@cognnitive/nn-core

### nn-core

Framework-agnostic TypeScript library: the iNNfo parser, document types (Concept,
Element, Field, Matrix, Relationship), IO drivers, a validator against blueprint
schemas, and a parent-spec-chain resolver. Both the domain console
tooling and the MCP server run on top of it.

@cognnitive/nn-mcp

### nn-mcp

A Model Context Protocol server (stdio) wrapping nn-core. It exposes a focused set
of semantic tools so any MCP-capable AI agent can read, validate, and
safely mutate iNNfo kNNowledge. Spec and bluepriNNt resolution follow the document's
`parent_spec` chain, with no hardcoded URLs. See the
[full tool reference](/innfo/documentation/#/nn-mcp) for the current list.

## Specifications

The ecosystem defines four specification levels, each building on the previous:

Level 0

### defiNNition

Meta-specification: structure, SemVer, RFC 2119. The root of the chain.

Level 1

### iNNfo

The central specification. A single-file `_NN.md` document with YAML
frontmatter, concepts, elements, fields, and matrices.

Level 2

### bluepriNNts

business, procedures, organization — each declares concepts, fields, and
relationship types on top of iNNfo.

Level 3

### kNNowledge

Concrete documents like Ghostbusters or Engineering Team. Lightweight — just data
and a `parent_spec` pointer.

## Open Knowledge Format alignment

iNNfo takes **conceptual inspiration** from
[OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(Open Knowledge Format) by Google Cloud Platform, and its architecture is aligned with
several of OKF's ideas. It is **not** natively OKF-compliant today: iNNfo
does not claim formal OKF v0.1 conformance, and a domaiNN is not an OKF knowledge bundle
as-is. Full OKF compatibility is planned for the future through a dedicated export
mechanism that will translate a domaiNN into an OKF bundle.

### Shared substrate

Both formats use Markdown files with YAML frontmatter as their core representation.
No proprietary tooling, no centralized schema registry — just text files in version
control. OKF's "if you can `cat` a file, you can read OKF" applies equally
to iNNfo.

### Conceptual alignment

An iNNfo domaiNN resembles the directory-of-Markdown-files structure that OKF calls a
*knowledge bundle*, and each `_NN.md` resembles an OKF concept
document. iNNfo's richer frontmatter — `spec_version`, `level`,
`parent_spec`, `knowledge_version` /
`blueprint_version` — is a superset of OKF's minimal metadata.

### Known gaps

The formats differ in granularity (an iNNfo document holds many concepts and
elements per file), in the `type` frontmatter convention, and in the
absence of a literal `index.md`. Until the export mechanism exists, treat
OKF as a design reference rather than a supported interchange format.

### Future export

100% OKF compatibility will be delivered by a dedicated export projection that maps
a domaiNN into an OKF bundle, rather than by making iNNfo's native structure
identical to OKF.

## Get in Touch

Contributions, questions, ideas — we're always open.

[Contact Us](https://cognnitive.com/contact)
https://cognnitive.com/contact
