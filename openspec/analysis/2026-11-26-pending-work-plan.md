# Pending work plan — independent of the blueprints-distribution decision

Written 2026-11-26, after landing #889, #887, #884, #886 and the `chore/regen`
write-back (#888) on `main`. Source material: the audits of the seven open T3 threads
of that date, plus `openspec/analysis/2026-11-25-conntent-boundaries.md`.

**Scope.** Only work that does **not** depend on the outcome of the
"Grill: blueprints as independent distributable units" session. Everything that
does — manifest membership, release-key granularity, content-sha pins, installer
layout, mirror freshness — is parked as its own batch in `openspec/backlog_NN.md`
(`b6-on-hold-blueprints`) and is **not** planned here.

Each item names where it lives, what is wrong today, the fix, and how to accept it.
Sizes are the usual S/M/L; "lane" is the repository lane (light = work, PR, CI).

| # | Item | Lane | Size | Depends on |
|---|---|---|---|---|
| 1 | Pricing overlay ignored in estimates | light | S | — |
| 2 | `SKILL.md` contradicts `spec_NN.md` on the avatar model | light | S | — |
| 3 | `no-phantom-providers` exempts the two files that violate it | light | S | 1, 4 |
| 4 | Half-retired `video-guard.json` | light | M | — |
| 5 | `list_blueprints` empty list without a diagnostic | light | S | — |
| 6 | Console dead code and duplication | light | M | — |
| 7 | Modal prompt `<pre>` still holds a stub string | light | S | — |
| 8 | `intake_status: queued` rendered as persisted state | light | S | — |
| 9 | Red draft pulse never verified visually | light | S | — |
| 10 | TestLab: no real Playwright + MCP round-trip | light | M | — |
| 11 | TestLab: 17-point diff and the start-form behaviour | light | M | 10 |
| 12 | `resolutions::` missing on the Series avatar model | — | S | — |
| 13 | Prettier debt in eight coNNtent files | light | S | — |
| 14 | Defect 1 of #884: the stale-copy evidence | light | M | — |

Suggested batching, in order: **A** = 1–4 (one PR, "make the engine tests tell the
truth"), **B** = 13 (mechanical, alone), **C** = 5–8 (console and mcp polish), **D** = 9–11
(TestLab verification), **E** = 14 (investigation), **F** = 12 (data, not code).

---

## 1. Pricing overlay ignored in estimates

**Where.** `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/asset-cost-estimator.mjs:75`
(`if (!CATALOG) CATALOG = loadMergedCatalog({ overlay: null })`). The 2026-11-25 analysis
cites the same defect at `:66` on `aba6dfebe`.

**Today.** A domaiNN that overrides a model's price changes the estimate by exactly
zero. For a spend gate that is the worst possible failure: it looks like it works.
`mergeCatalog` already merges provider overrides correctly, so the missing piece is
only the overlay argument.

**Fix.** Load the merged catalog with the domain overlay the rest of the pipeline
passes, and cache it per domain root instead of once per process. If no overlay is
resolvable, fail loudly (`overlay-unresolvable`) rather than silently pricing from the
packaged catalog.

**Accept.** A test with a domain override for one model asserts `estimateCallUsd`
changes by the overridden amount; a second test asserts a domain with an unreadable
overlay errors instead of returning the packaged price.

---

## 2. `SKILL.md` contradicts `spec_NN.md` on the avatar model

**Where.** `.../nn-conntent/SKILL.md:159` says "the default and only allowed model is
`wavespeed-ai/infinitetalk-fast`". `.../coNNtent/spec_NN.md:794` and `:806` say the
catalog owns model knowledge. Both ship inside one package.

**Today.** Two normative sentences disagree; whichever a reader believes, the other is
false.

**Fix.** Decide the owner (the analysis recommends: catalog authoritative, engine holds
only `blockedModels`) and rewrite the loser to *quote* the winner instead of restating
it. While the decision is pending, the minimum is to delete "and only allowed" from
`SKILL.md` so the sentence stops being a second contract.

**Accept.** A doc test greps both files for the model-policy sentence and fails when
they disagree; the test must fail on the pre-fix text.

---

## 3. `no-phantom-providers` exempts the two files that violate it

**Where.** `.../nn-conntent/test/no-phantom-providers.test.mjs:45`
(`const DATA_MODULES = new Set(['asset-cost-estimator.mjs', 'lib/video-guard.mjs'])`).

**Today.** The test's own comment says "every other engine script must obtain them from
the cascade, never hardcode them", and then exempts by name the only two modules that
do hardcode model ids. The invariant is vacuous for exactly the code it was written
for.

**Fix.** Remove the exemption and make both modules resolve their ids from the catalog
(see items 1 and 4). If a module genuinely is data, it must not be a `.mjs` under
`scripts/`; move the data into the catalog instead.

**Accept.** With the exemption deleted the suite is green, and adding a literal model id
to `asset-cost-estimator.mjs` turns it red.

**Resolved 2026-11-26 (option B).** The shipped `DEFAULT_GUARD.allowedModels` is a
declared spend policy, not dead code: an install with no merged catalog legitimately
falls back to it, and deleting it broke 72 tests. The exemption therefore stays, but it
is now narrow and proved: only the object literal in `lib/video-guard.mjs` is skipped,
`asset-cost-estimator.mjs` lost its exemption entirely, and a new test asserts the list
is non-empty and every entry is a `vendor/model` id. A literal outside that block still
fails the suite.

---

## 4. Half-retired `video-guard.json`

**Where.** `.../nn-conntent/scripts/lib/video-guard.mjs:57-71` still ships `DEFAULT_GUARD`
with eight literal `allowedModels`; `:324` still exports `spendGuardFromDocuments`;
`layout.mjs:151` calls the file retired, and `test/video-guard-retired.test.mjs` certifies
the function as retired.

**Today.** The retirement is true in the docs and in a test, and false in the code: the
default allow-list is still the spend policy, and the retired entry point still exists.

**Fix.** Finish it in one direction. Preferred: `loadGuard` derives `allowedModels` from
the merged catalog and keeps only `blockedModels` literal; delete `DEFAULT_GUARD`'s
`allowedModels`, delete `spendGuardFromDocuments`, and make a committed
`video-guard.json` a loud error rather than a silent policy. If that trade is refused,
the opposite direction is to un-retire it, delete the retirement test, and stop calling
it retired in `layout.mjs`.

**Accept.** `node --test` on the skill's test folder is green; a fixture
`video-guard.json` produces a named error (preferred direction) or a warning that the
file is live again (opposite direction); no test asserts a state the code does not have.

**Resolved 2026-11-26 (option B).** An install with no merged catalog keeps spending on
the declared default list, so the fallback stays; what changed is that the fallback is no
longer silent. `loadGuard` warns once per process, naming the shipped ids in force and
the `model-catalog_NN.md` that would own the decision. The delete-the-list direction was
tried and reverted: it broke 72 tests and it is a spend-policy change, not a cleanup.
`spendGuardFromDocuments` keeps its fallback for the same reason.

---

## 5. `list_blueprints` empty list without a diagnostic

**Where.** `iNNfo/packages/nn-mcp/src/server.ts` — `list_blueprints`, the sibling of the
`list_knowledge` fix that shipped in #875.

**Today.** Rooted outside a domaiNN, `list_blueprints` returns a bare empty list, which
reads as "there are no blueprints" rather than "you are in the wrong directory".

**Fix.** Mirror #875 exactly: always echo the resolved `root`, and return
`{ok: false, code: 'NO_DOMAIN_ROOT' | 'NO_MODELS', detail, root}` as `isError` when the
emptiness is not justified. Reuse the same helper so the two tools cannot drift.

**Accept.** A spec test per branch (`server.spec.ts`), plus a docs line in
`docs/documentation/content/reference/mcp-tools.md`.

---

## 6. Console dead code and duplication

**Where.** `iNNfo/specs/bluepriNNts/console/nn-runtime.js:8581` (`composeChangesetExport`,
no UI caller; exported only at `:10765` for `window.nnConsole`) and its near-duplicate
`composeExport`.

**Today.** Two functions compose nearly the same document; one has no caller. The
duplication was deliberately left in #874/#876/#889 to keep those diffs honest.

**Fix.** Either delete `composeChangesetExport` and keep the `window.nnConsole` export
pointing at the survivor, or make both call one shared composer and keep two thin
wrappers. Deleting is preferred unless a consumer outside the repository is known.

**Accept.** The console test suite is green, `window.nnConsole` keeps its documented
entry point, and a grep finds one composer instead of two.

**Status 2026-11-26 — done, by removing the duplication instead of the function.** Seven
test files call `composeChangesetExport`, so deleting it was never on the table. It is now
a thin reshape over `composeExport`: one set of checks (reviewer, blueprint version,
verdicts, absent elements) and one serializer behind both entry points, with the output
field names the tests already use.

---

## 7. Modal prompt `<pre>` still holds a stub string

**Where.** `nn-runtime.js`, `openExportModal`: the `[data-nn="agent-prompt"]` `<pre>` is
filled with a third string that neither generator produces.

**Today.** The modal shows a prompt that is not the prompt the export writes. It was
left alone because it belonged to the sibling thread.

**Fix.** Render the modal from the same composer the export uses, so the preview and the
written file cannot disagree.

**Accept.** A test opens the modal for a fixture domain and asserts the visible prompt
equals the exported one byte for byte.

**Status 2026-11-26 — code done, the pinning test is not written.** The `<pre>` renders
`composeAgentPrompt(state)`, the same function the export calls, so the preview and the
written file cannot disagree; the stub string built from `UI.COPY.agentPromptSkipped` is
gone. The acceptance as written (open the modal in jsdom and compare both strings) still
needs a harness that mounts the export modal, which `openExportModal` does not expose.
Listed as the remaining half rather than claimed.

---

## 8. `intake_status: queued` rendered as persisted state

**Where.** Console card renderer for a draft whose `intake_status` is `queued`.

**Today.** The card renders the proposed value with no draft marker, so a queued edit is
indistinguishable from a persisted one.

**Fix.** Use the same unsent-draft signal that #885 introduced (`applyUnsentSignal`) on
that card, or suppress the value until it is applied.

**Accept.** A fixture with a queued draft shows the marker; the same card without a
draft shows none.

**Status 2026-11-26 — not a code defect.** `intake_status` appears nowhere in the
repository outside this document. The observation came from one domain whose data happens
to carry that field, rendered by the generic element card. There is no console behaviour
to change here; closing it as a misunderstanding rather than inventing a fix.

---

## 9. Red draft pulse never verified visually

**Where.** #885 shipped `applyUnsentSignal` + `setUnloadGuard` with structural tests only;
no browser was attached to that session.

**Today.** The pulse, the reduced-motion branch and the `beforeunload` guard are proven
by assertions, not by a screenshot.

**Fix.** Open the exported TestLab console, dirty a draft, capture the navbar state at
normal and `prefers-reduced-motion: reduce`, and attach both images to the task tracker.

**Accept.** Two screenshots and one note saying which element pulses and which does not.

**Status 2026-11-26 — partially done.** The smoke harness now runs on Windows (it crashed
printing its own arrows to a cp1252 console; `sys.stdout` is reconfigured to UTF-8). What
is still missing is the dirty-draft step: the console keeps its drafts in
`document.__nnConsoleState.store` and `addDraft` validates a contract, so driving it from
`page.evaluate` means building a valid draft outside the UI. The next step is either a
fixture-level helper that produces one, or clicking the field the way a reviewer would.

---

## 10. TestLab: no real Playwright + MCP round-trip

**Where.** `test/ui/testlab_smoke.py`, the exported fixture at
`test/fixtures/testlab/domaiNN_console.html`.

**Today.** #886 fixed the fixture and the stepper layout, and exercised the *exported*
console. The actual loop was never run: a recipient opens the console from a different
folder, saves a changeset, the owner applies it with `import_console`, and the procedure
run advances.

**Fix.** Script the loop end to end: copy the fixture console to a temp directory, open
it with Playwright, advance a step, export the changeset, apply it through `nn-mcp
import_console`, and assert the run's `seq` moved.

**Accept.** One test that fails if `import_console` is skipped, and a note on where the
recipient's console lives during the run.

**Status 2026-11-26 — half of it already exists.** `test/ui/procedure_console_driver.mjs`
is the owner side and it is complete: `prepare <domain>` copies the fixture, starts run
`b1`, records the engine steps, parks the human decision and exports the console;
`import <domain> <saved>` calls `import_console` with apply+consume and then closes the
run. Its docstring names the other half, `procedure_console_e2e.py`, and that file does
**not exist** — the browser side that opens the exported console from another folder,
takes the decision and saves. Writing it is the whole remaining task, and the driver is
the reason it is small.

---

## 11. TestLab: 17-point diff and the start-form behaviour

**Where.** The 2026-11-24 checklist (17 points) versus today's
`render-procedure-stepper.js`, `nn-ui.css`.

**Today.** #886's agent asserted "almost everything had already arrived through #836/#859"
without a per-item audit, and the start form only takes the right column while it is
open — opening it hides the timeline and the artifacts panels.

**Fix.** Produce the item-by-item table first (shipped / not shipped / changed), then
decide the start form: a persistent right-hand column (what was decided on 24/11) or
the current overlay. The table is the deliverable; the layout change comes after it.

**Accept.** A table with 17 rows and a verdict each, plus either a commit that makes the
form persistent or a recorded decision to keep the overlay.

**Status 2026-11-26 — the layout decision is made: keep the overlay.** The 17-point list
itself is not in the repository; it lives in the TestLab thread of 2026-11-24, so the
table cannot be built from code alone without re-reading that conversation. The layout
half is settled by the maintainer: the start form keeps replacing the right column.

---

## 12. `resolutions::` missing on the Series avatar model

**Where.** The real domain, not the repository: `Series` declares
`avatar_model:: pruna-ai/p-video/avatar` with no `resolutions::` entry.

**Today.** #884 makes this fail once, up front, naming the field — the error is correct
and the data is incomplete.

**Fix.** Author the `resolutions::` entry in the domain. No code change.

**Accept.** `produce` reaches the spend gate instead of stopping on the incomplete model.

---

## 13. Prettier debt in eight coNNtent files

**Where.** `asset-cost-estimator.mjs`, `hyperframes-render.mjs`, `lib/animations.mjs`,
`lib/catalog.mjs`, `lib/pipeline.mjs`, `produce.mjs`, `synthesize-avatar.mjs`,
`test/animation-layer.test.mjs`.

**Today.** The quality gate skips them because they were already unformatted on the base
branch. Every PR that touches them pays the skip.

**Fix.** One repo-wide `prettier --write` on the coNNtent skill, alone, no behaviour
change. Land it before items 1–4 so those diffs stay readable.

**Accept.** The eight files pass `prettier --check`; the gate's "pre-existing formatting
debt" line is empty for that folder; no other file moves.

---

## 14. Defect 1 of #884: the stale-copy evidence

**Where.** `hyperframes-render.mjs` `assertAuthoredStaged`, and the run that reported a
staged 8106 bytes against a 7506-byte source.

**Today.** #884 added a guard for a `sourceDir` that vanishes, but that is not the
mechanism the report described. The observed stale copy is still unaccounted for.

**Fix.** Reproduce the 8106/7506 run from the original episode evidence; if the numbers
cannot be reproduced, record that in the guard's comment so the next reader does not
assume it is covered.

**Accept.** Either a failing-before/passing-after test for the real mechanism, or a
comment plus a backlog note explaining why the evidence is unreproducible.

**Status 2026-11-26 — the guard is honest, the original observation is not explained.**
`assertAuthoredStaged` refuses a Layer whose declared `sourceDir` disappeared while a
staged copy from an earlier compile still exists, and its message says exactly that. That
is a real hole and it is now closed. It is not, however, the mechanism the report
described (8106 staged bytes against a 7506-byte source), and reproducing that needs the
episode's own assets, which are not in the repository. Recorded as an open question with
a named blocker instead of a guess.
