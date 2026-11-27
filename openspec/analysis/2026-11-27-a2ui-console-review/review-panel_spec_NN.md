---
spec_version: "V_0-1-0"
level: 2
blueprint_version: "V_0-1-0"
title: "Review Panel (iNNfo-inspired, lightweight)"
status: draft
---

# NN index

* [[Independent Analysis]]
  * [[Findings]]
* [[Cross Critique]]
  * [[Critiques]]
* [[Consolidation]]
  * [[Decisions]]

# NN Concept Definition

## NN Concept Definition: Independent Analysis
icon:: microscope
type:: category
color:: blue
weight:: 80

## NN Concept Definition: Findings
icon:: search-code
type:: weight
color:: blue
weight:: 70

## NN Concept Definition: Cross Critique
icon:: messages-square
type:: category
color:: orange
weight:: 60

## NN Concept Definition: Critiques
icon:: scale
type:: weight
color:: orange
weight:: 50

## NN Concept Definition: Consolidation
icon:: clipboard-check
type:: category
color:: green
weight:: 90

## NN Concept Definition: Decisions
icon:: gavel
type:: weight
color:: green
weight:: 80

# NN Field Definition

## NN Field Definition: tags
concept:: *
type:: select
multiple:: true
description:: Open vocabulary labels, for example the layer or module a finding touches.

## NN Field Definition: category
concept:: Findings
type:: select
options:: [refactor, change, improvement]
description:: Kind of suggestion.

## NN Field Definition: impact
concept:: Findings
type:: select
options:: [low, medium, high]
description:: Expected benefit if the finding is applied.

## NN Field Definition: effort
concept:: Findings
type:: select
options:: [low, medium, high]
description:: Estimated cost to apply the finding.

## NN Field Definition: risk
concept:: Findings
type:: select
options:: [low, medium, high]
description:: Risk of regression or side effects when applying the finding.

## NN Field Definition: evidence
concept:: Findings
type:: select
options:: [verified, inferred, unverified]
description:: How the claim was checked. verified means the analyst read the cited code or ran a command; inferred means deduced from other evidence; unverified means not checked.

## NN Field Definition: code_ref
concept:: Findings
type:: string
description:: Evidence in the repository as comma-separated path:line pairs.

## NN Field Definition: recommendation
concept:: Findings
type:: markdown_inline
description:: One concrete, actionable recommendation.

## NN Field Definition: target
concept:: Critiques
type:: string
description:: The reviewed finding as author:ID, for example alpha:F3.

## NN Field Definition: stance
concept:: Critiques
type:: select
options:: [agree, partially agree, disagree]
description:: The reviewer's verdict on the target finding.

## NN Field Definition: covers
concept:: Decisions
type:: string
description:: Findings this decision resolves as a list of author:ID values.

## NN Field Definition: decision
concept:: Decisions
type:: select
options:: [adopt, adopt with changes, defer, reject]
description:: Final call on the covered findings.

## NN Field Definition: consensus
concept:: Decisions
type:: select
options:: [unanimous, majority, split]
description:: Level of agreement among the reviewers.

## NN Field Definition: priority
concept:: Decisions
type:: select
options:: [P1, P2, P3]
description:: Execution priority of the decision.

# Review Panel Template

## A lightweight, iNNfo-inspired format for a three-phase multi-model code review

## Philosophy

This template borrows the iNNfo vocabulary (Concepts, Fields, `key:: value`
lines, prose below fields) to give every report a predictable shape. It is
deliberately **not** a full Level 2 blueprint: it has no changesets, no
sidecars, no matrices and no `nn-mcp` dependency. Reports are plain Markdown
files that follow the conventions below. The vote table is a plain
Markdown table in the consolidated report, not a formal Matrix Definition,
because reviewers are not a Concept.

## Phases and files

All files live in the review folder named by the orchestrator brief and are
written in English.

| Phase | Author | File | Concepts used |
|---|---|---|---|
| 1. Independent analysis | each analyst | `independent-analysis-<key>.md` | Findings |
| 2. Cross critique | each analyst | `cross-critique-<key>.md` | Critiques (and new Findings, IDs `N1`, `N2`, ...) |
| 3. Consolidation | orchestrator | `consolidated-plan-and-verdict.md` | Decisions |

`<key>` is the analyst key defined in the orchestrator brief.

## Writing rules

1. Start with `# NN <Concept>` once per concept, then one `## NN <Concept>: <Name>` per element.
2. Finding names start with a stable ID: `F1 Extract duplicated hook`. IDs are unique per author and never reused.
3. Fields are `key:: value` lines directly under the element heading. Lists use `[a, b, c]` with no quotes.
4. The explanation of an element is free prose below its fields, separated by one blank line. Never write a `description::` field in a report.
5. `code_ref` must point to real files and lines in the repository. Do not invent paths. A finding without a real `code_ref` is dropped.
6. A critique covers every finding of the other reports, with exactly one `## NN Critiques:` element per reviewed finding.
7. Do not invent problems to fill a quota. Fewer, real findings beat more, speculative ones.
8. Use UTF-8 without BOM and LF line endings.

## Example: independent analysis

```markdown
---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - alpha"
---

# NN Findings

## NN Findings: F1 Extract duplicated filter logic
category:: refactor
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: src/domain-console/filters.ts:42, src/domain-console/list.ts:118
recommendation:: Move the shared filter predicate into one helper and reuse it.
tags:: [filters]

The same predicate is implemented twice with slightly different null handling,
which already caused inconsistent results between the list and the tree view.
```

## Example: cross critique

```markdown
---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - alpha"
---

# NN Critiques

## NN Critiques: Review of beta F2
target:: beta:F2
stance:: partially agree

The duplication is real, but the proposed fix would couple the console to the
persistence layer. Prefer a pure helper that receives the data as an argument.

# NN Findings

## NN Findings: N1 Missing error boundary around the tree view
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: src/domain-console/tree.tsx:12
recommendation:: Wrap the tree in an error boundary with a recoverable fallback.

A render error in one node currently blanks the whole console.
```

## Example: consolidated decision

```markdown
# NN Decisions

## NN Decisions: D1 Unify filter logic
covers:: [alpha:F1, beta:F2, gamma:F4]
decision:: adopt with changes
consensus:: majority
priority:: P1

Adopt the shared helper, but keep it a pure function as argued in the alpha
critique of beta:F2.
```
