import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { parseKnowledge } from '../../src/parser/index'
import { findCanonicalBlueprint } from '../../src/schema'

const REPO_ROOT = path.resolve(__dirname, '../../../../..')
const SPEC_PATH = path.join(REPO_ROOT, 'iNNfo/specs/bluepriNNts/sidecar/spec_NN.md')

function namesOf(parsed: ReturnType<typeof parseKnowledge>, element: string): string[] {
  const nodes = parsed.elements.get(`NN ${element}`) ?? parsed.elements.get(element) ?? []
  return nodes.map((n) => n.name)
}

function read(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8')
}

describe('sidecar bluepriNNt', () => {
  it('is a Level 2 bluepriNNt conforming to the iNNfo meta-spec', () => {
    const fm = parseKnowledge(fs.readFileSync(SPEC_PATH, 'utf-8')).frontmatter as Record<string, any>
    expect(fm.level).toBe(2)
    expect(fm.parent_spec?.name).toBe('iNNfo_V_0-5-0')
    expect(fm.blueprint_version).toMatch(/^V_\d+-\d+-\d+$/)
    expect(fm.spec_url).toContain('/bluepriNNts/sidecar/spec_NN.md')
    expect(fm.title).toBe('Sidecar App')
  })

  it('defines the Sidecar concept with every sidecar field', () => {
    const parsed = parseKnowledge(fs.readFileSync(SPEC_PATH, 'utf-8'))
    const concepts = namesOf(parsed, 'Concept Definition')
    expect(concepts).toEqual(['Sidecar'])

    const fields = namesOf(parsed, 'Field Definition')
    for (const name of [
      'source_file',
      'sha256',
      'size_bytes',
      'source_format',
      'normalized_at',
      'normalized_by',
      'sources',
    ]) {
      expect(fields).toContain(name)
    }
  })

  it('never lets a sidecar declare derived_from (its upstream edge is sources)', () => {
    const parsed = parseKnowledge(fs.readFileSync(SPEC_PATH, 'utf-8'))
    const fields = namesOf(parsed, 'Field Definition')
    expect(fields).not.toContain('derived_from')
  })

  it('documents the Level 3 frontmatter: level 3 and parent_spec.name sidecar', () => {
    const text = fs.readFileSync(SPEC_PATH, 'utf-8')
    expect(text).toMatch(/level: 3\n\s*parent_spec:\n\s*name: "sidecar"/)
  })

  it('is registered in manifest/source.yaml, the canonical registry, the catalog, and vocabulary.json', () => {
    expect(read('manifest/source.yaml')).toMatch(/- name: sidecar\n\s+repo: [^\n]+\n\s+path: iNNfo\/specs\/bluepriNNts\/sidecar\/spec_NN\.md/)

    const catalog = JSON.parse(read('iNNfo/specs/bluepriNNts/catalog.json'))
    expect(Object.keys(catalog.blueprints)).toContain('sidecar')

    const vocabulary = JSON.parse(read('iNNfo/specs/vocabulary.json'))
    const serialized = JSON.stringify(vocabulary)
    expect(serialized).toContain('"sidecar"')
    expect(serialized).toContain('"cognitivize"')
  })

  it('resolves the name sidecar to the sidecar bluepriNNt and not to sources', () => {
    const bp = findCanonicalBlueprint('sidecar')
    expect(bp?.name).toBe('sidecar')
    expect(findCanonicalBlueprint('sources')?.name).toBe('sources')
    expect(bp?.specContent).toBe(fs.readFileSync(SPEC_PATH, 'utf-8'))
  })
})
