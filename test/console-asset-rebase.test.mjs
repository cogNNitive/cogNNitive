// S3b review follow-ups on scripts/export-console.mjs: a declared media value is
// rebased only when it reads like a path and stays inside the domain root, the
// rebased value is URL-encoded, and the document text survives in rawFields so a
// draft's original still matches the file.
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { nnConsole, bootConsole } from './helpers/console-boot.mjs'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')

const BLUEPRINT = `---
level: 2
spec_version: V_0-1-0
title: "Roadmap"
---

# NN Concept Definition
## NN Concept Definition: Initiative
type:: text

# NN Field Definition
## NN Field Definition: demo
concept:: Initiative
type:: video
`

const MODEL = `---
title: "x"
model_version: "V_1-0-0"
level: 3
parent_spec:
  name: "roadmap_V_0-1-0"
---

# NN Initiative
## NN Initiative: Spaced
  slug:: spaced
  demo:: sources/my demo.mp4

## NN Initiative: Pending
  slug:: pending
  demo:: TBD

## NN Initiative: Na
  slug:: na
  demo:: n/a

## NN Initiative: Escaping
  slug:: escaping
  demo:: ../outside.mp4
  sources:: ../outside.md@## Clients

## NN Initiative: Plain
  slug:: plain
  demo:: sources/plain.mp4
`

function slotOf(html, id) {
  const m = html.match(new RegExp(`<script type="application/json" id="${id}">([^]*?)</script>`))
  assert.ok(m, `slot ${id} present`)
  return JSON.parse(m[1])
}

describe('export-console asset rebasing (S3b review follow-ups)', () => {
  let root
  let schema
  let atRoot
  let deep

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-rebase-'))
    const dir = join(root, 'specs', 'bluepriNNts', 'roadmap')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'spec_NN.md'), BLUEPRINT, 'utf-8')
    await mkdir(join(root, 'models'), { recursive: true })
    await writeFile(join(root, 'models', 'roadmap_NN.md'), MODEL, 'utf-8')
    await mkdir(join(root, 'sources'), { recursive: true })
    await writeFile(join(root, 'sources', 'my demo.mp4'), 'x', 'utf-8')
    await writeFile(join(root, 'sources', 'plain.mp4'), 'x', 'utf-8')
    await execFileAsync(process.execPath, [scriptPath, root, '--domain', '--no-open'])
    const html = await readFile(join(root, 'domaiNN_console.html'), 'utf-8')
    schema = slotOf(html, 'nn-schema')
    atRoot = slotOf(html, 'nn-model')
    await execFileAsync(process.execPath, [scriptPath, root, 'roadmap', '--no-open'])
    const { readdir } = await import('node:fs/promises')
    const files = await readdir(join(root, 'artifacts'), { recursive: true })
    const page = files.find((f) => String(f).endsWith('.html'))
    assert.ok(page, 'a scoped console was written under artifacts/')
    deep = slotOf(await readFile(join(root, 'artifacts', page), 'utf-8'), 'nn-model')
  })

  after(() => rm(root, { recursive: true, force: true }))

  const el = (m, name) => m.elements.find((e) => e.name === name)

  it('leaves free text such as TBD or n/a untouched', () => {
    for (const m of [atRoot, deep]) {
      assert.equal(el(m, 'Pending').fields.demo, 'TBD')
      assert.equal(el(m, 'Na').fields.demo, 'n/a')
      assert.equal(el(m, 'Pending').rawFields, undefined)
    }
  })

  it('percent-encodes each path segment of a rebased value', () => {
    assert.equal(el(atRoot, 'Spaced').fields.demo, './sources/my%20demo.mp4')
    assert.equal(el(deep, 'Spaced').fields.demo, '../../sources/my%20demo.mp4')
  })

  it('does not rebase a value that resolves outside the domain root', () => {
    for (const m of [atRoot, deep]) {
      assert.equal(el(m, 'Escaping').fields.demo, '../outside.mp4')
    }
  })

  it('gives a citation that escapes the domain root (rejected by the engine) no href', () => {
    for (const m of [atRoot, deep]) {
      const cites = (el(m, 'Escaping').citations && el(m, 'Escaping').citations.sources) || []
      for (const c of cites) assert.equal(c.href, undefined, `no href for ${c.path}`)
    }
  })

  it('keeps the document text of a rebased value in rawFields', () => {
    assert.equal(el(deep, 'Plain').fields.demo, '../../sources/plain.mp4')
    assert.equal(el(deep, 'Plain').rawFields.demo, 'sources/plain.mp4')
  })

  it('a draft original is the document text, not the rebased display value', () => {
    const registry = nnConsole.createViewRegistry()
    let ctx
    registry.register({ id: 'probe', title: 'probe', icon: 'chart', order: 20, kind: 'editable', mount: (c) => (ctx = c) })
    const { document, res } = bootConsole({ registry, model: deep, schema })
    document.querySelector('.nn-view-tab[data-tab="probe"]').click()
    const window = document.defaultView
    const id = el(deep, 'Plain').id
    assert.equal(ctx.modal, undefined, 'views cannot reach the modal slot')
    assert.equal(res.controller.openEdit({ elementId: id, field: 'demo' }), true)
    const modal = document.querySelector('.nn-edit-modal')
    assert.equal(modal.querySelector('input').value, 'sources/plain.mp4', 'the editor shows the document text')
    modal.querySelector('input').value = 'sources/other.mp4'
    modal.querySelector('.nn-edit-btn-save').dispatchEvent(new window.Event('click', { bubbles: true }))
    const stored = Object.keys(window.localStorage).map((k) => window.localStorage.getItem(k)).join('|')
    assert.ok(stored.includes('"original":"sources/plain.mp4"'), 'draft original matches the file')
    assert.ok(!stored.includes('../../sources/plain.mp4'), 'the rebased value never reaches the draft')
  })
})

