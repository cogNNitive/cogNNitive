---
title: "cogNNitive — AI Agent Skills"
description: "Skills ecosystem for AI agents. Model Router, Skills Manager, traNNsform, and Web Design Guide."
html_url: https://actionn.cognnitive.com/
generator: https://actionn.cognnitive.com/nn-design-presets
---

# AI Agent Skills, Engineered for Any Agent

cogNNitive is a modular skills ecosystem that powers your AI agent with specialized capabilities: model evaluation, skills management, document transformation, and web design.

- [Explore Skills](#skills)
- [View on GitHub](https://github.com/cogNNitive/actioNN)

## Skills

### Model Router
Evaluates whether the AI model you're using is the right fit for each task. Classifies requests across 4 scales and recommends the optimal model based on cost and capability.
[View documentation →](https://actionn.cognnitive.com/documentation/#/skills/opencode-model-router)

### Skills Manager
Meta-skill that manages all skills in the repository. Scans, detects installation types (Junction, Symlink, Copy), and manages each skill's lifecycle.
[View documentation →](https://actionn.cognnitive.com/documentation/#/skills/skills-manager)

### traNNsform
Complete document ingestion and transformation pipeline. Converts PDFs, DOCX, and more to unified Markdown using the agent's own LLM as the transformation engine.
[View documentation →](https://actionn.cognnitive.com/documentation/#/skills/trannsform)

### Web Design Guide
Complete design system with Morado Nazareno palette, systematic typography, and 8px grid. Includes guides for commercial layouts and technical documentation with Docsify.
[View documentation →](https://actionn.cognnitive.com/documentation/#/skills/web-design-guide)

## How it works

Skills are loaded on demand by your AI agent. Each skill defines its own domain, language, and behavior rules.

1. **Automatic scan** — At session start, the Skills Manager detects all available skills in the repository and checks their installation status.
2. **On-demand loading** — When a task matches a skill, the agent loads its instructions and executes the specialized workflow.
3. **Modular by design** — Each skill is self-contained with its own domain rules. Skills can be installed, updated, and removed independently.

## Installation

No Git or terminal needed. Tell your AI agent:

```
I want to use https://cognnitive.com/use
```

OpenCode fetches the bootstrap manifest, downloads all skills from GitHub, registers the MCP server, and presents a workflow menu — all automatic.

## Contact

We'd love to hear from you. Questions, ideas, or feedback — reach out anytime.

- [Contact Us](https://actionn.cognnitive.com/contact?ref=actioNN) — `https://actionn.cognnitive.com/contact?ref=actioNN`
