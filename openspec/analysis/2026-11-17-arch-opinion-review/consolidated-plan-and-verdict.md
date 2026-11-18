---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Consolidated plan and verdict - arch-opinion-review"
analyzed_commit: "ce776f9d366ec6b5920595aea08006f11ac2be7a"
analysts: ["luna (gpt-6-luna)", "sonnet (claude-sonnet-5-5)"]
single_provider_panel: false
no_cross_critique: false
estimate: "$0.54 list price, not measured"
price_date: "2026-11-17"
---

# Verdict

The critique is **half right about the diagnosis and wrong about almost every cure**.

Its five "what is well resolved" claims survive contact with the documentation, with one
overclaim about audit strength. Its six proposals all rest on a real observation — the
lexicon is odd, the surface is wide, the layout rules are heavy — and five of the six then
prescribe a cure that removes a property the documentation says was chosen on purpose:
version-pinned grammar, prose that is addressable, declared storage, workload-matched
interfaces, commit-pinned skill installs, and a structural document marker.

Exactly one proposal contains a change worth making on its own terms: **`remove_model`**.
Two more contain a salvageable slice: folding true sibling MCP tools, and merging the two
UI skills. Everything else in the opinion should be **rejected as stated**, and three of its
premises are refuted outright by what the docs actually describe.

What the run did not do: it judged the documentation, not the code. Every claim here is
about what `master.md` says the system does.

# Vote table

`author` marks the row's own finding. Cells are the other analyst's stance, taken from its
cross-critique.

| Finding | luna | sonnet |
|---|---|---|
| luna:F1 preserve the dynamic specification chain | author | partially agree |
| luna:F2 keep the structured model grammar | author | agree |
| luna:F3 retain compact and distributed storage | author | partially agree |
| luna:F4 keep the MCP/CLI split by workload | author | agree |
| luna:F5 preserve separate skill responsibilities | author | partially agree |
| luna:F6 NN naming is a real adoption cost | author | partially agree |
| luna:F7 reduce vocabulary friction | author | **disagree** |
| luna:F8 make lifecycle gaps explicit | author | partially agree |
| luna:F9 MCP/CLI split by interaction shape | author | partially agree |
| luna:F10 simplify skill entry without bypassing readiness | author | partially agree |
| luna:F11 do not read the graph as a relational DB | author | partially agree |
| luna:F12 retain the five documented strengths | author | partially agree |
| sonnet:F1 proposal B hashing premise refuted | agree | author |
| sonnet:F2 proposal A: L0 cheap, hard-coded L1 is not | agree | author |
| sonnet:F3 proposal B DSL: metadata is already YAML | agree | author |
| sonnet:F4 proposal E: manager is not a reinvented npm | agree | author |
| sonnet:F5 proposal C: id/placement collapse | agree | author |
| sonnet:F6 proposal D: fold siblings, not the CLI | partially agree | author |
| sonnet:F7 proposal F: `_NN` is a discriminator | partially agree | author |
| sonnet:F8 proposal C, `remove_model` is a real gap | partially agree | author |
| sonnet:F9 weakness "rigid migrations" overstated | partially agree | author |
| sonnet:F10 strengths sustained, audit overclaim | partially agree | author |
| sonnet:F11 proposal E, preflight and 8-to-2 | partially agree | author |
| sonnet:F12 weakness "relational database" overdrawn | agree | author |
| sonnet:N1 provenance has direct-write exceptions | — | author only |
| sonnet:N2 proposal D ingestion premise partly true | — | author only |
| sonnet:N3 proposal A network premise refuted | — | author only |
| sonnet:N4 preflight is already silent on success | — | author only |
| sonnet:N5 CRLF hazard already handled by policy | — | author only |

Spot-checks run by the consolidator, all against `docs/documentation/master.md`:

- `:2965-2967` the validator is pure, "no network, no clock"; `:3024-3031` resolution is
  domain-first, then flat, global, bundled; `:2985` `TEMPLATE_CACHE_STALE` is a warning.
  **sonnet:N3 verified.** Proposal A's network/cache-failure benefit does not exist.
- `:3299` `cognitivize` is already an MCP tool and `:2010` names it one `nn-core` operation
  surfaced through both interfaces. **sonnet:N2 verified.**
