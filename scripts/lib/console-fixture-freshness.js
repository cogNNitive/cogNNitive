'use strict';

/**
 * scripts/lib/console-fixture-freshness.js
 *
 * Freshness check for the committed console fixture: the exported console the test
 * suite, the UI smoke and every console review open (`test/fixtures/testlab/domaiNN_console.html`).
 *
 * `npm run regen` covers the other derived artifacts (bundle, payload mirror, catalogs)
 * but not an exported console, and the pre-commit hook only stages what
 * `scripts/pre-commit-regen.js` knows about, so this fixture drifts silently whenever the
 * bundle, the shell or the fixture domain moves. It was ~3.9 KB stale on `main` before
 * this check existed (backlog console-fixture-regeneration-gate).
 *
 * The check reproduces the artifact instead of remembering a digest: it copies the
 * fixture domain into a throwaway checkout, exports it there and compares the bytes with
 * the committed file. Only the two per-export wall-clock fields are normalized —
 * `meta.generated` (the export timestamp) and each model's `citationsResolvedAt`. Nothing
 * else may vary, which also pins `meta.domainId`: it is derived from the domain's
 * project-relative path (see `domainIdSourcePath` in `scripts/export-console.mjs`), so a
 * differently named checkout must reproduce it too.
 *
 * The throwaway copy mirrors a real checkout on purpose, because the export resolves some
 * model field values (already-rebased asset paths such as
 * `test/fixtures/testlab/sources/import/photo.png`) against the process working directory
 * as its last base: the copy is placed at `<tmp>/<n>/test/fixtures/<name>` with a `.git`
 * entry at `<tmp>/<n>`, and the export runs with `<tmp>/<n>` as its cwd. That makes the
 * copy the same domain at the same project-relative path as a second worktree of this
 * repository, which is the situation the check exists for.
 *
 * Usage: node scripts/lib/console-fixture-freshness.js --check
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/** The committed fixture domain, repo-relative. */
const FIXTURE_DOMAIN = 'test/fixtures/testlab';
/** The file `--domain` writes: the whole-domaiNN console at the domain root. */
const CONSOLE_FILE = 'domaiNN_console.html';
/** The exact command that rewrites the fixture; printed verbatim on failure. */
const REGEN_COMMAND = `node scripts/export-console.mjs ${FIXTURE_DOMAIN} --domain --no-open`;

/**
 * The two fields that move on every export: the export wall clock and the citation
 * resolution stamp. Nothing else in the artifact is allowed to vary.
 */
const STAMP_RE = /("(?:generated|citationsResolvedAt)":")[^"]*"/g;

/**
 * @param {string} html
 * @returns {string} the artifact with its two wall-clock fields masked
 */
function withoutStamps(html) {
  return html.replace(STAMP_RE, '$1<stamp>"');
}

/** A copy of `text` short enough to read inside a failure message. */
function excerpt(text) {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > 160 ? `${oneLine.slice(0, 160)}…` : oneLine;
}

/**
 * The first place two artifacts disagree, or null when they agree line for line.
 * @param {string} committed
 * @param {string} fresh
 * @returns {{ line: number, committed: string, fresh: string } | null}
 */
function firstDifference(committed, fresh) {
  const a = committed.split('\n');
  const b = fresh.split('\n');
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i++) {
    if (a[i] !== b[i]) return { line: i + 1, committed: a[i], fresh: b[i] };
  }
  if (a.length !== b.length) {
    const i = shared;
    return { line: i + 1, committed: a[i] ?? '(end of file)', fresh: b[i] ?? '(end of file)' };
  }
  return null;
}

/**
 * Copies the fixture domain into a throwaway checkout laid out like a real one, so the
 * export the check compares against is produced under the same project-relative path.
 * @param {string} fixtureDir - absolute fixture domain
 * @param {string} scratchRoot - empty directory to build the checkout in
 * @returns {{ domain: string, cwd: string }}
 */
