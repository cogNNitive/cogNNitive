# Proposal: Monorepo Architecture Refactor

## Goal
Improve codebase maintainability, decoupling, testability, and adherence to SOLID principles by refactoring several tightly-coupled components in both `packages/innfo-core` and `apps/innfo-editor`.

## Scope
- **Frontend Infrastructure**: Decouple `IndexedDB` persistence from Pinia `workspaceStore`.
- **Frontend Business Logic**: Extract validation service logic from `WorkspaceView.vue`.
- **Frontend UI View**: Decouple static imports of sub-editors in `WorkspaceView.vue` using Vue dynamic components.
- **Core Parser**: Move from custom regular expressions to standard AST/YAML parsers.
- **Core Drivers**: Decouple I/O drivers using ports and adapters patterns.

## Context
See the approved `implementation_plan.md` for overall discussion.
