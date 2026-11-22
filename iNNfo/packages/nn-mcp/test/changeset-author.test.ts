/**
 * changeset-real-author: a changeset written without an explicit author records who
 * wrote it, never the literal `agent`; an explicit author is kept verbatim.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { parseChangeset } from '@cognnitive/nn-core'
import type { ChangeItem } from '@cognnitive/nn-core'
import { resolveDefaultAuthor, writeProposedChangeset } from '../src/tools/propose-changeset.js'

const root = join(import.meta.dirname!, '..', 'temp-test-changeset-author')
const CHANGE: ChangeItem = {
  id: 'c-01',
  op: 'freeze_slugs',
  target: 'strategy',
  evidence: 'decision',
}

let savedAuthor: string | undefined

beforeEach(async () => {
  savedAuthor = process.env.NN_AUTHOR
  delete process.env.NN_AUTHOR
  await rm(root, { recursive: true, force: true })
  await mkdir(root, { recursive: true })
})

afterEach(async () => {
  if (savedAuthor === undefined) delete process.env.NN_AUTHOR
  else process.env.NN_AUTHOR = savedAuthor
  await rm(root, { recursive: true, force: true })
})

async function authorOf(path: string): Promise<string> {
  const doc = parseChangeset(await readFile(join(root, path), 'utf-8'))
  return String(doc.frontmatter.author)
}

describe('changeset author', () => {
  it('records NN_AUTHOR when no author is passed', async () => {
    process.env.NN_AUTHOR = 'claude-code'
    const written = await writeProposedChangeset(root, { changes: [CHANGE] })
    expect(await authorOf(written.path)).toBe('claude-code')
    expect(written.path).toContain('_claude-code_')
  })

  it('never records the literal agent when nothing names the author', async () => {
    const author = resolveDefaultAuthor(root)
    expect(author).not.toBe('agent')
    expect(author.length).toBeGreaterThan(0)
    const written = await writeProposedChangeset(root, { changes: [CHANGE] })
    expect(await authorOf(written.path)).toBe(author)
  })

  it('keeps an explicit author verbatim, over NN_AUTHOR', async () => {
    process.env.NN_AUTHOR = 'claude-code'
    const written = await writeProposedChangeset(root, {
      changes: [CHANGE],
      author: 'Ada Lovelace',
    })
    expect(await authorOf(written.path)).toBe('Ada Lovelace')
  })
})
