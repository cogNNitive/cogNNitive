/**
 * scripts/lib/batch-status.mjs
 *
 * Read-only precheck for the `dev -> main` batch (nn-dev-development §4-pre).
 * Collects git + (optional) gh facts and reduces them to one verdict:
 * READY, NOT READY, or UNKNOWN. It never writes, commits, tags or enters a
 * worktree beyond `git -C <wt> status|rev-list`.
 */
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { RELEASE_KEYS, RELEASE_TABLE } = require('../release/release-keys.js')

/** package.json that authors the version for keys that have one. */
const AUTHORED_VERSION_PATH = {
  'innfo-mcp': 'iNNfo/packages/nn-mcp/package.json',
  'innfo-console': 'iNNfo/specs/bluepriNNts/console/package.json',
}

const CI_WORKFLOW = 'CI & Verify'
const INTEGRATION_BRANCHES = ['dev', 'main']

function tryGit(args, cwd) {
  try {
    return { ok: true, out: execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }
  } catch {
    return { ok: false, out: '' }
  }
}

/**
 * Default gh runner: returns stdout, throws when gh is missing or fails.
 * @param {string[]} args
 * @param {string} [cwd]
 */
export function defaultRunGh(args, cwd) {
  const bin = process.env.NN_GH_BIN || 'gh'
  return execFileSync(bin, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 })
}

function ghJson(runGh, args, cwd) {
  try {
    return JSON.parse(runGh(args, cwd))
  } catch {
    return null
  }
}

function lines(s) {
  return s ? s.split(/\r?\n/).filter(Boolean) : []
}

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

function compareSemver(a, b) {
  const x = parseSemver(a)
  const y = parseSemver(b)
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}

/** Latest `<key>-vX.Y.Z` tag on origin, with the commit it points at. */
function latestRemoteTag(root, key) {
  const r = tryGit(['ls-remote', '--tags', 'origin', `${key}-v*`], root)
  if (!r.ok) return { known: false }
  const prefix = `refs/tags/${key}-v`
  const tags = new Map()
  for (const line of lines(r.out)) {
    const [sha, ref] = line.split(/\s+/)
    const peeled = ref.endsWith('^{}')
    const name = peeled ? ref.slice(0, -3) : ref
    if (!name.startsWith(prefix)) continue
    const version = name.slice(prefix.length)
    if (!parseSemver(version)) continue
    const entry = tags.get(version) || {}
    // An annotated tag lists the tag object first and the commit as `^{}`.
    if (peeled) entry.commit = sha
    else entry.object = sha
    tags.set(version, entry)
  }
  const versions = [...tags.keys()].sort(compareSemver)
  if (versions.length === 0) return { known: true, tag: null }
  const version = versions[versions.length - 1]
  const { commit, object } = tags.get(version)
  return { known: true, tag: `${key}-v${version}`, version, sha: commit || object }
}

function authoredVersion(root, key) {
  const p = AUTHORED_VERSION_PATH[key]
  if (!p) return undefined
  const r = tryGit(['show', `origin/dev:${p}`], root)
  if (!r.ok) return null
  try {
    return String(JSON.parse(r.out).version) || null
  } catch {
    return null
  }
}

function collectReleases(root) {
  return RELEASE_KEYS.map((key) => {
    const paths = [...RELEASE_TABLE[key].repoPaths]
    const latest = latestRemoteTag(root, key)
    const out = { key, paths, latestTag: latest.tag ?? null, changedFiles: null, authoredVersion: authoredVersion(root, key), bumpNeeded: false }
    if (latest.known && latest.sha) {
      const d = tryGit(['diff', '--name-only', `${latest.sha}..origin/dev`, '--', ...paths], root)
      if (d.ok) out.changedFiles = lines(d.out).length
    } else if (latest.known && !latest.tag) {
      out.changedFiles = 0
    }
    if (out.authoredVersion && latest.version && out.changedFiles > 0 && out.authoredVersion === latest.version) out.bumpNeeded = true
    return out
  })
}

/** Parse `git worktree list --porcelain` into [{ path, branch|null, bare }]. */
export function parseWorktrees(porcelain) {
  const blocks = porcelain.split(/\r?\n\r?\n/).filter((b) => b.trim())
  return blocks.map((b) => {
    const path = /^worktree (.+)$/m.exec(b)?.[1]
    const branch = /^branch refs\/heads\/(.+)$/m.exec(b)?.[1] ?? null
    return { path: path?.replace(/\\/g, '/'), branch, bare: /^bare$/m.test(b) }
  })
}

