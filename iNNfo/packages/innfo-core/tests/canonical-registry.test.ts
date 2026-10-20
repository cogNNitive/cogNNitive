import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  findCanonicalBlueprint,
  getCanonicalSpecContent,
  listCanonicalBlueprints,
  CANONICAL_BLUEPRINTS,
  resolveBlueprintSchema,
  extractMetaschema,
  validateBlueprintAgainstMetaschema,
} from '../src/index'

const specsRoot = join(import.meta.dirname!, '..', '..', '..', 'specs')

/**
 * Extracts `name=type` for every Field Definition. Asserting on the pair (not
 * just the name) is what makes the mirror guard catch a semantic change such
 * as `derived_from_inputs`/`string` -> `sources`/`citation`, not only a rename.
 */
const fieldNameTypes = (content: string): string[] => {
  const lines = content.split(/\r?\n/)
  const pairs: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].match(/^## NN Field Definition: (.+)$/)
    if (!header) continue
    let type = '<none>'
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const match = lines[j].match(/^type:: (.+)$/)
      if (match) {
        type = match[1].trim()
        break
      }
      if (lines[j].startsWith('## NN Field Definition:')) break
    }
    pairs.push(`${header[1].trim()}=${type}`)
  }
  return pairs
}

describe('Canonical Template Registry & Offline Fallback', () => {
  it('bundles exactly the L0/L1 specs and the 7 Core Level 2 blueprints', () => {
    const templates = listCanonicalBlueprints()
    const names = templates.map((t) => t.name)

    for (const core of ['domaiNN', 'changes', 'sidecar', 'sources', 'artifacts', 'procedures', 'blank']) {
      expect(names, `${core} must be bundled`).toContain(core)
    }
    expect(names).toContain('defiNNition')
    expect(names).toContain('innfo')

    for (const removed of ['business', 'business-model', 'organization', 'metrics', 'workspace', 'cogNNitive', 'analysis', 'projects']) {
      expect(names, `${removed} must NOT be bundled`).not.toContain(removed)
    }
  })

  it('resolves templates by exact canonical name', () => {
    const domann = findCanonicalBlueprint('domaiNN')
    expect(domann).not.toBeNull()
    expect(domann?.name).toBe('domaiNN')

    const blank = findCanonicalBlueprint('blank')
    expect(blank).not.toBeNull()
    expect(blank?.name).toBe('blank')

    const proc = findCanonicalBlueprint('procedures')
    expect(proc).not.toBeNull()
    expect(proc?.name).toBe('procedures')

    const changes = findCanonicalBlueprint('changes')
    expect(changes).not.toBeNull()
    expect(changes?.name).toBe('changes')

    const sc = findCanonicalBlueprint('sidecar')
    expect(sc).not.toBeNull()
    expect(sc?.name).toBe('sidecar')
  })

  it('resolves templates by shorthand spec name aliases', () => {
    expect(findCanonicalBlueprint('domaiNN_spec_NN')?.name).toBe('domaiNN')
    expect(findCanonicalBlueprint('domaiNN_V_0-4-0_NN.md')?.name).toBe('domaiNN')
    expect(findCanonicalBlueprint('blank_spec_NN')?.name).toBe('blank')
    expect(findCanonicalBlueprint('procedures_spec_NN')?.name).toBe('procedures')
    expect(findCanonicalBlueprint('sidecar_spec_NN')?.name).toBe('sidecar')
    expect(findCanonicalBlueprint('changes_spec_NN')?.name).toBe('changes')
  })

  it('resolves templates by remote raw GitHub URLs', () => {
    const url =
      'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md'
    const template = findCanonicalBlueprint(url)
    expect(template).not.toBeNull()
    expect(template?.name).toBe('domaiNN')

    const blankUrl =
      'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/blank/spec_NN.md'
    expect(findCanonicalBlueprint(blankUrl)?.name).toBe('blank')
  })

  it('returns null for removed vertical blueprint identifiers', () => {
    expect(findCanonicalBlueprint('business')).toBeNull()
    expect(findCanonicalBlueprint('organization')).toBeNull()
    expect(findCanonicalBlueprint('metrics')).toBeNull()
    expect(findCanonicalBlueprint('workspace')).toBeNull()
    expect(findCanonicalBlueprint('cogNNitive')).toBeNull()
  })

  it('returns valid spec content for offline parsing', () => {
    const content = getCanonicalSpecContent('procedures')
    expect(content).not.toBeNull()
    expect(content).toContain('# NN Concept Definition')
    expect(content).toContain('## NN Concept Definition: Work')

    const schema = resolveBlueprintSchema(content!, () => null)
    expect(schema.schema.concepts.map((c) => c.name)).toEqual(
      expect.arrayContaining(['Work', 'Artifact', 'Tools', 'Roles']),
    )
  })

  it('returns null for unknown template identifiers', () => {
    expect(findCanonicalBlueprint('completely_unknown_template_xyz')).toBeNull()
    expect(getCanonicalSpecContent('')).toBeNull()
  })

  it('resolves the new V_0-2-2 core-language aliases', () => {
    const url =
      'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-2-2_NN.md'

    expect(findCanonicalBlueprint('iNNfo_V_0-2-2_NN')?.name).toBe('innfo')
    expect(findCanonicalBlueprint('innfo_v_0-2-2')?.name).toBe('innfo')
    expect(findCanonicalBlueprint('specs/iNNfo_V_0-2-2_NN.md')?.name).toBe('innfo')
    expect(findCanonicalBlueprint(url)?.name).toBe('innfo')
  })

  it('resolves defiNNition (Level 0) and iNNfo V_0-3-0 (Level 1) canonical identities', () => {
    const defUrl =
      'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/defiNNition_V_0-1-0_NN.md'
    const def = findCanonicalBlueprint('defiNNition')
    expect(def).not.toBeNull()
    expect(def?.name).toBe('defiNNition')
    expect(findCanonicalBlueprint('defiNNition_V_0-1-0_NN')?.name).toBe('defiNNition')
    expect(findCanonicalBlueprint('specs/defiNNition_V_0-1-0_NN.md')?.name).toBe('defiNNition')
    expect(findCanonicalBlueprint(defUrl)?.name).toBe('defiNNition')

    const innfoUrl =
      'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md'
    const innfo5 = findCanonicalBlueprint('iNNfo_V_0-5-0_NN')
    expect(innfo5).not.toBeNull()
    expect(innfo5?.name).toBe('innfo')
    expect(findCanonicalBlueprint('innfo_v_0-5-0')?.name).toBe('innfo')
    expect(findCanonicalBlueprint('specs/iNNfo_V_0-5-0_NN.md')?.name).toBe('innfo')
    expect(findCanonicalBlueprint(innfoUrl)?.name).toBe('innfo')
  })

  it('verifies iNNfo V_0-5-0 parent points to defiNNition on main', () => {
    const content = getCanonicalSpecContent('iNNfo_V_0-5-0_NN')
    expect(content).not.toBeNull()
    expect(content).toContain('spec_version: "V_0-5-0"')
    expect(content).toContain(
      'parent: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/defiNNition_V_0-1-0_NN.md"',
    )
  })

  it('verifies iNNfo V_0-5-0 defines knowledge and blueprint keys and types', () => {
    const content = getCanonicalSpecContent('iNNfo_V_0-5-0_NN')!
    expect(content).not.toBeNull()
    expect(content).toContain('knowledge_version')
    expect(content).toContain('blueprint_version')
    expect(content).toContain('blueprint_name')
    expect(content).toContain('knowledge_dir')
    expect(content).toContain('blueprints_dir')
    expect(content).toContain('target_blueprint')
    expect(content).toContain('knowledge')
  })

  it('does not truncate or mis-split names with embedded NN token', () => {
    const def = findCanonicalBlueprint('defiNNition_V_0-1-0_NN.md')
    expect(def).not.toBeNull()
    expect(def?.name).toBe('defiNNition')
  })

  it('returns null for unregistered _V_ spec files', () => {
    expect(findCanonicalBlueprint('unregistered_spec_V_9-9-9_NN.md')).toBeNull()
    expect(findCanonicalBlueprint('custom_template_V_8-8-8_NN.md')).toBeNull()
  })

  it('mirrors on-disk defiNNition and iNNfo V_0-5-0 specs byte-for-byte in canonical registry', () => {
    const defDisk = readFileSync(join(specsRoot, 'defiNNition_V_0-1-0_NN.md'), 'utf-8')
    const defMirror = getCanonicalSpecContent('defiNNition')!
    expect(defMirror).toBe(defDisk)

    const innfoDisk = readFileSync(join(specsRoot, 'iNNfo_V_0-5-0_NN.md'), 'utf-8')
    const innfoMirror = getCanonicalSpecContent('innfo')!
    expect(innfoMirror).toBe(innfoDisk)
  })

  it('mirrors the domaiNN, blank and artifacts templates without drift', () => {
    for (const [template, specPath] of [
      ['domaiNN', 'bluepriNNts/domaiNN/spec_NN.md'],
      ['blank', 'bluepriNNts/blank/spec_NN.md'],
      ['artifacts', 'bluepriNNts/artifacts/spec_NN.md'],
    ] as const) {
      const disk = readFileSync(join(specsRoot, specPath), 'utf-8')
      const mirror = getCanonicalSpecContent(template)!

      expect(mirror, `${template} mirror exists`).not.toBeNull()
      expect(mirror, `${template} mirror carries a V_0 spec_version`).toContain('spec_version: "V_0-')
      expect(fieldNameTypes(mirror), `${template} field name=type drift`).toEqual(
        fieldNameTypes(disk),
      )
    }
  })

  it('resolves canonical blueprint for changes and compiles valid schema', () => {
    const changesBp = findCanonicalBlueprint('changes')
    expect(changesBp).not.toBeNull()
    expect(changesBp?.name).toBe('changes')

    expect(findCanonicalBlueprint('changes_V_0-1-0_NN.md')?.name).toBe('changes')
    expect(findCanonicalBlueprint('changes_spec_NN')?.name).toBe('changes')
    expect(findCanonicalBlueprint('changes_v_0-1-0')?.name).toBe('changes')
    expect(findCanonicalBlueprint('specs/bluepriNNts/changes/spec_NN.md')?.name).toBe('changes')

    const content = getCanonicalSpecContent('changes')
    expect(content).not.toBeNull()
    expect(content).toContain('blueprint_name: "changes"')
    const changesDisk = readFileSync(join(specsRoot, 'bluepriNNts/changes/spec_NN.md'), 'utf-8')
    expect(content).toBe(changesDisk)

    const resolved = resolveBlueprintSchema(content!, () => null)
    expect(resolved.schema.concepts.map((c) => c.name)).toContain('Change')

    const changeConcept = resolved.schema.concepts.find((c) => c.name === 'Change')
    expect(changeConcept).toBeDefined()
    const fieldNames = changeConcept?.fields.map((f) => f.name) ?? []
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        'op',
        'target',
        'from',
        'to',
        'concept',
        'name',
        'slug',
        'fields',
        'author',
        'notes',
        'status',
        'resolution',
        'resolved_slug',
      ]),
    )
  })

  it('resolves iNNfo V_0-5-0 offline from canonical registry and validates against itself', () => {
    const innfoUrl =
      'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md'
    const innfo5 = findCanonicalBlueprint('iNNfo_V_0-5-0_NN')
    expect(innfo5).not.toBeNull()
    expect(innfo5?.name).toBe('innfo')
    expect(findCanonicalBlueprint('innfo_v_0-5-0')?.name).toBe('innfo')
    expect(findCanonicalBlueprint('specs/iNNfo_V_0-5-0_NN.md')?.name).toBe('innfo')
    expect(findCanonicalBlueprint(innfoUrl)?.name).toBe('innfo')

    const content = getCanonicalSpecContent('iNNfo_V_0-5-0_NN')
    expect(content).not.toBeNull()
    expect(content).toContain('spec_version: "V_0-5-0"')

    // Offline L2 parent_spec resolution test: an L2 whose parent_spec is iNNfo_V_0-5-0 resolves offline
    const l2Spec = [
      '---',
      'spec_version: "V_0-5-0"',
      'level: 2',
      'parent_spec:',
      '  name: "iNNfo_V_0-5-0"',
      '  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md"',
      'title: "Sample L2"',
      '---',
      '',
      '# NN Concept Definition',
      '## NN Concept Definition: Task',
      'type:: list',
      '',
    ].join('\n')

    const resolvedParent = findCanonicalBlueprint('iNNfo_V_0-5-0')
    expect(resolvedParent).not.toBeNull()
    expect(resolvedParent?.specContent).toBe(content)

    // Metaschema self-description (fixpoint)
    const meta = extractMetaschema(content!)
    expect(meta).not.toBeNull()
    const asTemplate = ['---', 'level: 2', 'title: Metaschema', '---', '', meta!, ''].join('\n')
    const diags = validateBlueprintAgainstMetaschema(asTemplate, content!)
    expect(diags.filter((d) => d.severity === 'error')).toEqual([])
  })
})


