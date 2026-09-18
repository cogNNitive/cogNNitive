# Tasks: Multi-Agent Guidance and AI Workflow Navigation

## Review Workload Forecast
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr (all work integrated in dev)
400-line budget risk: Low

---

## 1. Phase 1: AI Workflow Navigation & Exit Vectors
- [x] 1.1 Add "Back to editor" button and emit close event in `iNNfo/apps/innfo-editor/src/components/editor/AiWorkflowPanel.vue` <!-- id: 1.1 -->
- [x] 1.2 Update `uiStore.selectNode()` in `iNNfo/apps/innfo-editor/src/stores/uiStore.ts` to automatically set `activeView = 'editor'` when `activeView === 'ai-guide'` <!-- id: 1.2 -->
- [x] 1.3 Update "Use AI" button in `iNNfo/apps/innfo-editor/src/components/layout/Header.vue` to toggle `activeView` between `'ai-guide'` and `'editor'` <!-- id: 1.3 -->
- [x] 1.4 Add unit/component tests for `selectNode` view switching and `AiWorkflowPanel` close <!-- id: 1.4 -->

## 2. Phase 2: Embedded Procedure Model & Guide Parser Upgrade
- [x] 2.1 Upgrade `iNNfo/apps/innfo-editor/src/ai-guide/procedure_NN.md` to canonical `procedures` `V_0-2-1` template format (`template_version: V_0-2-1`, `# NN index` with wikilinks, concepts, modern tools and matrices) <!-- id: 2.1 -->
- [x] 2.2 Update `iNNfo/apps/innfo-editor/src/ai-guide/guide.ts` to parse canonical format, multi-agent tools (Antigravity, Claude Code, Codex, OpenCode, Cursor), dynamic subtitles and prompts <!-- id: 2.2 -->
- [x] 2.3 Update unit tests in `iNNfo/apps/innfo-editor/tests/unit/guide.test.ts` <!-- id: 2.3 -->

## 3. Phase 3: Universal Agent Guidance Documentation
- [x] 3.1 Update `docs/innfo/index.md` to frame multi-agent compatibility (Antigravity, Claude Code, Codex, OpenCode, Cursor) with OpenCode as recommended reference client <!-- id: 3.1 -->
- [x] 3.2 Update `docs/use/index.html` and other key doc entrypoints to mention universal agent support <!-- id: 3.2 -->

## 4. Phase 4: Full Verification & Integrity Checks
- [x] 4.1 Run unit tests: `pnpm --filter @cognnitive/innfo-editor test` <!-- id: 4.1 -->
- [x] 4.2 Run integrity checks: `node scripts/check-integrity.js` <!-- id: 4.2 -->
- [x] 4.3 Verify typecheck / build: `pnpm --filter @cognnitive/innfo-editor build` <!-- id: 4.3 -->
