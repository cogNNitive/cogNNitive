/**
 * scripts/lib/manifest-default-url.test.js
 *
 * The distribution entry point is the URL a fresh install uses when nothing
 * overrides it. It is the one value a new user depends on and nobody re-checks,
 * because every other test passes SM_MANIFEST_URL and never exercises the
 * default: `scripts/skills-manager.test.js` alone has more than a dozen
 * assignments of that variable and none of them proves what happens without it.
 *
 * Issue #233 shipped this defect once already — the default pointed at the
 * retired private repo, so `skills-manager` could not install out of the box —
 * and it was closed without a test holding the URL in place. These tests are
 * that test.
 */

const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const commands = require('./skills-commands.js')
const preflightScript = path.join(
  __dirname,
  '..',
  '..',
  'skills',
  'nn-preflight',
  'scripts',
  'preflight-check.js',
)

/** Runs a probe without the env override, so the module default is what answers. */
function withoutOverride(fn) {
  const saved = process.env.SM_MANIFEST_URL
  delete process.env.SM_MANIFEST_URL
  try {
    return fn()
  } finally {
    if (saved !== undefined) process.env.SM_MANIFEST_URL = saved
  }
}

test('the default manifest URL is the public distribution host', () => {
  const url = withoutOverride(() => commands.getManifestUrl())
  assert.strictEqual(url, 'https://cognnitive.com/use/manifest.md')
})

test('the fallback manifest URL is the public intake repository', () => {
  assert.strictEqual(
    commands.FALLBACK_MANIFEST_URL,
    'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/docs/use/manifest.md',
  )
})

test('no distribution default points at the retired source repository', () => {
  // The retired repo is private, so every raw/codeload URL under it answers 404.
  for (const [name, url] of [
    ['DEFAULT_MANIFEST_URL', commands.DEFAULT_MANIFEST_URL],
    ['FALLBACK_MANIFEST_URL', commands.FALLBACK_MANIFEST_URL],
  ]) {
    assert.ok(
      !/(^|\/)cogNNitive\/cogNNitive(\/|$)/.test(url),
      `${name} still points at the retired repo: ${url}`,
    )
  }
})

test('the preflight CLI resolves the same default manifest URL', () => {
  // Two independent readers of one contract: if they disagree, `preflight` and
  // `skills-manager` report a different install state for the same machine.
  // The CLI keeps its default private and never exported it - exporting it
  // would mean reshaping a published skill just to reach a constant - so this
  // reads the source: a divergence names the URL it disagrees on.
  const source = fs.readFileSync(preflightScript, 'utf8')
  const literal = (name) => {
    const match = source.match(new RegExp(`${name} =[\\s\\S]{0,80}?'(https://[^']+)'`))
    assert.ok(match, `preflight-check.js does not declare ${name} as an https literal`)
    return match[1]
  }
  assert.strictEqual(literal('DEFAULT_MANIFEST_URL'), commands.DEFAULT_MANIFEST_URL)
  assert.strictEqual(literal('FALLBACK_MANIFEST_URL'), commands.FALLBACK_MANIFEST_URL)
})

test('an explicit override still wins over the default', () => {
  process.env.SM_MANIFEST_URL = 'http://127.0.0.1:9/manifest.md'
  try {
    assert.strictEqual(commands.getManifestUrl(), 'http://127.0.0.1:9/manifest.md')
  } finally {
    delete process.env.SM_MANIFEST_URL
  }
})
