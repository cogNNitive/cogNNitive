# Tasks: Unified Samples Workspace SSOT & Distribution Pipeline

- [x] 1. Scaffold `_samples_nn/` Workspace Structure <!-- id: 1 -->
  - [x] 1.1 Create directories: `_samples_nn/models`, `_samples_nn/procedures`, `_samples_nn/sources/nn` <!-- id: 1.1 -->
  - [x] 1.2 Copy existing canonical Ghostbusters models from `iNNfo/specs/templates/*/samples/` into `_samples_nn/models/` with unified canonical naming <!-- id: 1.2 -->
  - [x] 1.3 Create `_samples_nn/workspace_NN.md` linking all domain models, procedures, and tags <!-- id: 1.3 -->
  - [x] 1.4 Copy workspace hub compilation procedure to `_samples_nn/procedures/compile_workspace_hub_NN.md` <!-- id: 1.4 -->

- [x] 2. Implement Synchronization Script `scripts/sync-samples.mjs` <!-- id: 2 -->
  - [x] 2.1 Create `scripts/sync-samples.mjs` mapping `_samples_nn/models/` to `iNNfo/specs/templates/*/samples/` <!-- id: 2.1 -->
  - [x] 2.2 Implement `--check` mode to detect drift <!-- id: 2.2 -->
  - [x] 2.3 Add unit tests `scripts/sync-samples.test.mjs` <!-- id: 2.3 -->

- [x] 3. Tooling & Verification Integration <!-- id: 3 -->
  - [x] 3.1 Add `"sync:samples"` and `"check:samples"` npm scripts in root `package.json` <!-- id: 3.1 -->
  - [x] 3.2 Add sample sync verification to `scripts/verify.js` <!-- id: 3.2 -->
  - [x] 3.3 Run `npm run check:integrity` to confirm all gates pass <!-- id: 3.3 -->
