import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  applyWithConsole,
  buildNextSteps,
  regenerateConsole,
  resolveConsoleModulePath,
  type ConsoleOutcome,
  type ConsoleWriter,
} from './console-regeneration.js'

let sandbox: string

beforeEach(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'nn-console-regen-'))
})

afterEach(async () => {
  await rm(sandbox, { recursive: true, force: true })
})

const writtenOutcome = (over: Partial<ConsoleOutcome> = {}): ConsoleOutcome => ({
  status: 'written',
  path: join(sandbox, 'domaiNN_console.html'),
  opened: true,
  ...over,
})

describe('resolveConsoleModulePath', () => {
  it('prefers INNFO_CONSOLE_DIR when it holds the exporter', async () => {
    const dir = join(sandbox, 'assets')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'export-console.mjs'), '// stub', 'utf-8')
    const found = resolveConsoleModulePath(join(sandbox, 'domain'), {
      env: { INNFO_CONSOLE_DIR: dir },
      home: join(sandbox, 'home'),
      cwd: sandbox,
    })
    expect(found).toBe(join(dir, 'export-console.mjs'))
  })

  it('falls back to the repo checkout scripts folder', async () => {
    const repo = join(sandbox, 'repo')
    await mkdir(join(repo, '.git'), { recursive: true })
    await mkdir(join(repo, 'scripts'), { recursive: true })
    await writeFile(join(repo, 'scripts', 'export-console.mjs'), '// stub', 'utf-8')
    const found = resolveConsoleModulePath(repo, { env: {}, home: join(sandbox, 'home'), cwd: sandbox })
    expect(found).toBe(join(repo, 'scripts', 'export-console.mjs'))
  })

  it('falls back to the installed set under ~/.agents/console', async () => {
    const home = join(sandbox, 'home')
    await mkdir(join(home, '.agents', 'console'), { recursive: true })
    await writeFile(join(home, '.agents', 'console', 'export-console.mjs'), '// stub', 'utf-8')
    const found = resolveConsoleModulePath(join(sandbox, 'domain'), { env: {}, home, cwd: sandbox })
    expect(found).toBe(join(home, '.agents', 'console', 'export-console.mjs'))
  })

  it('returns null when no location holds the exporter', () => {
    const found = resolveConsoleModulePath(join(sandbox, 'domain'), {
      env: {},
      home: join(sandbox, 'home'),
      cwd: sandbox,
    })
    expect(found).toBeNull()
  })
})

describe('regenerateConsole', () => {
  it('reports missing assets as failed with CONSOLE_ASSETS_NOT_FOUND, never a throw', async () => {
    const outcome = await regenerateConsole(join(sandbox, 'domain'), {
      env: {},
      home: join(sandbox, 'home'),
      cwd: sandbox,
    })
    expect(outcome.status).toBe('failed')
    expect(outcome.code).toBe('CONSOLE_ASSETS_NOT_FOUND')
    expect(outcome.error).toMatch(/Console assets not found/)
  })

  it('turns a throwing writer into status failed', async () => {
    const writer: ConsoleWriter = async () => {
      throw new Error('disk is read-only')
    }
    const outcome = await regenerateConsole(sandbox, { writer })
    expect(outcome).toEqual({ status: 'failed', error: 'disk is read-only' })
  })

  it('passes scope and open through to the writer, and honors the no-open kill switch', async () => {
    const seen: Array<{ scope: unknown; open: boolean }> = []
    const writer: ConsoleWriter = async (options) => {
      seen.push({ scope: options.scope, open: options.open })
      return { path: join(sandbox, 'x.html'), status: 'written', opened: false }
    }
    await regenerateConsole(sandbox, { writer, open: true, env: {} })
    await regenerateConsole(sandbox, { writer, open: false, env: {}, scope: { model: 'strategy' } })
    await regenerateConsole(sandbox, { writer, open: true, env: { INNFO_CONSOLE_NO_OPEN: '1' } })
    expect(seen).toEqual([
      { scope: 'domain', open: true },
      { scope: { model: 'strategy' }, open: false },
      { scope: 'domain', open: false },
    ])
  })
})

const MODEL_FRONTMATTER = '---\ntitle: "Strategy"\nknowledge_version: "V_0-1-0"\nlevel: 3\n---\n\n'
const MODEL_BODY = '# NN Vision\n## NN Vision: Core\n  slug:: core\n'

