---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - sonnet"
---

# NN Findings

## NN Findings: F1 Proposal B hashing premise is refuted: CRLF-sensitive hashes cover raw evidence, not models
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:2414, docs/documentation/master.md:3634, docs/documentation/master.md:3890, docs/documentation/master.md:3290, temp/analysis/arch-opinion-review/opinion.md:30, temp/analysis/arch-opinion-review/opinion.md:70, temp/analysis/arch-opinion-review/opinion.md:116
recommendation:: Reject the "canonical JSON hash instead of raw bytes" half of proposal B: keep SHA-256 over raw source bytes plus `* -text`, and keep the semantic fold as the default drift gate for models, with strict replay as the opt-in.
tags:: [proposal-B, hashing]

REFUTED: the premise that change detection is "a raw byte hash (CRLF sensitive)" does not match what the documentation says the system does.
The byte hashes that line endings can break are the sidecar `sha256` of raw imports (master.md:3634) and the `text-policy-missing` audit finding that exists because "line-ending conversion can break raw-byte hashes" (master.md:3890). Those are evidence files (PDFs, CSVs, JSON payloads), which have no canonical-JSON form; the existing mitigation is one line, `* -text`, written by `init_domain` (master.md:3290).
For models, the default drift check is a semantic fold over applied changes, and only `strict: true` compares the serialized body, so that "a whitespace-only edit is drift there and not in the default fold" (master.md:2414). The opinion also contradicts itself: it praises SHA-256 over untouched raw bytes as the audit guarantee (opinion.md:30) and then proposes replacing byte hashing (opinion.md:70, opinion.md:116).
Applied to sources, the cure would weaken the immutable-evidence rule; applied to models only, it changes nothing the default fold does not already do.

## NN Findings: F2 Proposal A: dropping L0 as a runtime hop is cheap, hard-coding L1 as one schema is not
category:: refactor
impact:: high
effort:: high
risk:: high
evidence:: inferred
code_ref:: docs/documentation/master.md:1453, docs/documentation/master.md:1503, docs/documentation/master.md:1903, docs/documentation/master.md:1946, docs/documentation/master.md:1949, docs/documentation/master.md:1955, docs/documentation/master.md:2561, docs/documentation/master.md:2966, docs/documentation/master.md:3027, docs/documentation/master.md:2985, temp/analysis/arch-opinion-review/opinion.md:60, temp/analysis/arch-opinion-review/opinion.md:62
recommendation:: Bundle L0 and stop modelling it as a resolvable hop, but keep L1 as a version-pinned, frozen document, so old documents keep validating against the grammar they declared; do not replace it with a single Zod schema.
tags:: [proposal-A, levels]

PARTIALLY SUSTAINED: collapsing four levels to two removes real ceremony at the top of the chain, but the opinion's stated failure modes are overstated and the cure breaks a deliberate property.
Overstated: validation is "no randomness, no network, no clock" (master.md:2966), blueprint resolution is local-first (domain `specs/bluepriNNts/`, flat `specs/`, global store, then bundled with skills, master.md:3027), and `TEMPLATE_CACHE_STALE` is a warning, not a failure (master.md:2985). The remote-chain network risk the opinion names is not what the documentation describes.
Also, the resolver does not disappear: L3 still has to find its L2 blueprint, so proposal A deletes two hops of a four-hop walk (master.md:1903), not the resolver.
The deliberate property at stake: the engine takes the grammar from the document's own `parent_spec.url`, "never from an internal constant", so "old documents keep validating against old schemas" and there is "no 'current spec' constant" (master.md:1946, master.md:1949, master.md:1955). The grammar does change between iNNfo versions: V_0-7-0 added `storage`, `container` and `placement`, and older pins warn on them (master.md:2561). Hard-coding L1 in `nn-core` means shipping every grammar version side by side in code, which rebuilds the version-pinned resolution in a form nobody can read as Markdown.
The part that holds: only levels 0-2 carry semantics (master.md:1503) and L0 is meta-language about levels and terminology (master.md:1453). Treating it as a bundled constant costs little. The claim that this halves the validator is unsupported: the schema-conformance pass checks against L2, which stays.

