/**
 * scripts/lib/skills-commands.test.js
 *
 * `status` and `update` read a bluepriNNt's provenance from the installed unit —
 * the `.blueprint-lock.json` beside it and the publisher's `versions.json` — never
 * from a catalog (blueprints-distribution plan, P1, S5). Every run uses an
 * isolated HOME, an explicit catalog and local servers.
 */

const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { digestTree } = require('./blueprint-provenance.js')
const { assertBlueprintCompatibility, installBlueprintAtCommit } = require('./skills-commands.js')

const managerScript = path.join(__dirname, '..', 'skills-manager.js')
const COMMIT = '1111111111111111111111111111111111111111'
const INSTALLED_COMMIT = '6666666666666666666666666666666666666666'
const PUBLISHED_COMMIT = '7777777777777777777777777777777777777777'
const BLUEPRINT_PATH = 'iNNfo/specs/bluepriNNts/coNNtent'

const MANIFEST = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-sample
      repo: cogNNitive/actioNN
      path: skills/nn-sample
      version: "1.0.0"
      commit: "${COMMIT}"
---
# Manifest`

function serve(content) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/markdown' })
      res.end(content)
    })
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/manifest.md`,
        close: () => new Promise((r) => server.close(r)),
      })
    })
  })
}

/** Serves the publisher side of one blueprint: `versions.json` and one commit's tree. */
function servePublisher({ versions, manifestAt }) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const routes = {
        [`/o/r/main/${BLUEPRINT_PATH}/versions.json`]: versions,
        ...manifestAt,
      }
      const body = routes[req.url]
      if (body === undefined) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('not found')
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(body)
    })
    server.listen(0, '127.0.0.1', () => {
      resolve({
        base: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((r) => server.close(r)),
      })
    })
  })
}

function run(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [managerScript, ...args], { env })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (c) => {
      stdout += c
    })
    child.stderr.on('data', (c) => {
      stderr += c
    })
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}

function versionsBody(...list) {
  return JSON.stringify({ versions: list })
}

function manifestBody(version) {
  return JSON.stringify({
    name: 'coNNtent',
    version,
    format_version: 'V_0-5-0',
    distribution_url: 'placeholder',
  })
}

/**
 * One installed skill, plus one installed `coNNtent` package whose provenance is
 * either recorded (`installed`) or absent (`installed: null`), published at
 * `published` by a local server.
 */
async function fixture({ installed, published, arms = 'published', withDigests = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-commands-bp-'))
  const home = path.join(root, 'home')
  const skillsDir = path.join(root, 'skills')
  const blueprintsDir = path.join(root, 'bluepriNNts')
  const stateFile = path.join(root, 'bootstrap-state.json')
  const catalogFile = path.join(root, 'catalog.json')
  fs.mkdirSync(home, { recursive: true })
  fs.mkdirSync(path.join(skillsDir, 'nn-sample'), { recursive: true })
  fs.writeFileSync(path.join(skillsDir, 'nn-sample', 'SKILL.md'), '# sample\n')
  fs.mkdirSync(blueprintsDir, { recursive: true })

  let publisher = null
  let pkgDir = null
  if (installed !== undefined) {
    pkgDir = path.join(blueprintsDir, 'coNNtent')
    fs.mkdirSync(pkgDir, { recursive: true })
    fs.writeFileSync(
      path.join(pkgDir, 'spec_NN.md'),
      `---\nlevel: 2\nblueprint_name: "coNNtent"\nblueprint_version: "${installed || 'V_0-15-1'}"\n---\n# coNNtent\n`,
    )

    publisher = await servePublisher({
      versions:
        arms === 'unreachable'
          ? undefined
          : versionsBody({
              version: published,
              tag: 'blueprints-v0.60.0',
              commit: PUBLISHED_COMMIT,
            }),
      manifestAt: {
        [`/o/r/${PUBLISHED_COMMIT}/${BLUEPRINT_PATH}/blueprint.json`]: manifestBody(published),
      },
    })

    const distributionUrl =
      arms === 'unreachable'
        ? `http://127.0.0.1:1/o/r/main/${BLUEPRINT_PATH}`
        : `${publisher.base}/o/r/main/${BLUEPRINT_PATH}`

    fs.writeFileSync(
      path.join(pkgDir, 'blueprint.json'),
      JSON.stringify(
        {
          name: 'coNNtent',
          version: installed,
          format_version: 'V_0-5-0',
          distribution_url: distributionUrl,
        },
        null,
        2,
      ),
    )

    if (installed !== null) {
      fs.writeFileSync(
        path.join(blueprintsDir, '.blueprint-lock.json'),
        JSON.stringify(
          {
            format_version: 1,
            blueprints: {
              coNNtent: {
                version: installed,
                tag: 'blueprints-v0.59.0',
                commit: INSTALLED_COMMIT,
                distribution_url: distributionUrl,
                digests: withDigests ? digestTree(pkgDir) : {},
              },
            },
          },
          null,
          2,
        ),
      )
    }
  }

  fs.writeFileSync(
    stateFile,
    JSON.stringify({
      skills: { 'nn-sample': { commit: COMMIT, version: '1.0.0' } },
      blueprints: {},
    }),
  )
  fs.writeFileSync(
    catalogFile,
    JSON.stringify({
      blueprints: {
        coNNtent: {
          name: 'coNNtent',
          adopted: 'V_0-18-0',
          release_tag: 'blueprints-v0.58.0',
          versions: [{ blueprint_version: 'V_0-18-0' }],
        },
      },
    }),
  )
  const server = await serve(MANIFEST)
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    SM_MANIFEST_URL: server.url,
    COGNNITIVE_CATALOG: catalogFile,
  }
  delete env.SM_CATALOG
  const flags = [
    '--skills-dir',
    skillsDir,
    '--blueprints-dir',
    blueprintsDir,
    '--state',
    stateFile,
    '--agent',
    'claude',
  ]
  return {
    env,
    flags,
    root,
    blueprintsDir,
    pkgDir,
    close: async () => {
      await server.close()
      if (publisher) await publisher.close()
      fs.rmSync(root, { recursive: true, force: true })
    },
  }
}

