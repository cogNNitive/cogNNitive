# Design: Decoupled & Lightweight Release Pipeline

## Architecture Overview

The release and verification system must provide strong cryptographic and semantic integrity guarantees without sacrificing developer velocity or exhausting system resources.

```mermaid
flowchart TD
    subgraph Local Development & CI
        A[Developer / Agent Workspace] -->|Fast Path| B[verify.js --quick]
        B -->|Quiet Output| C[AST, Vocab, Specs, Unit Tests]
        C -->|Success < 5s| D[Green Local Feedback]
    end

    subgraph Release Pipeline
        E[npm run release --scope=skills|blueprints|suite] --> F[release.mjs]
        F --> G[1. Bump Version & Sync Manifest]
        F --> H[2. Build Docs & Regenerate Manifests]
        F --> I[3. Validate Manifest via Local/Staged Commits]
        F --> J[4. Atomic Cross-Repo Tag Push]
        F --> K[5. Merge dev to main & Push]
    end

    subgraph Remote CI & CD
        K --> L[GitHub Actions on main]
        L --> M[verify.js --release]
        M --> N[publish-web to cogNNitive-web]
    end
```

---

## Technical Specifications

### 1. Quiet & Buffered Reporter (`scripts/verify.js`)

**Problem**: Streaming hundreds of test results and file scans floods stdout with 20,000+ characters per second, overwhelming IDE WebViews, Electron IPC channels, and agent context buffers.

**Solution**:
- Implement a `runQuiet()` wrapper in `scripts/verify.js`:
  ```javascript
  function runStep(name, cmd, args, options = {}) {
    const isVerbose = process.argv.includes('--verbose') || process.env.CI_DEBUG === '1';
    let output = '';
    const proc = spawnSync(cmd, args, { encoding: 'utf8', ...options });
    
    if (proc.status === 0) {
      process.stdout.write(isVerbose ? `✔ ${name}\n` : '.');
      return true;
    } else {
      process.stdout.write(`\n❌ ${name} failed:\n`);
      process.stderr.write(proc.stdout + '\n' + proc.stderr + '\n');
      return false;
    }
  }
  ```
- Print a summary block at the end:
  ```
  Ran 48 verification checks across 580 tests.
  ✅ All checks passed in 4.2s.
  ```

---

### 2. Fast-Path vs Full Verification Partitioning

- `npm run verify:quick` (`verify.js --quick`):
  - Skips heavy Vite bundle generation and CDN staging.
  - Runs:
    - Canonical Vocabulary AST tests.
    - Template Immutability Guard.
    - Tracked Text Encoding Guard (UTF-8).
    - Legacy Ledger Guard.
    - Preflight Primitives Freshness.
    - Check Parity (manifest vs disk).
    - Unit test suites in Node runner.
- `npm run verify:full` / `npm run verify` (`verify.js`):
  - Runs full build and checks all staged build artifacts.

---

### 3. Vite Rollup Chunking & Memory Optimization (`innfo-editor`)

**Problem**: `innfo-editor` packages large graph and rendering libraries (`cytoscape`, `mermaid`, `katex`, `d3`) in a single bundle chunk during production build, exceeding Node default heap allocation on constrained systems.

**Solution**:
Configure `build.rollupOptions.output.manualChunks` in `iNNfo/apps/innfo-editor/vite.config.ts`:
```typescript
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-mermaid': ['mermaid'],
          'vendor-cytoscape': ['cytoscape', 'cytoscape-cose-bilkent'],
          'vendor-katex': ['katex'],
          'vendor-d3': ['d3-array', 'd3-color', 'd3-drag', 'd3-force', 'd3-selection', 'd3-shape', 'd3-zoom'],
        }
      }
    }
  }
})
```

---

### 4. Atomic Release Orchestrator CLI (`scripts/release.mjs`)

**Contract**:
```bash
node scripts/release.mjs --scope [skills|blueprints|suite|console] --version [X.Y.Z] [--dry-run]
```

**Steps executed atomically**:
1. **Pre-flight**: Ensure clean working tree and authenticated `gh` CLI.
2. **Version Sync**: Bump target version, run `sync-versions.mjs`, update `manifest/source.yaml`.
3. **Docs & Bundles**: Run `build-docs.mjs` and `generate-manifest.js`.
4. **Local Verification**: Run `verify.js` with staged commit validation.
5. **Cross-Repo Atomic Tagging**:
   - Push commit to `cogNNitive` `dev`.
   - Fast-forward `main`.
   - Create and push tag `<scope>-v<version>` to both `cogNNitive` and `cogNNitive-web`.
6. **Trigger CI**: Push `main` to trigger automated `publish-web` with zero tag lag.

---

### 5. Cross-Environment Worktree Path Normalization

Any script generating mirror files or CJS bundles (`scripts/build-console-payload.mjs`, `scripts/build-preflight-primitives.mjs`) must filter out relative path noise caused by Windows junctions / symlinked `node_modules`:
```javascript
const cleanCode = rawCode.replace(/(?:\.\.\/)+node_modules\//g, 'node_modules/');
```
This guarantees identical SHA-256 output whether executed from the primary workspace, a worktree, or a Linux CI runner.
