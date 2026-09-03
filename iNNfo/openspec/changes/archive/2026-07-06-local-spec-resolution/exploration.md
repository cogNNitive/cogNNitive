## Exploration: local-spec-resolution

### Current State
Today, `packages/innfo-core/src/resolver.ts` implements `resolveParentChain`, which is responsible for resolving spec inheritance chains (Level 0, 1, 2). It imports Node's `node:fs/promises` and `node:path` statically to write specs into `.spec-cache`. Because this file is exported from `packages/innfo-core/src/index.ts`, browser bundlers encounter compilation errors due to Node-native dependencies.
Additionally, spec resolution always downloads parent specs from public GitHub URLs even if identical specification files exist locally in the repository's `specs/` folder.

### Affected Areas
- `packages/innfo-core/package.json` — Update exports configuration if needed.
- `packages/innfo-core/src/index.ts` — Remove `resolver.ts` exports to avoid bundling Node-dependent code.
- `packages/innfo-core/src/resolver.ts` — Abstract out Node dependencies by either extracting the file, introducing a driver interface, or relocating the resolver.
- `packages/innfo-mcp/src/tools/spec.ts` — Update tool calls to use the new resolution logic with local `specs/` search and URL download fallback.
- `apps/innfo-editor/tests/unit/metamodel.test.ts` — Adjust import path for pure resolver utilities like `getSpecForLevel`.

### Approaches

1. **Approach 1: Driver-based abstraction in `innfo-core`**
   Introduce a filesystem driver interface (`SpecResolverDriver`) in `innfo-core`. Refactor `resolveParentChain` to be browser-safe (pure logic and fetch) by receiving this driver. Provide a Node.js implementation of this driver in a separate file (e.g. `packages/innfo-core/src/resolver-node.ts` or directly in the caller) that is excluded from the default entrypoint.
   - **Pros**:
     - `resolveParentChain` remains in `innfo-core` and can be utilized in the browser with a browser-safe driver in the future.
     - Clean separation of IO mechanism from resolution logic.
   - **Cons**:
     - Introduces additional interface/abstraction overhead for a utility primarily used by the Node-based MCP tool.
   - **Effort**: Medium

2. **Approach 2: Relocate Resolver to `innfo-mcp`**
   Since the filesystem/network spec resolver is only used at runtime by the Node-based MCP server (`packages/innfo-mcp`), move `resolveParentChain` and the Node-specific caching logic completely to `packages/innfo-mcp` (or as a separate subpath export). Keep only the pure functions (`getSpecForLevel`, `getTemplate`, etc.) in `innfo-core/src/resolver.ts` without any Node imports.
   - **Pros**:
     - Completely removes the compilation issues in `innfo-core` for browser environments.
     - Simplifies the architecture: `innfo-core` is strictly for model/spec parsing and validation, while caching and network orchestration live where they are run.
     - Easier to implement local file search in `specs/` directory since `innfo-mcp` is already Node-only.
   - **Cons**:
     - Any future Node tools in other packages would need to depend on the resolver's new location.
   - **Effort**: Low

### Recommendation
**Approach 2 (Relocate Resolver to `innfo-mcp`)** is recommended. The spec resolver's file-system caching and network retrieval behaviors are purely Node/tooling concerns and are not required by the core library or the frontend editor. Pure functions like `getSpecForLevel` can remain in a clean `resolver.ts` within `innfo-core` without any Node imports, keeping the editor's unit tests green with minimal changes. The local search logic will recursively scan the `specs/` directory for filenames matching the URL or spec name, providing an offline-first spec resolution.

### Risks
- **Path Resolution mismatches**: Different models might reference legacy or newer specs that are not present locally. We must ensure a reliable recursive filename match and robust fallback to downloading from the URL when a file is missing.
- **Test environment imports**: We need to update the editor test import paths for `getSpecForLevel` to point to the clean `resolver.ts` file.

### Ready for Proposal
Yes — The orchestrator should proceed to define the proposal for this change using Approach 2.
