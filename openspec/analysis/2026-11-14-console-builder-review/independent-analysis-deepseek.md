---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - deepseek"
---

# NN Findings

## NN Findings: F1 CSP without script-src silently drops every inline hash
category:: improvement
impact:: high
effort:: low
risk:: low
code_ref:: scripts/console-views.mjs:524, scripts/console-views.mjs:512
recommendation:: When the policy has no `script-src` directive, append one (`; script-src <hashes>`) instead of relying on the regex match, or throw so the export fails instead of emitting a page that cannot execute its own bundle.
tags:: [security, console-views, csp]

`meta[2].replace(/(script-src[^;]*)/, ...)` only rewrites a directive that already
exists. A shell whose meta reads `default-src 'self'` computes the hashes on line 512
and then discards them, so `allowInlineScripts` returns a page unchanged in practice:
the inlined bundle and every view are blocked by `default-src` and the console opens
blank. The function already knows how many hashes it produced, so the silent no-op is
strictly worse than an explicit branch.

## NN Findings: F2 Delivery sanitization is gated by a hard-coded domain view id
category:: change
impact:: high
effort:: medium
risk:: medium
code_ref:: scripts/export-console.mjs:1894, scripts/export-console.mjs:1900, scripts/export-console.mjs:1905
recommendation:: Drop `view === 'conntent-delivery'` from `isDelivery` and let the delivery contract arrive only through scope (`delivery`, `stagingDir`, `outFile`), or resolve a `delivery: true` declaration from the registered view instead of a string literal.
tags:: [delivery, layering, export-console]

`isDelivery` is the only thing that turns on the element/field/viewData strip at 1900,
and one of its five inputs is a coNNtent-specific view slug baked into the generic
exporter. Rename that view, or ship a delivery page under a different view, and the
strip stops running while the export still succeeds: internal `cost`, `budget`,
`ledger` and `prompt` fields then travel inside a page that is handed to a non-owner.
Coupling a leak guard to a name this file does not own is the wrong dependency
direction, and a miss is invisible in the output.

## NN Findings: F3 Argument parser has no unknown-flag branch and one unguarded value flag
category:: improvement
impact:: high
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:235, scripts/export-console.mjs:230, scripts/export-console.mjs:213
recommendation:: Add a first-class `a.startsWith('--')` fall-through that prints the usage line and returns exit code 2, and give every value flag the same `!slice[i].startsWith('--')` guard the others use.
tags:: [cli, export-console, parsing]

Line 235 is the catch-all `else`: any token that is neither a known flag nor the first
positional becomes `args.model`, so `nn export <root> --no-opne` silently exports
nothing and reports "No models selected" instead of naming the typo. `--filter` at 230
is the only value flag with no `startsWith('--')` guard, so `--filter --no-open`
consumes the next flag as the pattern and still opens the browser. Every neighbouring
flag (`--new-view`, `--template`, `--blueprint`) already models the correct check.

## NN Findings: F4 Documented writeConsole result is not what any return statement produces
category:: refactor
impact:: medium
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:1225, scripts/export-console.mjs:2166, scripts/export-console.mjs:1992
recommendation:: Make the three returns agree with the contract: include `breakdown` (already computed at 2075) and a `summary`, and document the third `status: 'error'` shape, or trim the JSDoc to the fields actually returned.
tags:: [contract, writeConsole, docs]

The JSDoc promises `{ path, relativePath, status, knowledgeVersions, opened, openError,
breakdown, summary }` and a `status` of `"written"` or `"unchanged"`. The success return
at 2166 carries neither `breakdown` nor `summary`, and the immutable-delivery branch at
1992 returns `status: 'error'` plus an `error` string that the contract never mentions.
A caller that logs `result.summary` gets `undefined` and no diagnostic, which is exactly
the kind of drift a shared writer should not have.

## NN Findings: F5 Asset candidate lists repeat one name and lost their legacy entry
category:: refactor
impact:: medium
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:137, scripts/export-console.mjs:1323, scripts/export-console.mjs:708
recommendation:: Replace the two arrays with single paths, or restore the second entry as the legacy `innfo-`-prefixed name that the surrounding regexes already accept.
tags:: [assets, export-console, dead-code]

`['nn-console.bundle.js', 'nn-console.bundle.js']` and `['nn-ui.css', 'nn-ui.css']` are
one-element lists written three times: `.find(existsSync)` can only succeed on the first
entry. The two-entry shape is the legacy-fallback pattern `findShell` still uses at 84,
and lines 708 and 1296 both match `(?:nn|innfo)-console`, so the legacy `innfo-` asset
names were supported when these lists were written and are now unreachable. Either drop
the array or restore `innfo-console.bundle.js` / `innfo-ui.css` as the fallback.

## NN Findings: F6 Multi-model scope key mixes an order-dependent label with an order-independent hash
category:: improvement
impact:: medium
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:498, scripts/export-console.mjs:1251
recommendation:: Sort `selected` by `filePath` once before calling `scopeKeyOf`, so both the `plus` prefix and the hash are derived from the same canonical order.
tags:: [determinism, scope, artifact-paths]

