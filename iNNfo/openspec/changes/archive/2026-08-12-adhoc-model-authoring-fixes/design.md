# Technical Design: adhoc-model-authoring-fixes

## Technical Approach

Fix adhoc model authoring issues across MCP resolution, validation diagnostics, local spec resolution, and document scanning. The strategy normalizes model IDs, resolves local file URIs directly via `node:fs`, emits distinct `[PARENT_RESOLUTION_FAILED]` errors to halt invalid concept validation cascading, adds a `validate_template` MCP tool for Level 2 templates, and updates the editor media scanner to support `.xls` while logging explicit omission warnings.

## Architecture Decisions

| Decision | Alternatives Considered | Rationale |
|----------|-------------------------|-----------|
| **Local Spec Resolver**: Use `node:fs/promises` & `fileURLToPath` for `file://` & absolute paths | HTTP `fetch` with local polyfill | `fetch()` fails on `file://` URIs in Node.js stdlib; native FS reading is reliable and offline-safe. |
| **ID Normalization**: Standardized `normalizeId()` stripping `_NN`, `_NN.md`, `.md` | Regex replace at call sites | Centralized helper in `innfo-mcp` prevents duplicate suffix lookups (`_NN_NN.md`) across all tool endpoints. |
| **Parent Diagnostics**: Emit `[PARENT_RESOLUTION_FAILED]` error & return early | Soft warning with fallback concept validation | Prevents misleading downstream missing-concept warnings when the root parent spec file fails to load. |
| **Scanner Extension**: Whitelist supported extensions and return `{ assets, warnings }` | Silent drop of unsupported files | Explicit feedback alerts users to skipped files while supporting legacy `.xls` format alongside `.xlsx`/`.docx`/`.pdf`. |

## Data Flow

```
[MCP Client / User]
       │
       ▼
 [innfo-mcp / Editor] ──normalizeId()──► Canonical Model Path (*_NN.md)
       │
       ├─► [resolver-node] ──isLocalPath?──► readFile(file:// or OS path)
       │                         │
       │                   Failure handling
       │                         │
       │                         ▼
       ├─► [innfo-core] ──!template?──► Error: [PARENT_RESOLUTION_FAILED] (early return)
       │
       └─► [useMediaScanner] ──classifyExt()──► Assets + Omission Warnings (.xls, .docx, etc.)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/composables/useMediaScanner.ts` | Modify | Add `.xls` support and collect warnings for unsupported file extensions |
| `packages/innfo-mcp/src/tools/list-read.ts` | Modify | Add `normalizeId()` to sanitize model IDs before `readModel` lookup |
| `packages/innfo-mcp/src/tools/spec.ts` | Modify | Use `normalizeId()` in `findModelFile` and expose Level 2 template resolution |
| `packages/innfo-mcp/src/tools/resolver-node.ts` | Modify | Convert `file://` URIs and OS absolute paths to local filesystem reads via `readFile` |
| `packages/innfo-mcp/src/server.ts` | Modify | Register `validate_template` MCP tool definition and request dispatcher |
| `packages/innfo-core/src/validator/model.ts` | Modify | Emit `[PARENT_RESOLUTION_FAILED]` error code and halt concept checks when parent missing |

## Interfaces / Contracts

```typescript
// packages/innfo-mcp/src/tools/list-read.ts & spec.ts
export function normalizeId(id: string): string

// apps/innfo-editor/src/composables/useMediaScanner.ts
export interface ScanResult {
  assets: ScannedAsset[]
  warnings: string[]
}

// MCP validate_template tool input schema (packages/innfo-mcp/src/server.ts)
{
  name: 'validate_template',
  description: 'Validate a Level 2 template against its Level 1 parent spec',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      content: { type: 'string' },
      url: { type: 'string' },
      root: { type: 'string' }
    }
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `normalizeId()` utility | Test inputs with `_NN`, `_NN.md`, `.md`, and bare stems resolving to canonical base |
| Unit | `resolver-node.ts` local URIs | Test `file:///...` and Windows/Unix absolute paths reading via mocked `readFile` |
| Unit | `useMediaScanner` classifier | Verify `.xls` inclusion and warning generation for unsupported `.zip`/`.txt` files |
| Integration | `validateModel` diagnostic codes | Assert `[PARENT_RESOLUTION_FAILED]` error when parent spec path is invalid |
| Integration | MCP `validate_template` tool | Test end-to-end Level 2 template validation via MCP tool invocation |

## Threat Matrix

| Boundary / Feature | Status | Expected Safe Behavior | Planned RED Tests |
|--------------------|--------|------------------------|-------------------|
| `file://` & Absolute Path Resolution | Applicable | Resolves valid local paths safely via `fileURLToPath`/`readFile`; non-existent paths throw controlled error resulting in `[PARENT_RESOLUTION_FAILED]` without arbitrary file execution. | Pass malformed `file://` URI, missing local path, and path traversal attempt (`../../secret`). Assert controlled resolution failure. |
| Media Scanner Extension Handling | Applicable | Only whitelisted file extensions (`.xls`, `.xlsx`, `.docx`, `.pdf`, media) are processed. Unsupported extensions are safely omitted with explicit warnings. | Scan directory with `.exe`, `.zip`, `.xls`. Assert `.xls` is included and `.exe`/`.zip` trigger explicit omission warnings. |
| Model ID Normalization | Applicable | Strips trailing `_NN` / `.md` suffixes to prevent recursive path duplication (`_NN_NN.md`). | Call `findModelFile` with `model_NN_NN.md`. Assert resolution returns `model_NN.md` cleanly without infinite loop or double suffix. |

## Migration / Rollout

No migration required. Changes are backward-compatible bug fixes and diagnostic enhancements.

## Open Questions

None.
