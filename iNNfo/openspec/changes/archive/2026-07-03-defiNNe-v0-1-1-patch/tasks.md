# Tasks: defiNNe-v0-1-1-patch

## Summary

Rename `parent` → `parent_spec` in spec frontmatter and code. Bump defiNNe to V_0-1-1 with `_F.md` suffix. Add deprecation notices and compliance docs.

**~15 files** (3 new, 12 modified), est. **~530 lines changed** (under 800 budget).

## Dependency Order

**Code first (compilation safety) → defiNNe spec → FORMAT spec → templates → samples → deprecation → docs → verify**

---

## Phase 1: Code Changes

### Task 1 — `types.ts`: Rename `SpecFrontmatter.parent` to `parent_spec` ✅

**File**: `packages/format-core/src/types.ts`
**Type**: Edit
**Lines**: ~1 (line 57)
**Depends on**: Nothing

Change the optional field in `SpecFrontmatter`:

```diff
-  parent?: ParentRef;
+  parent_spec?: ParentRef;
```

Leave `ParentRef` interface name unchanged (out of scope). Leave `SpecDocument.parentName`/`parentUrl` unchanged (derived fields, not frontmatter).

---

### Task 2 — `parser.ts`: Update `parseFrontmatter` normalization + `serializeModel` ✅

**File**: `packages/format-core/src/parser.ts`
**Type**: Edit
**Lines**: ~8 (parseFrontmatter normalization + serializeModel YAML key + property access)
**Depends on**: Task 1

**a) Add normalization inside `parseFrontmatter`** — copy legacy `parent` to `parent_spec` so frozen archive files still parse:

```typescript
const parsed = parseYaml(match[1]);
// Normalize legacy parent → parent_spec (defiNNe V_0-1-0 era)
if ((parsed as any).parent && !(parsed as any).parent_spec) {
  (parsed as any).parent_spec = (parsed as any).parent;
  delete (parsed as any).parent;
}
return parsed as SpecFrontmatter;
```

**b) Update `serializeModel`** — write `parent_spec:` instead of `parent:` in serialized output:

```diff
-  if (fm.parent) {
-    lines.push('parent:');
-    lines.push(`  name: "${fm.parent.name}"`);
-    lines.push(`  url: "${fm.parent.url}"`);
+  if (fm.parent_spec) {
+    lines.push('parent_spec:');
+    lines.push(`  name: "${fm.parent_spec.name}"`);
+    lines.push(`  url: "${fm.parent_spec.url}"`);
   }
```

---

### Task 3 — `resolver.ts`: Update `fm.parent` access to `fm.parent_spec` ✅

**File**: `packages/format-core/src/resolver.ts`
**Type**: Edit
**Lines**: ~2 (lines 63–64)
**Depends on**: Task 1

```diff
-  parentName: fm.parent?.name,
-  parentUrl: fm.parent?.url,
+  parentName: fm.parent_spec?.name,
+  parentUrl: fm.parent_spec?.url,
```

---

### Task 4 — `validator.ts`: Update `fm.parent` access to `fm.parent_spec` ✅

**File**: `packages/format-core/src/validator.ts`
**Type**: Edit
**Lines**: ~8 (lines 27–28, 167, 176–177)
**Depends on**: Task 1

Update all `fm.parent` references to `fm.parent_spec`. Update path strings/messages from `'parent'` to `'parent_spec'` where they reference the frontmatter field name:

```diff
-  if (!fm.parent) {
-    errors.push({ path: 'frontmatter.parent', message: 'Missing parent', severity: 'error' });
+  if (!fm.parent_spec) {
+    errors.push({ path: 'frontmatter.parent_spec', message: 'Missing parent_spec', severity: 'error' });
   }

-  const parentOk = !!(fm.parent && typeof fm.parent === 'object' && fm.parent.name && fm.parent.url)
+  const parentOk = !!(fm.parent_spec && typeof fm.parent_spec === 'object' && fm.parent_spec.name && fm.parent_spec.url)

-      : !fm.parent ? 'Missing parent field'
-      : !fm.parent.name ? 'Parent missing name'
+      : !fm.parent_spec ? 'Missing parent_spec field'
+      : !fm.parent_spec.name ? 'Parent_spec missing name'
```

---

