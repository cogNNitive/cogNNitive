# Specification: Workspace Console Hub & Template Console Integration

## 1. Requirements

### 1.1 Canonical Console Consolidation
- Every canonical template (Business, Procedures, Organization) MUST define a standard console procedure.
- The term `master.html` MUST be treated as legacy; procedure declarations and agent skill references MUST refer to `<Template> Console` (e.g. `business_console.html`, `procedures_console.html`).
- Generated console deliverables MUST follow cogNNitive Design Presets (standard palettes, typography, spacing tokens).

### 1.2 Workspace Console Hub Procedure (`workspace_hub.html`)
- The workspace hub generator MUST accept a workspace root path containing `index.md` and `artifacts/`.
- It MUST dynamically discover all models declared in `index.md` and check for corresponding generated console artifacts in `artifacts/`.
- It MUST generate a standalone HTML document `artifacts/workspace_hub.html` featuring:
  - Header with Workspace Name, description, and status overview.
  - Interactive grid / cards for each discovered domain/model with:
    - Model Title & Version
    - Template Type Badge
    - Console Availability Indicator (Active / Pending generation)
    - Action button: "Open Console" / "View Model Source"
  - Tabbed / embedded sub-view to inspect selected consoles inside the Hub itself.

### 1.3 iNNfo Modeler Integration
- `iNNfo Modeler` (`WorkspaceView.vue`) MUST provide a navigation entry or view toggle for "Consoles" / "Workspace Hub".
- When selected, the central panel renders the embedded viewer displaying `artifacts/workspace_hub.html` via an `<iframe>`.
- If `workspace_hub.html` does not yet exist, the embedded viewer displays an empty state explaining how to generate the Hub via the declared procedure.
