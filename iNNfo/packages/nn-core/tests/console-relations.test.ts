import { describe, it, expect } from 'vitest'
import { buildConsolePayload } from '../src/index.js'

// The canonical reference grammar (`iNNfo/packages/nn-core/src/references.ts`): a bare
// value, `[Model] Target`, or `Model :: Target`. None of them contains `[[...]]`, so the
// wikilink pass never sees them and the Connections tab renders empty (#803).
const model = `---
title: "Relations"
target_blueprint: "business_V_0-2-1"
knowledge_version: "V_1-0-0"
---

# NN Problems
## NN Problems: Paranormal Infestation
slug:: paranormal-infestation
severity:: high

## NN Problems: Spook Central
slug:: spook-central
severity:: medium

## NN Problems: Spectral Surge
slug:: spectral-surge
severity:: low

# NN Services
## NN Services: Ghost Capture
slug:: ghost-capture
description:: Containment.
target_problem:: Paranormal Infestation
backup_problem:: [Ghostbusters Business Model] Spook Central
escalation:: Problems :: Spectral Surge
notes:: Paranormal Infestation
`

const schema = {
  concepts: [
    { name: 'Problems', fields: [] },
    {
      name: 'Services',
      fields: [
        { name: 'target_problem', type: 'reference' },
        { name: 'backup_problem', type: 'reference' },
        { name: 'escalation', type: 'reference' },
        { name: 'notes', type: 'text' },
      ],
    },
  ],
}

const build = () =>
  buildConsolePayload({
    content: model,
    path: 'kNNowledge/relations_NN.md',
    schema: schema as never,
  })

const relationsOf = (id: string) => {
  const element = build().model.elements.find((e) => e.id === id)
  if (!element) throw new Error(`no element ${id}`)
  return element.relations ?? []
}

describe('console relations projected from reference fields', () => {
  it('projects a bare reference value as an edge', () => {
    expect(relationsOf('ghost-capture')).toContainEqual({
      field: 'target_problem',
      target: 'paranormal-infestation',
      targetLabel: 'Paranormal Infestation',
    })
  })

  it('projects the [Model] Target form', () => {
    expect(relationsOf('ghost-capture')).toContainEqual({
      field: 'backup_problem',
      target: 'spook-central',
      targetLabel: 'Spook Central',
    })
  })

  it('projects the Model :: Target form', () => {
    expect(relationsOf('ghost-capture')).toContainEqual({
      field: 'escalation',
      target: 'spectral-surge',
      targetLabel: 'Spectral Surge',
    })
  })

  it('projects nothing for a field the schema does not declare as a reference', () => {
    const fields = relationsOf('ghost-capture').map((r) => r.field)
    expect(fields).not.toContain('notes')
  })

  it('does not project an edge to an element the model does not carry', () => {
    const targets = relationsOf('ghost-capture').map((r) => r.target)
    expect(targets).toHaveLength(3)
  })
})
