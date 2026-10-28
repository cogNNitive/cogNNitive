import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { findStemCollisions, stemCollisionMessage } from './stem-collision.js'
import { listKnowledge } from '../helpers.js'

describe('findStemCollisions', () => {
  it('names the id and every path of a repeated stem', () => {
    const result = findStemCollisions([
      'programs/alpha/status_NN.md',
      'programs/beta/status_NN.md',
      'programs/alpha/risks_NN.md',
    ])
    expect(result).toEqual([
      { id: 'status_NN', paths: ['programs/alpha/status_NN.md', 'programs/beta/status_NN.md'] },
    ])
  })

  it('reports every colliding id, sorted by id, with sorted paths', () => {
    const result = findStemCollisions(['b/z_NN.md', 'a/z_NN.md', 'b/y_NN.md', 'a/y_NN.md', 'c/y_NN.md'])
    expect(result).toEqual([
      { id: 'y_NN', paths: ['a/y_NN.md', 'b/y_NN.md', 'c/y_NN.md'] },
      { id: 'z_NN', paths: ['a/z_NN.md', 'b/z_NN.md'] },
    ])
  })

  it('returns [] when every stem is unique per path', () => {
    expect(findStemCollisions(['a/one_NN.md', 'b/two_NN.md', 'three_NN.md'])).toEqual([])
    expect(findStemCollisions([])).toEqual([])
  })

  it('does not count the same path listed twice, nor backslash variants of it', () => {
    expect(findStemCollisions(['a/one_NN.md', 'a/one_NN.md', 'a\\one_NN.md'])).toEqual([])
  })

  it('formats a message naming the id and every path', () => {
    const msg = stemCollisionMessage({ id: 'script_NN', paths: ['a/script_NN.md', 'b/script_NN.md'] })
    expect(msg).toContain('script_NN')
    expect(msg).toContain('a/script_NN.md')
    expect(msg).toContain('b/script_NN.md')
  })
})

describe('same stem across nested domaiNNs', () => {
  let base: string

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'nn-stem-collision-'))
  })

  afterEach(() => {
    rmSync(base, { recursive: true, force: true })
  })

  const model = ['---', 'level: 3', 'parent_spec:', '  name: "business_V_0-2-0"', '---', ''].join('\n')

  function put(rel: string, content: string): void {
    const abs = join(base, rel)
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, content, 'utf-8')
  }

  it('is not a collision: model discovery does not descend into the nested domaiNN', async () => {
    put('domaiNN_NN.md', '# NN Models\n')
    put('status_NN.md', model)
    put('vendor/inner/domaiNN_NN.md', '# NN Models\n')
    put('vendor/inner/status_NN.md', model)

    const found = await listKnowledge(base)
    const rels = found.map((m) => relative(base, m.path))
    expect(rels.map((r) => r.replace(/\\/g, '/'))).toEqual(['status_NN.md'])
    expect(findStemCollisions(rels)).toEqual([])
  })
})
