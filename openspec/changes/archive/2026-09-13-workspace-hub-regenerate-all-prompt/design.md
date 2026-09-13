# Design: Workspace Hub Agent Prompt Generator

## Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│               artifacts/workspace_hub.html             │
│                                                        │
│  [#innfo-workspace-data] (JSON Data Slot)              │
│       │                                                │
│       ▼                                                │
│  [Client-side IIFE / DOM Parser]                       │
│       │                                                │
│       ├──► Renders Grid & Badges                       │
│       │                                                │
│       └──► When "Regenerate Consoles" Clicked:         │
│            Synthesizes Markdown Agent Prompt           │
│            Opens Glass Modal (#prompt-modal)           │
│            Copies to Clipboard on User Action          │
└────────────────────────────────────────────────────────┘
                       │
                       ▼ User pastes to AI Agent
┌────────────────────────────────────────────────────────┐
│                   AI Agent Execution                   │
│                                                        │
│  1. Scans workspace models & checks validity           │
│  2. Runs template compile procedures per model         │
│  3. Re-runs compile_workspace_hub_NN.md                │
│  4. All artifacts/*_console.html & hub updated!        │
└────────────────────────────────────────────────────────┘
```

## Technical Decisions

1. **Self-contained in `workspace_hub.html`**:
   No external bundler or network dependency required. Logic resides within the existing template script block.
2. **Template-to-Procedure Mapping**:
   A declarative dictionary maps known template IDs to their standard compilation procedures in `iNNfo/specs/templates/`.
3. **Clipboard Hygiene with Fallback**:
   Uses `navigator.clipboard.writeText` where available, with standard `document.execCommand('copy')` / text selection fallback for local `file://` contexts where clipboard API permissions may be restricted.
