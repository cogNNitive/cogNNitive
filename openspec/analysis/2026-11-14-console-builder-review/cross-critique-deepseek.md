---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - deepseek"
---

# NN Critiques

## NN Critiques: Review of gemini F1
target:: gemini:F1
stance:: partially agree

The basename fallback exists exactly where claimed (`scripts/export-console.mjs:1091`, `:1105`), so the collision is real: two `schema.json` files under different folders both inherit every citation aimed at either name. Two parts do not survive the read, though. The high impact is argued from speed, and the same loop already awaits `stat`, `hashFileStream` and a bounded file read for each entry (`:1027-1039`, `:1121-1137`), so the string comparisons are noise beside the I/O; the defect is a correctness bug with low effort, not a performance emergency. And the prescribed fix — index by exact relative path and drop basename matching — would silently zero the counts for citations recorded as a bare file name, which is precisely why the predicate also matches both suffix directions (`:1088-1090`). The safe version keeps the fallback but applies it only when the basename is unambiguous, or resolves by longest matching suffix.

## NN Critiques: Review of gemini F2
target:: gemini:F2
stance:: partially agree

The quadratic shape is exactly as described: for every model, a full reduce over `changesets` with a filter over every `cs.changes` (`scripts/export-console.mjs:1566-1578`). The cost is mis-sized, not invented. Fifty models against two thousand changes buys 100,000 lowercase-and-`indexOf` operations, which is milliseconds beside the payload stringification the same function performs at `:2034` and the 30-100 MB of templating below; `impact:: high` does not follow. More importantly, the recommended pre-aggregation is not equivalent as stated: the current predicate is set-like per change (`modelKeys.indexOf(modelPart) !== -1`, `:1575`), so a model whose title and file stem lower to the same string is counted once today and twice by a per-key sum. Aggregate into `Map<modelPart, count>` and then walk the model's keys through a `Set`.

## NN Critiques: Review of gemini F3
target:: gemini:F3
stance:: partially agree

The staleness check does ignore the stylesheet and the view scripts: `inspectDomainConsole` compares mtimes only for `bundlePath` and `shellPath` (`scripts/export-console.mjs:464-477`). The consequence attached to it is wrong, which matters because it points the fix at the wrong function. `inspectDomainConsole` has exactly one caller, the `--status` print (`:2387`); `--stale` never reaches it, selecting models through `inspectModelStatus` instead (`:2429-2432`), and that function looks at neither mtimes nor assets at all. So applying the recommendation as written repairs a display line and leaves the real skip in place. The asset fingerprint — CSS plus every discovered view script — has to reach `inspectModelStatus`, or be recorded in `meta` and compared in one place, before `--stale` stops discarding a view-only edit.

## NN Critiques: Review of gemini F4
target:: gemini:F4
stance:: partially agree

The repeated build is real: `buildHtml` runs at `:2041`, `:2053` and `:2060`, and a fourth time inside the unchanged check at `:2105`, each re-running `renderConsole` plus `allowInlineScripts`. The cost is overstated in two ways. The expensive escaping and compiling is not repeated, because `prepared()` short-circuits the already-prepared assets (`scripts/console-views.mjs:468`), so only templating, the regex sweep and the per-block sha256 remain; and "risks Node process heap exhaustion" is speculation — a handful of strings near the 100 MB threshold fit comfortably in the default heap. Measuring model slot payloads, as recommended, also introduces a parallel size model that can drift from the real HTML. Cheaper and exact: size the JSON payload before the first render and choose the degradation step from that.

## NN Critiques: Review of gemini F5
target:: gemini:F5
stance:: agree

Both candidate arrays repeat the identical literal — `['nn-console.bundle.js', 'nn-console.bundle.js']` at `scripts/export-console.mjs:137` and `['nn-ui.css', 'nn-ui.css']` at `:1322-1324` — so the first `.find` can never distinguish them and the duplication is provably dead. The incomplete-rename reading is corroborated by the code directly above it, where the shell lookup keeps a genuine legacy fallback (`LEGACY_SHELL_FILENAME`, `:73`, `:84-86`): the fallback survived for the shell and collapsed into a self-duplicate for the other two assets. I would only correct the weight. `impact:: medium` overstates a change with zero reachable behavioral difference; simplifying each array to a single name is behavior-preserving and can be done without deciding whether legacy bundle names should return.