## NN Findings: F3 Proposal B DSL: the metadata is already YAML; moving all data into it severs prose from elements
category:: refactor
impact:: high
effort:: high
risk:: high
evidence:: inferred
code_ref:: docs/documentation/master.md:1258, docs/documentation/master.md:1325, docs/documentation/master.md:1807, docs/documentation/master.md:1605, docs/documentation/master.md:2493, docs/documentation/master.md:2710, docs/documentation/master.md:4012, temp/analysis/arch-opinion-review/opinion.md:66, temp/analysis/arch-opinion-review/opinion.md:68
recommendation:: Keep the body grammar; if interoperability with Obsidian or Pandoc is the goal, ship a derived YAML/JSON projection generated by `nn-core`, not a new storage format for every kNNowledge document.
tags:: [proposal-B, dsl]

PARTIALLY SUSTAINED: the custom grammar is a real cost, but the opinion describes the current format as more proprietary than it is and underprices the cure.
Already standard: a model is "Markdown with YAML frontmatter" (master.md:1258, master.md:1325), and structured metadata such as `parent_spec` and `scope_elements` already sits in frontmatter (master.md:2488). What is proprietary is only the body grammar: `# NN <Concept>`, `## NN <Concept>: <Element>`, `slug::` and `key:: value`, which needs the custom parser (master.md:1807).
What the cure breaks: an element carries a prose body "after the property lines" (master.md:1605) and that prose is itself addressable as `@<element>&#body` (master.md:2710). A frontmatter-only data model must either put prose into YAML strings or re-introduce headings to match prose back to keys, which recreates the grammar under another name. Nesting (`parent_slug`) and matrix cells would also have to be encoded in YAML.
The migration cost is also not free: there is no in-place migration for a domain whose layout changes, only "create a new domain and import the old one as a source" (master.md:4012), so a serialization change means a new migration pipeline or a re-derivation of every domain.
The interoperability benefit is real but can be had read-only, without touching the source of truth.

## NN Findings: F4 Proposal E: the skills manager is not a reinvented npm, and the npm package it would be replaced by is not published
category:: change
impact:: medium
effort:: low
risk:: medium
evidence:: verified
code_ref:: docs/documentation/master.md:4194, docs/documentation/master.md:4199, docs/documentation/master.md:4203, docs/documentation/master.md:4205, docs/documentation/master.md:4210, docs/documentation/master.md:4217, docs/documentation/master.md:4221, docs/documentation/master.md:4228, docs/documentation/master.md:4219, docs/documentation/master.md:4247, docs/documentation/master.md:2191, temp/analysis/arch-opinion-review/opinion.md:92, temp/analysis/arch-opinion-review/opinion.md:96
recommendation:: Keep `skills-manager.js`; separate the maintainer-only branches (`sync`, Create, Audit, Maintenance) from the user-facing install/update commands so the user-visible skill shrinks without losing commit pinning.
tags:: [proposal-E, skills-manager]

REFUTED for "delete the manager because it reinvents npm"; the manager does a job a single npm package does not do.
It copies one subtree of a GitHub repo, pinned by a full 40-character commit, into the agent's skills directory (`~/.agents/skills/{name}/`), through a tarball fetch and an atomic rename with rollback, and every mutating command needs consent or exits 2 with `needs decision` (master.md:4194, master.md:4205, master.md:4221, master.md:4228). It is zero-dependency (master.md:4210). The desired/installed pair is a lockfile, as the doc itself says (master.md:4199, master.md:4203), but it pins commits, not semver ranges, which is the stronger guarantee for prompt files.
An `npx @cognnitive/cli` package cannot place files into an agent's skills directory without an installer step, which is exactly what the manager is. The premise also needs a publishing channel the docs do not describe: `nn-core` is declared "workspace-only, never published to the npm registry" (master.md:2191).
The manager also carries the opt-in `install-external` path for third-party skills pinned to a commit with an SPDX license (master.md:4217), which a plain npm install does not give.
What is fair in the opinion: `nn-skills-lifecycle` mixes user commands with repo-only maintenance (`sync` at master.md:4219 and the Maintenance branch at master.md:4247), and that part could be split off.

