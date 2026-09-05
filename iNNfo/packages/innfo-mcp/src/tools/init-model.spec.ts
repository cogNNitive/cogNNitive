import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { initModel } from './init-model'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-init-model')
const specsDir = join(rootDir, 'specs')

const TEMPLATE_URL = 'https://example.com/business_V_0-2-0_NN.md'
const TEMPLATE_NAME = 'business_V_0-2-0'

/** Write the level-1 + level-0 spec chain locally so resolution never hits the network. */
async function stubSpecChain() {
  await writeFile(
    join(specsDir, 'iNNfo_V_0-1-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-1-0"',
      'level: 1',
      'title: "Local iNNfo Spec"',
      'parent_spec:',
      '  name: "defiNNe_V_0-1-0"',
      '  url: "https://example.com/defiNNe_V_0-1-0_NN.md"',
      '---',
    ].join('\n'),
    'utf-8',
  )
  await writeFile(
    join(specsDir, 'defiNNe_V_0-1-0_NN.md'),
    ['---', 'spec_version: "V_0-1-0"', 'level: 0', 'title: "Local defiNNe Spec"', '---'].join('\n'),
    'utf-8',
  )
}

/** Write a level-2 business template (declaring a "Work" list concept), resolvable
 * locally by `resolveTemplateWithCache` without any network I/O. */
async function stubBusinessTemplate() {
  await writeFile(
    join(specsDir, 'business_V_0-2-0_NN.md'),
    [
      '---',
      'spec_version: "V_0-2-0"',
      'level: 2',
      'title: "Local Business Template"',
      'parent_spec:',
      '  name: "iNNfo_V_0-1-0"',
      '  url: "https://example.com/iNNfo_V_0-1-0_NN.md"',
      '---',
      '',
      '# NN Concept Definition',
      '',
      '## NN Concept Definition: Work',
      'type:: list',
      '',
    ].join('\n'),
    'utf-8',
  )
  await stubSpecChain()
}

describe('initModel', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    vi.restoreAllMocks()
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('creates a new model file with frontmatter and a body scaffolded from the resolved template', async () => {
    await stubBusinessTemplate()

    const result = await initModel(rootDir, 'NewModel', {
      template_url: TEMPLATE_URL,
      template_name: TEMPLATE_NAME,
      title: 'New Model',
    })

    expect(result.success).toBe(true)
    expect(result.templateResolved).toBe(true)
    expect(result.scaffolded).toBe(true)
    expect(result.filePath).toBe(join(rootDir, 'NewModel_NN.md'))

    expect(result.content).toContain('parent_spec:')
    expect(result.content).toContain(`name: "${TEMPLATE_NAME}"`)
    expect(result.content).toContain(`url: "${TEMPLATE_URL}"`)
    expect(result.content).toContain('title: "New Model"')
    expect(result.content).toContain('# NN Work')
    expect(result.content).toContain('## NN Work: Example Work')

    const onDisk = await readFile(result.filePath, 'utf-8')
    expect(onDisk).toBe(result.content)
  })

  it('writes frontmatter without scaffolding a body when the template cannot be resolved', async () => {
    const result = await initModel(rootDir, 'Orphan', {
      template_url: TEMPLATE_URL,
      template_name: TEMPLATE_NAME,
    })

    expect(result.success).toBe(true)
    expect(result.templateResolved).toBe(false)
    expect(result.scaffolded).toBe(false)
    expect(result.warnings.some((w) => /template resolution failed/i.test(w))).toBe(true)

    expect(result.content).toContain(`name: "${TEMPLATE_NAME}"`)
    expect(result.content).not.toContain('# NN Work')

    const onDisk = await readFile(result.filePath, 'utf-8')
    expect(onDisk).toBe(result.content)
  })

  it('preserves an existing body that already has concept sections instead of re-scaffolding it', async () => {
    await stubBusinessTemplate()
    const filePath = join(rootDir, 'Existing_NN.md')
    await writeFile(
      filePath,
      [
        '---',
        'title: "Old Title"',
        '---',
        '',
        '# NN Work',
        '## NN Work: PreExisting',
        '',
      ].join('\n'),
      'utf-8',
    )

    const result = await initModel(rootDir, 'Existing', {
      template_url: TEMPLATE_URL,
      template_name: TEMPLATE_NAME,
    })

    expect(result.success).toBe(true)
    expect(result.templateResolved).toBe(true)
    expect(result.scaffolded).toBe(false)
    expect(result.filePath).toBe(filePath)
    expect(result.content).toContain('PreExisting')
    expect(result.content).not.toContain('Example Work')

    const onDisk = await readFile(filePath, 'utf-8')
    expect(onDisk).toBe(result.content)
  })
})
