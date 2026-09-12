# Spec: Virtual Workspace & Use Cases Explorer

## 1. Overview
This specification defines the runtime contracts for virtual (URL-loaded) workspaces in the iNNfo App, the elimination of standalone single-model modes, and the local file explorer modal contract in the documentation portal.

---

## 2. Requirements & Contracts

### R1: Elimination of Standalone Procedure Mode
- `StandaloneProcedureView.vue` is deleted.
- Routes `/view/procedure` and `/standalone/procedure` are removed from `src/router/index.ts`.
- `ExampleModel.supportsStandalone` is removed from `HomeView.vue`.
- Any procedure model sample opens directly in `WorkspaceView.vue` with `uiStore.activeView = 'guided-procedure'` and `isSampleSession = true`.

### R2: Virtual Workspace Contract in iNNfo App
- `useWorkspaceStore` provides `loadVirtualWorkspace(opts: { name: string; modelUrls: string[]; templateName?: string })`.
- For each model URL, it fetches content, normalizes into nodes via `normalizeSingleModel`, resolves parent specs via `resolveParentSpecs`, and calls `modelStore.setGraph(allNodes, rootIds)`.
- State flags:
  - `hasParsed = true`
  - `hasHandle = false`
  - `handle = null`
  - `isSampleSession = true`
  - `sampleTemplateName = opts.templateName || 'workspace'`
- Saving to disk is disabled; the UI displays the sample/virtual workspace banner with an option to download or export.

### R3: Deep-Link Interception Contract
`HomeView.vue` must handle query parameters on `onMounted`:
- `?model=<url>`: loads single model into a virtual workspace and redirects to `/workspace`.
- `?url=<url>`: alias for `?model=<url>`.
- `?workspace=<slug>`: resolves known workspace preset slugs (`startup-founder`, `freelance-designer`, `consulting-sales`, `youtube-creator`, `ghostbusters`, `catalog`) or fetches a remote workspace manifest, loads all models, and redirects to `/workspace`.
- `?models=<url1,url2,...>`: comma-separated model URLs.

### R4: Local Workspace Explorer Modal Contract
`docs/use-cases.html` must provide an accessible modal dialog (`#workspace-modal`):
- Displays the archetype's simulated local working directory (e.g. `C:\Users\<user>\workspace\`).
- Folder tree navigation / tabbed view across:
  - `sources/import/` (raw diverse files: `.pptx`, `.docx`, `.xlsx`, `.pdf`, `.csv`)
  - `sources/nn/` (normalized markdown files)
  - `models/` (iNNfo models)
  - `export/` (generated deliverables: `.html`, `.md`, `.pptx`, `.xlsx`, `.docx`)
- Each file displays an authentic icon (PowerPoint, Word, Excel, PDF, Code/MD), file size, and download/preview button.

### R5: Use Cases Action Buttons
Every use case card in `docs/use-cases.html` and `docs/use-cases.md` provides:
1. **Source**: "📁 Local Workspace" (opens the workspace explorer modal).
2. **Model**: "🧠 Open Model in App" (`https://cognnitive.com/innfo/app/?model=<canonical_raw_url>`).
3. **Knowledge Base**: "🌐 Open Knowledge Base App" (`https://cognnitive.com/innfo/app/?workspace=<slug>`).
4. **Deliverable**: "📊 View Deliverable" (links to primary deliverable).
