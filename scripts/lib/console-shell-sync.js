/**
 * scripts/lib/console-shell-sync.js
 *
 * Single source of truth for the console CDN pin carried by *generated* console
 * shells. The pin is never hand-typed: it is the release identity derived from
 * `iNNfo/specs/bluepriNNts/console/package.json` (see console-release-info.js) and
 * stamped into the `@nn-console-v<version>` token of every jsDelivr script tag
 * inside the `nn:console-shell` marker block.
 *
 * The rewrite is surgical — only the version token changes, so each shell keeps
 * its own CDN path (repo, `/templates/` vs `/bluepriNNts/`). A release bump
 * changes the console version, so every generated shell MUST be regenerated
 * (`node scripts/build-console-shells.mjs`); the shell guard fails a stale one.
 */

const fs = require('node:fs');
const path = require('node:path');
const { getConsoleReleaseInfo } = require('./console-release-info.js');

const MARKER_START = '<!-- nn:console-shell:start -->';
const MARKER_END = '<!-- nn:console-shell:end -->';
const BLOCK_RE = new RegExp(
  `${escapeRe(MARKER_START)}[\\s\\S]*?${escapeRe(MARKER_END)}`,
);
/**
 * Readers accept both families (design D7): the repo's generated shells carry
 * `@nn-console-v`, while a stamped export published before the cutover still carries
 * `@nn-console-v` and MUST keep resolving (its tag exists; `nn-console-v<old>` does not).
 * Only `syncShellContent` writes, and it writes the canonical new family.
 */
const JSDELIVR_PIN_RE = /@(?:nn|innfo)-console-v(\d+\.\d+\.\d+)/g;
const CONSOLE_PIN_PREFIX = '@nn-console-v';
/** A stamped export may still point at the pre-cutover bundle file name. */
const LEGACY_BUNDLE_NAME_RE = /\/nn-console\.bundle\.js/g;

function escapeRe(s) {
  return s.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/** The blocks in a shell that carry the generated pin. */
function generatedBlocks(content) {
  return content.match(BLOCK_RE) || [];
}

/**
 * Rewrites every jsDelivr pin inside the generated block to `version`. Returns
 * null when the shell is not a generated shell (no marker block).
 * @param {string} content
 * @param {string} version e.g. "0.7.3"
 * @returns {string|null}
 */
function syncShellContent(content, version) {
  if (!BLOCK_RE.test(content)) return null;
  return content.replace(BLOCK_RE, (block) =>
    block
      // Re-pinning a stamped export also moves it to the cutover file name and family.
      .replace(LEGACY_BUNDLE_NAME_RE, '/nn-console.bundle.js')
      .replace(JSDELIVR_PIN_RE, `${CONSOLE_PIN_PREFIX}${version}`),
  );
}

/** The pin in a shell's generated block (e.g. "nn-console-v0.7.3"), or null. Reported in the family the shell carries. */
function getGeneratedPin(content) {
  const block = generatedBlocks(content)[0];
  if (!block) return null;
  const m = block.match(JSDELIVR_PIN_RE);
  if (block.match(/\d+\.\d+\.\d+/) && !m) return null;
  return m ? m[0].replace(/^@/, '') : null;
}

/** All generated console shells (marked), as repo-relative POSIX paths. */
function discoverGeneratedShells(repoRoot) {
  const blueprintsDir = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts');
  const out = [];
  if (!fs.existsSync(blueprintsDir)) return out;
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) {
        if (BLOCK_RE.test(fs.readFileSync(full, 'utf8'))) {
          out.push(path.relative(repoRoot, full).split(path.sep).join('/'));
        }
      }
    }
  })(blueprintsDir);
  return out.sort();
}

/** The console release version derived from console/package.json. */
function expectedVersion(repoRoot) {
  return getConsoleReleaseInfo(repoRoot).version;
}

module.exports = {
  MARKER_START,
  MARKER_END,
  syncShellContent,
  getGeneratedPin,
  discoverGeneratedShells,
  expectedVersion,
};
