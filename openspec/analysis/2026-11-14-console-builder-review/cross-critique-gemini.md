---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - gemini"
---

# NN Critiques

## NN Critiques: Review of deepseek F1
target:: deepseek:F1
stance:: agree

Verified in `scripts/console-views.mjs:508-526`. `allowInlineScripts` computes SHA-256 hashes for all executable inline scripts, but injects them using `meta[2].replace(/(script-src[^;]*)/, ...)`. If the HTML shell's CSP `<meta>` content lacks an existing `script-src` directive (for instance, when declaring only `default-src 'self'`), the regular expression never matches and `policy` remains unmodified. The generated HTML retains inline scripts while dropping all calculated hashes, causing browsers enforcing CSP to block the bundled scripts and render a blank console. Appending a `script-src` directive when absent is required. This aligns with `gpt-luna:F3`.

## NN Critiques: Review of deepseek F2
target:: deepseek:F2
stance:: agree

Verified in `scripts/export-console.mjs:1894, 1900-1925`. Line 1894 sets `isDelivery` if `view === 'conntent-delivery'`. Hard-coding a coNNtent-specific view slug inside the generic exporter creates an inverted dependency and fragile layering. If a delivery console is created under a renamed view or alternative blueprint view without explicitly passing delivery indicators in the scope object, the element and field sanitization (`cost`, `budget`, `ledger`, `prompt`) on lines 1901-1925 is skipped, risking the leakage of confidential operational metadata. Relying on an explicit scope parameter or a view-level declaration (`delivery: true`) is the cleaner design.

## NN Critiques: Review of deepseek F3
target:: deepseek:F3
stance:: agree

Verified in `scripts/export-console.mjs:213, 227-236`. In `parseArgs`, `--filter` on line 227 consumes the subsequent token without the `!slice[i].startsWith('--')` guard used by other value flags like `--template`, `--blueprint`, and `--new-view`. As a result, an invocation like `--filter --no-open` stores `"--no-open"` into `args.filter`. Additionally, the fallback `else` at line 235 unconditionally assigns any unrecognized token to `args.model` (or `args.root`), causing flag typos (e.g., `--no-opne`) to be interpreted as model filters and failing with "No models selected" instead of flagging the invalid argument. An unknown flag branch and consistent argument guarding are needed.

## NN Critiques: Review of deepseek F4
target:: deepseek:F4
stance:: agree

Verified in `scripts/export-console.mjs:1224-1226, 1989-1997, 2166-2173`. The JSDoc contract for `writeConsole` promises a return shape containing `{ path, relativePath, status, knowledgeVersions, opened, openError, breakdown, summary }` with `status` restricted to `"written"` or `"unchanged"`. In practice, the primary return at line 2166 returns neither `breakdown` (despite being computed at line 2030 and logged at line 2075) nor `summary`. Furthermore, the delivery immutability check at line 1992 introduces an unannounced `status: 'error'` with an `error` message string. Aligning the return values with the declared JSDoc contract avoids unexpected `undefined` properties for callers.

## NN Critiques: Review of deepseek F5
target:: deepseek:F5
stance:: agree

Verified in `scripts/export-console.mjs:137, 708, 1296, 1323`. Lines 137 and 1323 construct candidate arrays with duplicated names: `['nn-console.bundle.js', 'nn-console.bundle.js']` and `['nn-ui.css', 'nn-ui.css']`. This is a regression of the fallback array pattern used in `findShell` at line 84 (`[SHELL_FILENAME, LEGACY_SHELL_FILENAME]`). Because lines 708 and 1296 still accommodate legacy `innfo-` asset naming via regular expressions, these arrays were evidently intended to fall back to `innfo-console.bundle.js` and `innfo-ui.css`. They should either be restored to include the legacy fallback filenames or simplified to single paths.

## NN Critiques: Review of deepseek F6
target:: deepseek:F6
stance:: agree

Verified in `scripts/export-console.mjs:495-499, 1250-1251`. In `scopeKeyOf`, the multi-model family key is formatted as `${selected[0].name}-plus${selected.length - 1}-${hashSlice(rels.join('\n'), 6)}`. While the hash suffix is deterministic because `rels` is sorted, the leading model stem depends directly on the array index `selected[0]`. Programmatic callers supplying `scope.selected` in varying order will generate differing artifact names (e.g., `alpha-plus1-...` vs `beta-plus1-...`) despite representing the exact same model set. Sorting `selected` deterministically by path before extracting `selected[0]` ensures idempotent naming.