## NN Findings: F5 Proposal C: the id/placement collapse renames compact-vs-distributed and deletes the checks, not the problem
category:: refactor
impact:: medium
effort:: high
risk:: high
evidence:: verified
code_ref:: docs/documentation/master.md:1712, docs/documentation/master.md:2441, docs/documentation/master.md:2443, docs/documentation/master.md:2586, docs/documentation/master.md:2640, docs/documentation/master.md:2647, docs/documentation/master.md:2656, docs/documentation/master.md:2776, docs/documentation/master.md:2781, docs/documentation/master.md:2832, temp/analysis/arch-opinion-review/opinion.md:74, temp/analysis/arch-opinion-review/opinion.md:78, temp/analysis/arch-opinion-review/opinion.md:80
recommendation:: Keep the per-concept `storage`/`placement` declaration and do not adopt raw-path ids; if the diagnostics matrix is the pain, fold the name, slug and placement mismatches under one code with a structured payload.
tags:: [proposal-C, storage]

PARTIALLY SUSTAINED: the layout diagnostics surface is large, but the proposal removes the checks, not the underlying need.
Fair: 7 declaration codes (master.md:2586) plus 15 layout codes (master.md:2776) is a heavy surface for "where does a file live", and the doc lists its own limitations (master.md:2832).
But "simple sub-elements in YAML, complex entities as files in a subfolder" (opinion.md:80) is compact vs distributed with the declaration removed. Without the declaration the validator cannot tell a misplaced Video from an ordinary document, and it cannot catch an instance that is also stored as an element of another document (master.md:2781), which is the original bug the feature fixed: "the same video was stored twice" (master.md:2441).
Id as raw path: ids are already derived only from the file's own path and the blueprint declarations (master.md:2647), and the doc deliberately says "a stem, a path and a title are never ids" (master.md:1712, master.md:2656). The reason given is that the old path-form fallback "orphaned every recorded change target" (master.md:2443). Both models change id on a move; the difference is that the slug-chain id (`villabotijos-today/intro`, master.md:2640) does not embed literal folder names such as `series/` and `assets/`, so it stays short and layout-independent.
Cost side: existing domains already fail validation until migrated (master.md:2832); a second storage change stacks on a migration that has not happened. The `remove_model` half of C is separable and sound, see F8.

## NN Findings: F6 Proposal D: fold the sibling tools, not the CLI; the "unify" premise is already partly true
category:: improvement
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: docs/documentation/master.md:3081, docs/documentation/master.md:3083, docs/documentation/master.md:3088, docs/documentation/master.md:3299, docs/documentation/master.md:2125, docs/documentation/master.md:3304, docs/documentation/master.md:3289, docs/documentation/master.md:3398, docs/documentation/master.md:3404, docs/documentation/master.md:3408, docs/documentation/master.md:3409, docs/documentation/master.md:3626, docs/documentation/master.md:3278, docs/documentation/master.md:3319, temp/analysis/arch-opinion-review/opinion.md:46, temp/analysis/arch-opinion-review/opinion.md:88
recommendation:: Merge the true siblings (the three validate tools, `get_spec`/`get_blueprint`, `resolve_effective`/`explain`, the list tools) to land near 18 tools, keep the batch CLI, and fix the generated inventory, which declares 24 tools but lists 23.
tags:: [proposal-D, mcp-cli]

