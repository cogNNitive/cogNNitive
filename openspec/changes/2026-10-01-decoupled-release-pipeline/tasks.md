# Tasks: Decoupled & Lightweight Release Pipeline

## Batch 1: Quiet & Resilient Verification Tooling
- [ ] 1.1 Implement quiet dot-reporter mode in `scripts/verify.js` with failure-only verbose dumping and summary metrics.
- [ ] 1.2 Add `--verbose` and `--quick` flags to `scripts/verify.js`.
- [ ] 1.3 Add `npm run verify:quick` script to root `package.json` for rapid local feedback (< 5s).
- [ ] 1.4 Audit and ensure path normalization regex in all generated mirror build scripts (`scripts/build-console-payload.mjs`, `scripts/build-preflight-primitives.mjs`, `scripts/build-trannsform-slug-mirror.mjs`).

## Batch 2: Vite Build & Memory Optimization
- [ ] 2.1 Configure `manualChunks` in `iNNfo/apps/innfo-editor/vite.config.ts` for `mermaid`, `cytoscape`, `katex`, and `d3`.
- [ ] 2.2 Verify `npm --workspace=@cognnitive/innfo-editor run build` completes cleanly without memory warnings or heap spikes.
- [ ] 2.3 Verify `scripts/build-docs.mjs` executes topological builds smoothly without V8 OOM errors.

## Batch 3: Atomic Release Automation CLI
- [ ] 3.1 Author `scripts/release.mjs` supporting `--scope` (`skills`, `blueprints`, `suite`, `console`), `--version`, and `--dry-run`.
- [ ] 3.2 Wire GitHub API tag resolution and cross-repository synchronization (`cogNNitive` + `cogNNitive-web`) in `scripts/release.mjs`.
- [ ] 3.3 Add `npm run release` script to root `package.json`.
- [ ] 3.4 Update `.agents/skills/nn-dev-release/SKILL.md` to reference `scripts/release.mjs` in release option [c].

## Batch 4: End-to-End Validation & Verification
- [ ] 4.1 Test `npm run verify:quick` in a fresh session worktree.
- [ ] 4.2 Test `npm run verify` in release mode.
- [ ] 4.3 Validate that `scripts/manifest/validate-manifest.js` works reliably with both local and remote pins.
- [ ] 4.4 Verify that GitHub Actions CI runs remain 100% green with reduced runtime and zero log bloat.
