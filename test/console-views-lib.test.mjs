import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fsp, { mkdtemp, rm, mkdir, writeFile, symlink } from 'node:fs/promises'
import vm from 'node:vm'
import { syncBuiltinESMExports } from 'node:module'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  RESERVED_VIEW_IDS,
  VIEW_ID_RE,
  parseSpecName,
  viewRootCandidates,
  discoverViews,
  assertClassicScript,
  escapeScript,
  wrapView,
  viewsHeader,
  inlineConsoleAssets,
  allowInlineScripts,
  assertInlinable,
  CONSOLE_SIZE_BUDGET,
  evaluateSizeBudget,
} from '../scripts/console-views.mjs'
import { JSDOM } from 'jsdom'
import { InnfoConsole, consoleDir } from './helpers/console-boot.mjs'

const GOOD = "registerView({ title: 'T', icon: 'x', order: 1, kind: 'readonly', mount() {} })\n"

async function put(path, text = GOOD) {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, text, 'utf8')
}

describe('console-views lib', () => {
  let domain
  let pkgs

  beforeEach(async () => {
    domain = await mkdtemp(join(tmpdir(), 'nn-views-domain-'))
    pkgs = await mkdtemp(join(tmpdir(), 'nn-views-pkgs-'))
  })
  afterEach(async () => {
    await rm(domain, { recursive: true, force: true })
    await rm(pkgs, { recursive: true, force: true })
  })

  const discover = (specNames = []) => discoverViews({ domainRoot: domain, specNames, packagesDir: pkgs })

  describe('unresolvable bluepriNNt packages', () => {
    const collect = async (specNames) => {
      const warnings = []
      await discoverViews({ domainRoot: domain, specNames, packagesDir: pkgs, onWarning: (w) => warnings.push(w) })
      return warnings
    }

    it('warns, naming the spec and the folder searched, when no package for the base can be found', async () => {
      const warnings = await collect(['metrics_V_0-4-1'])
      assert.equal(warnings.length, 1)
      assert.match(warnings[0], /metrics_V_0-4-1/)
      assert.ok(warnings[0].includes(join(pkgs, 'metrics')))
    })

    it('stays silent when the package exists but ships no views', async () => {
      await mkdir(join(pkgs, 'metrics'), { recursive: true })
      assert.deepEqual(await collect(['metrics_V_0-4-1']), [])
    })

    it('stays silent when the domain carries its own copy of the bluepriNNt', async () => {
      await mkdir(join(domain, 'specs', 'bluepriNNts', 'metrics'), { recursive: true })
      assert.deepEqual(await collect(['metrics_V_0-4-1']), [])
    })

    it('stays silent when views were found', async () => {
      await put(join(pkgs, 'metrics', 'assets', 'console-view-timeline.js'))
      assert.deepEqual(await collect(['metrics_V_0-4-1']), [])
    })

    it('does not require an onWarning callback', async () => {
      await discover(['metrics_V_0-4-1'])
    })
  })

  describe('constants', () => {
    const runtimeSource = readFileSync(join(consoleDir, 'nn-runtime.js'), 'utf8')
    const accepted = (id) => {
      try {
        InnfoConsole.createViewRegistry().register({ id, title: 't', icon: 'x', order: 1, kind: 'readonly', mount() {} })
        return true
      } catch {
        return false
      }
    }

    it('reserved ids are the same set the runtime declares, in both directions', () => {
      const declared = runtimeSource.match(/var RESERVED_VIEW_IDS = \[([^\]]*)\]/)[1]
      const runtimeReserved = [...declared.matchAll(/'([^']+)'/g)].map((m) => m[1])
      assert.ok(runtimeReserved.length > 0, 'the runtime list was found')
      assert.deepEqual([...RESERVED_VIEW_IDS].sort(), [...runtimeReserved].sort())
      for (const id of RESERVED_VIEW_IDS) assert.equal(accepted(id), false, id + ' is refused by the runtime')
    })

    it('the id pattern is the runtime pattern, and both agree on a wide set of probes', () => {
      const declared = runtimeSource.match(/var VIEW_ID_RE = \/(.*)\/\s*$/m)[1]
      assert.equal(VIEW_ID_RE.source, declared)
      const probes = [
        'a', 'a-b', 'a-b1', '1', '0-1', 'a1-b2-c3', 'a--b', '-a', 'a-', '-', '', 'A', 'aB', 'a_b', 'a b', 'a.b', 'a/b',
        'é', 'aé', 'a\n', 'a-b\n', ' a', 'a ', 'x'.repeat(200), 'timeline', 'review', 'explorer', 'matrices', 'Review',
      ]
      for (const id of probes) {
        assert.equal(accepted(id), VIEW_ID_RE.test(id) && !RESERVED_VIEW_IDS.includes(id), JSON.stringify(id))
      }
    })

    it('splits a parent_spec name into base and version', () => {
      assert.deepEqual(parseSpecName('metrics_V_0-4-1'), { base: 'metrics', version: 'V_0-4-1' })
      assert.deepEqual(parseSpecName('metrics'), { base: 'metrics', version: null })
    })
  })

  describe('discovery roots', () => {
    it('lists domain version dir, domain base dir, then the package dir', () => {
      const roots = viewRootCandidates({ domainRoot: domain, specName: 'metrics_V_0-4-1', packagesDir: pkgs })
      assert.deepEqual(
        roots.map((r) => r.replace(/\\/g, '/').replace(domain.replace(/\\/g, '/'), '<d>').replace(pkgs.replace(/\\/g, '/'), '<p>')),
        [
          '<d>/specs/bluepriNNts/metrics/V_0-4-1/assets',
          '<d>/specs/bluepriNNts/metrics/assets',
          '<p>/metrics/assets',
        ],
      )
    })

    it('the first existing root wins and roots are never merged', async () => {
      await put(join(pkgs, 'metrics', 'assets', 'console-view-timeline.js'))
      await put(join(pkgs, 'metrics', 'assets', 'console-view-extra.js'))
      await put(join(domain, 'specs', 'bluepriNNts', 'metrics', 'assets', 'console-view-timeline.js'), GOOD + '// domain copy\n')
      const views = await discover(['metrics_V_0-4-1'])
      assert.deepEqual(views.map((v) => v.id), ['timeline'])
      assert.match(views[0].code, /domain copy/)
      assert.equal(views[0].source, 'bluepriNNt:metrics/assets/console-view-timeline.js')
      assert.equal(views[0].origin, 'bluepriNNt')
    })

    it('reads each base once even when several models share it', async () => {
      await put(join(pkgs, 'metrics', 'assets', 'console-view-timeline.js'))
      const views = await discover(['metrics_V_0-4-1', 'metrics_V_0-3-0', 'metrics_V_0-4-1'])
      assert.deepEqual(views.map((v) => v.id), ['timeline'])
    })
  })

  describe('parent_spec base validation', () => {
    for (const name of ['../../x_V_0-1-0', 'a/b_V_0-1-0', 'a\\b', '..', 'a.b_V_0-1-0', 'x y', '']) {
      it('refuses ' + JSON.stringify(name) + ' before building any path', async () => {
        assert.throws(
          () => viewRootCandidates({ domainRoot: domain, specName: name, packagesDir: pkgs }),
          /parent_spec.*not a valid name/,
        )
        await assert.rejects(discover([name]), /parent_spec.*not a valid name/)
      })
    }

    it('does not read views from a traversal target', async () => {
      await put(join(pkgs, '..', 'x-traversal-probe', 'assets', 'console-view-evil.js'))
      try {
        await assert.rejects(discover(['../x-traversal-probe_V_0-1-0']), /parent_spec/)
      } finally {
        await rm(join(pkgs, '..', 'x-traversal-probe'), { recursive: true, force: true })
      }
    })

    it('accepts letters, digits, underscores and hyphens', () => {
      assert.doesNotThrow(() => viewRootCandidates({ domainRoot: domain, specName: 'My_Spec-2_V_0-1-0', packagesDir: pkgs }))
    })
  })

  describe('selection among several models', () => {
    const domainViews = (base, version) =>
      join(domain, 'specs', 'bluepriNNts', base, ...(version ? [version] : []), 'assets')
    const pkgViews = (base) => join(pkgs, base, 'assets')

    it('gives the same result for every input order', async () => {
      await put(join(pkgViews('metrics'), 'console-view-timeline.js'))
      const a = await discover(['metrics_V_0-3-0', 'metrics_V_0-4-1', 'other_V_0-1-0'])
      const b = await discover(['other_V_0-1-0', 'metrics_V_0-4-1', 'metrics_V_0-3-0'])
      assert.deepEqual(a, b)
    })

    it('fails naming both models when two versions of one base resolve to different view sets', async () => {
      await put(join(domainViews('metrics', 'V_0-3-0'), 'console-view-old.js'))
      await put(join(domainViews('metrics', 'V_0-4-1'), 'console-view-new.js'))
      const expected = (err) =>
        /metrics_V_0-3-0/.test(err.message) && /metrics_V_0-4-1/.test(err.message) && /different views/.test(err.message)
      await assert.rejects(discover(['metrics_V_0-4-1', 'metrics_V_0-3-0']), expected)
      await assert.rejects(discover(['metrics_V_0-3-0', 'metrics_V_0-4-1']), expected)
    })

    it('fails the same way when one version has its own views and the other uses the package', async () => {
      await put(join(domainViews('metrics', 'V_0-4-1'), 'console-view-new.js'))
      await put(join(pkgViews('metrics'), 'console-view-timeline.js'))
      await assert.rejects(discover(['metrics_V_0-3-0', 'metrics_V_0-4-1']), /different views/)
    })

    it('is fine when only one version resolves to any views', async () => {
      await put(join(domainViews('metrics', 'V_0-4-1'), 'console-view-new.js'))
      assert.deepEqual((await discover(['metrics_V_0-3-0', 'metrics_V_0-4-1'])).map((v) => v.id), ['new'])
    })

    it('treats an existing but empty candidate directory as absent', async () => {
      await mkdir(domainViews('metrics', 'V_0-4-1'), { recursive: true })
      await put(join(domainViews('metrics'), 'readme.md'), '# no views here')
      await put(join(pkgViews('metrics'), 'console-view-timeline.js'))
      const views = await discover(['metrics_V_0-4-1'])
      assert.deepEqual(views.map((v) => v.id), ['timeline'])
      assert.equal(views[0].source, 'bluepriNNt:metrics/assets/console-view-timeline.js')
    })

    it('orders bases by plain code units, not by locale', async () => {
      await put(join(pkgViews('Zeta'), 'console-view-x.js'))
      await put(join(pkgViews('alpha'), 'console-view-x.js'))
      const expected = (err) => err.message.indexOf('Zeta') < err.message.indexOf('alpha')
      await assert.rejects(discover(['alpha_V_0-1-0', 'Zeta_V_0-1-0']), expected)
      await assert.rejects(discover(['Zeta_V_0-1-0', 'alpha_V_0-1-0']), expected)
    })
  })

  describe('discovery by convention', () => {
    it('finds domaiNN custom views sorted by id with source and sha256', async () => {
      await put(join(domain, 'consoles', 'views', 'pipeline.js'))
      await put(join(domain, 'consoles', 'views', 'alpha.js'))
      const views = await discover()
      assert.deepEqual(views.map((v) => v.id), ['alpha', 'pipeline'])
      assert.equal(views[1].origin, 'domaiNN')
      assert.equal(views[1].source, 'domaiNN:consoles/views/pipeline.js')
      assert.equal(views[1].sha256, createHash('sha256').update(GOOD, 'utf8').digest('hex'))
    })

    it('tolerates missing and empty folders', async () => {
      assert.deepEqual(await discover(['metrics_V_0-4-1']), [])
      await mkdir(join(domain, 'consoles', 'views'), { recursive: true })
      assert.deepEqual(await discover(), [])
    })

    it('ignores non-.js entries, including directories named like views', async () => {
      const dir = join(domain, 'consoles', 'views')
      await put(join(dir, 'notes.md'), '# n')
      await put(join(dir, 'Bad Name.txt'), 'x')
      await put(join(dir, 'mod.mjs'), 'export {}')
      await mkdir(join(dir, 'folder.js'), { recursive: true })
      await put(join(dir, 'ok.js'))
      assert.deepEqual((await discover()).map((v) => v.id), ['ok'])
    })
  })

  describe('nothing is skipped silently', () => {
    // A file symlink needs a privilege on Windows; a junction to a folder does not, and both
    // show up as symbolic links in a directory listing.
    const link = async (target, at) => {
      for (const [to, type] of [[target, 'file'], [dirname(target), 'junction']]) {
        try {
          await symlink(to, at, type)
          return true
        } catch {
          // try the next kind
        }
      }
      return false
    }

    it('rejects a symlinked *.js view, naming the file', async (t) => {
      const dir = join(domain, 'consoles', 'views')
      await put(join(domain, 'real', 'timeline.js'))
      await mkdir(dir, { recursive: true })
      if (!(await link(join(domain, 'real', 'timeline.js'), join(dir, 'timeline.js')))) {
        return t.skip('cannot create a symlink or junction here')
      }
      await assert.rejects(discover(), (err) => /timeline.js/.test(err.message) && /symbolic link/.test(err.message))
    })

    it('rethrows a read error that is not "does not exist" instead of reporting no views', async (t) => {
      const dir = join(domain, 'consoles', 'views')
      await put(join(dir, 'ok.js'))
      const real = fsp.readdir
      t.mock.method(fsp, 'readdir', async (path, ...rest) => {
        if (path === dir) throw Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
        return real(path, ...rest)
      })
      syncBuiltinESMExports()
      try {
        await assert.rejects(discover(), /EACCES/)
      } finally {
        t.mock.restoreAll()
        syncBuiltinESMExports()
      }
    })

    it('treats a missing folder and a file where a folder should be as no views', async () => {
      await put(join(domain, 'consoles'), 'not a folder')
      assert.deepEqual(await discover(), [])
    })
  })

  describe('validation', () => {
    it('rejects a file name that is not a slug, naming the file', async () => {
      await put(join(domain, 'consoles', 'views', 'Bad_Name.js'))
      await assert.rejects(discover(), /Bad_Name.*domaiNN:consoles\/views\/Bad_Name\.js|domaiNN:consoles\/views\/Bad_Name\.js.*Bad_Name/s)
    })

    it('rejects reserved ids', async () => {
      await put(join(domain, 'consoles', 'views', 'review.js'))
      await assert.rejects(discover(), /"review".*reserved/)
    })

    it('rejects a duplicate id across bluepriNNt and domaiNN, naming both sources', async () => {
      await put(join(pkgs, 'metrics', 'assets', 'console-view-timeline.js'))
      await put(join(domain, 'consoles', 'views', 'timeline.js'))
      await assert.rejects(
        discover(['metrics_V_0-4-1']),
        (err) =>
          /duplicate view id "timeline"/.test(err.message) &&
          err.message.includes('bluepriNNt:metrics/assets/console-view-timeline.js') &&
          err.message.includes('domaiNN:consoles/views/timeline.js'),
      )
    })

    it('rejects ES module syntax with a clear error naming the source', async () => {
      await put(join(domain, 'consoles', 'views', 'esm.js'), "import x from './x.js'\nregisterView({})\n")
      await assert.rejects(discover(), /domaiNN:consoles\/views\/esm\.js.*ES module syntax/s)
      await put(join(domain, 'consoles', 'views', 'esm.js'), 'export const a = 1\n')
      await assert.rejects(discover(), /ES module syntax/)
    })

    it('assertClassicScript accepts dynamic import() and strings that mention import', () => {
      assert.doesNotThrow(() => assertClassicScript("var s = 'import x'; // export y\nimport('./a.js')", 'src'))
    })

    describe('module syntax is found from the tokens, not from the engine message', () => {
      const esm = (code) => assert.throws(() => assertClassicScript(code, 'src'), /^Error: src: ES module syntax/, code)
      const plain = (code) =>
        assert.throws(() => assertClassicScript(code, 'src'), (e) => /syntax error/.test(e.message) && !/ES module/.test(e.message), code)

      it('names import, export, import.meta and top-level await', () => {
        esm("import x from 'y'\nregisterView({})")
        esm("import { a } from 'y'")
        esm("import * as ns from 'y'")
        esm("import 'side-effect'")
        esm('export const a = 1')
        esm('export default function () {}')
        esm('export { a }')
        esm('var u = import.meta.url')
        esm('function f() { return import.meta.url }')
        esm('const v = await fetch("x")')
      })

      it('sees the statement through strings, templates, regexes and comments that hide look-alikes', () => {
        esm("var s = 'import nothing'; // export nothing\nimport x from 'y'")
        esm("var r = /'/\nimport x from 'y'")
        esm("var r = /[/']/g\nimport x from 'y'")
        esm('var t = `a ${ "}" + `b ${1}` } c`\nexport const a = 1')
        esm("/* import x from 'y' */\nexport const a = 1")
      })

      it('does not call a plain syntax error a module because of look-alikes', () => {
        plain("var = ; // import x from 'y'")
        plain("var s = 'export const a'; var = ;")
        plain('var t = `import x from "y"`; var = ;')
        plain('var import = 1')
        plain('var export = 1')
        plain('obj.import = 1; obj.export = 2; var = ;')
        plain("var = ; import('./a.js')")
        plain('function f() { var = ; }\nvar r = /import x from y/')
        plain('var n = (async () => await 1)(); var = ;')
      })

      it('rejects sloppy-only code because views run under "use strict"', () => {
        plain('with (Math) { max(1, 2) }')
        plain('var o = 010')
      })
    })

    it('reports other syntax errors as syntax errors, not as modules', () => {
      assert.throws(() => assertClassicScript('var = ;', 'src'), (e) => /src/.test(e.message) && /syntax error/i.test(e.message) && !/ES module/.test(e.message))
    })
  })

  describe('wrapping and escaping', () => {
    const view = {
      id: 'pipeline',
      origin: 'domaiNN',
      source: 'domaiNN:consoles/views/pipeline.js',
      code: GOOD,
      sha256: 'ab'.repeat(32),
    }

    it('escapes every </script in any case', () => {
      assert.equal(escapeScript('a</script>b</SCRIPT >c'), String.raw`a\x3C/script>b\x3C/SCRIPT >c`)
    })

    it('escapes <script followed by whitespace, / or > in any case, but not identifiers', () => {
      for (const open of ['<script>', '<SCRIPT ', '<ScRiPt\n', '<script\t', '<script/', '<sCript\r']) {
        assert.equal(/<script[\s/>]/i.test(escapeScript('x ' + open + ' y')), false, JSON.stringify(open))
      }
      assert.equal(escapeScript('i<script.length && a<scripts'), 'i<script.length && a<scripts')
    })

    it('keeps the string value of what it escapes', () => {
      const src = "'<!-- <script> </script> <ScRiPt/> <\/script'"
      assert.equal(eval(escapeScript(src)), eval(src))
    })

    describe('script data double-escaped state', () => {
      const registrar = '<script>window.InnfoConsole = { viewRegistrar: () => (def) => { window.__view = def } }</script>'
      const parse = async (markup) => {
        const dom = new JSDOM(markup, { runScripts: 'dangerously' })
        await new Promise((ok) => dom.window.addEventListener('load', ok))
        return dom.window
      }
      const page = (inner) =>
        '<!doctype html><html><head></head><body><div id="elements"></div>' +
        registrar +
        inner +
        '<script>window.__after = 1</script><div id="after-div"></div></body></html>'

      for (const code of [
        "// <!-- <script>\nregisterView({ title: 'T' })\n",
        "var s = '<!-- <script>'\nregisterView({ title: s })\n",
        "/* <!-- <SCRIPT x> */\nregisterView({ title: 'T' })\n",
        "var s = '<!-- <ScRiPt/>'\nregisterView({ title: s })\n",
        "var s = '<!--\\n<script\\t>'\nregisterView({ title: 'T' })\n",
        "var r = /<!--\s*<script/u\nregisterView({ title: 'T' })\n",
      ]) {
        it('a view with ' + JSON.stringify(code.slice(0, 24)) + ' does not swallow the rest of the page', async () => {
          const win = await parse(page(wrapView({ ...view, code })))
          assert.ok(win.__view, 'the view itself ran')
          assert.equal(win.__after, 1, 'the following script ran')
          assert.ok(win.document.getElementById('after-div'), 'following markup parsed')
          assert.ok(win.document.getElementById('elements'))
        })
      }

      it('a bundle with the same strings does not swallow the rest of the page', async () => {
        const shell =
          '<head><meta name="viewport" content="x" /><link rel="stylesheet" href="./nn-ui.css" /></head><body>' +
          '<div id="elements"></div>' +
          '<script src="./nn-console.bundle.js"></script>\n<!-- nn:console-shell:start -->\n<!-- nn:console-shell:end -->' +
          '<script>window.__after = 1</script><div id="after-div"></div></body>'
        const bundle = "window.__bundle = '<!-- <script>' + ' </script>'"
        const win = await parse(inlineConsoleAssets(shell, { bundle, css: '', views: [] }))
        assert.equal(win.__bundle, '<!-- <script> </script>')
        assert.equal(win.__after, 1)
        assert.ok(win.document.getElementById('after-div'))
      })

      it('fails clearly when the sequence sits in code, where it cannot be escaped', () => {
        const code = 'var script = 3; var r = 1 <script >2\nregisterView({})\n'
        assert.doesNotThrow(() => assertClassicScript(code, 'src'))
        assert.throws(() => wrapView({ ...view, code }), /domaiNN:consoles\/views\/pipeline\.js.*cannot be embedded/s)
        const shell = [
          '<head><meta name="viewport" content="x" /><link rel="stylesheet" href="./nn-ui.css" /></head>',
          '<script src="./nn-console.bundle.js"></script>',
          '<!-- nn:console-shell:start --><!-- nn:console-shell:end -->',
        ].join('\n')
        assert.throws(() => inlineConsoleAssets(shell, { bundle: code, css: '', views: [] }), /console bundle.*cannot be embedded/s)
      })
    })

    it('wraps a view with the registrar for its slug and tags the script', () => {
      const out = wrapView({ ...view, code: "var s = '</script>'\n// tail" })
      assert.match(out, /^<script data-innfo-view="pipeline" data-innfo-view-source="domaiNN:consoles\/views\/pipeline\.js">/)
      assert.ok(out.includes("InnfoConsole.viewRegistrar(\"pipeline\", \"domaiNN:consoles/views/pipeline.js\")"))
      assert.equal(out.match(/<\/script/gi).length, 1, 'only the closing tag survives')
      assert.match(out, /\/\/ tail\n\}\)\(InnfoConsole/, 'a trailing line comment cannot swallow the closing')
    })

    it('escapes attribute values', () => {
      assert.ok(wrapView({ ...view, source: 'a"b<c&d' }).includes('data-innfo-view-source="a&quot;b&lt;c&amp;d"'))
    })

    it('header lists id, origin, source and a 12 hex digest per view, with -- sanitized', () => {
      const h = viewsHeader([view, { ...view, id: 'x--y', source: 'domaiNN:a--b.js' }])
      assert.match(h, /^<!-- innfo-views \(trusted code, full page access\)\n/)
      assert.ok(h.includes('pipeline domaiNN domaiNN:consoles/views/pipeline.js sha256:abababababab\n'))
      const body = h.slice(4, -3)
      assert.equal(body.includes('--'), false)
      assert.ok(h.endsWith('\n-->'))
    })

    it('header is empty when there are no views', () => {
      assert.equal(viewsHeader([]), '')
    })
  })

  describe('inlineConsoleAssets', () => {
    const shell = [
      '<head><meta name="viewport" content="x" />',
      '<link rel="stylesheet" href="./nn-ui.css" /></head><body>',
      '<script src="./nn-console.bundle.js"></script>',
      '<!-- nn:console-shell:start -->',
      '<script src="https://cdn.example/x.js"></script>',
      '<script src="https://raw.example/x.js"></script>',
      '<!-- nn:console-shell:end -->',
      '</body>',
    ].join('\n')

    it('replaces every external tag with one inline bundle, inline css, header and views', () => {
      const view = { id: 'p', origin: 'domaiNN', source: 's', code: GOOD, sha256: 'c'.repeat(64) }
      const out = inlineConsoleAssets(shell, { bundle: '/*BUNDLE*/ var a = "</script>"', css: '.a{}', views: [view] })
      assert.equal(/<script[^>]*\ssrc=/.test(out), false)
      assert.equal(/<link[^>]*stylesheet/.test(out), false)
      assert.equal(out.split('/*BUNDLE*/').length - 1, 1)
      assert.equal(out.includes('nn:console-shell'), false)
      assert.ok(out.includes('<style>.a{}</style>'))
      assert.ok(out.indexOf('innfo-views') > out.indexOf('name="viewport"'))
      assert.ok(out.indexOf('/*BUNDLE*/') < out.indexOf('data-innfo-view="p"'), 'views run after the bundle')
    })

    it('fails when the shell lacks an expected anchor', () => {
      assert.throws(() => inlineConsoleAssets('<html></html>', { bundle: 'b', css: 'c', views: [] }), /anchor/)
    })

    it('fails when the shell carries two bundle blocks, instead of replacing only the first', () => {
      const block = '<script src="./nn-console.bundle.js"></script>\n<!-- nn:console-shell:start -->\n<!-- nn:console-shell:end -->'
      const twice = shell.replace('</body>', block + '\n</body>')
      const args = { bundle: 'b', css: 'c', views: [] }
      assert.throws(() => assertInlinable(twice, args), /2 bundle script blocks/)
      assert.throws(() => inlineConsoleAssets(twice, args), /2 bundle script blocks/)
    })

    it('fails on a bundle script tag left outside the replaced block', () => {
      const stray = shell.replace('</body>', '<script src="https://cdn.example/nn-console.bundle.js"></script>\n</body>')
      assert.throws(() => inlineConsoleAssets(stray, { bundle: 'b', css: 'c', views: [] }), /outside the shell block/)
    })

    it('assertInlinable throws on a missing bundle or css, and each missing anchor, without output', () => {
      assert.throws(() => assertInlinable(shell, { bundle: null, css: 'c', views: [] }), /bundle is missing/)
      assert.throws(() => assertInlinable(shell, { bundle: 'b', css: undefined, views: [] }), /stylesheet is missing/)
      for (const [name, re] of [
        ['stylesheet link', /<link[^>]*>/],
        ['viewport meta', /<meta[^>]*>/],
        ['bundle script tags', /<!-- nn:console-shell:end -->/],
      ]) {
        assert.throws(() => assertInlinable(shell.replace(re, ''), { bundle: 'b', css: 'c', views: [] }), new RegExp(name))
      }
      assert.doesNotThrow(() => assertInlinable(shell, { bundle: 'b', css: 'c', views: [] }))
    })

    it('compiles the bundle once when the caller checks first and inlines later', () => {
      const bundle = 'var s = "</script>"; /*BUNDLE*/'
      const assets = { bundle, css: 'c', views: [] }
      const countCompiles = (run) => {
        const original = vm.Script
        let count = 0
        vm.Script = class extends original {
          constructor(...args) {
            super(...args)
            if (args[1]?.filename === 'console bundle') count++
          }
        }
        syncBuiltinESMExports()
        try {
          run()
        } finally {
          vm.Script = original
          syncBuiltinESMExports()
        }
        return count
      }
      const prepared = assertInlinable(shell, assets)
      assert.equal(
        countCompiles(() => {
          assertInlinable(shell, assets)
          inlineConsoleAssets(shell, assets)
        }),
        2,
        'raw assets are compiled per call, so this counter sees the work',
      )
      assert.equal(countCompiles(() => inlineConsoleAssets(shell, prepared)), 0, 'prepared assets are not compiled again')
      assert.equal(inlineConsoleAssets(shell, prepared), inlineConsoleAssets(shell, assets), 'same output either way')
    })

    it('is deterministic', () => {
      const a = inlineConsoleAssets(shell, { bundle: 'b', css: 'c', views: [] })
      assert.equal(a, inlineConsoleAssets(shell, { bundle: 'b', css: 'c', views: [] }))
    })
  })
})

