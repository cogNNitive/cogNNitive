# Tasks: Block 1 — Editor & UX Consolidation (Virtual Workspaces, Prompt Generator & Interactive Explorer)

## 1. App Cleanup & Standalone Mode Elimination
- [x] 1.1 Remove `StandaloneProcedureView.vue` from `iNNfo/apps/innfo-editor/src/views/`.
- [x] 1.2 Remove `/view/procedure` and `/standalone/procedure` routes from `iNNfo/apps/innfo-editor/src/router/index.ts`.
- [x] 1.3 Remove `supportsStandalone` and `openStandaloneSample` from `iNNfo/apps/innfo-editor/src/views/HomeView.vue`.

## 2. Virtual Workspace Engine & Deep-Linking
- [x] 2.1 Update `useUrlDocLoader.ts` to support multi-model workspace loading (`loadWorkspaceIntoStore(urls: string[])`).
- [x] 2.2 Create `iNNfo/apps/innfo-editor/src/config/workspaces.ts` registering known workspace slugs and model URL sets.
- [x] 2.3 Update `workspaceStore.ts` with `loadVirtualWorkspace(urls: string[], name?: string, templateName?: string)`.
- [x] 2.4 Update `HomeView.vue` `onMounted` to intercept `?model=`, `?url=`, `?doc=`, `?workspace=`, and `?models=`, load models, and navigate to `/workspace`.

## 3. On-the-fly OpenCode / Agent Prompt Generator
- [x] 3.1 Create prompt generator utility (`iNNfo/apps/innfo-editor/src/utils/promptGenerator.ts`) with unit tests.
- [x] 3.2 Implement `PromptGeneratorModal.vue` with textarea and quick-copy feedback.
- [x] 3.3 Integrate trigger button into `BlockSheet.vue` and `ModelInfoPanel.vue`.

## 4. Navigation Links & Protocol Guidance
- [x] 4.1 Add navigation emoji decorations (`🧭`, `🗺️`, `🔗`, `⚡`) to link renderers in editor and console runtimes.
- [x] 4.2 Document `innfo://` custom URI protocol in `_NN/models/cogNNitive_backlog_V_0-1-6_backlog_NN.md`.

## 5. Diverse Assets & Local Workspace Explorer Modal
- [x] 5.1 Create realistic mock non-markdown assets in sample workspaces (`.pptx`, `.docx`, `.xlsx`, `.pdf`, `.csv`).
- [x] 5.2 Build the interactive Local Workspace Explorer modal component and styles in `docs/use-cases.html`.
- [x] 5.3 Update use case cards with the 4-action hub (`📁 Local Workspace`, `🧠 Open Model in App`, `🌐 Open Knowledge Base App`, `📊 View Deliverable`).
- [x] 5.4 Mirror changes in `docs/use-cases.md`.

## 6. Verification & Validation
- [x] 6.1 Run unit tests (`npm test --prefix iNNfo`) and ensure 100% pass.
- [x] 6.2 Run app build (`npm run build --prefix iNNfo/apps/innfo-editor`) and verify clean build.
- [x] 6.3 Run deterministic verification (`node scripts/verify.js`).

