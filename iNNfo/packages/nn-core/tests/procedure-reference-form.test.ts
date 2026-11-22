import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseKnowledge, validateDocument } from '../src/index.js'
import type { SpecDocument } from '../src/index.js'

/**
 * procedure-reference-form (backlog b3f): a procedure document writes its
 * structural links in ONE form.
 *
 * `parent::`, `next::` and `output::` are typed `reference` fields of the
 * `procedures` blueprint, so their value is an address — `@<slug>` inside the
 * document — and the wikilink `[[Name]]` form is removed and never resolved by
 * title. The shipped samples already follow that rule
 * (`iNNfo/specs/bluepriNNts/procedures/samples/`), while the shipped coNNtent
 * procedures still wrote `[[Name]]`: every link failed validation, and the
 * console stepper (which stripped `[[...]]`) resolved a form the validator
 * rejects. Both directions are pinned here.
 */

const here = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(here, '..', '..', '..', '..')
const PROCEDURES_DIR = join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts', 'coNNtent', 'procedures')

/** The shipped `procedures` blueprint, read from its source of truth. */
function proceduresTemplate(): SpecDocument {
  const rawContent = readFileSync(
    join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts', 'procedures', 'spec_NN.md'),
    'utf-8',
  )
  return {
    name: 'procedures_V_0-5-1',
    level: 2,
    parentName: 'iNNfo_V_0-5-0',
    frontmatter: parseKnowledge(rawContent).frontmatter,
    rawContent,
  }
}

/** Parse one shipped coNNtent procedure document and validate it against the blueprint. */
function validateProcedureDoc(fileName: string) {
  const path = join(PROCEDURES_DIR, fileName)
  return validateDocument(readFileSync(path, 'utf-8'), {
    fileName,
    template: proceduresTemplate(),
    referringPath: path,
  })
}

const SHIPPED = [
  'usage_procedures_NN.md',
  'create_series_procedures_NN.md',
  'create_character_procedures_NN.md',
  'configure_cascade_procedures_NN.md',
  'draft_scene_visuals_procedures_NN.md',
  'produce_video_procedures_NN.md',
]

/** The three typed reference fields a procedure document links its Work elements with. */
const REFERENCE_FIELDS = ['parent', 'next', 'output'] as const

/**
 * A minimal procedure document: one procedure, two steps and the artifact it
 * ends in. `link` fills the three reference fields under test.
 */
function fixture(link: { parent: string; next: string; output: string }): string {
  return [
    '---',
    'level: 3',
    'parent_spec:',
    '  name: "procedures_V_0-5-1"',
    '  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md"',
    'knowledge_version: "V_0-1-0"',
    'title: "Reference Form Fixture"',
    '---',
    '',
    '# NN Work',
    '',
    '## NN Work: Assemble the Fixture',
    'slug:: assemble-the-fixture',
    'step_type:: task',
    'level:: domaiNN',
    `output:: ${link.output}`,
    'scope:: internal',
    'Assemble every part of the fixture.',
    '',
    '## NN Work: Check the fixture',
    'slug:: check-the-fixture',
    `parent:: ${link.parent}`,
    `next:: ${link.next}`,
    'step_type:: decision',
    'tool:: human',
    'decision:: accept the fixture or send it back',
    'scope:: internal',
    'The single human gate of the fixture.',
    '',
    '## NN Work: Accept the fixture',
    'slug:: accept-the-fixture',
    `parent:: ${link.parent}`,
    'step_type:: event',
    'tool:: agent',
    'produces:: the accepted fixture',
    'scope:: internal',
    'The last step of the fixture.',
    '',
    '# NN Artifact',
    '',
    '## NN Artifact: Fixture Bundle',
    'slug:: fixture-bundle',
    '',
  ].join('\n')
}

function validateFixture(link: { parent: string; next: string; output: string }) {
  return validateDocument(fixture(link), {
    fileName: 'fixture_NN.md',
    template: proceduresTemplate(),
    referringPath: join(PROCEDURES_DIR, 'fixture_NN.md'),
  })
}

describe('procedure references: the address form is the one accepted form', () => {
  it('accepts `@<slug>` in parent::, next:: and output:: and resolves it', () => {
    const result = validateFixture({
      parent: '@assemble-the-fixture',
      next: '@accept-the-fixture',
      output: '@fixture-bundle',
    })
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('rejects the removed `[[Name]]` form on every one of the three fields', () => {    const result = validateFixture({
      parent: '[[Assemble the Fixture]]',
      next: '[[Accept the Fixture]]',
      output: '[[Fixture Bundle]]',
    })
    expect(result.valid).toBe(false)
    const malformed = result.errors.filter((error) => error.code === 'ADDRESS_MALFORMED')
    expect(malformed.map((error) => error.path).sort()).toEqual(
      [
        'elements.Work.Assemble the Fixture.fields.output',
        'elements.Work.Accept the fixture.fields.parent',
        'elements.Work.Check the fixture.fields.next',
        'elements.Work.Check the fixture.fields.parent',
      ].sort(),
    )
    // The message names the removal and the form to write instead.
    for (const error of malformed) {
      expect(error.message).toContain('wikilink')
      expect(error.message).toContain('@<slug>')
    }
  })
})

describe('procedure references: the shipped coNNtent procedures agree on it', () => {
  it.each(SHIPPED)('%s validates with zero errors', (fileName) => {
    const result = validateProcedureDoc(fileName)
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it.each(SHIPPED)('%s writes every Work reference as an address, never a wikilink', (fileName) => {
    const text = readFileSync(join(PROCEDURES_DIR, fileName), 'utf-8')
    const offenders: string[] = []
    let element = '(document)'
    text.split(/\r?\n/).forEach((line, index) => {
      const heading = line.match(/^#{2,6}\s+NN\s+(?:[^:]+):\s*(.+?)\s*$/)
      if (heading) element = heading[1].trim()
      const field = line.match(/^([a-z_]+)::\s*(.*)$/)
      if (!field) return
      if (!(REFERENCE_FIELDS as readonly string[]).includes(field[1])) return
      const value = field[2].trim()
      if (!value) return
      if (!value.startsWith('@') || value.includes('[[')) {
        offenders.push(`${fileName}:${index + 1} — ${element}.${field[1]} = ${value}`)
      }
    })
    expect(offenders).toEqual([])
  })
})
