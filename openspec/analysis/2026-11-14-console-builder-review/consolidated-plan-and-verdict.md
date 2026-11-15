---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Consolidated plan and verdict"
---

# Consolidated plan and verdict

Target: `scripts/console-views.mjs` and `scripts/export-console.mjs` (about 3,200 lines).
Inputs: three independent analyses (gemini 10 findings, gpt-luna 5, deepseek 12) and three cross critiques (every finding of the other two reports was critiqued: 17 + 22 + 15 critiques, plus 4 new findings).

## 1. Verdict

The code is in good shape structurally: the deliberate parts (code-unit ordering, fail-loud shell assertions, a pinned scanner test table, a lossless writer contract) are sound, and no reviewer found a correctness problem in the core render path. The real weaknesses are concentrated at the edges: the CSP hash injection can silently produce a console that cannot run, the view scaffolder interpolates unescaped input into generated code, the delivery leak guard depends on a hard-coded view slug, and several scan and capture paths fail silently instead of loudly. Most performance findings were over-sized by their authors; nothing here needs a rewrite, but about four items deserve to be fixed before the next release.

Where critiques disagreed, the orchestrator spot-checked the code (section 6) and the result is reflected in the decisions.

## 2. Vote table

Reading guide: the author's own cell is `author` (counted as agree). A reviewer's cell is the stance recorded in their critique. Findings `N1`-`N3` were raised in phase 2, so the other reviewers never saw them (`not reviewed`).

| Finding | Topic | gemini | gpt-luna | deepseek |
|---|---|---|---|---|
| gemini:F1 | Basename collision, quadratic citation linking | author | partially agree | partially agree |
| gemini:F2 | Pre-aggregate changeset counts | author | agree | partially agree |
| gemini:F3 | Staleness ignores CSS and view scripts | author | agree | partially agree |
| gemini:F4 | Repeated HTML build across degradation passes | author | partially agree | partially agree |
| gemini:F5 | Duplicated asset candidate names | author | partially agree | agree |
| gemini:F6 | CSP without `script-src` | author | agree | agree |
| gemini:F7 | Replace lexical scanner | author | disagree | partially agree |
| gemini:F8 | Secondary views dropped by source dedup | author | agree | disagree |
| gemini:F9 | `data-theme` injection | author | disagree | agree |
| gemini:F10 | Windows rename retry | author | disagree | partially agree |
| gpt-luna:F1 | Blueprint name path traversal in scaffold | agree | author | agree |
| gpt-luna:F2 | Unescaped title in generated JS | agree | author | agree |
| gpt-luna:F3 | Hashes added to effective CSP directive | agree | author | agree |
| gpt-luna:F4 | Silent `readdir` errors | agree | author | agree |
| gpt-luna:F5 | `runExportConsole` global swap | agree | author | agree |
| deepseek:F1 | CSP without `script-src` drops hashes | agree | agree | author |
| deepseek:F2 | Delivery strip gated by view slug | agree | agree | author |
| deepseek:F3 | Parser: no unknown-flag branch, unguarded `--filter` | agree | agree | author |
| deepseek:F4 | `writeConsole` return contract drift | agree | agree | author |
| deepseek:F5 | Asset candidate lists repeat one name | agree | partially agree | author |
| deepseek:F6 | Scope key order dependence | agree | agree | author |
| deepseek:F7 | Preview bytes vs characters | agree | agree | author |
| deepseek:F8 | `runExportConsole` swaps process globals | agree | agree | author |
| deepseek:F9 | Two spec-name parsers | agree | partially agree | author |
| deepseek:F10 | `localeCompare` vs code-unit order | agree | agree | author |
| deepseek:F11 | `renderTree` duplicated branches | agree | agree | author |
| deepseek:F12 | View ids from raw source text | agree | partially agree | author |
| gemini:N1 | Delivery immutability check ignores `stagingDir` | author | not reviewed | not reviewed |
| deepseek:N1 | Model identity in meta is a bare file name | not reviewed | not reviewed | author |
| deepseek:N2 | Shipped shell carries ungenerated CSP hashes | not reviewed | not reviewed | author |
| deepseek:N3 | Unrecognized CSP meta disables hashing silently | not reviewed | not reviewed | author |

