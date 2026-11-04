import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../src/parser/index.js'
import { applyMutation } from '../src/mutate.js'
import { buildLineageChangeset } from '../src/changeset/lineage/builder.js'
import { lineageChangeProblems } from '../src/changeset/types.js'
import type { ChangeItem } from '../src/changeset/types.js'

const CHANGES_BLUEPRINT = {
  specVersion: 'V_0-7-0',
  url: 'https://example.test/bluepriNNts/changes/spec_NN.md',
  version: 'V_0-7-0',
}

const URL_14 = 'https://example.test/bluepriNNts/coNNtent/coNNtent_V_0-14-1_NN.md'
const URL_15 = 'https://example.test/bluepriNNts/coNNtent/coNNtent_V_0-15-0_NN.md'

const MODEL = `---
spec_version: "V_0-7-0"
level: 3
parent_spec:
  name: "coNNtent_V_0-14-1"
  url: "${URL_14}"
blueprint_version: "V_0-14-1"
knowledge_version: "V_0-2-0"
title: "Series"
---

# NN index

* [[Scene]]

# NN Scene

## NN Scene: Intro
synopsis:: The opening

## NN Scene: Close
synopsis:: The ending
`

const parsed = () => parseKnowledge(MODEL)

describe('repin_blueprint mutation', () => {
  it('rewrites parent_spec and the blueprint pin', () => {
    const model = parsed()
    const res = applyMutation(model, 'repin_blueprint', {
      to: 'coNNtent_V_0-15-0',
      blueprintUrl: URL_15,
      from: 'coNNtent_V_0-14-1',
    })
    expect(res.success).toBe(true)
    const fm = model.frontmatter as Record<string, any>
    expect(fm.parent_spec.name).toBe('coNNtent_V_0-15-0')
    expect(fm.parent_spec.url).toBe(URL_15)
    expect(fm.blueprint_version).toBe('V_0-15-0')
  })

  it('rejects a stale precondition', () => {
    const res = applyMutation(parsed(), 'repin_blueprint', {
      to: 'coNNtent_V_0-15-0',
      blueprintUrl: URL_15,
      from: 'coNNtent_V_0-13-6',
    })
    expect(res.success).toBe(false)
    expect(res.errors?.[0]?.message).toContain('precondition')
  })
})

describe('rename_field mutation', () => {
  it('renames the key on every element that carries it', () => {
    const model = parsed()
    const res = applyMutation(model, 'rename_field', { from: 'synopsis', to: 'overview' })
    expect(res.success).toBe(true)
    const scenes = model.elements.get('Scene')!
    expect(scenes.every((el) => el.fields.overview !== undefined)).toBe(true)
    expect(scenes.every((el) => el.fields.synopsis === undefined)).toBe(true)
  })

  it('is a successful no-op when no element carries the field', () => {
    const res = applyMutation(parsed(), 'rename_field', { from: 'missing', to: 'other' })
    expect(res.success).toBe(true)
    expect(res.warnings?.[0]?.message).toContain('no element carries')
  })
})

describe('set_field_default mutation', () => {
  it('fills only the elements that lack the field', () => {
    const model = parsed()
    model.elements.get('Scene')![0]!.fields.spoiler = 'yes'
    const res = applyMutation(model, 'set_field_default', { fieldName: 'spoiler', to: 'no' })
    expect(res.success).toBe(true)
    const scenes = model.elements.get('Scene')!
    expect(scenes[0]!.fields.spoiler).toBe('yes')
    expect(scenes[1]!.fields.spoiler).toBe('no')
  })
})

