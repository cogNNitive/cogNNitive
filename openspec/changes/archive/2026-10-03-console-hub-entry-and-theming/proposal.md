# Proposal: Console Hub Entry Points and App-Consistent Theming

## Why

The Workspace Console Hub is the entry point to every model console, but the action
that makes the hub useful — "regenerate all consoles, copy the prompt, paste it into
your AI agent" — lives **inside the generated artifact** (`workspace_hub.html`). That
creates a circular dependency: the button that exists to *create* the hub is only
reachable once the hub already exists.

When no console has been compiled, `ConsoleHubView.vue` falls into its `not_found`
empty state and renders a **different** header — the Vue host header, which carries only
`Reload` and `Open External`. The "Regenerate Consoles" button is nowhere on screen.
The user is left with an explanation of how to compile and no action to trigger it.
This is the reported bug: *the button to regenerate consoles does not appear when the
consoles are not generated.*

Two secondary defects compound it:

1. **Duplicated prompt logic.** The prompt generator (`generateAgentPrompt`,
   `templateProcedureMap`) lives only in the artifact. Any entry point added in the
   editor would copy it, so the same bug class returns on every new surface.
2. **Visual discontinuity.** The embedded hub uses hard-coded `indigo`/`blue` palettes
   and a separate header, while the editor uses the cogNNitive `--primary` (265 48% 34%,
   brand purple) design tokens. Entering the hub drops the user out of the app's visual
   language. The maintainer asked for the hub to be **esthetically integrated with the
   application.**

## What Changes

- **Promote the generation entry point to the Vue host.** The `ConsoleHubView.vue`
  header (always present, artifact or not) gains a primary action that opens the agent
  prompt. In the `not_found` empty state it becomes the primary CTA.
- **Extract a single prompt generator seam.** Move prompt synthesis out of
  `workspace_hub.html` into one shared module the editor imports, and have the artifact
  consume the same logic. One generator, two consumers. The editor prompt uses the
  **discovered model list** the store already holds, not the artifact's static
  `#innfo-workspace-data` slot, removing the second circular dependency.
- **Rebuild the empty state as onboarding.** Benefit-led headline, one primary CTA
  ("Generate consoles with AI") plus a secondary "view procedure" path, and a preview of
  the discovered models so the user sees what will exist.
- **Align the hub's palette with the app.** Replace the artifact's hard-coded
  `indigo`/`blue` accents with the editor's semantic tokens (`--primary`, `--muted`,
  `--border`, `--card`) passed into the sandbox, and hide the artifact's own header in
  embedded mode so the two tiers stop competing.
- **Fix the dead procedure paths.** `templateProcedureMap` still points at
  `iNNfo/specs/templates/...` after the repo migrated to `iNNfo/specs/bluepriNNts/...`;
  the generated prompt hands the AI agent routes that no longer exist.

## Capabilities

### Modified Capabilities
- `workspace-hub-prompt`: the prompt generator gains a second, always-reachable consumer
  in the editor host, a shared synthesis seam, and correct procedure paths. REQ-1 is
  extended so the action exists outside the artifact; REQ-3 is corrected for the
  blueprint path migration.

### New Capabilities
- `console-hub-onboarding`: the `not_found` state becomes an actionable onboarding
  surface (headline, primary CTA, model preview, secondary documentation path) and the
  editor host header exposes the generation action whenever the artifact is absent.

### Unchanged Capabilities
- `console-architecture`: the three-tier architecture and `file://` offline hygiene for
  the standalone artifact are untouched. The artifact MUST stay build-free and offline.

## Impact

### Affected areas
- `iNNfo/apps/innfo-editor/src/components/editor/ConsoleHubView.vue` — header action,
  empty-state redesign, host-side prompt generation.
- New shared module under `iNNfo/apps/innfo-editor/src/` (e.g. `services/consolePrompt.ts`)
  exporting the synthesis function and the template→procedure map.
- `iNNfo/specs/bluepriNNts/workspace/assets/workspace_hub.html` — palette tokens,
  embedded-header suppression, corrected procedure paths.
- `iNNfo/packages/innfo-core/tests/workspace-hub.test.ts` — drift guards.
- Docs under `docs/innfo/documentation/` describing the hub flow.

### Verification
- Editor suite (`npm --workspace=@cognnitive/innfo-editor test`), core suite and
  `node scripts/verify.js` pass; `console-shell-guard` stays green.
- A unit test asserts the shared generator emits the same prompt for the same inputs as
  the artifact's inline generator contract.
- `rg "specs/templates/" iNNfo/specs/bluepriNNts/workspace` returns nothing.

### Rollback
Revert the change commits. The artifact remains independently functional; the editor
falls back to its current `not_found` copy.

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Extracting the generator breaks the artifact's `file://` hygiene | Med | The artifact keeps an inline, dependency-free copy; the shared module is the editor's only import and is never bundled into the artifact |
| Two generators drift after extraction | Med | Drift guard: same input fixtures asserted against both, or the artifact embeds a build-time copy |
| Token injection into the sandbox iframe breaks standalone use | Low | Tokens are injected only in the embedded `srcdoc` path; the artifact's own defaults remain when opened via `file://` |
| The empty-state redesign regresses the existing testid contract | Low | Keep `data-testid`/id hooks; extend the guard test before editing markup |

### Success criteria
- [ ] Opening the Consoles view with **zero** compiled artifacts shows a primary
      "Generate consoles" action in the host header / empty state.
- [ ] The generated prompt's procedure paths resolve to existing files.
- [ ] The hub's accents and surfaces match the editor's `--primary`/token palette in
      both light and dark mode.
- [ ] The standalone `workspace_hub.html` still works offline via `file://`.
- [ ] One prompt generator source; the drift guard fails if the two copies diverge.
