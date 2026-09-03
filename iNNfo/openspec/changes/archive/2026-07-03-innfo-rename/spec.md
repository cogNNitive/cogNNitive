# Delta Spec: innfo-rename

Rename **FORMAT** â†’ **iNNfo** across the entire iNNfo monorepo. Breaking change: V_0-1-5 â†’ V_0-2-0 (MAJOR). Structural marker `_F` â†’ `_NN`, file suffix `_F.md` â†’ `_NN.md`, packages `@cognnitive/format-*` â†’ `@cognnitive/innfo-*`.

---

## Changed Files

### 1. Spec File (current version)

| File | Action |
|------|--------|
| `specs/FORMAT_V_0-1-5_F.md` | Copied to new file (stays as historical reference) |
| `specs/iNNfo_V_0-2-0_NN.md` | **NEW** â€” created from copy of V_0-1-5 with all transforms applied |

**Frontmatter changes** (old â†’ new):

| Field | V_0-1-5 (FORMAT) | V_0-2-0 (iNNfo) |
|-------|-------------------|------------------|
| `spec_version` | `"V_0-1-5"` | `"V_0-2-0"` |
| `spec_url` | `.../FORMAT_V_0-1-5_F.md` | `.../iNNfo_V_0-2-0_NN.md` |
| `parent_spec.url` | `.../defiNNe_V_0-1-0_FORMAT.md` | `.../defiNNe_V_0-1-1_NN.md` |
| `parent_spec.name` | `"defiNNe_V_0-1-0"` | `"defiNNe_V_0-1-1"` |
| `title` | `"FORMAT Specification"` | `"iNNfo Specification"` |

**Internal content changes** (automated transforms on the copy):

| Category | Old pattern | New pattern |
|----------|-------------|-------------|
| Section headers | `# _F <name>` | `# _NN <name>` |
| Hidden section headers | `# <!-- _F --> <name>` | `# <!-- _NN --> <name>` |
| Element markers | `* _F <Concept>:` | `* _NN <Concept>:` |
| Hidden element markers | `<!-- _F <Concept>: -->` | `<!-- _NN <Concept>: -->` |
| Index markers | `_F index:` | `_NN index:` |
| Matrix headers | `# _F matrices:` | `# _NN matrices:` |
| Wikilink refs | `[[file_F.md]]` | `[[file_NN.md]]` |
| Inline `_F.md` refs | `_F.md` | `_NN.md` |
| "FORMAT" prose (word-boundary) | `FORMAT` | `iNNfo` |
| Version refs | `V_0-1-5` | `V_0-2-0` |
| Template examples refs | `FORMAT_V_0-1-5_F.md` | `FORMAT_V_0-1-5_F.md` (frozen â€” does NOT change) |
| Legacy sample refs | `*_FORMAT.md` | `*_FORMAT.md` (does NOT change) |

**Not changed** (in the new file):
- URL references to historical/legacy specs (`*_FORMAT.md`, `*_F.md` frozen versions)
- Sample file paths (`Ghostbusters_V_0-1-2_business_FORMAT.md`)
- Historical version references in prose

### 2. defiNNe Specs

| File | Action |
|------|--------|
| `specs/defiNNe_V_0-1-1_F.md` | **RENAMED** â†’ `specs/defiNNe_V_0-1-1_NN.md` â€” content migrated to iNNfo references |
| `specs/defiNNe_V_0-1-0_FORMAT.md` | **NO CHANGE** â€” legacy spec, frozen, stays as-is |

**Why**: The V_0-2-0 parser recognizes ONLY `_NN.md` files and `# _NN` markers. Since `defiNNe_V_0-1-1` is consumed by `resolveParentChain()` (level 0 â€” root of the hierarchy), it MUST parse with the V_0-2-0 parser. Without migration, the parent chain resolution breaks.

