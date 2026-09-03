# Onboarding Overhaul — Tasks

## Delivery Strategy

**Decision needed before apply**: No
**Chained PRs recommended**: No
**400-line budget risk**: Low (~250 lines estimated)

## Task List

### Task 1: workspaceStore — new state + empty folder detection
**File**: `apps/innfo-editor/src/stores/workspaceStore.ts`
**What**:
1. Add `isSampleSession`, `sampleTemplateName`, `emptyFolderError` to `WorkspaceState`
2. In `open()`: after `parseFromHandle()`, check `modelStore.rootIds` — if empty (no non-spec roots), set `emptyFolderError = true`, `hasHandle = false`, return without setting `hasParsed`
3. `loadFromUrl()`: accept optional `templateName` param, store it, set `isSampleSession = true`
4. `reset()`: clear all new fields
**Verification**: `npm run test:app`

### Task 2: HomeView — section reorder + empty folder toast + CTA by name
**File**: `apps/innfo-editor/src/views/HomeView.vue`
**What**:
1. Move `<section class="samples">` before `<div class="cols">`
2. Watch `workspaceStore.emptyFolderError` — when true, show toast via `useToast()` and scroll to samples
3. Add `createFromStarterByName(templateName)` method that looks up starter by name and calls `createFromStarter()`
4. Watch route query `?createTemplate=X` — if present, call `createFromStarterByName(X)` on mount
**Verification**: `npm run test:app`

### Task 3: SampleBanner — new component
**File**: `apps/innfo-editor/src/components/layout/SampleBanner.vue` (new)
**What**:
1. Props: `templateName: string`
2. Emits: `create`, `dismiss`
3. SessionStorage check for dismissal
4. Violet banner with description text + CTA button + close button
5. Style consistent with design system
**Verification**: `npm run test:app`

### Task 4: WorkspaceView — integrate SampleBanner
**File**: `apps/innfo-editor/src/views/WorkspaceView.vue`
**What**:
1. Import `SampleBanner`
2. Render when `workspaceStore.isSampleSession` is true
3. `onSampleCreate` handler: reset workspace + navigate to Home with `?createTemplate={name}`
4. `onSampleBannerDismiss` handler: no-op (sessionStorage handled by component)
**Verification**: `npm run test:app`

### Task 5: Update sample/preview calls to pass template name
**File**: `apps/innfo-editor/src/views/HomeView.vue`
**What**:
1. `previewSample()`: pass template name to `workspaceStore.loadFromUrl()`
2. `onSampleClick()`: set `workspaceStore.isSampleSession = true` and `sampleTemplateName`
**Verification**: `npm run test:app`

### Task 6: Verify — full test suite
**What**:
1. Run `npm run test` across all packages
2. Run `npm run lint`
3. Run `npm run typecheck`
4. Manual check: open empty folder → see toast
5. Manual check: open sample → see banner → create model from CTA
