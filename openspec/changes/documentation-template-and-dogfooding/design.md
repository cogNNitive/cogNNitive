# Design: Documentation Template and Docsify Dogfooding

## Context

The iNNfo documentation site (`docs/innfo/documentation/`) is a Docsify SPA whose
navigation lived in a hand-maintained `_sidebar.md`. This change introduces a
canonical Level 2 `documentation` template package plus a deterministic generator
so navigation is compiled from an iNNfo Level 3 model instead of edited by hand.

## Decisions

### 1. Standalone zero-dependency generator, not `@cognnitive/innfo-core`

`scripts/generate-docsify-sidebar.mjs` parses the model with its own minimal
line scanner (`node:fs` / `node:path` / `node:url` only).

- **Why:** the script runs inside `scripts/build-docs.mjs` before any workspace
  package is guaranteed built, and Docsify sidebar generation only needs three
  concepts (`DocSite`, `Section`, `Page`). Pulling in `innfo-core` would couple
  the docs build to the package build graph for no real gain.
- **Trade-off:** the scanner recognises a narrow grammar
  (`## NN <Concept>: <Name>` headers, `key:: value` fields, `[[Ref]]` unwrap). If
  the model grammar evolves, this parser must track it. Acceptable for a
  single-purpose build script.

### 2. Grammar consumed by the generator

- Entities: `## NN Section: <name>` and `## NN Page: <name>`.
- Fields: `key:: value` lines under an entity; `[[Target]]` values are unwrapped
  to `Target`.
- Grouping: a `Page` with `parent:: [[<Section>]]` nests under that section;
  pages with no known parent render at root.
- Ordering: sections by `section_order` (fallback `order`, then `999`); pages by
  `order` (fallback `999`).
- Route: `route::` if present, else `source` with the `.md` suffix stripped.

### 3. Source validation fails the build

For every `Page`, the generator resolves `source` relative to the model
directory and aborts non-zero if the file is missing (unless
`--skip-file-check`). This keeps dead links out of the published site.

### 4. Integration point

Added as step 4 of `scripts/build-docs.mjs`, after manifest generation:

```
node scripts/generate-docsify-sidebar.mjs docs/innfo/documentation/documentation_NN.md
```

Output is deterministic: dry-run, in-build, and committed `_sidebar.md` are byte-identical.

## Deviation from the proposal

The proposal framed the L3 model as covering the "9 existing documents" with
"100% navigation fidelity". The authored `documentation_NN.md` keeps **all 9
original routes** and adds one entry, `opencode-innfo-agent`, which already
existed as a markdown file in the directory but was absent from the old sidebar.

- No route was removed or changed.
- The flat list is now grouped into `Components` / `Architecture` / `Guides`.

This is a superset, not a regression; recorded here so the diff against the old
`_sidebar.md` is expected.

## Out of scope

- Converting Docsify to an SSG.
- Landing pages (`docs/index.html`).
- `_navbar.md` generation (the template anticipates it; not implemented here).