- `:3853` exit code 0 means "proceed without interrupting the user"; `:3842` the banner is
  once per conversation; `:3857-3859` `nn` is the sole gate owner. **sonnet:N4 verified.**
- `:3290` `init_domain` writes `.gitattributes` with `* -text`; `:3890` preflight reports
  `text-policy-missing`. **sonnet:N5 verified.**
- `:3287` `generate_index` and the Level-2 blueprint authoring operations "write directly".
  **sonnet:N1 verified for that half**, but its second half is **wrong**: the same line puts
  `freeze_slugs` among the operations synthesized into a sealed, recorded changeset. Only
  the `nn-update --freeze-slugs --apply` path at `:4007` is undocumented on this point.
- `:1519` is a blank separator, not data-model content; the section starts at `:1521`.
  **sonnet's correction of luna:F11 accepted.**
- `:2999` is the `| Area | Codes |` table header. **luna:F7's citation is wrong**, and
  `:3436-3438` shows a glossary already exists. sonnet's `disagree` is upheld.
- The MCP inventory says 24 tools (`:3278`) and its table has 23 data rows. **Verified.**

# Decisions

## NN Decisions: D1 Reject proposal A as stated and keep the four levels
covers:: [luna:F1, sonnet:F2, sonnet:N3]
decision:: reject
consensus:: unanimous
priority:: P1

Both analysts reach the same place from different sides: the chain costs something real,
and the cure costs more. The documented properties that A would destroy are that a document
resolves its own declared parent (`:1946`, `:1949`), so an old document keeps validating
against the grammar it declared, and that L1 is a *self-describing* metaschema written in
the syntax it constrains, with "no separate declaration format" (`:1458-1461`). Hard-coding
that in `nn-core` means shipping every grammar version side by side in code. The stated
benefit is also overstated: the resolver does not disappear, because L3 still has to find
L2, so A deletes two hops of four (`:1903`); and "half the validator" is unsupported
because conformance is checked against L2, which stays.

The premise both analysts accepted as weak is **refuted**: the opinion's network and cache
failures do not exist. The validator is pure, resolution is local-first, and
`TEMPLATE_CACHE_STALE` is a warning (`:2965`, `:3024-3031`, `:2985`).

Separable and deferred: stop modelling L0 as a resolvable hop and bundle it as a constant
(`:1453`, `:1503`). Cheap, but it is a design change with no demonstrated pain, so it waits.

## NN Decisions: D2 Reject proposal B in both halves
covers:: [luna:F2, sonnet:F1, sonnet:F3, sonnet:N5]
decision:: reject
consensus:: unanimous
priority:: P1

**Hashing half — refuted.** The byte hashes that line endings can break belong to imported
evidence (sidecar `sha256`, `text-policy-missing`), and evidence files are PDFs, CSVs and
JSON payloads that have no canonical-JSON form (`:3634`, `:3890`, `:3881`). The existing
mitigation is one line, `* -text`, written by `init_domain` (`:3290`). For models, the
default drift check is a semantic fold over applied changes; only `strict: true` compares
serialized bodies (`:2414`). The opinion also contradicts itself: it praises SHA-256 over
untouched raw bytes (`opinion.md:30`) and then proposes replacing it (`opinion.md:70`).

**DSL half — reject, but keep the interop idea read-only.** Metadata is *already* YAML
frontmatter; what is proprietary is the body grammar (`:1258`, `:1325`, `:1807`). An element
carries a prose body after its property lines, and that prose is addressable as
`@<element>&#body` (`:1605`, `:2710`). A frontmatter-only model must either stuff prose into
YAML strings or re-invent headings to map prose to keys — the grammar under another name —
and nesting and matrix cells go with it. A generated YAML/JSON projection produced by
`nn-core` gives the Obsidian/Pandoc benefit without changing the source of truth. Deferred
until a concrete interop requirement exists.

## NN Decisions: D3 Reject paths-as-ids; adopt `remove_model` as a recorded change
covers:: [luna:F3, sonnet:F5, sonnet:F8]
decision:: adopt with changes
consensus:: majority
priority:: P1

The opinion bundles a sound fix with an unsound rewrite.