function rowFor(stdout, name) {
  return stdout
    .split('\n')
    .find((line) => new RegExp(`^catalog\\s*\\|\\s*${name}\\s*\\|`).test(line))
}

test('status reports current when the installed unit matches the published version (A1)', async () => {
  const f = await fixture({ installed: 'V_0-18-0', published: 'V_0-18-0' })
  try {
    const res = await run(['status', ...f.flags], f.env)
    assert.strictEqual(res.status, 0, res.stderr)
    const row = rowFor(res.stdout, 'coNNtent')
    assert.ok(row, res.stdout)
    assert.deepStrictEqual(
      row.split('|').map((c) => c.trim()),
      ['catalog', 'coNNtent', 'V_0-18-0', 'V_0-18-0', 'current'],
    )
  } finally {
    await f.close()
  }
})

test('status detects a version bump at the recorded distribution_url (A2)', async () => {
  const f = await fixture({ installed: 'V_0-15-1', published: 'V_0-18-0' })
  try {
    const res = await run(['status', ...f.flags], f.env)
    assert.strictEqual(res.status, 0, res.stderr)
    const row = rowFor(res.stdout, 'coNNtent')
    assert.ok(row, res.stdout)
    assert.strictEqual(row.split('|').map((c) => c.trim())[4], 'update-available')
    assert.ok(res.stdout.includes('update --blueprint coNNtent'), res.stdout)
    assert.ok(res.stdout.includes('published V_0-18-0'), res.stdout)
  } finally {
    await f.close()
  }
})

test('status reports an unreachable publisher loudly, naming its URL (A3)', async () => {
  const f = await fixture({ installed: 'V_0-15-1', published: 'V_0-18-0', arms: 'unreachable' })
  try {
    const res = await run(['status', ...f.flags], f.env)
    assert.strictEqual(res.status, 0, res.stderr)
    const row = rowFor(res.stdout, 'coNNtent')
    assert.ok(row, res.stdout)
    assert.strictEqual(row.split('|').map((c) => c.trim())[4], 'unreachable')
    assert.ok(res.stdout.includes('http://127.0.0.1:1/o/r/main/'), res.stdout)
    assert.ok(!row.includes('up-to-date'), res.stdout)
  } finally {
    await f.close()
  }
})

