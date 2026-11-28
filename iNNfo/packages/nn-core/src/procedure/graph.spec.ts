import { describe, expect, it } from 'vitest'
import { procedureGraph } from './index.js'
import { LOOP_MD, REVIEW_MD, parse } from './fixtures.js'

const model = (body: string) =>
  parse(`---
level: 3
knowledge_version: "V_0-1-0"
title: "g"
---

# NN Work

${body}`)

describe('procedureGraph', () => {
  it('reads steps, next targets, conditions, artifacts and producers from a parsed model', () => {
    const g = procedureGraph(parse(REVIEW_MD))
    expect(g.diagnostics).toEqual([])
    expect(g.defRev).toBe('V_1-0-0')
    expect(g.start).toBe('draft')
    expect(g.terminals.sort()).toEqual(['publish', 'rework'])
    expect(g.steps.review).toMatchObject({
      next: ['publish', 'rework'],
      executor: 'human',
      decision: 'Approve the draft?',
      inputs: ['draft-doc'],
    })
    expect(g.steps.draft.outputs).toEqual(['draft-doc']) // resolved by element name
    expect(g.steps.publish).toMatchObject({
      condition: 'outcome == approve',
      executor: 'engine',
      command: 'publish {draft}',
    })
    expect(g.artifacts['draft-doc']).toMatchObject({
      verify: 'file:draft.md',
      required: true,
      producers: ['draft'],
    })
  })

  it('accepts several targets written as one comma-separated string', () => {
    const g = procedureGraph(
      model(
        `## NN Work: A\nslug:: a\nnext:: [[b]], [[C step]]\n\n## NN Work: B\nslug:: b\n\n## NN Work: C step\nslug:: c\n`,
      ),
    )
    expect(g.steps.a.next).toEqual(['b', 'c'])
    expect(g.diagnostics).toEqual([])
  })

  it('reports an unknown next target', () => {
    const g = procedureGraph(model(`## NN Work: A\nslug:: a\nnext:: [[ghost]]\n`))
    expect(g.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_NEXT', step: 'a' }),
    )
    expect(g.steps.a.next).toEqual([])
  })

  it('reports a cycle and no start, without looping', () => {
    const g = procedureGraph(
      model(`## NN Work: A\nslug:: a\nnext:: [[b]]\n\n## NN Work: B\nslug:: b\nnext:: [[a]]\n`),
    )
    const codes = g.diagnostics.map((d) => d.code)
    expect(codes).toContain('CYCLE')
    expect(codes).toContain('NO_START')
    expect(g.start).toBeNull()
  })

  it('accepts a loop guarded by a decision branch, and reads its declared max_attempts', () => {
    const g = procedureGraph(parse(LOOP_MD))
    expect(g.diagnostics).toEqual([])
    expect(g.start).toBe('draft')
    expect(g.steps.redraft.next).toEqual(['review'])
    expect(g.steps.review.maxAttempts).toBe(2)
    expect(g.steps.draft.maxAttempts).toBeUndefined()
  })

  it('accepts a guarded loop back to the start step without losing the start', () => {
    const g = procedureGraph(
      model(
        `## NN Work: A
slug:: a
condition:: outcome == again
next:: [[b]]

` +
          `## NN Work: B
slug:: b
next:: [[a]], [[c]]

` +
          `## NN Work: C
slug:: c
condition:: outcome == done
`,
      ),
    )
    expect(g.diagnostics).toEqual([])
    expect(g.start).toBe('a')
  })

  it('reads a guarded loop of steps nested under the procedure header from its start', () => {
    const g = procedureGraph(
      parse(`---
level: 3
knowledge_version: "V_0-1-0"
title: "g"
---

# NN Procedure

## NN Procedure: Proc
slug:: proc

### NN Work: A
slug:: a
next:: [[b]]

### NN Work: B
slug:: b
next:: [[c]], [[d]]

### NN Work: C
slug:: c
condition:: outcome == ok

### NN Work: D
slug:: d
condition:: outcome == redo
next:: [[b]]
`),
    )
    expect(g.diagnostics).toEqual([])
    expect(g.start).toBe('a')
    expect(Object.keys(g.steps)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('still reports an unguarded cycle: a loop with no decision branch into it', () => {
    const g = procedureGraph(
      model(
        `## NN Work: A
slug:: a
next:: [[b]]

## NN Work: B
slug:: b
next:: [[c]]

` +
          `## NN Work: C
slug:: c
next:: [[b]]
`,
      ),
    )
    expect(g.diagnostics).toContainEqual(expect.objectContaining({ code: 'CYCLE' }))
  })

  it('reports several starts and a missing slug', () => {
    const g = procedureGraph(model(`## NN Work: A\nslug:: a\n\n## NN Work: Loose Step\n`))
    expect(g.diagnostics).toContainEqual(expect.objectContaining({ code: 'MULTIPLE_STARTS' }))
    expect(g.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'MISSING_SLUG', step: 'loose-step' }),
    )
    expect(g.start).toBeNull()
  })

  it('treats every Work as a step: a Work with children is no longer a container', () => {
    const g = procedureGraph(
      model(`## NN Work: Proc
slug:: proc
next:: [[a]]

## NN Work: A
slug:: a
parent:: [[proc]]
`),
    )
    expect(Object.keys(g.steps)).toEqual(['proc', 'a'])
    expect(g.start).toBe('proc')
  })

  it('performs a step with no executor by an agent, whatever its tool says', () => {
    const g = procedureGraph(
      model(`## NN Work: A
slug:: a
tool:: console
next:: [[b]]

## NN Work: B
slug:: b
executor:: human
`),
    )
    expect(g.steps.a.executor).toBe('agent')
    expect(g.steps.b.executor).toBe('human')
  })

  it('defaults verify from kind and at when verify is omitted', () => {
    const g = procedureGraph(
      parse(`---
level: 3
knowledge_version: "V_0-1-0"
title: "defaults"
---

# NN Work
## NN Work: S1
slug:: s1
output:: @f1, @e1, @c1

# NN Artifact
## NN Artifact: File Art
slug:: f1
kind:: file
at:: staging/{slug}.md

## NN Artifact: Element Art
slug:: e1
kind:: element
at:: @model:element

## NN Artifact: Changeset Art
slug:: c1
kind:: changeset
`),
    )
    expect(g.artifacts['f1']).toMatchObject({
      kind: 'file',
      at: 'staging/{slug}.md',
      verify: 'file:staging/{slug}.md',
    })
    expect(g.artifacts['e1']).toMatchObject({
      kind: 'element',
      at: '@model:element',
      verify: 'element:@model:element',
    })
    expect(g.artifacts['c1']).toMatchObject({
      kind: 'changeset',
      verify: 'applied',
    })
  })
})
