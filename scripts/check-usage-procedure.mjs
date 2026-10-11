#!/usr/bin/env node

/**
 * scripts/check-usage-procedure.mjs
 *
 * Enforces the Usage Procedure convention: any blueprint that ships procedures
 * (any `*_NN.md` under its `procedures/` tree) MUST also ship
 * `procedures/usage_procedures_NN.md` — the blueprint's "how to use this"
 * procedure, consumed by both humans (rendered as a stepper in the console) and
 * AI agents (an executable Work sequence).
 *
 * The convention is by file name, not by frontmatter, so it never collides with
 * the template-immutability guard (which exempts everything under `procedures/`).
 * Structural / leaf blueprints with no `procedures/` tree are exempt.
 *
 * The guard FAILS; it never authors a procedure (content is per-domain).
 *
 * Usage:
 *   node scripts/check-usage-procedure.mjs          # check (default); exit 1 on failure
 *   node scripts/check-usage-procedure.mjs --json   # machine-readable failures
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const namingContract = /** @type {{ isNNName: (name: string) => boolean }} */ (
  require('../skills/nn-preflight/scripts/lib/naming-contract.generated.cjs')
);
const { isNNName } = namingContract;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const BLUEPRINTS_ROOT = path.join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts');
const USAGE_FILE = 'usage_procedures_NN.md';

function readFrontmatter(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

/** Blueprint directories: those holding a `spec_NN.md`. */
function blueprintDirs(blueprintsRoot) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(blueprintsRoot, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(blueprintsRoot, e.name);
    if (fs.existsSync(path.join(dir, 'spec_NN.md'))) out.push({ name: e.name, dir });
  }
  return out;
}

/** Every `*_NN.md` under `<bp>/procedures/`, recursively. */
export function procedureFiles(bpDir) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && isNNName(e.name)) out.push(full);
    }
  };
  walk(path.join(bpDir, 'procedures'));
  return out.sort();
}

/**
 * @returns {{ ok: boolean, failures: Array<{target:string, reason:string, detail:string}> }}
 */
export function checkUsageProcedure({ blueprintsRoot = BLUEPRINTS_ROOT } = {}) {
  const failures = [];

  for (const { name, dir } of blueprintDirs(blueprintsRoot)) {
    if (procedureFiles(dir).length === 0) continue; // no procedures → exempt

    const usagePath = path.join(dir, 'procedures', USAGE_FILE);
    const usageFm = readFrontmatter(usagePath);
    if (usageFm === null) {
      failures.push({
        target: `${name}/procedures/`,
        reason: 'MISSING_USAGE_PROCEDURE',
        detail: `no ${USAGE_FILE}`,
      });
      continue;
    }

    const parent = usageFm.match(/^parent_spec:\s*\n\s+name:\s*['"]?([^\s'"]+)['"]?\s*$/m);
    if (!parent || !/^procedures(?:[_-]|$)/.test(parent[1])) {
      failures.push({
        target: `${name}/procedures/${USAGE_FILE}`,
        reason: 'USAGE_WRONG_PARENT',
        detail: `parent_spec.name="${parent ? parent[1] : '(none)'}" is not the procedures family`,
      });
    }
  }

  return { ok: failures.length === 0, failures };
}

// ── CLI ────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const asJson = process.argv.includes('--json');
  const { ok, failures } = checkUsageProcedure();

  if (asJson) {
    console.log(JSON.stringify({ ok, failures }, null, 2));
  } else if (ok) {
    console.log('✅ Every procedure-bearing blueprint ships a usage procedure.');
  } else {
    console.error('❌ Usage procedure convention violations:');
    for (const f of failures) console.error(`  - ${f.target} [${f.reason}] ${f.detail}`);
    console.error(`\nEvery blueprint with procedures under procedures/ must ship procedures/${USAGE_FILE}`);
  }

  process.exit(ok ? 0 : 1);
}
