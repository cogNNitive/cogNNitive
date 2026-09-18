# Proposal: Multi-Agent Guidance and AI Workflow Navigation

## Intent
1. **Unlock AI Workflow Navigation**: Eliminate navigation lock-in when the "Use AI" panel (`activeView === 'ai-guide'`) is active by:
   - Adding an explicit "Back to editor" / close action button in `AiWorkflowPanel.vue`.
   - Updating `uiStore.selectNode()` to automatically transition `activeView = 'editor'` when selecting any concept or element in the `LeftSidebar` tree.
   - Making the "Use AI" header button toggle between `'ai-guide'` and `'editor'`.
2. **Upgrade Embedded Procedure to Canonical Spec**: Modernize `src/ai-guide/procedure_NN.md` from legacy metadata (`spec_version: V_0-2-1`, `parent_spec: procedures_V_0-2-0`) to the current canonical `procedures` template specification (`template_version: V_0-2-1`, `# NN index` with wikilinks, concept definitions, clean field blocks).
3. **Robust Guide Parser**: Update `guide.ts` to parse modern canonical procedure formats resiliently and eliminate hardcoded single-agent assumptions.
4. **Universal Multi-Agent Guidance**: Clarify across embedded guides and documentation (`docs/innfo/index.md`, `docs/use/index.html`, etc.) that cogNNitive is open and compatible with ANY modern AI coding agent (Antigravity, Claude Code, Codex, OpenCode, Cursor, etc.), while presenting OpenCode Desktop as the recommended reference desktop client.

## Scope

### In Scope
- **UI & Navigation**:
  - `AiWorkflowPanel.vue`: Add a "Back to editor" / close button in the panel header that reverts `activeView` to `'editor'`.
  - `uiStore.ts`: In `selectNode()`, automatically reset `activeView = 'editor'` if `activeView === 'ai-guide'` so tree clicks immediately reveal the selected node in the editor.
  - `Header.vue`: Make the "Use AI" button toggle `activeView` between `'ai-guide'` and `'editor'`.
- **Procedure Specification & Parser**:
  - `iNNfo/apps/innfo-editor/src/ai-guide/procedure_NN.md`: Align frontmatter, index section (`# NN index`, `* [[Work]]`, etc.), concept headers (`# NN Work`, `## NN Work: ...`), and matrices with canonical `procedures` `V_0-2-1`.
  - `iNNfo/apps/innfo-editor/src/ai-guide/guide.ts`: Update regex/parser to handle modern `# NN` headings, wikilink indexes, and multiple AI tools without brittle parsing.
  - `iNNfo/apps/innfo-editor/tests/unit/guide.test.ts`: Verify parser output against upgraded procedure model and prompt extraction.
- **Multi-Agent Documentation**:
  - Update `docs/innfo/index.md`, `docs/use/index.html`, and related docs to remove exclusivity phrasing ("the supported AI agent") and frame OpenCode Desktop as the reference client alongside universal agent support.

### Out of Scope
- Architectural changes to external template generators or MCP transport protocols.
- Changes to unrelated editor views (e.g. GraphViewer, GanttChart, Consoles).

## Capabilities

### Modified Capabilities
- `ai-workflow-navigation`: Enables fluid transitions out of the AI guide panel via header button toggle, panel header return button, or sidebar tree node selection.
- `canonical-procedure-embedded-model`: Standardizes `procedure_NN.md` to canonical `procedures` specification (`V_0-2-1`) syntax and wikilink conventions.
- `multi-agent-guidance`: Replaces single-agent exclusivity with open multi-agent documentation and tool guidance across both editor UI and public documentation.

## Approach
1. **Navigation State Management**:
   - In `iNNfo/apps/innfo-editor/src/stores/uiStore.ts`, modify `selectNode(id)` so that if `activeView.value === 'ai-guide'`, it sets `activeView.value = 'editor'`.
   - In `iNNfo/apps/innfo-editor/src/components/layout/Header.vue`, update the "Use AI" click handler to toggle between `'editor'` (when currently `'ai-guide'`) and `'ai-guide'`.
   - In `iNNfo/apps/innfo-editor/src/components/editor/AiWorkflowPanel.vue`, add a dismiss / "Back to editor" button invoking `uiStore.setActiveView('editor')`.
2. **Procedure Model Upgrade**:
   - Refactor `iNNfo/apps/innfo-editor/src/ai-guide/procedure_NN.md` to reference `parent_spec.name: "procedures"` and `template_version: "V_0-2-1"`.
   - Use `# NN index` with `* [[Work]]`, `* [[Roles]]`, `* [[Artifact]]`, `* [[Tools]]`, and canonical `## NN <Concept>: <Name>` element definitions.
   - Describe multi-agent support broadly while highlighting OpenCode Desktop as the recommended desktop client.
3. **Parser Modernization**:
   - Update `iNNfo/apps/innfo-editor/src/ai-guide/guide.ts` to support modern section patterns (`# NN Work`, `## NN Work: ...`, `# NN Tools`, `# NN matrices`) as well as legacy fallbacks.
   - Ensure dynamic subtitle and tool listing reflect multi-agent capabilities.
4. **Docs & Ecosystem Alignment**:
   - Review and update `docs/innfo/index.md`, `docs/use/index.html`, and related documentation pages to communicate broad compatibility with AI agents (Antigravity, Claude Code, Codex, OpenCode, Cursor) with OpenCode Desktop as the recommended reference client.
5. **Testing & Verification**:
   - Run vitest unit tests (`npm test`), verify `guide.test.ts`, and run linting / typecheck suites.

## Affected Areas
- `iNNfo/apps/innfo-editor/src/components/editor/AiWorkflowPanel.vue`
- `iNNfo/apps/innfo-editor/src/components/layout/Header.vue`
- `iNNfo/apps/innfo-editor/src/stores/uiStore.ts`
- `iNNfo/apps/innfo-editor/src/ai-guide/procedure_NN.md`
- `iNNfo/apps/innfo-editor/src/ai-guide/guide.ts`
- `iNNfo/apps/innfo-editor/tests/unit/guide.test.ts`
- `docs/innfo/index.md`
- `docs/use/index.html`

## Risks
- **Parser Regressions**: Changing `procedure_NN.md` structure could break `guide.ts` if parsing logic is too strict.
  *Mitigation*: Update and extend unit test suite in `guide.test.ts` covering all steps, tools, prompts, and matrix extraction.
- **Navigation Inconsistency**: Users might expect "Use AI" state to persist across unrelated background actions.
  *Mitigation*: Explicit tree node selection and header toggle explicitly denote intent to edit or switch views.

## Rollback Plan
Revert commits touching `uiStore.ts`, `Header.vue`, `AiWorkflowPanel.vue`, `procedure_NN.md`, `guide.ts`, and documentation files.

## Success Criteria
- [ ] Clicking "Use AI" when already on `ai-guide` toggles view back to `editor`.
- [ ] Clicking "Back to editor" button inside `AiWorkflowPanel.vue` returns to `editor`.
- [ ] Selecting any node in the left sidebar tree while on `ai-guide` switches `activeView` to `editor` and selects the node.
- [ ] `procedure_NN.md` complies with canonical `procedures` `V_0-2-1` template spec.
- [ ] `guide.ts` parses the upgraded `procedure_NN.md` without warnings or lost steps/prompts.
- [ ] Documentation and UI accurately position cogNNitive as multi-agent compatible with OpenCode Desktop as reference client.
- [ ] All unit, component, and lint tests pass.
