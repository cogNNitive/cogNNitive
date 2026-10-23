import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeConsole } from '../export-console.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const domainDir = path.join(repo, 'site_NN')

test('the site_NN domain console exports', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'site-console-'))
  try {
    const root = path.join(tmp, 'site_NN')
    fs.cpSync(domainDir, root, { recursive: true })
    await writeConsole({ rootDir: root, open: false })
    const html = fs.readFileSync(path.join(root, 'domaiNN_console.html'), 'utf-8')
    const docs = fs.readdirSync(path.join(domainDir, 'kNNowledge')).filter((f) => f.endsWith('_NN.md'))
    assert.ok(docs.length >= 7, 'seed documents present')
    for (const doc of docs) {
      assert.match(html, new RegExp(`"filePath":\\s*"${doc}"`), `console is missing ${doc}`)
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
