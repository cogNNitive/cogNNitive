# Using AI with iNNfo Models in iNNfo

To work with iNNfo models from your AI agent (OpenCode Desktop, Claude Code, etc.), you need the **actioNN suite** — a collection of agent skills that teach the AI how to create, edit, validate, and transform iNNfo documents.

## Quick Start

1. **Install the actioNN bundle** in your OpenCode Desktop workspace:

   ```bash
   git clone https://github.com/iNNfo/actioNN.git ~/.agents/skills/actioNN
   ```

   Or via junction/symlink for live updates:

   ```bash
   # Windows (NTFS junction)
   mklink /J "%USERPROFILE%\.agents\skills\actioNN" "path\to\actioNN"
   ```

2. **Ensure the MCP server is available** — the skills need `innfo-mcp` to resolve specs and validate models:

   ```bash
   cd ~/.agents/skills/actioNN
   node scripts/update-mcp.js
   ```

3. **Open the project** in OpenCode Desktop  the skills auto-load based on file context (e.g., editing a `_NN.md` triggers `nn-innfo`).

## What you get

| Skill | Trigger | What it does |
|-------|---------|-------------|
| `nn-router` | `/nn-router` or mentioning "innfo" | Entry point — routes to the right skill |
| `nn-innfo` | Editing `*_NN.md` files | Create, edit, validate iNNfo models |
| `nn-trannsform` | `/nn-trannsform` | Unified ingestion, transformation & multi-step procedure orchestrator (`procedures_V_0-2-0_NN.md`) |
| `nn-skills-lifecycle` | `/nn-skills-lifecycle` | Install, audit, maintain skills |
| `nn-site-generator` | `/nn-site-generator` | Generate docs sites |
| `nn-design-presets` | Auto on web/design files | Visual design tokens |

## How it works

```
AI Agent ? actioNN (instructions) ? innfo-mcp (MCP server) ? @cognnitive/innfo-core (engine)
                                                                      ?
                                                          Public iNNfo Specs on GitHub
```

- The MCP server (`innfo-mcp`) wraps `@cognnitive/innfo-core` from this repo
- The agent delegates all resolution, validation, and mutation to the MCP � never hand-rolls
- Specs are fetched at runtime from `iNNfo/specs/` (immutable, filename-versioned) — no duplication

## Developing iNNfo

If you are **developing** iNNfo itself (modifying innfo-core, innfo-mcp, or the editor), the MCP server is available locally:

```bash
npm run build --workspace=packages/innfo-mcp
```

This builds `packages/innfo-mcp/bin/innfo-mcp.bundle.js` which the local `opencode.json` registers.

For agent interaction with iNNfo models, still install actioNN � the skills contain the interaction patterns that the local MCP registration does not replace.
