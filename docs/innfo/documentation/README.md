# iNNfo Documentation

Welcome to the iNNfo documentation. iNNfo is the specification and tooling layer (`@cognnitive/nn-core` and `@cognnitive/nn-mcp`) that powers the cogNNitive ecosystem.

## Quick Start

```bash
# Install dependencies
npm install

# Build nn-core and the MCP server
npm run build -w @cognnitive/nn-core
npm run build -w @cognnitive/nn-mcp
```

## Sections

### [Offline consoles](offline-consoles)
The **domain console** — one self-contained `domaiNN_console.html` per domaiNN, generated locally. It shows the domain's kNNowledge and reviews it through changesets.

### [nn-core](nn-core)
`@cognnitive/nn-core` is the framework-agnostic TypeScript library shared across the ecosystem: parser, type definitions, validators (`validateKnowledge`, `validateBlueprint`), mutation and changeset engine, lineage and cognitivize helpers, and the `FsDriver` interface.

### [nn-mcp](nn-mcp)
`@cognnitive/nn-mcp` is an MCP server that exposes iNNfo kNNowledge documents, bluepriNNts and operations to AI coding agents (Claude Code, OpenCode, and others) over stdio.

### [Ecosystem](ecosystem)
The four-level specification chain:

| Level | Name | Description |
|-------|------|-------------|
| 0 | **defiNNition** | Meta-specification: structure, SemVer, RFC 2119 |
| 1 | **iNNfo** (and meta-bluepriNNt) | Central spec — single-file `_NN.md` documents |
| 2 | **bluepriNNts** | business, procedures, organization, and more |
| 3 | **kNNowledge** | Concrete instances (Ghostbusters, Code Review Process, Engineering Team) |

### [Specifications](specifications)
Complete listing of all specs and kNNowledge samples at every level, with links to source files.

### [Open Knowledge Format (OKF) alignment](ecosystem?id=open-knowledge-format-alignment)
iNNfo takes conceptual inspiration from OKF v0.1 by Google Cloud Platform and is architecturally aligned with its ideas. cogNNitive is **not** natively OKF-compliant today; full OKF compatibility is planned through a dedicated export mechanism.

### [Usage](usage)
How to author kNNowledge documents, use bluepriNNts, and work with the ecosystem.

### [iNNfo Agent (OpenCode)](opencode-nn-agent)
Connect the iNNfo MCP agent to OpenCode Desktop for natural-language kNNowledge editing.