### Task 5 — `useConceptVisuals.ts`: Update `parent` accessor ✅

**File**: `apps/format-editor/src/composables/useConceptVisuals.ts`
**Type**: Edit
**Lines**: ~1 (line 73)
**Depends on**: Task 1

```diff
-  const parentName: string | undefined = (fm as any)?.parent?.name
+  const parentName: string | undefined = (fm as any)?.parent_spec?.name
```

---

### Task 6 — `tests/index.test.ts`: Update assertions + inline fixtures ✅

**File**: `packages/format-core/tests/index.test.ts`
**Type**: Edit
**Lines**: ~20 (assertions) + ~36 (fixtures) = ~56
**Depends on**: Task 1

**a) Update assertion lines** (replace `fm.parent` with `fm.parent_spec`):
- Line 28: `expect(fm.parent).toBeUndefined()` → `expect(fm.parent_spec).toBeUndefined()`
- Line 39: `expect(fm.parent).toBeDefined()` → `expect(fm.parent_spec).toBeDefined()`
- Line 40: `expect(fm.parent!.name)` → `expect(fm.parent_spec!.name)`
- Line 52: `expect(fm.parent!.name)` → `expect(fm.parent_spec!.name)`
- Line 76: `expect(fm.parent!.name)` → `expect(fm.parent_spec!.name)`
- Line 165: `expect(fm.parent!.name)` → `expect(fm.parent_spec!.name)`

**b) Update inline YAML fixtures** — change `parent:` to `parent_spec:` in all inline template literals:
- Lines 347–349: slug fixture
- Lines 372–374: explicit slug fixture
- Lines 434–436: collision fixture
- Lines 484–486: recursiveParser fixture
- Lines 535–537: asset types fixture
- Lines 589–591: asset_mode centralized fixture
- Lines 617–619: asset_mode centralized explicit fixture
- Lines 643–645: asset_mode per-element fixture
- Lines 689–691: centralized mode asset path fixture
- Lines 753–755: FOLDER mode rejection fixture (parseModel)
- Lines 782–784: FOLDER mode fixture (validateFormatContent)
- Lines 813–815: FOLDER mode fixture (validateModel)

Each fixture set has 3 adjacent lines: `'parent:',`, `'  name: ...',`, `'  url: ...',` — change all three to `'parent_spec:',` etc.

---

## Phase 2: Spec File Changes

### Task 7 — Create `specs/defiNNe_V_0-1-1_F.md` ✅

**File**: `specs/defiNNe_V_0-1-1_F.md` **(NEW)**
**Type**: Create
**Lines**: ~350
**Depends on**: Nothing

Copy from `defiNNe_V_0-1-0_FORMAT.md` and apply:

1. **Frontmatter**: Bump `spec_version` to `V_0-1-1`, update URL to `v0.1.1/specs/defiNNe_V_0-1-1_F.md`, no `parent` (level 0)
2. **Suffix**: File suffix is `_F.md` (compact form) instead of `_FORMAT.md`
3. **Replace all `parent:`** → `parent_spec:` in:
   - §1 Hierarchy rules (line 49): "MUST declare `parent_spec`"
   - §2 Parent Field (lines 55–67): Rename section to "parent_spec Field", update examples
   - §3 Resolver Protocol (lines 74–79): Update references
   - §5.2–5.4 (lines 128–176): Update all frontmatter examples
   - Compliance Checklist §11 item 5 (line 244)
   - Template section (lines 259–274): Update `parent:` → `parent_spec:`
   - Examples (lines 284–301): Update parent chain examples
4. **Add Migration From V_0-1-0 section**:
   - What changed: `parent` → `parent_spec`
   - Why: Removes ambiguity with tree/graph parent refs
   - How to migrate: replace `parent:` with `parent_spec:` in any model/spec frontmatter
5. **Add Superseded Specs section**:
   - Table listing `defiNNe_V_0-1-0_FORMAT.md` as superseded
   - Link to archived spec
   - Note that archived specs remain frozen with original `parent:` field

---

### Task 8 — `FORMAT_V_0-1-5_F.md`: Update `parent:` → `parent_spec:` ✅

**File**: `specs/FORMAT_V_0-1-5_F.md`
**Type**: Edit
**Lines**: ~15
**Depends on**: Task 7 (defiNNe URL for parent_spec.name)

