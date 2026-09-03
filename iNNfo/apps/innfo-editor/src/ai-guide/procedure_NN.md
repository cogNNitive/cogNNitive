---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md"
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/procedures/procedures_V_0-2-0_NN.md"
model_version: "V_0-1-0"
title: "Use iNNfo with AI"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).

# _NN index

* _NN index: Work
* _NN index: Roles
* _NN index: Artifact
* _NN index: Tools

# _NN Work

* _NN Work: Use iNNfo with AI
  iNNfo lets you edit and view iNNfo models both from its graphical interface and through AI agents. This procedure describes how to use **OpenCode Desktop** (the supported AI agent) to work with your models via natural language conversation, leveraging the contextual prompts the application provides.

* _NN Work: Download and install OpenCode Desktop
  ```yaml
  parent: "Use iNNfo with AI"
  step_type: task
  tool: "OpenCode Desktop"
  ```
  Download OpenCode Desktop from https://opencode.ai/download and install it. OpenCode Desktop is the supported AI agent for iNNfo — it reads project skills natively and discovers them automatically.
* _NN Work: Open the workspace folder in OpenCode Desktop
  ```yaml
  parent: "Use iNNfo with AI"
  step_type: task
  input: "Workspace Folder"
  tool: "OpenCode Desktop"
  ```
  Open the same workspace folder you use in iNNfo inside OpenCode Desktop. You can find the exact path at the top of the header by clicking the info icon. OpenCode Desktop works directly on the file system.
* _NN Work: Configure MCP tools
  ```yaml
  parent: "Use iNNfo with AI"
  step_type: task
  requires: MCP Server
  ```
  The first time you work with models, tell OpenCode Desktop: *"innfo: Load the nn-innfo skill and check that innfo-mcp is configured"*. The skill detects if the MCP server is set up and guides you through any steps if needed. Reference: `docs/mcp-setup.md`.
* _NN Work: Edit models via chat
  ```yaml
  parent: "Use iNNfo with AI"
  step_type: task
  input: "Model File"
  output: "Edited Model File"
  tool: "OpenCode Desktop"
  ```
  Tell OpenCode Desktop what you want to do including a reference to the skill you need, for example: *"innfo: Load the nn-innfo skill — I need to edit the business model and add a new concept"*. The skill reference in your message helps OpenCode Desktop discover and activate the right skill automatically. The skill provides model validation, MCP activation, and change workflows.

* _NN Work: Use the suggested prompts
  ```yaml
  parent: "Use iNNfo with AI"
  step_type: task
  input: "Suggested Prompts"
  ```
  When viewing a model in iNNfo, the right sidebar shows **suggested prompts** for each concept. Copy them into OpenCode Desktop to explore a specific concept or element in more detail.

# _NN Roles

* _NN Roles: User
  ```yaml
  scope: internal
  ```
  Person who directs model editing. Describes the changes they want in natural language and the agent executes them.
* _NN Roles: AI Agent
  ```yaml
  scope: external
  ```
  AI agent that interprets user instructions and modifies model files directly on the file system.

# _NN Artifact

* _NN Artifact: Model File
  `_NN.md` file containing the iNNfo model. The main artifact edited and viewed both in iNNfo and through the AI agent.
* _NN Artifact: Workspace Folder
  Local folder containing the model, its templates, and associated specs. The directory you share between iNNfo and your AI agent so both work on the same files.
* _NN Artifact: Suggested Prompts
  Text snippets that appear in the iNNfo right sidebar when you select a concept. Designed to be copied and pasted into your AI agent.

# _NN Tools

* _NN Tools: OpenCode Desktop
  Supported AI agent for iNNfo. Reads project skills natively and discovers them automatically. Download: https://opencode.ai/download

# _NN matrices: work-roles matrix

| Work \ Roles | User | AI Agent |
| :--- | :---: | :---: |
| Download and install OpenCode Desktop | Responsible | - |
| Open the workspace folder in OpenCode Desktop | Responsible | - |
| Edit models via chat | Responsible | Accountable |
| Use right sidebar prompts | Responsible | Consulted |