function collectWorktrees(root) {
  const list = parseWorktrees(tryGit(['worktree', 'list', '--porcelain'], root).out)
  // The first entry is the primary checkout; it is read-only by policy and not inspected.
  // The invoking session's own worktree is skipped too: it is the caller, not a rival.
  const self = tryGit(['rev-parse', '--show-toplevel'], root).out.replace(/\\/g, '/').toLowerCase()
  return list.slice(1).filter((w) => w.path && !w.bare && w.path.toLowerCase() !== self).map((w) => {
    const st = tryGit(['status', '--porcelain'], w.path)
    const ahead = tryGit(['rev-list', '--count', 'origin/dev..HEAD'], w.path)
    const unique = ahead.ok ? Number(ahead.out) : null
    const backed = w.branch ? tryGit(['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${w.branch}`], root).ok : false
    return {
      path: w.path,
      branch: w.branch,
      dirtyFiles: st.ok ? lines(st.out).length : null,
      uniqueCommits: unique,
      onOrigin: backed,
      unbacked: unique > 0 && !backed,
    }
  })
}

function collectCi(root, runGh, devSha, mainSha) {
  const fields = 'headSha,headBranch,status,conclusion,url,name'
  const forBranch = (branch, sha) => {
    const runs = ghJson(runGh, ['run', 'list', '--branch', branch, '--workflow', CI_WORKFLOW, '--limit', '20', '--json', fields], root)
    if (!runs) return null
    const hit = runs.find((r) => r.headSha === sha)
    return hit ? { status: hit.status, conclusion: hit.conclusion || null, url: hit.url } : { status: 'none', conclusion: null }
  }
  const active = []
  let activeKnown = true
  for (const status of ['in_progress', 'queued']) {
    const runs = ghJson(runGh, ['run', 'list', '--status', status, '--limit', '50', '--json', fields], root)
    if (!runs) activeKnown = false
    else for (const r of runs) active.push({ name: r.name, branch: r.headBranch, status: r.status, url: r.url })
  }
  return { dev: forBranch('dev', devSha), main: forBranch('main', mainSha), active: activeKnown ? active : null }
}

export function computeVerdict(data) {
  const reasons = []
  const unknowns = []

  if (data.counts === null) unknowns.push('could not compare origin/main...origin/dev')
  else if (data.counts.ahead === 0) reasons.push('nothing to batch: origin/dev is not ahead of origin/main')
  else if (data.counts.behind > 0) reasons.push(`origin/main has ${data.counts.behind} commit(s) not in origin/dev: merge it into dev first`)

  if (data.openPrs === null) unknowns.push('open PRs unknown (gh unavailable)')
  else for (const p of data.openPrs) reasons.push(`open PR #${p.number} (${p.headRefName}): ${p.title}`)

  for (const w of data.worktrees) {
    const name = w.branch || w.path
    if (w.dirtyFiles === null || w.uniqueCommits === null) unknowns.push(`worktree ${name} could not be inspected`)
    if (w.dirtyFiles > 0) reasons.push(`worktree ${name} has ${w.dirtyFiles} uncommitted file(s)`)
    if (w.unbacked) reasons.push(`worktree ${name} is UNBACKED: ${w.uniqueCommits} local commit(s) with no remote branch`)
    else if (w.uniqueCommits > 0) reasons.push(`worktree ${name} has ${w.uniqueCommits} commit(s) not in origin/dev`)
  }

  if (data.ci === null) unknowns.push('CI state unknown (gh unavailable)')
  else {
    if (data.ci.dev === null) unknowns.push('dev CI state unknown (gh unavailable)')
    else if (data.ci.dev.status === 'none') reasons.push('no CI & Verify run for the origin/dev tip')
    else if (data.ci.dev.status !== 'completed') reasons.push(`CI on the origin/dev tip is ${data.ci.dev.status}`)
    else if (data.ci.dev.conclusion !== 'success') reasons.push(`CI on the origin/dev tip concluded ${data.ci.dev.conclusion}`)
    if (data.ci.active === null) unknowns.push('in-progress runs unknown (gh unavailable)')
    else for (const r of data.ci.active) {
      if (!INTEGRATION_BRANCHES.includes(r.branch)) reasons.push(`${r.status} run "${r.name}" on ${r.branch}: another agent looks active`)
    }
  }

  if (reasons.length) return { verdict: 'NOT READY', reasons, unknowns }
  if (unknowns.length) return { verdict: 'UNKNOWN', reasons, unknowns }
  return { verdict: 'READY', reasons, unknowns }
}

/**
 * Gather every fact and the verdict. `runGh(args, cwd)` is injectable so tests
 * never touch the network; it must return stdout or throw.
 * @param {{ root: string, runGh?: (args: string[], cwd?: string) => string, fetch?: boolean }} opts
 */
export function collectBatchStatus({ root, runGh = defaultRunGh, fetch = true }) {
  if (fetch) tryGit(['fetch', 'origin'], root) // best-effort; offline is fine

  const sha = (ref) => tryGit(['rev-parse', ref], root).out || null
  const devSha = sha('origin/dev')
  const mainSha = sha('origin/main')

  const c = tryGit(['rev-list', '--left-right', '--count', 'origin/main...origin/dev'], root)
  const [behind, ahead] = c.ok ? c.out.split(/\s+/).map(Number) : []
  const counts = c.ok ? { behind, ahead } : null
  const pending = tryGit(['log', '--format=%h%x09%an%x09%s', 'origin/main..origin/dev'], root)
  const commits = lines(pending.out).map((l) => {
    const [short, author, ...subject] = l.split('\t')
    return { sha: short, author, subject: subject.join('\t') }
  })

  const prs = ghJson(runGh, ['pr', 'list', '--state', 'open', '--limit', '100', '--json', 'number,title,headRefName,author'], root)
  const data = {
    counts,
    commits,
    openPrs: prs ? prs.map((p) => ({ number: p.number, title: p.title, headRefName: p.headRefName, author: p.author?.login ?? null })) : null,
    worktrees: collectWorktrees(root),
    ci: devSha && mainSha ? collectCi(root, runGh, devSha, mainSha) : null,
    releases: collectReleases(root),
  }
  return { ...data, ...computeVerdict(data) }
}

function ciLine(label, c) {
  if (c === null) return `- ${label}: unknown (gh unavailable)`
  if (c.status === 'none') return `- ${label}: no CI & Verify run for this tip`
  return `- ${label}: ${c.status}${c.conclusion ? ` / ${c.conclusion}` : ''}${c.url ? ` ${c.url}` : ''}`
}

export function renderBatchStatus(d) {
  const out = ['🌿 nn-session batch-status']
  out.push(d.counts ? `- origin/main...origin/dev: ${d.counts.behind} behind · ${d.counts.ahead} ahead` : '- origin/main...origin/dev: unknown')
  out.push(`- pending commits (origin/main..origin/dev): ${d.commits.length}`)
  for (const c of d.commits) out.push(`    ${c.sha} ${c.author} — ${c.subject}`)

  if (d.openPrs === null) out.push('- open PRs: unknown (gh unavailable)')
  else {
    out.push(`- open PRs: ${d.openPrs.length}`)
    for (const p of d.openPrs) out.push(`    #${p.number} ${p.headRefName} — ${p.title}`)
  }

  out.push('- worktrees (excluding primary):')
  if (d.worktrees.length === 0) out.push('    none')
  for (const w of d.worktrees) {
    const flags = []
    if (w.unbacked) flags.push('UNBACKED: local commits with no remote branch')
    else if (w.uniqueCommits === null) flags.push('unreadable')
    out.push(
      `    ${w.branch || '(detached)'}  ${w.path}  dirty=${w.dirtyFiles ?? '?'} unique=${w.uniqueCommits ?? '?'} origin=${w.onOrigin ? 'yes' : 'no'}${flags.length ? `  [${flags.join('; ')}]` : ''}`,
    )
  }

  out.push('- CI:')
  if (d.ci === null) out.push('    unknown (gh unavailable)')
  else {
    out.push(`  ${ciLine('origin/dev tip', d.ci.dev)}`)
    out.push(`  ${ciLine('origin/main tip', d.ci.main)}`)
    if (d.ci.active === null) out.push('    - active runs: unknown (gh unavailable)')
    else if (d.ci.active.length === 0) out.push('    - active runs: none')
    else for (const r of d.ci.active) out.push(`    - active: ${r.status} "${r.name}" on ${r.branch}`)
  }

  out.push('- releases (latest remote tag → origin/dev):')
  for (const r of d.releases) {
    const bits = [`${r.latestTag || 'no tag'}`, `${r.changedFiles ?? '?'} changed file(s)`]
    if (r.authoredVersion !== undefined) bits.push(`authored ${r.authoredVersion ?? '?'}`)
    if (r.bumpNeeded) bits.push('bump needed')
    out.push(`    ${r.key}: ${bits.join(' · ')}`)
  }

  out.push(`VERDICT: ${d.verdict}`)
  for (const r of d.reasons) out.push(`  - ${r}`)
  for (const u of d.unknowns) out.push(`  ? ${u}`)
  return out.join('\n')
}
