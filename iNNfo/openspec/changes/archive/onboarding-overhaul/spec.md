# Onboarding Overhaul — Spec

## Functional Requirements

### FR1: Empty folder detection

When the user opens a folder via "Open folder..." that contains zero `_NN.md` model files:

1. The workspace MUST NOT enter the workspace view
2. The user MUST stay on the Home page
3. A notification MUST appear: "No se encontraron modelos iNNfo en esta carpeta. Probá con los ejemplos de abajo para familiarizarte."
4. The Home page MUST scroll to the samples section

### FR2: Home page reorder

The Home page sections MUST appear in this order:

1. Hero (title + description)
2. Sandbox (if not dismissed)
3. **Example models** (Ghostbusters, Code Review) — moved up, before the two-column layout
4. Two-column layout: "Open existing" | "Official templates"
5. Community templates (load from URL)

### FR3: Read-only banner for sample exploration

When a model is loaded via a sample card click or "Preview Sample" button:

1. A banner MUST appear at the top of the workspace, below the Header
2. Banner text: "Estás explorando un modelo sample que usa la plantilla [X]. Los cambios que realices no se guardan. Cuando quieras puedes crear tu propio modelo haciendo clic aquí."
   - [X] = the template name extracted from the model's frontmatter (parent_spec.name or template.name)
3. The banner MUST have a close (X) button
4. The banner MUST be dismissable and stay dismissed for the session (sessionStorage)
5. The banner MUST have a visible CTA button: "Crear mi propio modelo"

### FR4: CTA from banner to creation

When the user clicks "Crear mi propio modelo" in the banner:

1. The current workspace MUST close
2. The user MUST navigate back to the Home page
3. The corresponding template's starter MUST be pre-highlighted/scrolled into view
4. The `createFromStarter()` function MUST be triggered for that template

### FR5: Modification guard for sample sessions

Sample-loaded models (from URL, no folder handle) already cannot be saved. This is existing behavior. No additional guard is needed — the banner satisfies the communication requirement.

## Scenarios

### Scenario 1: User opens empty folder
1. User clicks "Open folder..."
2. Picks a folder with no `_NN.md` files
3. User stays on Home page
4. Toast appears: "No se encontraron modelos iNNfo en esta carpeta."
5. Page scrolls to samples section

### Scenario 2: User opens a sample
1. User clicks "Ghostbusters" sample card
2. Sample loads in workspace
3. Violet banner appears at top: "Estás explorando un modelo sample que usa la plantilla Business..."
4. Banner shows "Crear mi propio modelo" button

### Scenario 3: User dismisses banner
1. Banner is visible in workspace
2. User clicks X button
3. Banner disappears
4. Banner stays hidden for the rest of the session
5. Reloading the page shows the banner again

### Scenario 4: User creates model from banner CTA
1. Banner is visible in workspace
2. User clicks "Crear mi propio modelo"
3. Workspace closes, navigates to Home
4. The Business starter's "Create" flow starts (folder picker → write file → open workspace)

### Scenario 5: User opens folder with models (no banner)
1. User opens a folder containing valid `_NN.md` files
2. Workspace loads normally
3. No sample banner is shown (hasHandle = true, not a sample session)

## Out of Scope

- Tour overlay (deferred)
- Starter template removal (requires user decision)
- Multi-language banner text
- Analytics or telemetry