## NN Critiques: Review of gemini F6
target:: gemini:F6
stance:: agree

The mechanism is exactly as reported: `allowInlineScripts` builds the hash set, then appends it only by rewriting an existing `script-src` (`scripts/console-views.mjs:524`), so a policy that reaches scripts through `default-src` is left as it was and the page ships with every inlined block blocked. It is latent rather than active, since the shipped shell already declares `script-src` (`iNNfo/specs/bluepriNNts/console/artifact_shell.html:10`), but nothing in the exporter validates that a domain-supplied shell does, and the failure is silent: exit 0, a written console, and no diagnostic. This is the same defect as gpt-luna F3, and the two should land as one change; the only thing to add beyond the finding is that hashes also have to reach `script-src-elem` when a policy spells the directive that way.

## NN Critiques: Review of gemini F7
target:: gemini:F7
stance:: partially agree

The scanner is real and intricate — 98 lines tracking template depth, comments and regex-versus-division state (`scripts/console-views.mjs:240-337`) — and one of the criticisms lands: the slash rule at `:297` treats any `}` as regex-preceding, so an object literal followed by division is mis-scanned. The remedy is where I part company. The function exists because the author explicitly refused to trust engine wording (`:236-237`), so replacing it with `vm.Script` message properties trades a fragile parser for a diagnostic that changes with the Node version; and the behavior already has tests pinning `import`, `export`, `import.meta`, top-level `await` and the look-alike strings that must not trip it (`test/console-views-lib.test.mjs:343-373`). A mis-scan here can only produce a less precise error message, on code that has already failed to compile. Keep the scanner, add the missing `}`-disambiguation case to the test table, and drop the replacement recommendation.

## NN Critiques: Review of gemini F8
target:: gemini:F8
stance:: disagree

Deduplicating by source is deliberate and load-bearing, not an accident, and the proposed fix would break the console. The wrapper hands the view its registrar as `nnConsole.viewRegistrar(id, source)` (`scripts/console-views.mjs:222`); inside the file, every `registerView({ id })` call goes through that function, and the registrar registers each declared id provided it equals the slug or starts with `slug-`, rejecting a duplicate id outright (`iNNfo/specs/bluepriNNts/console/nn-runtime.js:3526-3542`). One inline execution therefore registers every view the file declares, and a second inline execution turns each secondary view into a boot-time duplicate-id error. The extra entries in `views` are there for the cross-file duplicate check (`:208-213`) and for the audit header (`:462`), which is also why the header may legitimately keep the unfiltered list. Deduplicating by `v.id` would inline the same file twice. The one real defect nearby is different from the one reported: `readViews` accepts any slug for a declared id (`:141`) while the runtime demands the `slug-` prefix, and that mismatch is worth its own finding.

## NN Critiques: Review of gemini F9
target:: gemini:F9
stance:: agree

The guard is weaker than one attribute check: `if (!html.includes('data-theme='))` scans the whole document, not the root element, and the injection then depends on the exact literal `<html lang="en">` (`scripts/export-console.mjs:2006-2008`). So a shell whose CSS carries `[data-theme="dark"]` suppresses the injection even with the literal present, and a shell with a `class` attribute on `<html>` fails it the other way — both silently. It is currently dead code for the shipped shell, whose root element already declares `data-theme="light"` (`iNNfo/specs/bluepriNNts/console/artifact_shell.html:2`), which supports the low impact rating. The recommendation is right; I would state it as one anchored regex on the opening tag rather than a document-wide `includes` plus a replace.

## NN Critiques: Review of gemini F10
target:: gemini:F10
stance:: partially agree