PARTIALLY SUSTAINED: the tool surface has genuine near-duplicates, but "unify MCP and CLI" and "8-10 primitives" are not supported by what the system does.
Already true: one engine sits behind every surface (master.md:1817) and `cognitivize`, the first verb the opinion lists, is one `nn-core` operation surfaced through both the CLI and an MCP tool (master.md:2125, master.md:3299). The split is a documented choice: MCP for typed interactive calls, CLI for "heavy ingestion and batch work" (master.md:3081, master.md:3083, master.md:3088).
Fair: `resolve_effective` and `explain` take the same inputs and return the same trace (master.md:3304); the validate and get tools are siblings too.
Not supported: the remaining CLI-only verbs are batch, long-running or consent-gated (`--scan`, `--import-url`, `--gc`, `--unlink`, master.md:3404, master.md:3408, master.md:3409), and `--scan` has an interactive menu (master.md:3626). Moving them into request/response MCP calls trades away the property the docs name as the reason for the split. The tool count is also a weak proxy: `propose_changeset` already multiplexes thirteen operations (master.md:3289), so merging tools moves enum members into schemas rather than removing surface. The 8-10 list has no home for scope resolution or procedure listing.
Documentation defect found on the way: the generated inventory says **24** tools (master.md:3278) but its table has 23 rows, and `read_lineage` is named as a tool at master.md:3319 without a row.

## NN Findings: F7 Proposal F: the `_NN` suffix is a discriminator, not branding; the prose names are a separate, lower-value rename
category:: change
impact:: medium
effort:: high
risk:: medium
evidence:: inferred
code_ref:: docs/documentation/master.md:2761, docs/documentation/master.md:3400, docs/documentation/master.md:1347, docs/documentation/master.md:2011, docs/documentation/master.md:2051, docs/documentation/master.md:2058, docs/documentation/master.md:2156, docs/documentation/master.md:2160, docs/documentation/master.md:2204, docs/documentation/master.md:2985, docs/documentation/master.md:2832, temp/analysis/arch-opinion-review/opinion.md:108
recommendation:: Keep `_NN.md` as the document marker. Treat renaming the prose terms and directory names as optional, and measure first: run a fixed agent task suite, count misspelled paths and keys, and only then decide whether a rename is worth another retired-identifier table.
tags:: [proposal-F, vocabulary]

PARTIALLY SUSTAINED: the friction the opinion describes is real and the project already polices it, but the file-suffix half of the cure removes a structural discriminator.
Real: `NN_NAME_INVARIANT` is a validator warning (master.md:2985), which is the system admitting the spelling costs something.
Structural, not cosmetic: discovery is path-agnostic and keys on `_NN.md` ("any `_NN.md` file that qualifies as a model is a model", master.md:2761); `--cognitivize` skips sidecars and `_NN.md` documents (master.md:3400); a raw Markdown source lives in the same tree as models (master.md:1347); and "a non-`_NN.md` file is an artifact lineage node only if..." (master.md:2011). If models become `domain.md` and `knowledge/*.md`, they are indistinguishable from `.md` sources and artifacts, and a new discriminator would have to be invented.
The prose names were chosen against collisions: `model` was retired partly because of `llm-model` and `statistical-model`, and `domain`/`workspace` collide with `subject-area domain`, `npm workspace` and similar (master.md:2051, master.md:2058). The proposed `knowledge/` and `domain.md` reintroduce those collisions.
Churn: a prior full rename produced a retired-identifier table of 45 rows with "no runtime aliases" (rows from master.md:2160 to master.md:2204, stated at master.md:2156), and existing domains already fail without migration (master.md:2832). The claim that LLMs autocorrect `kNNowledge` is plausible but untested in the documentation, so evidence is inferred.

## NN Findings: F8 Proposal C, remove_model: the missing delete is a real gap, and it fits the existing recorded-change pattern
category:: improvement
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: docs/documentation/master.md:2835, docs/documentation/master.md:2789, docs/documentation/master.md:2417, docs/documentation/master.md:2384, docs/documentation/master.md:3289, temp/analysis/arch-opinion-review/opinion.md:44, temp/analysis/arch-opinion-review/opinion.md:82
recommendation:: Add `remove_model` as a sealed, evidence-bearing change and let `MODEL_WITHOUT_FILE` accept a recorded removal as terminal, as it already accepts "a recorded move that ends in a live model"; skip the `_archive/` copy, since Git already holds the history.
tags:: [proposal-C, remove-model]