describe('allowInlineScripts', () => {
  const sha = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`
  const page = (body) =>
    `<html><head><meta\n http-equiv="Content-Security-Policy"\n content="default-src 'none'; script-src 'self' https://cdn.jsdelivr.net; object-src 'none'"\n/></head><body>${body}</body></html>`
  const policyOf = (html) => /Content-Security-Policy"\s+content="([^"]*)"/.exec(html)[1]

  it('hashes executable inline scripts and leaves JSON islands, external scripts and comments out', () => {
    const html = page(
      '<!-- <script>commented()</script> -->' +
        '<script type="application/json" id="d">{"a":1}</script>' +
        '<script src="https://cdn.jsdelivr.net/x.js"></script>' +
        '<script>\nrun()\n</script>' +
        '<script data-innfo-view="v">view()</script>',
    )
    const policy = policyOf(allowInlineScripts(html))
    assert.ok(policy.includes(sha('\nrun()\n')))
    assert.ok(policy.includes(sha('view()')))
    assert.ok(!policy.includes(sha('commented()')))
    assert.ok(!policy.includes(sha('{"a":1}')))
    assert.equal((policy.match(/sha256-/g) ?? []).length, 2)
    assert.match(policy, /script-src 'self' https:\/\/cdn\.jsdelivr\.net 'sha256-[^;]*; object-src 'none'$/)
  })

  it('hashes with CRLF normalized to LF, as the HTML parser does', () => {
    assert.ok(policyOf(allowInlineScripts(page('<script>a()\r\nb()</script>'))).includes(sha('a()\nb()')))
  })

  it('is a no-op without a CSP meta or without inline scripts', () => {
    const bare = '<html><body><script>x()</script></body></html>'
    assert.equal(allowInlineScripts(bare), bare)
    const none = page('<script type="application/json">{}</script>')
    assert.equal(allowInlineScripts(none), none)
  })

  it('inlineConsoleAssets authorizes the inlined bundle and views', () => {
    const shell = readFileSync(join(consoleDir, 'artifact_shell.html'), 'utf8')
    const out = inlineConsoleAssets(shell, { bundle: 'window.InnfoConsole = {}', css: 'a{}', views: [] })
    assert.ok(policyOf(out).includes(sha('\nwindow.InnfoConsole = {}\n')))
  })
})

describe('size budget', () => {
  const parts = (total) => ({ bundle: 1_000_000, models: 2_000, views: 3_000, total })

  it('keeps both thresholds in one constant', () => {
    assert.deepEqual({ ...CONSOLE_SIZE_BUDGET }, { warnBytes: 5_000_000, failBytes: 15_000_000 })
  })

  it('is ok at or below the warn threshold', () => {
    assert.equal(evaluateSizeBudget(parts(5_000_000)).status, 'ok')
  })

  it('warns above 5 MB and above 15 MB fails, with the three-part breakdown on every outcome', () => {
    const warn = evaluateSizeBudget(parts(6_000_000))
    assert.equal(warn.status, 'warn')
    const fail = evaluateSizeBudget(parts(16_000_000))
    assert.equal(fail.status, 'fail')
    for (const r of [evaluateSizeBudget(parts(10)), warn, fail]) {
      assert.match(r.breakdown, /bundle 1000000 B/)
      assert.match(r.breakdown, /models 2000 B/)
      assert.match(r.breakdown, /views 3000 B/)
      assert.match(r.breakdown, new RegExp('total ' + r.total + ' B'))
    }
    assert.match(warn.message, /larger than 5000000 B/)
    assert.match(fail.message, /larger than 15000000 B/)
    assert.match(fail.message, /bundle 1000000 B/)
  })

  it('is exactly at the thresholds: warn above warnBytes, fail above failBytes', () => {
    assert.equal(evaluateSizeBudget(parts(5_000_001)).status, 'warn')
    assert.equal(evaluateSizeBudget(parts(15_000_000)).status, 'warn')
    assert.equal(evaluateSizeBudget(parts(15_000_001)).status, 'fail')
  })
})
