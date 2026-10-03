# Design: Console Hub Entry Points and App-Consistent Theming

## Technical Approach

Two seams, one visual pass.

**Seam A — shared prompt synthesis.** Introduce
`iNNfo/apps/innfo-editor/src/services/consolePrompt.ts`, a pure module that exports
`generateConsolePrompt(input)` and `TEMPLATE_PROCEDURE_MAP`. It takes a plain input
(`{ title, version, models: Array<{ title, template, modelPath, consolePath, hasConsole }> }`)
and returns the prompt string. `ConsoleHubView.vue` imports it directly. The artifact
(`workspace_hub.html`) keeps an inline, dependency-free copy of the same function
because it MUST stay `file://`-standalone with no build step — but the mapping and the
generated text are pinned by a drift guard so the two stay byte-comparable for the same
fixtures.

Why the duplicated copy is acceptable: the artifact is a **generated deliverable** that
lives in a sandboxed iframe and cannot import editor modules; the alternative (bundling
the editor into the artifact) breaks REQ-4 offline hygiene and the whole console
architecture. The seam's value is that the *editor* has one generator, and the drift
guard makes divergence a test failure, not a silent rot.

**Seam B — the host is the stable entry point.** `ConsoleHubView.vue` computes
`discoveredModels` from the store today (lines 45-108) and already knows whether the
artifact exists (`loadState`). The generation action is driven by that state:

- `loadState === 'not_found'` → primary CTA in both the host header and the empty state.
- `loadState === 'ready'` → the artifact's own button is enough; the host header shows a
  secondary "Regenerate" affordance that opens the same shared modal.

A small prompt modal is added to the Vue host (mirroring the artifact's), so the user
does not need the artifact to exist in order to read/copy the prompt.

**Visual pass — tokens into the sandbox.** `processedHtmlContent` already injects
`<style>` and a bridge `<script>` into the hub `srcdoc` (lines 693-766). Extend it to:

1. Read the editor's resolved token values (`--primary`, `--primary-foreground`,
   `--muted`, `--border`, `--card`, …) from `getComputedStyle(document.documentElement)`.
2. Inject them as a `:root` block into the hub document plus a small alias layer mapping
   the artifact's existing accent classes to `var(--primary)`.
3. Hide the artifact's `<header>` in embedded mode (already hides `#preview-panel`).

The artifact itself switches its hard-coded accent utilities to tokens with safe
fallbacks (`var(--innfo-accent, var(--nn-accent, #4c1d95))`), so standalone use still
renders. This is where the artifact and the editor agree: injected `:root` on one side,
`var()` with fallback on the other.

## Architecture Decisions

