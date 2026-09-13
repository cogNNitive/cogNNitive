# Proposal: Workspace Hub Agent Prompt Generator for Consoles Regeneration

## 1. Problem Statement

When working with multi-model workspaces in cogNNitive (spanning business models, standard operating procedures, organizational charts, etc.), each model generates its own standalone interactive console artifact (`artifacts/*_console.html`). The **Workspace Console Hub** (`artifacts/workspace_hub.html`) aggregates these models and allows users to launch and preview them.

However:
1. **Manual / Fragmented Refresh Workflow**: When models are updated, users have to manually remember and trigger individual compilation procedures for each model in the workspace.
2. **Lack of Agent Integration in Hub**: While individual consoles have the `feedback-export` capability to communicate reviewer changes to AI agents, the Workspace Hub lacked an interactive agent prompt generator to trigger batch console updates across all workspace models.

## 2. Proposed Solution

### A. "Regenerate All Consoles" Action in Workspace Hub
- Add a dedicated primary action button in the `workspace_hub.html` header: **"Regenerate Consoles"** (with icon and styling adhering to `nn-design-presets`).
- Clicking the button opens an interactive **Prompt Generation Modal** (overlay glass modal).

### B. Dynamic Agent Prompt Generator
- The hub reads its own embedded `#innfo-workspace-data` slot (models list, paths, templates, versions).
- Formats a comprehensive, actionable **AI Agent Prompt** containing:
  - Workspace title, version, and root context.
  - Manifest of all declared models with their paths and associated compilation procedures (e.g. `compile_business_console_NN.md`, `compile_procedures_console_NN.md`, etc.).
  - Deterministic step-by-step instructions for the AI agent to:
    1. Validate each model (`validate_model` / verify model syntax and references).
    2. Execute the template compilation procedure to update each model's console artifact in `artifacts/`.
    3. Recompile the aggregated `workspace_hub.html` to reflect fresh statuses and timestamps.
- Provides a one-click **"Copy Prompt"** button with visual feedback (toast / state change).

### C. Update Procedure Specification
- Update `compile_workspace_hub_NN.md` to reflect the prompt generation capability and data contract.
- Add unit/integration tests to ensure no regressions in offline `file://` execution, slot structure, and modal interactions.

## 3. Impact & Value

- **Human-in-the-loop Automation**: Seamlessly bridges the visual hub with AI agent workflows using plain-text prompt synthesis.
- **Offline & Zero-Dependency Hygiene**: Pure HTML/vanilla JS implementation that runs locally via `file://` with no external runtime dependencies or fetch calls.
- **Ecosystem Consistency**: Aligns with the `feedback-export` prompt generation UX pattern used across cogNNitive consoles.
