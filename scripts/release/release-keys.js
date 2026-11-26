/**
 * scripts/release/release-keys.js
 *
 * Authoritative table of allowed release keys, copied repository paths,
 * site additions, and release-owned paths in cogNNitive-web.
 */

const RELEASE_KEYS = Object.freeze(['skills', 'blueprints', 'nn-mcp', 'nn-console'])

const RELEASE_TABLE = Object.freeze({
  skills: Object.freeze({
    repoPaths: Object.freeze(['skills']),
    changePaths: Object.freeze(['skills']),
    sitePaths: Object.freeze([]),
  }),
  blueprints: Object.freeze({
    repoPaths: Object.freeze(['iNNfo/specs']),
    /**
     * `manifest/source.yaml` is the blueprint inventory. Declaring a blueprint there is a
     * distribution change even when no spec file moved: until a blueprints release pins it,
     * the manifest cannot be assembled for any other key (a new blueprint has no pin to
     * retain). Counting the inventory here is what makes that release happen first.
     */
    changePaths: Object.freeze(['iNNfo/specs', 'manifest/source.yaml']),
    /**
     * `catalog.json` is generated *from the release tags*: a commit that only restamps it
     * is bookkeeping, not a blueprint change. Counting it as one closes a loop —
     * restamp, tag, and the new tag makes the next restamp different, so it tags again.
     * `run-release.js` stamps that file at publish time anyway, so nothing is lost.
     */
    ignoredRepoPaths: Object.freeze(['iNNfo/specs/bluepriNNts/catalog.json']),
    sitePaths: Object.freeze([]),
  }),
  'nn-mcp': Object.freeze({
    repoPaths: Object.freeze(['iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js']),
    /**
     * The only repo path is the generated bundle, which is never a trigger, so the source has
     * to be listed here: without it the key would only ship when somebody edited a version by
     * hand, which is the lane this file feeds. `nn-core` belongs on the list because the bundle
     * embeds it: a core change that never released nn-mcp would leave consumers on the old code.
     */
    changePaths: Object.freeze([
      'iNNfo/packages/nn-mcp/src',
      'iNNfo/packages/nn-mcp/test',
      'iNNfo/packages/nn-core/src',
    ]),
    sitePaths: Object.freeze(['docs/innfo/cdn/manifest.json']),
  }),
  'nn-console': Object.freeze({
    repoPaths: Object.freeze([
      'iNNfo/specs/bluepriNNts/console',
      'scripts/export-console.mjs',
      'scripts/console-views.mjs',
    ]),
    changePaths: Object.freeze([
      'iNNfo/specs/bluepriNNts/console',
      'scripts/export-console.mjs',
      'scripts/console-views.mjs',
    ]),
    sitePaths: Object.freeze([]),
  }),
})

/**
 * Unique list of distribution paths in the monorepo copied to cogNNitive-web.
 * Note: 'iNNfo/specs/bluepriNNts/console' is a subset of 'iNNfo/specs',
 * so the root distribution surface copies 'iNNfo/specs'.
 */
const DISTRIBUTION_PATHS = Object.freeze([
  'skills',
  'iNNfo/specs',
  'iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js',
  'scripts/export-console.mjs',
  'scripts/console-views.mjs',
  'THIRD_PARTY.md',
  'LICENSE',
  'third-party/licenses',
])

/**
 * Globs and paths in cogNNitive-web docs/ owned strictly by the release workflow.
 * Push-to-main publishing MUST preserve these and MUST NOT overwrite or delete them.
 *
 * `innfo/cdn/innfo-mcp-v*.bundle.js` is retained on purpose: the cutover retires the
 * name but the already-published CDN files stay immutable and must survive a Pages
 * push (design D5). Nothing emits it any more.
 */
const RELEASE_OWNED_GLOBS = Object.freeze([
  'innfo/cdn/nn-mcp-v*.bundle.js',
  'innfo/cdn/innfo-mcp-v*.bundle.js',
  'innfo/cdn/manifest.json',
  'use/manifest.md',
  'update/manifest.md',
  'use/manifests/*.md',
])

const RELEASE_OWNED_SITE_PATHS = RELEASE_OWNED_GLOBS

module.exports = {
  RELEASE_KEYS,
  RELEASE_TABLE,
  DISTRIBUTION_PATHS,
  RELEASE_OWNED_GLOBS,
  RELEASE_OWNED_SITE_PATHS,
}
