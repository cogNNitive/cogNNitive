# cogNNitive

> Semantic Knowledge Architecture and AI Pair-Programming Ecosystem

Welcome to the **cogNNitive** monorepo. This repository contains the unified specification, tooling, and agent skills that power semantic modeling, procedure orchestration, and knowledge architecture.

## Repository Structure

```text
cogNNitive/
├── docs/             # Public website (https://cognnitive.com) & agent bootstrap (/use)
│   ├── innfo/        # Documentation for iNNfo editor & core
│   ├── actionn/      # Documentation for skills catalog
│   └── use/          # Universal AI Agent manifest & bootstrap
├── iNNfo/            # Semantic modeling layer
│   ├── apps/         # innfo-editor (Vue/Vite web application)
│   ├── packages/     # innfo-core (pure TS semantic engine) & innfo-mcp (MCP server)
│   └── specs/        # Canonical iNNfo specifications, templates, and samples
├── actioNN/          # Agent capabilities layer
│   ├── skills/       # Agent skills (nn-innfo, nn-trannsform, nn-preflight, etc.)
│   └── scripts/      # Workflow and skill execution tooling
├── openspec/         # Cross-system architecture RFCs and formal specifications
└── scripts/          # Workspace maintenance and verification scripts
```

## AI Agent Bootstrap

If you are an AI Agent (Claude Code, Antigravity, OpenCode, Cursor):
- Bootstrap entrypoint: [https://cognnitive.com/use](https://cognnitive.com/use) (served from `docs/use/manifest.md`)
- Semantic model entrypoint: `workspace_NN.md`

## Development & Philosophy

1. **Concepts > Code:** Strict semantic modeling with clear invariants.
2. **Fail-Fast:** No silent fallbacks. Unmatched schemas fail deterministically with actionable guidance.
3. **Local-First:** Local workspace specifications take precedence over remote references. Remote references resolve to immutable tagged releases, never moving branches.
4. **On-Demand Dependencies:** Skills declare their dependencies declaratively; agent environments install them on-demand without bloating the core repository.
