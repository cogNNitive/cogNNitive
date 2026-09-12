# Tasks: Block 1 — Editor & UX Consolidation (Virtual Workspaces, Prompt Generator & Interactive Explorer)

## 1. App Cleanup & Standalone Mode Elimination
- [ ] 1.1 Remove `StandaloneProcedureView.vue` from `iNNfo/apps/innfo-editor/src/views/`.
- [ ] 1.2 Remove `/view/procedure` and `/standalone/procedure` routes from `iNNfo/apps/innfo-editor/src/router/index.ts`.
- [ ] 1.3 Remove `supportsStandalone` and `openStandaloneSample` from `iNNfo/apps/innfo-editor/src/views/HomeView.vue`.

## 2. Virtual Workspace Engine & Deep-Linking
- [ ] 2.1 Update `useUrlDocLoader.ts` to support multi-model workspace loading (`loadWorkspaceIntoStore(urls: string[])`).
- [ ] 2.2 Create `iNNfo/apps/innfo-editor/src/config/workspaces.ts` registering known workspace slugs and model URL sets.
- [ ] 2.3 Update `workspaceStore.ts` with `loadVirtualWorkspace(urls: string[], name?: string, templateName?: string)`.
- [ ] 2.4 Update `HomeView.vue` `onMounted` to intercept `?model=`, `?url=`, `?doc=`, `?workspace=`, and `?models=`, load models, and navigate to `/workspace`.

## 3. On-the-fly OpenCode / Agent Prompt Generator
- [ ] 3.1 Create prompt generator utility (`iNNfo/apps/innfo-editor/src/utils/promptGenerator.ts`) with unit tests.
- [ ] 3.2 Implement `PromptGeneratorModal.vue` with textarea and quick-copy feedback.
- [ ] 3.3 Integrate trigger button into `BlockSheet.vue` and `ModelInfoPanel.vue`.

## 4. Navigation Links & Protocol Guidance
- [ ] 4.1 Add navigation emoji decorations (`🧭`, `🗺️`, `🔗`, `⚡`) to link renderers in editor and console runtimes.
- [ ] 4.2 Document `innfo://` custom URI protocol in `_NN/models/cogNNitive_backlog_V_0-1-6_backlog_NN.md`.

## 5. Diverse Assets & Local Workspace Explorer Modal
- [ ] 5.1 Create realistic mock non-markdown assets in sample workspaces (`.pptx`, `.docx`, `.xlsx`, `.pdf`, `.csv`).
- [ ] 5.2 Build the interactive Local Workspace Explorer modal component and styles in `docs/use-cases.html`.
- [ ] 5.3 Update use case cards with the 4-action hub (`📁 Local Workspace`, `🧠 Open Model in App`, `🌐 Open Knowledge Base App`, `📊 View Deliverable`).
- [ ] 5.4 Mirror changes in `docs/use-cases.md`.

## 6. Verification & Validation
- [ ] 6.1 Run unit tests (`npm test --prefix iNNfo`) and ensure 100% pass.
- [ ] 6.2 Run app build (`npm run build --prefix iNNfo/apps/innfo-editor`) and verify clean build.
- [ ] 6.3 Run deterministic verification (`node scripts/verify.js`).

