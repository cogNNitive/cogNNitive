---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - gpt-luna"
---

# NN Critiques

## NN Critiques: gemini:F1 Basename collision and quadratic citation linking
target:: gemini:F1
stance:: partially agree

The nested candidate/citation/evidence scans are present, so pre-indexing can improve large-workspace performance. However, basename fallback is explicitly used to match payload citations to inventory paths, and removing it outright may break references that intentionally contain only a filename. The collision concern is real only where multiple files share a basename and the citation is ambiguous; preserve documented basename-only references while preferring exact normalized paths.

## NN Critiques: gemini:F2 Repeated changeset counting
target:: gemini:F2
stance:: agree

`writeConsole` recomputes the count from all changesets and their changes inside the model loop. Accumulating counts by normalized model target once is equivalent and avoids repeated traversal; retain the current target-matching semantics when building the map.

## NN Critiques: gemini:F3 Console asset freshness omits CSS and views
target:: gemini:F3
stance:: agree

`inspectDomainConsole` compares the output timestamp with the shell and bundle, then validates only embedded model metadata. CSS and discovered view scripts are incorporated into output but are not represented in that freshness check, so edits to either can leave `--stale` reporting fresh. Those effective inputs should participate in invalidation.

## NN Critiques: gemini:F4 Repeated HTML degradation rendering
target:: gemini:F4
stance:: partially agree

The degradation path does rebuild the document and recompute inline-script hashes across passes, making repeated work plausible for oversized exports. But the report's heap-exhaustion conclusion and assumption that model slots dominate are not established by the control flow alone; estimate or measure the relevant serialized payloads and benchmark before adding a separate sizing path.

## NN Critiques: gemini:F5 Duplicate asset candidate names
target:: gemini:F5
stance:: partially agree

The candidate arrays do contain each current filename twice, which is redundant. The neighboring legacy-name support suggests a fallback may have been intended, but does not prove old asset directories remain supported. Collapse each duplicate unless compatibility requirements confirm the `innfo-` names should be restored.

## NN Critiques: gemini:F6 CSP without script-src
target:: gemini:F6
stance:: agree

The policy replacement only targets an existing `script-src`; if the shell supplies only `default-src`, computed hashes are not added. Since the inlined scripts then remain subject to the restrictive default, append a `script-src` containing the hashes or fail with a clear diagnostic.

## NN Critiques: gemini:F7 Bespoke lexical scanner
target:: gemini:F7
stance:: disagree

The scanner is deliberately used to produce actionable diagnostics when `vm.Script` rejects module syntax, rather than to parse or execute the source. The examples assert possible heuristic shortcomings but do not demonstrate a misclassification in the supported view syntax. Replacing it with V8 diagnostics or a parser adds dependency/behavior changes without a concrete defect.

## NN Critiques: gemini:F8 Secondary views excluded by source deduplication
target:: gemini:F8
stance:: agree

`readViews` can produce multiple IDs from one source, while `prepareAssets` marks a source as seen and keeps only its first entry. The resulting header can therefore advertise IDs that are not prepared as distinct view scripts. Deduplicate by ID or explicitly reject multiple declarations per file.

## NN Critiques: gemini:F9 Fragile data-theme injection
target:: gemini:F9
stance:: disagree

The function operates on the repository's controlled shell template, whose root tag is exactly the expected `<html lang="en">`; this is not a general-purpose HTML parser contract. If shell variants are intended, test and support those variants explicitly, but the proposed broad regex is not justified as a current bug.

## NN Critiques: gemini:F10 Windows rename locking
target:: gemini:F10
stance:: disagree

The report describes a possible platform-specific failure but provides no reproduction, and a browser viewing an HTML file does not generally lock it against replacement. A bounded retry may mask persistent errors or complicate atomic-write guarantees. Add it only against a demonstrated failure and tested Windows semantics.

## NN Critiques: deepseek:F1 CSP without script-src
target:: deepseek:F1
stance:: agree