**Rejected:** one-file-one-entity with the path as id. IDs are already derived from the
file's own path and the blueprint declarations (`:2647`), and the doc deliberately says "a
stem, a path and a title are never ids" (`:1712`) because the old path-form fallback
"orphaned every recorded change target" (`:2443`). "Simple sub-elements in YAML, complex
entities as files" is compact-vs-distributed **by convention instead of by declaration**:
the validator then cannot tell a misplaced instance from an ordinary document, and cannot
catch one instance stored twice — the exact bug the feature fixed (`:2781`, `:2441`). The
checks would not vanish; they would move into implicit rules nobody can enumerate.

**Adopted, corrected:** add `remove_model` as a sealed, evidence-bearing change and let
`MODEL_WITHOUT_FILE` accept a recorded removal as terminal, exactly as it already accepts a
recorded move. Both analysts land here, and sonnet's correction is right that `:2835`
describes a **missing operation, not a prohibition**. luna's caveat stands: the terminal
exception must be narrowly tied to an applied removal event and must define reference
behaviour, or a missing file becomes an accepted state. Skip the opinion's `_archive/`
copy: `archive` is a reserved placement segment and is skipped by the integrity audit
(`:2573`, `:3880`), and Git already holds the history.

## NN Decisions: D4 Reject "unify MCP and CLI"; fold the true sibling tools
covers:: [luna:F4, luna:F9, sonnet:F6, sonnet:N2]
decision:: adopt with changes
consensus:: unanimous
priority:: P1

The premises are partly false. One engine already sits behind every surface (`:1817`);
`cognitivize` is **already** an MCP tool and one `nn-core` operation (`:3299`, `:2010`);
and the split is a documented assignment of interactive typed calls to MCP and "heavy
ingestion and batch work" to the CLI (`:3081-3091`). The CLI-only verbs that remain are
batch, long-running, interactive-menu or consent-gated (`--scan`, `--import-url`, `--gc`,
`--unlink`, `:3404`, `:3408`, `:3409`, `:3626`), which is the reason for the split. Tool
count is a weak proxy: `propose_changeset` already multiplexes thirteen operations
(`:3289`), so merging tools moves enum members into schemas. The suggested 8–10 primitives
also have no home for scope resolution or procedure listing.

Adopted, narrower: merge the genuine siblings — the three `validate_*` tools,
`get_spec`/`get_blueprint`, `resolve_effective`/`explain` (same inputs, same trace,
`:3304`), and the list tools — merging only where inputs, outputs and safety semantics
actually coincide. luna's objection is accepted: "near 18" is an estimate, not a target, and
lower count is not evidence of lower cognitive load.

## NN Decisions: D5 Reject the skills-manager removal and the 8-to-2 collapse
covers:: [luna:F5, luna:F10, sonnet:F4, sonnet:F11, sonnet:N4]
decision:: reject
consensus:: unanimous
priority:: P1

The manager is not a reinvented npm. It copies one subtree of a GitHub repo pinned by a
full 40-character commit into `~/.agents/skills/{name}/`, via a tarball fetch and atomic
rename with rollback, zero dependencies, with consent gates on every mutating command
(`:4194`, `:4205`, `:4221`, `:4228`, `:4210`). Desired/installed is a lockfile that pins
**commits, not semver ranges** (`:4199`, `:4203`) — the stronger guarantee for prompt files.
It also carries `install-external` with SPDX licensing (`:4217`). And the replacement the
opinion proposes cannot exist as described: `@cognnitive/nn-core` is "workspace-only, never
published to the npm registry" (`:2191`), so `npx @cognnitive/cli` has no published artifact.

The "silent preflight" cure is **already the behaviour on success**: exit code 0 means
"proceed without interrupting the user", the check is a deterministic script, and `nn` is
the sole gate owner per session (`:3853`, `:3844`, `:3857-3859`). What is left is a
once-per-conversation banner (`:3842`) and the consent case on non-zero exit — which is the
case you *want* to interrupt. And the gate cannot move into server startup: it verifies
`nn-mcp` availability by calling `nn-mcp`, which a server cannot do about its own absence,
and it audits every raw file's `sha256` across `sources/` (`:3869`, `:3879`).

Adopted, narrowly: merge `nn-site-generator` and `nn-design-presets` into one UI skill —
site generation already hands off to presets for tokens (`:3245`). Keep `nn-sources`,
`nn-innfo` and `nn-update` separate; collapsing authoring, ingestion and upgrade into one
file means every activation loads all of them, which is more context, not less.

