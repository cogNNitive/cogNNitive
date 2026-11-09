/**
 * test/console-direct-write.test.mjs
 *
 * Direct write to a connected domaiNN folder (capability console-changes-direct-write;
 * design D-C2; tasks 4a.5/4a.6). The picker, the handle store and the file system are
 * fakes: the contract is the workspace match, the permission flow and the `wx` write.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const nnFsa = require(join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console', 'nn-fsa.js'))

const DOMAIN = '---\nname: "Demo"\nworkspace_id: "ws-1"\n---\n\n# NN DomaiNN\n'

function memoryStore() {
  const map = new Map()
  return {
    map,
    get: async (key) => map.get(key) || null,
    set: async (key, value) => {
      map.set(key, value)
    },
  }
}

function fakeFileHandle(text) {
  return { getFile: async () => ({ text: async () => text }) }
}

function fakeDirectory({ domainText = DOMAIN, files = new Map(), permission = 'granted' } = {}) {
  const dir = {
    dirs: new Map(),
    files,
    async getFileHandle(name, options = {}) {
      if (name === 'domaiNN_NN.md') return fakeFileHandle(domainText)
      if (files.has(name)) {
        if (options.create) throw Object.assign(new Error('exists'), { name: 'TypeMismatchError' })
        return files.get(name)
      }
      if (!options.create) throw Object.assign(new Error('not found'), { name: 'NotFoundError', code: 8 })
      const written = { text: '', async createWritable() {
        const self = this
        return {
          async write(value) { self.text = value },
          async close() {},
        }
      } }
      files.set(name, written)
      return written
    },
    async getDirectoryHandle(name, options = {}) {
      if (!dir.dirs.has(name)) {
        if (!options.create) throw Object.assign(new Error('not found'), { name: 'NotFoundError', code: 8 })
        dir.dirs.set(name, fakeDirectory({ files: new Map() }))
      }
      return dir.dirs.get(name)
    },
    queryPermission: async () => permission,
    requestPermission: async () => 'granted',
  }
  return dir
}

function writerWith({ picker, store = memoryStore(), permission = 'granted', now } = {}) {
  const win = { showDirectoryPicker: picker || (async () => fakeDirectory({ permission })) }
  return { writer: nnFsa.createWriter({ win, store, now }), store }
}

test('names use the workspace, the reviewer slug and the stamp', () => {
  assert.equal(
    nnFsa.changesetFilename({ workspaceId: 'ws-1', reviewer: 'Ana Pérez', stamp: '20261109T120000Z' }),
    'ws-1_ana_perez_20261109T120000Z_changes_NN.md',
  )
  assert.equal(nnFsa.slugifyReviewer('  Dr. John--Smith  '), 'dr_john_smith')
  assert.equal(nnFsa.slugifyReviewer(''), 'reviewer')
  assert.equal(nnFsa.compactStamp(new Date('2026-11-09T12:00:00.000Z')), '20261109T120000Z')
  assert.equal(nnFsa.workspaceIdOf(DOMAIN), 'ws-1')
});

test('connecting stores the handle only for the matching workspace', async () => {
  const store = memoryStore()
  const { writer } = writerWith({ store })
  const ok = await writer.connect('ws-1')
  assert.equal(ok.ok, true)
  assert.equal(store.map.get('ws-1'), ok.handle)

  const other = writerWith({ store: memoryStore(), picker: async () => fakeDirectory({ domainText: '---\nworkspace_id: "ws-2"\n---\n' }) }).writer
  const mismatch = await other.connect('ws-1')
  assert.equal(mismatch.ok, false)
  assert.equal(mismatch.reason, 'workspace-mismatch')
});

test('writing a changeset asks for permission and never overwrites (wx)', async () => {
  const store = memoryStore()
  const handle = fakeDirectory({ permission: 'prompt' })
  store.set('ws-1', handle)
  const { writer } = writerWith({ store })

  const first = await writer.writeChangeset({ workspaceId: 'ws-1', reviewer: 'Ana', text: 'one', stamp: 'S1' })
  assert.equal(first.ok, true)
  assert.equal(first.filename, 'ws-1_ana_S1_changes_NN.md')
  const changes = handle.dirs.get('changes')
  assert.equal(changes.files.get('ws-1_ana_S1_changes_NN.md').text, 'one')

  const again = await writer.writeChangeset({ workspaceId: 'ws-1', reviewer: 'Ana', text: 'two', stamp: 'S1' })
  assert.equal(again.ok, false)
  assert.equal(again.reason, 'exists')
  assert.equal(changes.files.get('ws-1_ana_S1_changes_NN.md').text, 'one', 'an existing changeset is untouched')
});

test('a denied permission writes nothing', async () => {
  const store = memoryStore()
  const handle = fakeDirectory({ permission: 'denied' })
  handle.requestPermission = async () => 'denied'
  store.set('ws-1', handle)
  const { writer } = writerWith({ store })
  const res = await writer.writeChangeset({ workspaceId: 'ws-1', reviewer: 'Ana', text: 'x' })
  assert.equal(res.ok, false)
  assert.equal(res.reason, 'permission-denied')
});

test('no folder and no API fall back to the download path', async () => {
  const { writer } = writerWith({ store: memoryStore() })
  const res = await writer.writeChangeset({ workspaceId: 'ws-1', reviewer: 'Ana', text: 'x' })
  assert.equal(res.ok, false)
  assert.equal(res.reason, 'no-folder')

  const noApi = nnFsa.createWriter({ win: {}, store: memoryStore() })
  assert.equal(noApi.available(), false)
  assert.equal((await noApi.connect('ws-1')).reason, 'fsa-unavailable')
});
