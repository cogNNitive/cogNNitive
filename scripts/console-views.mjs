/**
 * scripts/console-views.mjs
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

const SPEC_BASE_RE = /^[A-Za-z0-9_-]+$/

/** `metrics_V_0-4-1` -> `{ base: 'metrics', version: 'V_0-4-1' }`. */
export function parseSpecName(name) {
  const m = /^(.+?)_(V_\d+-\d+-\d+)$/.exec(name)
  return m ? { base: m[1], version: m[2] } : { base: name, version: null }
}

/** View directories for one parent_spec, in priority order; the first that holds views wins. */
export function viewRootCandidates({ domainRoot, specName, packagesDir }) {
  const { base, version } = parseSpecName(specName)
  // The base becomes a path segment: a name like `../../x` must never reach `join`.
  if (!SPEC_BASE_RE.test(base)) {
    throw new Error(`parent_spec "${specName}" is not a valid name: the part before the version may only use letters, digits, "_" and "-"`)
  }
  const tier1 = join(domainRoot, 'specs', 'bluepriNNts', base)
  return [
    ...(version ? [join(tier1, version, ...VIEWS_SUBPATH)] : []),
    join(tier1, ...VIEWS_SUBPATH),
    join(packagesDir, base, ...VIEWS_SUBPATH),
  ]
}

const compareCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

async function jsFilesIn(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    // Only "there is nothing there" means "no views"; permission or I/O errors must surface.
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null
    throw err
  }
  const names = []
  for (const entry of entries) {
    if (!entry.name.endsWith('.js')) continue
    if (entry.isSymbolicLink()) {
      throw new Error(`${join(dir, entry.name)} is a symbolic link; symlinked views are not supported, copy the file instead`)
    }
    if (entry.isFile()) names.push(entry.name)
  }
  return names.sort()
}

