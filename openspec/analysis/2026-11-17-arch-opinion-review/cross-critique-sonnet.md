---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - sonnet"
---

# NN Critiques

## NN Critiques: Review of luna F1
target:: luna:F1
stance:: partially agree

The verdict (partially sustained) is right and the cited lines say what is claimed:
master.md:1453-1454 gives L0 the normative rules and L1 the root primitives, and
:1505 states the one-resolver benefit. But the argument for the cure being worse is
aimed at the wrong target. Proposal A keeps Blueprints (L2) as the domain-defined
schema, so "domain-extensible schema language" is not what A removes. What A removes
is the self-describing metaschema: master.md:1458-1461 says L1 is written in the
syntax it constrains and a blueprint is an ordinary iNNfo document, so one parser
validates every level (:1508). That is the real loss, and F1 only gestures at it.
F1 also never tests the opinion's premise that the chain costs network and cache
failures; the validator is documented as pure, with no network (:2965-2967) and a
local-first resolution order (:3024-3031). That premise is mostly wrong and is the
strongest refutation available (see N3). The recommendation "keep four levels unless
a measured use case justifies a bounded reduction" is a hedge, not an action.

## NN Critiques: Review of luna F2
target:: luna:F2
stance:: agree

Sound, and the key point is correct: sources are hashed over raw bytes
(master.md:1319, :3634) and many sources are PDFs or images, so a canonical-JSON hash
cannot replace byte integrity. The reading of :1325 is accurate: models already carry
YAML frontmatter; what the proposal would move is the body grammar. One weakness: the
report cites :1319 (source sidecars) as if it also covered model drift hashing, which
blurs the two cases. It also misses the cheaper answer to the CRLF complaint that the
docs already give (see N5), which makes the "eliminate line-ending problems" gain of
proposal B small. The portability claim ("weaker than stated") is vague, but the
verdict and the recommendation (keep the grammar, canonicalize only a derived view)
are right and migration-safe.

## NN Critiques: Review of luna F3
target:: luna:F3
stance:: partially agree

The verdict is right, but one of its two arguments contradicts the line it cites. F3
says making the path the id "would couple identity to file movement". Yet
master.md:2647 says a distributed id is already derived only from the file's own path
and the blueprint declarations, and :2575 says the instance root folder is "the unit
that moves"; :2790 (`STALE_TARGET_MOVED`) shows renames already change ids. So that
coupling exists today for distributed concepts, and C would extend it to compact
documents, not invent it. The better arguments are two others. First, the
stem/slug/id/address distinction (:2620-2630) exists to keep a title or file name from
ever resolving anything, and slug stays the immutable identity. Second, C's
"simple sub-elements go in YAML, complex entities are files" is compact versus
distributed by convention instead of by declaration. That would delete the declared
placement and the checks that give instances their guarantees
(`PLACEMENT_MISMATCH`, `INSTANCE_NAME_MISMATCH`, :2776-2778); the checks do not
vanish, they move into implicit rules. Keeping both modes is the correct call. The
"simplify diagnostics where usage shows burden" tail is vague and gives nothing to do.

## NN Critiques: Review of luna F4
target:: luna:F4
stance:: agree

Verified: the 24-tool inventory is generated from the registry (master.md:3275-3278,
:3307), the split is deliberate (:3083-3091), and the shared engine claim holds
(:2965-2968). The verdict is right. Two caveats. The sentence that a generic
8-10-tool API "risks hiding consent, atomicity and result contracts" is inference, not
something the cited lines show, so the `verified` tag overstates it. And the report
misses that the opinion's premise is partly out of date: `cognitivize` is already an
MCP tool (:3299, and :2010 says it is one nn-core operation surfaced through both
interfaces), see N2. "Review the registry for redundant operations" is a sensible,
cheap next step.

## NN Critiques: Review of luna F5
target:: luna:F5
stance:: partially agree

The verdict holds: the gate has one owner per session (master.md:3210-3212, :3857-3859)
and the manager pins a commit per skill with a separate installed-state record
(:4190-4204). Two problems. The report says "eight-skill ecosystem", but none of the
cited lines states a count; that number comes from the opinion. And "reproducible
dependency management, not merely a replacement for npm" is asserted, not shown: an
npm lockfile is also reproducible. The distinguishing facts are in the text and the
report does not use them: skills are fetched at a pinned commit from a tarball and
swapped into `~/.agents/skills/` with atomic rename and rollback (:4205-4206,
:4221-4224), a placement npm does not do for agent skill directories. It overlaps
heavily with F10 (same lines 3184, 3210). "Measure activation cost first" is a fair
instruction but gives no measurement to take.

## NN Critiques: Review of luna F6
target:: luna:F6
stance:: partially agree

