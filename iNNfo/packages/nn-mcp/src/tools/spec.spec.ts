import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join, isAbsolute, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { rm, mkdir, writeFile, stat } from 'node:fs/promises'
import {
  getSpec,
  getBlueprintFromUrl,
  getBlueprintFromModel,
  listBlueprints,
  hydrateBlueprint,
  listBlueprintProcedures,
  listBlueprintSkills,
  findKnowledgeFile,
  deriveNameFromUrl,
} from './spec'
import { validateKnowledge, validateBlueprint } from './mutate'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-spec')
const specsDir = join(rootDir, 'specs')

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

/** Write a level-2 template resolving up to the stubbed level-1 chain. */
async function stubTemplateChain() {
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
    ].join('\n'),
    'utf-8',
  )
  await stubSpecChain()
}

describe('Spec Tools Integration (URL- and model-derived, no hardcoding)', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('getSpec resolves from an explicit url (level-1), no fetch when local', async () => {
    await stubSpecChain()
    const fetchSpy = vi.spyOn(global, 'fetch')

    const { spec } = await getSpec(rootDir, {
      url: 'https://example.com/iNNfo_V_0-1-0_NN.md',
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(spec).not.toBeNull()
    expect(spec?.level).toBe(1)
    expect(spec?.frontmatter.title).toBe('Local iNNfo Spec')
  })

  it('getSpec derives the url from a loaded model_id via parent_spec.url', async () => {
    await stubTemplateChain()
    await writeFile(
      join(rootDir, 'MyModel_V_1-0-0_business_NN.md'),
      [
        '---',
        'spec_version: "V_0-2-0"',
        'level: 3',
        'knowledge_version: "V_1-0-0"',
        'parent_spec:',
        '  name: "business_V_0-2-0"',
        '  url: "https://example.com/business_V_0-2-0_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )
    const fetchSpy = vi.spyOn(global, 'fetch')

    const { spec } = await getSpec(rootDir, { modelId: 'MyModel_V_1-0-0_business' })

    expect(fetchSpy).not.toHaveBeenCalled()
    // get_spec always returns the level-1 iNNfo spec from the resolved chain
    expect(spec?.level).toBe(1)
    expect(spec?.frontmatter.title).toBe('Local iNNfo Spec')
  })

  it('getSpec with neither url nor model_id returns null without fetching', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    const { spec, specCache } = await getSpec(rootDir, {})

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(spec).toBeNull()
    expect(specCache).toBeNull()
  })

  it('getBlueprintFromUrl resolves a template from an explicit url', async () => {
    await stubTemplateChain()
    const fetchSpy = vi.spyOn(global, 'fetch')

    const template = await getBlueprintFromUrl(
      rootDir,
      'https://example.com/business_V_0-2-0_NN.md',
      'business_V_0-2-0',
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(template).not.toBeNull()
    expect(template?.frontmatter.title).toBe('Local Business Template')
  })

  it('getBlueprintFromModel derives the template from a model parent_spec.url', async () => {
    await stubTemplateChain()
    await writeFile(
      join(rootDir, 'MyModel_V_1-0-0_business_NN.md'),
      [
        '---',
        'spec_version: "V_0-2-0"',
        'level: 3',
        'parent_spec:',
        '  name: "business_V_0-2-0"',
        '  url: "https://example.com/business_V_0-2-0_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )
    const fetchSpy = vi.spyOn(global, 'fetch')

    const template = await getBlueprintFromModel(rootDir, 'MyModel_V_1-0-0_business')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(template?.frontmatter.title).toBe('Local Business Template')
  })

  it('getBlueprintFromModel returns null when the model has no parent_spec.url', async () => {
    await writeFile(
      join(rootDir, 'Orphan_NN.md'),
      ['---', 'spec_version: "V_0-2-0"', 'level: 3', 'title: "Orphan"', '---'].join('\n'),
      'utf-8',
    )
    const template = await getBlueprintFromModel(rootDir, 'Orphan')
    expect(template).toBeNull()
  })

  it('validateKnowledge without a resolvable parent_spec.url validates structurally with a warning', async () => {
    const content = [
      '---',
      'spec_version: "V_0-2-0"',
      'level: 3',
      'title: "No Parent Model"',
      '---',
      '',
      '> [!NOTE]',
      '> iNNfo document.',
      '',
      '# _NN index',
    ].join('\n')

    const result = await validateKnowledge(rootDir, undefined, content)

    expect(result.warnings.some((w) => /no template resolved/i.test(w.message))).toBe(true)
  })

  it('listBlueprints discovers templates across workspace, global, and skill stores', async () => {
    const globalDir = join(rootDir, 'global_templates')
    const skillsDir = join(rootDir, 'skills')
    await mkdir(join(rootDir, 'specs', 'bluepriNNts'), { recursive: true })
    await mkdir(globalDir, { recursive: true })
    await mkdir(join(skillsDir, 'nn-innfo', 'bluepriNNts'), { recursive: true })

    await writeFile(join(rootDir, 'specs', 'bluepriNNts', 'ws_tmpl.md'), '---\nversion: V_1-0-0\n---')
    await writeFile(join(globalDir, 'global_tmpl.md'), '---\nversion: V_1-0-0\n---')
    await writeFile(
      join(skillsDir, 'nn-innfo', 'bluepriNNts', 'skill_tmpl.md'),
      '---\nversion: V_1-0-0\n---',
    )

    const discovered = await listBlueprints(rootDir, { globalDir, skillsDir })

    expect(discovered.some((t) => t.name === 'ws_tmpl' && t.source === 'workspace')).toBe(true)
    expect(discovered.some((t) => t.name === 'global_tmpl' && t.source === 'global')).toBe(true)
    expect(discovered.some((t) => t.name === 'skill_tmpl' && t.source === 'skill:nn-innfo')).toBe(
      true,
    )
  })

  it('listBlueprints falls back to spec_version and scans package directories', async () => {
    const globalDir = join(rootDir, 'global_templates')
    const skillsDir = join(rootDir, 'skills')
    await mkdir(join(rootDir, 'specs', 'bluepriNNts'), { recursive: true })
    await mkdir(globalDir, { recursive: true })
    await mkdir(skillsDir, { recursive: true })

    // flat file declaring only spec_version (blueprint_version/version absent)
    await writeFile(
      join(rootDir, 'specs', 'bluepriNNts', 'flat_spec.md'),
      '---\nspec_version: "V_2-0-0"\n---',
    )
    // flat file with no frontmatter at all -> default version
    await writeFile(join(rootDir, 'specs', 'bluepriNNts', 'bare.md'), 'no frontmatter here')
    // package directory carrying only a spec_version spec
    await mkdir(join(rootDir, 'specs', 'bluepriNNts', 'pkg_a'), { recursive: true })
    await writeFile(
      join(rootDir, 'specs', 'bluepriNNts', 'pkg_a', 'spec_NN.md'),
      '---\nspec_version: "V_3-0-0"\n---',
    )
    // a skip-listed directory must be ignored
    await mkdir(join(rootDir, 'specs', 'bluepriNNts', 'samples'), { recursive: true })
    await writeFile(
      join(rootDir, 'specs', 'bluepriNNts', 'samples', 'ignored.md'),
      '---\nversion: V_9-9-9\n---',
    )

    const discovered = await listBlueprints(rootDir, { globalDir, skillsDir })

    expect(discovered.find((t) => t.name === 'flat_spec')?.version).toBe('V_2-0-0')
    expect(discovered.find((t) => t.name === 'bare')?.version).toBe('V_0-1-0')
    expect(discovered.find((t) => t.name === 'pkg_a')?.version).toBe('V_3-0-0')
    expect(discovered.some((t) => t.name === 'ignored')).toBe(false)
  })

  it('hydrateBlueprint copies template from global or skill store into workspace ./specs/bluepriNNts/', async () => {
    const globalDir = join(rootDir, 'global_templates')
    const skillsDir = join(rootDir, 'skills')
    await mkdir(globalDir, { recursive: true })

    await writeFile(
      join(globalDir, 'workspace_V_0-3-0_spec_NN.md'),
      '# NN concept: Workspace\n* type:: text',
    )

    const res = await hydrateBlueprint(rootDir, 'workspace_V_0-3-0_spec_NN', { globalDir, skillsDir })

    expect(res.success).toBe(true)
    expect(res.templateName).toBe('workspace_V_0-3-0_spec_NN')
    expect(res.source).toBe('global')

    const targetFile = join(rootDir, 'specs', 'bluepriNNts', 'workspace_V_0-3-0_spec_NN.md')
    const { stat: statFs } = await import('node:fs/promises')
    const st = await statFs(targetFile)
    expect(st.isFile()).toBe(true)
  })

  it('listBlueprintProcedures and listBlueprintSkills dynamically discover transitive procedures and skills across includes trees', async () => {
    const templatesDir = join(rootDir, 'specs', 'bluepriNNts')
    await mkdir(templatesDir, { recursive: true })

    await writeFile(
      join(templatesDir, 'base_spec_NN.md'),
      [
        '---',
        'level: 2',
        'title: "Base Template"',
        'procedures:',
        '  - id: "proc-base"',
        '    name: "Base Procedure"',
        '    path: "procedures/base.md"',
        'skills:',
        '  - name: "nn-base"',
        '    repo: "cogNNitive/actioNN"',
        '    path: "skills/nn-base"',
        'includes:',
        '  - name: "included_spec_NN"',
        '---',
      ].join('\n'),
      'utf-8',
    )

    await writeFile(
      join(templatesDir, 'included_spec_NN.md'),
      [
        '---',
        'level: 2',
        'title: "Included Template"',
        'procedures:',
        '  - id: "proc-included"',
        '    name: "Included Procedure"',
        '    path: "procedures/included.md"',
        '  - id: "proc-base"',
        '    name: "Duplicate Base Procedure"',
        '    path: "procedures/dup.md"',
        'skills:',
        '  - name: "nn-included"',
        '    repo: "cogNNitive/actioNN"',
        '    path: "skills/nn-included"',
        '  - name: "nn-base"',
        '    repo: "cogNNitive/actioNN"',
        '    path: "skills/dup"',
        '---',
      ].join('\n'),
      'utf-8',
    )

    const procsRes = await listBlueprintProcedures(rootDir, { blueprint_name: 'base_spec_NN' })
    expect(procsRes.procedures).toHaveLength(2)
    expect(procsRes.procedures.map((p) => p.id)).toEqual(['proc-base', 'proc-included'])
    expect(procsRes.procedures[0].source_template).toBe('base_spec_NN')

    const skillsRes = await listBlueprintSkills(rootDir, { blueprint_name: 'base_spec_NN' })
    expect(skillsRes.skills).toHaveLength(2)
    expect(skillsRes.skills.map((s) => s.name)).toEqual(['nn-base', 'nn-included'])
    expect((skillsRes.skills[0] as { source_template?: string }).source_template).toBe('base_spec_NN')
  })

  it('S-01: discoverTransitiveAssets parses version strings from inc.url to resolve package templates', async () => {
    const pkgDir = join(specsDir, 'bluepriNNts', 'sec_pkg', 'V_2-0-0')
    await mkdir(pkgDir, { recursive: true })

    await writeFile(
      join(pkgDir, 'spec_NN.md'),
      [
        '---',
        'level: 2',
        'spec_version: "V_2-0-0"',
        'title: "Security Package"',
        'procedures:',
        '  - id: "proc-sec-v2"',
        '    name: "Security Audit V2"',
        '    path: "procedures/audit_v2.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )

    const templatesDir = join(rootDir, 'specs', 'bluepriNNts')
    await mkdir(templatesDir, { recursive: true })

    await writeFile(
      join(templatesDir, 'main_tmpl_NN.md'),
      [
        '---',
        'level: 2',
        'title: "Main Template"',
        'includes:',
        '  - name: "sec_pkg"',
        '    url: "https://example.com/specs/bluepriNNts/sec_pkg/V_2-0-0/spec_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )

    const procsRes = await listBlueprintProcedures(rootDir, { blueprint_name: 'main_tmpl_NN' })
    expect(procsRes.procedures.some((p) => p.id === 'proc-sec-v2')).toBe(true)
  })

  it('discoverTransitiveAssets discovers procedures from on-disk procedures/ folder even without explicit frontmatter procedures array', async () => {
    const pkgDir = join(rootDir, 'specs', 'bluepriNNts', 'video_pkg', 'V_1-0-0')
    const procsDir = join(pkgDir, 'procedures')
    await mkdir(procsDir, { recursive: true })

    await writeFile(
      join(pkgDir, 'spec_NN.md'),
      [
        '---',
        'level: 2',
        'spec_version: "V_1-0-0"',
        'title: "Video Package Without Frontmatter Procedures"',
        '---',
      ].join('\n'),
      'utf-8',
    )

    await writeFile(
      join(procsDir, 'generate_script_NN.md'),
      [
        '---',
        'title: "Generate Script SOP"',
        '---',
        '# NN Procedure',
      ].join('\n'),
      'utf-8',
    )

    const procsRes = await listBlueprintProcedures(rootDir, { blueprint_name: 'video_pkg' })
    expect(procsRes.procedures.length).toBeGreaterThanOrEqual(1)
    const scriptProc = procsRes.procedures.find((p) => p.id === 'generate-script')
    expect(scriptProc).toBeDefined()
    expect(scriptProc?.name).toBe('Generate Script SOP')
    expect(scriptProc?.path).toBe('procedures/generate_script_NN.md')
  })

  describe('embedded skills (skills/<name>/SKILL.md inside a bluepriNNt package)', () => {
    const embeddedPkgDir = () => join(rootDir, 'specs', 'bluepriNNts', 'emb_pkg', 'V_1-0-0')

    async function writeOwnerSpec(extraFrontmatter: string[] = []) {
      await mkdir(embeddedPkgDir(), { recursive: true })
      await writeFile(
        join(embeddedPkgDir(), 'spec_NN.md'),
        ['---', 'level: 2', 'spec_version: "V_1-0-0"', 'title: "Embedded"', ...extraFrontmatter, '---'].join(
          '\n',
        ),
        'utf-8',
      )
    }

    async function writeSkill(name: string, frontmatter: string[]) {
      const dir = join(embeddedPkgDir(), 'skills', name)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'SKILL.md'), ['---', ...frontmatter, '---', '# Skill'].join('\n'), 'utf-8')
      return dir
    }

    it('lists an on-disk skill with embedded:true and a resolved absolute path', async () => {
      await writeOwnerSpec()
      const skillDir = await writeSkill('x', ['name: x', 'version: "V_0-4-0"', 'description: "An embedded skill"'])

      const res = await listBlueprintSkills(rootDir, { blueprint_name: 'emb_pkg' })
      expect(res.skills).toHaveLength(1)
      const entry = res.skills[0] as unknown as Record<string, unknown>
      expect(entry).toMatchObject({
        name: 'x',
        source_blueprint: 'emb_pkg',
        embedded: true,
        version: 'V_0-4-0',
        description: 'An embedded skill',
      })
      expect(isAbsolute(entry.path as string)).toBe(true)
      expect(resolve(entry.path as string)).toBe(resolve(skillDir))
      expect((await stat(join(entry.path as string, 'SKILL.md'))).isFile()).toBe(true)
    })

    it('lets the embedded entry win over a same-name frontmatter skills: entry', async () => {
      await writeOwnerSpec([
        'skills:',
        '  - name: "x"',
        '    repo: "cogNNitive/actioNN"',
        '    path: "skills/x"',
      ])
      await writeSkill('x', ['version: "V_0-4-0"'])

      const res = await listBlueprintSkills(rootDir, { blueprint_name: 'emb_pkg' })
      expect(res.skills).toHaveLength(1)
      expect((res.skills[0] as { embedded?: true }).embedded).toBe(true)
    })

    it('ignores node_modules and dot directories and dirs without a readable SKILL.md', async () => {
      await writeOwnerSpec()
      await writeSkill('real', ['version: "V_0-1-0"'])
      await writeSkill('node_modules', ['version: "V_0-1-0"'])
      await writeSkill('.hidden', ['version: "V_0-1-0"'])
      await mkdir(join(embeddedPkgDir(), 'skills', 'empty'), { recursive: true })

      const res = await listBlueprintSkills(rootDir, { blueprint_name: 'emb_pkg' })
      expect(res.skills.map((s) => s.name)).toEqual(['real'])
    })

    it('leaves external frontmatter skills without embedded:true', async () => {
      await writeOwnerSpec([
        'skills:',
        '  - name: "nn-ext"',
        '    repo: "cogNNitive/actioNN"',
        '    path: "skills/nn-ext"',
      ])

      const res = await listBlueprintSkills(rootDir, { blueprint_name: 'emb_pkg' })
      expect(res.skills).toHaveLength(1)
      expect(res.skills[0].name).toBe('nn-ext')
      expect('embedded' in res.skills[0]).toBe(false)
    })
  })

  it('M1: findKnowledgeFile skips specs/ by default but descends with includeSpecs', async () => {
    await writeFile(
      join(specsDir, 'business_V_0-2-0_NN.md'),
      [
        '---',
        'spec_version: "V_0-2-0"',
        'level: 2',
        'title: "Stored Business Template"',
        'parent_spec:',
        '  name: "iNNfo_V_0-1-0"',
        '  url: "https://example.com/iNNfo_V_0-1-0_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )

    const defaultMatch = await findKnowledgeFile(rootDir, 'business_V_0-2-0')
    expect(defaultMatch).toBeNull()

    const withSpecs = await findKnowledgeFile(rootDir, 'business_V_0-2-0', {
      includeSpecs: true,
    })
    expect(withSpecs).toBe(join(specsDir, 'business_V_0-2-0_NN.md'))
  })

  it('M1: validateBlueprint by id resolves a template stored under specs/', async () => {
    await writeFile(
      join(specsDir, 'business_V_0-2-0_NN.md'),
      [
        '---',
        'spec_version: "V_0-2-0"',
        'level: 2',
        'title: "Stored Business Template"',
        'parent_spec:',
        '  name: "iNNfo_V_0-1-0"',
        '  url: "https://example.com/iNNfo_V_0-1-0_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )
    await stubSpecChain()

    const result = await validateBlueprint(rootDir, 'business_V_0-2-0')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  // Moved from the former test/coverage-expansion.spec.ts, a grab-bag named
  // after a coverage metric rather than a behaviour.
  it('spec.ts: discoverTransitiveAssets traverses parent_spec and includes', async () => {
    // Create template with procedures and parent_spec
    const basePkgDir = join(specsDir, 'bluepriNNts', 'base', '0.1.0')
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

    const childPkgDir = join(specsDir, 'bluepriNNts', 'child', '0.1.0')
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
        '  url: "specs/bluepriNNts/base/0.1.0/spec_NN.md"',
        '---',
      ].join('\n'),
      'utf-8',
    )

    const procs = await listBlueprintProcedures(rootDir, { blueprint_name: 'child' })
    expect(procs.procedures.length).toBeGreaterThan(0)
    expect(procs.procedures.some((p) => p.name.includes('Proc 1'))).toBe(true)

    const skills = await listBlueprintSkills(rootDir, { blueprint_name: 'child' })
    expect(Array.isArray(skills.skills)).toBe(true)
  })
})

/**
 * The shipped `visual-catalog` blueprint is an UNVERSIONED package directory
 * (`bluepriNNts/visual-catalog/spec_NN.md` + `procedures/`) — the canonical
 * Level-2 source layout. Requesting its procedures by bluepriNNt name must
 * report `ingest-visual-catalog` sourced from `visual-catalog`. This reads the
 * REAL package, so it stays RED until the schema + SOP exist and the package
 * resolver understands the unversioned layout.
 */
const iNNfoRootDir = join(import.meta.dirname!, '..', '..', '..', '..')

describe('visual-catalog blueprint procedure discovery (real package)', () => {
  it('listBlueprintProcedures reports ingest-visual-catalog and its source blueprint', async () => {
    const { procedures } = await listBlueprintProcedures(iNNfoRootDir, {
      blueprint_name: 'visual-catalog',
    })
    expect(procedures).toContainEqual({
      id: 'ingest-visual-catalog',
      name: 'Ingest Visual Catalog Procedure',
      path: 'procedures/ingest_visual_catalog_procedures_NN.md',
      source_template: 'visual-catalog',
    })
  })
})

describe('video-script blueprint embedded skill discovery (real package)', () => {
  it('listBlueprintSkills reports nn-video-script with a path that holds the real skill', async () => {
    const { skills } = await listBlueprintSkills(iNNfoRootDir, { blueprint_name: 'video-script' })
    const skill = skills.find((s) => s.name === 'nn-video-script')
    expect(skill).toBeDefined()
    if (!skill || !('embedded' in skill)) throw new Error('nn-video-script must be an embedded skill')
    expect(skill.embedded).toBe(true)
    expect(skill.source_blueprint).toBe('video-script')
    expect(existsSync(join(skill.path, 'SKILL.md'))).toBe(true)
    expect(existsSync(join(skill.path, 'scripts', 'remotion-scene-compiler.mjs'))).toBe(true)
    expect(skill.version).toMatch(/^V_\d+-\d+-\d+$/)
    expect(skill.description).toBeTruthy()
  })
})

describe('blueprint name derivation for spec_NN.md packages', () => {
  it('names a spec_NN.md package by its folder, skipping a V_x version dir', () => {
    const base = 'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts'
    expect(deriveNameFromUrl(`${base}/business/spec_NN.md`)).toBe('business')
    expect(deriveNameFromUrl(`${base}/business/V_0-4-1/spec_NN.md`)).toBe('business')
    expect(deriveNameFromUrl('https://example.com/iNNfo_V_0-1-0_NN.md')).toBe('iNNfo_V_0-1-0')
  })

  it('keeps the stem name when a spec_NN.md url has no blueprint folder', () => {
    expect(deriveNameFromUrl('spec_NN.md')).toBe('spec')
    expect(deriveNameFromUrl('https://cognnitive.com/spec_NN.md')).toBe('spec')
    expect(deriveNameFromUrl('./spec_NN.md')).toBe('spec')
    expect(deriveNameFromUrl('https://example.com/x/spec.md')).toBe('spec')
    expect(deriveNameFromUrl('https://example.com/business_V_0-2-0_NN.md')).toBe('business_V_0-2-0')
  })

  it('getBlueprintFromUrl returns the blueprint named by the url folder, not the first spec_NN.md', async () => {
    const root = join(import.meta.dirname!, '..', '..', 'temp-test-spec-collision')
    await rm(root, { recursive: true, force: true })
    try {
      for (const name of ['alpha', 'beta']) {
        await mkdir(join(root, 'specs', 'bluepriNNts', name), { recursive: true })
        await writeFile(
          join(root, 'specs', 'bluepriNNts', name, 'spec_NN.md'),
          `---\nspec_version: "V_0-1-0"\nlevel: 2\ntitle: "${name} blueprint"\nblueprint_name: "${name}"\n---\n`,
          'utf-8',
        )
      }
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'))
      const url = 'https://example.com/specs/bluepriNNts/beta/spec_NN.md'
      const bp = await getBlueprintFromUrl(root, url, deriveNameFromUrl(url))
      expect(bp?.frontmatter.title).toBe('beta blueprint')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('catalog-driven discovery and on-demand hydration', () => {
  const catRoot = join(import.meta.dirname!, '..', '..', 'temp-test-spec-catalog')
  const globalDir = join(catRoot, 'global_templates')
  const skillsDir = join(catRoot, 'skills')
  const catalog = {
    blueprints: {
      domaiNN: {
        name: 'domaiNN',
        adopted: 'V_0-4-0',
        tier: 'core' as const,
        access: 'public' as const,
        when_to_use: 'Scaffold a domain workspace',
        release_tag: 'blueprints-v0.39.0',
        embedded_skills: [],
      },
      organization: {
        name: 'organization',
        adopted: 'V_0-4-0',
        tier: 'free' as const,
        access: 'public' as const,
        when_to_use: 'Model an organization',
        release_tag: 'blueprints-v0.39.0',
        embedded_skills: ['nn-org'],
      },
    },
  }

  beforeEach(async () => {
    await rm(catRoot, { recursive: true, force: true })
    await mkdir(join(catRoot, 'specs', 'bluepriNNts'), { recursive: true })
    await mkdir(globalDir, { recursive: true })
    await mkdir(skillsDir, { recursive: true })
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await rm(catRoot, { recursive: true, force: true })
    delete process.env.COGNNITIVE_TOKEN
    delete process.env.COGNNITIVE_CREDENTIALS
  })

  it('listBlueprints merges catalog availability, tier, access, when_to_use, and embedded_skills', async () => {
    const discovered = await listBlueprints(catRoot, { globalDir, skillsDir, catalog })

    const core = discovered.find((b) => b.name === 'domaiNN')
    expect(core).toBeDefined()
    expect(core?.tier).toBe('core')
    expect(core?.installed).toBe(true) // core blueprints are embedded
    expect(core?.when_to_use).toBe('Scaffold a domain workspace')

    const vertical = discovered.find((b) => b.name === 'organization')
    expect(vertical).toBeDefined()
    expect(vertical?.source).toBe('catalog')
    expect(vertical?.installed).toBe(false)
    expect(vertical?.tier).toBe('free')
    expect(vertical?.embedded_skills).toEqual(['nn-org'])
  })

  it('listBlueprints enriches a locally present blueprint with catalog metadata', async () => {
    await mkdir(join(catRoot, 'specs', 'bluepriNNts', 'domaiNN'), { recursive: true })
    await writeFile(
      join(catRoot, 'specs', 'bluepriNNts', 'domaiNN', 'spec_NN.md'),
      '---\nblueprint_version: "V_0-4-0"\nlevel: 2\n---\n',
      'utf-8',
    )

    const discovered = await listBlueprints(catRoot, { globalDir, skillsDir, catalog })
    const core = discovered.find((b) => b.name === 'domaiNN')
    expect(core?.installed).toBe(true)
    expect(core?.source).toBe('workspace')
    expect(core?.tier).toBe('core')
  })

  function mockCatalogFetch(): void {
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('https://api.github.com/')) {
        if (url.includes('skills/nn-org')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify([{ name: 'SKILL.md', type: 'file', path: 'SKILL.md' }])),
          } as Response)
        }
        if (url.includes('/skills?')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify([{ name: 'nn-org', type: 'dir', path: 'nn-org' }])),
          } as Response)
        }
        // procedures/samples/assets — absent
        return Promise.resolve({ ok: true, text: () => Promise.resolve('[]') } as Response)
      }
      if (url.endsWith('/organization/spec_NN.md')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('---\nblueprint_version: "V_0-4-0"\nlevel: 2\ntitle: "Organization"\n---\n# Org'),
        } as Response)
      }
      if (url.endsWith('/organization/skills/nn-org/SKILL.md')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('---\nname: nn-org\nversion: "1.0.0"\n---\n# Skill'),
        } as Response)
      }
      return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' } as Response)
    })
  }

  it('hydrateBlueprint returns the install command for an uninstalled catalog blueprint and writes nothing', async () => {
    const res = await hydrateBlueprint(catRoot, 'organization', {
      globalDir,
      skillsDir,
      catalog,
    })

    expect(res.success).toBe(false)
    expect(res.source).toBe('catalog')
    expect(res.installCommand).toBe(
      'node ~/.agents/skills/nn-skills-lifecycle/scripts/skills-manager.js install --blueprint organization',
    )

    const { stat: statFs } = await import('node:fs/promises')
    await expect(statFs(join(globalDir, 'organization', 'V_0-4-0', 'spec_NN.md'))).rejects.toThrow()
    await expect(statFs(join(skillsDir, 'nn-org', 'SKILL.md'))).rejects.toThrow()
  })

  it('hydrateBlueprint never fetches: the command is returned even without network', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

    const res = await hydrateBlueprint(catRoot, 'organization', { globalDir, skillsDir, catalog })
    expect(res.success).toBe(false)
    expect(res.installCommand).toMatch(/install --blueprint organization/)
  })
})
