# Tasks: All-Sessions Retention and Intuitive Closing Protocol

## 1. Specification & Governance Updates
- [x] 1.1 Update `openspec/specs/conversations-lifecycle/spec.md` with guaranteed zero-discard policy and continuous turn logging.
- [x] 1.2 Update `actioNN/skills/nn-router/SKILL.md` (section 2.5) with continuous logging, footer UX, and natural closing triggers.
- [x] 1.3 Update `actioNN/AGENTS.md` conversation logging protocol guidelines.

## 2. Implementation & Code Refactor
- [x] 2.1 Refactor `actioNN/skills/nn-trannsform/scripts/lib/conversations.js`: modify `evaluateSessionDiscard` to guarantee retention (`discard: false`) and remove any file deletion logic.
- [x] 2.2 Add incremental turn append helper in `conversations.js` if needed for logging workflows.

## 3. Unit Testing & Verification
- [x] 3.1 Update `actioNN/skills/nn-trannsform/test/unit/test-conversations-lifecycle.js` to assert that all sessions are retained (no discard under 0, 1, or multi-turn conditions).
- [x] 3.2 Run test suite (`node test-conversations-lifecycle.js` and `test/run.js`) and ensure 100% tests pass.