The implementation is as described — temp file, then `rename` over the target (`scripts/export-console.mjs:814-824`) — and a Windows `EPERM`/`EBUSY` on replacement while a handle is open is a real failure mode. Two claims are overstated. "Frequently fails" is not supported: browsers open a local HTML file read-only and usually permit the replacement, so the realistic trigger set is an antivirus scan, an editor, or a watcher holding the file. And the failure is loud, not silent: the export throws, the temp file is removed, and the previous artifact survives (`:820-823`), so the cost is a retried command. A bounded retry is cheap and worth having; the copy fallback offered in the recommendation is the part to refuse, because it abandons the atomicity the function exists for and can leave a half-written console.

## NN Critiques: Review of gpt-luna F1
target:: gpt-luna:F1
stance:: agree

`blueprint` arrives from `--blueprint` and is joined straight into the target path (`scripts/export-console.mjs:2220-2222`), while the sibling path segment in the same codebase is already guarded: `viewRootCandidates` validates the blueprint base against `SPEC_BASE_RE` with the comment that "the base becomes a path segment" (`scripts/console-views.mjs:33`, `:44-47`). That asymmetry is the strongest argument for the finding, and it makes the fix a reuse rather than an invention. One detail is inaccurate: `path.join` does not reset on an absolute segment, so `..` is the only escape vector here, not an absolute path. The blast radius is also narrower than "high" suggests — one `console-view-<slug>.js` in a chosen folder — but agents are the callers of this CLI, which is enough to keep it urgent.

## NN Critiques: Review of gpt-luna F2
target:: gpt-luna:F2
stance:: agree

The title reaches five templates unescaped, inside single-quoted literals and inside a block comment (`scripts/export-console.mjs:2238`, `:2241`, `:2262`, `:2264`, `:2272`, `:2279`, `:2282`). It is worse than stated in one respect worth recording: the injected text is compiled by the export itself and then hashed into the page's CSP (`scripts/console-views.mjs:521`), so a successful breakout is authorized by the console's own policy instead of being blocked by it. The everyday cost does not need an attacker at all — a title like `O'Brien` produces a view that fails on the next export, after the file has been created. `JSON.stringify` for the literals and a comment-safe sanitization is the right fix, and it should be applied where the slug already proves the pattern exists (`:2199-2204`).

## NN Critiques: Review of gpt-luna F3
target:: gpt-luna:F3
stance:: agree

Same defect as gemini F6, better described: the effective directive may be `script-src-elem` or absent and inherited from `default-src`, and only `script-src` is rewritten (`scripts/console-views.mjs:524`). I would add one trap the recommendation does not mention. The regex matches `script-src` inside `script-src-elem` too, so in a policy that lists both, the hashes land on whichever appears first — appending to "the applicable directive" has to mean resolving the two names explicitly, not matching a prefix. Beyond that the finding stands as written, including the point that returning HTML that cannot run is worse than failing the export.

## NN Critiques: Review of gpt-luna F4
target:: gpt-luna:F4
stance:: agree

The walk swallows every `readdir` failure as "no entries" (`scripts/export-console.mjs:257-261`), so a permission or I/O error on one subtree yields a console that silently omits those models, at exit 0. The same file shows both the correct pattern and the same mistake twice more: `listEntries` distinguishes `ENOENT`/`ENOTDIR` from everything else and rethrows (`scripts/console-views.mjs:68-76`), while `collectWorkspaceFiles`' own walk swallows read errors identically (`scripts/export-console.mjs:934-948`). Fixing only `findModelFiles` leaves the two halves of one export disagreeing about what a partial scan means, so the change should cover the walk pair. The narrow-`ENOENT` restriction in the recommendation is also the right regression guard for directory races.

## NN Critiques: Review of gpt-luna F5
target:: gpt-luna:F5
stance:: agree

