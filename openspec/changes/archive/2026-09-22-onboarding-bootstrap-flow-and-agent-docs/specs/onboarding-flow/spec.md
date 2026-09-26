# Specification: Onboarding Bootstrap Flow & Dual Mode Home

## Requirements

### R-ONB-01: Dual Action Surface on Home
- The Home view Hero section SHALL present two visually distinct action pathways:
  1. `Create New Workspace` (for bootstrapping new models via AI agents)
  2. `Open Existing Workspace` (for navigating to established projects)
- The New Workspace section MUST emphasize the `_NN` directory naming suffix convention (e.g. `~/Documents/my-project_NN`).

### R-ONB-02: AI Agent Prerequisite & Documentation Link
- The New Workspace surface SHALL include a clear prerequisite notice indicating that an AI agent installed locally on the computer is required.
- The prerequisite notice MUST include an external link opening the `Installing AI Agents` documentation page (`target="_blank"`, `rel="noopener noreferrer"`).
- The text MUST explicitly highlight OpenCode as the recommended tool alongside Claude Code, Google Antigravity, and Codex.

### R-ONB-03: Empty Directory Bootstrapping Transition
- When a user selects a directory that contains no valid `*_NN.md` files:
  - The application MUST NOT treat this as an unrecoverable failure.
  - The application SHALL trigger the contextual Bootstrap Modal with the selected directory handle preserved.
- The Bootstrap Modal SHALL offer:
  1. Terminal navigation command for the selected folder.
  2. Copiable prompt: `innfo: bootstrap a new workspace model in this directory`.
  3. Action to re-scan/detect models in the folder, plus automated interval polling while the modal is open.
  4. Dismiss/Cancel option returning cleanly to the Home layout.

### R-ONB-04: Installing AI Agents Documentation
- A comprehensive documentation page `docs/innfo/documentation/installing-ai-agents.md` SHALL be added to the documentation system.
- It MUST be registered in `_sidebar.md` under Guides.
- It MUST detail software installation, CLI commands, and links for OpenCode, Claude Code, Antigravity, and Codex.
