#!/usr/bin/env node

/**
 * skills/nn-upgrade/scripts/migrate-domain.test.js
 *
 * Test suite for migrate-domain.js: the retired in-place flows are rejected, while
 * --freeze-slugs and --import-as-source keep working.
 */

const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

const SCRIPT_DIR = __dirname
const MIGRATE_CLI = path.join(SCRIPT_DIR, 'migrate-domain.js')
const { freezeDomainSlugs } = require('./migrate-domain.js')

function runCli(args) {
  return spawnSync(process.execPath, [MIGRATE_CLI, ...args], { encoding: 'utf-8' })
}

function sha256File(file) {
  const content = fs.readFileSync(file)
  return crypto.createHash('sha256').update(content).digest('hex')
}

function populateLegacyDomain(dir) {
  fs.mkdirSync(path.join(dir, 'models'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'specs', 'templates', 'workspace'), { recursive: true })
  fs.mkdirSync(path.join(dir, 'feedback'), { recursive: true })

  fs.writeFileSync(
    path.join(dir, 'workspace_NN.md'),
    '---\ntemplate_version: "0.1.0"\ntemplate_name: "workspace"\nmodels_dir: "models"\ntemplates_dir: "specs/templates"\nparent_spec:\n  name: "workspace"\n  url: "https://raw.githubusercontent.com/cognnitive/innfo/main/iNNfo/specs/templates/workspace/spec_NN.md"\n---\n# NN index\n\n* [[Workspace]]\n* [[Models]]\n\n# NN Workspace\n\n- Ref: path:: models/core_NN.md\n- Sources: fuentes:: ["models/core_NN.md"]\n- Link: [Core](./models/core_NN.md)\n- Wikilink: [[#Workspace]]\n\n## NN Models\n\n## NN Templates\n',
    'utf-8',
  )

  fs.writeFileSync(
    path.join(dir, 'models', 'core_NN.md'),
    '---\nmodel_version: "0.1.0"\nblueprint_name: "custom_app"\n---\n# Custom App Heading\n\n- Field:: value\n- Related: fuentes:: ["models/core_NN.md"]\n',
    'utf-8',
  )

  fs.writeFileSync(
    path.join(dir, 'feedback', 'core_feedback_20260929-120000.json'),
    JSON.stringify(
      {
        source_model: 'core',
        source_model_version: '0.1.0',
        target_template: 'custom_app',
      },
      null,
      2,
    ),
    'utf-8',
  )
}

