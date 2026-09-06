# Design: Template Freshness Diagnostic and UI Presentation (2026-09-06)

## Architectural Principle: Hexagonal Separation of Concerns

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 @cognnitive/innfo-core                 │
                  │  (Domain Logic: Validation & Diagnostic Generation)     │
                  └──────────────┬──────────────────────────┬──────────────┘
                                 │                          │
                 Driving Adapter │                          │ Driving Adapter
                                 ▼                          ▼
                  ┌────────────────────────┐      ┌────────────────────────┐
                  │  innfo-editor (Vue 3)  │      │       innfo-mcp        │
                  │   (Visual Read-Only    │      │  (Agent Stdio Bridge)  │
                  │    Presentation +      │      │                        │
                  │    Clipboard Prompt)   │      │                        │
                  └────────────────────────┘      └───────────┬────────────┘
                                                              │
                                                              ▼
                                                  ┌────────────────────────┐
                                                  │       AI Agent         │
                                                  │  (Workspace Mutation   │
                                                  │    & Git Lifecycle)    │
                                                  └────────────────────────┘
```

1. **Domain Integrity ([`innfo-core`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core)):**
   - Pure validation and calculation logic. It has zero coupling to browser DOM or MCP protocols.
   - Computes SHA-256 hash comparison between local cached spec (`specs/*.md`) and canonical remote URL.
   - Emits structured `ValidationCheck` objects.

2. **Presentation Boundary ([`innfo-editor`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor)):**
   - The editor is a presentation and authoring client.
   - Does **not** perform repo mutations for governance/staleness.
   - Enhances `ValidationReport.vue` to render AI prompt action bridges when `check.promptHint` is present.

3. **Execution Seam ([`innfo-mcp`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp) & AI Agent):**
   - The AI agent is the designated actor for workspace mutations.
   - Receives the exact diagnostic in JSON from `validate_model`, enabling conversational, consent-gated remediation.

---

## Data Structures

### `ValidationCheck` in `innfo-core/src/types.ts`

```ts
export interface ValidationCheck {
  id: string
  label: string
  description: string
  category: 'frontmatter' | 'body' | 'convention' | 'governance'
  severity: 'error' | 'warning' | 'info'
  passed: boolean
  message?: string
  code?: string
  promptHint?: string
  meta?: Record<string, unknown>
}
```

### Diagnostic Payload for Template Cache Staleness

```json
{
  "id": "template-freshness-business_V_0-2-0",
  "label": "Template Cache Freshness",
  "description": "Verifies that local cached template in specs/ matches canonical remote upstream.",
  "category": "governance",
  "severity": "warning",
  "passed": false,
  "code": "TEMPLATE_CACHE_STALE",
  "message": "Cached template specs/templates/business/business_V_0-2-0_NN.md differs from canonical remote upstream.",
  "promptHint": "Actualizá la plantilla en specs/ con la versión canónica remota y re-validá el modelo.",
  "meta": {
    "canonicalUrl": "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/business/business_V_0-2-0_NN.md",
    "localHash": "8f3b...",
    "remoteHash": "4a1c..."
  }
}
```

---

## UI Component Design (`ValidationReport.vue`)

In [`ValidationReport.vue`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor/src/components/ValidationReport.vue):

1. **Check Item Rendering:**
   When rendering an issue with `check.promptHint`:
   - Display the warning icon (amber) and message.
   - If `check.promptHint` is present, render a compact button:
     ```html
     <button
       type="button"
       class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
       @click="copyPrompt(check.promptHint)"
     >
       <Sparkles class="w-3.5 h-3.5" />
       {{ copiedId === check.id ? 'Copiado!' : 'Copiar prompt para Agente' }}
     </button>
     ```
2. **State Management:**
   - Standard `navigator.clipboard.writeText(promptHint)`.
   - Temporary `copiedId` ref with a 2-second timeout for visual feedback.
3. **No Network Write Actions:**
   - Strictly omit any "Download & Replace" or file handle modification actions. All repo state changes remain strictly with the AI agent.
