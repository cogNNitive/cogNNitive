// The Versions tab: which bluepriNNts the domaiNN uses, whether they are the ones
// cogNNitive publishes and up to date, and what is installed. Computed at export
// time (the console never goes online) and rendered by the runtime.
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'
import { writeConsole } from '../scripts/export-console.mjs'
import { bootConsole } from './helpers/console-boot.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoCatalog = JSON.parse(
  readFileSync(join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'catalog.json'), 'utf8'),
)

function modelOf(html) {
  const b64 = /id="nn-model">([^<]*)</.exec(html)[1]
  return JSON.parse(inflateRawSync(Buffer.from(b64.trim(), 'base64')).toString())
}

async function exportWith(root, env) {
  const saved = {}
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try {
    const result = await writeConsole({ rootDir: root, open: false })
    return modelOf(readFileSync(result.path, 'utf8'))
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

describe('versions at export', () => {
  let scratch
  let domain

  before(() => {
    scratch = mkdtempSync(join(tmpdir(), 'nn-console-versions-'))
    domain = join(scratch, 'testlab')
    cpSync(join(here, 'fixtures', 'testlab'), domain, { recursive: true })
    rmSync(join(domain, 'domaiNN_console.html'), { force: true })
  })

  after(() => rmSync(scratch, { recursive: true, force: true }))

  it('classifies every bluepriNNt the domaiNN uses against its own catalog', async () => {
    const model = await exportWith(domain, {
      INNFO_CATALOG: undefined,
      INNFO_STATE_FILE: join(scratch, 'none.json'),
    })
    const rows = Object.fromEntries(model.meta.versions.blueprints.map((b) => [b.name, b]))
    assert.deepEqual(Object.keys(rows), ['changes', 'executions', 'procedures', 'TestLab'])
    // The changesets follow the changes bluepriNNt: it is listed like any other, once.
    assert.equal(rows.changes.status, 'current')
    assert.equal(rows.changes.adopted, 'V_0-15-0')
    assert.deepEqual(rows.changes.models, ['changes'])
    assert.equal(rows.executions.status, 'current')
    assert.equal(rows.executions.adopted, 'V_0-6-0')
    assert.deepEqual(rows.executions.models, ['verify-lineage-1'])
    assert.equal(rows.TestLab.status, 'unlisted')
    assert.equal(rows.TestLab.pinned, 'V_0-1-0')
    assert.deepEqual(rows.TestLab.models, ['TestLab_coverage_TestLab', 'TestLab_intake_TestLab'])
    assert.equal(model.meta.versions.catalog, 'available')
  })

  it('falls back to the catalog beside the bluepriNNt packages when the domaiNN has none', async () => {
    const own = join(domain, 'specs', 'bluepriNNts', 'catalog.json')
    const saved = readFileSync(own, 'utf8')
    rmSync(own)
    try {
      const model = await exportWith(domain, {
        INNFO_CATALOG: undefined,
        INNFO_STATE_FILE: join(scratch, 'none.json'),
      })
      const executions = model.meta.versions.blueprints.find((b) => b.name === 'executions')
      assert.equal(executions.adopted, repoCatalog.blueprints.executions.adopted)
    } finally {
      writeFileSync(own, saved)
    }
  })

  it('marks every bluepriNNt unknown when no catalog can be read', async () => {
    const model = await exportWith(domain, {
      INNFO_CATALOG: join(scratch, 'missing-catalog.json'),
      INNFO_STATE_FILE: join(scratch, 'none.json'),
    })
    assert.equal(model.meta.versions.catalog, 'unavailable')
    assert.deepEqual([...new Set(model.meta.versions.blueprints.map((b) => b.status))], ['unknown'])
  })

  it('reads what is installed from the state file, newest data only', async () => {
    const stateFile = join(scratch, 'state.json')
    writeFileSync(
      stateFile,
      JSON.stringify({
        manifest: 'https://cognnitive.com/use/manifest.md',
        skills: {
          nn: { commit: 'abcdef1234567', version: '1.4.0', updated_at: '2026-11-01T00:00:00Z' },
        },
        blueprints: {
          business: {
            commit: '1111111aaaa',
            version: 'V_0-6-0',
            path: '/x',
            updated_at: '2026-11-02T00:00:00Z',
          },
        },
        mcp: { 'nn-mcp': { commit: '2222222bbbb', updated_at: '2026-11-03T00:00:00Z' } },
        console: {
          'nn-console.bundle.js': {
            commit: '3333333cccc',
            version: '0.52.0',
            path: '/y',
            updated_at: '2026-11-04T00:00:00Z',
          },
        },
        cli: { nn: { version: '0.9.0', source_skill: 'nn', updated_at: '2026-11-05T00:00:00Z' } },
        projections: { claude: { dir: '/z', skills: {} } },
      }),
    )
    const model = await exportWith(domain, { INNFO_STATE_FILE: stateFile })
    assert.equal(model.meta.versions.installation.scope, 'file')
    assert.deepEqual(model.meta.versions.installation.components, [
      { kind: 'skill', name: 'nn', version: '1.4.0', updatedAt: '2026-11-01' },
      { kind: 'bluepriNNt', name: 'business', version: 'V_0-6-0', updatedAt: '2026-11-02' },
      { kind: 'MCP server', name: 'nn-mcp', version: '2222222', updatedAt: '2026-11-03' },
      { kind: 'console', name: 'nn-console.bundle.js', version: '0.52.0', updatedAt: '2026-11-04' },
      { kind: 'CLI', name: 'nn', version: '0.9.0', updatedAt: '2026-11-05' },
    ])
  })

  it('prefers the domaiNN own installation over the user one', async () => {
    mkdirSync(join(domain, '.agents'), { recursive: true })
    writeFileSync(
      join(domain, '.agents', 'bootstrap-state.json'),
      JSON.stringify({ skills: { nn: { version: '9.9.9' } } }),
    )
    try {
      const model = await exportWith(domain, { INNFO_STATE_FILE: undefined })
      assert.equal(model.meta.versions.installation.scope, 'domain')
      assert.equal(model.meta.versions.installation.components[0].version, '9.9.9')
    } finally {
      rmSync(join(domain, '.agents'), { recursive: true, force: true })
    }
  })

  it('says nothing is installed when no state file exists', async () => {
    const model = await exportWith(domain, { INNFO_STATE_FILE: join(scratch, 'none.json') })
    assert.equal(model.meta.versions.installation, null)
  })
})

const VERSIONS = {
  catalog: 'available',
  blueprints: [
    {
      name: 'business',
      models: ['crm'],
      pinned: 'V_0-4-1',
      adopted: 'V_0-6-0',
      status: 'upgrade-available',
      gap: 'minor',
    },
    {
      name: 'house',
      models: ['plan'],
      pinned: 'V_0-1-0',
      adopted: null,
      status: 'unlisted',
      gap: null,
    },
  ],
  installation: {
    scope: 'user',
    components: [{ kind: 'skill', name: 'nn', version: '1.4.0', updatedAt: '2026-11-01' }],
  },
}

function bootWith(versions) {
  return bootConsole({
    model: {
      meta: {
        title: 'D',
        modelId: 'crm',
        generated: '2026-11-24T10:00:00.000Z',
        models: [{ id: 'crm', title: 'CRM', blueprint: 'business' }],
        ...(versions ? { versions } : {}),
      },
      elements: [{ id: 'crm@a', modelId: 'crm', concept: 'Client', name: 'A', fields: {} }],
      matrices: [],
    },
  })
}

describe('Versions tab', () => {
  it('lists each bluepriNNt with plain-language status', () => {
    const { document } = bootWith(VERSIONS)
    assert.ok(document.querySelector('.nn-view-tab[data-tab="versions"]'))
    const rows = [
      ...document.querySelectorAll('#nn-tab-versions .nn-versions-blueprints tbody tr'),
    ].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent))
    assert.deepEqual(rows, [
      ['business', 'CRM', '0.4.1', '0.6.0', 'Update available (minor)', 'Published by cogNNitive'],
      ['house', 'plan', '0.1.0', '—', 'Not in the cogNNitive catalog', 'Local bluepriNNt'],
    ])
  })

  it('writes every version with dots, including the spec-style V_x-y-z ones', () => {
    const { document } = bootWith({
      ...VERSIONS,
      installation: {
        scope: 'user',
        components: [
          { kind: 'skill', name: 'nn', version: '1.4.0', updatedAt: '2026-11-01' },
          { kind: 'bluepriNNt', name: 'business', version: 'V_0-6-1', updatedAt: '2026-11-01' },
        ],
      },
    })
    const cells = [...document.querySelectorAll('#nn-tab-versions td')].map((td) => td.textContent)
    assert.ok(cells.includes('0.6.1'), 'the V_0-6-1 component reads 0.6.1')
    assert.ok(!cells.some((c) => /^V_\d/.test(c)), 'no version keeps the V_ spelling')
  })

  it('says when it was checked and that the console never goes online', () => {
    const { document } = bootWith(VERSIONS)
    assert.match(
      document.querySelector('#nn-tab-versions .nn-versions-checked').textContent,
      /Checked on 2026-11-24/,
    )
  })

  it('lists what is installed and how to check for newer versions', () => {
    const { document } = bootWith(VERSIONS)
    const rows = [
      ...document.querySelectorAll('#nn-tab-versions .nn-versions-installation tbody tr'),
    ].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent))
    assert.deepEqual(rows, [['skill', 'nn', '1.4.0', '2026-11-01']])
    assert.match(
      document.querySelector('#nn-tab-versions .nn-versions-installation').textContent,
      /skills-manager\.js status/,
    )
  })

  it('explains a missing installation record instead of an empty table', () => {
    const { document } = bootWith({ ...VERSIONS, installation: null })
    assert.equal(document.querySelector('#nn-tab-versions .nn-versions-installation table'), null)
    assert.match(
      document.querySelector('#nn-tab-versions .nn-versions-installation').textContent,
      /No installation record/,
    )
  })

  it('is absent when the payload carries no version data', () => {
    const { document } = bootWith(null)
    assert.equal(document.querySelector('.nn-view-tab[data-tab="versions"]'), null)
  })
})
