import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { resolveParentChainNode, isLocalPath, toLocalFilePath } from '../src/tools/resolver-node.js'
import { writeFile, rm, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

describe('resolver-node local URI and path resolution', () => {
  const tmpDir = resolve('./test-tmp-resolver')
  const specPath = join(tmpDir, 'test-parent_V_1-0_NN.md')
  const specUrl = pathToFileURL(specPath).href

  beforeAll(async () => {
    await mkdir(tmpDir, { recursive: true })
    await writeFile(
      specPath,
      `---
spec_version: V_1-0
level: 1
title: Local Parent Spec
---
# Local Parent Spec Body
`,
      'utf-8',
    )
  })

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('identifies local file:// URIs and absolute paths', () => {
    expect(isLocalPath('file:///C:/path/to/spec.md')).toBe(true)
    expect(isLocalPath('file:///usr/specs/spec.md')).toBe(true)
    expect(isLocalPath('C:/specs/parent.md')).toBe(true)
    expect(isLocalPath('/usr/specs/parent.md')).toBe(true)
    expect(isLocalPath('https://example.com/spec.md')).toBe(false)
  })

  it('converts file:// URIs to local file paths', () => {
    const url = pathToFileURL(specPath).href
    expect(toLocalFilePath(url)).toBe(specPath)
  })

  it('resolves parent spec URL with file:// scheme directly via readFile', async () => {
    const cache = await resolveParentChainNode(tmpDir, specUrl, 'test-parent_V_1-0')
    expect(cache.specs.has('test-parent_V_1-0')).toBe(true)
    const doc = cache.specs.get('test-parent_V_1-0')
    expect(doc?.frontmatter.title).toBe('Local Parent Spec')
  })

  it('resolves parent spec URL specified as OS absolute path directly via readFile', async () => {
    const cache = await resolveParentChainNode(tmpDir, specPath, 'test-parent_V_1-0')
    expect(cache.specs.has('test-parent_V_1-0')).toBe(true)
    const doc = cache.specs.get('test-parent_V_1-0')
    expect(doc?.frontmatter.title).toBe('Local Parent Spec')
  })

  it('throws a controlled error on missing local path without network fetch', async () => {
    const missingPath = join(tmpDir, 'non-existent-spec.md')
    await expect(
      resolveParentChainNode(tmpDir, missingPath, 'non-existent-spec'),
    ).rejects.toThrow()
  })

  it('throws a controlled error on traversal attempts like ../../secret', async () => {
    const secretUrl = 'file:///../../secret'
    await expect(
      resolveParentChainNode(tmpDir, secretUrl, 'secret'),
    ).rejects.toThrow()
  })
})
