/**
 * scripts/release/release-keys.js
 *
 * Authoritative table of allowed release keys, copied repository paths,
 * site additions, and release-owned paths in cogNNitive-web.
 */

const RELEASE_KEYS = Object.freeze(['skills', 'blueprints', 'nn-mcp', 'nn-console']);

const RELEASE_TABLE = Object.freeze({
  skills: Object.freeze({
    repoPaths: Object.freeze(['skills']),
    sitePaths: Object.freeze([]),
  }),
  blueprints: Object.freeze({
    repoPaths: Object.freeze(['iNNfo/specs']),
    sitePaths: Object.freeze([]),
  }),
  'nn-mcp': Object.freeze({
    repoPaths: Object.freeze(['iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js']),
    sitePaths: Object.freeze(['docs/innfo/cdn/manifest.json']),
  }),
  'nn-console': Object.freeze({
    repoPaths: Object.freeze([
      'iNNfo/specs/bluepriNNts/console',
      'scripts/export-console.mjs',
      'scripts/console-views.mjs',
    ]),
    sitePaths: Object.freeze([]),
  }),
});

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
]);

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
]);

const RELEASE_OWNED_SITE_PATHS = RELEASE_OWNED_GLOBS;

module.exports = {
  RELEASE_KEYS,
  RELEASE_TABLE,
  DISTRIBUTION_PATHS,
  RELEASE_OWNED_GLOBS,
  RELEASE_OWNED_SITE_PATHS,
};
