---
title: "cogNNitive — Documentation"
description: "Technical documentation for the cogNNitive skills ecosystem"
html_url: https://cognnitive.com/actionn/documentation/
generator: https://cognnitive.com/actionn/nn-design-presets
---

# cogNNitive — Documentation

**cogNNitive** is a **skills** ecosystem for AI agents. Each skill is an autonomous module that teaches the agent to solve a specific type of task with domain knowledge.

## Canonical Skills Catalog

The actioNN ecosystem provides 7 specialized, autonomous agent skills:

| Skill | Version | Role & Scope | Triggers |
| :--- | :--- | :--- | :--- |
| **[`nn-router`](skills/nn-router.md)** | `V_3-2-0` | Primary Front Controller, system governance, setup, preflight gate & routing | `NN`, `nn`, `/nn`, `/nn-router`, `router`, `setup`, `preflight` |
| **[`nn-preflight`](skills/nn-preflight.md)** | `V_0-1-0` | Environment readiness gate (Node.js >= 18, MCP availability, workspace layout) | `preflight`, `readiness`, `environment check`, `run Tier 1` |
| **[`nn-innfo`](skills/nn-innfo.md)** | `V_0-1-2` | iNNfo model authoring, schema validation & conversational Model Creation Wizard (L2 &rarr; L3) | `NN`, `nn`, `model`, `wizard`, `template`, `innfo` |
| **[`nn-trannsform`](skills/nn-trannsform.md)** | `V_2-0-0` | Multi-modal document ingestion (PDF, DOCX, XLSX), normalization & procedures | `trannsform`, `transform`, `workflow`, `pipeline`, `procedure` |
| **[`nn-site-generator`](skills/nn-site-generator.md)** | `V_0-2-0` | Static website generation, markdown twin hydration & Docsify suites | `/nn-site-generator`, `generate site`, `create website` |
| **[`nn-skills-lifecycle`](skills/nn-skills-lifecycle.md)** | `V_1-2-0` | Skill ecosystem lifecycle, manifest pinning & lockfile updates | `/nn-skills-lifecycle`, `install skill`, `update skills` |
| **[`nn-design-presets`](skills/nn-design-presets.md)** | `V_1-2-0` | Design tokens, Morado Nazareno palette (`#4D0E4E`), typography scales & 8px grid | `design preset`, `morado-nazareno`, visual artifact styling |

## Installation

No Git or terminal needed. Tell your AI agent:

```
I want to use https://cognnitive.com/use
```

OpenCode fetches the bootstrap manifest, downloads all skills from GitHub, registers the MCP server, and presents a workflow menu — all automatic.

The **Skills Manager** activates automatically at session start. It scans installed skills and guides you through configuration using **Windows NTFS junctions**, which reflect updates live.

## Sample ActioNNs

Ready-to-run transformation recipes on the [landing page](/):

| Sample | What it does |
|--------|-------------|
| [Paper to YouTube Script](/samples/paper-to-youtube/) | Convert a scientific PDF into a YouTube video script |
| [Meeting Notes to Executive Summary](/samples/meeting-to-summary/) | Transform a video transcript into a structured summary with decisions and action items |

Each sample includes a downloadable input, step-by-step instructions, and an output preview.

---

## Philosophy

- **CONCEPTS > CODE**: understand the foundation before writing a line
- **Atomic skills**: each skill solves one specific problem without coupling to others
- **Declarative skills**: each skill defines triggers and behavior in clear frontmatter
- **Bilingual**: frontmatter in English for the system, interaction in Rioplatense Spanish with the user

## Tech Stack

- **Runtime**: AI agent (OpenCode, Claude Code, Gemini, Cursor, or any compatible agent)
- **Persistent memory**: Engram
- **Primary OS**: Windows (NTFS junctions for installation)
- **Documentation**: Docsify + this site
