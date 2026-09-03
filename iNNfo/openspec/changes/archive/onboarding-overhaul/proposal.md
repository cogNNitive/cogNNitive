# Onboarding Overhaul — Proposal

## Change Info

- **ID**: onboarding-overhaul
- **Intent**: Make iNNfo onboarding intuitive by putting samples first, detecting empty folders, and providing a guided read-only experience with a clear CTA to create.
- **Risk**: Low — purely UI changes, no data model or persistence changes.
- **Review budget**: Under 400 lines.

## Scope

### In scope
1. Empty-folder detection + redirect
2. Home page reorder (samples first)
3. Read-only banner in workspace for samples
4. CTA from banner to create a model

### Out of scope
- Starter templates removal (ask user — they mentioned they thought starters were gone)
- Guided tour overlay (deferred for later)
- Wizard creation flow
- Multi-language support for banner text
- Analytics tracking

## Approach

### Deliverable 1 — Empty folder detection
**Where**: `apps/innfo-editor/src/stores/workspaceStore.ts` in `open()`

**What**: After parsing, if no `_NN.md` files found:
- Set a new reactive `emptyFolderError` state
- Return early without setting `hasHandle = true`
- The router guard keeps user on Home since `hasHandle` stays false
- HomeView reads `emptyFolderError` and shows a notification toast

### Deliverable 2 — Home page reorder
**Where**: `apps/innfo-editor/src/views/HomeView.vue`

**What**: Move the samples section above the two-column layout. The hero + sandbox stay at top. Then: samples section → two-column layout (open existing + starters) → community section.

### Deliverable 3 — Read-only banner
**Where**: `apps/innfo-editor/src/views/WorkspaceView.vue` (new `SampleBanner.vue` component)

**What**: When workspace was loaded from a sample URL (not from folder handle), show a dismissable banner:
- Template name extracted from the loaded model's frontmatter
- Banner text: "Estás explorando un modelo sample que usa la plantilla [X]. Los cambios que realices no se guardan. Cuando quieras puedes crear tu propio modelo haciendo clic aquí."
- CTA button: "Crear mi propio modelo" → loads the corresponding starter template
- Dismissable with close icon
- Store dismissal in sessionStorage

### Deliverable 4 — CTA flow
**Where**: `apps/innfo-editor/src/stores/workspaceStore.ts`

**What**: The CTA closes the current workspace and navigates to Home with a pre-selected starter template, opening the folder picker for the user.

## Detection

- `workspaceStore.isSampleSession`: `true` when loaded via `loadFromUrl` from a sample or preview URL
- `workspaceStore.sampleTemplateName`: stores the template name for the banner
- `workspaceStore.emptyFolderError`: set when `open()` finds no `_NN.md` files

## Rollback

All changes are UI-only and scoped to single files. Rollback is a `git checkout` on each file:
- `apps/innfo-editor/src/views/HomeView.vue`
- `apps/innfo-editor/src/views/WorkspaceView.vue`
- `apps/innfo-editor/src/stores/workspaceStore.ts`
- (new) `apps/innfo-editor/src/components/layout/SampleBanner.vue`

## Risks

None identified.
