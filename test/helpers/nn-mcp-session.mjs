import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const mcp = fileURLToPath(
  new URL('../../iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js', import.meta.url),
)
const specs = fileURLToPath(new URL('../../iNNfo/specs', import.meta.url))

/**
 * A disposable domaiNN served by the shipped nn-mcp bundle over stdio, with the network
 * disabled. `procedures` maps a file name to the shipped procedure document it is copied
 * from (a path under `iNNfo/specs`); the copies land in the domaiNN's `procedures/` folder.
 * `call(tool, args)` returns the parsed tool result; `close()` stops the server and deletes
 * the domaiNN.
 */
export async function openSession({ procedures = {}, blueprints = [] } = {}) {
  const domain = await mkdtemp(join(tmpdir(), 'nn-mcp-session-'))
  let server
  const close = async () => {
    if (server && server.exitCode === null) {
      const closed = new Promise((resolve) => server.once('close', resolve))
      server.stdin.end()
      await closed
    }
    await rm(domain, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
  try {
    await mkdir(join(domain, 'procedures'))
    await mkdir(join(domain, 'kNNowledge'))
    await writeFile(
      join(domain, 'domaiNN_NN.md'),
      '---\ntitle: Session probe\n---\n# Session probe\n',
    )
    const wanted = new Set(['procedures', 'executions', 'changes', ...blueprints])
    await cp(specs, join(domain, 'specs'), {
      recursive: true,
      filter: (path) => {
        const rel = path.slice(specs.length).replaceAll('\\', '/')
        if (!rel || /^\/[^/]+\.md$/.test(rel) || rel === '/bluepriNNts') return true
        const [, , name, leaf, ...deeper] = rel.split('/')
        return wanted.has(name) && (leaf === undefined || (leaf === 'spec_NN.md' && !deeper.length))
      },
    })
    for (const [file, from] of Object.entries(procedures))
      await writeFile(join(domain, 'procedures', file), await readFile(join(specs, from), 'utf8'))
    const offline = join(domain, 'offline.cjs')
    await writeFile(
      offline,
      "globalThis.fetch = async () => { throw new Error('Network disabled for the session') }\n",
    )
    server = spawn(process.execPath, ['--require', offline, mcp], {
      cwd: domain,
      env: {
        ...process.env,
        INNFO_CACHE_DIR: join(domain, '.cache'),
        INNFO_GLOBAL_DIR: join(domain, '.global'),
        INNFO_SKILLS_DIR: join(domain, '.skills'),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const pending = new Map()
    let seq = 0
    let stderr = ''
    server.stderr.setEncoding('utf8').on('data', (chunk) => {
      stderr += chunk
    })
    server.once('exit', (code) => {
      for (const { reject } of pending.values())
        reject(new Error(`nn-mcp exited ${code}: ${stderr}`))
    })
    createInterface({ input: server.stdout }).on('line', (line) => {
      const msg = JSON.parse(line)
      const waiter = pending.get(msg.id)
      if (!waiter) return
      pending.delete(msg.id)
      if (msg.error) waiter.reject(new Error(JSON.stringify(msg.error)))
      else waiter.resolve(msg.result)
    })
    const send = (message) =>
      server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`)
    const request = (method, params) =>
      new Promise((resolve, reject) => {
        pending.set(++seq, { resolve, reject })
        send({ id: seq, method, params })
      })
    await request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'nn-mcp-session', version: '1.0.0' },
    })
    send({ method: 'notifications/initialized' })
    /** `domain: undefined` (JSON drops it) is how a scoped listing binds to the server root. */
    const call = async (name, args = {}) =>
      JSON.parse(
        (await request('tools/call', { name, arguments: { domain, ...args } })).content[0].text,
      )
    return { domain, call, close }
  } catch (error) {
    await close()
    throw error
  }
}
