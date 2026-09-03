# Design: innfo-rename

## Lead

Rename the specification from **FORMAT** to **iNNfo**: structural marker `_F` â†’ `_NN`, file suffix `_F.md` â†’ `_NN.md`, packages `@cognnitive/format-*` â†’ `@cognnitive/innfo-*`, and bump the version from `V_0-1-5` to `V_0-2-0` (MAJOR, breaking, no backward compat). This design covers ~85 files and ~340 atomic changes across the iNNfo monorepo.

---

## 1. Architecture Overview â€” Dependency Graph & Cascade Order

The monorepo has a strict dependency chain that dictates rename order:

```
defiNNe (external meta-spec, level 0)
  â””â”€ FORMAT spec (external, level 1)
       â””â”€ @cognnitive/innfo-core (package, regex engine + parser + validator)
            â”œâ”€ @cognnitive/innfo-mcp (package, MCP server wrapping core)
            â””â”€ @cognnitive/innfo-editor (app, Vue 3 SPA wrapping core)
```

### Cascade rules

1. **Core first**: All regex/constant changes live in `innfo-core`. Every other package depends on it.
2. **MCP depends on core**: imports types and functions from core. Changes are additive (no regex of its own).
3. **Editor depends on core**: imports parser, validator, recursiveParser. Has its own constants, version helpers, and UI strings.
4. **Spec file is standalone**: the `iNNfo_V_0-2-0_NN.md` file is content-only, referenced by URL in editor constants.
5. **docs + changelogs are leaf nodes**: no other artifact depends on them.

> **Design decision**: The `defiNNe` meta-spec at `specs/defiNNe_V_0-1-1_F.md` uses the `_F.md` suffix. This spec is a level-0 external document consumed by the parser. Since the V_0-2-0 parser will ONLY recognize `_NN.md` files and `# _NN` markers, this spec MUST also be renamed to `defiNNe_V_0-1-1_NN.md` with its markers updated, otherwise the parent-chain resolution fails. This was not explicitly called out in the proposal â€” adding it here. The older `defiNNe_V_0-1-0_FORMAT.md` (using `_FORMAT.md` suffix) remains untouched as a legacy artifact. (See also Â§8 â€” Risk: scope ambiguity)

---

## 2. Regex/Constant Migration Plan â€” Exact Patterns Per File

### 2.1 `packages/format-core/src/parser.ts` (highest risk â€” 6 regex + 5 serializer emits)

| # | Current | New | Location (line ~) |
|---|---------|-----|-------------------|
| 1 | `const INDEX_F_RE = /_F\s+index:\s*(.*)$/` | `const INDEX_NN_RE = /_NN\s+index:\s*(.*)$/` | 9 |
| 2 | Comment `/* â”€â”€ Marker patterns (_F syntax only, V_0-1-1+) â”€â”€ */` | `/* â”€â”€ Marker patterns (_NN syntax only, V_0-2-0+) â”€â”€ */` | 43 |
| 3 | `const F_SECTION_RE = /^#\s+_F\s+(?:(matrices):\s*(.*)|(.*))/m` | `const NN_SECTION_RE = /^#\s+_NN\s+(?:(matrices):\s*(.*)|(.*))/m` | 46 |
| 4 | `const F_ELEMENT_RE = /^\s*[*\-]\s+_F\s+([\w\s-]+?):\s+(.*)$/` | `const NN_ELEMENT_RE = /^\s*[*\-]\s+_NN\s+([\w\s-]+?):\s+(.*)$/` | 49 |
| 5 | `rawTitle.match(/^_F\s+(?:(matrices):\s*(.*)|(.*))/)` in `sectionName()` | `rawTitle.match(/^_NN\s+(?:(matrices):\s*(.*)|(.*))/)` | 57 |
| 6 | Same regex in `sectionTitle()` | Same change | 67 |
| 7 | `` `> This is a **FORMAT document**` `` | `` `> This is an **iNNfo document**` `` | 471 |
| 8 | `'# _F index'` | `'# _NN index'` | 475 |
| 9 | `` `# _F ${conceptName}` `` | `` `# _NN ${conceptName}` `` | 486 |
| 10 | `` `${prefix} _F ${conceptName}: ${node.name}` `` | `` `${prefix} _NN ${conceptName}: ${node.name}` `` | 489 |
| 11 | `` `# _F matrices: ${matrix.name}` `` | `` `# _NN matrices: ${matrix.name}` `` | 508 |
| 12 | `'# _F matrices: item-markers matrix'` | `'# _NN matrices: item-markers matrix'` | 529 |
| 13 | Comment `// Support both [[wikilinks]] and _F index: Name syntax` | `// Support both [[wikilinks]] and _NN index: Name syntax` | 185 |
| 14 | `const fMatch = trimmed.match(INDEX_F_RE)` (usage) | `const fMatch = trimmed.match(INDEX_NN_RE)` | 191 |

