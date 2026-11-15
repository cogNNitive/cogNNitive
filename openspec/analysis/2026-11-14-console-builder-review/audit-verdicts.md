# Audit verdicts for the console builder review

Date: 2026-11-14. Phase 1 of `nn-dev-backlog` (audit, read-only) over decisions D1 to
D25 of [the consolidated plan](consolidated-plan-and-verdict.md). Code audited: `main`
`551d5a18`. Per-decision citations, scores and `done_when` sentences live in the backlog
items `console-builder-d<nn>-*` in `openspec/backlog_NN.md`; this file keeps what the
backlog does not carry.

## Method

- Two read-only subagents ran in parallel. One verified every decision against the code
  (no script was run except a one-off hash of the shell's inline scripts). The other
  inventoried the three registers (open changes, open GitHub issues, the backlog document)
  and looked for overlaps; its only GitHub calls were `gh issue list` and `gh label list`.
- Five claims were re-checked by hand before writing the backlog: the two guards at
  `scripts/export-console.mjs:1988` and `:2089` (D4), the `conntent-delivery` literal at
  `:1893-1894` (D3), the duplicated candidate lists at `:137` and `:1323` (D13), the 12
  `data-theme="dark"` selectors in `nn-ui.css` (D20), and the shell's script tags (D21).
- The reviewed files are identical between `716685b0` (analyzed by two reviewers) and
  `551d5a18` (analyzed by GPT-6 Luna), so every line number in the reports stands.

## Verdicts

Every decision is `current` except D24 and D25, whose rejection reasons were verified
instead. Lane is `light` for all (see "Lane" below).

| Decision | Verdict | value/effort/risk | Recorded as |
|---|---|---|---|
| D1 CSP hash injection | current | M/M/M | item `console-builder-d01-csp-hash` |
| D2 scaffolder input | current | M/S/L | item `console-builder-d02-scaffold-input` |
| D3 delivery guard slug | current (latent) | M/S/M | item `console-builder-d03-delivery-guard-scope` |
| D4 staging check | current | L/S/L | item `console-builder-d04-staging-immutability-check` |
| D5 stale fingerprint | current | M/M/M | item `console-builder-d05-stale-asset-fingerprint` |
| D6 model identity | current (by reading) | M/M/M | item `console-builder-d06-model-identity-path` |
| D7 swallowed read errors | current | M/S/M | item `console-builder-d07-scan-read-errors` |
| D8 output capture | current | L/M/M | item `console-builder-d08-output-capture` |
| D9 unknown flag | current | M/S/L | item `console-builder-d09-unknown-flag` |
| D10 preview bytes | current | M/S/L | item `console-builder-d10-preview-utf8` |
| D11 citation basename | current | M/S/L | item `console-builder-d11-citation-basename` |
| D12 return contract | current | L/S/L | item `console-builder-d12-writeconsole-contract` |
| D13 asset candidates | current | L/S/L | item `console-builder-d13-asset-candidates` |
| D14 scope key order | current | L/S/L | item `console-builder-d14-scope-key-order` |
| D15 spec-name parser | current | L/S/L | item `console-builder-d15-spec-name-parser` |
| D16 code-unit compare | current | L/S/L | item `console-builder-d16-code-unit-compare` |
| D17 renderTree branches | current | L/S/L | item `console-builder-d17-rendertree-branches` |
| D18 view-id discovery | current | L/S/L | item `console-builder-d18-view-id-discovery` |
| D19 changeset counts | current | L/S/L | item `console-builder-d19-changeset-counts` |
| D20 data-theme guard | current (stronger than stated) | L/S/L | item `console-builder-d20-data-theme-guard` |
| D21 shell CSP hashes | current (claim now verified) | L/S/L | item `console-builder-d21-shell-csp-hash-test` |
| D22 repeated renders | current repetition, impact unproven | L/M/M | Idea (measure first) |
| D23 rename retry | current | L/S/L | Idea (precedent exists) |
| D24 keep scanner | rejection holds | L/S/L | Idea (one missing test row) |
| D25 keep source dedup | rejection holds | L/S/L | no entry |

### Decisions that did not become items

- **D22:** the renders are at `scripts/export-console.mjs:2041` (always) and `:2053`, `:2060`
  (oversize path only), plus `:2105` and `:2137` (unchanged check). `prepared()` in
  `console-views.mjs:468` skips escaping and compiling, but `allowInlineScripts` still
  re-hashes the whole bundle each render and `budgetOf` (`:2034`) re-stringifies the model.
  The deferral reason holds.
- **D23:** `:814-824` has a single `rename`, then `rm` and rethrow. The repo already has the
  pattern: `persistAtomic` in `iNNfo/packages/nn-mcp/src/apply-change.ts:250-271` retries up
  to 5 times on `EPERM`, `EBUSY` and `EACCES` (issue #188, a demonstrated Windows case). The
  review's "no reproduction" is weakened. The copy-fallback rejection holds. The standalone
  asset cannot import the nn-mcp helper.
- **D24:** `console-views.mjs:233-237` states the goal of not depending on engine message
  wording; the scanner runs only after a compile failure (`:349`); the pinned tests are at
  `test/console-views-lib.test.mjs:338-373` (not `343-373`). No `}`-then-`/` row exists.
- **D25:** `console-views.mjs:453-458` dedups by `v.source`; `:218-224` `wrapperText` binds
  the registrar to the first view's id; `nn-runtime.js:3525-3529` throws on a duplicate id and
  `:3535-3541` rejects a mismatched declared id. The extra entries also enable
  `--view <extraId>` (`conntent-delivery` exists only this way), a consumer the review omitted.

## Corrections to the consolidated plan

1. **D1 and open question 3:** shells are not domain-supplied. They come from
   `$INNFO_CONSOLE_DIR`, the repo, the script's own folder or `~/.agents/console`
   (`export-console.mjs:91-97`). The risk is an installed shell diverging from the repo.
2. **D3:** "alone enables" is overstated. `stagingDir`, `scope.delivery` and a `deliveries/vN/`
   `outFile` also enable it, and the only real producer (`delivery.mjs:225-235`) passes the
   staging dir and an `outFile`, so a view rename would not leak there. A second literal sits
   at `iNNfo/packages/nn-core/src/console/output-path.ts:57`. `--view conntent-delivery` on a
   domain scope enters the delivery path (read, not run).
3. **D4:** not a security finding and not a "leak guard". The late abort has no side effects
   (`writeFileAtomic` has not run) and the only production caller pre-checks
   (`delivery.mjs:196`). Which side to change is a design choice.
4. **D6 ordering:** "D6 before D11" is unfounded, because D11 matches inventory and citation
   paths and never reads `modelSummaries`. "D6 before D5" is weak, because the asset
   fingerprint is console-level.
5. **D7:** the decision omitted `findModelFiles`, which is the actual reference of the
   gpt-luna finding, and the two sibling swallows at `:377` and `:411`.
6. **D8 and open question 2:** the premise "two MCP export calls" is false. The MCP calls
   `writeConsole({...options, log: () => {}})` (`console-regeneration.ts:103-107`);
   `runExportConsole` has no caller outside tests. A `log` collector also does not cover about
   14 `process.stderr.write` sites and about 40 `console.*` sites. Treat it as low priority.
7. **D10:** "every truncated non-ASCII preview" is overstated; the character shortfall is
   always present but mild, and U+FFFD appears only when the cut splits a sequence.
8. **D11:** the decision omitted the identical defect in the changes-evidence loop
   (`:1100-1106`).
9. **D13:** cause is the breaking rename commit `e68fb7d6`. Further remnants:
   `artifact_blueprint.html` (`:52`) and the `(nn|innfo)` prefix pattern (`:1296`).
10. **D16:** `compareCodeUnits` is not exported, and a third inline copy sits at `:781`.
11. **D20:** stronger than stated. The shared CSS inlined before the check always trips the
    guard, so the block is unreachable with shipped assets.
12. **D21:** the "unverified" claim is now verified. `artifact_shell.html` has four JSON
    islands and three external scripts and no executable inline script, so none of the four
    hand-written hashes (added by commit `a54a9656`) matches anything.
13. **D2:** reuse of the base-name rule needs an export of `SPEC_BASE_RE`
    (`console-views.mjs:33`), and `JSON.stringify` would break the pinned test at
    `test/console-view-scaffold.test.mjs:61` (`title: 'Resumen de Programas'`).
14. **Section 5 of the plan (lane):** read literally, `nn-dev-development` §2 makes none of
    D1, D2, D3 (scope-driven), D6 or D8 heavy. D3's variant with a new `delivery: true` field
    on registered views would be a public view-contract change (heavy). D1 is the one
    borderline security call.
15. **Line numbers:** every other citation in the plan matched the code (`:1988`, `:2089`,
    `:2006-2008`, `:1086-1092`, `:2387`, `:2431`, `:2041`, `:2053`, `:2060`, `:2105`), except
    that `collectWorkspaceFiles` has its `readdir` at `:935`.

### Answers to the plan's open questions

1. **Legacy `innfo-` asset names:** nothing in the code shows they are still required; D13
   proceeds without them.
2. **Concurrent `runExportConsole`:** not a demonstrated scenario (correction 6), so D8 stays
   low priority.
3. **Domain-supplied shells:** not a supported surface (correction 1); D1 still matters for
   installed shells that diverge from the repo, and D20 can simply delete the block.
4. **Second reviewer for D4 and D6:** both were verified against the code in this audit; D6 by
   reading only, with no reproduction run.

## Dependencies and sequencing

- D3 and D4 touch the same block (`:1893-1997`, `:2089`); D12 edits the same return sites, so
  land D4 and D3 before or with D12.
- D13 before D5. D16 needs `compareCodeUnits` exported; D2 needs `SPEC_BASE_RE` exported.
- D8 touches `runMain`, `renderTree`, `findModelFiles` and the stderr sites, so it conflicts
  with D9, D17 and D7. Land it last or alone.
- D18 is the safe form of D25's adjacent issue.
- The two scripts are assets of the `nn-console` release key
  (`scripts/release/release-keys.js`, per the audit; not re-checked), so edits to them are
  release-relevant.

## Register overlaps and inventory

At audit time: 13 Ideas, 24 Items and 21 Batches in `openspec/backlog_NN.md` (469 lines),
one open change (`console-catalog-picklist`, about conntent view picklists, touches none of
the scripts) and 12 open GitHub issues.

- **Only D7 overlaps:** the Item `cognitivize-archive-and-gc-decisions` (`backlog_NN.md:206-213`)
  cites `findModelFiles` at a stale line (`:216`, now `:242`). Its concern is GC and archive
  rules, so the overlap is partial and the Item is `unverifiable` and unscheduled; the two
  stay separate and D7's evidence cross-references it.
- **No overlap** in any register for D1 to D6, D8 to D20 and D22 to D25. No entry mentions the
  console CSP, `allowInlineScripts`, `--new-view`, `isDelivery`, `runExportConsole`,
  `stagingDir` or `--stale`.
- **Adjacent, not overlapping:** the Idea "citation table in the console payload" (about
  payload format, near D11); the shipped Item `console-payload-size` (PR #625, the degradation
  code of D22 and the unchanged-file logic near D4; its archived spec
  `openspec/changes/archive/2026-11-12-console-size-budget/specs/console-export/spec.md:19-45`
  says a degraded export is never "unchanged", so D4 and D22 must stay compatible); the
  archived change `2026-11-05-console-files-section`, which introduced `collectWorkspaceFiles`
  (D7, D10, D11).

## Conventions found

- Item ids are kebab-case slugs. Batch ids are `b<phase><letter>-<item-id>`; every existing
  Batch held exactly one Item before this review, whose batches group several. The highest
  existing `order` was 23 (`b9-packages-to-root`); this review uses 24 to 31.
- `ref::` held `issue-<n>` before this review.
- GitHub labels: no `source:*` label exists; `area:console` ("Console runtime/UI debt
  (matrices, review, runtime, CSP)") is the only label naming the console, and
  `status:needs-decision` exists. No issue was opened in this pass.

## Discrepancies between skills and repo

- `nn-dev-backlog` said PRs go to `dev`; `nn-dev-development` says they go to `main`, and no
  `dev` branch exists (only `origin/main`). Fixed in `nn-dev-backlog`.
- `nn-dev-backlog` cited `nn-dev-development` §2b and §1a, which do not exist (§2 and §1).
  Fixed.
- `nn-dev-backlog` §7 said id-mode validation does not work outside a domaiNN. It works with
  `id: backlog` and the repo root as `root`. Fixed.
- Not touched here: open issue #637 has no Item; several open Items lack `done_when`
  (`derived-artifacts-consolidation`, `query-language-unification`,
  `workspace-manifest-section-ownership`, `okf-export-projector`, `product-site-projection`,
  `cognitivize-archive-and-gc-decisions`, `contextual-docs-links`); the Item
  `console-shell-actions` is `shipped` while issue #490 is still open.
