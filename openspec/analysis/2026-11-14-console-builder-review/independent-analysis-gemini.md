---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - gemini"
---

# NN Findings

## NN Findings: F1 Prevent basename collision and quadratic scan in workspace file citation linking
category:: improvement
impact:: high
effort:: medium
risk:: low
code_ref:: scripts/export-console.mjs:1086-1096, scripts/export-console.mjs:1100-1109
recommendation:: Pre-index normalized citation and evidence paths into lookup Sets and remove the fallback matching on raw file basenames.
tags:: [performance, workspace-inventory]

In `collectWorkspaceFiles`, the loop scanning workspace files compares each candidate file against all citations and change evidence items. Lines 1091 and 1105 match using `basename(c.norm) === basename(rel)` and `basename(ev) === basename(rel)`.

This causes two major issues. First, if multiple distinct files share the same filename across different folders (such as `README.md`, `index.html`, or `schema.json`), citations or evidence intended for one file are erroneously attributed to every file sharing that basename, producing false positive citation and excerpt counts. Second, iterating through all citations and changeset evidence entries for every single workspace file creates an $O(F \times (C + E))$ scan with repeated string slicing, `endsWith`, and `basename` calls. Indexing citation paths into a `Set` or `Map` keyed by exact relative path eliminates false positives and accelerates file inventorying to $O(1)$ per file.

## NN Findings: F2 Pre-aggregate changeset change counts to eliminate quadratic model loop filtering
category:: refactor
impact:: high
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:1566-1578
recommendation:: Aggregate change counts by model target prefix once into a Map before iterating over payloadModels.
tags:: [performance, export-pipeline]

During model payload assembly in `writeConsole`, every model iteration executes a full reduce over all changesets and an inner filter over every change item in `cs.changes` to count how many changes target the model.

In a domain with 50 models and 2,000 changes, this loop traverses 100,000 change records synchronously during console generation. Because the set of changesets is static for the duration of the export, counting changes for each model independently inside the model loop is unnecessary. Computing a single `Map<string, number>` keyed by normalized model stem before entering the model loop replaces the $O(M \times C)$ iteration with an $O(1)$ lookup per model summary.

## NN Findings: F3 Include CSS and console views in console staleness evaluation
category:: change
impact:: high
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:464-475
recommendation:: Compare mtimes of uiCssPath and discovered console view scripts alongside bundlePath and shellPath in inspectDomainConsole.
tags:: [cache-invalidation, cli]

`inspectDomainConsole` determines whether `domaiNN_console.html` is fresh or stale by checking model versions/hashes and comparing the output file modification timestamp against `bundlePath` and `shellPath`.

However, the stylesheet (`uiCssPath` / `nn-ui.css`) and domain or blueprint view scripts (`consoles/views/*.js`, `assets/console-view-*.js`) are also inlined directly into the resulting console artifact. If an engineer updates styling in `nn-ui.css` or edits a view script without altering model markdown documents, `inspectDomainConsole` reports `fresh`, and CLI runs with `--stale` prematurely skip regenerating the console artifact. Adding `uiCssPath` and the modification times of discovered view scripts to the freshness check prevents stale consoles from masquerading as fresh.

## NN Findings: F4 Avoid full HTML re-rendering and CSP re-hashing across degradation passes
category:: refactor
impact:: medium
effort:: medium
risk:: low
code_ref:: scripts/export-console.mjs:2000-2010, scripts/export-console.mjs:2041-2063
recommendation:: Test serialized slot sizes before calling buildHtml and inlineConsoleAssets to avoid repeatedly rendering oversized HTML strings.
tags:: [memory, performance]

When an exported console exceeds `failBytes` (100 MB), `writeConsole` triggers size degradation. In lines 2041, 2053, and 2060, `buildHtml` is invoked up to three times consecutively. Each invocation runs `renderConsole`, `inlineConsoleAssets`, and `allowInlineScripts` (which extracts and calculates base64 SHA-256 hashes for every inline script block).

Re-assembling, regex-replacing, and hashing multiple 100 MB strings in memory causes significant V8 garbage collection pressure and risks Node process heap exhaustion. Because size overages are overwhelmingly driven by model element slot payloads (citations and provenance), the export pipeline should estimate or measure slot payload sizes directly on the model data before invoking the full HTML templating and asset inlining pass.

## NN Findings: F5 Remove duplicated candidate filenames in bundle and stylesheet path resolution
category:: refactor
impact:: medium
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:137, scripts/export-console.mjs:1323
recommendation:: Deduplicate the candidate array in bundlePath and uiCssPath or restore intended fallback candidate names.
tags:: [code-hygiene, asset-loader]

In `export-console.mjs`, `bundlePath` is resolved using `['nn-console.bundle.js', 'nn-console.bundle.js']` and `uiCssPath` is resolved using `['nn-ui.css', 'nn-ui.css']`.