Globals are replaced (`scripts/export-console.mjs:2483-2504`) and restored in `finally` (`:2518-2524`) around an awaited export, so two concurrent callers cross-feed captures and whichever finishes first restores the handlers under the other. The finding is also self-evident from the file: the JSDoc two lines above says the entry point runs "without ever calling `process.exit` or mutating globals" (`:2474-2475`), so the contract is already broken without any concurrency. I prefer the logger option over serializing callers, because serialization hides a mutation that the documented API promises does not exist, and it would leave a second caller blocked for the length of a 100 MB export.

# NN Findings

## NN Findings: N1 Model identity in the console meta is a bare file name
category:: change
impact:: medium
effort:: medium
risk:: low
code_ref:: scripts/export-console.mjs:1582, scripts/export-console.mjs:1867, scripts/export-console.mjs:486, scripts/export-console.mjs:432, scripts/export-console.mjs:442
recommendation:: Record the workspace-relative path in each `modelSummaries` entry and match on it in `inspectModelStatus` and `inspectDomainConsole`.
tags:: [freshness, model-meta]

Every summary publishes `filePath: fileName` (`scripts/export-console.mjs:1582`), the basename, and `meta.models` is exactly those summaries (`:1867`). Both readers are written as if a relative path were available — `mm.filePath === fileName || mm.filePath === relPath` (`:432`, `:442`, `:486`) — but nothing ever writes one. Since `findModelFiles` walks the tree recursively (`:242-291`), two models in different folders may share a filename, and then `embedded.find(...)` at `:486` returns the first entry for both of them: one model is compared against the other's `sha256`, is reported `stale` permanently, and is re-exported by `--stale` on every run (`:2429-2432`). Nothing is corrupted; the freshness report simply cannot be right for both models.

## NN Findings: N2 The shipped shell carries CSP hashes that no step generates
category:: improvement
impact:: low
effort:: low
risk:: low
code_ref:: iNNfo/specs/bluepriNNts/console/artifact_shell.html:10, iNNfo/specs/bluepriNNts/console/artifact_shell.html:409, scripts/console-views.mjs:499, scripts/console-views.mjs:517, test/fixtures/testlab/domaiNN_console.html:13
recommendation:: Drop the four hand-written `'sha256-...'` tokens from the shell and let the export own the directive, or add a test asserting every hash in the shell matches an inline script in it.
tags:: [csp, shell]

The shell declares four `'sha256-...'` sources in `script-src` (`iNNfo/specs/bluepriNNts/console/artifact_shell.html:10`), but its only inline content is four `type="application/json"` data islands (`:409-431`), which `allowInlineScripts` deliberately excludes from hashing (`EXECUTABLE_SCRIPT_TYPES`, `scripts/console-views.mjs:499`, `:517-518`). Every export appends the hashes it computes and leaves the baked four untouched — both sets appear side by side in the committed fixture's policy — so the shipped shell is hand-maintained policy state in a file whose hashes are supposed to be generated, and nothing verifies that any of the four still corresponds to content that exists.

## NN Findings: N3 A CSP meta the regex does not recognize disables hashing silently
category:: change
impact:: high
effort:: low
risk:: low
code_ref:: scripts/console-views.mjs:500, scripts/console-views.mjs:509, scripts/console-views.mjs:510, scripts/console-views.mjs:470
recommendation:: Parse the policy meta tolerantly across attribute order and quote style, and fail the export when a policy is present but no directive was rewritten.
tags:: [csp, fail-loud]

`CSP_META` requires `<meta`, then `http-equiv="Content-Security-Policy"`, then `content="`, in that order and with double quotes (`scripts/console-views.mjs:500`). Any other spelling of the same tag — `content` first, single quotes, an extra attribute between them — makes `exec` return null and the function returns the page unchanged (`:509-510`), with no warning. This is the same end state as gemini F6 and gpt-luna F3 — an inlined bundle that the browser refuses to run — reached by a different trigger, and it is the one place in the inlining path that degrades silently while every other anchor fails loudly through `assertShell` (`:470-483`). Detecting "a CSP exists but nothing was added" and throwing covers both this and the missing-directive case in one guard.
