# Proposal: Editor & UX Consolidation (Virtual Workspaces, Prompt Generator & Interactive Explorer)

## 1. Problem Statement
The current user experience in the web application (`iNNfo Editor`) and the documentation portal (`docs/use-cases.html`) suffers from fragmented features and usability bottlenecks:

1. **Broken Deep-Links & Siloed Models**: The "Open in App" links on `docs/use-cases.html` pass `?model=<url>`, but `HomeView.vue` does not intercept them reliably without a local directory handle.
2. **Dual Execution Paths (Standalone vs Workspace)**: The app maintains a legacy standalone procedure viewer (`StandaloneProcedureView.vue`, `/standalone/procedure`), duplicating adapters and confusing the mental model.
3. **Missing In-App Agent Prompt Generation**: Users inspect models and blocks in the editor but have no native on-the-fly mechanism to generate structured prompts for AI coding agents (like OpenCode, Claude Code, or Antigravity) with contextual model data and instructions.
4. **Static / Plain Navigation Links**: Markdown links and references across runtimes lack visual cues and protocol guidance for interactive model traversal.
5. **Flat Source Links in Marketing Portal**: Use cases link to flat raw markdown rather than showing authentic multi-format assets (`.pptx`, `.docx`, `.xlsx`, `.pdf`, `.csv`) before normalization.

---

## 2. Proposed Solution (Unified Bloque 1)

### A. Unified Virtual Workspace & Deep-Linking
- **Eliminate Standalone Mode**: Remove `StandaloneProcedureView.vue` and `/standalone/procedure` routes. Everything renders inside `WorkspaceView.vue`.
- **First-Class Virtual Workspaces**: Provide `loadVirtualWorkspace()` in `workspaceStore` and `useUrlDocLoader` to load models into memory concurrently (`?model=`, `?workspace=<slug>`, `?models=url1,url2`).
- **Deep-Link Interception**: `HomeView.vue` detects query parameters on mount and navigates to `/workspace` with `isSampleSession: true`.

### B. On-the-fly OpenCode / Agent Prompt Generator
- Provide a clean prompt generator utility (`src/utils/promptGenerator.ts`) and modal (`src/components/PromptGeneratorModal.vue`).
- Integrate a quick action trigger button into `BlockSheet.vue` and `ModelInfoPanel.vue` allowing one-click generation and copying of structured LLM prompts containing block context, schema definition, and instructions.

### C. Interactive Navigation Links & Backlog Protocol
- Add navigation decorations (`🧭`, `🗺️`, `🔗`, `⚡`) to link renderers in editor and console runtimes for intuitive model exploration.
- Record the custom `innfo://` URI protocol specification in the backlog for future browser-to-desktop deep integration.

### D. Local Workspace Explorer Modal & 4-Action Hub
- In `docs/use-cases.html` and `docs/use-cases.md`, implement the desktop file manager modal displaying raw files (`.pptx`, `.docx`, `.xlsx`, `.pdf`), normalized files, models, and exports.
- Provide the 4-action hub per use case: (1) Local Workspace Explorer, (2) Open Model in App, (3) Open Knowledge Base App, (4) View Deliverable.

---

## 3. User Value & Architectural Impact
- **Single Cohesive UI Pass**: Touches `HomeView.vue`, `BlockSheet.vue`, router, and stores once without conflicting PRs.
- **Immediate Interactivity**: Live virtual workspaces and prompt generators work out of the box with zero setup.
- **Code Cleanliness**: Eliminates dead standalone code and reduces bundle footprint.
