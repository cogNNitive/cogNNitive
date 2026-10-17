import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { InnfoConsole, bootConsole } from './helpers/console-boot.mjs'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')

const blueprint = (title, body) =>
  `---\nlevel: 2\nspec_version: V_0-1-0\ntitle: "${title}"\n---\n\n${body}\n`

const FLEET = blueprint(
  'Fleet',
  `# NN Concept Definition
## NN Concept Definition: Vehicle
type:: text

## NN Concept Definition: Ghost
type:: text

# NN Field Definition
## NN Field Definition: status
concept:: Vehicle
type:: select
options:: [active, retired]

## NN Field Definition: status
concept:: Ghost
type:: select
options:: [free, trapped]

## NN Field Definition: driver
concept:: Vehicle
type:: reference
target_concepts:: [Ghost]

## NN Field Definition: notes
concept:: Vehicle
type:: markdown_inline`,
)

// Declares Vehicle.status differently: the first blueprint must win, with a warning.
const GARAGE = blueprint(
  'Garage',
  `# NN Concept Definition
## NN Concept Definition: Vehicle
type:: text

# NN Field Definition
## NN Field Definition: status
concept:: Vehicle
type:: select
options:: [parked, towed]`,
)

const model = (parent, body) =>
  `---\ntitle: "${parent}"\nmodel_version: "V_1-0-0"\nlevel: 3\nparent_spec:\n  name: "${parent}_V_0-1-0"\n---\n\n${body}\n`

const FLEET_MODEL = model(
  'fleet',
  `# NN Vehicle
## NN Vehicle: Ecto-1
  slug:: ecto-1
  status:: active
  mileage:: 120

# NN Ghost
## NN Ghost: Slimer
  slug:: slimer
  status:: free`,
)

const GARAGE_MODEL = model(
  'garage',
  `# NN Vehicle
## NN Vehicle: Bay-1
  slug:: bay-1
  status:: parked`,
)

function slotOf(html, id) {
  const m = html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`))
  assert.ok(m, `slot ${id} present`)
  return JSON.parse(m[1])
}

describe('P0-1 declared field types reach the console (end to end)', () => {
  let root
  let schema
  let model_
  let stderr

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-declared-fields-'))
    for (const [name, content] of [
      ['fleet', FLEET],
      ['garage', GARAGE],
    ]) {
      const dir = join(root, 'specs', 'bluepriNNts', name)
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, 'spec_NN.md'), content, 'utf-8')
    }
    await mkdir(join(root, 'models'), { recursive: true })
    await writeFile(join(root, 'models', 'a_fleet_V_1-0-0_NN.md'), FLEET_MODEL, 'utf-8')
    await writeFile(join(root, 'models', 'b_garage_V_1-0-0_NN.md'), GARAGE_MODEL, 'utf-8')
    const res = await execFileAsync(process.execPath, [scriptPath, root, '--domain', '--no-open'])
    stderr = res.stderr
    const html = await readFile(join(root, 'domaiNN_console.html'), 'utf-8')
    schema = slotOf(html, 'innfo-schema')
    model_ = slotOf(html, 'innfo-model')
  })

  after(() => rm(root, { recursive: true, force: true }))

  const fieldsOf = (concept, name) =>
    schema.fields.filter((f) => f.concept === concept && f.name === name)

  it('exports one flat entry per (concept, name) with type, options and target_concepts', () => {
    assert.ok(Array.isArray(schema.fields) && schema.fields.length > 0, 'fields is a non-empty array')
    assert.equal(fieldsOf('Vehicle', 'status').length, 1)
    assert.deepEqual(fieldsOf('Vehicle', 'status')[0].options, ['active', 'retired'])
    assert.equal(fieldsOf('Ghost', 'status')[0].type, 'select')
    assert.deepEqual(fieldsOf('Ghost', 'status')[0].options, ['free', 'trapped'])
    assert.deepEqual(fieldsOf('Vehicle', 'driver')[0].target_concepts, ['Ghost'])
    assert.equal(fieldsOf('Vehicle', 'notes')[0].type, 'markdown_inline')
  })

  it('warns at export when two blueprints declare the same (concept, field) differently', () => {
    assert.match(stderr, /WARNING: \[export-console\][^\n]*Vehicle[^\n]*status/)
  })

  function bootExport() {
    const registry = InnfoConsole.createViewRegistry()
    let ctx
    registry.register({
      id: 'probe',
      title: 'probe',
      icon: 'chart',
      order: 20,
      kind: 'editable',
      mount(c) {
        ctx = c
      },
    })
    const booted = bootConsole({ registry, model: model_, schema })
    booted.document.querySelector('.innfo-view-tab[data-tab="probe"]').click()
    const idOf = (name) => model_.elements.find((e) => e.name === name).id
    return { ...booted, ctx, idOf, controller: booted.res.controller }
  }

  it('renders declared select values as pills in the cards', () => {
    const { document } = bootExport()
    const pills = [...document.querySelectorAll('.innfo-field-select')].map((n) => n.textContent)
    assert.ok(pills.includes('active'), 'Vehicle.status renders as a select pill')
    assert.ok(pills.includes('free'), 'Ghost.status renders as a select pill')
  })

  it('opens the modal with each concept\'s own definition for a shared field name', () => {
    const { document, controller, idOf } = bootExport()
    const optionsOf = () =>
      [...document.querySelectorAll('.innfo-edit-modal select[data-innfo-widget="select"] option')].map(
        (o) => o.value,
      )
    assert.equal(controller.openEdit({ elementId: idOf('Ecto-1'), field: 'status' }), true)
    assert.deepEqual(optionsOf(), ['', 'active', 'retired'])
    assert.equal(controller.openEdit({ elementId: idOf('Slimer'), field: 'status' }), true)
    assert.deepEqual(optionsOf(), ['', 'free', 'trapped'])
  })

  it('opens an undeclared numeric field as a number input', () => {
    const { document, controller, idOf } = bootExport()
    assert.equal(controller.openEdit({ elementId: idOf('Ecto-1'), field: 'mileage' }), true)
    assert.ok(document.querySelector('.innfo-edit-modal input[type="number"]'))
  })
})