**Variable rename convention**: Prefix `F_` becomes `NN_` (e.g. `F_SECTION_RE` â†’ `NN_SECTION_RE`, `INDEX_F_RE` â†’ `INDEX_NN_RE`). Function names like `sectionName`, `sectionTitle`, `isIndexSection` stay the same â€” they don't embed `_F`.

### 2.2 `packages/format-core/src/validator.ts` (3 regex + ~20 string refs)

| # | Current | New | Location |
|---|---------|-----|----------|
| 1 | `const SECTION_FM_RE = /^#\s+_F\s+...$/gm` | `const SECTION_NN_RE = /^#\s+_NN\s+...$/gm` | 10 |
| 2 | `const visMarkerRe = /^\s*[*\-]\s+_F\s+([\w\s-]+?):\s+(.+)$/gm` | `const visMarkerRe = /^\s*[*\-]\s+_NN\s+([\w\s-]+?):\s+(.+)$/gm` | 300 |
| 3 | `const hidMarkerRe = /^\s*[*\-]\s+<!--\s+(?:_F\s+([\w\s-]+?):\|block:\s*([\w\s-]+?))\s*-->\s*(.*)$/gm` | `const hidMarkerRe = /^\s*[*\-]\s+<!--\s+(?:_NN\s+([\w\s-]+?):\|block:\s*([\w\s-]+?))\s*-->\s*(.*)$/gm` | 301 |
| 4 | `'FORMAT models must declare level: 3'` | `'iNNfo models must declare level: 3'` | 157 |
| 5 | `'Models must have a # _F index section with [[wikilinks]]'` | `'Models must have a # _NN index section with [[wikilinks]]'` | 271 |
| 6 | `'No _F index section found'` | `'No _NN index section found'` | 275 |
| 7 | `'Each concept section must use # _F <ConceptName> syntax'` | `'Each concept section must use # _NN <ConceptName> syntax'` | 289 |
| 8 | `'Some section headers have invalid _F markers'` | `'Some section headers have invalid _NN markers'` | 293 |
| 9 | `'Elements must use \`* _F ConceptName: Element\` or \`* <!-- _F ConceptName: --> Element\` syntax'` | `'Elements must use \`* _NN ConceptName: Element\` or \`* <!-- _NN ConceptName: --> Element\` syntax'` | 330 |
| 10 | `'No _F element markers found'` | `'No _NN element markers found'` | 337 |
| 11 | `'No numbered-list _F markers'` | `'No numbered-list _NN markers'` | 348 |
| 12 | `'Numbered lists (1. _F Concept: Name) are silently ignored...'` | `'Numbered lists (1. _NN Concept: Name) are silently ignored...'` | 349 |
| 13 | `'FORMAT files must end with _F.md'` | `'iNNfo files must end with _NN.md'` | 403 |
| 14 | `fileName.endsWith('_F.md')` (naming check) | `fileName.endsWith('_NN.md')` | 399 |
| 15 | `'"${fileName}" does not end with _F.md'` | `'"${fileName}" does not end with _NN.md'` | 407 |
| 16 | Same `endsWith('_F.md')` at line 411 | `endsWith('_NN.md')` | 411 |
| 17 | `'Distributed _F.md files should include a type field...'` | `'Distributed _NN.md files should include a type field...'` | 416 |
| 18 | `'No _F element markers found'` (syntax check) | `'No _NN element markers found'` | 503 |
| 19 | `'_F index section present'` | `'_NN index section present'` | 503 |
| 20 | `'No _F index with [[wikilinks]] found'` | `'No _NN index with [[wikilinks]] found'` | 505 |
| 21 | `'File ends with _F.md'` | `'File ends with _NN.md'` | 494 |
| 22 | All `if (/^#\s+_F\s+index/im.test(...))` inline checks | `/^#\s+_NN\s+index/im.test(...)` | 310, 365 |
| 23 | `!trimmed.startsWith('* _F ') && !trimmed.startsWith('- _F ')` | `!trimmed.startsWith('* _NN ') && !trimmed.startsWith('- _NN ')` | 320-321 |
| 24 | `numberedBulletRe = /^\s*\d+\.\s+_F\s+([\w\s-]+?):\s+/gm` | `/^\s*\d+\.\s+_NN\s+([\w\s-]+?):\s+/gm` | 343 |
| 25 | `if (/^\s*[+>]\s+_F\s/.test(trimmed))` | `/^\s*[+>]\s+_NN\s/.test(trimmed)` | 379 |

