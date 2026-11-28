#!/usr/bin/env node
'use strict'

/**
 * scripts/lib/nn-session-links.test.js
 *
 * Behaviour tests for the `@cognnitive/*` links that `nn-session` keeps healthy:
 * `start` must leave a worktree pointing at its own core, `status` must name a foreign
 * link and print the remedy, `relink` must repair every checkout, and sweeping one
 * worktree must not leave the others dangling.
 *
 * Every case builds a throwaway repository in the OS temp dir with real git worktrees
 * and real filesystem junctions — never this repository's history — and drives
 * `scripts/nn-session.mjs` through its command line, the interface the maintainer uses.
 *
 * The trap these pin, measured on the real repo: session worktrees used to junction
 * their whole `node_modules` to the primary's, which makes
 * `node_modules/@cognnitive/nn-core` ONE reparse point shared by every checkout. Repair
 * "from my worktree" then rewrites the primary's link and drags everyone with it — the
 * documented manual `rmdir` + `New-Item` did exactly that. So the assertions read the
 * raw junction target: `realpathSync` follows the link into the package and would call
 * two different checkouts' cores equal whenever their contents match.
 */

const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

const repoRoot = path.resolve(__dirname, '..', '..')
const SESSION = path.join(repoRoot, 'scripts', 'nn-session.mjs')

/** Runs a command and returns its status, never throwing on a non-zero exit. */
function run(command, args, cwd) {
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { code: 0, stdout: stdout.trim(), stderr: '' }
  } catch (err) {
    return {
      code: err.status ?? 1,
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || '').trim(),
    }
  }
}

/** `nn-session <args...>` rooted at `root`. */
function nnSession(root, ...args) {
  return run(process.execPath, [SESSION, ...args, '--root', root], root)
}

/**
 * `nn-session <args...>` with the slow install stubbed out, so a case about linking
 * never waits on (or depends on) a real `npm ci`.
 */
function nnSessionStubbed(root, ...args) {
  const previous = process.env.NN_SESSION_TEST_NPM_STUB
  process.env.NN_SESSION_TEST_NPM_STUB = '1'
  try {
    return run(process.execPath, [SESSION, ...args, '--root', root], root)
  } finally {
    if (previous === undefined) delete process.env.NN_SESSION_TEST_NPM_STUB
    else process.env.NN_SESSION_TEST_NPM_STUB = previous
  }
}

function git(cwd, ...args) {
  return run('git', args, cwd).stdout
}

/** Writes `{ relativePath: content }` under `root`, creating parent directories. */
function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel.split('/').join(path.sep))
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content)
  }
}

/** Raw junction target of `p`, or null when `p` is absent or not a link. */
function linkTarget(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink() ? fs.readlinkSync(p) : null
  } catch {
    return null
  }
}

/** Package directory of workspace `name` inside `checkout`. */
function pkg(checkout, name = 'nn-core') {
  return path.join(checkout, 'iNNfo', 'packages', name)
}

/** The `@cognnitive/<name>` link of `checkout`, and the scope that holds it. */
const scope = (checkout) => path.join(checkout, 'node_modules', '@cognnitive')
const coreLink = (checkout) => path.join(scope(checkout), 'nn-core')

/** Normalised for comparison: Windows paths are case-insensitive and mix separators. */
const norm = (p) => (p ? path.resolve(p).replace(/\\/g, '/').toLowerCase() : '<no link>')

/** Asserts `checkout`'s `@cognnitive/nn-core` resolves to its own copy. */
function assertOwnCore(checkout, label) {
  assert.equal(
    norm(linkTarget(coreLink(checkout)) ?? ''),
    norm(pkg(checkout)),
    `${label ?? path.basename(checkout)} must point at its own core`,
  )
}

/**
 * A throwaway repository shaped like this one: primary on `main`, `nn-core` and
 * `nn-mcp` workspace packages, a real `node_modules` in the primary whose
 * `@cognnitive/*` are junctions, one ordinary dependency (`lodash`) standing in for
 * the ~400MB install, and registered session worktrees.
 *
 * `legacy: true` shapes the worktrees the OLD way — `node_modules` is a single
 * junction to the primary's, so `@cognnitive` is one reparse point shared by every
 * checkout. That is the state `relink` has to migrate, reproduced for real because a
 * mock would not reproduce a reparse point.
 * @param {{ extraWorktrees?: number, legacy?: boolean }} [options]
 */