Update all occurrences of `parent:` to `parent_spec:`:

1. **Frontmatter** (lines 5–7): `parent:` → `parent_spec:`
   - `name:` stays `"defiNNe_V_0-1-0"` (the spec name doesn't change)
   - `url:` stays pointing to `defiNNe_V_0-1-0_FORMAT.md` (immutable frozen spec)
2. **§1 Parent Chain** (lines 67–73): Update body text ("Its `parent_spec` points to defiNNe") and example YAML block
3. **§7.1 Template Structure** (line 337–338): Update example YAML
4. **§7.2 Model Structure** (lines 372–373): Update example YAML
5. **Examples / Parent Chain** (lines 406–408): Update example YAML
6. **§6 Self-Description** (line 326): Update text

---

### Task 9 — `business_V_0-1-1_FORMAT.md`: Update `parent:` → `parent_spec:` ✅

**File**: `specs/business_V_0-1-1_FORMAT.md`
**Type**: Edit
**Lines**: ~15
**Depends on**: Task 8 (FORMAT URL for parent_spec.url)

1. **Frontmatter** (lines 5–7): `parent:` → `parent_spec:`
   - Keep `specification_version: "V_0-1-1"` (no version bump)
   - Name stays `"FORMAT_V_0-1-1"`, url stays as-is (FORAMT V_0-1-1 is frozen)
2. **§6 Template / Level 3 Model**, example YAML (lines 649–651): `parent:` → `parent_spec:`
3. **Examples / Parent Chain** YAML blocks (lines 706, 711, 716): `parent:` → `parent_spec:`
4. **Body text** (lines 681, 708, 713, 718): Any reference to `parent` in context of frontmatter field

---

### Task 10 — `procedures_V_0-1-1_FORMAT.md`: Update `parent:` → `parent_spec:` ✅

**File**: `specs/procedures_V_0-1-1_FORMAT.md`
**Type**: Edit
**Lines**: ~10
**Depends on**: Task 8

1. **Frontmatter** (lines 5–7): `parent:` → `parent_spec:`
2. **§Template / Level 3 Model**, example YAML (lines 182–184): `parent:` → `parent_spec:`
3. **Examples / Parent Chain** YAML blocks (lines 247, 252, 257): `parent:` → `parent_spec:`

---

### Task 11 — `catalog_V_0-1-2_FORMAT.md`: Update `parent:` → `parent_spec:` ✅

**File**: `specs/catalog_V_0-1-2_FORMAT.md`
**Type**: Edit
**Lines**: ~10
**Depends on**: Task 8

1. **Frontmatter** (lines 5–7): `parent:` → `parent_spec:`
2. **§Template** example YAML (lines 341–343): `parent:` → `parent_spec:`
3. **Examples / Parent Chain** YAML blocks (lines 383, 388): `parent:` → `parent_spec:`

---

### Task 12 — Sample models: Update frontmatter `parent:` → `parent_spec:` ✅

**Files** (3 files):
- `specs/business_V_0-1-1/samples/Ghostbusters_V_0-1-2_business_F.md`
- `specs/procedures_V_0-1-1/samples/CodeReviewProcess_V_1-0-0_procedures_F.md`
- `specs/catalog_V_0-1-2/samples/Music_History_V_1-0-0_catalog/_F.md`
**Type**: Edit
**Lines**: ~1 per file (line 5 in each — the `parent:` frontmatter key)
**Depends on**: Tasks 9–11 (templates)

Each file has the same pattern — change line 5 (`parent:` → `parent_spec:`), keep `name` and `url` values unchanged.

---

## Phase 3: Deprecation Notices

### Task 13 — `FORMAT_V_0-1-4_FORMAT.md`: Add deprecation notice ✅

**File**: `specs/FORMAT_V_0-1-4_FORMAT.md`
**Type**: Edit
**Lines**: ~5
**Depends on**: Nothing

Insert a `> [!NOTE]` deprecation admonition immediately after the frontmatter (before the existing `> [!NOTE]` or merged with it):

```markdown
> [!NOTE]
> This specification version is **superseded** by [FORMAT_V_0-1-5_F.md](./FORMAT_V_0-1-5_F.md).
> It remains frozen and immutable as published. New models SHOULD target V_0-1-5.
```

Alternatively, add alongside the existing notice. The exact wording should reference the newer spec and state it's superseded.

---

### Task 14 — `FORMAT_V_0-1-2_FORMAT.md`: Add deprecation notice ✅

**File**: `specs/FORMAT_V_0-1-2_FORMAT.md`
**Type**: Edit
**Lines**: ~5
**Depends on**: Nothing

Same as Task 13 but pointing to V_0-1-5 (the latest FORMAT). Insert `> [!NOTE]` after frontmatter:

```markdown
> [!NOTE]
> This specification version is **superseded** by [FORMAT_V_0-1-5_F.md](./FORMAT_V_0-1-5_F.md).
> It remains frozen and immutable as published. New models SHOULD target V_0-1-5.
```

---

## Phase 4: Compliance Documentation

### Task 15 — Create `apps/format-editor/docs/compliance/README.md` ✅

**File**: `apps/format-editor/docs/compliance/README.md` **(NEW)**
**Type**: Create
**Lines**: ~30
**Depends on**: Nothing

Document the compliance requirements for the format editor app:

- What makes a model defiNNe-compliant (checks from defiNNe §11)
- What makes a model FORMAT-compliant (checks from FORMAT spec)
- How the format-editor validates compliance
- Version tracking and migration notes

---

## Phase 5: Verify

### Task 16 — Grep sweep + compile + test ✅

**Type**: Script
**Depends on**: All tasks 1–15

1. **Grep sweep**: Search all `packages/` and `apps/format-editor/src/` for any remaining `fm.parent` or `frontmatter.parent` references
   ```bash
   grep -rn "fm\.parent\|frontmatter\.parent" packages/ apps/format-editor/src/
   ```
   Expected: zero matches after Tasks 1–5

2. **Check for YAML `parent:` in spec files**: 
   ```bash
   grep -rn "^parent:" specs/*.md
   ```
   Expected: only `defiNNe_V_0-1-0_FORMAT.md` (frozen, unchanged) and the deprecated FORMAT specs (V_0-1-2, V_0-1-4 — unchanged frontmatter except deprecation notices). All other spec files should have `parent_spec:`.

3. **TypeScript compilation**:
   ```bash
   cd packages/format-core && npx tsc --noEmit
   ```
   Expected: passes with zero errors.

4. **Run tests**:
   ```bash
   cd packages/format-core && npx vitest run
   ```
   Expected: all tests pass.

---

## Appendix: File Change Summary

| # | File | Type | Est. Lines | Depends On |
|---|---|---|---|---|
| 1 | `packages/format-core/src/types.ts` | Edit | 1 | — |
| 2 | `packages/format-core/src/parser.ts` | Edit | 8 | 1 |
| 3 | `packages/format-core/src/resolver.ts` | Edit | 2 | 1 |
| 4 | `packages/format-core/src/validator.ts` | Edit | 8 | 1 |
| 5 | `apps/format-editor/src/composables/useConceptVisuals.ts` | Edit | 1 | 1 |
| 6 | `packages/format-core/tests/index.test.ts` | Edit | 56 | 1 |
| 7 | `specs/defiNNe_V_0-1-1_F.md` | **Create** | 350 | — |
| 8 | `specs/FORMAT_V_0-1-5_F.md` | Edit | 15 | 7 |
| 9 | `specs/business_V_0-1-1_FORMAT.md` | Edit | 15 | 8 |
| 10 | `specs/procedures_V_0-1-1_FORMAT.md` | Edit | 10 | 8 |
| 11 | `specs/catalog_V_0-1-2_FORMAT.md` | Edit | 10 | 8 |
| 12 | 3 sample models | Edit | 3 | 9–11 |
| 13 | `specs/FORMAT_V_0-1-4_FORMAT.md` | Edit | 5 | — |
| 14 | `specs/FORMAT_V_0-1-2_FORMAT.md` | Edit | 5 | — |
| 15 | `apps/format-editor/docs/compliance/README.md` | **Create** | 30 | — |
| 16 | Verify (grep + tsc + test) | Script | — | 1–15 |

**Totals**: 15 file changes (2 new, 13 modified) + 1 verify step ≈ 519 lines.