> **Note on `hidMarkerRe`**: The pattern `block:\s*([\w\s-]+?)` is the OLD marker syntax from V_0-1-0 era (pre-`_F`). This is intentionally NOT changed â€” it stays as `block:` because it's a legacy marker that doesn't follow the `_F`/`_NN` convention. Only the `_F` branch inside the alternation becomes `_NN`.

### 2.3 `packages/format-core/src/helpers.ts`

| # | Current | New |
|---|---------|-----|
| 1 | `const F_MD_RE = /_F\.md$/i` | `const NN_MD_RE = /_NN\.md$/i` |
| 2 | Comment `'Scan a root directory for FORMAT model files (*_F.md)'` | `'Scan a root directory for iNNfo model files (*_NN.md)'` |
| 3 | Comment about `Ghostbusters_V_0-1-2_business_F.md` | `Ghostbusters_V_0-1-2_business_NN.md` |

### 2.4 `packages/format-core/src/recursiveParser.ts`

| # | Current | New |
|---|---------|-----|
| 1 | `const FORMAT_FILE_SUFFIX = '_F.md'` | `const INNFO_FILE_SUFFIX = '_NN.md'` |
| 2 | `sourcePath.replace(/\/_F\.md$/i, '')` (2 occurrences, lines 15, 36) | `sourcePath.replace(/\/_NN\.md$/i, '')` |
| 3 | Comment `'// Only treat wikilinks ending in _F.md as model references'` | `'// Only treat wikilinks ending in _NN.md as model references'` |
| 4 | `target.endsWith(FORMAT_FILE_SUFFIX)` â†’ usage of `INNFO_FILE_SUFFIX` | auto-updates with constant rename |
| 5 | Comment about `_F.md` in `ModelNode.sourceMode` | Update string ref |

### 2.5 `packages/format-core/src/resolver.ts`

| # | Current | New |
|---|---------|-----|
| 1 | `` const cachePath = join(specsDir, `${currentName}_F.md`); `` | `` const cachePath = join(specsDir, `${currentName}_NN.md`); `` |

### 2.6 `packages/format-core/src/types.ts`

| # | Current | New |
|---|---------|-----|
| 1 | Comment on `ModelNode.sourceMode`: `'parsed': created from parsing a real _F.md document` | `` `parsed': created from parsing a real _NN.md document `` |
| 2 | Comment on `rawContent`: `whose own _F.md file was parsed` | `whose own _NN.md file was parsed` |
| 3 | Comment in `ModelNode.kind`: `'concept': a # _F section representing a type/group` | `'concept': a # _NN section representing a type/group` |

### 2.7 `packages/format-core/src/driver-unified.ts` â†’ check for `_F` refs (likely none, but verify)

This file likely has no `_F` references. Verify during implementation.

---

## 3. File Rename Strategy â€” Ordered Steps

### 3.1 Directory renames (atomic, single step)

```bash
# Rename directories (git mv preserves history)
git mv packages/format-core/ packages/innfo-core/
git mv packages/format-mcp/ packages/innfo-mcp/
git mv apps/format-editor/ apps/innfo-editor/
```

### 3.2 Package name updates in package.json

