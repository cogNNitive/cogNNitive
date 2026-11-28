# Audit follow-ups 2026-11-28

Objective: fix the findings of the 2026-11-27 coherence audit of main (PRs #854-#967). Branches: one `session/audit-*` worktree per unit, one PR each.
Delivery: ask-on-risk; merging is the maintainer's call. Runner: vitest (`node node_modules/vitest/vitest.mjs run <file>`) and `node --test` for scripts.

## Specs

- S1 Artifact path containment. Every procedure artifact path (`at` substituted from run params, an agent-supplied `value`, the `verify` fallback) resolves inside the domain root, is relative, has no `..` segment, and never targets a `*_NN.md` model; a violation is refused with a typed error before any write or hash. One helper is reused by `run-outputs.ts`, both copies in `procedure-record.ts`, and `export-console.mjs` (which already has `insideRoot`). A directory path does not throw EISDIR. Tests through the public tool entry points include `../` and absolute paths.
- S2 Blueprint compatibility (P5) works in the distributed bundle: the engine version comes from a generated value, not a path relative to `__dirname`; the supported format versions are derived from `iNNfo/specs/iNNfo_V_*`, not a hand list; `requires` is accepted in one form only.
- S3 No fail-open gates from #933: when `coNNtent` (or a declared path) is missing, `verify.js`, `build-core-mirrors.mjs`, `regen.js` and `guard-skill-package-paths.js` fail instead of skipping silently.
- S4 Matrix holes: the on-disk `-` filler that the serializer writes for a missing (row, column) pair is not read back as a cell, so a non-rectangular sparse matrix round-trips to the same set of cells and the lazy prune converges; the `PERSISTED_EMPTY_MATRIX_CELLS` warning does not fire on what the engine itself writes; the spec sentence in `openspec/changes/matrix-sparse-storage/` matches the behaviour.
- S5 Console charts after #967: `renderChart` does not emulate the ECharts API (no `Chart.prototype` patch, no `window.echarts` stub, no `echarts` fallback path); an unsupported series type fails visibly instead of becoming `line`; one SVG renderer for the procedure flow; no test-only seams in production code; the reversal of the "hecho con ECharts" decision is logged in `odd/tasks/console-proc-nav.md` and `odd/tasks/domain-console-visuals.md`.
- S6 Blueprint version resolution has one path (channel + `versions.json`); nn-mcp hydration stops being a second installer. Pending a maintainer decision.
- S7 Remove compatibility shims: `frozenBlueprintDirs`, the catalog `frozen` section, the `<base>_V_<ver>_NN.md` alias.
- S8 Housekeeping: publish or discard the unpushed branches (`t3/innfo-entity-field-heuristic`, `t3/unify-console-export-action`, `session/procedure-graph-lanes`); file the missing issues (domain-creation frictions); close duplicates (#913 shipped, #816 duplicate of #915).

## Tasks

- T1 S1 delegated (parallel unit, security) - PR #972, commit 4df080dd3 - in review
- T2 S2,S3 delegated (parallel unit) - PR #973, commits 734c5fce4, f9300d141 - in review
- T3 S4 delegated (parallel unit, persisted format) - PR #974 - in review
- T4 S5 delegated (parallel unit, console hot area) - PR #975, commits a31392d23, e35eedbbe - in review
- T5 S6,S7 blocked on maintainer decision (nn-mcp hydration: read-only or delegate to the installer) - pending
- T6 S8 inline - partial: web#32 branch published as PR #976; domain-creation frictions filed as #977; #913 and #915 were already closed by another session; `t3/unify-console-export-action` (#33) waits for #975 (console is serial); `session/procedure-graph-lanes` belongs to a live worktree, left to its owner

## Log

- L1 2026-11-28 user, on the audit's "Qué haría, en orden" list: "adelante"
- L2 2026-11-28 #967 merged at 04:50 before this started, so S5 is a fix-forward on main; the procedures thread already moved to `session/procedure-prose-style`, so audit item 1 needs no action.
- L3 Route: T1-T4 are independent units with disjoint edit surfaces, each several files, launched together (Writer trigger a). T1 names high-risk item 2, T3 item 1, T2 item 5.
- L4 Writers' checks: T1 8/8 new tests RED→GREEN, nn-mcp suite green (timeout flakes green serially); T2 RED→GREEN per script, verify:fast red only on two guards green when re-run alone; T3 nn-core 2832/2832, roundtrip byte-identical; T4 1040/1040 console tests, no real-browser check. Parent spot check re-ran one focused suite per unit: all green. No independent verifier (repo profile: focused test plus CI). pr-overlap: no hand-written overlap.
- L5 Pre-push from the primary fails because it builds the stale primary tree; push a branch from its own worktree.
