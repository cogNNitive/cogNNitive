# Proposal: Decoupled & Lightweight Release Pipeline

> **SUPERSEDED** by `openspec/changes/2026-10-01-tag-driven-release`. Do not implement or archive this change. It treats symptoms of a circular release model; the replacement redesigns the model. This folder is deleted once the replacement is implemented.

## Why

The current release and verification workflow across the `cogNNitive` monorepo suffers from severe operational friction, process instability, and architectural coupling. During releases and continuous integration (CI) synchronization, the local environment and IDE agents experience critical performance degradation and UI crashes (e.g., Electron White Screen of Death / IPC congestion).

An empirical root-cause analysis identified 4 major bottlenecks:

| # | Bottleneck | Mechanism | Evidence |
|---|---|---|---|
| 1 | **Monolithic Log Flooding (UI Crash)** | `scripts/verify.js` executes 580+ TAP tests, 2,344 UTF-8 scans, AST verifications, and GitHub API probes in a single noisy stream. Massive stdout bursts overwhelm IDE Electron renderers / IPC channels. | IDE freezes, complete UI blanking, requiring hard process kills. |
| 2 | **Heavy UI Compilation Coupling** | `verify` gates and doc builders topologically require compiling the full `innfo-editor` SPA (Vite + Vue-TSC with Cytoscape, Mermaid, KaTeX, D3), causing V8 heap exhaustion on developer machines. | `FATAL ERROR: AlignedAlloc Allocation failed - process out of memory` during local pre-checks. |
| 3 | **Dual-Repository Deadlock (Catch-22)** | `verify.js --release` validates that pinned distribution tags (`skills-v*`, `blueprints-v*`) exist on GitHub in `cogNNitive-web`. However, `cogNNitive-web` is only updated via `publish-web` *after* CI passes on `main`, requiring manual out-of-band tagging and multi-repo juggling. | Manifest validation fails with HTTP 404 on release commits before the public mirror is updated. |
| 4 | **Symlink Path Drift in Worktrees** | Windows directory junctions in session worktrees resolve to relative paths (`../../../node_modules`) inside `esbuild` artifacts, creating phantom drift against root executions. | `console-payload.generated.cjs` false-positive drift failures. |

---

## What Changes

1. **Compact & Quiet Test Reporter for `verify.js`**:
   - Default `verify.js` output to a quiet dot-reporter / progress summary (one dot per passed suite, summary counters at the end).
   - Verbose stdout is buffered and dumped **only on failure** (`--verbose` flag available for debug).
2. **Fast-Path Verification & Decoupled UI Builds**:
   - Split verification into:
     - `verify:quick` (fast deterministic gates, AST checks, vocabulary, specs, and unit tests without building full SPA bundles).
     - `verify:full` / `verify:release` (includes bundle and distribution artifact staging).
   - Configure Vite and Rollup `manualChunks` in `innfo-editor` to prevent memory spikes during production builds.
3. **Atomic Release Orchestrator CLI (`npm run release`)**:
   - Provide a single, deterministic maintainer CLI `scripts/release.mjs` that orchestrates:
     1. Semantic version bumping & `manifest/source.yaml` propagation.
     2. Docs and manifest regeneration with local validation.
     3. Atomic creation and push of distribution tags across `cogNNitive` and `cogNNitive-web`.
     4. Safe branch synchronization (`dev -> main`).
4. **Resilient Manifest Validation**:
   - Allow `validate-manifest.js` to accept a `--local-ref` or `--stage` mode during release preparation, resolving tags against local git commits before remote push.
5. **Universal Path Normalization in Generated Artifacts**:
   - Ensure all generators (`build-console-payload.mjs`, `build-preflight-primitives.mjs`, etc.) normalize relative module paths to remain byte-identical across root checkouts and session worktrees.

---

## Capabilities

### New Capabilities
- `release-orchestration-cli`: Unified script to execute end-to-end releases without cross-repository deadlocks.
- `quiet-verification-reporter`: Zero-noise test output for CI and AI agents, preventing IPC/DOM buffer crashes.

### Modified Capabilities
- `workspace-verification`: Fast-path vs full-path separation; decoupled from heavy Vite builds.
- `manifest-validator`: Stage-aware validation supporting pre-publish verification.
- `innfo-editor-bundler`: Optimized Rollup chunking to eliminate V8 heap exhaustion on developer workstations.

---

## Impact & File Surface

| Path | Nature of Change |
|---|---|
| `scripts/verify.js` | Quiet reporter mode by default, verbose on failure, fast-path flag. |
| `scripts/release.mjs` | New atomic release automation script. |
| `scripts/manifest/validate-manifest.js` | Support stage/pre-publish validation mode. |
| `iNNfo/apps/innfo-editor/vite.config.ts` | Rollup `manualChunks` optimization to split heavy visual libraries. |
| `package.json` | Script additions: `verify:quick`, `release`. |
| `.agents/skills/nn-dev-release/SKILL.md` | Updated developer guidance integrating `scripts/release.mjs`. |