| File | Old name | New name |
|------|----------|----------|
| `packages/innfo-core/package.json` | `@cognnitive/format-core` | `@cognnitive/innfo-core` |
| `packages/innfo-mcp/package.json` | `@cognnitive/format-mcp` | `@cognnitive/innfo-mcp` |
| `apps/innfo-editor/package.json` | `@cognnitive/format-editor` | `@cognnitive/innfo-editor` |
| `packages/innfo-mcp/package.json` description | `MCP server wrapping @cognnitive/format-core` | `MCP server wrapping @cognnitive/innfo-core` |
| `apps/innfo-editor/package.json` scripts (predev, prebuild, pretest) | `--prefix ../../packages/format-core run build` | `--prefix ../../packages/innfo-core run build` |

### 3.3 Internal import path updates

All imports within the monorepo referencing `@cognnitive/format-core` must change to `@cognnitive/innfo-core`:

| File | Old import | New import |
|------|-----------|------------|
| `packages/innfo-mcp/src/tools/spec.ts` | `from '@cognnitive/format-core'` | `from '@cognnitive/innfo-core'` |
| `packages/innfo-mcp/src/tools/mutate.ts` | `from '@cognnitive/format-core'` | `from '@cognnitive/innfo-core'` |
| `packages/innfo-mcp/src/tools/list-read.ts` | `from '@cognnitive/format-core'` | `from '@cognnitive/innfo-core'` |
| `packages/innfo-mcp/src/server.ts` | likely imports core | verify |
| `apps/innfo-editor/src/utils/constants.ts` | indirect (via node_modules) | auto-resolves via npm workspaces |
| `apps/innfo-editor/src/utils/documentationParser.ts` | `from '@cognnitive/format-core'` | `from '@cognnitive/innfo-core'` |
| `apps/innfo-editor/src/composables/useUrlDocLoader.ts` | `from '@cognnitive/format-core'` | `from '@cognnitive/innfo-core'` |
| `apps/innfo-editor/src/shared/validator.ts` | `from '@cognnitive/format-core'` | `from '@cognnitive/innfo-core'` |
| `apps/innfo-editor/src/model/recursiveParser.ts` | `from '@cognnitive/format-core'` | `from '@cognnitive/innfo-core'` |
| `apps/innfo-editor/src/model/recursiveSerializer.ts` | `from '@cognnitive/format-core'` | `from '@cognnitive/innfo-core'` |
| `apps/innfo-editor/src/model/types.ts` | â€” (app-local) check for core re-exports | â€” |

### 3.4 Dependency graph resolution update

After directories and package names are changed, run `npm install` at the monorepo root to update `node_modules` symlinks and lockfile.

---

## 4. Import Path Migration â€” Complete Map

### 4.1 Packages

All packages that depend on `@cognnitive/format-core` by name:

| Package | Dependency type | Count |
|---------|----------------|-------|
| `@cognnitive/innfo-mcp` | `dependencies` in package.json + 3 source imports | 1 pkg.json + 3 `.ts` files |
| `@cognnitive/innfo-editor` | `dependencies` in package.json + 5 source imports | 1 pkg.json + 5 `.ts` files |

**Total**: 2 `package.json` entries + 8 source import statements.

### 4.2 Workspace scripts

The editor's `package.json` has `predev`, `prebuild`, `pretest` scripts that reference `packages/format-core/`:

```json
"predev": "npm --prefix ../../packages/format-core run build",
```

These become `../../packages/innfo-core/`.

### 4.3 Build configs

No `tsconfig.json` or `vite.config.ts` files reference package names by directory path (they use npm workspaces resolution). The `vite.config.ts` has no `format-core` refs. **No build config changes needed** beyond `package.json` names.

---

## 5. Migration Script Design

### 5.1 Purpose

Transform the content of current-version spec/template/model files from `_F` syntax to `_NN` syntax. This script handles the **content** transformation â€” file renaming is done by git mv.

### 5.2 Exclusions (do NOT touch)

- Files matching `*_FORMAT.md` (legacy suffix â€” out of scope per proposal)
- Files in `tests/fixtures/` or `specs/*/samples/` with `_F.md` (legacy models â€” out of scope)
- Files matching a configurable `--exclude` glob

