# Blueprint single path 2026-11-28

Objective: S6 of `odd/tasks/audit-followups-2026-11-28.md` (in `session/audit-followups`): blueprint version resolution has ONE path (channel + `versions.json`, skills-manager), and nn-mcp becomes read-only for bluepriNNts. Branch `session/audit-blueprint-single-path`, PR #983 carries the S7 half already.
Runner: vitest (`node node_modules/vitest/vitest.mjs run <file>`) inside `iNNfo/packages/nn-mcp`; `node --test` for scripts. Risk: item 3 (the nn-mcp tool contract is consumed by agents).

## Specs

- S6.1 Read-only hydration. nn-mcp never downloads a bluepriNNt, never hydrates a package into a domain or a cache, and never writes a blueprint file. Today `resolver-node.ts` and its hydration path do all three.
- S6.2 One typed failure. A cited bluepriNNt that is not installed fails with a typed error whose message names the exact skills-manager install command (`node ~/.agents/skills/nn-skills-lifecycle/scripts/skills-manager.js install --blueprint <name> --yes`, the same string `blueprintInstallCommand` builds in `scripts/lib/skills-commands.js`). No fallback download, no partial write.
- S6.3 One version source. Whatever version nn-mcp reports for a blueprint comes from what is installed on disk; it does not read `versions.json` or a channel to answer a version question.
- S6.4 The rest of nn-mcp is unchanged: `spec.ts` catalog loading, discovery and listing keep working, and every existing spec that covers a read-only path stays green.

## Tasks

- T1 S6.1, S6.2 delegated (writer, contract: nn-mcp tool surface) - status: pending
- T2 S6.3, S6.4 delegated (same writer, same surface) - status: pending
- T3 S6 parent: regenerate bundles, `verify:fast`, push, PR - status: pending

## Log

- L1 2026-11-28 user, on the audit list: "adelante"; L6 in the follow-ups document records the "solo lectura" decision for nn-mcp, and the decision is quoted verbatim there.
- L2 This session picked T5b (S7) up uncommitted from the killed run and landed it as PR #983. S6 was never started: the writer was still reading when the run died.