test('a unit installed before provenance existed reports unknown, never current (A4)', async () => {
  const f = await fixture({ installed: null, published: 'V_0-18-0' })
  try {
    const res = await run(['status', ...f.flags], f.env)
    assert.strictEqual(res.status, 0, res.stderr)
    const row = rowFor(res.stdout, 'coNNtent')
    assert.ok(row, res.stdout)
    assert.strictEqual(row.split('|').map((c) => c.trim())[4], 'unknown')
    assert.ok(!row.includes('up-to-date'), res.stdout)
    assert.ok(/no provenance recorded/.test(res.stdout), res.stdout)
  } finally {
    await f.close()
  }
})

test('update selects a unit whose provenance reports an available version', async () => {
  const f = await fixture({ installed: 'V_0-15-1', published: 'V_0-18-0' })
  try {
    // No --yes and no TTY: the consent gate names what would be updated and exits 2.
    const res = await run(['update', ...f.flags], f.env)
    assert.strictEqual(res.status, 2, `${res.stdout}\n${res.stderr}`)
    assert.ok(!res.stdout.includes('up to date'), res.stdout)
    assert.ok(/needs decision: .*catalog:coNNtent/.test(res.stdout), res.stdout)
  } finally {
    await f.close()
  }
})

test('update reports up to date when provenance reports current', async () => {
  const f = await fixture({ installed: 'V_0-18-0', published: 'V_0-18-0' })
  try {
    const res = await run(['update', ...f.flags], f.env)
    assert.strictEqual(res.status, 0, res.stderr)
    assert.ok(
      res.stdout.includes('All skills, templates, and console assets up to date.'),
      res.stdout,
    )
  } finally {
    await f.close()
  }
})

test('skills-only output of status and update is unchanged (existing behaviour)', async () => {
  const f = await fixture()
  try {
    const status = await run(['status', ...f.flags], f.env)
    assert.strictEqual(status.status, 0, status.stderr)
    assert.strictEqual(
      status.stdout,
      [
        'Type  | Name      | Pinned  | Installed | Status    ',
        '----- | --------- | ------- | --------- | ----------',
        'skill | nn-sample | 1111111 | 1111111   | up-to-date',
        '',
      ].join('\n'),
    )
    const update = await run(['update', ...f.flags], f.env)
    assert.strictEqual(update.status, 0, update.stderr)
    assert.strictEqual(
      update.stdout.split('\n')[0],
      'All skills, templates, and console assets up to date.',
    )
  } finally {
    await f.close()
  }
})

test('status reports modified-locally when a managed blueprint file is edited by hand (P3, D9)', async () => {
  const f = await fixture({ installed: 'V_0-15-1', published: 'V_0-18-0', withDigests: true })
  try {
    // Modify a file in the managed blueprint package
    fs.appendFileSync(path.join(f.pkgDir, 'spec_NN.md'), '\n<!-- user hand edit -->\n')

    const res = await run(['status', ...f.flags], f.env)
    assert.strictEqual(res.status, 0, res.stderr)
    const row = rowFor(res.stdout, 'coNNtent')
    assert.ok(row, res.stdout)
    assert.strictEqual(row.split('|').map((c) => c.trim())[4], 'modified-locally')
    assert.ok(res.stdout.includes('spec_NN.md (modified)'), res.stdout)
    assert.ok(res.stdout.includes('update is refused to protect local edits'), res.stdout)
  } finally {
    await f.close()
  }
})

test('update --blueprint refuses when a managed blueprint file is edited by hand (P3, D9)', async () => {
  const f = await fixture({ installed: 'V_0-15-1', published: 'V_0-18-0', withDigests: true })
  try {
    // Modify a file in the managed blueprint package
    fs.appendFileSync(path.join(f.pkgDir, 'spec_NN.md'), '\n<!-- user hand edit -->\n')

    const res = await run(['update', '--blueprint', 'coNNtent', ...f.flags], f.env)
    assert.notStrictEqual(res.status, 0, 'Must exit non-zero on refusal')
    const combinedOutput = `${res.stdout}\n${res.stderr}`
    assert.ok(combinedOutput.includes("refusing to update blueprint 'coNNtent'"), combinedOutput)
    assert.ok(combinedOutput.includes('locally modified'), combinedOutput)
  } finally {
    await f.close()
  }
})

