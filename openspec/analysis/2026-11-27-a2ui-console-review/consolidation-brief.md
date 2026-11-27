# Consolidation brief — A2UI fit review

You are the consolidator of a four-analyst, four-provider architecture review. Your job is
to produce ONE consolidated plan and verdict. You decide; you do not restate.

## Two roots (read this carefully)

**Write root — inside your workspace, use this for every file you create:**

```
D:\Users\lucas\Documents\GitHub\cogNNitive\temp\analysis\a2ui-console-review
```

This path is a junction to the review folder and lives inside the project directory, so it
needs no folder-access grant.

**Read root — the baseline checkout, use this for the corpus:**

```
D:\Users\lucas\Documents\GitHub\cogNNitive-a2ui-console-review
```

Baseline commit: `ad1ffe0aa1fe3e1842b22c7296a5396cb6f7418a`

The corpus files must be read from the read root: line numbers in the findings were measured
at that commit, and the main checkout sits at an older commit with different line numbers.

## Permissions

Your harness may ask for workspace or folder access before your first read outside the
project directory. That prompt is expected and must be approved; it is the only way to read
the corpus at the baseline commit. Do not abandon the task over it.

## Files

All the `.md` files named below live in the write root (same folder as this brief).

## Read, in this order

1. `orchestrator-prompt.md` — the brief: the decision under review, claims C1-C5, verified
   A2UI facts, verified console facts, corpus, the seven questions the panel had to answer.
2. `review-panel_spec_NN.md` — the format contract. Follow its "Example: consolidated decision".
3. The four independent analyses:
   - `independent-analysis-alpha.md` (9 findings)
   - `independent-analysis-beta.md` (12 findings)
   - `independent-analysis-gamma.md` (7 findings)
   - `independent-analysis-delta.md` (11 findings)
4. The four critiques:
   - `cross-critique-alpha.md` — critiques beta, 12/12
   - `cross-critique-alpha-gamma.md` — critiques gamma, 7/7 (REASSIGNED reviewer)
   - `cross-critique-gamma.md` — critiques delta, 11/11
   - `cross-critique-delta.md` — critiques alpha, 9/9

Total: 39 findings, 39 critiques.

## How this panel was run — read before judging

This panel used a **ring design**, chosen by the maintainer: each artifact has exactly ONE
critic, not three.

- alpha's report was critiqued by delta.
- beta's report was critiqued by alpha.
- gamma's report was critiqued by alpha (reassigned after beta was blocked by a rate limit).
- delta's report was critiqued by gamma.

Consequences you MUST respect:

1. **No finding has a second reviewer.** The skill's default rule "a claim confirmed by no
   second reviewer is deferred" cannot be applied literally here or everything would be
   deferred and the review would be worthless. Adapt it, and say so:
   - critic stance `agree` or `partially agree` → adoptable (as proposed, or amended if the
     critique names a defect);
   - critic stance `disagree` → contested. Verify it in code yourself before ruling. If the
     code supports the finding, adopt with changes and name the objection; if the code
     refutes it, reject it and say why;
   - a finding whose critic only said `agree` without a substantive check keeps lower
     confidence: adopt at lower priority and note it was not adversarially tested.
2. **The vote table is not a full matrix.** Rows are the 39 findings; columns are the four
   critics. A finding has exactly one non-dash cell; every other cell is `—` (not reviewed).
   Do not invent votes.
3. Deviations to record in the frontmatter and in a short "Run deviations" section:
   - a first phase-2 batch was cancelled because its prompt carried a wrong critique count;
     it produced no artifacts;
   - beta (Claude Sonnet 5.5) was blocked by a provider rate limit; its assignment was
     reassigned to alpha (GPT-6.1 Terra);
   - the consolidator is not the Claude Opus 5.5 named in the original roster, because the
     same rate limit blocked the Claude account;
   - delta's critique of alpha was soft (8 agree / 1 partially agree), so alpha's findings
     carry weaker adversarial testing than the others.

## Corpus (re-read ONLY to spot-check a disagreement; do not re-read everything)

Relative to the READ root (`D:\Users\lucas\Documents\GitHub\cogNNitive-a2ui-console-review`):

- `iNNfo/specs/bluepriNNts/console/review.js`
- `scripts/console-views.mjs`
- `iNNfo/specs/bluepriNNts/console/ui-kit.js` lines 1600-1900, 4180-4260, 5260-5345

## What the verdict must contain

1. **Overall verdict** in a few paragraphs on the decision under review, not on code health:
   does A2UI have a role in cogNNitive, and which of C1-C5 survives? Be decisive. If the
   panel effectively refuted the prior answer, say that in the first sentence.
2. **Vote table** as described above (39 rows). Use `author:ID` for finding ids.
3. **Decisions**: one `## NN Decisions:` element per decision, with `covers::`,
   `decision::` (adopt | adopt with changes | defer | reject), `consensus::`
   (unanimous | majority | split — with a single critic per finding use `unanimous` only
   when every finding covered by that decision drew agree or partially agree, else `split`),
   `priority::` (P1 | P2 | P3), and a short rationale after the fields. Merge duplicate
   findings from different analysts into one decision.
4. **Rejected and deferred items**, each with the concrete reason and, for deferred ones,
   the trigger that would revive it. A rejected decision gets no backlog entry; say so.
5. **Execution order**, with a first batch of at most five decisions, ordered by value/cost.
6. **Open questions and gaps**: what the panel did not resolve, and what a human must decide.

Frontmatter: level 3, title "Consolidated plan and verdict", plus:

```yaml
single_provider_panel: false
no_cross_critique: false
analysts: [alpha, beta, gamma, delta]
critique_ring: true
consolidator_model: "<the model you actually ran>"
```

## Hard constraints

- Do NOT create a git worktree. Do NOT load any skill. Do NOT run npm, tests, builds or installs.
- Do NOT modify any file outside the review folder. Do NOT edit any analyst's report.
- Write `consolidated-plan-and-verdict.md` SECTION BY SECTION (do not emit the whole file in
  one write; it times out).
- Do not decide by majority and do not treat agreement as proof: the analysts share the same
  brief and can share a wrong premise. Your only independent tool is the code.
- English only. UTF-8 without BOM, LF endings.

When done, reply with ONLY three lines: the absolute path of your report, the model you
actually ran, and the commit SHA.