function makeRepo({ extraWorktrees = 0, legacy = false } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-session-links-'))
  const root = path.join(base, 'cogNNitive')
  fs.mkdirSync(root, { recursive: true })
  git(root, 'init', '-b', 'main')
  git(root, 'config', 'user.email', 't@test')
  git(root, 'config', 'user.name', 't')
  git(root, 'config', 'commit.gpgsign', 'false')
  writeFiles(root, {
    'package.json': JSON.stringify({ name: 'root', workspaces: ['iNNfo/packages/*'] }),
    'package-lock.json': '{}\n',
    'iNNfo/packages/nn-core/package.json': JSON.stringify({ name: '@cognnitive/nn-core' }),
    'iNNfo/packages/nn-core/index.js': 'module.exports = "primary"\n',
    'iNNfo/packages/nn-mcp/package.json': JSON.stringify({ name: '@cognnitive/nn-mcp' }),
    '.gitignore': 'node_modules/\n',
  })
  git(root, 'add', '-A')
  git(root, 'commit', '-m', 'initial')

  // The primary's install: one ordinary dependency plus npm's workspace links.
  writeFiles(root, { 'node_modules/.package-lock.json': '{}\n' })
  fs.mkdirSync(path.join(root, 'node_modules', 'lodash'), { recursive: true })
  for (const name of ['nn-core', 'nn-mcp']) {
    fs.mkdirSync(scope(root), { recursive: true })
    fs.symlinkSync(pkg(root, name), path.join(scope(root), name), 'junction')
  }

  const worktrees = []
  for (let i = 1; i <= 1 + extraWorktrees; i++) {
    const id = `wt${i}`
    const wt = path.join(base, `cogNNitive-${id}`)
    git(root, 'worktree', 'add', '--no-track', '-b', `session/${id}`, wt, 'main')
    // Each worktree carries its own workspaces: those are the code under test.
    writeFiles(wt, {
      'package-lock.json': '{}\n',
      'iNNfo/packages/nn-core/package.json': JSON.stringify({ name: '@cognnitive/nn-core' }),
      'iNNfo/packages/nn-core/index.js': `module.exports = "${id}"\n`,
      'iNNfo/packages/nn-mcp/package.json': JSON.stringify({ name: '@cognnitive/nn-mcp' }),
    })
    const modules = path.join(wt, 'node_modules')
    if (legacy) {
      fs.symlinkSync(path.join(root, 'node_modules'), modules, 'junction')
    } else {
      // The layout `start` creates: shared dependencies, own @cognnitive scope.
      fs.mkdirSync(modules, { recursive: true })
      fs.symlinkSync(
        path.join(root, 'node_modules', 'lodash'),
        path.join(modules, 'lodash'),
        'junction',
      )
      fs.copyFileSync(
        path.join(root, 'node_modules', '.package-lock.json'),
        path.join(modules, '.package-lock.json'),
      )
      fs.mkdirSync(scope(wt), { recursive: true })
      for (const name of ['nn-core', 'nn-mcp']) {
        fs.symlinkSync(pkg(wt, name), path.join(scope(wt), name), 'junction')
      }
    }
    worktrees.push(wt)
  }
  return { base, root, worktrees }
}

/** Cleanup that tolerates Windows briefly holding a reparse point. */
function cleanup(base) {
  fs.rmSync(base, { recursive: true, force: true, maxRetries: 3 })
}

test('start links an installed worktree to its own core, not the primary or the last builder', () => {
  const { base, root } = makeRepo()
  try {
    const target = path.join(base, 'cogNNitive-fresh')
    // A real (stubbed) install: lockfiles match, so the worktree adopts the primary's
    // installed packages and gets its own @cognnitive scope.
    const started = nnSessionStubbed(root, 'start', '--id', 'fresh')
    assert.equal(started.code, 0, started.stderr)
    assert.equal(started.stdout.split(/\r?\n/).pop(), target, 'start prints the worktree path')

    assertOwnCore(target, 'fresh worktree')
    assert.equal(
      norm(linkTarget(path.join(scope(target), 'nn-mcp')) ?? ''),
      norm(pkg(target, 'nn-mcp')),
      'every workspace link is local, not just nn-core',
    )
  } finally {
    cleanup(base)
  }
})

