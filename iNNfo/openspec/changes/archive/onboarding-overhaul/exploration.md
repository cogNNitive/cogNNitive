# Onboarding Overhaul — Exploration

## Problem

Onboarding a new user into iNNfo is confusing:

1. **No sample-first path**: The Home page presents "Open existing" and "Official templates" above samples. A new user doesn't know what an iNNfo model looks like before being asked to create one.
2. **Empty folders → dead end**: Opening a folder with no `_NN.md` files lands on an empty workspace with no guidance. The user doesn't know what happened or what to do next.
3. **No read-only sample mode**: Samples open in full edit mode but can't be saved (no folder handle). The user isn't told they're in a temporary session.
4. **No CTA from sample to creation**: After exploring a sample, there's no clear path to "now create your own."

## Options Considered

| Option | Approach | Verdict |
|--------|----------|---------|
| **A — Wizard step-by-step** | Modal with 3 steps (template → name → review) before entering workspace | Rejected — too many clicks, adds complexity |
| **B — Guided tour overlay** | First-time overlay pointing to sidebar, editor, views | Deferred — good for later analytics |
| **C — Quick-start empty states** | "Start from scratch" button + empty states throughout workspace | Rejected partially — user didn't like pre-selected first elements |
| **D — Sample-first onboarding** | Samples as primary entry point, read-only banner, CTA to create | **SELECTED** — core approach |
| **E — Template + immediate editing** | Create model in memory, skip folder picker, progressive save | Rejected — user didn't like pre-selected first elements |

## Decision

**Option D** is the chosen approach. Three concrete deliverables:

### 1. Empty folder detection
`workspaceStore.open()` checks for `_NN.md` files. If 0 found → redirect to Home with a clear notification.

### 2. Home reorder
Samples section moves above the fold as the primary CTA. Starters and "Open existing" move down.

### 3. Read-only workspace banner
When opening a sample (from `onSampleClick` or `previewSample`), the workspace shows a prominent banner:
> "Estás explorando un modelo sample que usa la plantilla [X] para que te puedas familiarizar con la aplicación. Los cambios que realices no se guardan. Cuando quieras puedes crear tu propio modelo haciendo clic aquí."

The "crear tu propio modelo" CTA triggers a flow to create a new model from the corresponding template.

## Scope

- `apps/innfo-editor`: HomeView.vue, WorkspaceView.vue, workspaceStore.ts
- `packages/innfo-core`: if needed for empty-folder detection logic
- No new packages, no new routes, no API changes