async function readViews(dir, names, origin, sourcePrefix) {
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
 * exported models; each base resolves to one views folder, and models on several
 * versions of a base that resolve to different folders are an error. Throws before
 * returning on a bad id, a duplicate id, ES module syntax or such a conflict.
 */
export async function discoverViews({ domainRoot, specNames = [], packagesDir }) {
  // Plain code-unit order (not localeCompare) so the result and the messages never depend
  // on the machine's locale or on the order the models were found in.
  const sortedNames = [...new Set(specNames)].sort(compareCodeUnits)
  /** @type {Map<string, { specName: string, dir: string, names: string[] }[]>} */
  const hitsByBase = new Map()
  for (const specName of sortedNames) {
    const { base } = parseSpecName(specName)
    for (const dir of viewRootCandidates({ domainRoot, specName, packagesDir })) {
      const names = await jsFilesIn(dir)
      if (names === null || names.length === 0) continue // missing or empty: next tier
      hitsByBase.set(base, [...(hitsByBase.get(base) ?? []), { specName, dir, names }])
      break
    }
  }

  const found = []
  for (const base of [...hitsByBase.keys()].sort(compareCodeUnits)) {
    const hits = hitsByBase.get(base)
    const other = hits.find((h) => h.dir !== hits[0].dir)
    // Models on different versions of one blueprint may ship different views; picking one
    // silently would hide the other, so the domain owner has to resolve it.
    if (other) {
      throw new Error(
        `models on blueprint "${base}" resolve to different views: ${hits[0].specName} (${hits[0].dir}) and ${other.specName} (${other.dir}); keep views for one version, or move them to the shared folder`,
      )
    }
    found.push(...(await readViews(hits[0].dir, hits[0].names, 'bluepriNNt', `bluepriNNt:${base}/${VIEWS_SUBPATH.join('/')}`)))
  }
  const domainDir = join(domainRoot, 'consoles', 'views')
  found.push(...(await readViews(domainDir, (await jsFilesIn(domainDir)) ?? [], 'domaiNN', 'domaiNN:consoles/views')))

  const bySlug = new Map()
  for (const v of found) {
    const first = bySlug.get(v.id)
    if (first) throw new Error(`duplicate view id "${v.id}": ${first.source} and ${v.source}`)
    bySlug.set(v.id, v)
  }
  return [...found].sort((a, b) => compareCodeUnits(a.id, b.id))
}

/** The exact text that runs, shared by the syntax check and the emitted script. */
function wrapperText(view) {
  return (
    ";(function (registerView) { 'use strict';\n" +
    view.code +
    `\n})(InnfoConsole.viewRegistrar(${JSON.stringify(view.id)}, ${JSON.stringify(view.source)}));`
  )
}

const WORDS_BEFORE_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await',
])
const IMPORT_DECLARATION = /^\s*[A-Za-z_$*{'"]/
const EXPORT_DECLARATION = /^\s*(?:default\b|const\b|let\b|var\b|function\b|class\b|async\b|[{*])/
const TOP_LEVEL_AWAIT = /^\s*[A-Za-z_$([{'"`0-9]/

/**
 * Which ES-module-only construct `code` uses, or null. A small token scanner (strings,
 * template literals with nested `${}`, regex literals, comments) so look-alike text inside
 * them is not mistaken for syntax, and so the answer never depends on the engine's message
 * wording. It only runs after the script already failed to compile, to explain why.
 * @returns {'import' | 'export' | 'import.meta' | 'top-level await' | null}
 */
export function findModuleSyntax(code) {
  const n = code.length
  const templateDepths = [] // brace depth at which each open `${` sits
  let i = 0
  let depth = 0
  let prev = '' // kind of the last token: '' start, 'o' operator/punctuation, 'w' word or number, ')' ']' '}' closers, 's' literal
  let prevChar = ''
  let prevWord = ''

  const skipTemplate = () => {
    while (i < n) {
      const c = code[i]
      if (c === '\\') i += 2
      else if (c === '`') return void i++
      else if (c === '$' && code[i + 1] === '{') {
        i += 2
        templateDepths.push(depth++)
        return
      } else i++
    }
  }
  const skipRegex = () => {
    let inClass = false
    i++
    while (i < n && code[i] !== '\n') {
      const c = code[i]
      if (c === '\\') i++
      else if (c === '[') inClass = true
      else if (c === ']') inClass = false
      else if (c === '/' && !inClass) break
      i++
    }
    i++
    while (i < n && /[a-z]/i.test(code[i])) i++
  }

  while (i < n) {
    const c = code[i]
    const next = code[i + 1]
    if (/\s/.test(c)) {
      i++
    } else if (c === '/' && next === '/') {
      while (i < n && code[i] !== '\n') i++
    } else if (c === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2)
      i = end < 0 ? n : end + 2
    } else if (c === '"' || c === "'") {
      i++
      while (i < n && code[i] !== c && code[i] !== '\n') i += code[i] === '\\' ? 2 : 1
      i++
      prev = 's'
      prevChar = c
    } else if (c === '`') {
      i++
      skipTemplate()
      prev = 's'
      prevChar = c
    } else if (c === '/' && (prev === '' || prev === 'o' || prev === '}' || (prev === 'w' && WORDS_BEFORE_REGEX.has(prevWord)))) {
      skipRegex()
      prev = 's'
      prevChar = '/'
    } else if (/[A-Za-z_$]/.test(c)) {
      let j = i
      while (j < n && /[\w$]/.test(code[j])) j++
      const word = code.slice(i, j)
      const rest = code.slice(j)
      if (prevChar !== '.') {
        if (word === 'import' && /^\s*\./.test(rest)) return 'import.meta'
        if (word === 'import' && depth === 0 && IMPORT_DECLARATION.test(rest)) return 'import'
        if (word === 'export' && depth === 0 && EXPORT_DECLARATION.test(rest)) return 'export'
        if (word === 'await' && depth === 0 && prevChar !== '>' && TOP_LEVEL_AWAIT.test(rest)) return 'top-level await'
      }
      i = j
      prev = 'w'
      prevChar = word.at(-1)
      prevWord = word
    } else if (/[0-9]/.test(c)) {
      while (i < n && /[\w.]/.test(code[i])) i++
      prev = 'w'
      prevChar = '0'
      prevWord = ''
    } else if (c === '}' && templateDepths.at(-1) === depth - 1) {
      templateDepths.pop()
      depth--
      i++
      skipTemplate()
      prev = 's'
      prevChar = '`'
    } else {
      if (c === '{') depth++
      else if (c === '}') depth--
      prev = c === ')' || c === ']' || c === '}' ? c : 'o'
      prevChar = c
      i++
    }
  }
  return null
}

/**
 * Views are classic scripts: compile them so module syntax and other syntax errors fail the
 * export. The compiled text is the real wrapper, which starts with `'use strict'`, so sloppy-only
 * code (`with`, legacy octals, ...) is rejected here as an ordinary syntax error, exactly as it
 * would fail in the page.
 */
export function assertClassicScript(code, source) {
  try {
    new Script(wrapperText({ id: 'x', source, code }), { filename: source })
  } catch (err) {
    const module = err instanceof SyntaxError ? findModuleSyntax(code) : null
    throw new Error(
      module
        ? `${source}: ES module syntax (${module}) is not supported; a view is a classic script`
        : `${source}: syntax error: ${err.message}`,
    )
  }
}

// `</script` ends the element; `<script` + whitespace, `/` or `>` after a `<!--` puts the HTML
// tokenizer into the "script data double escaped" state, where `</script>` no longer ends it
// and the rest of the page is swallowed. `<!--` alone is harmless once `<script` is neutralized
// (it needs both), and rewriting it is not safe: in code position it is a comment, and `\!` is
// an error in a `u`-flag regex. `\x3C` is the same character in a string, template (cooked
// value), regex (also with `u`) and a comment, so the program does not change.
const SCRIPT_TAG_OPEN = /<(?=\/script|script[\s/>])/gi

/** Keeps embedded text from closing or double-escaping its host `<script>`. */
export function escapeScript(text) {
  return text.replace(SCRIPT_TAG_OPEN, '\\x3C')
}

/** `escapeScript` for code that is compiled afterwards, so a sequence in code position fails loudly. */
function escapeChecked(text, label) {
  const out = escapeScript(text)
  if (out !== text) {
    try {
      new Script(out, { filename: label })
    } catch {
      throw new Error(
        `${label}: "<script" or "</script" outside a string, regex, template or comment cannot be embedded in an HTML script`,
      )
    }
  }
  return out
}

const escapeStyle = (text) => text.replace(/<\/(style)/gi, '<\\/$1')
const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function wrapView(view) {
  return (
    `<script data-innfo-view="${escapeAttr(view.id)}" data-innfo-view-source="${escapeAttr(view.source)}">\n` +
    `${escapeChecked(wrapperText(view), view.source)}\n</script>`
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
 * Everything `inlineConsoleAssets` needs to succeed, checked without producing output, so a
 * caller can call it before its first write. Throws on a missing shell anchor, a missing
 * bundle or CSS, or a view or bundle that cannot be embedded.
 */
export function assertInlinable(shell, { bundle, css, views }) {
  /** @type {[string, RegExp][]} */
  const anchors = [['stylesheet link', CSS_LINK], ['viewport meta', VIEWPORT], ['bundle script tags', BUNDLE_TAGS]]
  for (const [name, re] of anchors) {
    if (!re.test(shell)) throw new Error(`console shell has no ${name} to replace (anchor missing)`)
  }
  if (typeof bundle !== 'string' || bundle === '') throw new Error('console bundle is missing or empty')
  if (typeof css !== 'string') throw new Error('console stylesheet is missing')
  escapeChecked(bundle, 'console bundle')
  views.forEach(wrapView)
}

/**
 * One self-contained page: the bundle appears once (the vendored, CDN and raw
 * mirror tags collapse into it, because each extra copy would replace
 * `window.InnfoConsole`), then the views, whose scripts run after it.
 */
export function inlineConsoleAssets(shell, { bundle, css, views }) {
  assertInlinable(shell, { bundle, css, views })
  const header = viewsHeader(views)
  return shell
    .replace(CSS_LINK, () => `<style>${escapeStyle(css)}</style>`)
    .replace(VIEWPORT, (meta) => (header ? `${meta}\n${header}` : meta))
    .replace(BUNDLE_TAGS, () => [`<script>\n${escapeChecked(bundle, 'console bundle')}\n</script>`, ...views.map(wrapView)].join('\n'))
}