test('start --no-install creates nothing, so a bare worktree stays bare', () => {
  const { base, root } = makeRepo()
  try {
    const target = path.join(base, 'cogNNitive-bare')
    const started = nnSession(root, 'start', '--id', 'bare', '--no-install')
    assert.equal(started.code, 0, started.stderr)
    assert.equal(
      fs.existsSync(path.join(target, 'node_modules')),
      false,
      '--no-install means no node_modules appears',
    )
  } finally {
    cleanup(base)
  }
})

test('status names a foreign link and prints the exact repair command', () => {
  const { base, root, worktrees } = makeRepo({ legacy: true })
  try {
    // The historic repair, applied from inside a session worktree, repointed the
    // shared link: the primary now reads a session's core.
    fs.unlinkSync(coreLink(root))
    fs.symlinkSync(pkg(worktrees[0]), coreLink(root), 'junction')

    const status = nnSession(root, 'status')
    assert.equal(status.code, 0, 'status stays informational')
    assert.match(status.stdout, /another checkout/, 'the foreign target is named as such')
    assert.match(
      status.stdout,
      /nn-session\.mjs relink/,
      'the report carries the exact remedy, not a description of the bug',
    )
  } finally {
    cleanup(base)
  }
})

test('a junction to a subject that does not exist counts as broken, not healthy', () => {
  const { base, root } = makeRepo()
  try {
    fs.unlinkSync(coreLink(root))
    fs.symlinkSync(
      path.join(base, 'cogNNitive-gone', 'iNNfo', 'packages', 'nn-core'),
      coreLink(root),
      'junction',
    )

    const status = nnSession(root, 'status')
    assert.match(status.stdout, /broken/, 'a dangling target is broken')
    assert.match(status.stdout, /nn-session\.mjs relink/, 'broken links carry the remedy too')
  } finally {
    cleanup(base)
  }
})

test('relink repairs every checkout to its own core and reports what changed', () => {
  const { base, root, worktrees } = makeRepo({ extraWorktrees: 2, legacy: true })
  try {
    // Reproduce the reported state: the shared link points at one worktree's core,
    // so every checkout reads that worktree's build.
    fs.unlinkSync(coreLink(root))
    fs.symlinkSync(pkg(worktrees[1]), coreLink(root), 'junction')

    const relinked = nnSession(root, 'relink')
    assert.equal(relinked.code, 0, relinked.stderr)

    for (const checkout of [root, ...worktrees]) assertOwnCore(checkout)
    assert.equal(
      linkTarget(path.join(root, 'node_modules', 'lodash')),
      null,
      'the primary keeps its own real dependency directory',
    )
    assert.equal(
      fs.existsSync(path.join(root, 'node_modules', 'lodash')),
      true,
      'and the dependency is still there',
    )
    assert.equal(
      norm(linkTarget(path.join(worktrees[0], 'node_modules', 'lodash')) ?? ''),
      norm(path.join(root, 'node_modules', 'lodash')),
      'a migrated worktree still sees the shared install',
    )
  } finally {
    cleanup(base)
  }
})

test('relink is idempotent: a second run changes nothing', () => {
  const { base, root, worktrees } = makeRepo({ legacy: true })
  try {
    nnSession(root, 'relink')
    const before = [root, ...worktrees].map((c) => linkTarget(coreLink(c)))

    const again = nnSession(root, 'relink')
    assert.equal(again.code, 0, again.stderr)
    assert.match(again.stdout, /already points at its own core/, 'nothing left to repair')
    assert.deepEqual(
      [root, ...worktrees].map((c) => linkTarget(coreLink(c))),
      before,
      'a no-op run leaves every target untouched',
    )
  } finally {
    cleanup(base)
  }
})

test('relink repairs a broken link, including a junction with no usable target', () => {
  const { base, root } = makeRepo()
  try {
    fs.unlinkSync(coreLink(root))
    fs.symlinkSync(path.join(base, 'nowhere'), coreLink(root), 'junction')

    const relinked = nnSession(root, 'relink')
    assert.equal(relinked.code, 0, relinked.stderr)
    assertOwnCore(root, 'primary')
  } finally {
    cleanup(base)
  }
})