Repeating identical string literals in the candidate list serves no purpose and indicates an incomplete rename or merge artifact from the earlier migration from legacy asset names (`innfo-console.bundle.js` / `innfo-ui.css`). The arrays should either be simplified to single paths or explicitly restored to check legacy fallback filenames if backward compatibility with older asset directories is required.

## NN Findings: F6 Handle missing script-src directive when updating Content-Security-Policy hashes
category:: change
impact:: medium
effort:: low
risk:: low
code_ref:: scripts/console-views.mjs:524-525
recommendation:: Append a script-src directive to the CSP policy when replacing script-src matches nothing.
tags:: [security, csp]

`allowInlineScripts` updates the document's `<meta http-equiv="Content-Security-Policy">` tag to authorize inlined scripts by hashing each executable block and injecting `'sha256-...'` tokens into the `script-src` directive via regex:
`policy = meta[2].replace(/(script-src[^;]*)/, (directive) => \`\${directive} \${[...hashes].join(' ')}\`)`.

If a domain shell specifies a CSP policy relying on `default-src 'self'` without an explicit `script-src` token, the regex fails to match. As a result, `policy` remains unmodified, the generated script hashes are dropped, and modern browsers block the inlined bundle and view scripts. `allowInlineScripts` should detect when `script-src` is absent and append `script-src 'self' <hashes>` to the policy string.

## NN Findings: F7 Replace bespoke lexical scanner in findModuleSyntax with structured parsing or error extraction
category:: refactor
impact:: medium
effort:: medium
risk:: low
code_ref:: scripts/console-views.mjs:240-337
recommendation:: Delegate syntax classification to vm.Script error properties or a standard parser rather than maintaining a manual character-level tokenizer.
tags:: [parser, validation]

`findModuleSyntax` implements a 98-line custom character scanner that tracks template literal depths, comments, and regex-versus-division states to explain why a classic script failed to compile in `assertClassicScript`.

Manual token scanning in JavaScript is error-prone. For instance, slash disambiguation following `}` assumes regex if `prev` was `}` regardless of whether `}` closed a block or an object literal, and top-level await detection relies on whitespace heuristics that can misclassify object properties or identifiers in sloppy mode. Because the function is only invoked after `new Script(...)` has already thrown a `SyntaxError`, the error message can be derived directly from standard V8 parser diagnostics or a lightweight AST parser without carrying custom grammar parsing code.

## NN Findings: F8 Fix secondary view exclusion caused by source-level deduplication in prepareAssets
category:: change
impact:: medium
effort:: medium
risk:: medium
code_ref:: scripts/console-views.mjs:138-151, scripts/console-views.mjs:453-458
recommendation:: Deduplicate view assets by view id rather than source path in prepareAssets, or enforce a strict single-view-per-file constraint.
tags:: [view-system, bundle-integrity]

`readViews` scans view script code for additional `registerView({ id: ... })` calls (lines 138-151) and adds an entry to `views` for each discovered view ID, assigning each entry the same `source` file path.

However, `prepareAssets` filters views with `seenSources.has(v.source)` (lines 453-458). Because all extra views declared in that script share the same `source`, every secondary view is discarded from `uniqueViews` and omitted from `preparedAssets.viewScripts`. At the same time, `viewsHeader(views)` (line 462) receives the unfiltered list, producing an HTML audit header that lists views that were never actually wrapped and inlined into the page. Deduplicating by `v.id` ensures every registered view is inlined and aligned with the header comment.

## NN Findings: F9 Harden data-theme injection in buildHtml against HTML tag attribute variations
category:: improvement
impact:: low
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:2006-2008
recommendation:: Replace literal string replacement of '<html lang="en">' with a regular expression matching the opening html tag.
tags:: [html-rendering]

In `buildHtml`, default theme assignment checks `if (!html.includes('data-theme='))` and performs `html.replace('<html lang="en">', '<html lang="en" data-theme="light">')`.

If the console shell HTML contains additional attributes on the root element (such as `<html lang="en" class="no-js">`, a different language code, or multiline formatting), the exact substring replacement fails silently. The exported console is then generated without an explicit `data-theme` attribute on `<html>`, which can lead to unstyled or mismatched theme states in client browsers. Matching with a regular expression such as `/<html\b(?![^>]*\bdata-theme=)([^>]*)>/i` ensures the attribute is reliably injected.

## NN Findings: F10 Guard atomic file replacement against Windows file locking errors
category:: improvement
impact:: low
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:814-824
recommendation:: Catch EPERM/EBUSY during rename in writeFileAtomic and implement a bounded retry or copy fallback on Windows platforms.
tags:: [filesystem, windows]

`writeFileAtomic` creates a temporary file and renames it over the target console file (`rename(tmp, file)`).

On Windows systems, `fs.rename` over an existing file is not strictly atomic and frequently fails with `EPERM` or `EBUSY` if the destination HTML file is currently open in a web browser, undergoing an antivirus scan, or being accessed by an editor. Adding a short exponential backoff retry loop (e.g. 3 attempts over 200 ms) before failing prevents intermittent export crashes during active local development sessions on Windows.
