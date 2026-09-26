# Design: Onboarding Bootstrap Flow & Documentation

## UI / UX Architecture

### 1. HomeView Dual Surface
`HomeView.vue` is structured into two side-by-side or responsive stacked cards within the Hero section:
- **Card 1: Create New Workspace (Bootstrap with AI)**
  - Header with `Sparkles` or `PlusCircle` icon.
  - Step 1: Create a folder on disk (e.g. `~/Documents/my-project_NN`).
  - Prerequisite callout: "Requires an AI agent on your computer: **OpenCode** (recommended), **Claude Code**, **Antigravity**, or **Codex**."
  - Link: `[Learn how to install an AI Agent →](https://cognnitive.com/innfo/documentation/#/installing-ai-agents)`.
  - Button: `Select Folder for New Workspace` (triggers directory picker).
- **Card 2: Open Existing Workspace**
  - Header with `FolderOpen` icon.
  - Primary button: `Open Workspace Folder`.
  - Folder vs File visual guide animation.
  - Recent workspaces shortcut indicator.

### 2. Contextual Bootstrap Modal
When an empty directory is selected:
- Store the directory handle in a local ref `pendingBootstrapHandle`.
- Activate `showBootstrapModal = true`.
- Start a 3-second interval polling (`setInterval`) that runs a lightweight directory check:
  - Scans directory for any file ending in `_NN.md`.
  - Once detected, automatically triggers `workspace.open(handle)`, closes the modal, and transitions to `/workspace`.
- Modal UI components:
  - Directory name display (e.g. `my-project_NN`).
  - Step 1: `cd ~/Documents/my-project_NN` (with copy button).
  - Step 2: `innfo: bootstrap a new workspace model in this directory` (with copy button).
  - Step 3: `Check & Open Workspace` button + animated spinner/pulsing status ("Listening for file changes...").

### 3. Documentation Page (`installing-ai-agents.md`)
Structure:
- Introduction: What is an AI coding agent? (Local software that runs on your machine with terminal & filesystem tools).
- Comparison and setup guides:
  - **OpenCode** (Recommended): Links to OpenCode Desktop & CLI, installation via download / package managers, native MCP integration.
  - **Claude Code**: Anthropic CLI setup via `npm install -g @anthropic-ai/claude-code`.
  - **Google Antigravity**: Antigravity setup, configuration and skills integration.
  - **Codex / OpenAI**: CLI and extension setup.
- Next Steps: MCP Server (`innfo-mcp`) and ActioNN Skills setup.
