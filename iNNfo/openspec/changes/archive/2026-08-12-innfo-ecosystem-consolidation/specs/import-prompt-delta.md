# Delta: import-panel — Prompt Changes

## Change Type

**Modified capability**: The Import Panel agent prompt is updated to use the `innfo:` prefix via the shared utility, and to reference `workflows/import.workflow.md` instead of `AGENT.md`.

## Old Behavior

The current `agentPrompt` computed property in `ImportPanel.vue` returns:

```
I need to import the documents listed below and transform them into iNNfo models.

Load the **nn-trannsform** skill — it handles document ingestion, normalization, and conversion. Follow traNNsform/AGENT.md for the exact procedure.

After the skill loads, verify the innfo-mcp MCP server is active (the skill includes this check). Then process each file from traNNsform/input/ and write the resulting iNNfo models into the appropriate location.
```

If files are detected, a `Files to import:` section is appended with the file list.

## New Behavior

The `agentPrompt` computed property MUST produce a prompt starting with `innfo:`, referencing the workflow file, and removing explicit skill loading and MCP verification. The file listing format is unchanged.

**Exact prompt format (static portion):**

```
innfo: I need to import the documents in traNNsform/input/ and transform them into iNNfo models.

Open traNNsform/workflows/import.workflow.md and follow the import pipeline step by step.
```

If files are detected, the same `Files to import:` list is appended after the static portion:

```

Files to import:
  - report.docx
  - notes.md
```

### Rationale for Specific Changes

| Change | From | To | Why |
|--------|------|----|-----|
| **Prefix** | (none — bare prompt) | `innfo:` | Single trigger keyword activates `nn-router` |
| **Skill reference** | `Load the **nn-trannsform** skill` | (removed — implicit) | Router + orchestrator dispatch to the correct skill based on context |
| **Procedure reference** | `Follow traNNsform/AGENT.md` | `Open traNNsform/workflows/import.workflow.md` | Procedure is now a structured workflow file |
| **MCP verification** | Explicit sentence about innfo-mcp check | (removed — implicit) | Handled by router/orchestrator infrastructure |
| **Destination model path** | `write the resulting iNNfo models into the appropriate location` | (removed — implicit via workflow) | Workflow file defines where models go — don't duplicate in trigger prompt |

## Requirements

### R-IMP-D01: Prompt Starts with "innfo:"

The import prompt MUST begin with `innfo: ` followed by a space, then the instruction text.

#### Scenario: Copied prompt starts with innfo:
- GIVEN files are detected in `traNNsform/input/`
- WHEN the user copies the import prompt
- THEN the clipboard content starts with `innfo:`
- AND pasting it into the agent activates the nn-router

### R-IMP-D02: Prompt References import.workflow.md

The prompt MUST reference `workflows/import.workflow.md` instead of `AGENT.md`. The exact reference text:

```
Open traNNsform/workflows/import.workflow.md and follow the import pipeline step by step.
```

### R-IMP-D03: Prompt Uses innfoPrompt() Utility

The prompt generation MUST call the shared `innfoPrompt(content)` utility from `src/ai-guide/prompt.ts`.

#### Scenario: innfoPrompt wraps the instruction
- GIVEN the raw instruction `"I need to import the documents..."`
- WHEN `innfoPrompt(instruction)` is called
- THEN the result is `"innfo: I need to import the documents..."`

### R-IMP-D04: File List Preserved

The `Files to import:` section with detected filenames MUST be preserved after the static prompt portion. The format is unchanged from the current behavior — one `  - filename.ext` per line.

#### Scenario: File list appended after innfo: prefix
- GIVEN files `report.docx` and `notes.md` are detected
- WHEN the prompt is generated
- THEN the prompt includes `innfo: ...` at the start
- AND the file list appears after the workflow reference, separated by a blank line

#### Scenario: No files — no file list section
- GIVEN `traNNsform/input/` is empty
- WHEN the prompt is generated
- THEN only the static prompt portion is shown
- AND no `Files to import:` section is appended

### R-IMP-D05: Explicit Skill Loading Removed

The prompt MUST NOT contain any explicit "Load the ... skill" instruction. The `innfo:` prefix handles skill routing automatically.

## Acceptance Criteria

- [ ] `ImportPanel.vue` `agentPrompt` computed uses `innfoPrompt()` from `prompt.ts`
- [ ] Copied prompt starts with `innfo:`
- [ ] Prompt references `workflows/import.workflow.md`
- [ ] Explicit skill name (`nn-trannsform`) removed from prompt
- [ ] Explicit MCP verification sentence removed from prompt
- [ ] File list section format is unchanged
- [ ] No file list shown when directory is empty

## File Paths Affected

| File | Action | Notes |
|------|--------|-------|
| `apps/innfo-editor/src/ai-guide/prompt.ts` | **Create** | Shared `innfoPrompt()` utility (same file as export delta) |
| `apps/innfo-editor/src/components/editor/ImportPanel.vue` | Modify | Wrap `agentPrompt` with `innfoPrompt()`; update workflow reference; remove skill/MCP sentences |