### 5.3 Script specification

```typescript
// scripts/migrate-innfo.mts â€” Node.js ESM script

interface Options {
  rootDir: string;       // defaults to process.cwd()
  dryRun: boolean;       // print changes without writing
  include: string[];     // globs to include (default: ['**/*_F.md', '**/*.md'])
  exclude: string[];     // globs to exclude (default: ['**/*_FORMAT.md', '**/node_modules/**', '**/archive/**'])
  renameFiles: boolean;  // whether to rename _F.md â†’ _NN.md (default: true)
  verify: boolean;       // run post-transformation validation (default: false)
}
```

### 5.4 Transformation rules

For each included file (non-excluded):

```typescript
// 1. Content transformations (in order)
content = content
  // a. Structural markers: # _F â†’ # _NN (section headers)
  .replace(/^#\s+_F\s/gm, '# _NN ')
  // b. Element markers: * _F â†’ * _NN and - _F â†’ - _NN
  .replace(/^(\s*[*\-])\s+_F\s/gm, '$1 _NN ')
  // c. Hidden markers: <!-- _F â†’ <!-- _NN
  .replace(/(<!--\s+)_F\s/g, '$1_NN ')
  // d. Index references: _F index: â†’ _NN index:
  .replace(/_F\s+index:/g, '_NN index:')
  // e. Wikilink suffixes: [[file_F.md]] â†’ [[file_NN.md]]
  .replace(/(\[\[[^\]]+?)_F\.md\]\]/g, '$1_NN.md]]')
  // f. Inline _F.md references in prose
  .replace(/_F\.md/g, '_NN.md')
  // g. FORMAT â†’ iNNfo in text (but NOT in URLs or code blocks)
  //    This is word-boundary aware â€” avoids replacing FORMAT inside URLs
  .replace(/\bFORMAT\b(?!\s+spec\b|_V_|_F\b)/g, 'iNNfo')
  // h. Version string in default export constants
  //    Handled by source code changes, not in migration script
  ;

// 2. File rename (if enabled)
if (renameFiles && filePath.endsWith('_F.md')) {
  const newPath = filePath.replace(/_F\.md$/, '_NN.md');
  // rename file
}
```

### 5.5 Validation pass (post-migration)

After all transforms, the script should:
1. Run `grep -rn '_F[^o]' --include='*_NN.md'` â€” find any remaining `_F` refs NOT followed by additional chars (exclude `_FO` which is `_FOR` in `_FORMAT.md` legacy files â€” though those are excluded anyway)
2. Run `parseModel()` on each `_NN.md` file to verify it parses cleanly
3. Report the file count + change count

### 5.6 Dry-run output format

```
DRY RUN: migrates/innfo-rename
  Scanned: 142 files
  Matching: 28 files (non-excluded _F.md)
  Changes predicted:
    packages/innfo-core/src/parser.ts: 14 replacements
    packages/innfo-core/src/validator.ts: 25 replacements
    ...
  File renames: 18 files
```

---

## 6. Commit Slicing â€” Work-Unit Boundaries

Following the [work-unit-commits] skill: each commit is a deliverable unit with tests included. The PR is delivered as a **single PR** with 7 commits (change is atomic â€” partial rename would break the build).

### Commit 1: `chore(innfo): rename directories and package names`

```
Changes:
  - git mv packages/format-core/ packages/innfo-core/
  - git mv packages/format-mcp/ packages/innfo-mcp/
  - git mv apps/format-editor/ apps/innfo-editor/
  - Update package.json "name" fields (3 files)
  - Update @cognnitive/format-core dependency refs in innfo-mcp and innfo-editor package.json
  - Update prebuild/predev/pretest script paths in innfo-editor package.json
  - Run npm install to update lockfile
  - Update bin name in innfo-mcp package.json: "format-mcp" â†’ "innfo-mcp"

Verification:
  - npm install succeeds
  - git status shows only renames + package.json changes
```

### Commit 2: `feat(innfo): update core regex, constants, and serializer to _NN markers`

