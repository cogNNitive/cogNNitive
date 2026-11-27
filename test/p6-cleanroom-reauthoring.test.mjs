#!/usr/bin/env node

/**
 * test/p6-cleanroom-reauthoring.test.mjs
 *
 * Acceptance test for Phase P6 (Re-authoring under D8/D12):
 * A new coNNtent domain produces one episode end to end from a published blueprint,
 * with no file copied by hand, and `status` reports the blueprint as current.
 */

import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const domainDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p6-cleanroom-'))

try {
  // 1. Create domaiNN_NN.md
  fs.writeFileSync(
    path.join(domainDir, 'domaiNN_NN.md'),
    `---
level: 3
parent_spec:
  name: "domaiNN"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md"
knowledge_version: "V_0-1-0"
blueprint_version: "V_0-1-0"
title: "Clean coNNtent Test Domain"
workspace_id: "clean-conntent-test"
---

# NN domaiNN
## NN domaiNN: Clean coNNtent Test Domain
blueprints_dir:: specs/bluepriNNts/
`,
  )

  // 2. Install blueprint package into domain
  const blueprintSrc = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'coNNtent')
  const blueprintDest = path.join(domainDir, 'specs', 'bluepriNNts', 'coNNtent')
  fs.mkdirSync(path.dirname(blueprintDest), { recursive: true })
  fs.cpSync(blueprintSrc, blueprintDest, { recursive: true })

  // 3. Record provenance lock
  const lock = {
    blueprints: {
      coNNtent: {
        version: 'V_0-32-6',
        tag: 'blueprints-v0.104.0',
        commit: '26d533b8417730e70417937e2311b11b51e410b0',
        distribution_url:
          'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/coNNtent',
        digests: {},
      },
    },
  }
  fs.writeFileSync(
    path.join(domainDir, 'specs', 'bluepriNNts', '.blueprint-lock.json'),
    JSON.stringify(lock, null, 2),
  )

  // 4. Create series and episode directory under D8 (no relative climbs, clean kinds)
  const seriesDir = path.join(domainDir, 'series', 'ingenieria-oculta')
  const episodeDir = path.join(seriesDir, 'episodes', 'e03-ruedas-conicas')
  fs.mkdirSync(episodeDir, { recursive: true })

  const seriesDoc = `---
level: 3
parent_spec:
  name: "coNNtent_V_0-32-6"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md"
knowledge_version: "V_0-1-0"
blueprint_version: "V_0-32-6"
title: "Ingeniería Oculta"
scope: true
---

# NN Series

## NN Series: Ingeniería Oculta
slug:: ingenieria-oculta
title:: Ingeniería Oculta
language:: es
captions:: words
review_gates:: [script, preview]
output_formats:: [1920x1920, 1080x1920, 1920x1080]

# NN Scene Kind

## NN Scene Kind: Gancho
slug:: gancho
role:: hook
narration:: on
max_duration:: 15
fixed:: none
chrome:: [watermark]

## NN Scene Kind: Problema
slug:: problema
role:: context
narration:: on
max_duration:: 25
fixed:: none
chrome:: [watermark]

## NN Scene Kind: Mecanismo
slug:: mecanismo
role:: explanation
narration:: on
max_duration:: 35
fixed:: none
chrome:: [watermark]

## NN Scene Kind: Cierre
slug:: cierre
role:: wrap-up
narration:: on
max_duration:: 15
fixed:: none
chrome:: [watermark]

# NN Chrome

## NN Chrome: es
slug:: es
language:: es
watermark:: Ingeniería Oculta
`
  fs.writeFileSync(path.join(seriesDir, 'ingenieria-oculta_coNNtent_NN.md'), seriesDoc)

  const episodeDoc = `---
level: 3
parent_spec:
  name: "coNNtent_V_0-32-6"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md"
knowledge_version: "V_0-1-12"
blueprint_version: "V_0-32-6"
title: "La geometría cónica que evita el descarrilamiento"
---

# NN Video

## NN Video: La geometría cónica que evita el descarrilamiento
slug:: e03-ruedas-conicas
title:: La geometría cónica que evita el descarrilamiento
status:: delivered
review_gates:: [script]

# NN Scene

## NN Scene: 00 Gancho
slug:: 00-gancho
kind:: Gancho

Estas dos ruedas están unidas por un eje rígido, y no son cilindros: son conos.

### NN Layer: Gancho Lower-Third
slug:: 00-gancho-lt
type:: text
style:: lower-third
text:: Ingeniería Oculta
position:: bottom-left

## NN Scene: 01 Problema
slug:: 01-problema
kind:: Problema

Si la rueda fuera cilíndrica, en una curva las dos ruedas girarían al mismo ritmo.

### NN Layer: Problema Lower-Third
slug:: 01-problema-lt
type:: text
style:: lower-third
text:: Ingeniería Oculta
position:: bottom-left

## NN Scene: 02 Mecanismo
slug:: 02-mecanismo
kind:: Mecanismo

Con un perfil cónico, en la curva el eje se corre hacia afuera.

### NN Layer: Mecanismo Lower-Third
slug:: 02-mecanismo-lt
type:: text
style:: lower-third
text:: Ingeniería Oculta
position:: bottom-left

## NN Scene: 03 Cierre
slug:: 03-cierre
kind:: Cierre

Y ahí está el compromiso. Más conicidad guía mejor en curvas cerradas.

### NN Layer: Cierre Lower-Third
slug:: 03-cierre-lt
type:: text
style:: lower-third
text:: Ingeniería Oculta
position:: bottom-left
`
  fs.writeFileSync(path.join(episodeDir, 'e03-ruedas-conicas_coNNtent_NN.md'), episodeDoc)

  // 5. Compile episode end to end via published blueprint
  const compilePath = path.join(
    blueprintDest,
    'skills',
    'nn-conntent',
    'scripts',
    'lib',
    'compile.mjs',
  )
  const { compileVideo } = await import('file:///' + compilePath.replace(/\\/g, '/'))
  const scriptPath = path.join(episodeDir, 'e03-ruedas-conicas_coNNtent_NN.md')

  const dryRunRes = await compileVideo({
    scriptPath,
    dryRun: true,
  })

  assert.equal(dryRunRes.dryRun, true)
  assert.equal(dryRunRes.plan.scenes.length, 4, 'should plan 4 scenes')
  assert.equal(dryRunRes.plan.withinBudget, true, 'should be within budget')

  const compileRes = await compileVideo({
    scriptPath,
    synthesizeAssets: false,
  })

  assert.ok(compileRes.manifest, 'manifest should be compiled')
  assert.equal(compileRes.manifest.tracks.scenes.length, 4, 'should compile 4 scene tracks')
  assert.equal(
    compileRes.manifest.tracks.overlays.length,
    8,
    'should compile 8 overlays (4 watermark + 4 lower-third)',
  )

  // 6. Verify status reports blueprint as current
  const { blueprintVerdict } = await import(
    'file:///' +
      path.join(repoRoot, 'scripts', 'lib', 'blueprint-provenance.js').replace(/\\/g, '/')
  )

  const verdict = await blueprintVerdict(
    {
      blueprintsDir: path.join(domainDir, 'specs', 'bluepriNNts'),
      installedDir: blueprintDest,
      name: 'coNNtent',
    },
    {
      fetchString: async (url) => {
        if (url.endsWith('versions.json')) {
          return JSON.stringify({
            versions: [
              {
                version: 'V_0-32-6',
                tag: 'blueprints-v0.104.0',
                commit: '26d533b8417730e70417937e2311b11b51e410b0',
              },
            ],
          })
        }
        if (url.includes('blueprint.json')) {
          return JSON.stringify({
            name: 'coNNtent',
            version: 'V_0-32-6',
            format_version: 'V_0-9-0',
            distribution_url:
              'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/coNNtent',
          })
        }
        throw new Error('404 ' + url)
      },
    },
  )

  assert.equal(verdict.status, 'current', `verdict should be current, got: ${verdict.status}`)
  console.log('OK: p6-cleanroom-reauthoring passed (1/1)')
} finally {
  try {
    fs.rmSync(domainDir, { recursive: true, force: true })
  } catch (_) {
    // ignore
  }
}
