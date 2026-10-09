import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import Ajv from 'ajv'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const rootDir = join(here, '..')

const schemaPath = join(rootDir, 'iNNfo', 'specs', 'bluepriNNts', 'console', 'feedback.schema.json')
const schemaJson = JSON.parse(readFileSync(schemaPath, 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
const validateAjv = ajv.compile(schemaJson)

const runtimePath = join(rootDir, 'iNNfo', 'specs', 'bluepriNNts', 'console', 'innfo-runtime.js')
const InnfoConsole = require(runtimePath)
const { validateFeedback } = InnfoConsole

const scannerConvertersPath = join(
  rootDir,
  'skills',
  'nn-sources',
  'scripts',
  'lib',
  'scanner-converters.js',
)
const { validateFeedbackJson } = require(scannerConvertersPath)

function runValidators(doc) {
  const ajvOk = validateAjv(doc)
  const bundleResult = validateFeedback(doc)
  let trannsformOk = false
  let trannsformError = null
  try {
    validateFeedbackJson(doc)
    trannsformOk = true
  } catch (err) {
    trannsformOk = false
    trannsformError = err.message
  }

  return {
    ajv: { ok: Boolean(ajvOk), errors: validateAjv.errors },
    bundle: { ok: Boolean(bundleResult.ok), errors: bundleResult.errors },
    trannsform: { ok: trannsformOk, error: trannsformError },
  }
}

describe('Feedback Validators Parity', () => {
  const validDir = join(here, 'fixtures', 'feedback', 'valid')
  const invalidDir = join(here, 'fixtures', 'feedback', 'invalid')
  const samplesDir = join(rootDir, 'iNNfo', 'specs', 'bluepriNNts', 'metrics', 'samples', 'feedback')

  const validFiles = readdirSync(validDir).filter((f) => f.endsWith('.json'))
  const invalidFiles = readdirSync(invalidDir).filter((f) => f.endsWith('.json'))
  const sampleFiles = readdirSync(samplesDir).filter((f) => f.endsWith('.json'))

  describe('valid fixtures', () => {
    for (const file of validFiles) {
      it(`validates ${file} cleanly across ajv, bundle, and nn-sources`, () => {
        const content = JSON.parse(readFileSync(join(validDir, file), 'utf8'))
        const results = runValidators(content)
        assert.equal(results.ajv.ok, true, `Ajv failed on ${file}: ${JSON.stringify(results.ajv.errors)}`)
        assert.equal(results.bundle.ok, true, `Bundle validateFeedback failed on ${file}: ${JSON.stringify(results.bundle.errors)}`)
        assert.equal(results.trannsform.ok, true, `nn-sources failed on ${file}: ${results.trannsform.error}`)
      })
    }
  })

  describe('invalid fixtures', () => {
    for (const file of invalidFiles) {
      it(`rejects ${file} across ajv, bundle, and nn-sources`, () => {
        const content = JSON.parse(readFileSync(join(invalidDir, file), 'utf8'))
        const results = runValidators(content)
        assert.equal(results.ajv.ok, false, `Ajv should reject ${file}`)
        assert.equal(results.bundle.ok, false, `Bundle should reject ${file}`)
        assert.equal(results.trannsform.ok, false, `nn-sources should reject ${file}`)
      })
    }
  })

  describe('metrics feedback samples', () => {
    for (const file of sampleFiles) {
      it(`evaluates metrics sample ${file} cleanly across all three validators`, () => {
        const content = JSON.parse(readFileSync(join(samplesDir, file), 'utf8'))
        const results = runValidators(content)
        assert.equal(results.ajv.ok, true, `Ajv failed on ${file}: ${JSON.stringify(results.ajv.errors)}`)
        assert.equal(results.bundle.ok, true, `Bundle validateFeedback failed on ${file}: ${JSON.stringify(results.bundle.errors)}`)
        assert.equal(results.trannsform.ok, true, `nn-sources failed on ${file}: ${results.trannsform.error}`)
      })
    }
  })
})