## NN Critiques: Review of deepseek F7
target:: deepseek:F7
stance:: agree

Verified in `scripts/export-console.mjs:1121-1133`. Line 1122 evaluates `want = Math.min(st.size, snippetCharCap(), snippetBudget)`, mixing a character count limit (`snippetCharCap()`, defaulting to 500 characters) with byte limits (`st.size` and `snippetBudget`). Line 1124 then allocates `want` bytes, and line 1127 reads `want` raw bytes. For text with multi-byte UTF-8 codepoints (standard in non-English project content), truncating on an arbitrary byte offset can sever a multi-byte sequence, resulting in `buf.toString('utf8')` terminating with the replacement character `\uFFFD`. Sizing reads safely in bytes, decoding to text, and subsequently truncating to characters resolves the encoding defect.

## NN Critiques: Review of deepseek F8
target:: deepseek:F8
stance:: agree

Verified in `scripts/export-console.mjs:2480-2524`. `runExportConsole` reassigns `console.log`, `console.error`, `console.warn`, `process.stdout.write`, and `process.stderr.write` globally before awaiting `runMain`. This directly contradicts the function's JSDoc at line 2475 ("without ever calling process.exit or mutating globals"). Concurrent asynchronous invocations (such as concurrent MCP tool calls) will interleave or hijack each other's stream captures, and the first invocation to complete will restore original globals while another is still active. Passing an explicit output collector into `runMain` is the appropriate non-mutating solution. This agrees with `gpt-luna:F5`.

## NN Critiques: Review of deepseek F9
target:: deepseek:F9
stance:: agree

Verified in `scripts/console-views.mjs:36-39` and `scripts/export-console.mjs:327-332`. `parseSpecName` uses the case-sensitive pattern `/^(.+?)_(V_\d+-\d+-\d+)$/` and preserves base casing, whereas `coreBlueprintOf` uses `/_V_\d+-\d+-\d+$/i` with the case-insensitive flag and lowercases the result. A spec identifier formatted with lowercase version tokens like `spec_v_1-0-0` is treated as versioned by `coreBlueprintOf` but as an unversioned name by `parseSpecName`, causing divergent directory candidate resolution in `viewRootCandidates`. Unifying version stripping into a shared helper ensures consistent behavior across both files.

## NN Critiques: Review of deepseek F10
target:: deepseek:F10
stance:: agree

Verified in `scripts/export-console.mjs:435, 1880-1882` and `scripts/console-views.mjs:65, 166-167`. `console-views.mjs` defines and strictly uses `compareCodeUnits` so that ordering and messages remain deterministic across host environments. Conversely, `export-console.mjs` sorts console candidates by `meta.generated` (line 435) and changesets by `path` (line 1881) using `localeCompare`. Because `localeCompare` collation is sensitive to system locale, platform defaults, and Node ICU configurations, sorting outcomes can differ across environments. Adopting `compareCodeUnits` across `export-console.mjs` ensures deterministic collation.

## NN Critiques: Review of deepseek F11
target:: deepseek:F11
stance:: agree

Verified in `scripts/export-console.mjs:526-550`. In `renderTree`, the `dirKey === '.'` branch (lines 526-536) and the `else` branch (lines 538-550) repeat identical loops for formatting and logging item status and target paths. The sole variation is whether `childIndent` is prefixed before each line. Initializing `childIndent = ''` when `dirKey === '.'` enables merging both paths into a single loop, removing duplicated display logic and guarding against formatting drift.

## NN Critiques: Review of deepseek F12
target:: deepseek:F12
stance:: agree

Verified in `scripts/console-views.mjs:134-151`. Lines 138-140 use a regular expression `/registerView\s*\(\s*\{[\s\S]*?\bid\s*:\s*['"]([a-z0-9-]+)['"]/g` against raw source text to discover supplementary view IDs. This text-based scan can match unintended occurrences inside comments, string literals, or multi-statement blocks. Furthermore, lines 142-150 construct extra view entries while re-running `createHash('sha256').update(code, 'utf8').digest('hex')` over the exact same `code` string already hashed on line 135. Hashing the source once and avoiding heuristic regex matching over arbitrary script source improves robustness.

## NN Critiques: Review of gpt-luna F1
target:: gpt-luna:F1
stance:: agree

