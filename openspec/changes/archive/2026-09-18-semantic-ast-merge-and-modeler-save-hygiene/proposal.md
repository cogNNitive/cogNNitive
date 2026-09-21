# Proposal: Semantic AST Merge & Modeler Save Hygiene

## Why
When users edit a model in the iNNfo Modeler (browser UI) while an AI agent concurrently modifies the underlying file on disk (via `innfo-mcp` or direct edit), saving from the UI overwrites the on-disk file (Last-Write-Wins), destroying the agent's work. Additionally:
1. The Modeler UI's serializer was erroneously generating a `# NN index` with nested elements for Level-3 models, causing hard validation errors (`format.index-no-elements`).
2. `innfo-mcp`'s `add_element` discarded fields passed at the root of `args` when not explicitly nested under `args.fields`, and omitted separating blank lines when the preceding element lacked a trailing newline.

## What Changes
1. **`@cognnitive/innfo-core` — Semantic AST Merge (`mergeModels`):**
   - Provide a pure function `mergeModels(disk: ParsedModel, memory: ParsedModel): ParsedModel`.
   - Intelligently merges concepts, elements, fields, descriptions, markers, and matrix cells without textual merge conflicts.
2. **`iNNfo Editor` — Save Collision Detection & Auto-Merge:**
   - In `WorkspacePersistenceService.ts`, check on-disk content before writing.
   - If disk content differs from memory snapshot, run `mergeModels` before saving and notify the user.
3. **`iNNfo Editor` & `innfo-core` — Level-3 Index Serialization Guard:**
   - Prevent `recursiveSerializer.ts` from populating element taxonomy for Level-3 models.
   - Prevent `serializeModel` in `innfo-core` from emitting `# NN index` for Level-3 models.
4. **`innfo-core` / `innfo-mcp` — `add_element` Hardening:**
   - Fall back to root-level fields in `args` if `args.fields` is omitted.
   - Ensure a blank line precedes newly added elements.

## Impact
- **Non-breaking:** Existing valid models, specs, and MCP tools remain 100% compatible.
- **Zero data loss:** Concurrent agent and UI edits are unified cleanly.
