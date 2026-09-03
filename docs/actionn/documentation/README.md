---
title: "cogNNitive — Documentation"
description: "Technical documentation for the cogNNitive skills ecosystem"
html_url: https://actionn.cognnitive.com/documentation/
generator: https://actionn.cognnitive.com/nn-design-presets
---

# cogNNitive — Documentation

**cogNNitive** is a **skills** ecosystem for AI agents. Each skill is an autonomous module that teaches the agent to solve a specific type of task with domain knowledge.

## Included Skills

| Skill | Version | Purpose |
|---|---|---|
| [Model Router](skills/opencode-model-router.md) | 1.0.0 | Evaluates whether the AI model is suitable for each task |
| [Skills Manager](skills/skills-manager.md) | 1.0 | Manages the lifecycle of repository skills |
| [traNNsform](skills/trannsform.md) | 1.1 | Document ingestion and transformation pipeline |
| [Web Design Guide](skills/web-design-guide.md) | — | Light-mode design system with Morado Nazareno palette |

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
