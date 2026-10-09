import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
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
} from '../scripts/console-views.mjs'
import { InnfoConsole } from './helpers/console-boot.mjs'

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

  describe('constants', () => {
    it('reserved ids match the ids the runtime refuses', () => {
      for (const id of RESERVED_VIEW_IDS) {
        const reg = InnfoConsole.createViewRegistry()
        assert.throws(
          () => reg.register({ id, title: 't', icon: 'x', order: 1, kind: 'readonly', mount() {} }),
          /reserved/,
        )
      }
      assert.equal(RESERVED_VIEW_IDS.length, 3)
      assert.ok(VIEW_ID_RE.test('a-b1') && !VIEW_ID_RE.test('A') && !VIEW_ID_RE.test('a_b'))
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
          '<d>/specs/bluepriNNts/metrics/V_0-4-1/assets/consoles/views',
          '<d>/specs/bluepriNNts/metrics/assets/consoles/views',
          '<p>/metrics/assets/consoles/views',
        ],
      )
    })

    it('the first existing root wins and roots are never merged', async () => {
      await put(join(pkgs, 'metrics', 'assets', 'consoles', 'views', 'timeline.js'))
      await put(join(pkgs, 'metrics', 'assets', 'consoles', 'views', 'extra.js'))
      await put(join(domain, 'specs', 'bluepriNNts', 'metrics', 'assets', 'consoles', 'views', 'timeline.js'), GOOD + '// domain copy\n')
      const views = await discover(['metrics_V_0-4-1'])
      assert.deepEqual(views.map((v) => v.id), ['timeline'])
      assert.match(views[0].code, /domain copy/)
      assert.equal(views[0].source, 'bluepriNNt:metrics/assets/consoles/views/timeline.js')
      assert.equal(views[0].origin, 'bluepriNNt')
    })

    it('reads each base once even when several models share it', async () => {
      await put(join(pkgs, 'metrics', 'assets', 'consoles', 'views', 'timeline.js'))
      const views = await discover(['metrics_V_0-4-1', 'metrics_V_0-3-0', 'metrics_V_0-4-1'])
      assert.deepEqual(views.map((v) => v.id), ['timeline'])
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
      await put(join(pkgs, 'metrics', 'assets', 'consoles', 'views', 'timeline.js'))
      await put(join(domain, 'consoles', 'views', 'timeline.js'))
      await assert.rejects(
        discover(['metrics_V_0-4-1']),
        (err) =>
          /duplicate view id "timeline"/.test(err.message) &&
          err.message.includes('bluepriNNt:metrics/assets/consoles/views/timeline.js') &&
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
      assert.equal(escapeScript("a</script>b</SCRIPT >c"), 'a<\\/script>b<\\/SCRIPT >c')
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
      '<link rel="stylesheet" href="./innfo-ui.css" /></head><body>',
      '<script src="./innfo-console.bundle.js"></script>',
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

    it('is deterministic', () => {
      const a = inlineConsoleAssets(shell, { bundle: 'b', css: 'c', views: [] })
      assert.equal(a, inlineConsoleAssets(shell, { bundle: 'b', css: 'c', views: [] }))
    })
  })
})