The verdict (friction is real, rename is costly) is right, but the recommendation is
partly already done and partly against the repo's own policy. A canonical vocabulary
page already exists (master.md:1979-2016, linked at :1515) and there is a glossary
(:3438). "Add aliases before renaming" contradicts the docs: the vocabulary table
shows the project already did one full rename (`model` to kNNowledge, `workspace` to
domaiNN, `template`/`app` to bluepriNNt, :1995-1997) and handled retired names as
"one rename, no fallback" (:2011) and "no fallbacks to retired folders" (:3874).
Proposal F would reverse a rename the project already paid for. That is the strongest
cost argument, and F6 does not make it. Citation slip: :2580 is about `slug::`
equalling the folder slug; the instance file name (`<slug>_<bluepriNNt-name>_NN.md`)
is at :2576. F6 also does not test the opinion's LLM-autocorrect claim; the docs list
an `NN_NAME_INVARIANT` warning (:2985, :3002), which hints the spelling is policed,
but nothing in range says why, so that claim stays untested either way.

## NN Critiques: Review of luna F7
target:: luna:F7
stance:: disagree

This finding adds nothing over F6 and its recommendation already exists. "Add a short
role-based glossary" is already satisfied by the glossary (master.md:3438, :2855) and
the vocabulary page whose link F7 itself cites at :1515. The citation at :2999 is the
header row of the diagnostic-code table, which says nothing about the chain enabling
uniform resolution. The claim itself (coined terms cost learning effort, each level
has a job) is true and is stated in F6. Fold it into F6 and drop it; as written it
pads the count and has no action to take.

## NN Critiques: Review of luna F8
target:: luna:F8
stance:: partially agree

The facts check out: no in-place migration with a byte-identical import
(master.md:4010-4022, :4031), version skew is all-or-none with planHash, backup and
restore (:3951-3957, :3980-3982), and no remove-instance operation (:2835). Three
issues. It bundles three separate claims (migration, removal, skew) under one verdict,
so "partially sustained" hides that skew is already solved by a tool (nn-update Flow B)
while removal is genuinely open. Its recommendation to add "a migration plan for legacy
layouts" cuts against a documented invariant ("No in-place migration", :4031) and
against :2832, which says existing domaiNNs fail validation and migration is "a
separate, later change"; the report never reconciles the two statements. And a
removal operation is not free: `archive` is a reserved placement segment (:2573) and
archive folders are skipped by the integrity audit (:3880), so the opinion's
`_archive/` idea needs a design, and a whole-model removal must keep the old content
recoverable because a changeset records `from -> to` per field (:1361). The point that
removal is the one unambiguous gap is right; `remove_element` already exists
(:3289), so `remove_model` is a small extension.

## NN Critiques: Review of luna F9
target:: luna:F9
stance:: partially agree

Citations are accurate (master.md:3072, :3083-3091, :3390) and the verdict is fair:
the docs state the split is intentional and show no duplicated business logic. The
recommendation "shared typed payloads and generated references" is weaker than it
looks, because the mechanism mostly exists: `--sync` and `--converge` print a
ready-made `propose_changeset` payload for the agent to apply (:3405, :3407, :1410),
the MCP inventory is generated from the registry (:3275), and tool results carry a
versioned envelope (:3326). The report should have said the handoff is already typed
and named the remaining gap, or dropped the recommendation. Largely a duplicate of F4;
F9 keeps the opinion's "manual path passing" claim without checking it.

## NN Critiques: Review of luna F10
target:: luna:F10
stance:: partially agree

Right on the main point: one gate owner per session and consent on warnings
(master.md:3210-3212, :3854, :3857-3859, :4226). The report does not use the most
relevant fact for the opinion's "silent preflight" idea: the gate is already silent on
success, because exit code 0 means "proceed without interrupting the user" (:3853),
and the check is a deterministic script, not LLM reasoning (:3844-3848). What remains
is the once-per-conversation banner (:3842) and the report on non-zero exit, which is
exactly the consent-sensitive case. That makes the proposal mostly redundant, which is
stronger than "could hide readiness failures". The claim that server startup checks
would hide failures is plausible but inferred; Tier 1 also checks installed skills and
domain layout (:3863-3875), things an MCP process may not own. Nearly the same finding
as F5.

## NN Critiques: Review of luna F11
target:: luna:F11
stance:: partially agree