Verified in `scripts/export-console.mjs:2218-2224`. In `scaffoldConsoleView`, `slug` is validated against `/^[a-z0-9]+(-[a-z0-9]+)*$/` and checked against reserved IDs, but `blueprint` from `--blueprint` is passed directly into `join(rootDir, ..., blueprint, 'assets')` without sanitation. If a caller provides path traversal tokens (e.g., `../../`) or an absolute path, `mkdir` (line 2234) and `writeFile` (line 2313) will scaffold directories and files outside the targeted blueprint directory. Validating that `blueprint` conforms to a strict identifier format and asserting that the resolved path remains within the intended workspace boundary is a necessary security measure.

## NN Critiques: Review of gpt-luna F2
target:: gpt-luna:F2
stance:: agree

Verified in `scripts/export-console.mjs:2209-2215, 2238-2310`. The `viewTitle` string is taken directly from the `--title` flag (or formatted from the slug) and interpolated into single-quoted string literals (`title: '${viewTitle}'`, `wrap.textContent = '${viewTitle} view content.'`) and block comments across all scaffold templates (`kpi`, `blank`, `table`). If `--title` contains unescaped single quotes (such as `Manager's Overview`) or crafted script markup, the generated script will contain syntax errors or executable code injection that later runs in the context of the inlined console. Emitting `JSON.stringify(viewTitle)` for code literals and stripping comment delimiters (`*/`) in comment blocks prevents injection and syntax breakage.

## NN Critiques: Review of gpt-luna F3
target:: gpt-luna:F3
stance:: agree

Verified in `scripts/console-views.mjs:500-526`. Matches `deepseek:F1`. `allowInlineScripts` attempts to append script hashes solely by regex-replacing an existing `script-src` directive inside the CSP `<meta>` content. If the host CSP relies on `default-src` fallback or specifies `script-src-elem`, the replacement does nothing, leaving inline scripts without hash authorization. Browsers will block the inlined scripts, preventing the console from executing. Appending a `script-src` directive containing the computed hashes when one is not already present resolves the failure.

## NN Critiques: Review of gpt-luna F4
target:: gpt-luna:F4
stance:: agree

Verified in `scripts/export-console.mjs:255-261`. In `findModelFiles`, the recursive traversal wraps `readdir(d, { withFileTypes: true })` in a bare `try ... catch { return }`. This silently suppresses unexpected filesystem errors such as `EACCES` (permission denied) or `EIO`, causing entire subdirectories of models to be quietly skipped without error or diagnostic output. As demonstrated by `listEntries` in `console-views.mjs:73`, only expected non-existence errors (`ENOENT`, `ENOTDIR`) should be treated as empty, while permissions and I/O failures must be rethrown so users are not misled by an incomplete export.

## NN Critiques: Review of gpt-luna F5
target:: gpt-luna:F5
stance:: agree

Verified in `scripts/export-console.mjs:2480-2524`. Matches `deepseek:F8`. `runExportConsole` mutates process-wide output channels (`console.log`, `console.error`, `process.stdout.write`, `process.stderr.write`) during asynchronous operations. When multiple exports execute concurrently in the same process, output streams are scrambled, captured data leaks across callers, and early cleanup in `finally` prematurely unhooks handlers for still-running exports. Threading an explicit output sink or logger parameter into `runMain` eliminates global mutation and provides safe concurrency.

# NN Findings

## NN Findings: N1 Delivery console immutability check in writeConsole ignores stagingDir
category:: change
impact:: medium
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:2089, scripts/export-console.mjs:1988
recommendation:: Add the !stagingDir guard to the second immutability check at line 2089, matching the check at line 1988, so deliveries staged to a staging directory succeed when the target delivery file already exists.
tags:: [delivery, staging, export-console]

In `scripts/export-console.mjs`, line 1988 implements a delivery immutability check prior to building the payload:
`if (isDelivery && finalAbsPath && existsSync(finalAbsPath) && !stagingDir)`.
The `!stagingDir` guard exists specifically so that when a delivery console has already been published at `finalAbsPath`, a new export can still be written to a staging directory (`absPath = stagingDirAbs ? join(stagingDirAbs, basename(relativePath)) : finalAbsPath`) for pre-release review.

However, after running HTML construction, asset inlining, and size budget verification, line 2089 performs a second immutability check before writing the file:
`if (isDelivery && finalAbsPath && existsSync(finalAbsPath))`
This second check completely omits the `&& !stagingDir` condition. Consequently, if `finalAbsPath` already exists, any export specifying `stagingDir` passes the pre-check at line 1988, does all the compilation work, and then aborts at line 2089 with `status: 'error'`, refusing to write to the staging directory. Adding `&& !stagingDir` to line 2089 fixes this defect.
