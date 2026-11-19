import { describe, expect, it } from 'vitest'
import { procedureGraph } from './index.js'
import { REVIEW_MD, parse } from './fixtures.js'

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

  it('reports several starts and a missing slug', () => {
    const g = procedureGraph(model(`## NN Work: A\nslug:: a\n\n## NN Work: Loose Step\n`))
    expect(g.diagnostics).toContainEqual(expect.objectContaining({ code: 'MULTIPLE_STARTS' }))
    expect(g.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'MISSING_SLUG', step: 'loose-step' }),
    )
    expect(g.start).toBeNull()
  })

  it('treats a Work that is the parent of other Work as a container, not a step', () => {
    const g = procedureGraph(
      model(`## NN Work: Proc\nslug:: proc\n\n## NN Work: A\nslug:: a\nparent:: [[proc]]\n`),
    )
    expect(Object.keys(g.steps)).toEqual(['a'])
    expect(g.start).toBe('a')
  })
})
