# Delta for site-compiler

New capability. `compile-site` is a procedure document plus a named Node tool script
(`scripts/site/compile-site.mjs`) that renders the `site_NN/` domaiNN to static files. The
scripts live in `scripts/site/`, not in `site_NN/`, so `verify.js` discovers their tests;
`site_NN/` holds only data.

## ADDED Requirements

### Requirement: Domain-only data input

The compiler MUST read page data only from files inside `site_NN/` (kNNowledge documents,
code-fact snapshots and sidecars, `assets/shell.html`, `assets/site.css`). It MUST NOT read
`docs/`, `iNNfo/` content, or any network resource. It MUST expose
`run({ domainDir, outDir, log })` returning exit code `0` or `1`, with `outDir` defaulting
to `docs/next/` on the CLI.

#### Scenario: Compilation does not read outside the domaiNN

- GIVEN a temporary copy of `site_NN/` and an empty output directory
- WHEN `run` executes with file-system reads observed (spy or sandbox), excluding the code modules it imports
- THEN no data read targets a path outside the domaiNN directory

#### Scenario: Output directory is overridable

- GIVEN `outDir` is a temp directory
- WHEN `run` executes
- THEN all output is written under it and nothing is written to `docs/next/`

### Requirement: One flat HTML file per Page

For each Page the compiler MUST write `<outDir>/<slug>.html`, wrapped in the shell template
(slots `{{title}}`, `{{description}}`, `{{site}}`, `{{tagline}}`, `{{nav}}`, `{{content}}`, `{{sources}}`; every slot must appear and unknown slots fail) and linked to a single
`<outDir>/site.css` copied from the bluepriNNt assets. The `index` Page is the home Page and
MUST be written as `index.html`. Internal links MUST be relative so the output works from
`file://`. Output MUST be UTF-8 and MUST NOT contain U+FFFD. The Page `<title>` MUST be the
element name and `<meta name="description">` MUST be the `summary`.

#### Scenario: A Page renders to a flat path

- GIVEN a Page `## 01 Page: Install` with `slug:: install`
- WHEN the compiler runs
- THEN `<out>/install.html` exists, its `<title>` contains `Install`, and it links `site.css` relatively

#### Scenario: Non-ASCII content survives

- GIVEN a Page body containing `Ñ` and `é`
- WHEN the compiler runs
- THEN the output decodes as UTF-8 with the same characters and no U+FFFD

#### Scenario: Input normalization

- GIVEN a source document with a BOM and CRLF line endings
- WHEN the compiler runs
- THEN the output equals that produced from the same document with no BOM and LF endings

#### Scenario: U+FFFD in input fails

- GIVEN a source document containing U+FFFD
- WHEN the compiler runs
- THEN it exits non-zero naming the file

### Requirement: Derived navigation

Navigation MUST be derived: groups follow the fixed order `pitch`, `tutorial`, `guide`,
`concept`, `reference`, `legal`; Pages within a group sort by `order`, then by `slug`
(ascending). Every rendered page MUST contain the same navigation. Empty groups MUST be
omitted. Each nav entry MUST show the Page title and `summary`.

#### Scenario: Ordering is stable

- GIVEN two `guide` Pages with equal `order` and slugs `b` and `a`
- WHEN the compiler runs
- THEN `a` precedes `b` in the navigation

#### Scenario: Group order is fixed

- GIVEN Pages of every kind
- WHEN the navigation is rendered
- THEN groups appear in the order pitch, tutorial, guide, concept, reference, legal

### Requirement: Fail-closed markdown subset

The renderer (`renderBody(body, { file, line, pagesByName })`) MUST support only:
`###` and `####` headings; paragraphs joined over consecutive lines; flat `1. `
ordered lists only; fenced code blocks with an optional language (content HTML-escaped, indentation
preserved); inline code, `**bold**`, `*em*`; links `[text](https://...)` or relative; and
`[[Page Name]]`, which MUST become a link to that Page's `<slug>.html` and MUST fail if the
Page is unknown. All text MUST be HTML-escaped. Any other construct MUST cause a non-zero
exit with a message `file:line` and MUST write no output: `#` or `##` headings, tables,
blockquotes, raw HTML, images, indented or nested list items, `- ` and `* ` lines (including inside fences,
because nn-core rejects them in concept bodies), unterminated fences,
`javascript:` (and any other non-allowlisted scheme) URLs, and `key::` lines, including
inside fences. No markdown dependency MAY be added.

