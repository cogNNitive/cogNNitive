# Tasks: iNNfo Subsystem Tooling Unification and Legacy Cleanup

- [x] 1. Root Tooling Elevation & Script Migration
  - [x] 1.1 Move `iNNfo/eslint.config.mjs`, `iNNfo/.prettierrc.json`, `iNNfo/.prettierignore` to repo root.
  - [x] 1.2 Move `iNNfo/scripts/check-spec-version.mjs` to `scripts/check-spec-version.mjs` and update relative paths.
  - [x] 1.3 Update root `package.json` with direct workspace scripts and linter dependencies.
  - [x] 1.4 Update `scripts/check-integrity.js` to call root workspace commands.

- [x] 2. Remove Nested Monorepo Manifests and Legacy Residue
  - [x] 2.1 Remove `iNNfo/package.json`, `iNNfo/package-lock.json`, and nested `iNNfo/node_modules/`.
  - [x] 2.2 Remove duplicate agent configs: `iNNfo/.agents/`, `iNNfo/.atl/`, `iNNfo/.claude/`, `iNNfo/.opencode/`, `iNNfo/AGENTS.md`, `iNNfo/openspec/`.
  - [x] 2.3 Remove legacy scripts and directories: `iNNfo/run-dev.bat`, `iNNfo/runplaywright.bat`, `iNNfo/test-quick.bat`, `iNNfo/archive/`, `iNNfo/test-results/`, `iNNfo/.spec-cache/`, `iNNfo/.gitignore`.

- [x] 3. Root Dependency Install & Verification Gate
  - [x] 3.1 Run `npm install` from root to ensure clean lockfile and link workspaces.
  - [x] 3.2 Run `node simulation/run-all.mjs`.
  - [x] 3.3 Run `node scripts/check-integrity.js --pre-push`.
  - [x] 3.4 Produce `verify-report.md`.