Overlaps merged into one decision: CSP (`gemini:F6`, `gpt-luna:F3`, `deepseek:F1`, `deepseek:N3`), process globals (`gpt-luna:F5`, `deepseek:F8`), asset candidates (`gemini:F5`, `deepseek:F5`).

# NN Decisions

## NN Decisions: D1 Make CSP hash injection robust and fail loud
covers:: [gemini:F6, gpt-luna:F3, deepseek:F1, deepseek:N3]
decision:: adopt with changes
consensus:: unanimous
priority:: P1

Four findings describe one defect: `allowInlineScripts` only rewrites an existing `script-src` and returns the page unchanged otherwise, so the inlined bundle is blocked with no diagnostic. Adopt one change: resolve `script-src` and `script-src-elem` explicitly (the current regex also matches the `script-src` prefix of `script-src-elem`, per the deepseek critique of `gpt-luna:F3`), create `script-src` when neither exists, parse the CSP meta tolerantly (attribute order, quote style, per `deepseek:N3`), and throw when a policy is present but nothing was rewritten. It is latent for the shipped shell (which declares `script-src`), but domain-supplied shells are not validated.

## NN Decisions: D2 Harden the view scaffolder against unsafe input
covers:: [gpt-luna:F1, gpt-luna:F2]
decision:: adopt
consensus:: unanimous
priority:: P1

Validate `--blueprint` with the same base-name rule `viewRootCandidates` already applies (reuse, do not reinvent) and assert the resolved directory stays under the blueprint root. Emit `viewTitle` through `JSON.stringify` in every template literal and sanitize it for comments. Correction from the deepseek critique: `path.join` does not reset on an absolute segment, so `..` is the only escape vector; the blast radius is one generated file. A title such as `O'Brien` already breaks generated code without any attacker, and a breakout would be authorized by the console's own CSP hash.

## NN Decisions: D3 Decouple the delivery leak guard from a view slug
covers:: [deepseek:F2]
decision:: adopt
consensus:: unanimous
priority:: P1

`isDelivery` includes the literal `conntent-delivery`, and it alone enables the element/field/viewData strip. Renaming that view silently ships internal `cost`, `budget`, `ledger` and `prompt` fields. Drive the contract from scope (`delivery`, `stagingDir`, `outFile`) or an explicit `delivery: true` declaration on the registered view.

## NN Decisions: D4 Honor stagingDir in the second immutability check
covers:: [gemini:N1]
decision:: adopt
consensus:: split
priority:: P1

Single-reviewer finding that the orchestrator verified: the pre-check at `scripts/export-console.mjs:1988` has `&& !stagingDir`, the second check at `:2089` does not, so a staged delivery export does all the work and then aborts with `status: 'error'` when the final file exists. `split` here means not independently reviewed, not that anyone disagreed. One-token fix; add a regression test.

## NN Decisions: D5 Put CSS and view scripts into the freshness fingerprint
covers:: [gemini:F3]
decision:: adopt with changes
consensus:: majority
priority:: P2

The omission is real, but the deepseek critique (confirmed by the orchestrator) shows the finding targets the wrong function: `inspectDomainConsole` is called only by the `--status` print (`:2387`), while `--stale` selects through `inspectModelStatus` (`:2431`), which looks at neither mtimes nor assets. Record an asset fingerprint (CSS plus every discovered view script) in `meta` and compare it where `--stale` decides, so a view-only edit stops being skipped.

## NN Decisions: D6 Record the workspace-relative path as model identity
covers:: [deepseek:N1]
decision:: adopt
consensus:: split
priority:: P2

`modelSummaries` publish `filePath: fileName` (the basename), while readers compare against both basename and relative path. Two models with the same filename in different folders are compared against each other's hash and report `stale` permanently, so `--stale` re-exports them on every run. Write the relative path and match on it. Single-reviewer finding, not independently reviewed. Land it before D5 and D11, which depend on a correct model identity.

## NN Decisions: D7 Stop swallowing directory read errors
covers:: [gpt-luna:F4]
decision:: adopt with changes
consensus:: unanimous
priority:: P2

Treat only `ENOENT`/`ENOTDIR` as empty and rethrow the rest with the directory path, exactly like `listEntries` in `console-views.mjs`. Per the deepseek critique, apply it to the walk in `collectWorkspaceFiles` (`:934-948`) as well, so the two halves of one export agree on what a partial scan means.