The verdict is defensible: the docs say "not a database" (master.md:1257) and describe
validate-then-persist (:3287), so "relational engine" overstates the goal. But the
recommendation ("describe it as a deliberate file-based model and assess any
transactional gap against concrete failure cases") has no concrete step. Also, :1519
is a separator line; the data-model content starts at :1521. Two things cut the other
way and are not weighed. :3287 says "persist atomically" but does not say the write is
atomic across several files, and `check_domain` reports drift between applied changes
and files (:3297) plus `MODEL_WITHOUT_FILE` for hand deletion (:2789), so the docs
admit out-of-band divergence. The opinion's complexity point is therefore partly
correct; what is wrong is the ACID demand. That nuance is the useful content, and
F11 reduces it to a rebuttal.

## NN Critiques: Review of luna F12
target:: luna:F12
stance:: partially agree

Most positives check out: originals untouched (master.md:1316, :1319), provenance
from changesets (:1358-1360), semantic addresses (:1333-1347), console not mandatory
(:1422). Two corrections. It is not really a finding: "preserve these as constraints"
asks for no change, so it belongs in the verdict section. And "SUSTAINED" on
changeset-only provenance is too absolute: :3287 says `generate_index` and the Level-2
bluepriNNt authoring operations write directly, outside any changeset, and :4007
says `--freeze-slugs --apply` "writes them in place" (the docs do not say whether that
path records a change); see N1. Also :1381 only shows the MCP agent calling the core;
"console uses the core" is supported by :2967-2968, not by that line.

# NN Findings

## NN Findings: N1 Changeset-only provenance has documented direct-write exceptions
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:3287, docs/documentation/master.md:4007, docs/documentation/master.md:1358
recommendation:: When the verdict praises "the change is the only provenance", qualify it with the documented exceptions and check whether the in-place `--freeze-slugs --apply` path records a change.

master.md:1358-1360 states the model holds current state and all provenance comes
from the changeset log. But :3287 says `generate_index` and the Level-2 bluepriNNt
authoring operations (`add_concept`, `add_field`, `bump_version` on a bluepriNNt)
"write directly", and :4007 says `--freeze-slugs --apply` writes slugs in place. The
docs do not say that path creates a changeset. The strength is real for Level-3 data,
but it is not absolute; a reviewer who treats it as absolute will miss that schema
edits carry no changeset provenance.
tags:: [verdict-claim, provenance]

## NN Findings: N2 Proposal D's ingestion premise is partly already true
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:3299, docs/documentation/master.md:2010, docs/documentation/master.md:3402
recommendation:: Restate proposal D as "expose `scan` and `sync` through MCP", since `cognitivize` is already an MCP tool and one shared nn-core operation.

The opinion lists `cognitivize` among ingestion operations to be exposed in `nn-mcp`.
:3299 shows it already is, and :2010 says it is one nn-core operation surfaced through
both the CLI flag and the MCP tool. What remains CLI-only is `--scan` (:3402),
`--sync` (:3405) and the batch flags, which are the long-running cases :3088
deliberately assigns to the CLI. A review of D that keeps the opinion's framing
rejects a change that is a third already made.
tags:: [proposal-D, interfaces]

## NN Findings: N3 Proposal A's network-failure premise contradicts the documented validator
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:2965, docs/documentation/master.md:3024, docs/documentation/master.md:2985
recommendation:: Refute proposal A's "remove remote parent chains and network failures" benefit using the documented pure, local-first resolution, and keep only the maintenance-cost argument.

The opinion says the parent-chain resolver brings network and cache failures that A
would remove. The validator is documented as a pure function with "no network" and
no clock (:2965-2967), and a parent is resolved domain-first, then global, then
bundled with installed skills (:3024-3031). `TEMPLATE_CACHE_STALE` is a warning, not
an error (:2985). A URL-based path exists (`get_spec`, `validate_knowledge_url`, e.g.
:3284), but it is explicit, not the default. So half of A's stated benefit rests on a
premise the docs contradict, and no luna finding says so.
tags:: [proposal-A, schema]

## NN Findings: N4 The preflight gate is already silent on success
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:3853, docs/documentation/master.md:3844, docs/documentation/master.md:3842
recommendation:: Judge proposal E's "silent preflight" against the existing exit-code-0 path and size only the banner and the non-zero reports as real context cost.

Exit code 0 means "proceed without interrupting the user" (:3853) and the check runs
as a script (:3844-3848). The remaining cost is the once-per-conversation banner
(:3842) and the HALT report on warnings (:3854), which is the consent case. The
opinion's complaint that the LLM must run diagnostics and ceremonial greetings every
session is therefore smaller than stated, and its cure replaces a deterministic gate
with a startup check.
tags:: [proposal-E, orchestration]

## NN Findings: N5 The CRLF problem behind proposal B is already handled by init and preflight
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:3290, docs/documentation/master.md:3890, docs/documentation/master.md:3881
recommendation:: Weigh proposal B's hashing benefit against the existing `.gitattributes` `* -text` policy that `init_domain` writes and preflight audits.

`init_domain` creates a `.gitattributes` with `* -text` (:3290) and preflight reports
`text-policy-missing` when it is absent (:3890). Together they make raw-byte hashes
stable across Windows and Linux by policy, at the cost of one file. Canonical-JSON
hashing would save that line only, while giving up byte-exact integrity for sources
(:3881). The opinion treats line endings as a permanent hazard; the docs treat them as
an already-managed configuration.
tags:: [proposal-B, format]
