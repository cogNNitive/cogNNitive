# Delta: export-panel — Prompt Changes

## Change Type

**Modified capability**: The Export Panel prompt text is updated to use the `innfo:` prefix, reference `source.path` instead of the display name, and reference `workflows/export.workflow.md` instead of `AGENT.md` + explicit skill name.

## Old Behavior

The current `exportPrompt` computed property in `ExportPanel.vue` returns:

```
I need to generate an HTML visualizer for the model "{{modelFilename}}".

Load the **nn-innfo** skill — it handles iNNfo model operations, MCP server activation (innfo-mcp), and visualizer generation. Follow traNNsform/AGENT.md for the export procedure.

After the skill loads, verify the innfo-mcp MCP server is active (the skill includes this check), then generate the visualizer and save it to traNNsform/output/.
```

Where `modelFilename` is derived from `source.path` via:
```typescript
const path = selectedModel.value.source?.path ?? ''
return path.split(/[/\\]/).pop() || selectedModel.value.name || ''
```

## New Behavior

The `exportPrompt` computed property MUST produce a prompt starting with `innfo:`, using `source.path` directly, and referencing the workflow file:

**Exact prompt format:**

```
innfo: I need to generate an HTML visualizer for the model at "{{source.path}}".

Open traNNsform/workflows/export.workflow.md and follow the export pipeline step by step.
```

Where `{{source.path}}` is the full relative path of the selected model (from `selectedModel.value.source?.path`).

### Rationale for Specific Changes

| Change | From | To | Why |
|--------|------|----|-----|
| **Prefix** | (none — bare prompt) | `innfo:` | Single trigger keyword activates `nn-router` |
| **Model reference** | Display name (filename only) | `source.path` (full path) | Agent needs the exact file path to read the model — display name is ambiguous |
| **Skill reference** | `Load the **nn-innfo** skill` | (removed — implicit) | Router auto-loads on `innfo:` — explicit skill loading is redundant |
| **Procedure reference** | `Follow traNNsform/AGENT.md` | `Open traNNsform/workflows/export.workflow.md` | Procedure is now a structured workflow file, not monolithic AGENT.md |
| **MCP verification** | Explicit sentence about innfo-mcp check | (removed — implicit) | Router + workflow-orchestrator handle MCP readiness; not a user concern |
| **Output path** | `traNNsform/output/` | (implicit via workflow) | Workflow file defines the output path — don't repeat it in the trigger prompt |

## Requirements

### R-EXP-D01: Prompt Starts with "innfo:"

The export prompt MUST begin with the literal string `innfo: ` followed by a space, then the instruction. This triggers the `nn-router` skill.

#### Scenario: Copied prompt starts with innfo:
- GIVEN a model is selected in ExportPanel
- WHEN the user copies the export prompt
- THEN the clipboard content starts with `innfo:`
- AND pasting it into the agent activates the nn-router

### R-EXP-D02: Prompt Uses source.path

The prompt MUST reference the model via its full `source.path` property, not just the filename. The path is the value of `selectedModel.value.source?.path`.

#### Scenario: source.path is used in prompt
- GIVEN a model at path `MyProject/Models/Ghostbusters_V_0-1-2_business_NN.md`
- WHEN the export prompt is generated
- THEN the prompt contains `model at "MyProject/Models/Ghostbusters_V_0-1-2_business_NN.md"`
- AND NOT `model at "Ghostbusters_V_0-1-2_business_NN.md"` (filename only)

#### Scenario: source.path is undefined
- GIVEN a model with no `source.path` (e.g., loaded from URL, not saved to disk)
- WHEN the export prompt is generated
- THEN the prompt falls back to `model at "{{modelFilename}}"` (the old display name behavior)
- AND the `innfo:` prefix is still present

### R-EXP-D03: Prompt References export.workflow.md

The prompt MUST reference `workflows/export.workflow.md` instead of `AGENT.md`. The reference is:

```
Open traNNsform/workflows/export.workflow.md and follow the export pipeline step by step.
```

### R-EXP-D04: Prompt Uses innfoPrompt() Utility

The prompt generation MUST call the shared `innfoPrompt(content)` utility from `src/ai-guide/prompt.ts` rather than manually prepending `"innfo: "`.

```typescript
// innfoPrompt() implementation
export function innfoPrompt(content: string): string {
  return `innfo: ${content}`
}
```

#### Scenario: innfoPrompt wraps the instruction
- GIVEN the raw instruction `"I need to generate..."`
- WHEN `innfoPrompt(instruction)` is called
- THEN the result is `"innfo: I need to generate..."`

## Acceptance Criteria

- [ ] `ExportPanel.vue` `exportPrompt` computed uses `innfoPrompt()` from `prompt.ts`
- [ ] Copied prompt starts with `innfo:`
- [ ] Prompt includes `source.path` (not just filename)
- [ ] Prompt references `workflows/export.workflow.md`
- [ ] Explicit skill name (`nn-innfo`) removed from prompt
- [ ] Explicit MCP verification sentence removed from prompt
- [ ] Fallback to old display name when `source.path` is undefined
- [ ] `ExportNavigator.vue` step 2 prompt also uses `innfoPrompt()`

## File Paths Affected

| File | Action | Notes |
|------|--------|-------|
| `apps/innfo-editor/src/ai-guide/prompt.ts` | **Create** | Shared `innfoPrompt()` utility |
| `apps/innfo-editor/src/components/editor/ExportPanel.vue` | Modify | Wrap `exportPrompt` with `innfoPrompt()`; change model reference to `source.path`; update workflow reference |
| `apps/innfo-editor/src/components/editor/ExportNavigator.vue` | Modify | Wrap step 2 prompt with `innfoPrompt()` |
