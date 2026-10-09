/**
 * scripts/lib/console-views.mjs
 *
 * Exporter side of console view discovery and inlining (change
 * 2026-10-09-domain-console-views). A view is a classic script that calls the
 * `registerView` injected by the wrapper emitted here; its id is the file slug.
 *
 * Discovery by convention, no manifest:
 *   bluepriNNt views  <pkg>/assets/consoles/views/<slug>.js, one pkg per parent_spec base
 *   domaiNN views     <domainRoot>/consoles/views/<slug>.js
 * Everything here is trusted domain-owner code and runs with full page access;
 * the header comment written by `viewsHeader` lets a reviewer see what is included.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { Script } from 'node:vm'

// Mirrors innfo-runtime.js (VIEW_ID_RE, RESERVED_VIEW_IDS); a test keeps them in step.
export const VIEW_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const RESERVED_VIEW_IDS = ['explorer', 'matrices', 'review']

const VIEWS_SUBPATH = ['assets', 'consoles', 'views']
const HASH_DISPLAY_LENGTH = 12

/** `metrics_V_0-4-1` -> `{ base: 'metrics', version: 'V_0-4-1' }`. */
export function parseSpecName(name) {
  const m = /^(.+?)_(V_\d+-\d+-\d+)$/.exec(name)
  return m ? { base: m[1], version: m[2] } : { base: name, version: null }
}

/** View directories for one parent_spec, in priority order; the first that exists wins. */
export function viewRootCandidates({ domainRoot, specName, packagesDir }) {
  const { base, version } = parseSpecName(specName)
  const tier1 = join(domainRoot, 'specs', 'bluepriNNts', base)
  return [
    ...(version ? [join(tier1, version, ...VIEWS_SUBPATH)] : []),
    join(tier1, ...VIEWS_SUBPATH),
    join(packagesDir, base, ...VIEWS_SUBPATH),
  ]
}

async function jsFilesIn(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter((e) => e.isFile() && e.name.endsWith('.js')).map((e) => e.name).sort()
  } catch {
    return null // missing or unreadable: not a views dir
  }
}

async function readViews(dir, origin, sourcePrefix) {
  const names = (await jsFilesIn(dir)) ?? []
  const views = []
  for (const name of names) {
    const id = name.slice(0, -'.js'.length)
    const source = `${sourcePrefix}/${name}`
    if (!VIEW_ID_RE.test(id)) {
      throw new Error(`invalid view id "${id}" from ${source}: the file name must be a slug of lowercase alphanumerics and hyphens`)
    }
    if (RESERVED_VIEW_IDS.includes(id)) throw new Error(`view id "${id}" is reserved (${source})`)
    const code = await readFile(join(dir, name), 'utf8')
    assertClassicScript(code, source)
    views.push({ id, origin, source, code, sha256: createHash('sha256').update(code, 'utf8').digest('hex') })
  }
  return views
}

/**
 * Finds every view for a domaiNN. `specNames` are the parent_spec names of the
 * exported models (one package per base, first name wins). Throws before
 * returning on a bad id, a duplicate id or ES module syntax.
 */
export async function discoverViews({ domainRoot, specNames = [], packagesDir }) {
  const found = []
  const seenBases = new Set()
  for (const specName of specNames) {
    const { base } = parseSpecName(specName)
    if (seenBases.has(base)) continue
    seenBases.add(base)
    for (const dir of viewRootCandidates({ domainRoot, specName, packagesDir })) {
      if ((await jsFilesIn(dir)) === null) continue
      found.push(...(await readViews(dir, 'bluepriNNt', `bluepriNNt:${base}/${VIEWS_SUBPATH.join('/')}`)))
      break
    }
  }
  found.push(...(await readViews(join(domainRoot, 'consoles', 'views'), 'domaiNN', 'domaiNN:consoles/views')))

  const bySlug = new Map()
  for (const v of found) {
    const first = bySlug.get(v.id)
    if (first) throw new Error(`duplicate view id "${v.id}": ${first.source} and ${v.source}`)
    bySlug.set(v.id, v)
  }
  return [...found].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** The exact text that runs, shared by the syntax check and the emitted script. */
function wrapperText(view) {
  return (
    ";(function (registerView) { 'use strict';\n" +
    view.code +
    `\n})(InnfoConsole.viewRegistrar(${JSON.stringify(view.id)}, ${JSON.stringify(view.source)}));`
  )
}

/** Views are classic scripts: compile them so `import`/`export` and other syntax errors fail the export. */
export function assertClassicScript(code, source) {
  try {
    new Script(wrapperText({ id: 'x', source, code }), { filename: source })
  } catch (err) {
    const esm = /\bimport\b|'export'/.test(err.message)
    throw new Error(
      esm
        ? `${source}: ES module syntax (import/export) is not supported; a view is a classic script`
        : `${source}: syntax error: ${err.message}`,
    )
  }
}

/** Keeps embedded text from closing its host `<script>`. */
export function escapeScript(text) {
  return text.replace(/<\/(script)/gi, '<\\/$1')
}

const escapeStyle = (text) => text.replace(/<\/(style)/gi, '<\\/$1')
const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function wrapView(view) {
  return (
    `<script data-innfo-view="${escapeAttr(view.id)}" data-innfo-view-source="${escapeAttr(view.source)}">\n` +
    `${escapeScript(wrapperText(view))}\n</script>`
  )
}

/** HTML comment listing what runs in the page: `<id> <origin> <source> sha256:<12 hex>`. */
export function viewsHeader(views) {
  if (views.length === 0) return ''
  const clean = (s) => s.replace(/\s+/g, '_').replace(/-{2,}/g, '-')
  const lines = views.map(
    (v) => `${clean(v.id)} ${v.origin} ${clean(v.source)} sha256:${v.sha256.slice(0, HASH_DISPLAY_LENGTH)}`,
  )
  return `<!-- innfo-views (trusted code, full page access)\n${lines.join('\n')}\n-->`
}

const CSS_LINK = /<link rel="stylesheet" href="\.\/innfo-ui\.css" ?\/>/
const VIEWPORT = /<meta name="viewport"[^>]*>/
// The local bundle tag plus the generated CDN/mirror block that follows it.
const BUNDLE_TAGS =
  /<script src="\.\/innfo-console\.bundle\.js"><\/script>\s*<!-- nn:console-shell:start -->[\s\S]*?<!-- nn:console-shell:end -->/

/**
 * One self-contained page: the bundle appears once (the vendored, CDN and raw
 * mirror tags collapse into it, because each extra copy would replace
 * `window.InnfoConsole`), then the views, whose scripts run after it.
 */
export function inlineConsoleAssets(shell, { bundle, css, views }) {
  /** @type {[string, RegExp][]} */
  const anchors = [['stylesheet link', CSS_LINK], ['viewport meta', VIEWPORT], ['bundle script tags', BUNDLE_TAGS]]
  for (const [name, re] of anchors) {
    if (!re.test(shell)) throw new Error(`console shell has no ${name} to replace (anchor missing)`)
  }
  const header = viewsHeader(views)
  return shell
    .replace(CSS_LINK, () => `<style>${escapeStyle(css)}</style>`)
    .replace(VIEWPORT, (meta) => (header ? `${meta}\n${header}` : meta))
    .replace(BUNDLE_TAGS, () => [`<script>\n${escapeScript(bundle)}\n</script>`, ...views.map(wrapView)].join('\n'))
}