**Migration scope for defiNNe_V_0-1-1**:
- File suffix: `_F.md` â†’ `_NN.md`
- Frontmatter: `specification_url` updated
- Internal `_F` markers â†’ `_NN` markers (within examples and code blocks)
- `FORMAT` references in prose â†’ `iNNfo` references
- File naming convention table updated for V_0-2-0
- Parent chain example showing `FORMAT_V_0-1-1_FORMAT.md` references â€” stays frozen (historical refs don't change)
- Spec resolver protocol example filenames updated for `_NN.md` convention

### 3. Template Specs â€” Scope Ambiguity âš ï¸

The proposal explicitly lists template specs (`*_FORMAT.md` suffix) as **OUT of scope**:

> **Legacy specs** using `_FORMAT.md` suffix (e.g., `business_V_0-1-1_FORMAT.md`, `defiNNe_V_0-1-0_FORMAT.md`): NOT renamed. They stay as-is with their `_F` syntax.

But these files **internally** contain:
- `_F` structural markers (`# _F index`, `# _F <Concept>`, `* _F <Concept>:`)
- `parent_spec` references pointing to `FORMAT`
- Prose references to `FORMAT`

The files in question:

| File | Suffix | Has `_F` markers? | Has FORMAT refs? |
|------|--------|--------------------|-------------------|
| `specs/business_V_0-1-1_FORMAT.md` | `_FORMAT.md` | âœ… Many (index, elements, matrices) | âœ… parent_spec, prose |
| `specs/procedures_V_0-1-1_FORMAT.md` | `_FORMAT.md` | âœ… Many (index, elements, matrices) | âœ… parent_spec, prose |
| `specs/catalog_V_0-1-2_FORMAT.md` | `_FORMAT.md` | âŒ None (`_FORMAT.md` file refs only) | âœ… parent_spec, prose, file refs |

**Decision**: Align with the proposal and design â€” these are **OUT of scope**. Rationale:
- They use the `_FORMAT.md` legacy suffix, not the `_F.md` intermediate suffix
- They are frozen spec artifacts â€” migrating them would require a version bump
- Renaming them creates an inconsistency: a `_NN.md` file for a template that hasn't been version-bumped
- The V_0-2-0 parser still recognizes `_F` syntax in legacy files; these remain parseable for backward loading

If a future task decides to migrate these, they'd need their own change with version bumps (e.g., `business_V_0-2-0_NN.md`).

### 4. Legacy Specs â€” Out of Scope

These remain frozen and untouched:

| File | Reason |
|------|--------|
| `specs/FORMAT_V_0-1-2_FORMAT.md` | Historical spec version |
| `specs/FORMAT_V_0-1-4_FORMAT.md` | Historical spec version |
| `specs/FORMAT_V_0-1-5_F.md` | Copied but kept as historical reference |
| `specs/CHANGELOG.md` | Updated (append V_0-2-0 entry) |
| `specs/archive/` (if exists) | Archived content â€” no changes |
| `specs/*/samples/*_F.md` | Legacy model samples â€” no changes |
| `specs/*/samples/*_FORMAT.md` | Legacy model samples â€” no changes |

---

## File-Scoped Requirements

### R1: Spec file `iNNfo_V_0-2-0_NN.md` created

- [ ] Copy of `FORMAT_V_0-1-5_F.md` exists at `specs/iNNfo_V_0-2-0_NN.md`
- [ ] Frontmatter updated: version, URL, parent_spec, title
- [ ] All structural markers migrated: `_F` â†’ `_NN` (headers, elements, index, matrices, hidden markers)
- [ ] All "FORMAT" prose references changed to "iNNfo" (word-boundary aware â€” not in URLs or legacy refs)
- [ ] Version numbers `V_0-1-5` â†’ `V_0-2-0` in all appropriate places
- [ ] `_F.md` suffix references â†’ `_NN.md` suffix (except legacy file refs)
- [ ] The original `FORMAT_V_0-1-5_F.md` remains unmodified
- [ ] `parseModel()` on the new spec file returns clean result

### R2: defiNNe_V_0-1-1 migrated to `_NN.md`

- [ ] File renamed: `specs/defiNNe_V_0-1-1_F.md` â†’ `specs/defiNNe_V_0-1-1_NN.md`
- [ ] Frontmatter `specification_url` updated
- [ ] `_F` markers in code examples â†’ `_NN`
- [ ] Prose "FORMAT" references â†’ "iNNfo"
- [ ] File naming convention table (Â§6) updated for V_0-2-0 patterns
- [ ] Spec resolver protocol (Â§3) updated cache filenames to `_NN.md`
- [ ] Document notice updated: "FORMAT document" â†’ "iNNfo document"
- [ ] Legacy `defiNNe_V_0-1-0_FORMAT.md` remains untouched
- [ ] `parseModel()` on the new file returns clean result

### R3: defiNNe_V_0-1-0_FORMAT.md

- [ ] **NO CHANGES** â€” legacy spec, frozen. Verified by grep: no modifications.

### R4: Template specs (`*_FORMAT.md`)

- [ ] **NO CHANGES** â€” out of scope per proposal. Verified by grep: no modifications.

---

## Acceptance Scenarios

### S1: Spec file content migrated correctly

```
Given the new file specs/iNNfo_V_0-2-0_NN.md
When I parse it with the V_0-2-0 parser
Then it returns a valid model with no errors
And frontmatter content matches:
  | spec_version | "V_0-2-0" |
  | title        | "iNNfo Specification" |
  | parent_spec.name | "defiNNe_V_0-1-1" |
```

```
Given the new file specs/iNNfo_V_0-2-0_NN.md
When I grep for '_F' patterns (excluding legacy references, URLs, and historical mentions)
Then no unmatched '_F' markers remain in active content
```

```
Given the new file and the original FORMAT_V_0-1-5_F.md
When I compare sections
Then both files have the same structure, concepts, and rules
Only naming (FORMATâ†’iNNfo, _Fâ†’_NN) and version differ
```

### S2: defiNNe_V_0-1-1 migrated correctly

```
Given the new file specs/defiNNe_V_0-1-1_NN.md
When I parse it with the V_0-2-0 parser
Then it returns a valid level 0 model with no errors
And the parent chain resolution starting from iNNfo_V_0-2-0_NN.md
  resolves up to defiNNe_V_0-1-1_NN.md successfully
```

```
Given the new defiNNe file
When I grep for '_F\.md' patterns (excluding legacy URLs)
Then no active '_F.md' references remain in the file's current-version content
```

### S3: Parser regex all updated

```
Given @cognnitive/innfo-core/src/parser.ts
When I run grep for regex patterns containing '_F'
Then the only matches are:
  - Comment references to legacy syntax (marked as legacy)
  - Any 'block:' patterns (pre-_F era, intentionally unchanged)
```

See design.md Â§2 for the complete per-constant and per-pattern mapping.

### S4: All tests pass (after test updates)

```
Given the full test suite for all three packages
When I run: npm test (monorepo root)
Then all tests pass
And no test file contains unmatched '_F' patterns in test content strings
```

```
Given the golden file tests
When I run: npx vitest run --include='**/*.golden.*'
Then all golden tests pass
And all golden file content uses '_NN' syntax (not '_F')
```

### S5: Package builds succeed

```
Given the monorepo
When I run: npm run build
Then all three packages build successfully:
  â˜ packages/innfo-core/ builds
  â˜ packages/innfo-mcp/ builds
  â˜ apps/innfo-editor/ builds
And npm install succeeds at monorepo root
```

### S6: No stale `_F` references in active source code

```
Given the packages/ and apps/ directories
When I grep for '_F' in all .ts, .vue, .md files (excluding node_modules, dist, archive)
Then the only remaining '_F' matches are:
  - Legacy file references (*_FORMAT.md â€” the _FORMAT suffix)
  - block: syntax (pre-_F era â€” intentionally unchanged)
  - Historical changelog entries
  - URLs and external references
```

### S7: Legacy models still parse (no regression)

```
Given a legacy model file (e.g., Ghostbusters_V_0-1-2_business_F.md)
When I attempt to load it with the V_0-2-0 parser
Then the parser gracefully handles the legacy file
  (either errors with a clear migration message, or loads with compatibility mode)
```

---

## Out of Scope (Explicit)

| Artifact | Reason |
|----------|--------|
| Legacy models with `_F.md` suffix (samples, test fixtures) | Frozen model data â€” not migrated |
| Template specs with `_FORMAT.md` suffix (business, procedures, catalog) | Legacy suffix, out of scope per proposal |
| Historical spec versions in `specs/` (`V_0-1-2`, `V_0-1-4`) | Frozen â€” never modified |
| `specs/archive/` (if exists) | Archived â€” no changes |
| Backward compatibility adapters | No compat shims â€” this is a MAJOR breaking change |
| Parser behavior changes | Syntax recognition, validation rules, output format â€” all unchanged |
| New features | No feature additions â€” rename only |
| External GitHub spec URLs | Stay at current paths; redirect/coexistence TBD |
| Config files (`.vscode/`, `tsconfig.json`, `.editorconfig`) | None reference `format-core` by name currently |

---

## Version Bump

| Field | Before | After |
|-------|--------|-------|
| Version | V_0-1-5 | V_0-2-0 |
| Bump type | â€” | MAJOR (breaking) |
| Reason | â€” | File suffix changed (`_F.md` â†’ `_NN.md`), marker changed (`_F` â†’ `_NN`), package names changed |

---

## Relationship to Design

This spec maps to the **implementation order** defined in the design's commit slicing (Â§6):

| Commit | Covers |
|--------|--------|
| 1 â€” Package infrastructure | Package renames, package.json, monorepo build |
| 2 â€” Core regex/constants | parser.ts, validator.ts, helpers.ts, recursiveParser.ts, resolver.ts, types.ts â€” all pattern changes |
| 3 â€” MCP cascade | spec.ts, mutate.ts, list-read.ts |
| 4 â€” Editor cascade | constants.ts, version.ts, Vue components |
| 5 â€” Spec file creation | iNNfo_V_0-2-0_NN.md + defiNNe_V_0-1-1_NN.md |
| 6 â€” Documentation | Changelogs, docs/ prose updates |
| 7 â€” Migration script | scripts/migrate-innfo.mts |

Each commit's verification gate (build + tests + grep for stale refs) serves as a milestone within this spec.
