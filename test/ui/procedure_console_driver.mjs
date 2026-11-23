#!/usr/bin/env node
/**
 * The domain owner's side of `procedure_console_e2e.py`: it drives the procedure runner the
 * way an agent does, through nn-mcp's own tool functions (`dispatchTool`), built from THIS
 * checkout into a git-ignored folder (`temp/procedure-console-e2e/`), never from the
 * committed bundle (which `main` regenerates).
 *
 *   node test/ui/procedure_console_driver.mjs prepare <domain>
 *     copies test/fixtures/procedure-console + the executions bluepriNNt into <domain>, starts
 *     run b1 (batch b1), runs both engine steps, has the agent start the human decision and
 *     mark it waiting on the reviewer, then exports the domain console. Prints JSON.
 *
 *   node test/ui/procedure_console_driver.mjs import <domain> <saved console>
 *     import_console with apply + consume, then reads every run back and finishes b1 the way
 *     the agent would. Prints JSON.
 *
 * Each tool result is printed as data; the Python side asserts on it.
 */
import { cpSync, existsSync, mkdirSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIXTURE = join(REPO, 'test', 'fixtures', 'procedure-console')
const EXECUTIONS_SPEC = join(REPO, 'iNNfo', 'specs', 'bluepriNNts', 'executions', 'spec_NN.md')
const BUILD_DIR = join(REPO, 'temp', 'procedure-console-e2e')

async function tools(domain) {
  // The bundle resolves its domaiNN once, at import: point it at the scratch domain first.
  process.env.INNFO_DOMAIN_DIR = domain
  process.env.INNFO_CACHE_DIR = join(domain, '.cache')
  process.env.INNFO_GLOBAL_DIR = join(domain, '.global')
  process.env.INNFO_SKILLS_DIR = join(domain, '.skills')
  process.env.INNFO_CONSOLE_NO_OPEN = '1'
  const bundle = join(BUILD_DIR, 'nn-mcp.bundle.js')
  if (!existsSync(bundle) || process.env.NN_E2E_REBUILD !== '0') {
    const { buildBundle } = await import(
      pathToFileURL(join(REPO, 'scripts', 'build-mcp-bundle.mjs')).href
    )
    mkdirSync(BUILD_DIR, { recursive: true })
    buildBundle(REPO, BUILD_DIR)
  }
  const mod = await import(pathToFileURL(bundle).href)
  return async (name, args) => {
    const res = await mod.dispatchTool(name, args)
    const text = res && res.content && res.content[0] ? res.content[0].text : '{}'
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { ok: false, code: 'UNPARSEABLE', text }
    }
    if (parsed && parsed.ok === false && !args.__allowFail)
      throw new Error(`${name} ${JSON.stringify(args)} -> ${text}`)
    return parsed
  }
}

async function exportConsole(domain) {
  const mod = await import(pathToFileURL(join(REPO, 'scripts', 'export-console.mjs')).href)
  const written = await mod.writeConsole({ rootDir: domain, scope: 'domain', open: false })
  return written.path
}

async function prepare(domain) {
  mkdirSync(domain, { recursive: true })
  cpSync(FIXTURE, domain, { recursive: true })
  mkdirSync(join(domain, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  cpSync(EXECUTIONS_SPEC, join(domain, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
  const call = await tools(domain)
  const proc = 'procedures/ingest_audio_procedures_NN.md'
  await call('procedure_start', { procedure: proc, params: { batch: 'b1' }, run: 'b1' })
  await call('procedure_record', { run: 'b1', action: 'run' })
  await call('procedure_record', { run: 'b1', action: 'run' })
  await call('procedure_record', { run: 'b1', action: 'start' })
  const waiting = await call('procedure_record', {
    run: 'b1',
    action: 'wait',
    value: 'the reviewer, in the console',
  })
  return { domain, console: await exportConsole(domain), state: waiting.state }
}

async function importSaved(domain, saved) {
  const call = await tools(domain)
  const imported = await call('import_console', { path: saved, apply: true, consume: true })
  const pending = await call('procedure_pending', {})
  const b1 = await call('procedure_state', { run: 'b1' })
  const runs = {}
  for (const id of (imported.runs_started || imported.started || []).map((r) => r.run)) {
    if (id) runs[id] = await call('procedure_state', { run: id })
  }
  // The agent takes it from here: the step the decision chose, then the run closes.
  await call('procedure_record', { run: 'b1', action: 'start' })
  await call('procedure_record', { run: 'b1', action: 'complete' })
  const finished = await call('procedure_record', { run: 'b1', action: 'finish', __allowFail: true })
  const closed = await call('procedure_state', { run: 'b1' })
  return { imported, pending, b1, runs, finished, closed }
}

const [cmd, a, b] = process.argv.slice(2)
let out
if (cmd === 'prepare') out = await prepare(resolve(a))
else if (cmd === 'import') out = await importSaved(realpathSync(a), resolve(b))
else {
  console.error('usage: procedure_console_driver.mjs prepare <domain> | import <domain> <saved>')
  process.exit(2)
}
process.stdout.write(JSON.stringify(out) + '\n')
