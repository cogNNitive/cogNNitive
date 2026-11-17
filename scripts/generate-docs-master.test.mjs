import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import {
  MASTER_PATH,
  renderDocsMaster,
  rewriteRelativeLinks,
  stripFrontmatter,
} from './generate-docs-master.mjs'

const DOCS_ROOT = path.resolve(import.meta.dirname, '..', 'docs', 'documentation')
const CONCEPTS = path.join(DOCS_ROOT, 'content', 'concepts')

test('a sibling link is re-anchored to the docs root', () => {
  assert.equal(
    rewriteRelativeLinks('See [The four levels](levels.md).', CONCEPTS, DOCS_ROOT),
    'See [The four levels](content/concepts/levels.md).',
  )
})

test('a parent-relative link survives the move', () => {
  assert.equal(
    rewriteRelativeLinks('[Vocabulary](../vocabulary.md)', CONCEPTS, DOCS_ROOT),
    '[Vocabulary](content/vocabulary.md)',
  )
})

test('a fragment is preserved and a bare anchor is left alone', () => {
  assert.equal(
    rewriteRelativeLinks(
      '[Storage](storage-and-identity.md#identity) [top](#contents)',
      CONCEPTS,
      DOCS_ROOT,
    ),
    '[Storage](content/concepts/storage-and-identity.md#identity) [top](#contents)',
  )
})

test('images and titles are rewritten like links', () => {
  assert.equal(
    rewriteRelativeLinks('![diagram](assets/er.png "Entity model")', CONCEPTS, DOCS_ROOT),
    '![diagram](content/concepts/assets/er.png "Entity model")',
  )
})

test('URLs and docs-root-absolute targets are untouched', () => {
  const markdown = '[spec](https://example.com/spec.md) [mail](mailto:a@b.c) [abs](/use/cli.md)'
  assert.equal(rewriteRelativeLinks(markdown, CONCEPTS, DOCS_ROOT), markdown)
})

test('a link inside a fenced block is content, not a link', () => {
  const markdown = ['```markdown', '[Page](levels.md)', '```'].join('\n')
  assert.equal(rewriteRelativeLinks(markdown, CONCEPTS, DOCS_ROOT), markdown)
})

test('frontmatter is dropped and a body rule is kept', () => {
  assert.equal(stripFrontmatter('---\ntitle: x\n---\n\nBody\n'), '\nBody\n')
  assert.equal(stripFrontmatter('Body\n\n---\n\nMore\n'), 'Body\n\n---\n\nMore\n')
})

test('the master document carries every page and no dead relative link', () => {
  const rendered = renderDocsMaster(DOCS_ROOT)
  assert.match(rendered, /^# .*: master document\n/)
  assert.ok(rendered.includes('## Contents'))

  for (const page of ['The four levels', 'The entity-relationship model', 'MCP tools']) {
    assert.ok(rendered.includes(page), `master document must carry ${page}`)
  }

  const targets = [...rendered.matchAll(/!?\[[^\]]*\]\(([^)\s]+)/g)].map((match) => match[1])
  const dead = targets
    .filter((target) => !/^(#|[a-zA-Z][a-zA-Z0-9+.-]*:)/.test(target))
    .filter((target) => !fs.existsSync(path.resolve(DOCS_ROOT, target.split('#')[0])))
  assert.deepEqual(dead, [])
})

test('the committed master document is the one the model renders', () => {
  const committed = fs.readFileSync(MASTER_PATH, 'utf8').replace(/\r\n/g, '\n')
  assert.equal(committed, renderDocsMaster(DOCS_ROOT))
})