## NN Decisions: D6 Keep `_NN.md`; treat the prose rename as optional and measured
covers:: [luna:F6, luna:F7, sonnet:F7]
decision:: reject
consensus:: unanimous
priority:: P2

Discovery is path-agnostic and keys on `_NN.md` — "any `_NN.md` file that qualifies as a
model is a model" (`:2761`); `--cognitivize` skips `_NN.md` documents (`:3400`); raw
Markdown sources live in the same tree (`:1347`); a non-`_NN.md` file is an artifact lineage
node only under conditions (`:2011`). Rename models to `domain.md`/`knowledge/*.md` and they
become indistinguishable from sources and artifacts, so a new discriminator has to be
invented. The prose names were chosen *against* collisions: `model` and `domain`/`workspace`
were retired partly because of `llm-model`, `statistical-model`, `npm workspace`
(`:2051`, `:2058`). A prior full rename cost a 45-row retired-identifier table with "no
runtime aliases" (`:2156`, `:2160-2204`), and proposal F would pay that again in reverse.

The one thing everybody agrees on: the spelling does cost something, and the project
already polices it with `NN_NAME_INVARIANT` (`:2985`). If anyone wants to act, measure
misspelled paths and keys on a fixed agent task suite first. luna:F7 is **rejected**: its
`:2999` citation is a table header, its recommendation duplicates F6, and the glossary it
asks for exists at `:3436`.

## NN Decisions: D7 Correct two documentation defects
covers:: [sonnet:F6, sonnet:N1, luna:F12, sonnet:F10]
decision:: adopt
consensus:: unanimous
priority:: P2

1. The MCP inventory says **24** tools (`:3278`) and its table has **23** rows;
   `read_lineage` is named as a tool (`:3319`) without a row. One of the two is wrong.
2. Provenance is described as absolute when it is not: `generate_index` and the Level-2
   blueprint authoring operations "write directly" outside any changeset (`:3287`), so
   schema edits carry no changeset provenance. For Level-3 data the claim holds.

## NN Decisions: D8 State the seal guarantee precisely
covers:: [sonnet:F10, luna:F12]
decision:: adopt
consensus:: unanimous
priority:: P2

