import { describe, it, expect } from 'vitest'
import { parseFrontmatter } from './parser/yaml'
import type { SpecFrontmatter } from './types'

describe('Frontmatter Parsing — Batch 1 (alias, procedures, skills)', () => {
  it('parses includes block with alias map (concepts and fields)', () => {
    const yaml = `---
spec_version: "V_0-2-0"
level: 2
title: "Composite Template"
includes:
  - name: "business"
    url: "https://example.com/business_NN.md"
    alias:
      concepts:
        "Task": "BusinessTask"
      fields:
        "Item.status": "Item.business_status"
---
`
    const fm = parseFrontmatter(yaml) as SpecFrontmatter
    expect(fm).not.toBeNull()
    expect(fm.includes).toHaveLength(1)
    expect(fm.includes![0]).toEqual({
      name: 'business',
      url: 'https://example.com/business_NN.md',
      alias: {
        concepts: { Task: 'BusinessTask' },
        fields: { 'Item.status': 'Item.business_status' },
      },
    })
  })

  it('parses procedures block', () => {
    const yaml = `---
spec_version: "V_0-2-0"
level: 2
title: "SOP Template"
procedures:
  - id: "relevar-vivienda"
    name: "Relevamiento de Vivienda"
    path: "procedures/relevamiento_vivienda_NN.md"
---
`
    const fm = parseFrontmatter(yaml) as SpecFrontmatter
    expect(fm).not.toBeNull()
    expect(fm.procedures).toEqual([
      {
        id: 'relevar-vivienda',
        name: 'Relevamiento de Vivienda',
        path: 'procedures/relevamiento_vivienda_NN.md',
      },
    ])
  })

  it('parses skills block', () => {
    const yaml = `---
spec_version: "V_0-2-0"
level: 2
title: "Skill Template"
skills:
  - name: "nn-reforma-casa"
    repo: "cogNNitive/actioNN"
    path: "skills/nn-reforma-casa"
---
`
    const fm = parseFrontmatter(yaml) as SpecFrontmatter
    expect(fm).not.toBeNull()
    expect(fm.skills).toEqual([
      {
        name: 'nn-reforma-casa',
        repo: 'cogNNitive/actioNN',
        path: 'skills/nn-reforma-casa',
      },
    ])
  })

  it('parses top-level alias block', () => {
    const yaml = `---
spec_version: "V_0-2-0"
level: 2
title: "Aliased Template"
alias:
  concepts:
    "Task": "CustomTask"
  fields:
    "Task.name": "Task.title"
---
`
    const fm = parseFrontmatter(yaml) as SpecFrontmatter
    expect(fm).not.toBeNull()
    expect(fm.alias).toEqual({
      concepts: { Task: 'CustomTask' },
      fields: { 'Task.name': 'Task.title' },
    })
  })

  it('parses viewers block (Semantic View Intent)', () => {
    const yaml = `---
spec_version: "V_0-2-0"
level: 2
title: "Viewer Template"
viewers:
  - id: "guided-procedure"
    view_type: "fsm-stepper"
    target_concept: "Work"
    label: "Guided Procedure Execution"
    icon: "play-circle"
---
`
    const fm = parseFrontmatter(yaml) as SpecFrontmatter
    expect(fm).not.toBeNull()
    expect(fm.viewers).toEqual([
      {
        id: 'guided-procedure',
        view_type: 'fsm-stepper',
        target_concept: 'Work',
        label: 'Guided Procedure Execution',
        icon: 'play-circle',
      },
    ])
  })
})