const IMG_BLUEPRINT = `---
level: 2
spec_version: V_0-1-0
title: "Gallery"
---

# NN Concept Definition
## NN Concept Definition: Evidence
type:: text

# NN Field Definition
## NN Field Definition: image
concept:: Evidence
type:: image
`

const IMG_MODEL = `---
title: "x"
model_version: "V_1-0-0"
level: 3
parent_spec:
  name: "gallery_V_0-1-0"
---

# NN Evidence
## NN Evidence: Foto Uno
  slug:: foto-uno
  image:: evidence/foo.jpg

## NN Evidence: Missing Photo
  slug:: missing-photo
  image:: evidence/absent.jpg
`

describe('export-console element-relative image assets (#182)', () => {
  let root
  let model

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-elemasset-'))
    const dir = join(root, 'specs', 'bluepriNNts', 'gallery')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'spec_NN.md'), IMG_BLUEPRINT, 'utf-8')
    await mkdir(join(root, 'kNNowledge', 'assets', 'foto-uno', 'evidence'), { recursive: true })
    await writeFile(join(root, 'kNNowledge', 'gallery_NN.md'), IMG_MODEL, 'utf-8')
    await writeFile(join(root, 'kNNowledge', 'assets', 'foto-uno', 'evidence', 'foo.jpg'), 'x', 'utf-8')
    await execFileAsync(process.execPath, [scriptPath, root, '--domain', '--no-open'])
    model = slotOf(await readFile(join(root, 'domaiNN_console.html'), 'utf-8'), 'nn-model')
  })

  after(() => rm(root, { recursive: true, force: true }))

  it('rebases an element-relative image under <modelDir>/assets/<slug>/', () => {
    const e = model.elements.find((x) => x.name === 'Foto Uno')
    assert.equal(e.fields.image, './kNNowledge/assets/foto-uno/evidence/foo.jpg')
    assert.equal(e.rawFields.image, 'evidence/foo.jpg')
  })

  it('keeps a missing element-relative image as authored', () => {
    const e = model.elements.find((x) => x.name === 'Missing Photo')
    assert.equal(e.fields.image.endsWith('evidence/absent.jpg'), true)
  })
})

describe('export-console isInsideRoot follows symlinks (#171 item 6)', () => {
  let root
  let outside
  let model

  before(async () => {
    const { symlink } = await import('node:fs/promises')
    root = await mkdtemp(join(tmpdir(), 'nn-symroot-'))
    outside = await mkdtemp(join(tmpdir(), 'nn-symout-'))
    const dir = join(root, 'specs', 'bluepriNNts', 'gallery')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'spec_NN.md'), IMG_BLUEPRINT, 'utf-8')
    await mkdir(join(root, 'models'), { recursive: true })
    await writeFile(
      join(root, 'models', 'gallery_NN.md'),
      IMG_MODEL.replace('evidence/foo.jpg', 'linked/secret.jpg').replace('evidence/absent.jpg', 'linked/absent.jpg'),
      'utf-8',
    )
    await writeFile(join(outside, 'secret.jpg'), 'x', 'utf-8')
    await symlink(outside, join(root, 'linked'), 'junction')
    await execFileAsync(process.execPath, [scriptPath, root, '--domain', '--no-open'])
    model = slotOf(await readFile(join(root, 'domaiNN_console.html'), 'utf-8'), 'nn-model')
  })

  after(async () => {
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  })

  it('does not rebase a value whose real path escapes the domain root through a link', () => {
    const e = model.elements.find((x) => x.name === 'Foto Uno')
    assert.equal(e.fields.image, 'linked/secret.jpg')
    assert.equal(e.rawFields, undefined)
  })
})
