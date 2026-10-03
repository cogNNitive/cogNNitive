# Delta for Console Hub Onboarding

## ADDED Requirements

### Requirement: Actionable empty state

When no compiled console artifact is found (`loadState === 'not_found'`), the editor Consoles view MUST render an onboarding surface that answers what is happening, why, and what to do next. The surface MUST contain a benefit-led headline describing the console that will exist, exactly one visually dominant primary call to action that triggers prompt generation, a secondary lower-emphasis path revealing the compile procedure for advanced users, and a preview of the discovered domain models as pending cards. The surface MUST NOT be a dead end: it MUST NOT offer only a passive re-check action, and the generation action MUST remain available even when no domain models are discovered.

#### Scenario: Empty state leads to action

- GIVEN the editor Consoles view with no compiled hub artifact
- WHEN the empty state renders
- THEN a primary generation CTA is present and visually dominant
- AND the discovered models are shown as pending previews
- AND activating the primary CTA opens the agent prompt

#### Scenario: No models discovered

- GIVEN the editor with a workspace that exposes no domain models
- WHEN the empty state renders
- THEN it explains that no models were discovered
- AND it still offers the generation action

### Requirement: Editor-native theming of the embedded hub

The embedded Workspace Console Hub MUST be visually consistent with the editor application in both light and dark mode. The host MUST pass the editor's semantic design tokens (`--primary` and the surrounding token family) into the sandbox so the artifact resolves its accents and surfaces from them rather than from hard-coded palette literals. When the artifact is opened standalone via `file://`, it MUST fall back to its own default palette with no host present.

#### Scenario: Embedded hub inherits editor tokens

- GIVEN the hub embedded in the editor via `srcdoc`
- WHEN the artifact renders
- THEN its accent surfaces resolve from the injected token values
- AND switching the editor between light and dark updates the embedded hub

#### Scenario: Standalone artifact keeps defaults

- GIVEN `workspace_hub.html` opened directly via `file://`
- WHEN no host tokens are injected
- THEN the artifact renders with its own default palette
- AND no script error occurs for the missing host

### Requirement: Single-tier header in embedded mode

When the hub is embedded in the editor, the artifact's own `<header>` MUST be suppressed so the editor's Console Hub header is the only chrome. The artifact's header MUST remain when opened standalone.

#### Scenario: Embedded mode shows one header

- GIVEN the hub embedded in the editor
- WHEN the artifact renders
- THEN its internal `<header>` is hidden
- AND the editor header remains the single point of navigation and action
