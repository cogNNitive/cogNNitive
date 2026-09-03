---
title: "actioNN — AI Agent Skills"
description: "Modular skills ecosystem for AI agents in OpenCode. Model Router, Skills Manager, traNNsform, and Web Design Guide."
---

# Modular skills that give your OpenCode agent specialized powers.

Teach your AI agent domain capabilities: model evaluation, skills management, document transformation, and web design.

- [Open iNNfo Modeler App](https://cognnitive.com/innfo/app/)
- [Explore Skills Documentation](https://cognnitive.com/actionn/documentation/)

---

## Featured Skills

- **Model Router**: Evaluates whether the AI model you are using is the right fit for each task. Recommends the optimal model based on cost and capability.
- **Skills Manager**: Meta-skill that manages all skills in your repository. Scans, checks installation integrity, and manages skill lifecycles.
- **traNNsform**: Document ingestion and transformation pipeline. Converts PDFs, DOCX, and spreadsheets into structured Markdown.
- **Web Design Guide**: Complete design system with Morado Nazareno palette and presets for building responsive sites and Docsify documentation.

---

## Skills Integration Architecture

```mermaid
flowchart TD
    subgraph Step1["Step 1: Ingestion & Setup"]
        U["👤 User in OpenCode"] -->|Bootstrap Prompt| Router["⚡ actioNN Skills (Router & traNNsform)"]
        RawDocs["📄 Raw Documents (PDF, DOCX)"] --> Router
    end

    subgraph Step2["Step 2: Validation & Engine"]
        Router --> Models["📘 Structured Models (_NN.md)"]
        Models <--> MCP["⚙️ innfo-mcp Server + Core Engine"]
    end

    subgraph Step3["Step 3: Delivery & Access"]
        MCP <--> Modeler["🛠️ iNNfo Modeler App (Web Editor)"]
        MCP <--> AgentChat["💬 OpenCode Conversational Queries"]
    end

    subgraph Step4["Step 4: Artifact Generation"]
        Modeler & AgentChat --> Artifacts["📊 Final Deliverables\n(Visual Dashboards, Exec Summaries, Scripts)"]
    end
```

---

## How to Install & Use (OpenCode)

1. **Tell Your OpenCode Agent**: Say the single bootstrap phrase in OpenCode Desktop chat: `I want to use https://cognnitive.com/use`
2. **Skills Installed Automatically**: OpenCode fetches the manifest, downloads all skills from GitHub, and presents an interactive workflow menu.
