import { describe, it, expect } from 'vitest'
import { planDomainScaffold, DOMAIN_BLUEPRINT_URL, parseKnowledge, slugify } from '../../src/index.js'

describe('planDomainScaffold', () => {
  const plan = planDomainScaffold({ name: 'ACME Corp' })

  it('lists the canonical folders plus changes/', () => {
    expect(plan.dirs).toEqual([
      'kNNowledge',
      'sources/import',
      'sources/conversations',
      'conversations',
      'artifacts',
      'procedures',
      'staging',
      'changes',
    ])
  })

  it('writes .gitattributes with * -text', () => {
    expect(plan.files.find((f) => f.path === '.gitattributes')?.content).toBe('* -text\n')
  })

  it('writes a domaiNN_NN.md with L3 frontmatter and workspace_id defaulting to slugify(name)', () => {
    const manifest = plan.files.find((f) => f.path === 'domaiNN_NN.md')!
    const parsed = parseKnowledge(manifest.content)
    expect(parsed.frontmatter.level).toBe(3)
    expect(parsed.frontmatter.parent_spec).toEqual({ name: 'domaiNN', url: DOMAIN_BLUEPRINT_URL })
    expect(parsed.frontmatter.knowledge_version).toBe('V_0-1-0')
    expect(parsed.frontmatter.title).toBe('ACME Corp')
    expect((parsed.frontmatter as Record<string, unknown>).workspace_id).toBe(slugify('ACME Corp'))
    expect(plan.workspaceId).toBe(slugify('ACME Corp'))
    expect(manifest.content).not.toContain('> [!NOTE]')
    expect(manifest.content).toContain('# NN index')
  })

  it('lists no kNNowledge or Tags entries', () => {
    const manifest = plan.files.find((f) => f.path === 'domaiNN_NN.md')!.content
    expect(manifest).not.toMatch(/NN kNNowledge/)
    expect(manifest).not.toMatch(/NN Tags/)
  })

  it('an explicit workspace_id wins and quotes in the name are escaped', () => {
    const custom = planDomainScaffold({ name: 'The "Lab"', workspaceId: 'lab-1' })
    const parsed = parseKnowledge(custom.files[0].content)
    expect((parsed.frontmatter as Record<string, unknown>).workspace_id).toBe('lab-1')
    expect(parsed.frontmatter.title).toBe('The "Lab"')
  })
})
