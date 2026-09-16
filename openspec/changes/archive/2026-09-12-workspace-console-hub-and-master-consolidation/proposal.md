# Proposal: Workspace Console Hub & Canonical Template Console Consolidation

## 1. Problem Statement

As iNNfo workspaces evolve into multi-model domains (spanning Business, Procedures, Organization, and custom domain templates), several structural and usability gaps have emerged:

1. **Isolated Artifacts & No Central Entry Point**: Each model or transformation procedure can produce interactive HTML artifacts (such as model dashboards, interactive tables, and consoles). Currently, these artifacts live as disconnected HTML files in `artifacts/` without a single entry point or aggregated workspace index.
2. **Legacy Vocabulary & Conceptual Redundancy (`master.html` vs `console`)**: `master.html` (historically called showroom/framework) was created before the "Console" concept was formalized. In practice, both represent the same deliverable: a standalone, rich interactive HTML application representing an instantiated iNNfo model derived from its template. Maintaining `master.html` alongside template consoles creates confusion and documentation debt.
3. **Friction in Web & Modeler Experience**: Users reviewing a workspace in `iNNfo Modeler` (Vue app) must leave the application and open standalone HTML files in their local browser to interact with generated artifacts, instead of having direct access from the central workspace panel.

---

## 2. Proposed Solution

### A. Fusion of `master.html` into Canonical Template Consoles
- Formally merge and reconcile the legacy `master.html` deliverable into the template's **Canonical Console** (`<Template> Console`, e.g., `business_console.html`, `procedures_console.html`, `organization_console.html`).
- Update procedure definitions and template specifications so that model inspection generates a unified, rich console rather than a legacy `master.html`.
- Preserve backward-compatibility redirects/aliases where necessary during migration.

### B. Workspace Console Hub Procedure (`workspace_hub.html`)
- Define a declarative workspace procedure (`workspace_hub_procedures_V_0-1-0_NN.md`) that scans the workspace root `index.md`, all active models, and generated/declared artifacts.
- Generate a standalone, self-contained `artifacts/workspace_hub.html` portal.
- The Hub provides:
  - Global overview of all models and domains in the workspace.
  - Interactive grid / tabbed launcher for each model's canonical console.
  - Model metadata, version badges, and direct links to inspect source `*_NN.md` or launch the interactive console.

### C. iNNfo Modeler Central Panel Hub Embed
- Add a dedicated view/tab (e.g. `Consoles` / `Workspace Hub`) in `WorkspaceView.vue`.
- Embed the generated `workspace_hub.html` (or individual model consoles) directly in the central content panel via a sandboxed `<iframe>`.
- Maintain clean decoupling: the host Modeler app requires no intricate reverse-parsing of the console internals; it simply hosts the standalone deliverable securely and seamlessly.

---

## 3. User Value & Impact

- **Single Unified Portal**: Users and stakeholders have an immediate, single point of entry to navigate all domains and interactive consoles in a workspace.
- **Architectural Clarity**: Eliminates legacy `master.html` terminology, unifying all model-level interactive views under the clean "Console" primitive.
- **Seamless Modeler Experience**: Users can switch between editing iNNfo models and previewing the live aggregated console without leaving iNNfo Modeler.