#### Scenario: Supported constructs render

- GIVEN a body with a `###` heading, an ordered list, a fenced block and a link to `https://example.com`
- WHEN the compiler runs
- THEN the output contains `<h3>`, `<ol>`, `<pre><code>` and a matching `<a href>`

#### Scenario: Code indentation is preserved

- GIVEN a fenced block whose lines are indented by four spaces
- WHEN rendered
- THEN the indentation appears unchanged in the `<code>` content

#### Scenario: Page links resolve

- GIVEN a body containing `[[Install]]` and a Page named `Install` with slug `install`
- WHEN rendered
- THEN the output links to `install.html`

#### Scenario: Unknown Page link fails

- GIVEN a body containing `[[Nope]]` and no such Page
- WHEN the compiler runs
- THEN it exits non-zero naming `file:line`

#### Scenario: Unsupported constructs fail

- GIVEN a body containing, in turn, a table, a blockquote, an image, a `##` heading, a nested list item, or a `- ` line (also inside a fence)
- WHEN the compiler runs
- THEN each exits non-zero naming the file and line, and writes no output

#### Scenario: Raw HTML is not passed through

- GIVEN a body containing `<script>alert(1)</script>`
- WHEN the compiler runs
- THEN it exits non-zero (unsupported construct)

#### Scenario: Unsafe link scheme is rejected

- GIVEN a body link `[x](javascript:alert(1))`
- WHEN the compiler runs
- THEN it exits non-zero naming the file, line and scheme

### Requirement: Parser agreement with nn-core

The site model parser (`loadSite(domainDir)`) MUST treat as fields exactly the contiguous
`key::` block right after each `## NN <Concept>: <Name>` heading and keep the body verbatim.
For every seed document its field maps and element names MUST equal those produced by
nn-upgrade's `parseKnowledge` (test-only coupling).

#### Scenario: Seed documents agree

- GIVEN every seed document under `site_NN/kNNowledge/`
- WHEN parsed by `loadSite` and by `parseKnowledge`
- THEN the element names and field maps are equal

### Requirement: Fail on ambiguous content

The compiler MUST exit non-zero, naming the offender, when it finds: duplicate `slug`
across Pages; a malformed slug; a missing or duplicate `index` slug; a Page missing a
required field; an unknown `kind`; a non-integer `order`; a missing or non-absolute
`base_url`; a `key::` line outside the field block; or duplicate element names within one
document. It MUST NOT silently drop a Page.

#### Scenario: Duplicate slug

- GIVEN two Pages with `slug:: install` in different documents
- WHEN the compiler runs
- THEN it exits non-zero and names both source files

#### Scenario: Field-like prose line

- GIVEN a Page body line `owner:: me`
- WHEN the compiler runs
- THEN it exits non-zero and reports `file:line`

#### Scenario: Duplicate element name

- GIVEN two Pages with the same element name in one document
- WHEN the compiler runs
- THEN it exits non-zero naming the duplicate

### Requirement: Citation handling and staleness policy

The compiler MUST fail (exit non-zero) when any of these holds: `auditModelCitations`
returns errors for the domaiNN; `checkScanImpact` reports any `unresolved_in_latest`; or a
code-facts member's sidecar hash is stale (`findStaleSources`), which signals an in-place
edit that broke the write-once rule. For citations flagged `superseded` (unit still
resolves in the newest member) the compiler MUST print a warning naming Page and citation,
continue, and exit zero. A rendered Page with citations MUST show them as a visible source
list in the `{{sources}}` slot.

#### Scenario: Superseded citation warns and builds

- GIVEN a Page citing `mcp-tools_<stamp1>.md@## innfo_validate` and a newer member that still has that heading
- WHEN the compiler runs
- THEN the log carries a warning naming the Page, the exit code is 0 and output is written

#### Scenario: Unresolved-in-latest fails

- GIVEN the newer member no longer has the heading
- WHEN the compiler runs
- THEN the exit code is non-zero and the report names the Page and citation

#### Scenario: Unknown file or unit fails

- GIVEN a Page citing a file or heading that does not exist
- WHEN the compiler runs
- THEN it exits non-zero with the citation in the message

#### Scenario: Stale sidecar hash fails

- GIVEN a snapshot edited in place so its bytes no longer match its sidecar `sha256`
- WHEN the compiler runs
- THEN it exits non-zero naming the member