`allowInlineScripts` only substitutes into a pre-existing `script-src` directive. With only `default-src`, the hashes are discarded and restrictive policy can block the generated bundle and views. This is the same underlying defect as gemini:F6.

## NN Critiques: deepseek:F2 Delivery sanitization keyed to a hard-coded view ID
target:: deepseek:F2
stance:: agree

The delivery predicate includes the literal `conntent-delivery` view name, and the sanitizing strip is conditional on that predicate. Renaming the view or using a different view for an otherwise delivery-scoped export can bypass the strip. The delivery contract should be explicit in scope or view metadata rather than inferred from a slug.

## NN Critiques: deepseek:F3 Unknown flags and unguarded value flag
target:: deepseek:F3
stance:: agree

The parser's catch-all assigns an unrecognized option-like token as a positional model, and `--filter` consumes its next token without the neighboring value flags' option guard. This makes typos and missing filter values confusing rather than producing a usage error.

## NN Critiques: deepseek:F4 writeConsole return contract mismatch
target:: deepseek:F4
stance:: agree

The JSDoc advertises `breakdown` and `summary`, but the successful return omits them; the immutable-delivery path additionally returns an `error` status not described by the union. Align the documentation and actual return shapes so programmatic callers can rely on the declared contract.

## NN Critiques: deepseek:F5 Duplicate asset candidates and missing legacy entry
target:: deepseek:F5
stance:: partially agree

The duplicate entries are objectively redundant, and other code recognizes legacy-prefixed asset names. That recognition alone does not establish that asset resolution must continue supporting those names. Remove duplicates; restore legacy candidates only if compatibility is an intended behavior.

## NN Critiques: deepseek:F6 Order-dependent multi-model scope label
target:: deepseek:F6
stance:: agree

`scopeKeyOf` derives the hash from sorted paths but takes the display prefix from the first selected model. `writeConsole` preserves caller order, so equivalent model sets may get distinct artifact names. Canonicalize the selection order before deriving both parts.

## NN Critiques: deepseek:F7 Preview buffer byte/character mismatch
target:: deepseek:F7
stance:: agree

The preview reads a bounded number of bytes and decodes that buffer as UTF-8, while the stated preview limit is a character count. A multibyte sequence cut at the final byte can decode with a replacement glyph, and bytes and characters are not interchangeable. Decode safely and apply the cap in the documented unit.

## NN Critiques: deepseek:F8 runExportConsole replaces process globals
target:: deepseek:F8
stance:: agree

`runExportConsole` temporarily replaces console methods and process stream writers. Concurrent invocations or unrelated output during that interval can be captured by the wrong call. Injecting output collectors through the execution path avoids process-wide mutation; at minimum, document and enforce serialization if concurrency is unsupported.

## NN Critiques: deepseek:F9 Divergent spec-name parsing
target:: deepseek:F9
stance:: partially agree

The two parsers differ in case handling: `parseSpecName` uses a case-sensitive suffix while `coreBlueprintOf` strips it case-insensitively. Unifying the policy is sensible, but the proposed exact delegation and lowercase behavior need to preserve each call site's intended naming and validation rules.

## NN Critiques: deepseek:F10 Locale-dependent sorting
target:: deepseek:F10
stance:: agree

The module explicitly defines code-unit comparison for deterministic ordering, while `export-console.mjs` uses `localeCompare` for console timestamps and changeset paths. Locale/ICU collation can vary; use the shared deterministic comparator or an equivalent code-unit comparison.

## NN Critiques: deepseek:F11 Duplicate renderTree branches
target:: deepseek:F11
stance:: agree

The root-directory and non-root branches contain the same item-rendering loop, differing only in indentation. Consolidating them around a computed indent removes duplicated behavior without changing output.

## NN Critiques: deepseek:F12 Synthetic view IDs from raw source text
target:: deepseek:F12
stance:: partially agree

The regex scans source text rather than parsed registrations, so comments or strings can produce false IDs and a match may span toward a later declaration. The repeated hash is a minor efficiency point, not a defect by itself. Either constrain the supported declaration format and test it, or use a robust registration mechanism rather than scanning arbitrary text.
