---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - luna"
---

# NN Findings

## NN Findings: F12 Retain the five documented architectural strengths
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:1316, docs/documentation/master.md:1358, docs/documentation/master.md:1360, docs/documentation/master.md:1381, docs/documentation/master.md:1333, docs/documentation/master.md:1422
tags:: [verdict-claim, provenance]
recommendation:: Preserve immutable source bytes, changeset-derived provenance, the shared engine, semantic addresses, and the offline console as non-negotiable constraints when evaluating simplifications.

SUSTAINED: the opinion's positive claims match the documented design: originals stay byte-for-byte untouched beside hash-bearing sidecars, provenance is derived from sealed changesets, MCP and console use the shared core, addresses are semantic rather than line-based, and the console is self-contained and not a mandatory step for ordinary chat updates.
## NN Findings: F8 Make lifecycle gaps explicit without weakening migration safety
category:: improvement
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: docs/documentation/master.md:2832, docs/documentation/master.md:2835, docs/documentation/master.md:2805, docs/documentation/master.md:3951, docs/documentation/master.md:4010
tags:: [weakness-claim, migrations]
recommendation:: Add a consent-gated model-removal lifecycle operation and a migration plan for legacy layouts while retaining whole-blueprint validation and rollback guarantees.

PARTIALLY SUSTAINED: the critique names genuine evolution costs: legacy domains are not migrated in place, there is no remove-instance operation, and version skew is rejected across the blueprint group. But the proposed cures are not equivalent: the new-domain import preserves old bytes, and the all-or-none upgrade uses a dry-run hash, backup, and rollback to avoid partial migration; only the missing removal lifecycle is an unambiguous gap.
## NN Findings: F3 Retain compact and distributed storage as distinct choices
category:: improvement
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: docs/documentation/master.md:1488, docs/documentation/master.md:2575, docs/documentation/master.md:2626, docs/documentation/master.md:2647
tags:: [proposal-C, identity]
recommendation:: Keep both storage modes and simplify only diagnostics shown to users where actual usage demonstrates the layout rules are burdensome.

PARTIALLY SUSTAINED: placement diagnostics and two storage modes add operational rules, but the proposed one-entity-per-file convention leaves the system worse as a universal rule. Compact concepts intentionally keep simple elements together, while distributed instances get hierarchical ids derived from declared placement; making every path the id would couple identity to file movement and discard the documented distinction between filename stem, slug, id, and address.
## NN Findings: F2 Keep structured model data in its typed document grammar
category:: improvement
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: docs/documentation/master.md:1325, docs/documentation/master.md:1319, docs/documentation/master.md:1458, docs/documentation/master.md:1358
tags:: [proposal-B, format]
recommendation:: Preserve the validated model grammar and source-byte hashes; consider canonical serialization only for a separately specified derived representation.

PARTIALLY SUSTAINED: a domain-specific grammar creates parser and authoring costs, but replacing all structured body data with YAML frontmatter and hashing canonical JSON leaves provenance and portability claims weaker than stated. Knowledge documents already use YAML frontmatter, while concepts, elements, typed fields, and matrices are governed by the parent chain; source integrity hashes raw bytes, so canonicalizing parsed data cannot prove the exact imported evidence is unchanged.
## NN Findings: F1 Preserve the dynamic specification chain
category:: improvement
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: docs/documentation/master.md:1451, docs/documentation/master.md:1458, docs/documentation/master.md:1503
tags:: [proposal-A, schema]
recommendation:: Keep the four levels unless a measured use case justifies a bounded reduction that preserves domain-defined schema primitives.

PARTIALLY SUSTAINED: the four-level vocabulary and parent chain add real conceptual overhead, but replacing L0/L1 with hard-coded JSON Schema or Zod primitives leaves the system worse by removing its documented self-describing, domain-extensible schema language. L0 defines normative rules, L1 defines the root primitives, and the resolver is the uniform mechanism that connects them; this is not merely duplicate boilerplate.
## NN Findings: F9 Keep MCP and CLI split by interaction shape
category:: improvement
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: docs/documentation/master.md:3072, docs/documentation/master.md:3083, docs/documentation/master.md:3088, docs/documentation/master.md:3390
tags:: [weakness-claim, interfaces]
recommendation:: Reduce handoffs through shared typed payloads and generated references rather than merging distinct interaction modes.

PARTIALLY SUSTAINED: agents do cross a tool boundary between typed MCP calls and shell-based batch ingestion, so the handoff is a real integration cost. But the documentation explicitly assigns interactive semantic operations to MCP and long-running local batch work to CLI; it does not establish duplicated business logic or a synchronization failure, since the MCP tools share the deterministic core and the two interfaces serve different workloads.
## NN Findings: F10 Simplify skill entry without bypassing readiness and consent
category:: improvement
impact:: medium
effort:: medium
risk:: high
evidence:: verified
code_ref:: docs/documentation/master.md:3184, docs/documentation/master.md:3210, docs/documentation/master.md:3854, docs/documentation/master.md:3861, docs/documentation/master.md:4226
tags:: [weakness-claim, orchestration]
recommendation:: Keep the single-owner preflight and consent gates; reduce repeated activation text only where measured context use shows duplication.