#### Scenario: Citations are visible

- GIVEN a reference Page with one citation
- WHEN rendered
- THEN the HTML lists the cited file and unit

### Requirement: Output ownership and failure behavior

The output directory is wholly owned by the compiler: on a successful run it MUST be
removed and rewritten, so files no longer generated disappear. All parsing, validation and
rendering MUST complete before the output directory is touched, so a failing run leaves the
previous output byte-identical. The compiler MUST remove only the directory it was given.

#### Scenario: Failure leaves prior output intact

- GIVEN a previous successful build in `<out>`
- WHEN a Page is edited to be invalid and the compiler runs
- THEN it exits non-zero and `<out>` is byte-identical to before

#### Scenario: Removed Pages disappear

- GIVEN a prior build containing `<out>/old.html`
- WHEN the Page `old` is deleted and the compiler runs
- THEN `<out>/old.html` no longer exists

### Requirement: sitemap.xml and llms.txt

The compiler MUST emit `<out>/sitemap.xml` with one `<url>` per Page (the `index` Page is
one of them) and `<out>/llms.txt` with the Site title, tagline and one line per Page
(title, URL, summary) grouped by `kind`. URLs MUST derive from `Site.base_url`. Neither file
MAY contain a timestamp, `lastmod` or build date. The compiler MUST NOT emit markdown twins.

#### Scenario: Every Page is listed

- GIVEN N Pages
- WHEN the compiler runs
- THEN `sitemap.xml` contains N `<loc>` entries, each starting with `Site.base_url`
- AND `llms.txt` has a line for each Page containing its summary

#### Scenario: No lastmod

- GIVEN a successful build
- WHEN `sitemap.xml` is read
- THEN it contains no `lastmod` element

#### Scenario: No markdown twins

- GIVEN a successful build
- WHEN the output tree is listed
- THEN it contains no `.md` file

### Requirement: Deterministic output

For identical `site_NN/` input the compiler MUST produce byte-identical output. Output MUST
NOT contain timestamps, absolute paths, random values or environment-dependent text; all
collections MUST be sorted by explicit keys independent of file-system listing order. Files
MUST be written with explicit `utf8`, LF line endings and a single trailing newline.

#### Scenario: Rerun is byte-identical

- GIVEN a successful build
- WHEN the compiler runs again on the unchanged domaiNN
- THEN every output file hash equals the first run's

#### Scenario: Output is path-independent

- GIVEN the same domaiNN copied to two different directories
- WHEN the compiler runs on each
- THEN both outputs are byte-identical

#### Scenario: Committed output is fresh

- GIVEN the committed `docs/next/`
- WHEN `compile-site.test.mjs` compiles into a temp directory and byte-compares with it
- THEN the trees are identical, otherwise the test fails and tells the developer to rerun the compiler

### Requirement: Zero new dependencies and no shared-file edits

The compiler MUST use only Node built-ins plus the existing `skills/nn-sources` mirror and
impact checker, unchanged. The change MUST NOT modify `package.json` dependencies,
`verify.js`, `build-docs.mjs`, CI workflows, `publish-web*`, release tooling, or any
existing file, and MUST NOT write to role (c) paths (`docs/use/`, `docs/update/`,
`docs/innfo/blueprints/`, `.nojekyll`, `CNAME`).

#### Scenario: Protected paths untouched

- GIVEN the compiler has run
- WHEN the working tree is diffed
- THEN changes appear only under `site_NN/`, `scripts/site/`, `docs/next/` and the vitest spec `iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts`

### Requirement: Test discovery

Compiler tests MUST be `*.test.mjs` files under `scripts/site/` using `node:test`, so
`node scripts/verify.js --fast` discovers them with no change to `verify.js`.

#### Scenario: Tests run in the gate

- GIVEN a deliberately failing test in `scripts/site/`
- WHEN `node scripts/verify.js --fast` runs
- THEN the gate fails

## Assumptions

- `docs/next/` is the accepted public trial URL (orchestrator decision).
- Staleness policy: warn on `superseded`, fail on `unresolved_in_latest` (orchestrator decision); design D7 additionally fails on citation audit errors and stale sidecar hashes.
- Determinism includes no timestamps (orchestrator decision).
- Hand parser in `scripts/site/lib/site-model.mjs` (design D2); requirements remain testable at the `loadSite` / `renderBody` / `run` interfaces.
