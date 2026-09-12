# Tasks: Virtual Workspace & Use Cases Explorer

## 1. App Cleanup & Standalone Mode Elimination
- [ ] 1.1 Remove `StandaloneProcedureView.vue` from `iNNfo/apps/innfo-editor/src/views/`.
- [ ] 1.2 Remove `/view/procedure` and `/standalone/procedure` routes from `iNNfo/apps/innfo-editor/src/router/index.ts`.
- [ ] 1.3 Remove `supportsStandalone` and `openStandaloneSample` from `iNNfo/apps/innfo-editor/src/views/HomeView.vue`.

## 2. Virtual Workspace Engine & Deep-Linking
- [ ] 2.1 Update `useUrlDocLoader.ts` to support multi-model workspace loading (`loadWorkspaceIntoStore(urls: string[])`).
- [ ] 2.2 Create `iNNfo/apps/innfo-editor/src/config/workspaces.ts` registering known workspace slugs and model URL sets.
- [ ] 2.3 Update `workspaceStore.ts` with `loadVirtualWorkspace(urls: string[], name?: string, templateName?: string)`.
- [ ] 2.4 Update `HomeView.vue` `onMounted` to intercept `?model=`, `?url=`, `?doc=`, `?workspace=`, and `?models=`, load models, and navigate to `/workspace`.

## 3. Diverse Assets & Local Workspace Explorer Modal
- [ ] 3.1 Create realistic mock non-markdown assets (or references) in sample workspaces (`.pptx`, `.docx`, `.xlsx`, `.pdf`, `.csv`).
- [ ] 3.2 Build the interactive Local Workspace Explorer modal component and styles in `docs/use-cases.html`.
- [ ] 3.3 Update use case cards with the 4-action hub:
  - 📁 Local Workspace (modal)
  - 🧠 Open Model in App (`?model=...`)
  - 🌐 Open Knowledge Base App (`?workspace=...`)
  - 📊 View Deliverable
- [ ] 3.4 Mirror changes in `docs/use-cases.md`.

## 4. Verification & Validation
- [ ] 4.1 Run unit tests (`npm test --prefix iNNfo`) and ensure 100% pass.
- [ ] 4.2 Run app build (`npm run build --prefix iNNfo/apps/innfo-editor`) and verify clean build.
- [ ] 4.3 Run deterministic verification (`node scripts/verify.js`).
