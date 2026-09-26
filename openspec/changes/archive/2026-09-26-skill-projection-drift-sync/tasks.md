# Tasks: Skill Projection Drift Sync

> **Review Workload Guard**: `size:exception` approved for `delivery_strategy: single-pr` (holistic fix spanning projection library, atomic mirror, manager commands, and preflight audit).

- [x] 1. Core Projection Library
  - [x] 1.1 Create `skills/nn-preflight/scripts/lib/projection.js` with `isProjectableName`, `classifyProjection`, and `hashTree`.
  - [x] 1.2 Create `skills/nn-preflight/scripts/lib/projection.test.js` covering classification rules and content hashing.
- [x] 2. Mirror Directory Helper in atomic-fs
  - [x] 2.1 Add `mirrorDir(src, dest, isIncluded)` in `scripts/lib/atomic-fs.js`.
  - [x] 2.2 Add unit tests for `mirrorDir` (orphans removal, type replacement, excluded preservation) in `scripts/lib/shared-libs.test.js`.
- [x] 3. CLI Passthrough and State Round-trip
  - [x] 3.1 Pass `scope` in `resolvedArgs` in `scripts/skills-manager.js`.
  - [x] 3.2 Retain `projections` in `emptyState` and `loadState` in `scripts/lib/skills-commands.js`.
  - [x] 3.3 Retain `projections` in `loadState` in `skills/nn-preflight/scripts/preflight-check.js`.
- [x] 4. Commands Re-projection & Ownership Logic
  - [x] 4.1 Refactor `projectSkillsToAgents` in `scripts/lib/skills-commands.js` to implement ADR-2 ownership table, ADR-3 workspace scope guard, and ADR-4 `mirrorDir`.
  - [x] 4.2 Wire `projectSkillsToAgents` in `cmdUpdate` and `cmdInstall` in addition to `cmdBootstrap`.
  - [x] 4.3 Add tests in `scripts/skills-manager.test.js` for `update` re-projection when up-to-date and workspace scope skip.
- [x] 5. Preflight Projection Drift Audit
  - [x] 5.1 Add offline projection drift audit against recorded entries in `skills/nn-preflight/scripts/preflight-check.js`.
  - [x] 5.2 Set `ACTION_REQUIRED` and exit 1 upon projection drift with formatted report items.
  - [x] 5.3 Add tests for preflight projection drift in `skills/nn-preflight/scripts/preflight-check.test.js`.
- [x] 6. Verification and Integrity Checks
  - [x] 6.1 Run full test suite and `node scripts/check-integrity.js`.