| # | Decision | Choice | Rejected (tradeoff) |
|---|---|---|---|
| D1 | Prompt generator home | New `services/consolePrompt.ts` in the editor; artifact keeps an inline copy pinned by a drift test | Bundling editor code into the artifact (breaks `file://` REQ-4); leaving two unguarded copies (silent drift) |
| D2 | Editor prompt input source | `discoveredModels` from `knowledgeStore`, mapped to the shared input shape | Parsing `#innfo-workspace-data` (requires the artifact to exist — the very circular dependency being removed) |
| D3 | Empty-state primary action | Opens the shared prompt modal in Vue (copy to clipboard), not a shell command | Auto-running a compile procedure (no safe executor in the browser; guidance-only) |
| D4 | Host header in `ready` state | Keep the artifact's own button; add a secondary host action | Removing the artifact button (breaks standalone) |
| D5 | Token transport | Inject resolved `:root` custom properties from the editor into the `srcdoc`, plus an alias layer | PostMessage token sync (async, racy on first paint); duplicating editor CSS into the artifact |
| D6 | Artifact accent utilities | Replace `indigo`/`blue` literals with `var()` + fallback | Leaving hard-coded (the reported esthetic mismatch); requiring tokens to exist standalone |
| D7 | Header suppression in embed | Add `header { display:none }` to the injected embedded style only | Editing the artifact to conditionally hide its header (needs a host flag; keep artifact host-agnostic) |
| D8 | Procedure path root | Fix map to `iNNfo/specs/bluepriNNts/...`; drift test asserts existence | Leaving `specs/templates/` (dead routes handed to the agent) |
| D9 | Model preview in empty state | Reuse `allModelTargets` as pending cards | A separate discovery query (duplicate logic) |
| D10 | Drift guard location | `innfo-core/tests/workspace-hub.test.ts` (artifact contract) + an editor unit test for `consolePrompt.ts` | A single test (can't see both sides from one package boundary) |

## Data Flow

```
knowledgeStore.rootIds ──► discoveredModels ──► allModelTargets
                                   │
                                   ▼
                        consolePrompt.generateConsolePrompt(input)
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                          ▼
   Vue host: prompt modal + copy              (contract)  artifact inline generator
                                                          └─ #innfo-workspace-data

editor document tokens (getComputedStyle)
              │
              ▼
   processedHtmlContent(srcdoc) injects :root + alias-layer + header-suppression
              │
              ▼
   artifact consumes var(--...) with fallback
```

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/apps/innfo-editor/src/services/consolePrompt.ts` | Create | Shared `generateConsolePrompt` + `TEMPLATE_PROCEDURE_MAP` (bluepriNNts paths) |
| `iNNfo/apps/innfo-editor/src/services/consolePrompt.test.ts` | Create | Unit test: mapping, prompt content, path correctness |
| `iNNfo/apps/innfo-editor/src/components/editor/ConsoleHubView.vue` | Modify | Header action, prompt modal, empty-state redesign, token injection, header suppression |
| `iNNfo/specs/bluepriNNts/workspace/assets/workspace_hub.html` | Modify | Tokenized accents with fallback, corrected path map |
| `iNNfo/packages/innfo-core/tests/workspace-hub.test.ts` | Modify | Assert token fallbacks + `bluepriNNts` paths; keep existing id contract |
| `docs/innfo/documentation/console-hub.md` | Create/Modify | Document the entry-point + theming flow |

## Interfaces / Contracts

```ts
// consolePrompt.ts
export interface ConsolePromptModel {
  title: string
  template: string
  modelPath: string
  consolePath?: string
  hasConsole?: boolean
}
export interface ConsolePromptInput {
  title: string
  version: string
  models: ConsolePromptModel[]
}
export const TEMPLATE_PROCEDURE_MAP: Record<string, string>
export function generateConsolePrompt(input: ConsolePromptInput): string
```

The artifact's inline `generateAgentPrompt()` MUST produce the same output for the same
input shape (drift guard).

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `consolePrompt.ts` mapping + prompt sections + no `specs/templates/` | Vitest, table-driven fixtures |
| Unit (core) | artifact contains token fallbacks, `bluepriNNts` paths, existing ids | Vitest string assertions in `workspace-hub.test.ts` |
| Unit (editor) | empty-state renders primary CTA when `loadState==='not_found'` | Vitest + Vue Test Utils (jsdom) |
| Contract | editor vs artifact prompt parity for shared fixtures | Fixture compared in both packages' suites |
| Manual | embedded hub matches editor palette light/dark; standalone still renders | `file://` + editor dev server |

## Migration / Rollout

No data migration. Ships on `dev`; the artifact change rides the `blueprints-v*` tag, the
editor change the app build. The procedure-path fix is backward compatible (only the
emitted prompt text changes).

## Open Questions

- [ ] Should the host header show the generation action in the `ready` state at all, or
      is a single always-present icon button preferable to reduce chrome? (D4 leans to a
      secondary action; confirm with maintainer during apply.)
- [ ] Should injected tokens include the full `--innfo-*` family or only the accent set
      actually consumed by the artifact? (D5 leans to the consumed set to keep the
      injected style small.)
