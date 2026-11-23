// Fixture procedure models (procedures bluepriNNt) for the runner tests, parsed by nn-core's own parser.
import { parseKnowledge } from '../parser/index.js'
import type { ParsedKnowledge } from '../types/index.js'

const header = (rev: string) => `---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "${rev}"
title: "Runner fixture"
---
`

/** draft -> review (decision) -> publish | rework. */
export const REVIEW_MD = `${header('V_1-0-0')}
# NN Work

## NN Work: Draft
slug:: draft
step_type:: task
executor:: agent
next:: [[review]]
output:: [[Draft Doc]]

## NN Work: Review
slug:: review
step_type:: decision
executor:: human
decision:: Approve the draft?
input:: [[draft-doc]]
next:: [ [[publish]], [[rework]] ]

## NN Work: Publish
slug:: publish
step_type:: task
executor:: engine
condition:: outcome == approve
command:: publish {draft}
input:: [[draft-doc]]
output:: [[published]]

## NN Work: Rework
slug:: rework
step_type:: task
executor:: agent
condition:: outcome == decline

# NN Artifact

## NN Artifact: Draft Doc
slug:: draft-doc
verify:: file:draft.md

## NN Artifact: Published
slug:: published
verify:: file:out/draft.html
`

/** gather -> write -> finish; write consumes brief and produces report. */
export const REPORT_MD = `${header('V_1-0-0')}
# NN Work

## NN Work: Gather
slug:: gather
executor:: agent
next:: [[write]]
output:: [[brief]]

## NN Work: Write
slug:: write
executor:: agent
next:: [[finish]]
input:: [[brief]]
output:: [[report]]

## NN Work: Finish
slug:: finish
executor:: human
condition:: [[report]] validated

# NN Artifact

## NN Artifact: Brief
slug:: brief
verify:: human

## NN Artifact: Report
slug:: report
verify:: file:report.md
`

/**
 * draft -> review (decision) -> publish | redraft; redraft goes back to review (a bounded loop).
 * The loop is guarded: review chooses redraft only on `outcome == send-back`.
 */
export const LOOP_MD = `${header('V_1-0-0')}
# NN Work

## NN Work: Draft
slug:: draft
executor:: agent
next:: [[review]]
output:: [[draft-doc]]

## NN Work: Review
slug:: review
step_type:: decision
executor:: human
decision:: approve or send-back?
max_attempts:: 2
next:: [ [[publish]], [[redraft]] ]

## NN Work: Publish
slug:: publish
executor:: agent
condition:: outcome == approve

## NN Work: Redraft
slug:: redraft
executor:: agent
condition:: outcome == send-back
next:: [[review]]
output:: [[draft-doc]]

# NN Artifact

## NN Artifact: Draft Doc
slug:: draft-doc
verify:: file:draft.md
`

/** One engine step. */
export const BUILD_MD = `${header('V_1-0-0')}
# NN Work

## NN Work: Build
slug:: build
executor:: engine
command:: npm run build
`

export const parse = (md: string): ParsedKnowledge => parseKnowledge(md)