describe('regenerateConsole with the real shared writer', () => {
  it('writes the domain console, is idempotent, and writes again after a change', async () => {
    const domain = join(sandbox, 'domain')
    await mkdir(join(domain, 'kNNowledge'), { recursive: true })
    const model = join(domain, 'kNNowledge', 'strategy_NN.md')
    await writeFile(model, MODEL_FRONTMATTER + MODEL_BODY, 'utf-8')
    // The repo checkout holding this test provides the console assets.
    const launches: unknown[] = []
    const launcher = (...args: unknown[]) => void launches.push(args)
    const first = await regenerateConsole(domain, { open: false, launcher })
    expect(first.status).toBe('written')
    expect(first.path).toBe(join(domain, 'domaiNN_console.html'))
    expect(existsSync(first.path!)).toBe(true)
    expect(Object.keys(first.knowledgeVersions ?? {})).toHaveLength(1)

    const second = await regenerateConsole(domain, { open: false })
    expect(second.status).toBe('unchanged')

    await writeFile(model, MODEL_FRONTMATTER + MODEL_BODY + '\n## NN Vision: Second\n  slug:: second\n', 'utf-8')
    const third = await regenerateConsole(domain, { open: false })
    expect(third.status).toBe('written')
    expect(launches).toEqual([])
  })

  it('writes a model-scoped console at the stable per-model path', async () => {
    const domain = join(sandbox, 'domain')
    await mkdir(join(domain, 'kNNowledge'), { recursive: true })
    await writeFile(join(domain, 'kNNowledge', 'strategy_NN.md'), MODEL_FRONTMATTER + MODEL_BODY, 'utf-8')
    const outcome = await regenerateConsole(domain, { open: false, scope: { model: 'strategy' } })
    expect(outcome.status).toBe('written')
    expect(outcome.path).toBe(join(domain, 'artifacts', 'strategy_console', 'strategy_console.html'))
  })
})

describe('buildNextSteps', () => {
  const changeset = 'changes/ws_agent_20261014T000000Z_changes_NN.md'

  it('proposal notice carries the four steps in order and the OK shortcut', () => {
    const outcome = writtenOutcome()
    const steps = buildNextSteps('proposal', { console: outcome, changeset })
    const n = steps.notice
    const order = [changeset, 'regenerated', 'browser tab', 'reply OK'].map((needle) => n.indexOf(needle))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(steps.approve).toEqual({ reply: 'OK', tool: 'apply_change', changeset })
    expect(steps.opened).toBe(true)
    expect(steps.console_path).toBe(outcome.path)
  })

  it('apply notice has steps 1-3 and offers no approval', () => {
    const steps = buildNextSteps('apply', { console: writtenOutcome(), changeset })
    expect(steps.approve).toBeUndefined()
    expect(steps.notice).toContain('1.')
    expect(steps.notice).toContain('2.')
    expect(steps.notice).toContain('3.')
    expect(steps.notice).not.toContain('reply OK')
  })

  it('apply notice lists the conflicted change ids', () => {
    const steps = buildNextSteps('apply', { console: writtenOutcome(), changeset, conflicted: ['c-02', 'c-05'] })
    expect(steps.notice).toContain('c-02, c-05')
  })

  it('puts the absolute console path in the notice when the console was not opened', () => {
    const outcome = writtenOutcome({ opened: false })
    const steps = buildNextSteps('apply', { console: outcome, changeset })
    expect(steps.opened).toBe(false)
    expect(steps.notice).toContain(outcome.path!)
    expect(steps.notice).toMatch(/Open .* in a browser/)
  })

  it('says the console failed and points a proposal at the changeset file', () => {
    const failed: ConsoleOutcome = { status: 'failed', error: 'assets missing' }
    const steps = buildNextSteps('proposal', { console: failed, changeset })
    expect(steps.notice).toContain('could not be regenerated')
    expect(steps.notice).toContain('assets missing')
    expect(steps.notice).toContain('changeset file ' + changeset)
    expect(steps.console_path).toBeUndefined()
    expect(steps.opened).toBe(false)
  })

  it('never mentions an editor or live-preview URL', () => {
    for (const kind of ['proposal', 'apply', 'regenerate'] as const) {
      const steps = buildNextSteps(kind, { console: writtenOutcome(), changeset })
      expect(JSON.stringify(steps)).not.toMatch(/https?:|preview|editor/i)
    }
  })
})

describe('applyWithConsole', () => {
  const stubWriter: ConsoleWriter = async () => ({
    path: join(sandbox, 'domaiNN_console.html'),
    status: 'written',
    opened: false,
  })

  it('leaves conflict and rejected results without a console field', async () => {
    for (const status of ['conflict', 'rejected']) {
      const payload = await applyWithConsole(sandbox, async () => ({ success: false, status }), { writer: stubWriter })
      expect(payload.console).toBeUndefined()
      expect(payload.next_steps).toBeUndefined()
    }
  })

  it('regenerates for applied and partially_applied and keeps the apply fields', async () => {
    for (const status of ['applied', 'partially_applied']) {
      const payload = await applyWithConsole(
        sandbox,
        async () => ({ success: true, status, changeset: 'changes/x_changes_NN.md', appliedCount: 2 }),
        { writer: stubWriter },
      )
      expect(payload.status).toBe(status)
      expect(payload.appliedCount).toBe(2)
      expect((payload.console as ConsoleOutcome).status).toBe('written')
      expect(payload.next_steps).toBeDefined()
    }
  })

  it('does not alter the apply outcome when regeneration fails', async () => {
    const writer: ConsoleWriter = async () => {
      throw new Error('boom')
    }
    const payload = await applyWithConsole(
      sandbox,
      async () => ({ success: true, status: 'applied', changeset: 'changes/x_changes_NN.md', appliedCount: 1 }),
      { writer },
    )
    expect(payload.success).toBe(true)
    expect(payload.status).toBe('applied')
    expect((payload.console as ConsoleOutcome).status).toBe('failed')
  })
})
