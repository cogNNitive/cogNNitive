# Specification: Workspace Hub Agent Prompt Generator

## 1. Overview
This specification defines the functional and technical requirements for the **"Regenerate All Consoles" Prompt Generator** embedded in `workspace_hub.html` and its compilation procedure `compile_workspace_hub_NN.md`.

## 2. Requirements

### REQ-1: Header Action Button
- `workspace_hub.html` MUST provide a header action button labeled **"Regenerate Consoles"** (with refresh/sync icon).
- The button MUST be accessible, styled with Tailwind/glass styling consistent with cogNNitive presets, and distinct from search inputs.

### REQ-2: Prompt Generation Modal
- Clicking the action button MUST open an interactive modal (`#prompt-modal`).
- The modal MUST include:
  - Header with title ("Agent Instruction Generator") and close button (`ESC` key or click outside closes the modal).
  - Info notice explaining what the prompt does.
  - Readonly `<pre>` / `<code>` text area displaying the dynamically generated agent prompt.
  - Primary button **"Copy Prompt"** with clipboard integration (`navigator.clipboard.writeText` with fallback for restricted environments).
  - Confirmation visual indicator ("Copied!" state).

### REQ-3: Dynamic Prompt Content Contract
The generated prompt MUST dynamically incorporate:
1. Workspace metadata (title, version).
2. The list of models extracted from `#innfo-workspace-data`.
3. Template-specific procedure mapping:
   - `business` -> `compile_business_console_NN.md` (or relevant compilation procedure)
   - `procedures` -> `compile_procedures_console_NN.md`
   - `organization` -> `compile_org_chart_console_NN.md` / `compile_organization_console_NN.md`
   - `metrics` -> `create_timeline_NN.md` / `compile_metrics_console_NN.md`
   - `analysis` -> `compile_strategic_audit_console_NN.md`
   - `innovation` -> `compile_innovation_funnel_console_NN.md`
   - `documentation` -> `compile_docs_portal_console_NN.md`
   - default fallback -> `compile_<template>_console_NN.md`
4. Step-by-step instructions for the LLM agent:
   - Step 1: Inspect `workspace_NN.md` and verify model integrity.
   - Step 2: Sequentially regenerate each model's console artifact in `artifacts/`.
   - Step 3: Execute `compile_workspace_hub_NN.md` to refresh `artifacts/workspace_hub.html`.

### REQ-4: Offline & file:// Hygiene
- The modal, script, and prompt generation MUST function 100% offline via `file://`.
- Banned: `fetch()`, `XMLHttpRequest`, ES Modules (`type="module"`), external unbundled scripts.