```
Changes:
  - parser.ts: all 14 regex + serializer changes from Â§2.1
  - validator.ts: all 25 regex + string changes from Â§2.2
  - helpers.ts: F_MD_RE â†’ NN_MD_RE + comment updates
  - recursiveParser.ts: FORMAT_FILE_SUFFIX â†’ INNFO_FILE_SUFFIX + path regex
  - resolver.ts: cache path _F.md â†’ _NN.md
  - types.ts: JSDoc comment updates
  - ALL test files: update inline _F content strings to _NN
  - Test fixture filenames where used in tests (NOT legacy fixtures)

Verification:
  - npx vitest run packages/innfo-core/tests/ â€” all pass
  - grep for remaining `_F` patterns in src/ (exclude legacy comments)
```

> **Key constraint**: This commit changes the parser so it ONLY recognizes `_NN` syntax. After this commit, no `_F.md` file parses correctly. The next commits handle the spec files and app cascade.

### Commit 3: `feat(innfo): cascade _NN rename through MCP server`

```
Changes:
  - spec.ts: _F.md â†’ _NN.md in cache paths, import name update
  - mutate.ts: _F.md â†’ _NN.md in file resolution, import name update
  - list-read.ts: import name update
  - Any test files for MCP

Verification:
  - npx vitest run packages/innfo-mcp/tests/ â€” all pass
  - npm run build in innfo-mcp succeeds
```

### Commit 4: `feat(innfo): update format-editor for iNNfo naming`

```
Changes:
  - constants.ts: DEFAULT_FORMAT_VERSION â†’ DEFAULT_INNFO_VERSION, V_0-1-5 â†’ V_0-2-0
  - constants.ts: buildSpecificationUrl() URL template
  - version.ts: all 3 regex patterns (_F.md â†’ _NN.md)
  - version.ts: buildFormatFilename() output suffix
  - version.ts: JSDoc comments
  - Header.vue: _F brand mark â†’ _NN, "FORMAT Modeler" â†’ "iNNfo Modeler"
  - ModelInfoPanel.vue: _F brand mark â†’ _NN, "FORMAT Metadata" â†’ "iNNfo Metadata"
  - DirectoryPickerModal.vue: _F.md â†’ _NN.md in text, placeholder URL
  - BlockFeed.vue: _F reference in empty state message
  - BlockSheet.vue: block regex pattern update
  - View files: _F.md â†’ _NN.md in sample paths
  - useUrlDocLoader.ts: import name update
  - All app test files: inline content updates

Verification:
  - npx vitest run apps/innfo-editor/tests/ â€” all pass
  - npm run build in innfo-editor succeeds
```

### Commit 5: `feat(innfo): create iNNfo V_0-2-0 spec file`

```
Changes:
  - Copy specs/FORMAT_V_0-1-5_F.md â†’ specs/iNNfo_V_0-2-0_NN.md
  - Apply migration script transforms to the new file
  - Update frontmatter version numbers
  - The old FORMAT_V_0-1-5_F.md stays as historical reference

Verification:
  - parseModel() on iNNfo_V_0-2-0_NN.md returns clean result
  - buildSpecificationUrl('V_0-2-0') resolves correctly
```

### Commit 6: `docs(innfo): update documentation and changelogs`

```
Changes:
  - CHANGELOG.md: append V_0-2-0 entry
  - specs/CHANGELOG.md: append V_0-2-0 entry
  - docs/ files: replace FORMAT â†’ iNNfo, _F â†’ _NN in prose and examples
  - README.md (if it references FORMAT)

Verification:
  - No code changes â€” documentation only
```

### Commit 7: `feat(innfo): add migration script for _F.md to _NN.md`

```
Changes:
  - scripts/migrate-innfo.mts: the migration script from Â§5
  - scripts/migrate-innfo.test.ts: tests for the script

Verification:
  - Test against a fixture file confirms all transforms
  - Dry-run on the repo shows no unexpected changes (already migrated)
```

---

## 7. Verification Strategy

### 7.1 Pre-migration snapshot

Before any changes, capture baseline:

```bash
# Count all _F references (excluding node_modules, .git)
# This is the "before" count for validation
grep -rn '_F' --include='*.ts' --include='*.vue' --include='*.md' \
  packages/ apps/ specs/ docs/ --exclude-dir=node_modules | wc -l
```