SUSTAINED: this is right, and it is the smallest part of the opinion.
The documentation confirms the gap: "There is no operation that removes an instance model", and a hand deletion is reported as `MODEL_WITHOUT_FILE` (master.md:2835, master.md:2789). `propose_changeset` has `remove_element` and `remove_matrix` but no model removal (master.md:3289), so the CRUD loop is open at exactly one level.
One correction to the opinion's wording: it calls this a "prohibition" (opinion.md:44); the documentation describes a missing operation, not a rule.
The cure is cheap relative to the rest of the opinion because the pattern exists: moving or extracting an instance "is recorded as a change, so it raises no drift" (master.md:2417), and lineage is computed from applied changes (master.md:2384), so a recorded removal keeps the history attached without a new persisted structure. Effort is medium, not low, because strict replay and the manifest sync have to learn the terminal state.

## NN Findings: F9 Weakness claim "rigid migrations": real for layout and skew, overstated as "no in-place evolution"
category:: improvement
impact:: medium
effort:: medium
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:3944, docs/documentation/master.md:3957, docs/documentation/master.md:3980, docs/documentation/master.md:4012, docs/documentation/master.md:2805, docs/documentation/master.md:2841, docs/documentation/master.md:2832, docs/documentation/master.md:2835, temp/analysis/arch-opinion-review/opinion.md:44
recommendation:: Keep the skew gate and Flow B; document up front that bluepriNNt upgrades are in place and only a retired layout needs a new domain, and put per-instance or lazy upgrades on the roadmap only if real domains show the all-or-nothing cost.
tags:: [weakness-claim, migration]

PARTIALLY SUSTAINED: the pain points are real, but the opinion folds three different rules into one "rigidity".
Real: upgrades are all-or-nothing ("no per-instance or lazy upgrades", master.md:2841), existing domains are not migrated and fail validation (master.md:2832), and a retired layout is replaced, not repaired (master.md:4012).
Overstated: "no in-place migration" applies to an old or broken domain only. A current domain upgrades bluepriNNt versions in place through Flow B, with consent, a verified backup, a `planHash`, and rollback of every member if one fails (master.md:3944, master.md:3957, master.md:3980). `BLUEPRINT_VERSION_SKEW` is a deliberate invariant, "one version per bluepriNNt" (master.md:2805), and it is what makes that upgrade unit well defined; the opinion offers no replacement for it. The deletion point is a missing operation, not a ban (see F8; master.md:2835).
Net: the maintenance burden is concentrated where the documentation already says it is, so the finding is a documentation and roadmap one, not an architecture change.

## NN Findings: F10 Verdict claim "what is well resolved": sustained, with one overclaim about audit strength
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:1316, docs/documentation/master.md:1353, docs/documentation/master.md:1817, docs/documentation/master.md:1333, docs/documentation/master.md:1829, docs/documentation/master.md:2277, docs/documentation/master.md:1363, temp/analysis/arch-opinion-review/opinion.md:30, temp/analysis/arch-opinion-review/opinion.md:32, temp/analysis/arch-opinion-review/opinion.md:34, temp/analysis/arch-opinion-review/opinion.md:36, temp/analysis/arch-opinion-review/opinion.md:38
recommendation:: Keep all five strengths and state the seal guarantee precisely in the docs (detection of accidental edits); if tamper evidence is required, rely on signed Git commits rather than adding key management to `changes/`.
tags:: [verdict-claim, provenance]

SUSTAINED: all five claimed strengths match what the documentation describes, with one overclaim.
Confirmed: raw sources are never converted or renamed and live beside a sidecar (master.md:1316); the change is the only provenance and models stay citation-free (master.md:1353); one engine is the single source of truth for the console and the MCP server (master.md:1817); addresses are semantic, not line-based (master.md:1333); and the console is a self-contained HTML file (master.md:1829).
Overclaim: opinion.md:30 calls the arrangement "auditoría real". The changeset seal `proposal_sha` "carries no key, so it is not an authentication — anyone who can edit the file can recompute it" (master.md:2277), and `author` is a free identifier (master.md:1363). The seal catches accidents; Git, not `changes/`, is the real integrity layer. That is a documentation-accuracy fix, not an architectural flaw, which is why impact is medium and effort low.