The opinion calls the arrangement "auditoría real". The changeset seal `proposal_sha`
"carries no key, so it is not an authentication — anyone who can edit the file can
recompute it" (`:2277`), and `author` is a free identifier (`:1363`). The seal catches
accidents; the integrity layer is Git, and only signed commits make it more than that
(luna's correction that plain Git history is also alterable by a writer is accepted). This
is a documentation-accuracy fix, not an architectural flaw — and it is the one place where
the opinion's praise is *too generous*.

## NN Decisions: D9 Document the real migration boundary, drop the "rigid" framing
covers:: [luna:F8, sonnet:F9]
decision:: adopt with changes
consensus:: majority
priority:: P3

Three different rules were folded into one complaint. A **current** domain upgrades
bluepriNNt versions in place through Flow B, with consent, verified backup, `planHash`, and
rollback of every member if one fails (`:3944`, `:3957`, `:3980`). `BLUEPRINT_VERSION_SKEW`
is a deliberate invariant — "one version per bluepriNNt" (`:2805`) — and it is what makes
that upgrade unit well defined; the opinion offers no replacement. "No in-place migration"
applies to an **old or broken layout**, which is replaced, not repaired (`:4012`). The
genuinely open item is the missing removal operation, which is D3.

Adopted: say this up front in the docs. luna's correction is accepted — "only a retired
layout needs a new domain" is too narrow, because the rule also covers a broken domain.
Per-instance or lazy upgrades stay off the roadmap until a real domain shows the cost.

## NN Decisions: D10 Keep "validated references, not a database"
covers:: [luna:F11, sonnet:F12]
decision:: adopt with changes
consensus:: unanimous
priority:: P3

The doc says the system "is not a database" (`:1257`); `query_units` is a read-only
exact-match filter capped at 100 results (`:3298`); a collection is "computed, never
stored" (`:1729`); `apply_change` validates, then persists atomically (`:3287`). The ACID
demand is the wrong demand, and no proposal A–F addresses this claim anyway. Two fair
nuances to record rather than rebut: "persist atomically" is not documented as atomic
*across several files*, and the docs themselves admit out-of-band divergence via
`MODEL_WITHOUT_FILE` and the drift check (`:2789`, `:3297`).

Also correct a factual error in the opinion: `move_model` does **not** reject dangling
references. It is rejected with `MODEL_EXISTS` when the new id is taken (`:2691`), earlier
change targets keep resolving (`:2686`), and an unresolved old address returns
`REF_MODEL_NOT_FOUND` naming the recorded successor (`:2754`).

# Rejected and deferred

**Rejected outright**

- luna:F7 — redundant with luna:F6, and its citation `:2999` is the `| Area | Codes |`
  table header. The glossary it recommends already exists (`:3436`). sonnet's `disagree`
  upheld.
- luna:F12 as a *finding* — it asks for no change ("preserve these as constraints"), so it
  belongs in the verdict. Its content is kept; sonnet's correction that changeset-only
  provenance has documented exceptions is D7.
- Proposal A, B, C's path-as-id, D's unification, E's manager deletion and 8-to-2 collapse,
  F's `_NN.md` rename — see D1–D6.

**Deferred, with the trigger that revives each**

| Deferred item | Trigger |
|---|---|
| Bundle L0 as a constant, stop modelling it as a resolvable hop | a measured resolver/validator cost, not an assertion |
| Generated read-only YAML/JSON projection for Obsidian/Pandoc | a concrete interop requirement from a real user |
| Per-instance or lazy blueprint upgrades | a real domain that demonstrably cannot afford all-or-nothing |
| Trim the once-per-conversation banner | a measured comparison of context cost against the readiness signal it buys |
| sonnet:N1 as a standalone item | confirm whether `nn-update --freeze-slugs --apply` (`:4007`) records a changeset |

**Single-reviewer findings**

sonnet:N1–N5 have no second reviewer. N2, N3, N4 and N5 were verified independently by the
consolidator against the cited lines and are used as evidence above; they are recorded here
as single-author, consolidator-verified. N1 is accepted for its first half and corrected on
its second.

# Execution order

**First batch — 5 decisions, all rejections or doc-level fixes, no migration**

1. D1 reject proposal A.
2. D2 reject proposal B.
3. D3 reject paths-as-ids (**keep `remove_model` as its own follow-up**).
4. D4 reject unification (**keep sibling folding as its own follow-up**).
5. D5 reject the manager removal and the 8-to-2 collapse (**keep the UI-skill merge**).

Together these close the six proposals without touching a single line of code. That is the
cheapest possible outcome of a review this size: the answer is "do not do this".

**Next queue — the three slices that survived, in this order**

6. D3b `remove_model` as a sealed, recorded, reversible change.
7. D7 the two documentation defects (23-vs-24 tools; direct writes outside changesets).
8. D5b merge `nn-site-generator` + `nn-design-presets` into one UI skill.
9. D4b fold the true sibling MCP tools, no numeric target.
10. D8 state the seal guarantee precisely.

**Later**

11. D9 migration boundary in the docs.
12. D10 "not a database" framing and the `move_model` correction.

# Open questions and gaps

1. **Which is right, 24 tools or 23 rows?** The table and the prose disagree; nobody can
   resolve it from the documentation alone.
2. **Does `nn-update --freeze-slugs --apply` record a change?** `:3287` says the MCP
   `freeze_slugs` operation is synthesized into a sealed changeset; `:4007` says `--apply`
   writes in place and says nothing about recording. This is the only real provenance hole
   found.
3. **Both analysts produced exactly 12 findings, the stated maximum.** The critiques found
   padding in luna (F7 dead, F12 not a finding, F5/F10 overlapping) and in sonnet (F4/F6
   overlap). The cap was probably treated as a target. That does not affect the decisions,
   because every adopted decision rests on findings both sides examined, but it is a
   weakness of the run worth recording.
4. **Coverage limit:** this reviewed the documentation, not the implementation. Any claim
   here about behaviour is a claim about what `master.md` says the behaviour is. A code
   audit is a separate step, and `nn-dev-backlog` Phase 1 is where it belongs.

No delegates failed, no retries, no malformed reports, no integrity violations. Models
actually run: `gpt-6-luna` (OpenAI/Codex, reasoningEffort high) and `claude-sonnet-5-5`
(Anthropic/Claude, effort high) in phases 1 and 2; consolidation in the parent thread.
Preflight estimate ≈ $0.54 list price — **not measured**.