### 7.2 Per-commit gate

Each commit in Â§6 must pass:

1. **Build**: `npx tsc --noEmit` (or `vue-tsc --noEmit`) in the affected package
2. **Tests**: `npx vitest run` in the affected package â€” 100% pass
3. **No stale `_F` refs**: grep for `_F` in the package's `src/` directory. Allowlisted exceptions:
   - Legacy `_FORMAT.md` references (the `_FORMAT` suffix in literals)
   - `block:` syntax (pre-`_F` era, intentionally unchanged)
   - Historical changelog entries
   - URLs and external references (unchanged)

### 7.3 Post-migration full validation

After all 7 commits:

```bash
# 1. Full build chain
npm run build  # (or equivalent monorepo build)

# 2. Full test suite
npm test       # (or equivalent monorepo test)

# 3. Editor smoke test
# Launch the editor and verify:
# - An _NN.md model file loads and renders correctly
# - The _F brand badge shows as _NN
# - Validation reports iNNfo (not FORMAT) in messages

# 4. Legacy regression test
# Try parsing a _FORMAT.md file (should fail gracefully â€” expected behavior)
# Verify error message is clear about the format change

# 5. Stale reference audit
grep -rn '_F' --include='*.ts' --include='*.vue' \
  packages/ apps/ --exclude-dir=node_modules --exclude-dir=dist \
  | grep -v '_FORMAT\.md' \
  | grep -v '\bblock:\s*' \
  | grep -v '//.*legacy' \
  | grep -v '//.*historical'
# Expected: zero matches
```

### 7.4 Golden file strategy

After migration, run all golden tests to confirm serialization round-trips:

```bash
npx vitest run --include='**/*.golden.*'
```

These tests compare parser output against expected strings. After the rename, ALL golden files must be regenerated with `_NN` syntax.

---

## 8. Risk Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Blanket grep misses `_F` in comments/strings** | High | Medium | Per-file review checklist with line numbers from Â§2. Use `replaceAll` on constants but not on regex patterns (some need precision). |
| **`hidMarkerRe` has two branches** | Medium | High | The `block:` branch is intentionally unchanged. Changing it would break legacy `_FORMAT.md` files. Add an inline comment: `// block: is legacy syntax â€” NOT renamed` |
| **`_F` appears inside larger identifier like `_FILE` or `FETCH`** | Low | High | All regex patterns anchor `_F` to whitespace or line start: `\s+_F\s`, `_F\.md`, `_F\s+`. Safe for targeted replacement. |
| **Column config files or editor settings reference `format-core`** | Low | Medium | Check `.vscode/settings.json`, `.editorconfig`, `tsconfig.json` paths â€” none reference the directory name currently. |
| **Scope ambiguity: defiNNe spec migration** | Medium | Medium | The `defiNNe_V_0-1-1_F.md` at `specs/` is NOT in the proposal's in-scope table, but IS consumed by `resolveParentChain()`. **Decision**: Migrate it to `_NN.md` syntax because the V_0-2-0 parser must parse it. Mark as "implied scope" in the PR. The older `defiNNe_V_0-1-0_FORMAT.md` stays untouched. |
| **Scope ambiguity: template spec `catalog_V_0-1-2_FORMAT.md`** | Low | Low | This is `_FORMAT.md` suffix (legacy). Explicitly out of scope. The `spec.ts` TEMPLATE_SPECS map references it by name â€” that's fine; the GitHub URL stays the same. |
| **`@cognnitive/format-core` still referenced in lockfile** | Medium | Low | Run `npm install` after directory rename. The workspace hoisting resolves to the new directory. Verify no stale symlinks. |
| **Editor UI shows stale _F glyph** | Low | Medium | The `<span>_F</span>` in Header.vue and ModelInfoPanel.vue must be changed to `<span>_NN</span>`. These are visual-only brand marks. |
| **Migration script double-transforms** | Low | Medium | Script must check `'_NN' in file` before transforming. Files already migrated are skipped. |

### Scope clarifications

