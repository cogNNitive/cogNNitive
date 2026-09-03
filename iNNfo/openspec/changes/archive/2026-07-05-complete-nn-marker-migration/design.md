# Design: complete-nn-marker-migration

## Parser: hidden-form support via normalization (implemented)

Rather than duplicate the four `_NN` marker regexes (`NN_SECTION_RE`, `NN_ELEMENT_RE`,
`sectionName`, `sectionTitle`, `INDEX_NN_RE`), the hidden form is **unwrapped to the
visible form once**, in `normalizeSource()` (the single function called at every parse
entry point). This keeps all downstream matching logic untouched.

```
text.replace(/<!--\s*(_NN\b[^>]*?)\s*-->/g, '$1')
```

- `# <!-- _NN --> Problems` → `# _NN Problems`
- `* <!-- _NN Problems: --> Problem One` → `* _NN Problems: Problem One`
- Only comments whose content starts with `_NN` are touched; ordinary HTML comments are
  preserved. Covered by a unit test asserting hidden and visible forms decompose identically.

## Content transformations (three rules)

The target keeps each file's **visible/hidden intent** (both are spec-valid). `\b_F\b`
was verified to appear only as markers in these files (never in prose; `_FORMAT` is not
matched because `F` is followed by `ORMAT`, so `_F\b` fails).

| Gen | From | To | Rule |
|-----|------|----|----|
| 1. Visible `_F` | `# _F X`, `* _F X: n` | `# _NN X`, `* _NN X: n` | `\b_F\b` → `_NN` (marker positions only) |
| 2. Hidden `_F` | `<!-- _F … -->` | `<!-- _NN … -->` | `<!--\s*_F\b` → `<!-- _NN` |
| 3. `block:` | `# <!-- block: concepts --> Name`, `* <!-- block: <Concept> --> Name` | `# _NN Name` (or `# <!-- _NN --> Name`), `* _NN <Concept>: Name` | grammar remap (see below) |

### `block:` remap detail (the non-trivial one)

- Section: `# <!-- block: concepts --> Business summary` → concept heading
  `# <!-- _NN --> Business summary` (hidden form preserves the original clean rendering).
- Element: `* <!-- block: Stakeholders --> Strategy Founders` →
  `* <!-- _NN Stakeholders: --> Strategy Founders` (the block value becomes the
  `<Concept>:` prefix; the trailing text becomes the element name).
- Matrices/index blocks: audit each `block:` value against the concept vocabulary in the
  file's `template.concepts` frontmatter; unmapped values are flagged, not guessed.

Each transformation is applied per-file with an explicit before/after node-count check.

## Golden regeneration and audit (not blind)

The `recursiveParser.models.golden` test snapshots all 8 `models/*` fixtures. After
migration:

1. Run with snapshot update, then **read the diff**: every fixture must go from 1 node to
   its full concept/element tree. A fixture still at 1 node means its transformation is
   incomplete — investigate, do not accept.
2. Spot-check node counts against each source file's marker count.
3. Only commit the snapshot once the decomposition is verified correct.

## Decisions

- **Preserve visible vs hidden per file.** The spec blesses both; converting hidden-form
  documents to visible would regress their clean Markdown rendering. Keep intent.
- **No file renames in this change.** `*_F.md` naming is cosmetic and ripples widely;
  deferred to a hygiene task to keep this change auditable.
- **Parser fix ships first** so hidden-form content has runtime support before it lands.