test('relink tops up a node_modules left half-built by an interrupted run', () => {
  const { base, root, worktrees } = makeRepo({ legacy: true })
  try {
    // An interrupted repair leaves a real but nearly empty node_modules: no junction
    // to adopt from, and not one shared dependency in it.
    const [wt] = worktrees
    fs.rmSync(path.join(wt, 'node_modules'), { recursive: true, force: true })
    fs.mkdirSync(path.join(wt, 'node_modules', '.package-lock.json'), { recursive: true })

    const relinked = nnSession(root, 'relink')
    assert.equal(relinked.code, 0, relinked.stderr)

    assertOwnCore(wt, 'repaired worktree')
    assert.equal(
      norm(linkTarget(path.join(wt, 'node_modules', 'lodash')) ?? ''),
      norm(path.join(root, 'node_modules', 'lodash')),
      'the shared dependency is back, so the checkout can resolve imports again',
    )
  } finally {
    cleanup(base)
  }
})

test('status --assert-linked passes when every link resolves into its own checkout', () => {
  const { base, root, worktrees } = makeRepo()
  try {
    for (const checkout of [root, ...worktrees]) {
      const gate = nnSession(checkout, 'status', '--assert-linked')
      assert.equal(gate.code, 0, gate.stderr)
    }
    assert.doesNotMatch(
      nnSession(root, 'status', '--assert-linked').stdout,
      /another checkout/,
      'a healthy checkout advertises no foreign target',
    )
  } finally {
    cleanup(base)
  }
})

test('status --assert-linked fails a foreign link, so verify:fast can gate on it', () => {
  const { base, root, worktrees } = makeRepo({ legacy: true })
  try {
    fs.unlinkSync(coreLink(root))
    fs.symlinkSync(pkg(worktrees[0]), coreLink(root), 'junction')

    const gate = nnSession(root, 'status', '--assert-linked')
    assert.equal(gate.code, 1, 'a foreign link is a failing gate, not a note')
    assert.match(gate.stdout + gate.stderr, /another checkout/, 'it names the state')
    assert.match(
      gate.stdout + gate.stderr,
      /nn-session\.mjs relink/,
      'and prints the exact repair command',
    )
  } finally {
    cleanup(base)
  }
})

test('status --assert-linked judges the checkout it runs in, not the primary', () => {
  const { base, root, worktrees } = makeRepo()
  try {
    const [wt] = worktrees
    // The primary is healthy; the worktree reads the primary's core. Running the gate
    // from inside the worktree must fail, or it could never catch the trap it exists for.
    fs.unlinkSync(coreLink(wt))
    fs.symlinkSync(pkg(root), coreLink(wt), 'junction')

    const fromWorktree = run(process.execPath, [SESSION, 'status', '--assert-linked'], wt)
    assert.equal(fromWorktree.code, 1, fromWorktree.stdout + fromWorktree.stderr)
    assert.match(fromWorktree.stdout + fromWorktree.stderr, /another checkout/)

    const fromPrimary = run(process.execPath, [SESSION, 'status', '--assert-linked'], root)
    assert.equal(fromPrimary.code, 0, 'the primary is still healthy')
  } finally {
    cleanup(base)
  }
})

test('sweeping a worktree does not leave the other checkouts dangling', () => {
  const { base, root, worktrees } = makeRepo({ extraWorktrees: 1, legacy: true })
  try {
    nnSession(root, 'relink')
    const [kept, swept] = worktrees

    // A committed session sweeps cleanly (sweep refuses an uncommitted branch).
    writeFiles(swept, { 'note.txt': 'work\n' })
    git(swept, 'add', '-A')
    git(swept, 'commit', '-m', 'session work')
    git(root, 'merge', '--no-ff', '-m', 'merge session', 'session/wt2')

    const sweptRun = nnSession(root, 'sweep')
    assert.equal(sweptRun.code, 0, sweptRun.stderr)
    assert.equal(fs.existsSync(swept), false, 'the merged worktree is gone')

    assertOwnCore(root, 'primary')
    assertOwnCore(kept, 'surviving worktree')

    const status = nnSession(root, 'status').stdout
    assert.doesNotMatch(status, /another checkout/, 'no checkout was dragged onto the swept one')
    assert.doesNotMatch(status, /broken/, 'and nothing dangles')
    assert.doesNotMatch(status, /nn-session\.mjs relink/, 'so the remedy is not advertised')
  } finally {
    cleanup(base)
  }
})