PARTIALLY SUSTAINED: multiple skills and a mandatory environment gate add ceremony, but the documented flow already has the front controller own one preflight per session and makes warnings/updates consent-sensitive. Moving checks silently into server startup or collapsing ownership would not remove the required decisions and could hide readiness failures or weaken the explicit consent boundary.
## NN Findings: F6 Treat NN naming as a real adoption cost, not a safe rename
category:: improvement
impact:: medium
effort:: high
risk:: high
evidence:: verified
code_ref:: docs/documentation/master.md:1337, docs/documentation/master.md:1453, docs/documentation/master.md:2580, docs/documentation/master.md:3400
tags:: [proposal-F, vocabulary]
recommendation:: Improve onboarding with a canonical vocabulary guide and aliases before considering a compatibility-breaking rename of established paths and identifiers.

PARTIALLY SUSTAINED: the doubled-NN vocabulary is nonstandard and creates a genuine spelling burden, but wholesale renaming leaves the system worse without a migration and alias plan. The naming appears in document formats, filesystem exclusions, and instance names, so changing it is not a cosmetic edit; the proposal identifies friction but underestimates compatibility and citation churn.
## NN Findings: F5 Preserve separate skill responsibilities; trim only proven repetition
category:: improvement
impact:: medium
effort:: high
risk:: medium
evidence:: verified
code_ref:: docs/documentation/master.md:3184, docs/documentation/master.md:3210, docs/documentation/master.md:3857, docs/documentation/master.md:4188
tags:: [proposal-E, skills]
recommendation:: Keep the front controller and specialized skills, and measure repeated activation cost before changing the preflight or distribution model.

PARTIALLY SUSTAINED: the eight-skill ecosystem, front controller, preflight, and manager create real discovery and maintenance overhead, but the proposed consolidation leaves the system worse on documented responsibilities. The gate runs once per session, specialized skills hand off to owners rather than duplicating work, and the manager pins desired commits separately from installed state; that is reproducible dependency management, not merely a replacement for npm.
## NN Findings: F7 Reduce vocabulary friction without collapsing distinct terms
category:: improvement
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: docs/documentation/master.md:1451, docs/documentation/master.md:1458, docs/documentation/master.md:2999, docs/documentation/master.md:1515
tags:: [weakness-claim, terminology]
recommendation:: Add a short role-based glossary and teach the four terms as a chain rather than replacing the underlying model.

PARTIALLY SUSTAINED: the critique is right that coined terms and four named levels impose learning cost, while the documentation also assigns each level a distinct job and relies on the chain for uniform resolution and validation. The weakness is onboarding friction, not proof that the concepts themselves are redundant.
## NN Findings: F4 Keep MCP and CLI as workload-specific interfaces
category:: improvement
impact:: medium
effort:: high
risk:: medium
evidence:: verified
code_ref:: docs/documentation/master.md:2965, docs/documentation/master.md:3083, docs/documentation/master.md:3088, docs/documentation/master.md:3275, docs/documentation/master.md:3307
tags:: [proposal-D, interfaces]
recommendation:: Retain the typed MCP/CLI split and review the registry for redundant operations before consolidating any tools.

PARTIALLY SUSTAINED: the 24-tool MCP inventory plus an ingestion CLI is real surface area, but the cure is not shown to improve the system. The documented split assigns typed interactive semantic operations to MCP and long-running batch ingestion to CLI, both backed by the shared deterministic engine; a single generic 8–10-tool API risks hiding operation-specific consent, atomicity, and result contracts without evidence that users are suffering from the current split.
## NN Findings: F11 Do not evaluate the graph as an attempted relational database
category:: improvement
impact:: low
effort:: medium
risk:: low
evidence:: verified
code_ref:: docs/documentation/master.md:1257, docs/documentation/master.md:1519, docs/documentation/master.md:3015, docs/documentation/master.md:3287
tags:: [weakness-claim, data-model]
recommendation:: Describe the graph and its integrity checks as a deliberate file-based model, and assess any transactional gap against concrete failure cases.

PARTIALLY SUSTAINED: distributed instances, typed references, and cross-file validation require bespoke integrity machinery, so the critique correctly identifies implementation complexity. The database analogy overstates the goal, though: the docs explicitly reject being a database, describe a Markdown/Git substrate, and specify validate-then-persist atomic changes; no documented requirement promises general ACID transactions.