The hash is built from `rels.sort()`, but the prefix comes from `selected[0].name` in
whatever order the caller passed. `writeConsole` copies `scope.selected` verbatim at
1251, so the same model set can map to two artifact paths (`a-plus2-…` vs
`b-plus2-…`) with an identical `domainId` hash suffix — the same draft store, two files.
Today the CLI hides it because `loadModels` sorts first; a programmatic caller does not
inherit that guarantee, and a stable artifact path is a stated goal of this writer.

## NN Findings: F7 Preview buffer is sized in bytes but counted against a character cap
category:: change
impact:: medium
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:1122, scripts/export-console.mjs:1131, scripts/export-console.mjs:1133
recommendation:: Read `min(st.size, cap * bytesPerChar)` bytes, decode, then truncate the string to `cap` characters and drop a trailing `U+FFFD` before charging the byte budget.
tags:: [preview, encoding, export-console]

`want` is `min(st.size, snippetCharCap(), snippetBudget)`: a character cap and a byte
budget compared as if they were the same unit. Because `want` is also the byte count
read at 1127, a 500-byte read of UTF-8 text can end mid-codepoint, and
`buf.toString('utf8')` at 1131 then emits a replacement character as the last glyph of
the preview. For non-ASCII sources — the normal case for this project's Spanish content
— every truncated preview ends with `�`, and the budget accounting stays in bytes while
the cap it is compared to is in characters.

## NN Findings: F8 runExportConsole swaps process globals instead of threading a writer
category:: refactor
impact:: medium
effort:: medium
risk:: medium
code_ref:: scripts/export-console.mjs:2483, scripts/export-console.mjs:2503, scripts/export-console.mjs:2518
recommendation:: Pass a `log`/`warn` collector into `runMain` (writeConsole already accepts `log`) and return the captured strings, instead of assigning `console.log` and `process.stdout.write`.
tags:: [testability, concurrency, export-console]

The function reassigns `console.log`, `console.error`, `console.warn`,
`process.stdout.write` and `process.stderr.write` for the duration of the call and
restores them in `finally`. Any concurrent `runExportConsole` — two MCP export requests
in one process, or a progress line from unrelated code — lands in whichever sink is
installed last, and output ordering between the two becomes arbitrary. The writer
already takes an injectable `log` callback, so the global swap is avoidable surface
rather than a necessity.

## NN Findings: F9 Two spec-name parsers with divergent case handling
category:: refactor
impact:: medium
effort:: low
risk:: low
code_ref:: scripts/console-views.mjs:37, scripts/export-console.mjs:330
recommendation:: Have `coreBlueprintOf` delegate to `parseSpecName(name).base.trim().toLowerCase()` so one regex owns the version suffix.
tags:: [duplication, naming, specs]

`parseSpecName` matches `_(V_\d+-\d+-\d+)$` case-sensitively and returns a base without
lowercasing; `coreBlueprintOf` strips `_V_\d+-\d+-\d+$` with the `i` flag and then
lowercases. The two files also sit in the same publish set, so a `parent_spec` written
as `metrics_v_0-1-0` is versioned by one parser and is one opaque base name for the
other — `viewRootCandidates` would then join a folder literally named `metrics_v_0-1-0`
instead of failing the name check. One helper, one answer.

## NN Findings: F10 Locale-dependent sorting where the module contract requires code-unit order
category:: improvement
impact:: low
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:435, scripts/export-console.mjs:1881, scripts/console-views.mjs:167
recommendation:: Share `compareCodeUnits` from console-views.mjs and use it for both sorts instead of `localeCompare`.
tags:: [determinism, locale, export-console]

`console-views.mjs` defines `compareCodeUnits` at 65 and its comment at 167 states that
plain code-unit order is used so results and messages never depend on the machine
locale. `export-console.mjs` then sorts console candidates by `generated` and changesets
by `path` with `localeCompare`, whose collation is locale- and ICU-version-dependent.
Two machines can disagree about which console is "newest" in `inspectModelStatus`, which
decides the reported status of every model.

## NN Findings: F11 renderTree prints the same block twice for one branch difference
category:: refactor
impact:: low
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:526, scripts/export-console.mjs:537
recommendation:: Collapse the two branches into one item loop that takes `childIndent` as `''` for the `.` group, so the prefix logic exists once.
tags:: [duplication, tree, cli]

The `if (dirKey === '.')` and `else` bodies are the same nested loop, differing only in
whether `childIndent` prefixes the two lines. Any future fix — ordering, colour, a
status column — has to be applied twice, and a divergence between the two would only
show on a directory that happens to be the domain root.

## NN Findings: F12 Synthetic view ids are detected by matching raw source text
category:: change
impact:: low
effort:: medium
risk:: medium
code_ref:: scripts/console-views.mjs:138, scripts/console-views.mjs:135, scripts/console-views.mjs:147
recommendation:: Drop the extra-id scan in favour of the file slug, or make it an explicit opt-in declaration the wrapper can observe; while it stays, compute `sha256` once and reuse it for the synthetic entry instead of hashing the same code twice.
tags:: [views, discovery, regex]

`/registerView\s*\(\s*\{[\s\S]*?\bid\s*:\s*['"]([a-z0-9-]+)['"]/g` matches raw text, not
a registered call: a commented-out or quoted `registerView({ id: 'ghost' })` still
yields a view, and the lazy `[\s\S]*?` can reach the `id` of a following block. The
line then rebuilds the whole view object and re-runs `createHash` over the same `code`
that was already hashed at 135, so the one behaviour it adds also duplicates the entry
constructor.
