# Tasks: Workspace Hub Agent Prompt Generator

## Phase 1: Workspace Hub Asset Implementation
- [x] 1.1 Add "Regenerate Consoles" button in header of `iNNfo/specs/templates/workspace/assets/workspace_hub.html`.
- [x] 1.2 Implement the Prompt Generator modal UI (`#prompt-modal`) with dark glass styling.
- [x] 1.3 Implement dynamic prompt synthesis logic mapping templates to compilation procedures.
- [x] 1.4 Implement robust copy-to-clipboard handler with fallback and visual feedback.

## Phase 2: Procedure & Documentation Alignment
- [x] 2.1 Update `iNNfo/specs/templates/workspace/procedures/compile_workspace_hub_NN.md` to reference the prompt generation feature.

## Phase 3: Testing & Verification
- [x] 3.1 Add unit tests for `workspace_hub.html` prompt generator, DOM structure, and offline `file://` hygiene in `innfo-core/tests/`.
- [x] 3.2 Run test suites (`npm test` / `vitest`) to verify integrity.
- [x] 3.3 Create verification report and archive change.