## NN Decisions: D8 Remove process-global output capture from runExportConsole
covers:: [gpt-luna:F5, deepseek:F8]
decision:: adopt with changes
consensus:: unanimous
priority:: P2

Pass a `log`/`warn` collector into `runMain` (`writeConsole` already accepts `log`) rather than replacing `console.*` and `process.std*.write`. Prefer this over serializing callers (deepseek critique): the JSDoc already promises the function does not mutate globals, and serialization would hide the contradiction while blocking a second caller for a whole large export.

## NN Decisions: D9 Give the argument parser an unknown-flag branch
covers:: [deepseek:F3]
decision:: adopt
consensus:: unanimous
priority:: P2

Add a `startsWith('--')` fall-through that prints usage and exits 2, and give `--filter` the same value guard its neighbours use. Today `--no-opne` silently becomes a model filter and `--filter --no-open` swallows the next flag.

## NN Decisions: D10 Fix the byte/character mix in preview reads
covers:: [deepseek:F7]
decision:: adopt
consensus:: unanimous
priority:: P2

Read bytes, decode, then cap in characters and drop a trailing replacement glyph. It affects every truncated non-ASCII preview, which is the normal case for Spanish content in this project.

## NN Decisions: D11 Resolve citation basenames only when unambiguous
covers:: [gemini:F1]
decision:: adopt with changes
consensus:: majority
priority:: P2

Both critics partially agree and for the same reason: the collision is a correctness bug, not a performance emergency (the loop already awaits `stat`, hashing and bounded reads per file), and dropping the basename fallback outright would zero counts for citations recorded as bare file names. Prefer exact normalized path, then longest matching suffix, and fall back to the basename only when it is unambiguous. Pre-indexing into a `Map` is optional.

## NN Decisions: D12 Align the writeConsole return contract with its JSDoc
covers:: [deepseek:F4]
decision:: adopt
consensus:: unanimous
priority:: P3

Return `breakdown` and `summary` on success and document the `status: 'error'` shape (or trim the JSDoc). Prefer a single result shape built in one place so the three returns cannot drift again.

## NN Decisions: D13 Collapse duplicated asset candidate lists
covers:: [gemini:F5, deepseek:F5]
decision:: adopt with changes
consensus:: majority
priority:: P3

`['nn-console.bundle.js', 'nn-console.bundle.js']` and `['nn-ui.css', 'nn-ui.css']` are provably one-element lists. Collapse them to single paths. Do not restore the legacy `innfo-` names: nothing shows they are still required, and the maintainer prefers deleting aliases and fallbacks. The finding's `impact:: medium` is overstated; there is zero reachable behavior change.

## NN Decisions: D14 Canonicalize scope key ordering
covers:: [deepseek:F6]
decision:: adopt
consensus:: unanimous
priority:: P3

Sort `selected` once before `scopeKeyOf` so the prefix and the hash come from the same order. The CLI hides it because `loadModels` sorts; programmatic callers do not.

## NN Decisions: D15 Share one spec-name parser
covers:: [deepseek:F9]
decision:: adopt with changes
consensus:: majority
priority:: P3

Unify the version-suffix regex and its case policy in one helper. Keep each call site's naming and validation rules intact (gpt-luna critique); the proposed `parseSpecName(...).base.trim().toLowerCase()` delegation needs a test per caller.

## NN Decisions: D16 Use code-unit comparison everywhere
covers:: [deepseek:F10]
decision:: adopt
consensus:: unanimous
priority:: P3

Share `compareCodeUnits` from `console-views.mjs` for the two `localeCompare` sorts that decide which console is "newest" and changeset order.

## NN Decisions: D17 Merge the duplicated renderTree branches
covers:: [deepseek:F11]
decision:: adopt
consensus:: unanimous
priority:: P3

Collapse the `dirKey === '.'` and `else` loops by computing `childIndent`. Pure maintainability; do it next to any other edit in `renderTree`.

## NN Decisions: D18 Tighten view-id discovery
covers:: [deepseek:F12]
decision:: adopt with changes
consensus:: majority
priority:: P3

