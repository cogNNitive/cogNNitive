# Tasks: Repository Structure Encapsulation, Simulation Renaming, and Cleanup

- [x] 1. Test Fixture Relocation & Hardening
  - [x] 1.1 Move `temp/simulacro-refactorizacion` to `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion`.
  - [x] 1.2 Update `iNNfo/packages/innfo-core/tests/simulacro-user-workspace.test.ts` to reference the permanent fixture path.
  - [x] 1.3 Verify test passes: `npm --prefix iNNfo/packages/innfo-core test`.

- [x] 2. Simulation Suite Renaming
  - [x] 2.1 Rename directory `simulacro` to `simulation`.
  - [x] 2.2 Update `simulation/lib/harness.mjs` path constant `SIM`.
  - [x] 2.3 Update `simulation/package.json` name to `cognnitive-simulation`.
  - [x] 2.4 Update `simulation/README.md` and `simulation/FINDINGS.md` runner commands.
  - [x] 2.5 Run `node simulation/run-all.mjs` and verify all 8 scenarios pass.

- [x] 3. Dogfooding Workspace Encapsulation (`workspace_NN/`)
  - [x] 3.1 Create directory `workspace_NN/`.
  - [x] 3.2 Move `models/`, `sources/`, `procedures/`, and `artifacts/` into `workspace_NN/`.
  - [x] 3.3 Move `workspace_NN.md` into `workspace_NN/workspace_NN.md`.
  - [x] 3.4 Update relative external paths in `workspace_NN/workspace_NN.md` (`../iNNfo/specs/...`, `../skills/...`, `../scripts/...`).

- [x] 4. Ephemeral and Legacy Cleanup
  - [x] 4.1 Delete legacy root directory `specs/`.
  - [x] 4.2 Delete unmanaged dev directories `dev/` and `conversations/`.
  - [x] 4.3 Clean disposable directories in `temp/`.

- [x] 5. Comprehensive Verification Gate
  - [x] 5.1 Run `node simulation/run-all.mjs`.
  - [x] 5.2 Run `node scripts/check-integrity.js --pre-push`.
  - [x] 5.3 Run `npm test`.
  - [x] 5.4 Update tasks and produce `verify-report.md`.
