---
title: "cogNNitive — Agent Skills"
description: "Modular agent skills that give AI agents specialized capabilities: iNNfo kNNowledge authoring, source ingestion, site generation, design presets, and lifecycle governance."
---

# Modular skills that give your AI agent specialized powers.

Teach your AI agent domain capabilities: iNNfo kNNowledge authoring, source ingestion, site generation, design presets, and skills lifecycle governance.

- [Read the docs](https://cognnitive.com/innfo/documentation/)
- [Explore Skills Documentation](https://cognnitive.com/skills/documentation/)

---

## Featured Skills

- **nn**: Front controller and system governance. Handles setup, the environment readiness gate (Preflight), and routes requests to the right skill.
- **nn-innfo**: Author, edit, and validate iNNfo kNNowledge and bluepriNNts, including the conversational kNNowledge Creation Wizard.
- **nn-sources**: Multi-modal document ingestion (PDF, DOCX, XLSX), normalization, and multi-step procedure execution.
- **nn-site-generator**: Static website generation, markdown twin hydration, and Docsify documentation suites.
- **nn-design-presets**: Complete design system with the Morado Nazareno palette, systematic typography, and an 8px grid.
- **nn-skills-lifecycle**: Skill ecosystem lifecycle, manifest pinning, and lockfile auditing.

---

## Skills Integration Architecture

```mermaid
flowchart TD
    subgraph Step1["Step 1: Ingestion & Setup"]
        U["👤 User in OpenCode"] -->|Bootstrap Prompt| Router["⚡ Agent Skills (Router & nn-sources)"]
        RawDocs["📄 Raw Documents (PDF, DOCX)"] --> Router
    end

    subgraph Step2["Step 2: Validation & Engine"]
        Router --> Knowledge["📘 kNNowledge (_NN.md)"]
        Knowledge <--> MCP["⚙️ nn-mcp Server + nn-core Engine"]
    end

    subgraph Step3["Step 3: Delivery & Access"]
        MCP <--> Console["🖥️ Domain Console (domaiNN_console.html)"]
        MCP <--> AgentChat["💬 OpenCode Conversational Queries"]
    end

    subgraph Step4["Step 4: Artifact Generation"]
        Console & AgentChat --> Artifacts["📊 Final Deliverables\n(Visual Dashboards, Exec Summaries, Scripts)"]
    end
```

---

## How to Install & Use (OpenCode)

1. **Tell Your OpenCode Agent**: Say the single bootstrap phrase in OpenCode Desktop chat: `I want to use https://cognnitive.com/use`
2. **Skills Installed Automatically**: OpenCode fetches the manifest, downloads all skills from GitHub, and presents an interactive workflow menu.
