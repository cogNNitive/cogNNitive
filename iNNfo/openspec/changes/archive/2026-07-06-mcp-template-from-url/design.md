# Design: Template Resolution from `parent_spec.url`

## Technical Approach

Replace the hardcoded `TEMPLATE_SPECS` resolution path in `mutate.ts` with a new `getTemplateFromUrl()` that resolves templates directly from the model's `parent_spec.url` — the source of truth. The existing `getTemplate()` in `spec.ts` remains untouched for `handleGetTemplate()` (MCP client by name only).

## Architecture Decisions

### Decision: URL is source of truth, name-based fallback for backward compat

**Choice**: In `mutate.ts`, check `parent_spec.url` first; if absent, fall back to `parent_spec.name` → `getTemplate()` (existing path).
**Alternatives considered**: Only URL path, no fallback. Risked breaking models without `url` set.
**Rationale**: The spec requires backward compatibility. The guard `if (parent_spec.name)` already exists; the URL path adds an inner branch without changing the outer guard.

### Decision: Keep `getTemplate()` unchanged

**Choice**: Do not modify `getTemplate()` in `spec.ts` — add `getTemplateFromUrl()` as a new export.
**Alternatives considered**: Inlining `getTemplateFromUrl` logic into `getTemplate`. Would require adding a `url` parameter to an existing function, updating all call sites including `handleGetTemplate` which has no URL.
**Rationale**: Cleaner separation. `handleGetTemplate` continues to work by name; `validateModel`/`applyChange` use the URL. Two distinct responsibilities, two functions.

## Data Flow

```
validateModel(model) / applyChange(model)
  │
  ├─ parent_spec.url EXISTS?
  │   YES → getTemplateFromUrl(rootDir, url, name)
  │     │  → resolveParentChain(url, name, .spec-cache/)
  │     │     → download(url) → cache to {name}_NN.md → follow parent chain up
  │     │  → coreGetTemplate(cache) → level-3 or level-2 SpecDocument
  │     │  → [fallback] read {name}_NN.md directly, parse frontmatter → SpecDocument
  │     └  → null on any error (404, timeout, parse)
  │
  └─ NO → getTemplate(rootDir, templateName, version) [backward compat]
       → TEMPLATE_SPECS map → SPEC_BASE_URL + versioned file
       → resolveParentChain → coreGetTemplate → SpecDocument
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/innfo-mcp/src/tools/spec.ts` | Modify | Add exported `getTemplateFromUrl(rootDir, url, name)`. Keep `getTemplate()` unchanged. |
| `packages/innfo-mcp/src/tools/mutate.ts` | Modify | `validateModel()` and `applyChange()`: try `getTemplateFromUrl` first, fall back to `getTemplate`. Add import for `getTemplateFromUrl`. |

## Interfaces / Contracts

```typescript
// New function in spec.ts — resolves template directly from a URL
// without using TEMPLATE_SPECS or SPEC_BASE_URL.
export async function getTemplateFromUrl(
  rootDir: string,
  url: string,
  name: string,
): Promise<SpecDocument | null>
```

The function signature is intentionally simpler than `getTemplate` (no `explicitVersion` parameter) — the URL already encodes the version. The `name` argument is the parent spec name (e.g. `business_V_0-1-1`) used as the cache filename key.

### Resolver bundle dependency

No new dependencies. `resolveParentChain`, `coreGetTemplate` (aliased from `getTemplate` in resolver), and `parseFrontmatter` are already imported in `spec.ts`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `getTemplateFromUrl` with valid URL | Mock `resolveParentChain` to return a cache with a level-3/level-2 spec; assert `coreGetTemplate(cache)` result is returned |
| Unit | `getTemplateFromUrl` when `coreGetTemplate` returns undefined | Mock chain returns cache without level-2/3; assert fallback reads `{name}_NN.md`, parses frontmatter, returns `SpecDocument` with `level: fm.level ?? 2` |
| Unit | `getTemplateFromUrl` on network error | Mock `resolveParentChain` to throw; assert returns `null` |
| Unit | `validateModel` with `parent_spec.url` | Mock `getTemplateFromUrl`; assert it's called with correct url and name |
| Unit | `validateModel` without `parent_spec.url` | Assert fallback to `getTemplate` (existing path) |
| Unit | `applyChange` same URL resolution pattern | Same mock assertions as `validateModel` |
| Integration | `handleGetTemplate` unaffected | Assert it still calls `getTemplate`, not `getTemplateFromUrl` |

## Migration / Rollout

No migration required. The `TEMPLATE_SPECS` map and `SPEC_BASE_URL` remain in `spec.ts` for the legacy `getTemplate()` path. They are candidates for removal in a future change once all callers use URL-based resolution.

## Open Questions

- [ ] None — the spec is clear; the codebase patterns are well-understood from reading source.
