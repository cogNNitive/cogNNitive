import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { initModel } from '../src/tools/mutate'

describe('MCP model repair tools', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'innfo-mcp-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('initModel creates a file with valid YAML frontmatter', async () => {
    const res = await initModel(tempDir, 'arenzano_residential_V_0-5-1_residential', {
      template_name: 'residential_V_0-2-0',
      template_url:
        'https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/latest/level2/residential/residential_NN.md',
      title: 'Arenzano Residential',
      model_version: 'V_0-5-1',
    })

    expect(res.success).toBe(true)
    const content = await readFile(res.filePath, 'utf-8')
    expect(content).toContain('spec_version: "V_0-2-0"')
    expect(content).toContain('model_version: "V_0-5-1"')
    expect(content).toContain('title: "Arenzano Residential"')
    expect(content).toContain('> [!NOTE]')
  })

  it('initModel preserves existing body content when frontmatter is missing', async () => {
    const filePath = join(tempDir, 'broken_model_NN.md')
    await writeFile(filePath, '# NN ConceptA\n## NN ConceptA: Element1\n')

    const res = await initModel(tempDir, 'broken_model', {
      template_name: 'business_V_0-2-0',
      template_url:
        'https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/latest/level2/business/business_NN.md',
    })

    expect(res.success).toBe(true)
    const content = await readFile(res.filePath, 'utf-8')
    expect(content).toContain('spec_version: "V_0-2-0"')
    expect(content).toContain('# NN ConceptA')
    expect(content).toContain('## NN ConceptA: Element1')
  })
})