function seedCheckout(fixtureDir, scratchRoot) {
  const cwd = path.join(scratchRoot, 'checkout');
  // `.git` is what makes the copy a project root: without it the export would fall back
  // to the last-resort identity a folder outside any project gets.
  fs.mkdirSync(path.join(cwd, '.git'), { recursive: true });
  const domain = path.join(cwd, FIXTURE_DOMAIN.split('/').slice(0, -1).join(path.sep), path.basename(fixtureDir));
  fs.mkdirSync(path.dirname(domain), { recursive: true });
  fs.cpSync(fixtureDir, domain, {
    recursive: true,
    // A build output of a previous run: the export writes it and never reads it as content.
    filter: (src) => path.basename(src) !== CONSOLE_FILE,
  });
  return { domain, cwd };
}

/**
 * Compares the committed fixture console with a fresh export of the same domain.
 *
 * @param {{
 *   repoRoot?: string,
 *   fixtureDomain?: string,
 *   consoleFile?: string,
 *   exportFile?: string,
 *   spawnExport?: (domain: string, cwd: string) => void,
 * }} [options] - every seam is injectable for tests; production uses the repo defaults.
 * @returns {{ ok: boolean, message: string }}
 */
function checkConsoleFixtureFreshness(options = {}) {
  const repoRoot = options.repoRoot || path.join(__dirname, '..', '..');
  const fixtureDir = options.fixtureDomain || path.join(repoRoot, FIXTURE_DOMAIN.split('/').join(path.sep));
  const consoleFile = options.consoleFile || CONSOLE_FILE;
  const exporter = options.exportFile || path.join(repoRoot, 'scripts', 'export-console.mjs');
  const committedFile = path.join(fixtureDir, consoleFile);

  if (!fs.existsSync(committedFile)) {
    return {
      ok: false,
      message: `FAIL: ${path.join(FIXTURE_DOMAIN, consoleFile)} is missing. Regenerate it with:\n    ${REGEN_COMMAND}`,
    };
  }

  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-console-fixture-'));
  try {
    const { domain, cwd } = seedCheckout(fixtureDir, scratchRoot);
    const runExport =
      options.spawnExport ||
      ((target, workingDir) => {
        execFileSync(process.execPath, [exporter, target, '--domain', '--no-open'], {
          cwd: workingDir,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, NN_OFFLINE: '1', INNFO_CONSOLE_NO_OPEN: '1' },
        });
      });

    try {
      runExport(domain, cwd);
    } catch (err) {
      return {
        ok: false,
        message:
          `FAIL: a fresh export of ${FIXTURE_DOMAIN} failed, so the committed console cannot be ` +
          `compared. Re-run it by hand with:\n    ${REGEN_COMMAND}\n` +
          `${(err.stdout || '') + (err.stderr || err.message || '')}`,
      };
    }

    const freshFile = path.join(domain, consoleFile);
    if (!fs.existsSync(freshFile)) {
      return {
        ok: false,
        message: `FAIL: the export wrote no ${consoleFile} for ${FIXTURE_DOMAIN}. Re-run it by hand with:\n    ${REGEN_COMMAND}`,
      };
    }

    const committed = withoutStamps(fs.readFileSync(committedFile, 'utf-8'));
    const fresh = withoutStamps(fs.readFileSync(freshFile, 'utf-8'));
    if (committed === fresh) {
      return {
        ok: true,
        message: `console fixture is fresh: ${path.join(FIXTURE_DOMAIN, consoleFile)} reproduces a fresh export apart from the two export stamps.`,
      };
    }

    const where = firstDifference(committed, fresh);
    const lines = [
      `FAIL: ${path.join(FIXTURE_DOMAIN, consoleFile)} is stale: it does not match a fresh export of the same domain.`,
    ];
    if (where) {
      lines.push(`  first difference at line ${where.line}:`);
      lines.push(`    committed: ${excerpt(where.committed)}`);
      lines.push(`    fresh    : ${excerpt(where.fresh)}`);
    } else {
      lines.push('  the files differ in bytes but not line by line (line ending drift).');
    }
    lines.push('  Regenerate it with:');
    lines.push(`    ${REGEN_COMMAND}`);
    lines.push('  and commit the regenerated file with the change that moved it.');
    return { ok: false, message: lines.join('\n') };
  } finally {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }
}

module.exports = { checkConsoleFixtureFreshness, FIXTURE_DOMAIN, CONSOLE_FILE, REGEN_COMMAND };

if (require.main === module) {
  const { ok, message } = checkConsoleFixtureFreshness();
  process.stdout.write(`${message}\n`);
  process.exit(ok ? 0 : 1);
}