## NN Findings: F11 Proposal E, silent preflight and 8-to-2 skills: right on the gate and UI skills, wrong on merging the authoring and upgrade skills
category:: improvement
impact:: low
effort:: medium
risk:: medium
evidence:: inferred
code_ref:: docs/documentation/master.md:3842, docs/documentation/master.md:3853, docs/documentation/master.md:3857, docs/documentation/master.md:3869, docs/documentation/master.md:3879, docs/documentation/master.md:3949, docs/documentation/master.md:3254, docs/documentation/master.md:3245, docs/documentation/master.md:1840, temp/analysis/arch-opinion-review/opinion.md:48, temp/analysis/arch-opinion-review/opinion.md:104
recommendation:: Drop the mandatory banner and run the gate once per session (it is already the sole-owner rule for `nn`); fold `nn-site-generator` and `nn-design-presets` into one UI skill; keep `nn-sources`, `nn-innfo` and `nn-update` separate so each loads only when triggered.
tags:: [proposal-E, skills-preflight]

PARTIALLY SUSTAINED: the per-session gate ceremony is trimmable, but "silent preflight in the MCP server" and a two-skill split do not fit the checks or the content.
Fair: every skill must print a banner "as the very first output line" and run the same gate (master.md:3842), though `nn` is already the sole owner and exit code 0 proceeds silently (master.md:3853, master.md:3857). That leaves the banner and one script call as the real recurring cost.
Not movable into the server: the gate verifies `nn-mcp` availability by calling `nn-mcp_list_knowledge` (master.md:3869), which a server cannot do about its own absence, and it audits every raw file's `sha256` against its sidecar across `sources/` (master.md:3879), a filesystem scan that belongs behind an on-demand tool, not at startup.
Merging: the opinion's two skills have no home for the consent, backup and `planHash` flow of `nn-update` (master.md:3949) or for the front controller's job loop. Collapsing authoring, ingestion and upgrades into one file makes each activation load all of them, which is more context, not less (inferred; the documentation does not measure skill size). The declared dependency table already expresses minimal working sets (master.md:3254). The UI half is sound: site generation hands off to design presets for tokens (master.md:3245), and the doc counts eight skills (master.md:1840).

## NN Findings: F12 Weakness claim "relational database on Markdown": a fair warning, but overdrawn, and no proposal A-F addresses it
category:: improvement
impact:: low
effort:: low
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:1257, docs/documentation/master.md:3287, docs/documentation/master.md:3298, docs/documentation/master.md:1729, docs/documentation/master.md:2691, docs/documentation/master.md:2754, docs/documentation/master.md:2686, docs/documentation/master.md:3957, temp/analysis/arch-opinion-review/opinion.md:50
recommendation:: Keep the framing "validated references and computed collections, not a database" in the docs, correct the `move_model` description, and do not spend a proposal on this claim: proposal C keeps references, it only removes layout checks.
tags:: [weakness-claim, relational-simulation]

PARTIALLY SUSTAINED: the observation that distributed storage, references and queries add database-like surface is fair, but the equivalence is overdrawn.
Against the claim: the documentation says the system "is not a database" (master.md:1257); `query_units` is a read-only exact-match filter capped at 100 results (master.md:3298); a collection is "computed, never stored" (master.md:1729); `apply_change` validates, then persists atomically (master.md:3287), changesets are sealed, and `nn-update` restores from a verified backup on failure (master.md:3957).
Inaccurate detail: the opinion says `move_model` rejects dangling references (opinion.md:50). The documentation says a move is rejected with `MODEL_EXISTS` when the new id is taken (master.md:2691), that earlier change targets keep resolving (master.md:2686), and that an unresolved old address returns `REF_MODEL_NOT_FOUND` naming the recorded successor (master.md:2754).
Fair: typed references, placement and cross-file checks are real relational-style integrity rules, and multi-file transactional guarantees beyond "persist atomically" are not described in the reviewed ranges.
