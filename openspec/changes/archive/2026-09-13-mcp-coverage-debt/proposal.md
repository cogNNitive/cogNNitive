# Proposal: MCP Coverage Debt & Ratchet Gate

## Context
Adding tools and features to `@cognnitive/innfo-mcp` had introduced branch and line coverage debt across `apply-change.ts`, `reachability.ts`, `spec.ts`, and `spec-backup.ts`.
This change backfills unit test coverage for previously untested branches, fixes an in-flight template validation resolution bug in `applyChange`, and ratchets the CI coverage floor.

## Objectives
1. Add test coverage for `applyChange` (`bump_version` with `parent_version`, `rename_element` with asset folder rename, `generate_index`).
2. Add test coverage for `pruneOrphanedSpecs` and transitive asset reachability.
3. Fix parent template in-flight validation in `applyChange`.
4. Ratchet Vitest coverage thresholds to `lines: 89, branches: 79, functions: 88, statements: 89`.
