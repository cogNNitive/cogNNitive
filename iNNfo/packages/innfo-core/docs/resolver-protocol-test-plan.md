# Resolver Protocol — Test Plan

> Date: 2026-07-01
> Status: Draft
> Purpose: Define test scenarios for the spec resolver protocol in `@cognnitive/innfo-core`.

## Protocol Summary

As defined in defiNNe §3, when an application loads a level 3 model:

1. Read the model's `parent.url`
2. If not cached in `specs/`, download from URL
3. Save to `specs/<parent.name>_NN.md`
4. Read the downloaded spec's `parent.url`, repeat until level 0
5. On subsequent loads, check `specs/` first
6. If `parent` changes (version bump), detect mismatch and re-download

## Test Scenarios

### T1: First Load — Full Chain Resolution

**Input**: Ghostbusters_V_0-3-0_business_NN.md

**Expected behavior**:
1. Read `parent.url` → download `business_V_1-0-0_NN.md`
2. Save to `specs/business_V_1-0-0_NN.md`
3. Read its `parent.url` → download `NN_V_0-2-0_NN.md`
4. Save to `specs/NN_V_0-2-0_NN.md`
5. Read its `parent.url` → download `defiNNe_V_0-2-0_NN.md`
6. Save to `specs/defiNNe_V_0-2-0_NN.md`
7. No more `parent` → chain complete

**Resulting structure**:
```
📁 Ghostbusters_V_0-3-0_business/
  📄 Ghostbusters_V_0-3-0_business_NN.md
  📁 specs/
    📄 business_V_1-0-0_NN.md
    📄 NN_V_0-2-0_NN.md
    📄 defiNNe_V_0-2-0_NN.md
```

**Verification**:
- All 3 cached files exist
- Each cached file has correct `level` in frontmatter
- Each cached file's `parent` matches the expected chain

### T2: Second Load — Cache Hit

**Input**: Same model, same session

**Expected behavior**:
1. Check `specs/business_V_1-0-0_NN.md` — exists → skip download
2. Check `specs/NN_V_0-2-0_NN.md` — exists → skip download
3. Check `specs/defiNNe_V_0-2-0_NN.md` — exists → skip download

**Verification**: Zero HTTP requests made.

### T3: Version Bump Detection

**Input**: Model with `parent.name: "business_V_2-0-0"` (was `V_1-0-0`)

**Expected behavior**:
1. `specs/business_V_1-0-0_NN.md` exists but `parent.name` says `V_2-0-0`
2. Application detects mismatch (name differs)
3. Download `business_V_2-0-0_NN.md` from new URL
4. Save as `specs/business_V_2-0-0_NN.md` (new cache entry, old one preserved)

**Verification**:
- Both `business_V_1-0-0_NN.md` and `business_V_2-0-0_NN.md` exist in `specs/`
- Model now resolves through V_2-0-0 chain

### T4: Network Failure Graceful Degradation

**Input**: Model loaded with no internet connectivity, no prior cache

**Expected behavior**: The application SHOULD report an error and open the model without template validation. The model remains editable but validation is disabled.

**Verification**:
- Error message: "Could not resolve parent template from {url}. Check your connection."
- Model opens in degraded mode (no concept validation, no marker validation)

### T5: Partial Cache (Some Levels Missing)

**Input**: `specs/` contains `business_V_1-0-0_NN.md` but not the others

**Expected behavior**:
1. `specs/business_V_1-0-0_NN.md` found → skip download
2. Read its `parent.url` → `specs/NN_V_0-2-0_NN.md` not found → download
3. Read FORMAT's `parent.url` → `specs/defiNNe_V_0-2-0_NN.md` not found → download

**Verification**: Only 2 HTTP requests made (for NN and defiNNe).

### T6: Invalid parent.url (404)

**Input**: Model with `parent.url` pointing to a non-existent file

**Expected behavior**: Error with clear message indicating which URL failed. Chain resolution stops at the failed level. Available cached levels still used.

**Verification**:
- Error: "Failed to download {url} (HTTP 404)"
- Specs for levels already cached are still usable

### T7: Circular parent Chain

**Input**: Two specs that point to each other as parent (malicious or accidental)

**Expected behavior**: Application detects cycle after N iterations (RECOMMENDED: max depth of 10) and stops with error.

**Verification**:
- Error: "Circular parent chain detected at depth {N}."

### T8: Procedures Template Chain

**Input**: A procedures model (e.g., `Onboarding_V_1-0-0_procedures_NN.md`)

**Expected behavior**: Same as T1, but chain resolves through `procedures_V_1-0-0` instead of `business_V_1-0-0`.

### T9: FOLDER Mode Resolution

**Input**: TeamKB_V_1-0-0_kb/ (FOLDER mode model)

**Expected behavior**:
1. Read root `_NN.md` → `parent` = `kb_V_1-0-0`
2. Download `kb_V_1-0-0_NN.md` → save to `specs/`
3. Continue chain until level 0
4. FOLDER mode element `_NN.md` files do NOT have `parent` — they inherit from root

**Verification**:
- Only the root `_NN.md` triggers a chain resolution
- Element `_NN.md` files under `Alice/`, `MachineLearning/` etc. are NOT resolved independently

## Implementation Notes for `@cognnitive/innfo-core`

The resolver should provide these functions in `io/`:

```typescript
interface SpecResolver {
  resolve(modelPath: string): Promise<SpecCache>;
  getCached(name: string): SpecDocument | null;
  clearCache(): void;
}

interface SpecCache {
  specs: Map<string, SpecDocument>;  // key: parent.name
  chain: string[];                   // ordered: [L3_name, L2_name, L1_name, L0_name]
}

interface SpecDocument {
  name: string;
  level: number;
  parentName?: string;
  parentUrl?: string;
  content: string;
  parsedFrontmatter: Record<string, any>;
}
```

### Cache Strategy

- **File-based**: `specs/<name>_NN.md` on disk
- **Freshness**: Only download if file doesn't exist or if parent name changed
- **Concurrency**: LOCK files to prevent partial writes from concurrent loads
- **Cleanup**: Optional command to purge `specs/` directory