The regex scans raw text, so a commented-out or quoted `registerView({ id: 'ghost' })` yields a view, and the lazy match can reach a later block's `id`. Constrain extra ids to the slug or `slug-` prefix (the runtime registrar rejects anything else, per the deepseek critique of `gemini:F8`), and hash the code once. The double hash is a minor point, not a defect.

## NN Decisions: D19 Pre-aggregate changeset counts, preserving set semantics
covers:: [gemini:F2]
decision:: adopt with changes
consensus:: majority
priority:: P3

The quadratic shape is real, but the cost is milliseconds beside payload stringification, so `impact:: high` does not follow. The naive per-key sum is not equivalent: the current predicate is set-like (`modelKeys.indexOf(modelPart) !== -1`), so a model whose title and stem lower to the same string is counted once today. Aggregate by `modelPart` into a Map, then walk a model's keys through a `Set`.

## NN Decisions: D20 Anchor the data-theme check to the root element
covers:: [gemini:F9]
decision:: adopt with changes
consensus:: majority
priority:: P3

Dead code for the shipped shell (the root already declares `data-theme="light"`), which supports `impact:: low`. But the guard is weaker than claimed: `html.includes('data-theme=')` scans the whole document, so a shell whose CSS carries `[data-theme="dark"]` suppresses the injection even when the literal is present (orchestrator-verified at `:2006-2008`). Either use one anchored regex on the opening tag, or delete the block if only the shipped shell is supported.

## NN Decisions: D21 Verify the hand-written CSP hashes in the shipped shell
covers:: [deepseek:N2]
decision:: defer
consensus:: split
priority:: P3

Plausible and cheap (a test asserting every hash in the shell matches an inline script in it), but the orchestrator did not verify it and no other reviewer saw it. Add the test first; only then decide whether to delete the four tokens.

## NN Decisions: D22 Avoid repeated full renders in size degradation
covers:: [gemini:F4]
decision:: defer
consensus:: majority
priority:: P3

The repeated `buildHtml` is real (`:2041`, `:2053`, `:2060`, plus `:2105`), but the heap-exhaustion claim is speculation, `prepared()` already short-circuits the expensive asset work, and a parallel size model can drift from the real HTML. Revisit only with a measurement; if done, size the JSON payload once before the first render (deepseek critique) rather than estimating slots.

## NN Decisions: D23 Bounded retry on Windows rename failure
covers:: [gemini:F10]
decision:: defer
consensus:: majority
priority:: P3

No reproduction was given and the failure is loud (temp removed, prior artifact survives). A bounded retry on `EPERM`/`EBUSY` is cheap, so add it only against a demonstrated failure. The copy fallback in the recommendation is refused: it abandons the atomicity the function exists for and can leave a half-written console.

## NN Decisions: D24 Keep the lexical scanner in findModuleSyntax
covers:: [gemini:F7]
decision:: reject
consensus:: majority
priority:: P3

The scanner exists because the author refused to depend on engine message wording, its behavior is pinned by `test/console-views-lib.test.mjs:343-373`, and a mis-scan can only yield a less precise message on code that already failed to compile. Replacing it trades a fragile parser for a version-dependent diagnostic. One piece survives: the `}`-then-`/` disambiguation case (deepseek critique) is a missing row in the test table, worth adding with any nearby edit.

## NN Decisions: D25 Keep source-level deduplication in prepareAssets
covers:: [gemini:F8]
decision:: reject
consensus:: split
priority:: P3

Rejected on the orchestrator's spot-check, not by vote (gpt-luna agreed, deepseek disagreed). `wrapperText` binds the registrar to the file slug and runs the whole file once; the runtime's `register` throws on a duplicate id (`nn-runtime.js:3522-3530`). Deduplicating by `v.id` would inline the same file twice and turn every secondary view into a boot-time duplicate-id error. The extra `views` entries serve the cross-file duplicate check and the audit header. The adjacent real issue is carried by D18.

## 4. Findings rejected or deferred

