# Onboarding Overhaul — Design

## Files Affected

| File | Change |
|------|--------|
| `apps/innfo-editor/src/stores/workspaceStore.ts` | Add `isSampleSession`, `sampleTemplateName`, `emptyFolderError` state; detect empty folders in `open()`; store template name in `loadFromUrl()` |
| `apps/innfo-editor/src/views/HomeView.vue` | Reorder sections (samples first); show empty-folder toast; handle scroll-to-samples |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Import and render `SampleBanner` when in sample session |
| `apps/innfo-editor/src/components/layout/SampleBanner.vue` | **New** — banner component with CTA |

## Design Detail

### 1. workspaceStore — new state

Add to `WorkspaceState`:
```ts
isSampleSession: boolean   // true when loaded via sample/preview URL
sampleTemplateName: string // template name (e.g. "Business", "Procedures") for the banner
emptyFolderError: boolean  // set by open() when 0 model files found
```

**`open()`** — after `parseFromHandle()` completes, check `modelStore.rootIds`:
- If `rootIds` is empty (no spec: nodes) or only has `spec:` prefixed nodes → set `emptyFolderError = true`, `hasHandle = false`, return without navigating
- Otherwise proceed normally

**`loadFromUrl()`** — accept an optional `templateName` param. Store it. Also set `isSampleSession = true`.

In HomeView, the sample/preview calls pass the template name through.

**`reset()`** — clear all new fields.

### 2. HomeView.vue — section reorder

Move the `<section class="samples">` block BEFORE the `<div class="cols">` two-column layout.

Monitor `workspaceStore.emptyFolderError` — when true:
- Call `show()` from `useToast()` with message "No se encontraron modelos iNNfo en esta carpeta."
- Scroll the samples section into view with `element.scrollIntoView({ behavior: 'smooth' })`
- Reset the flag after handling

**CTA from banner**: expose `createFromStarter()` to be triggerable by template name. A new method:
```ts
async createFromStarterByName(templateName: string): Promise<void>
```
That looks up the starter by name in the `starters` array and calls `createFromStarter()`.

### 3. SampleBanner.vue — new component

Props:
- `templateName: string` — name of the template the sample uses

Emits:
- `create` — user clicked "Crear mi propio modelo"
- `dismiss` — user closed the banner

Template:
- Fixed banner below Header, full width
- Violet/indigo background (`bg-primary` / `#4D0E4E` or `#7C3AED`)
- Text in white: "Estás explorando un modelo sample que usa la plantilla **{templateName}**. Los cambios que realices no se guardan. Cuando quieras puedes crear tu propio modelo haciendo clic aquí."
- CTA button: "Crear mi propio modelo" → emits `create` and closes workspace
- Close button (X) → emits `dismiss`

Behavior:
- Dismiss state stored in `sessionStorage` key `nn_sample_banner_dismissed`
- On mount, check sessionStorage; if dismissed, don't render
- On dismiss, set sessionStorage flag

### 4. WorkspaceView.vue — integrate banner

Import `SampleBanner` and render it when `workspaceStore.isSampleSession` is true:

```vue
<SampleBanner
  v-if="workspaceStore.isSampleSession"
  :template-name="workspaceStore.sampleTemplateName"
  @create="onSampleCreate"
  @dismiss="onSampleBannerDismiss"
/>
```

Handlers:
- `onSampleCreate`: call `workspaceStore.reset()`, `modelStore.setGraph({}, [])`, navigate to Home with a query param `?createTemplate={name}`
- `onSampleBannerDismiss`: no-op (handled by sessionStorage in component)

### 5. Router guard update

The existing guard blocks `/workspace` when `!hasHandle && !hasParsed`. When `emptyFolderError` is set, both flags are false → user stays on Home automatically. No guard change needed.

## Data Flow

```
User clicks sample card
  → HomeView.onSampleClick()
  → workspaceStore.open(folderHandle)     [or loadFromUrl for preview]
  → modelStore.parseFromHandle()
  → if rootIds empty → emptyFolderError = true → stay on Home + toast
  → if rootIds found → navigate to /workspace
  → WorkspaceView sees isSampleSession → renders SampleBanner
  → User clicks CTA → navigate to Home with ?createTemplate=X
  → HomeView reads query param → triggers createFromStarter()
```

## Template name resolution

When loading a sample via URL:
1. Parse frontmatter of the loaded model
2. Read `parent_spec.name` (e.g. "business_V_0-1-1") or `template.name` (e.g. "business")
3. Humanize to display name: "Business", "Procedures"

For `loadFromUrl()`, pass the template name as a second parameter.

## Styling

SampleBanner follows the existing design system:
- Font: system-ui, sans-serif
- Colors: `#4D0E4E` primary, white text
- Border-radius: 0 (full width)
- Shadow: subtle `box-shadow` at bottom
- CTA button: white bg, primary text, `font-weight: 700`
