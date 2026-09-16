# Design: Workspace Single-Root Navigation & Progressive Disclosure (Slice 2)

## UI Navigation & Progressive Disclosure Flow

```
Agent / User
    │
    ▼ (1. Read workspace_NN.md)
[ Root Model Node ]
    ├── [[Models]]       ──► (2. Read models_NN.md on demand)
    ├── [[Sources]]      ──► (2. Read sources_NN.md on demand - inspect summary)
    ├── [[Procedures]]   ──► (2. Read procedures_NN.md on demand - inspect summary)
    └── [[Artifacts]]    ──► (2. Read artifacts_NN.md on demand - inspect summary)
                                  │
                                  ▼ (3. Deep read leaf on demand)
                             [ sources/nn/interview_NN.md ]
```

## Layer 1: UI Engine (`innfo-editor`)

1. **`LeftSidebar.vue`**:
   - Computes root nodes from metamodel store.
   - Replaces custom sources/procedures views with a unified hierarchical TreeView.
2. **`metamodelStore.ts`**:
   - Manages asynchronous model cache: `Map<string, { state: 'loading'|'ready'|'error', node: ModelNode }>`.

## Layer 2: AI Skills (`.agents/skills/`)

1. **`nn-innfo/SKILL.md` & `nn-trannsform/SKILL.md`**:
   - Adds guidelines instructing agents to use Tier 2 catalogs for zero-I/O discovery before reading individual files.