async function runTests() {
  console.log('Running migrate-domain.js unit tests...')
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-domain-test-'))

  try {
    // 1. Retired flags are rejected as unknown options and write nothing
    {
      const domainDir = path.join(tmpRoot, 'retired-flags-domain')
      fs.mkdirSync(domainDir, { recursive: true })
      populateLegacyDomain(domainDir)
      const before = fs.readdirSync(domainDir).sort()

      const retired = [
        ['--layout-only'],
        ['--apply', '--plan-hash', 'abc', '--yes'],
        ['--restore', path.join(tmpRoot, 'no-backup')],
        ['--migrate-references'],
        ['--migrate-references', '--apply'],
      ]
      for (const flags of retired) {
        const res = runCli(['--domain-dir', domainDir, ...flags])
        assert.notStrictEqual(res.status, 0, `${flags[0]} must exit non-zero`)
        assert.ok(
          `${res.stderr}${res.stdout}`.includes(`unknown option: ${flags[0]}`),
          `${flags[0]} reports "unknown option", got: ${res.stderr}`,
        )
      }
      assert.deepStrictEqual(fs.readdirSync(domainDir).sort(), before, 'rejected flags wrote nothing')

      const bare = runCli(['--domain-dir', domainDir])
      assert.notStrictEqual(bare.status, 0, 'no mode flag prints usage and exits non-zero')
      assert.ok(bare.stderr.includes('Usage:'), 'usage names the surviving modes')
      assert.ok(!/--layout-only|--restore|--plan-hash|--migrate-references/.test(bare.stderr), 'usage names no retired flag')
      console.log('✔ retired Flow A flags and --migrate-references are rejected as unknown options')
    }

    // 2. Import-as-source mode
    {
      const legacyDir = path.join(tmpRoot, 'source-legacy-domain')
      const newDomainDir = path.join(tmpRoot, 'imported-target-domain')
      fs.mkdirSync(legacyDir, { recursive: true })
      populateLegacyDomain(legacyDir)

      const initialLegacySha = sha256File(path.join(legacyDir, 'workspace_NN.md'))

      const res = runCli([
        '--domain-dir',
        legacyDir,
        '--import-as-source',
        '--new-domain-dir',
        newDomainDir,
      ])
      assert.strictEqual(res.status, 0, res.stderr)
      assert.ok(fs.existsSync(path.join(newDomainDir, 'domaiNN_NN.md')), 'new domaiNN created')
      assert.ok(
        fs.existsSync(path.join(newDomainDir, 'sources', 'legacy', 'workspace_NN.md')),
        'legacy tree copied under sources/legacy',
      )
      const importedLegacySha = sha256File(path.join(newDomainDir, 'sources', 'legacy', 'workspace_NN.md'))
      assert.strictEqual(initialLegacySha, importedLegacySha, 'imported legacy domain is byte-identical')
      console.log('✔ --import-as-source scaffolds domaiNN and imports legacy tree byte-identically')
    }

    // 3. freezeDomainSlugs scans and freezes unfrozen Level-3 models
    {
      const freezeDir = path.join(tmpRoot, 'domain-freeze')
      const kDir = path.join(freezeDir, 'kNNowledge')
      fs.mkdirSync(kDir, { recursive: true })

      const modelPath = path.join(kDir, 'product_V_0-1-0_NN.md')
      fs.writeFileSync(
        modelPath,
        `---
spec_version: "V_0-4-0"
level: 3
title: "Product"
parent_spec:
  name: "business"
  url: "https://example.com/business.md"
knowledge_version: "V_0-1-0"
---

# NN Item

## NN Item: Widget One
field:: value

## NN Item: Widget Two
field:: other
`,
        'utf8',
      )

      // Dry run via function
      const dryResult = await freezeDomainSlugs(freezeDir, { dryRun: true })
      assert.strictEqual(dryResult.scanned, 1)
      assert.strictEqual(dryResult.modified, 1)
      assert.strictEqual(dryResult.frozenModels[0].frozenCount, 2)
      // verify file not modified yet
      assert.ok(!fs.readFileSync(modelPath, 'utf8').includes('slug::'))

      // Apply via function
      const applyResult = await freezeDomainSlugs(freezeDir, { dryRun: false })
      assert.strictEqual(applyResult.modified, 1)
      const updatedContent = fs.readFileSync(modelPath, 'utf8')
      assert.ok(updatedContent.includes('slug:: widget-one'))
      assert.ok(updatedContent.includes('slug:: widget-two'))

      // Second run is a noop
      const noopResult = await freezeDomainSlugs(freezeDir, { dryRun: false })
      assert.strictEqual(noopResult.modified, 0)

      // Test CLI flag --freeze-slugs
      const cliRes = runCli(['--domain-dir', freezeDir, '--freeze-slugs', '--json'])
      assert.strictEqual(cliRes.status, 0)
      const cliJson = JSON.parse(cliRes.stdout)
      assert.strictEqual(cliJson.scanned, 1)
      assert.strictEqual(cliJson.modified, 0) // already frozen

      console.log('✔ freezeDomainSlugs routine scans Level-3 models and freezes all unfrozen slugs in place')
    }

    // 4. ESM host: skill scripts must still load as CommonJS when the consuming
    //     domaiNN declares "type": "module" in its .agents/package.json (backlog #23).
    {
      const hostDir = path.join(tmpRoot, 'esm-host')
      const agentsDir = path.join(hostDir, '.agents')
      const skillDest = path.join(agentsDir, 'skills', 'nn-upgrade')
      fs.mkdirSync(agentsDir, { recursive: true })
      fs.writeFileSync(path.join(agentsDir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8')
      fs.cpSync(path.resolve(SCRIPT_DIR, '..'), skillDest, { recursive: true })

      const res = spawnSync(
        process.execPath,
        [path.join(skillDest, 'scripts', 'migrate-domain.js'), '--domain-dir', hostDir],
        { encoding: 'utf-8' },
      )
      const output = `${res.stdout || ''}\n${res.stderr || ''}`
      assert.ok(
        !/require is not defined|ERR_REQUIRE_ESM|Cannot use import statement/.test(output),
        `nn-upgrade scripts must run as CommonJS inside a "type":"module" domaiNN, got: ${output.trim()}`,
      )
      console.log('✔ nn-upgrade scripts run as CommonJS inside a "type":"module" domaiNN')
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }

  console.log('All migrate-domain unit tests passed successfully!\n')
}

runTests().catch((err) => {
  console.error('Test failure:', err)
  process.exit(1)
})