describe('lineageChangeProblems', () => {
  const base = { id: 'c1', evidence: 'decision' } as const

  it('accepts a well-formed repin_blueprint', () => {
    expect(
      lineageChangeProblems({
        ...base,
        op: 'repin_blueprint',
        target: 'series',
        to: 'coNNtent_V_0-15-0',
        blueprint_url: URL_15,
      } as ChangeItem),
    ).toEqual([])
  })

  it('rejects an element address on a lineage operation', () => {
    const problems = lineageChangeProblems({
      ...base,
      op: 'rename_field',
      target: 'series@intro&synopsis',
      from: 'synopsis',
      to: 'overview',
    } as ChangeItem)
    expect(problems.join(' ')).toContain('bare model id')
  })

  it('rejects a rename onto the same name', () => {
    const problems = lineageChangeProblems({
      ...base,
      op: 'rename_field',
      target: 'series',
      from: 'synopsis',
      to: 'Synopsis',
    } as ChangeItem)
    expect(problems.join(' ')).toContain('same field')
  })
})

describe('buildLineageChangeset', () => {
  it('emits a repin plus the agreed mappings and defaults', () => {
    const { document, skipped } = buildLineageChangeset({
      modelId: 'series',
      model: parsed(),
      target: { name: 'coNNtent_V_0-15-0', url: URL_15 },
      mappings: [{ from: 'synopsis', to: 'overview' }],
      defaults: [{ field: 'spoiler', value: 'no' }],
      evidence: 'decision',
      changesBlueprint: CHANGES_BLUEPRINT,
    })

    expect(document.frontmatter.status).toBe('proposed')
    expect(document.frontmatter.parent_spec.name).toBe('changes')
    expect(document.changes.map((c) => c.op)).toEqual([
      'repin_blueprint',
      'rename_field',
      'set_field_default',
    ])
    expect(new Set(document.changes.map((c) => c.id)).size).toBe(3)
    expect(skipped).toEqual([])
  })

  it('skips a model already at the target pin', () => {
    const { document } = buildLineageChangeset({
      modelId: 'series',
      model: parsed(),
      target: { name: 'coNNtent_V_0-14-1', url: URL_14 },
      evidence: 'decision',
      changesBlueprint: CHANGES_BLUEPRINT,
    })
    expect(document.changes).toHaveLength(0)
  })

  it('reports a mapping no element carries instead of emitting a no-op change', () => {
    const { document, skipped } = buildLineageChangeset({
      modelId: 'series',
      model: parsed(),
      target: { name: 'coNNtent_V_0-15-0', url: URL_15 },
      mappings: [{ from: 'ghost', to: 'phantom' }],
      evidence: 'decision',
      changesBlueprint: CHANGES_BLUEPRINT,
    })
    expect(document.changes.map((c) => c.op)).toEqual(['repin_blueprint'])
    expect(skipped.join(' ')).toContain('no element carries')
  })

  it('refuses to build without evidence', () => {
    expect(() =>
      buildLineageChangeset({
        modelId: 'series',
        model: parsed(),
        target: { name: 'coNNtent_V_0-15-0', url: URL_15 },
        evidence: '   ',
        changesBlueprint: CHANGES_BLUEPRINT,
      }),
    ).toThrow(/evidence/)
  })

  it('produces changes the engine can apply in order', () => {
    const model = parsed()
    const { document } = buildLineageChangeset({
      modelId: 'series',
      model,
      target: { name: 'coNNtent_V_0-15-0', url: URL_15 },
      mappings: [{ from: 'synopsis', to: 'overview' }],
      evidence: 'decision',
      changesBlueprint: CHANGES_BLUEPRINT,
    })
    for (const change of document.changes) {
      const args =
        change.op === 'repin_blueprint'
          ? { to: change.to, blueprintUrl: change.blueprint_url, from: change.from }
          : change.op === 'rename_field'
            ? { from: change.from, to: change.to }
            : { fieldName: change.name, to: change.to }
      expect(applyMutation(model, change.op, args).success).toBe(true)
    }
    const fm = model.frontmatter as Record<string, any>
    expect(fm.parent_spec.name).toBe('coNNtent_V_0-15-0')
    expect(model.elements.get('Scene')!.every((el) => el.fields.overview !== undefined)).toBe(true)
  })
})
