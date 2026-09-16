import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { applyChange } from '../src/tools/mutate.js'
import { pruneOrphanedSpecs } from '../src/tools/reachability.js'
import { listTemplateProcedures, listTemplateSkills } from '../src/tools/spec.js'

const rootDir = join(import.meta.dirname!, '..', 'temp-test-coverage-expansion')
const specsDir = join(rootDir, 'specs')
const modelsDir = join(rootDir, 'models')

describe('MCP coverage expansion suite', () => {
  const origCache = process.env.INNFO_CACHE_DIR

  beforeEach(async () => {
    process.env.INNFO_CACHE_DIR = join(rootDir, 'isolated-cache')
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    await mkdir(modelsDir, { recursive: true })
    vi.restoreAllMocks()
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
  })

  afterEach(async () => {
    if (origCache !== undefined) process.env.INNFO_CACHE_DIR = origCache
    else delete process.env.INNFO_CACHE_DIR
    await rm(rootDir, { recursive: true, force: true })
  })

  it('applyChange: bump_version with parent_version renames local parent template', async () => {
    // 1. Setup local parent template
    const templatePath = join(specsDir, 'my_template_V_0-1-0_NN.md')
    await writeFile(
      templatePath,
      [
        '---',
        'spec_version: "V_0-1-0"',
        'level: 2',
        'title: "My Template"',
        'parent_spec:',
        '  name: "iNNfo_V_0-1-0"',
        '  url: "specs/iNNfo_V_0-1-0_NN.md"',
        '---',
        '',
        '# NN Concept Definition',
        '## NN Concept Definition: Task',
        'type:: list',
        '',
      ].join('\n'),
      'utf-8',
    )

    // Stub level 1 + 0 chain
    await writeFile(
      join(specsDir, 'iNNfo_V_0-1-0_NN.md'),
      '---\nspec_version: "V_0-1-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNe_V_0-1-0"\n  url: "specs/defiNNe_V_0-1-0_NN.md"\n---\n',
      'utf-8',
    )
    await writeFile(
      join(specsDir, 'defiNNe_V_0-1-0_NN.md'),
      '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNe"\n---\n',
      'utf-8',
    )

    // 2. Setup model pointing to local template
    const modelPath = join(modelsDir, 'my_model_V_0-1-0_my_template_NN.md')
    await writeFile(
      modelPath,
      [
        '---',
        'spec_version: "V_0-1-0"',
        'level: 3',
        'model_version: "V_0-1-0"',
        'title: "My Model"',
        'parent_spec:',
        '  name: "my_template_V_0-1-0"',
        '  url: "specs/my_template_V_0-1-0_NN.md"',
        '---',
        '',
        '# NN index',
        '* [[Task]]',
        '',
        '# NN Task',
        '## NN Task: Alpha',
        '  Task Alpha',
        '',
      ].join('\n'),
      'utf-8',
    )

    // Bump model to 0.2.0 and parent to 0.2.0
    const res = await applyChange(rootDir, 'my_model_V_0-1-0_my_template', 'bump_version', {
      version: '0.2.0',
      parent_version: '0.2.0',
    })

    expect(res.success).toBe(true)
    const newTemplatePath = join(specsDir, 'my_template_V_0-2-0_NN.md')
    const tStat = await stat(newTemplatePath)
    expect(tStat.isFile()).toBe(true)

    const updatedParentContent = await readFile(newTemplatePath, 'utf-8')
    expect(updatedParentContent).toContain('spec_version: "V_0-2-0"')
  })

  it('applyChange: rename_element renames associated asset directory if present', async () => {
    // Stub spec chain and template
    await writeFile(
      join(specsDir, 'iNNfo_V_0-1-0_NN.md'),
      '---\nspec_version: "V_0-1-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNe_V_0-1-0"\n  url: "specs/defiNNe_V_0-1-0_NN.md"\n---\n',
      'utf-8',
    )
    await writeFile(
      join(specsDir, 'defiNNe_V_0-1-0_NN.md'),
      '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNe"\n---\n',
      'utf-8',
    )
    await writeFile(
      join(specsDir, 't_V_0-1-0_NN.md'),
      [
        '---',
        'spec_version: "V_0-1-0"',
        'level: 2',
        'title: "T"',
        'parent_spec:',
        '  name: "iNNfo_V_0-1-0"',
        '  url: "specs/iNNfo_V_0-1-0_NN.md"',
        '---',
        '',
        '# NN Concept Definition',
        '## NN Concept Definition: Item',
        'type:: list',
        '',
      ].join('\n'),
      'utf-8',
    )

    const modelPath = join(modelsDir, 'm_V_0-1-0_t_NN.md')
    await writeFile(
      modelPath,
      [
        '---',
        'spec_version: "V_0-1-0"',
        'level: 3',
        'model_version: "V_0-1-0"',
        'title: "M"',
        'parent_spec:',
        '  name: "t_V_0-1-0"',
        '  url: "specs/t_V_0-1-0_NN.md"',
        '---',
        '',
        '# NN index',
        '* [[Item]]',
        '',
        '# NN Item',
        '## NN Item: Original',
        '  Content',
        '',
      ].join('\n'),
      'utf-8',
    )

    // Create assets/original directory
    const oldAssetDir = join(modelsDir, 'assets', 'original')
    await mkdir(oldAssetDir, { recursive: true })
    await writeFile(join(oldAssetDir, 'data.txt'), 'hello', 'utf-8')

    const res = await applyChange(rootDir, 'm_V_0-1-0_t', 'rename_element', {
      conceptName: 'Item',
      elementName: 'Original',
      newName: 'Renamed',
    })

    expect(res.success).toBe(true)
    const newAssetDir = join(modelsDir, 'assets', 'renamed')
    const st = await stat(newAssetDir)
    expect(st.isDirectory()).toBe(true)
  })

  it('pruneOrphanedSpecs: handles 0 orphaned specs cleanly and dry_run / live prune', async () => {
    // 0 specs -> 0 orphaned
    const resEmpty = await pruneOrphanedSpecs(rootDir)
    expect(resEmpty.success).toBe(true)
    expect(resEmpty.orphanedCount).toBe(0)
    expect(resEmpty.message).toBe('No orphaned specs found.')

    // Add orphaned spec
    const orphanPath = join(specsDir, 'orphan_V_0-1-0_NN.md')
    await writeFile(orphanPath, '---\nspec_version: "V_0-1-0"\nlevel: 2\n---\n', 'utf-8')

    // Dry run
    const resDry = await pruneOrphanedSpecs(rootDir, { dry_run: true })
    expect(resDry.success).toBe(true)
    expect(resDry.dryRun).toBe(true)
    expect(resDry.orphanedCount).toBe(1)

    // Live prune
    const resLive = await pruneOrphanedSpecs(rootDir, { dry_run: false, backup: true })
    expect(resLive.success).toBe(true)
    expect(resLive.dryRun).toBe(false)
    expect(resLive.orphanedCount).toBe(1)
  })

  it('spec.ts: discoverTransitiveAssets traverses parent_spec and includes', async () => {
    // Create template with procedures and parent_spec
    const basePkgDir = join(specsDir, 'templates', 'base', '0.1.0')
    await mkdir(join(basePkgDir, 'procedures'), { recursive: true })
    await writeFile(
      join(basePkgDir, 'spec_NN.md'),
      [
        '---',
        'spec_version: "V_0-1-0"',
        'level: 2',
        'title: "Base"',
        'procedures:',
        '  - id: "p1"',
        '    name: "Proc 1"',
        '    path: "procedures/p1_V_0-1-0_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )
    await writeFile(
      join(basePkgDir, 'procedures', 'p1_V_0-1-0_NN.md'),
      '---\nspec_version: "V_0-1-0"\nlevel: 2\ntitle: "Proc 1"\n---\n',
      'utf-8',
    )

    const childPkgDir = join(specsDir, 'templates', 'child', '0.1.0')
    await mkdir(childPkgDir, { recursive: true })
    await writeFile(
      join(childPkgDir, 'spec_NN.md'),
      [
        '---',
        'spec_version: "V_0-1-0"',
        'level: 2',
        'title: "Child"',
        'parent_spec:',
        '  name: "base"',
        '  url: "specs/templates/base/0.1.0/spec_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )

    const procs = await listTemplateProcedures(rootDir, { template_name: 'child' })
    expect(procs.procedures.length).toBeGreaterThan(0)
    expect(procs.procedures.some((p) => p.name.includes('Proc 1'))).toBe(true)

    const skills = await listTemplateSkills(rootDir, { template_name: 'child' })
    expect(Array.isArray(skills.skills)).toBe(true)
  })
})
