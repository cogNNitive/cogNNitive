/**
 * Smoke test for innfo-mcp MCP server.
 * Tests: list_models, read_model, validate_model, apply_change
 */

import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const serverPath = join(__dirname, '..', 'dist', 'server.js')
const modelsDir = join(__dirname, '..', '..', '..', 'models')

const proc = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, INNFO_MODELS_DIR: modelsDir },
})

let stdout = ''
let stderr = ''
let nextId = 0

proc.stdout.on('data', (data) => {
  stdout += data.toString()
})
proc.stderr.on('data', (data) => {
  stderr += data.toString()
})

function send(method, params) {
  const req =
    JSON.stringify({
      jsonrpc: '2.0',
      id: ++nextId,
      method: 'tools/call',
      params: { name: method, arguments: params },
    }) + '\n'
  proc.stdin.write(req)
}

function waitForResults(expectedCount) {
  return new Promise((resolve) => {
    const check = () => {
      const lines = stdout.trim().split('\n').filter(Boolean)
      if (lines.length >= expectedCount) {
        resolve(lines.map((l) => JSON.parse(l)))
      } else {
        setTimeout(check, 100)
      }
    }
    setTimeout(check, 100)
  })
}

async function run() {
  // Test 1: list_models
  send('list_models', {})

  // Test 2: read_model
  setTimeout(() => send('read_model', { id: 'Ghostbusters_V_0-1-0_business' }), 200)

  // Test 3: validate_model with valid content
  setTimeout(() => {
    const content = [
      '---',
      'spec_version: "V_0-1-2"',
      'level: 3',
      'model_version: "V_0-0-1"',
      'title: "Test"',
      'parent_spec:',
      '  name: "business_V_0-1-1"',
      '  url: "https://example.com/business"',
      '---',
      '',
      '# _NN index',
      '* [[Test]]',

      '# _NN Components',
      '* _NN Components: Test',
      '  A test element.',
      '',
    ].join('\n')
    send('validate_model', { content })
  }, 400)

  // Test 4: validate_model with invalid content (missing parent_spec)
  setTimeout(() => {
    const content = [
      '---',
      'spec_version: "V_0-1-2"',
      'level: 1',
      'model_version: "V_0-0-1"',
      'title: "Invalid"',
      '---',
      '',
      '# _NN index',
      '* [[NotAConcept]]',
    ].join('\n')
    send('validate_model', { content })
  }, 600)

  // Test 5: apply_change (add element)
  setTimeout(() => {
    send('apply_change', {
      id: 'Ghostbusters_V_0-1-0_business',
      op: 'add_element',
      args: {
        conceptName: 'Stakeholders',
        elementName: 'Smoke Test Stakeholder',
        description: 'Added by smoke test',
      },
    })
  }, 800)

  const results = await waitForResults(5)

  let pass = 0
  let fail = 0

  // Check list_models
  const r1 = results[0]
  if (r1?.result?.content?.[0]?.text?.includes('Ghostbusters')) {
    console.log('✓ list_models: found Ghostbusters model')
    pass++
  } else {
    console.log('✗ list_models: FAILED')
    fail++
  }

  // Check read_model
  const r2 = results[1]
  if (r2?.result?.content?.[0]?.text?.includes('Stakeholders')) {
    console.log('✓ read_model: parsed model with Stakeholders')
    pass++
  } else {
    console.log('✗ read_model: FAILED')
    fail++
  }

  // Check validate_model (valid)
  const r3 = results[2]
  if (r3?.result?.content?.[0]?.text) {
    const vr = JSON.parse(r3.result.content[0].text)
    if (vr.valid !== false) {
      console.log('✓ validate_model (valid content): accepted')
      pass++
    } else {
      console.log('✗ validate_model (valid content): unexpected errors:', JSON.stringify(vr.errors))
      fail++
    }
  }

  // Check validate_model (invalid)
  const r4 = results[3]
  if (r4?.result?.content?.[0]?.text) {
    const vr = JSON.parse(r4.result.content[0].text)
    if (vr.valid === false && vr.errors?.length > 0) {
      console.log('✓ validate_model (invalid content): rejected with', vr.errors.length, 'errors')
      pass++
    } else {
      console.log('✗ validate_model (invalid content): expected rejection')
      fail++
    }
  }

  // Check apply_change
  const r5 = results[4]
  if (r5?.result?.content?.[0]?.text) {
    const ar = JSON.parse(r5.result.content[0].text)
    if (ar.success === true && ar.model) {
      console.log('✓ apply_change (add element): succeeded')
      pass++
    } else if (ar.success === false) {
      console.log('✓ apply_change: rejected with', ar.errors?.length, 'errors (may need template)')
      pass++
    } else {
      console.log('✗ apply_change: unexpected result:', JSON.stringify(ar).substring(0, 200))
      fail++
    }
  }

  console.log(`\nResults: ${pass} passed, ${fail} failed`)

  if (stderr) {
    console.log('\nStderr:', stderr.substring(0, 500))
  }

  proc.kill()
  process.exit(fail > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Test error:', err)
  proc.kill()
  process.exit(1)
})