| Finding | Outcome | Reason |
|---|---|---|
| gemini:F4 | defer (D22) | Real repetition, speculative memory claim; needs a measurement first. |
| gemini:F7 | reject (D24) | Deliberate, tested design; replacement adds version-dependent behavior without a demonstrated defect. |
| gemini:F8 | reject (D25) | Would break the console: the runtime rejects duplicate ids, and one inline execution already registers every declared view. |
| gemini:F10 | defer (D23) | No reproduction; adopt a bounded retry only against a real failure, never the copy fallback. |
| deepseek:N2 | defer (D21) | Unverified single-reviewer claim; test first. |
| gemini:F2, gemini:F9 | adopted but downsized | Performance impact and theme-injection impact were overstated (D19, D20). |

## 5. Suggested execution order

1. **Security and leak guards (P1):** D1 (CSP), D2 (scaffolder), D3 (delivery guard), D4 (staging check). D4 is a one-token fix and can ride with D3.
2. **Silent-failure cluster (P2):** D7 (scan errors), D9 (parser), D10 (preview UTF-8), D8 (output capture). Independent of each other; D8 touches the public entry point, so land it alone.
3. **Freshness and identity (P2):** D6, then D5, then D11, because D5's fingerprint and D11's matching both lean on the corrected model identity from D6.
4. **Hygiene sweep (P3):** D12, D13, D14, D16, D17, D15, D18, D19, D20 as one small mechanical PR where touched files overlap; keep D18 and D20 separate if tests grow.
5. **Deferred:** D21 (test first), D22, D23 only on evidence.

D1 changes the CSP of exported consoles and D2 changes the generated view contract; under this repository's lane rules they may count as heavy (security / public contract). The orchestrator did not run the lane check.

## 6. Open questions and process gaps

**Spot-checks done by the orchestrator (only where reviewers disagreed):**
- `gemini:F8`: runtime registrar and wrapper confirmed (`nn-runtime.js:3522-3545`, `console-views.mjs:218-224`); `prepareAssets` dedup confirmed at `:453-458`. Result: deepseek's reading holds.
- `gemini:F3`: callers of `inspectDomainConsole` / `inspectModelStatus` confirmed (`:2387`, `:2431`). Result: deepseek's reading holds.
- `gemini:N1`: guard asymmetry confirmed at `export-console.mjs:1988` vs `:2089`.
- `gemini:F1`: basename match confirmed at `:1086-1092`; `gpt-luna:F1`: blueprint joined unvalidated at `:2220-2222`; `gemini:F9`: document-wide `includes` confirmed at `:2006-2008`.

**Not spot-checked** (all reviewers agreed, or single reviewer): `deepseek:N2`, `deepseek:N3`, the `gpt-luna:F2` template sites, the `deepseek:F7` byte arithmetic. Line numbers cited by reviewers were not re-verified beyond the ones above.

**Open questions for the maintainer:**
1. Are legacy `innfo-` asset names still wanted anywhere (D13)? The recommendation assumes no.
2. Is concurrent in-process use of `runExportConsole` (for example two MCP export calls) a supported scenario (D8)? It decides whether D8 is P2 or P1.
3. Are domain-supplied console shells a supported surface (D1, D20)? If only the shipped shell is supported, D1 downgrades to a validation check and D20 can simply delete the block.
4. Should D4 and D6 (single-reviewer findings) get a second reviewer before implementation?

**Process gaps and deviations:**
- No delegate failed and no retry was needed in either phase.
- `gpt-luna` phase 1 created its own session worktree (`../cogNNitive-independent-analysis-gpt-luna`, branch `session/independent-analysis-gpt-luna`) and wrote its report there instead of in the review folder. The worktree is clean and was left in place (not removed). The orchestrator copied the report into `.analysis/domain-console/` and stripped a UTF-8 BOM (the files differ by those three bytes only).
- The `gpt-luna` phase 2 prompt carried one extra sentence telling it to work in the primary checkout and not create a worktree; the other two used the brief's prompt verbatim.
- The gemini phase 1 delegate paused on a workspace-trust prompt; the user answered "Trust Workspace".
- This file was staged in the session scratchpad and copied into the primary checkout with Bash, because the primary-tree `Write` hook blocked the Write tool; the user explicitly authorized that single write.
- Integrity checks after both phases: primary checkout `git status --porcelain` empty (equal to BASELINE), worktree count unchanged between phases, all six delegate files present with level 3 frontmatter and no BOM, every critique file covers every finding of the other two reports.
