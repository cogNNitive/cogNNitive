---
title: "iNNfo — The Knowledge Modeling Hub"
description: "Model, edit, and validate knowledge models with the domain console and your AI coding agent of choice (OpenCode Desktop, Google Antigravity, Claude Code, Cursor, Codex)."
---

# Transform your documentation into structured, validated knowledge models.

Model, edit, and query knowledge visually in your browser or conversationally with your AI coding agent of choice (OpenCode Desktop, Google Antigravity, Claude Code, Cursor, Codex).

- [Explore Documentation](https://cognnitive.com/innfo/documentation/)

---

## What You Can Do With iNNfo

- **Visual Modeling**: Explore your documentation as interactive graph trees, block sheets, matrices, and visual diagrams.
- **Automatic Validation**: Catch broken links, missing properties, and outdated specs automatically as you edit.
- **AI & Console Editing**: Edit visually in the single-file domain console (`domaiNN_console.html`) or ask your AI coding agent (OpenCode Desktop, Claude Code, Antigravity, Cursor) to create and update kNNowledge for you.

---

## Information & Engine Architecture

```mermaid
flowchart TD
    subgraph Step1["Step 1: Ingestion & Setup"]
        U["👤 User & AI Agent\n(OpenCode, Antigravity, Claude Code)"] -->|Bootstrap Prompt| Router["⚡ Agent Skills (Router & nn-sources)"]
        RawDocs["📄 Raw Documents (PDF, DOCX)"] --> Router
    end

    subgraph Step2["Step 2: Validation & Engine"]
        Router --> Knowledge["📘 kNNowledge (_NN.md)"]
        Knowledge <--> MCP["⚙️ nn-mcp Server + nn-core Engine"]
    end

    subgraph Step3["Step 3: Delivery & Access"]
        MCP <--> Console["🖥️ Domain Console (domaiNN_console.html)"]
        MCP <--> AgentChat["💬 Conversational Queries & MCP Tools\n(OpenCode, Antigravity, Claude Code)"]
    end

    subgraph Step4["Step 4: Artifact Generation"]
        Console & AgentChat --> Artifacts["📊 Final Deliverables\n(Visual Dashboards, Exec Summaries, Scripts)"]
    end
```

---

## Use iNNfo with Your AI Coding Agent

1. **Choose Your AI Agent**: Launch OpenCode Desktop (recommended reference desktop client) or use Google Antigravity, Claude Code, Cursor, or Codex CLI.
2. **Open Your Project**: Open the workspace folder containing your documentation and models.
3. **Prompt Your Agent**: Tell your agent: `I want to use https://cognnitive.com/use`
4. **Create & Edit kNNowledge**: Ask your agent to create an iNNfo kNNowledge document, validate documentation, or explore structures.
