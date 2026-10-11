#!/usr/bin/env node

/**
 * scripts/check-procedures-version.mjs
 *
 * Couples `procedures` blueprint version bumps to the procedure execution files.
 * Every `*_NN.md` living under a blueprint's `procedures/` directory pins the
 * `procedures` blueprint in its `parent_spec.name`. When the shipped `procedures`
 * blueprint bumps its `blueprint_version`, every procedure pin MUST match it.
 * A procedure that lags (or leads) the current blueprint version is drift.
 *
 * Procedure files are auto-discovered by walking the shipped blueprints tree,
 * so no hand-maintained mapping can rot. The guard FAILS; it never rewrites.
 *
 * Authoritative version source: the SHIPPED spec
 * `iNNfo/specs/bluepriNNts/procedures/spec_NN.md`. NOT the global user cache
 * (`~/.agents/bluepriNNts/`), which diverges and is unavailable to an offline,
 * deterministic verify.js.
 *
 * Usage:
 *   node scripts/check-procedures-version.mjs          # check (default); exit 1 on failure
 *   node scripts/check-procedures-version.mjs --json   # machine-readable failures
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isNNName } = require('../skills/nn-preflight/scripts/lib/naming-contract.generated.cjs');

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const BLUEPRINTS_ROOT = path.join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts');
const PARENT_BLUEPRINT = 'procedures';
const VERSION_RE = /V_\d+-\d+-\d+/;

function readFrontmatter(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return fmMatch ? fmMatch[1] : null;
}

function parseVersionParts(version) {
  const m = String(version).match(/V_(\d+)-(\d+)-(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareVersions(a, b) {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

/** The shipped `procedures` blueprint's current `blueprint_version`. */
export function currentProceduresVersion(blueprintsRoot = BLUEPRINTS_ROOT) {
  const fm = readFrontmatter(path.join(blueprintsRoot, PARENT_BLUEPRINT, 'spec_NN.md'));
  if (fm === null) return null;
  const m = fm.match(/^blueprint_version\s*:\s*['"]?(V_\d+-\d+-\d+)['"]?\s*$/m);
  return m ? m[1] : null;
}

/** A procedure's pinned `procedures`-family version, from `parent_spec.name`. */
function pinnedVersion(filePath) {
  const fm = readFrontmatter(filePath);
  if (fm === null) return { pin: null, malformed: true, reason: 'no frontmatter' };
  const psn = fm.match(/^parent_spec:\s*\n\s+name:\s*['"]?([^\s'"]+)['"]?\s*$/m);
  if (!psn) return { pin: null, malformed: true, reason: 'no parent_spec.name' };
  const found = psn[1].match(VERSION_RE);
  if (found) return { pin: found[0], malformed: false };
  return { pin: null, malformed: true, reason: `parent_spec.name="${psn[1]}" has no version` };
}

/** Every `*_NN.md` file that sits directly under a `procedures/` directory. */
export function discoverProcedureFiles(blueprintsRoot = BLUEPRINTS_ROOT) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        entry.isFile() &&
        isNNName(entry.name) &&
        entry.name !== 'spec_NN.md' &&
        path.basename(dir) === 'procedures'
      ) {
        out.push(full);
      }
    }
  };
  walk(blueprintsRoot);
  return out.sort();
}

/**
 * @returns {{ ok: boolean, failures: Array<{target:string, pin:string|null, current:string|null, reason:string}> }}
 */
export function checkProceduresVersion({ blueprintsRoot = BLUEPRINTS_ROOT } = {}) {
  const failures = [];
  const current = currentProceduresVersion(blueprintsRoot);
  if (!current) {
    return {
      ok: false,
      failures: [{ target: `${PARENT_BLUEPRINT}/spec_NN.md`, pin: null, current: null, reason: 'MISSING_BLUEPRINT_SPEC' }],
    };
  }

  for (const file of discoverProcedureFiles(blueprintsRoot)) {
    const target = path.relative(blueprintsRoot, file).split(path.sep).join('/');
    const { pin, malformed, reason } = pinnedVersion(file);
    if (malformed) {
      failures.push({ target, pin: null, current, reason: `MALFORMED_PIN: ${reason}` });
      continue;
    }
    const cmp = compareVersions(pin, current);
    if (cmp === null) {
      failures.push({ target, pin, current, reason: 'UNPARSEABLE_VERSION' });
    } else if (cmp < 0) {
      failures.push({ target, pin, current, reason: 'STALE_PIN' });
    } else if (cmp > 0) {
      failures.push({ target, pin, current, reason: 'AHEAD_PIN' });
    }
  }

  return { ok: failures.length === 0, failures };
}

// ── CLI ────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const asJson = process.argv.includes('--json');
  const { ok, failures } = checkProceduresVersion();

  if (asJson) {
    console.log(JSON.stringify({ ok, failures }, null, 2));
  } else if (ok) {
    console.log('✅ Every procedure tracks the current shipped `procedures` blueprint version.');
  } else {
    console.error('❌ Procedure version drift detected:');
    for (const f of failures) {
      console.error(`  - ${f.target} [${f.reason}] pin=${f.pin ?? '—'} current=${f.current ?? '—'}`);
    }
    console.error('\nA `procedures` blueprint bump requires updating every procedure\'s');
    console.error('`parent_spec.name` to the new version. The guard will not auto-fix:');
    console.error('a bump can change the procedure schema, not just the number.');
  }

  process.exit(ok ? 0 : 1);
}
