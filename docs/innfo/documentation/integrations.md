---
layout: default
title: Cognitive Ecosystem — External Tooling & Integrations
description: Integration architecture of independent tools in cogNNitive, analyzing the WaveSpeed image-generation case study (MCP vs CLI).
---

# Cognitive Ecosystem & External Tooling

The **cogNNitive** ecosystem is designed with a modular, decoupled architecture centered on structured knowledge (**iNNfo**) and AI agent capabilities (**ageNNt**). For the full information lifecycle (`IMPORT` ➔ `MANAGE` ➔ `EXPORT` + Feedback Loop), see the [**Lifecycle Walkthrough**](lifecycle-walkthrough.md).

This document explores integration with independent external tools and services through practical case studies (such as multimedia rendering with WaveSpeed).

---

## 1. Integration Philosophy: Decoupled Core and External Tools

In a living-knowledge platform, the logical processing of models and specifications lives in the local engine (`nn-core` and `nn-mcp`), while heavy cloud compute capabilities (such as graphic rendering, speech synthesis, video generation, or 3D models) are delegated to specialized third-party services.

To connect these capabilities to our AI agents (in OpenCode, Claude Desktop, Cursor, etc.), there are fundamentally two technical approaches: **Model Context Protocol (MCP)** and **Command Line Interface (CLI)**.

---

## 2. Case Study: Image Generation with WaveSpeed

WaveSpeed (`wavespeed.ai`) provides a cloud platform for running generative models from an open catalog (image, video, audio, 3D). We will analyze the two alternatives for integrating it into the Cognnitive workflow.

### Option A: WaveSpeed MCP (Recommended)
The official MCP server (`@wavespeed/mcp`) exposes WaveSpeed's capabilities directly as native tools to the AI agent (e.g. `list_models`, `run_model`, `get_price`, `get_model_schema`).

* **How it works:** The server runs as an independent child process managed by the AI client (configured globally in `mcp.json`). When the user requests an image, the agent introspects model schemas, evaluates prices or parameters, and executes the call autonomously and in a structured way via JSON-RPC.

### Option B: WaveSpeed CLI (`@wavespeed/cli`)
The traditional command-line package that allows running tasks from the terminal (`wavespeed run ...`).

* **How it works:** The agent or a shell script runs monolithic commands in the operating system terminal, parsing standard output (stdout/stderr).

---

## 3. Comparative Analysis: MCP vs. CLI

| Evaluation Axis | WaveSpeed MCP (Option A) | WaveSpeed CLI (Option B) |
| :--- | :--- | :--- |
| **Multi-Agent Interoperability** | **Native and Structured:** Automatically supported in OpenCode, Claude Desktop, Cursor, Cline, and Roo Code with a single configuration file (`mcp.json`). | **Limited for Conversational Agents:** Requires the agent to run shell commands and handle text output heuristically, without strict tool typing (*tool use*). |
| **Installation Complexity** | Installed globally via `npx` or a Node package and declared in the client configuration. | Requires global CLI installation (`npm install -g @wavespeed/cli`) and shell automation wrappers. |
| **Model Autonomy (AI)** | **High:** The language model reads the input schemas before writing the request, validating parameters and avoiding syntax errors. | **Low/Medium:** Depends on the agent's skill at building command arguments in the text terminal. |
| **API Key Security** | Isolated in the MCP process execution environment or injected by the AI client through the `env` property of the `mcp.json` file. | Exposed in shell session environment variables or passed through command arguments. |
| **Cost and Price Control** | Access to price-introspection tools (`get_price`) before running the model. | Direct execution without structured cost pre-validation unless an additional script is implemented. |

---

## 4. Architectural Recommendation for Cognnitive

For development within **Cognnitive**, the definitive recommendation is to **adopt WaveSpeed MCP** as the standard for AI-assisted flows.

### Key reasons:
1. **Schema-guided autonomy:** By using MCP, the agent does not guess the parameters a cloud model accepts; it queries the live schema dynamically (`get_model_schema`), guaranteeing that graphic asset generation matches exactly what is expected.
2. **Multi-client centralization:** Configuring the server in `C:\Users\<user>\.opencode\mcp.json` (or the equivalent in other clients) lets you share the graphic-generation tool instantly across any project in the monorepo without duplicating code or dependencies.
3. **Respect for the security paradigm:** Process separation through the MCP protocol isolates network logic and API credentials from the main application's source code.
