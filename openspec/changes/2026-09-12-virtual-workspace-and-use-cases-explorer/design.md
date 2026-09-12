# Design: Virtual Workspace Architecture, Prompt Generator & Interactive Explorer

## 1. Architectural Decisions

### ADR-1: Unify Everything Under `WorkspaceView`
- **Context**: The editor previously had a separate `StandaloneProcedureView.vue` that duplicated layout chrome, adapter contexts, and router rules.
- **Decision**: Delete `StandaloneProcedureView.vue`. The unit of interaction is ALWAYS a Workspace. Procedures, business models, and matrices all render inside `WorkspaceView` with view toggling via `uiStore.activeView`.
- **Consequences**: Cleaner routing table, reduced bundle size, consistent UX, zero mock adapter duplication.

### ADR-2: Multi-Model Virtual Workspace Ingestion
- **Context**: Deep-linking from web or opening samples needs to support workspaces with multiple models (e.g., Consulting Sales has 2 models, YouTube Creator has 2 models).
- **Decision**: In `useUrlDocLoader` and `workspaceStore`, provide `loadVirtualWorkspace(modelUrls: string[], name: string)`.
  1. Concurrently fetch all model texts via `Promise.all(modelUrls.map(fetch))`.
  2. Parse each model into node dictionaries using `@cognnitive/innfo-core`'s `normalizeSingleModel`.
  3. Combine all nodes into a unified `Record<string, ModelNode>`.
  4. Collect all `rootIds`.
  5. Resolve parent specs concurrently via `resolveParentSpecs(allNodes, rootIds)`.
  6. Populate `modelStore.setGraph(allNodes, rootIds)`.
  7. Set `isSampleSession = true` and `hasParsed = true`.
- **Consequences**: Instant view-only exploration of any remote GitHub repository workspace.

### ADR-3: Known Workspace Slug Registry
- Preconfigure canonical workspace slugs in `config/workspaces.ts`:
  - `startup-founder`: `[.../docs/samples/use-cases/startup-founder/models/SaaS_Founder_V_1-0-0_business_NN.md]`
  - `freelance-designer`: `[.../docs/samples/use-cases/freelance-designer/models/Client_Website_V_1-0-0_site_spec_NN.md]`
  - `consulting-sales`: `[.../docs/samples/use-cases/consulting-sales/models/Fintech_RFP_Response_V_1-0-0_business_NN.md`, `.../docs/samples/use-cases/consulting-sales/models/Consulting_Team_Matrix_V_1-0-0_organization_NN.md]`
  - `youtube-creator`: `[.../docs/samples/use-cases/youtube-creator/models/Episode_42_Battery_Tech_V_1-0-0_business_NN.md`, `.../docs/samples/use-cases/youtube-creator/models/Episode_42_Production_V_1-0-0_procedures_NN.md]`
  - `ghostbusters`: standard Ghostbusters Inc. sample models.

### ADR-4: Local Workspace Explorer Modal Component
- Pure CSS/JS modal in `docs/use-cases.html` with zero external dependencies.
- Simulates an authentic desktop file explorer with path breadcrumbs (`C:\Users\<user>\Projects\<workspace>\`).
- File icons differentiated by extension (`.pptx`, `.docx`, `.xlsx`, `.pdf`, `_NN.md`, `.md`, `.html`).
- Includes tabs for `All Files`, `Sources (Import)`, `Normalized (iNNfo)`, `Models`, `Export Deliverables`.

### ADR-5: On-the-fly OpenCode Prompt Generator
- **Context**: Users want to prompt AI coding agents directly with context from the active block or model.
- **Decision**: Create `src/utils/promptGenerator.ts` and `PromptGeneratorModal.vue`. Provide trigger button with copy action inside `BlockSheet.vue` and `ModelInfoPanel.vue`.
- **Consequences**: Zero friction between visual inspection in the browser and AI agent execution.

### ADR-6: Interactive Navigation Links & Backlog URI Protocol
- **Context**: Links between models need visual clarity and future desktop app deep linking.
- **Decision**: Add navigation emoji decorators (`🧭`, `🗺️`, `🔗`, `⚡`) to link renderers and document `innfo://` URI protocol in backlog.
