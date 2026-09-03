# innfo-editor

**iNNfo Modeler** — the unified workspace editor for the cogNNitive ecosystem. Open any folder, edit iNNfo models with dedicated per-node views, and let AI agents drive the same workspace alongside you.

## End-to-end flow

1. **Open a workspace** — pick a folder via the File System Access API (`showDirectoryPicker`), resume a recent workspace from IndexedDB history, load a starter template (Business, Procedures, or Organization) or its sample model, or load a model directly from a URL.
2. **Single recursive parse** — the workspace is parsed once into a normalized node graph shared by every view.
3. **Edit** — each node opens the editing sub-view that fits its kind.
4. **Auto-validate** — every parse runs the `@cognnitive/innfo-core` validator (`validateFormatContent` / `validateModel`); results surface as a status badge in the header.
5. **Use AI** — click the "Use AI" button in the header to open the AI Guide view, with step-by-step instructions and copiable prompts (prefixed with `innfo:`) for connecting an external AI coding agent to the current workspace.
6. **Save** — writes back to disk with automatic backups and a version bump.

## Home

- **Open folder** — browse and open any local workspace directory.
- **Resume** — reopen a previously used workspace from IndexedDB history without re-prompting for folder access.
- **Starter templates** — bootstrap a new workspace from the Business, Procedures, or Organization starter, or load one of the live sample models (Ghostbusters, Code Review Process, Engineering Team).
- **Load from URL** — point the editor at a raw `_NN.md` model URL.
- **SetupWizard** — guides first-time setup of a new workspace.

## Editing sub-views

The editor selects the editing surface per node kind:

| View | Purpose |
|------|---------|
| **TextEditor** | Markdown body editing |
| **TreeEditor** | Structural node editing |
| **BlockFeed / BlockSheet** | Concept element cards |
| **ConceptTableView** | Spreadsheet-like list editing for a concept's elements |

## Validation

Validation runs automatically on every parse via `@cognnitive/innfo-core`. A pass/warn/error badge in the `Header` opens the full `ValidationReport` overlay (backed by `ValidationService`), showing every diagnostic against the resolved template.

## Visualization and inspection

- **GraphViewer** — node and relationship graph visualization of the model.
- **MatricesGrid** / **MetamatrixConfig** — evaluable matrices between concepts.
- **ModelInfoPanel** — workspace and metamodel inspection.
- **GuidedProcedureView** — interactive step-by-step FSM execution engine for `Procedures` models.

## Template Extensions Architecture

The editor features a decoupled **Domain Extension Architecture**:
- Each level 2 template (e.g. `procedures_V_0-2-0`) can define its own extension, living alongside its consumers under `apps/innfo-editor/src/extensions/{name}/` (extensions are app code, not spec content, so they never live under `specs/`).
- **Manifest (`manifest.json`)**: Declares views, widgets, and target concepts provided by the template extension.
- **Pure Domain Logic (`useProcedureFSM.ts`)**: Decoupled state machine logic operating on a pure node map.
- **Extension Registry (`registry.ts`)**: Resolves and dynamically mounts extension views based on model `parent_spec`.
- **Adapters**:
  - `workspaceAdapter.ts`: Connects the extension to the full workspace stores (`modelStore` & `uiStore`).
  - `standaloneAdapter.ts`: Connects the extension to a lightweight model graph parsed from a URL or raw Markdown.

## Standalone Procedure Viewer

Models using template extensions can be executed and visualized in **Standalone Mode** without opening the full IDE workspace:
- **Route**: `/view/procedure` (or `/standalone/procedure`).
- **URL Parameter**: Pass `?url=<RAW_MD_URL>` (e.g. `http://localhost:5173/app/view/procedure?url=https://raw.githubusercontent.com/.../Ghostbusters_V_0-2-0_procedures_NN.md`).
- **Features**: Full FSM state derivation, step sequence navigation, sub-steps progress tracking, RACI accountability matrix inspection, and artifact I/O mapping in a clean, full-screen interface.

## AI Guide View

The **"Use AI"** button in the header opens the AI Guide view (`AiWorkflowPanel`) — a step checklist for connecting an external coding agent (Claude Code, Google Antigravity, or OpenCode Desktop) to the current workspace, with copiable prompts prefixed with `innfo:` for each step.

## Development

```bash
# From repo root
npm run build -w @cognnitive/innfo-core   # Build dependency first
npm run dev -w @cognnitive/innfo-editor   # Start dev server

# Run tests
npm run test -w @cognnitive/innfo-editor
```
