# Proposal: Virtual Workspace Deep-Linking, Standalone Mode Elimination & Local Workspace Explorer

## 1. Problem Statement
The current experience between the marketing portal (`docs/use-cases.html`) and the web application (`iNNfo Editor`) suffers from four architectural and usability issues:

1. **Broken Deep-Links in App**: The "Open in iNNfo App" links on `docs/use-cases.html` pass `?model=<raw_url>`, but `HomeView.vue` never intercepts URL parameters on mount unless a local directory handle already exists in IndexedDB history.
2. **Dual Execution Paths (Standalone vs Workspace)**: The app maintains a legacy standalone procedure viewer (`StandaloneProcedureView.vue`, `/standalone/procedure` routes, bespoke mock adapters), created when models were single-file silos. Today, iNNfo models always belong to multi-model, multi-source workspaces. Having a standalone route fragments the UI, duplicates adapters, and confuses the user mental model.
3. **Flat & Mono-format Source Links in Use Cases**: The "Source" buttons in `docs/use-cases.html` open raw individual Markdown files, failing to demonstrate how real-world professionals organize heterogeneous local assets (such as PowerPoint decks, Word briefs, Excel spreadsheets, PDF studies, and CSV datasets) before normalizing them into iNNfo.
4. **Unclear Action Hierarchy**: The button labels do not clearly distinguish between inspecting a single model and opening the entire knowledge base workspace in the web app.

---

## 2. Proposed Solution

### A. Unified Virtual Workspace in iNNfo App
- **Eliminate Standalone Mode**: Remove `StandaloneProcedureView.vue` and the `/view/procedure` & `/standalone/procedure` route aliases. All views render inside `WorkspaceView.vue`.
- **First-Class Virtual Workspaces**: Enhance `workspaceStore` and `useUrlDocLoader` with `loadVirtualWorkspace()` to load single models (`?model=<url>`) or complete multi-model workspaces (`?workspace=<slug>` or `?models=<url1,url2>`) into `modelStore` in memory.
- **Deep-Link Interception**: `HomeView.vue` detects `?model=`, `?url=`, and `?workspace=` on mount and immediately routes to `/workspace` with `isSampleSession: true` (read-only / view-only mode, no local directory handle required).

### B. Interactive Local Workspace Explorer Modal
- In `docs/use-cases.html` and `docs/use-cases.md`, clicking "Source / Local Workspace" opens an interactive modal replicating a native desktop file manager (e.g. `C:\Users\founder\workspace\`).
- Showcases the directory structure (`sources/import/`, `sources/nn/`, `models/`, `export/`) with authentic multi-format files (`.pptx`, `.docx`, `.xlsx`, `.pdf`, `.csv`, `.md`, `.html`).
- Allows users to preview or download the raw files directly.

### C. Consistent Action Hub for Use Cases
- **"Source (Explore Workspace)"**: Opens the local file system modal.
- **"Open Model in App"**: Deep-links the primary model file into the iNNfo App.
- **"Open Knowledge Base App"**: Deep-links the entire workspace into the iNNfo App in virtual view-only mode.
- **"Deliverable"**: Opens the generated output deliverable.

---

## 3. User Value & Impact
- **Educational Impact**: Users immediately see the transition from raw messy files (`.docx`, `.pptx`, `.pdf`) $\rightarrow$ normalized knowledge models $\rightarrow$ high-value deliverables.
- **Immediate Interactivity**: Live deep-links work out of the box without requiring local folder permissions or Git cloning.
- **Code Cleanliness**: Eliminating legacy standalone routes removes dead code, decreases bundle size, and simplifies routing guards.
