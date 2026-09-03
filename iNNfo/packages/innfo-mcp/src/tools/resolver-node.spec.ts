import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { resolveParentChainNode, saveSpecOnce } from './resolver-node'

const rootDir = join(import.meta.dirname!, '..', '..', 'temp-test-resolver')
const specsDir = join(rootDir, 'specs')

describe('NodeSpecResolver', () => {
  beforeEach(async () => {
    // Reset/clean temp directory
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('R-LSR-01: resolves spec from local specs/ directory recursively', async () => {
    // Setup nested spec file: specs/domain-a/business_V_0-1-1_NN.md
    const subDir = join(specsDir, 'domain-a')
    await mkdir(subDir, { recursive: true })
    const localSpecPath = join(subDir, 'business_V_0-1-1_NN.md')
    const specContent = [
      '---',
      'spec_version: "V_0-1-1"',
      'level: 2',
      'title: "Local Business Spec"',
      '---',
      'Local Content',
    ].join('\n')
    await writeFile(localSpecPath, specContent, 'utf-8')

    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-1-1_NN.md',
      'business_V_0-1-1',
    )

    // Verify it read from the local file and didn't fetch
    expect(fetchSpy).not.toHaveBeenCalled()
    const doc = result.specs.get('business_V_0-1-1')
    expect(doc).toBeDefined()
    expect(doc?.rawContent).toBe(specContent)
    expect(doc?.frontmatter.title).toBe('Local Business Spec')
  })

  it('R-LSR-01: matches unversioned local spec filename via frontmatter spec_version', async () => {
    // Setup unversioned spec file: specs/latest/level2/business_NN.md
    const subDir = join(specsDir, 'latest', 'level2')
    await mkdir(subDir, { recursive: true })
    const localSpecPath = join(subDir, 'business_NN.md')
    const specContent = [
      '---',
      'spec_version: "V_0-1-1"',
      'level: 2',
      'title: "Unversioned File But Correct Version"',
      '---',
      'Unversioned Content',
    ].join('\n')
    await writeFile(localSpecPath, specContent, 'utf-8')

    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-1-1_NN.md',
      'business_V_0-1-1',
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    const doc = result.specs.get('business_V_0-1-1')
    expect(doc).toBeDefined()
    expect(doc?.rawContent).toBe(specContent)
  })

  it('R-LSR-01: bypasses local file if version mismatches and falls back to network', async () => {
    // Setup local spec file with mismatched version: specs/business_V_0-1-0_NN.md
    const localSpecPath = join(specsDir, 'business_V_0-1-0_NN.md')
    await writeFile(
      localSpecPath,
      ['---', 'spec_version: "V_0-1-0"', 'level: 2', '---'].join('\n'),
      'utf-8',
    )

    // Mock fetch for the correct version
    const remoteContent = [
      '---',
      'spec_version: "V_0-1-1"',
      'level: 2',
      'title: "Remote Business Spec"',
      '---',
      'Remote Content',
    ].join('\n')

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(remoteContent),
      } as Response),
    )

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-1-1_NN.md',
      'business_V_0-1-1',
    )

    // Should fetch from network since local version was 0-1-0 and requested was 0-1-1
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const doc = result.specs.get('business_V_0-1-1')
    expect(doc?.frontmatter.title).toBe('Remote Business Spec')

    // Verify it was saved into specs/ under its own canonical name
    const savedFile = await readFile(join(specsDir, 'business_V_0-1-1_NN.md'), 'utf-8')
    expect(savedFile).toBe(remoteContent)
  })

  it('R-LSR-02: fetches from network and saves into specs/ when not found locally', async () => {
    const remoteContent = [
      '---',
      'spec_version: "V_0-2-0"',
      'level: 1',
      'title: "Remote Spec"',
      '---',
    ].join('\n')

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(remoteContent),
      } as Response),
    )

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/iNNfo_V_0-2-0_NN.md',
      'iNNfo_V_0-2-0',
    )

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result.specs.has('iNNfo_V_0-2-0')).toBe(true)

    // Verify saved on disk
    const savedContent = await readFile(join(specsDir, 'iNNfo_V_0-2-0_NN.md'), 'utf-8')
    expect(savedContent).toBe(remoteContent)
  })

  it('R-LSR-02: loads from specs/ on subsequent requests without network fetch', async () => {
    const localContent = [
      '---',
      'spec_version: "V_0-2-0"',
      'level: 1',
      'title: "Local Spec"',
      '---',
    ].join('\n')
    await writeFile(join(specsDir, 'iNNfo_V_0-2-0_NN.md'), localContent, 'utf-8')

    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/iNNfo_V_0-2-0_NN.md',
      'iNNfo_V_0-2-0',
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    const doc = result.specs.get('iNNfo_V_0-2-0')
    expect(doc?.frontmatter.title).toBe('Local Spec')
  })

  it('R-LSR-03: saves a downloaded spec under its canonical versioned name', async () => {
    // Request comes from a `latest/` URL (unversioned basename), content declares V_0-3-0.
    const remoteContent = [
      '---',
      'spec_version: "V_0-3-0"',
      'level: 2',
      'title: "Business Latest"',
      '---',
      'Canonical Content',
    ].join('\n')
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockImplementation(() =>
        Promise.resolve({ ok: true, text: () => Promise.resolve(remoteContent) } as Response),
      )

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/specs/latest/level2/business/business_NN.md',
      'business',
    )

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result.specs.get('business')).toBeDefined()

    // specs/ is written with the document's own version, not the request name.
    const saved = await readFile(join(specsDir, 'business_V_0-3-0_NN.md'), 'utf-8')
    expect(saved).toBe(remoteContent)
    // No versionless duplicate is produced.
    await expect(readFile(join(specsDir, 'business_NN.md'), 'utf-8')).rejects.toThrow()
  })

  it('R-LSR-03: versioned request reuses the canonical local file without fetching', async () => {
    const localContent = [
      '---',
      'spec_version: "V_0-3-0"',
      'level: 2',
      'title: "Business Latest"',
      '---',
      'Canonical Content',
    ].join('\n')
    await writeFile(join(specsDir, 'business_V_0-3-0_NN.md'), localContent, 'utf-8')

    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-3-0_NN.md',
      'business_V_0-3-0',
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.specs.get('business_V_0-3-0')?.frontmatter.title).toBe('Business Latest')
  })

  it('R-LSR-03: legacy unversioned local file resolves for versioned and unversioned requests', async () => {
    const legacyContent = [
      '---',
      'spec_version: "V_0-3-0"',
      'level: 2',
      'title: "Legacy File"',
      '---',
      'Legacy Content',
    ].join('\n')
    await writeFile(join(specsDir, 'business_NN.md'), legacyContent, 'utf-8')

    const fetchSpy = vi.spyOn(global, 'fetch')

    const versioned = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-3-0_NN.md',
      'business_V_0-3-0',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(versioned.specs.get('business_V_0-3-0')?.frontmatter.title).toBe('Legacy File')

    fetchSpy.mockClear()
    const unversioned = await resolveParentChainNode(
      rootDir,
      'https://example.com/specs/latest/level2/business/business_NN.md',
      'business',
    )
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(unversioned.specs.get('business')?.frontmatter.title).toBe('Legacy File')
  })

  it('R-LSR-03: unversioned local request prefers the highest matching version', async () => {
    await writeFile(
      join(specsDir, 'business_V_0-2-1_NN.md'),
      ['---', 'spec_version: "V_0-2-1"', 'level: 2', 'title: "Old"', '---'].join('\n'),
      'utf-8',
    )
    await writeFile(
      join(specsDir, 'business_V_0-3-0_NN.md'),
      ['---', 'spec_version: "V_0-3-0"', 'level: 2', 'title: "New"', '---'].join('\n'),
      'utf-8',
    )

    const fetchSpy = vi.spyOn(global, 'fetch')

    const result = await resolveParentChainNode(
      rootDir,
      'https://example.com/specs/latest/level2/business/business_NN.md',
      'business',
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.specs.get('business')?.frontmatter.title).toBe('New')
  })

  it('R-LSR-04: throws SpecResolutionError listing the searched locations when all resolution steps fail', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled'))

    const error = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_9-9-9_NN.md',
      'business_V_9-9-9',
    ).then(
      () => null,
      (e) => e,
    )

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('business_V_9-9-9')
    expect(error.message).toContain('Attempted')
    expect(error.message).toContain(specsDir)
    expect(error.message).toContain('network url')
  })

  it('fails loud (throws) on unparseable frontmatter, regardless of where the content came from', async () => {
    const corruptContent = 'this file has no YAML frontmatter block at all, just prose.'
    await writeFile(join(specsDir, 'business_V_0-7-0_NN.md'), corruptContent, 'utf-8')

    const fetchSpy = vi.spyOn(global, 'fetch')

    const error = await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-7-0_NN.md',
      'business_V_0-7-0',
    ).then(
      () => null,
      (e) => e,
    )

    // specs/ is trusted content, not a fungible cache — a corrupt local file
    // is a hard error, not a silent empty-parent leaf and not a fallthrough
    // to network.
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('Unparseable frontmatter')
    expect(error.message).toContain('business_V_0-7-0')
  })

  it('leaves no leftover .tmp-* files in specs/ after a network fetch writes to it', async () => {
    const remoteContent = [
      '---',
      'spec_version: "V_0-8-0"',
      'level: 2',
      'title: "Atomic Write Check"',
      '---',
    ].join('\n')
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({ ok: true, text: () => Promise.resolve(remoteContent) } as Response),
    )

    await resolveParentChainNode(
      rootDir,
      'https://example.com/business_V_0-8-0_NN.md',
      'business_V_0-8-0',
    )

    const entries = await readdir(specsDir)
    expect(entries.some((name) => name.includes('.tmp-'))).toBe(false)
    expect(entries).toContain('business_V_0-8-0_NN.md')
  })

  describe('saveSpecOnce', () => {
    it('writes a new file', async () => {
      await saveSpecOnce(specsDir, 'fresh_NN.md', 'fresh content')
      expect(await readFile(join(specsDir, 'fresh_NN.md'), 'utf-8')).toBe('fresh content')
    })

    it('never overwrites an existing file (write-once — specs/ is immutable by convention)', async () => {
      await saveSpecOnce(specsDir, 'pinned_NN.md', 'original content')
      await saveSpecOnce(specsDir, 'pinned_NN.md', 'different content')
      expect(await readFile(join(specsDir, 'pinned_NN.md'), 'utf-8')).toBe('original content')
    })
  })

  describe('4-Tier Package Resolver & Immutability (Batch 3)', () => {
    it('resolves Tier 1 workspace package directory first', async () => {
      const { resolveTemplatePackage } = await import('./resolver-node')
      const pkgDir = join(specsDir, 'templates', 'business', 'V_0-2-0')
      await mkdir(pkgDir, { recursive: true })
      await writeFile(join(pkgDir, 'spec_NN.md'), '---\nspec_version: "V_0-2-0"\nlevel: 2\n---')

      const res = await resolveTemplatePackage(rootDir, 'business_V_0-2-0')
      expect(res).not.toBeNull()
      expect(res?.tier).toBe('workspace-package')
      expect(res?.isPackageDir).toBe(true)
      expect(res?.specFilePath).toBe(join(pkgDir, 'spec_NN.md'))
    })

    it('falls back to Tier 2 workspace flat spec when workspace package dir is missing', async () => {
      const { resolveTemplatePackage } = await import('./resolver-node')
      await writeFile(
        join(specsDir, 'business_V_0-2-0_NN.md'),
        '---\nspec_version: "V_0-2-0"\nlevel: 2\n---',
      )

      const res = await resolveTemplatePackage(rootDir, 'business_V_0-2-0')
      expect(res).not.toBeNull()
      expect(res?.tier).toBe('workspace-flat')
      expect(res?.isPackageDir).toBe(false)
    })

    it('falls back to Tier 3 global user cache when absent in workspace', async () => {
      const { resolveTemplatePackage } = await import('./resolver-node')
      const globalDir = join(rootDir, 'global_agents')
      const globalPkgDir = join(globalDir, 'projects', 'V_0-2-0')
      await mkdir(globalPkgDir, { recursive: true })
      await writeFile(join(globalPkgDir, 'spec_NN.md'), '---\nspec_version: "V_0-2-0"\n---')

      const res = await resolveTemplatePackage(rootDir, 'projects_V_0-2-0', undefined, {
        globalDir,
      })
      expect(res).not.toBeNull()
      expect(res?.tier).toBe('global-cache')
      expect(res?.isPackageDir).toBe(true)
    })

    it('falls back to Tier 4 installed skill directory', async () => {
      const { resolveTemplatePackage } = await import('./resolver-node')
      const skillsDir = join(rootDir, 'skills')
      const skillPkgDir = join(skillsDir, 'nn-innfo', 'templates', 'custom', 'V_0-1-0')
      await mkdir(skillPkgDir, { recursive: true })
      await writeFile(join(skillPkgDir, 'spec_NN.md'), '---\nspec_version: "V_0-1-0"\n---')

      const res = await resolveTemplatePackage(rootDir, 'custom_V_0-1-0', undefined, { skillsDir })
      expect(res).not.toBeNull()
      expect(res?.tier).toBe('installed-skill')
    })

    it('hydrateTemplatePackageAtomically creates package directory via staging rename and enforces write-once immutability', async () => {
      const { hydrateTemplatePackageAtomically } = await import('./resolver-node')
      const pkgPath = await hydrateTemplatePackageAtomically(
        rootDir,
        'business',
        'V_0-2-0',
        'Content V1',
      )
      expect(await readFile(join(pkgPath, 'spec_NN.md'), 'utf-8')).toBe('Content V1')

      // Write-once immutability: second call does not overwrite existing package contents
      await hydrateTemplatePackageAtomically(rootDir, 'business', 'V_0-2-0', 'Content V2')
      expect(await readFile(join(pkgPath, 'spec_NN.md'), 'utf-8')).toBe('Content V1')
    })

    it('W-01: buildIncludeContentMap normalizes case lookup for frontmatter includes', async () => {
      const { buildIncludeContentMap } = await import('./resolver-node')

      await writeFile(
        join(specsDir, 'security_V_1-0-0_NN.md'),
        '---\nspec_version: "V_1-0-0"\nlevel: 2\ntitle: "Security"\n---\n',
        'utf-8',
      )

      const map = await buildIncludeContentMap(rootDir, [{ name: 'Security_V_1-0-0', url: '' }])

      // Must be retrievable by original name AND lowercase normalized key (Fix W-01)
      expect(map.get('Security_V_1-0-0')).toBeDefined()
      expect(map.get('security_v_1-0-0')).toBeDefined()
    })
  })
})