| Item | Status | Rationale |
|------|--------|-----------|
| `defiNNe_V_0-1-1_F.md` | **IN scope** (implied) | Consumed by `resolveParentChain` â€” must parse with V_0-2-0 parser |
| `catalog_V_0-1-2_FORMAT.md` | OUT of scope | Uses `_FORMAT.md` (legacy suffix) â€” not renamed per proposal |
| `business_V_0-1-1_FORMAT.md` | OUT of scope | Same â€” legacy `_FORMAT.md` suffix |
| `procedures_V_0-1-1_FORMAT.md` | OUT of scope | Same |
| `FORMAT_V_0-1-2_FORMAT.md`, `FORMAT_V_0-1-4_FORMAT.md` | OUT of scope | Historical spec versions â€” frozen, not migrated |
| `FORMAT_V_0-1-5_F.md` | **IN scope** | Current version â€” becomes `iNNfo_V_0-2-0_NN.md` |


## Appendix A: Exact Constant & Variable Name Changes

| Package | Old name | New name | Reasoning |
|---------|----------|----------|-----------|
| format-core/parser.ts | `INDEX_F_RE` | `INDEX_NN_RE` | Renamed constant |
| format-core/parser.ts | `F_SECTION_RE` | `NN_SECTION_RE` | Renamed constant |
| format-core/parser.ts | `F_ELEMENT_RE` | `NN_ELEMENT_RE` | Renamed constant |
| format-core/validator.ts | `SECTION_FM_RE` | `SECTION_NN_RE` | Renamed constant |
| format-core/recursiveParser.ts | `FORMAT_FILE_SUFFIX` | `INNFO_FILE_SUFFIX` | Renamed constant |
| format-core/helpers.ts | `F_MD_RE` | `NN_MD_RE` | Renamed constant |
| innfo-editor/constants.ts | `DEFAULT_FORMAT_VERSION` | `DEFAULT_INNFO_VERSION` | Renamed constant |
| innfo-editor/constants.ts | `buildSpecificationUrl` | **stays** (no `_F` in name) | Function name unchanged, URL template changes |
| innfo-editor/version.ts | `parseFormatFilename` | **stays** | Function name unchanged, regex pattern changes |
| innfo-editor/version.ts | `buildFormatFilename` | **stays** | Function name unchanged, output suffix changes |

## Appendix B: File Change Count Estimate (Refined)

| Category | Files | Estimated replacements | Notes |
|----------|-------|----------------------|-------|
| Package renames | 3 dirs + 3 pkg.json | ~9 | Git mv preserves history |
| Core parser.ts | 1 | ~14 | 6 regex + 5 serializer + 3 comments |
| Core validator.ts | 1 | ~25 | 3 regex + ~22 string refs |
| Core helpers.ts | 1 | ~3 | 1 regex + 2 comments |
| Core recursiveParser.ts | 1 | ~5 | 1 constant + 2 regex + 2 comments |
| Core resolver.ts | 1 | ~1 | Cache filename |
| Core types.ts | 1 | ~3 | JSDoc comments |
| Core index.ts | 1 | ~0 | Export names unchanged |
| Core other (browser, driver, etc.) | 5 | ~0 | No `_F` refs |
| MCP spec.ts | 1 | ~4 | Cache paths + imports |
| MCP mutate.ts | 1 | ~2 | File resolution + import |
| MCP list-read.ts | 1 | ~2 | Comments + import |
| Editor constants.ts | 1 | ~3 | Version + URL template |
| Editor version.ts | 1 | ~6 | 3 regex + 2 JSDoc + 1 output |
| Editor Vue components | ~8 | ~15 | Visual glyphs, labels, regex |
| Editor other .ts files | ~5 | ~3 | Import paths |
| Core tests | 2 files | ~98 | Inline model content strings |
| App tests | ~20 files | ~150 | Inline model content strings |
| Spec file | 1 | ~1 | `FORMAT_V_0-1-5_F.md` â†’ `iNNfo_V_0-2-0_NN.md` |
| Docs + changelogs | ~20 | ~50 | Prose replacements |
| **Total** | **~85 files** | **~390 changes** | |

> The refined count is ~390 changes (vs. the proposal's ~340). The delta comes from deeper per-file analysis of the validator's ~25 string references and ~250 inline test content strings that were under-counted.