test('update proceeds when only unmanaged user content outside the blueprint is modified (P3, D9)', async () => {
  const f = await fixture({ installed: 'V_0-15-1', published: 'V_0-18-0', withDigests: true })
  try {
    // Modify user content outside the blueprint directory
    const userDocDir = path.join(f.root, 'series', 'episode1')
    fs.mkdirSync(userDocDir, { recursive: true })
    fs.writeFileSync(path.join(userDocDir, 'scene.md'), '# User Scene\n')

    // Without --yes in non-TTY, update detects coNNtent and exits 2 for consent
    const res = await run(['update', ...f.flags], f.env)
    assert.strictEqual(res.status, 2, `${res.stdout}\n${res.stderr}`)
    assert.ok(/needs decision: .*catalog:coNNtent/.test(res.stdout), res.stdout)
  } finally {
    await f.close()
  }
})

// P5 / D7: Compatibility contract tests
test('assertBlueprintCompatibility refuses incompatible engine requirements', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-compat-'))
  try {
    fs.writeFileSync(
      path.join(tmp, 'blueprint.json'),
      JSON.stringify({ name: 'future-bp', requires: { engine: '>=99.0.0' }, format_version: 'V_0-5-0' }),
    )
    assert.throws(
      () => assertBlueprintCompatibility('future-bp', tmp),
      /refusing to install blueprint 'future-bp': incompatible engine/,
    )
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('assertBlueprintCompatibility accepts compatible engine requirements', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-compat-'))
  try {
    fs.writeFileSync(
      path.join(tmp, 'blueprint.json'),
      JSON.stringify({ name: 'compat-bp', requires: { engine: '^0.60.0' }, format_version: 'V_0-5-0' }),
    )
    assert.doesNotThrow(() => assertBlueprintCompatibility('compat-bp', tmp))
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('assertBlueprintCompatibility refuses unsupported format_version', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-compat-'))
  try {
    fs.writeFileSync(
      path.join(tmp, 'blueprint.json'),
      JSON.stringify({ name: 'future-format', format_version: 'V_99-0-0' }),
    )
    assert.throws(
      () => assertBlueprintCompatibility('future-format', tmp),
      /refusing to install blueprint 'future-format': unsupported format_version 'V_99-0-0'/,
    )
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('assertBlueprintCompatibility reads frontmatter requirements from spec_NN.md when blueprint.json is absent', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-compat-'))
  try {
    fs.writeFileSync(
      path.join(tmp, 'spec_NN.md'),
      '---\nlevel: 2\nblueprint_name: "md-bp"\nrequires:\n  engine: ">=99.0.0"\nformat_version: "V_0-5-0"\n---\n# md-bp\n',
    )
    assert.throws(
      () => assertBlueprintCompatibility('md-bp', tmp),
      /refusing to install blueprint 'md-bp': incompatible engine/,
    )
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('installBlueprintAtCommit refuses blueprint requiring incompatible engine before writing files (P5, D7)', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-install-fail-'))
  try {
    const blueprintsDir = path.join(tmp, 'bluepriNNts')
    const fakeSourceDir = path.join(tmp, 'source', 'future-bp')
    fs.mkdirSync(fakeSourceDir, { recursive: true })
    fs.writeFileSync(
      path.join(fakeSourceDir, 'blueprint.json'),
      JSON.stringify({ name: 'future-bp', requires: { engine: '>=99.0.0' }, format_version: 'V_0-5-0' }),
    )
    fs.writeFileSync(path.join(fakeSourceDir, 'spec_NN.md'), '# future-bp\n')

    assert.throws(
      () => assertBlueprintCompatibility('future-bp', fakeSourceDir),
      /refusing to install blueprint 'future-bp': incompatible engine/,
    )

    // Verify blueprints destination directory has no files written
    assert.strictEqual(fs.existsSync(path.join(blueprintsDir, 'future-bp')), false)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
