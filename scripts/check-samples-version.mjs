#!/usr/bin/env node

/**
 * scripts/check-samples-version.mjs
 *
 * Couples blueprint version bumps to sample refreshes. For every entry in
 * SAMPLE_MAPPINGS, compares the sample's pinned blueprint version against the
 * shipped blueprint spec's `blueprint_version`. A sample that lags the current
 * version is a failure; every blueprint MUST have at least one sample tracking
 * its current version. Historical samples are allowed alongside a current one.
 *
 * The guard FAILS; it never rewrites a sample. A blueprint bump changes the
 * sample's schema and content, not only its version number.
 *
 * Authoritative version source: the SHIPPED spec
 * `iNNfo/specs/bluepriNNts/<bp>/spec_NN.md`. NOT the global user cache
 * (`~/.agents/bluepriNNts/`), which diverges and is unavailable to an offline,
 * deterministic verify.js.
 *
 * Usage:
 *   node scripts/check-samples-version.mjs          # check (default); exit 1 on failure
 *   node scripts/check-samples-version.mjs --json   # machine-readable failures
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFrontmatter, compareVersions } from './lib/blueprint-version.mjs';
import { SAMPLE_MAPPINGS } from './sync-samples.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const BLUEPRINTS_ROOT = path.join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts');

const VERSION_RE = /V_\d+-\d+-\d+/;

/**
 * The sample's pinned blueprint version, from `parent_spec.name` (or a
 * top-level `knowledge_version` fallback).
 */
function samplePinnedVersion(filePath) {
  const fm = readFrontmatter(filePath);
  if (fm === null) return { pin: null, malformed: true, reason: 'no frontmatter' };

  const psn = fm.match(/^parent_spec:\s*\n\s+name:\s*['"]?([^\s'"]+)['"]?\s*$/m);
  if (psn) {
    const found = psn[1].match(VERSION_RE);
    if (found) return { pin: found[0], malformed: false };
    return { pin: null, malformed: true, reason: `parent_spec.name="${psn[1]}" has no version` };
  }

  const kv = fm.match(/^knowledge_version\s*:\s*['"]?(V_\d+-\d+-\d+)['"]?\s*$/m);
  if (kv) return { pin: kv[1], malformed: false };

  return { pin: null, malformed: true, reason: 'no parent_spec.name or knowledge_version' };
}

/**
 * @returns {{ ok: boolean, failures: Array<{target:string, pin:string|null, current:string|null, reason:string}> }}
 */
export function checkSamplesVersion({ mappings = SAMPLE_MAPPINGS, blueprintsRoot = BLUEPRINTS_ROOT } = {}) {
  const failures = [];

  for (const mapping of mappings) {
    const target = mapping.target;
    const blueprint = target.split(/[\\/]/)[0];
    const samplePath = path.join(blueprintsRoot, target);

    const current = (() => {
      const specPath = path.join(blueprintsRoot, blueprint, 'spec_NN.md');
      const fm = readFrontmatter(specPath);
      if (fm === null) return null;
      const m = fm.match(/^blueprint_version\s*:\s*['"]?(V_\d+-\d+-\d+)['"]?\s*$/m);
      return m ? m[1] : null;
    })();

    if (!current) {
      failures.push({ target, pin: null, current: null, reason: 'MISSING_BLUEPRINT_SPEC' });
      continue;
    }

    const { pin, malformed, reason } = samplePinnedVersion(samplePath);
    if (malformed) {
      failures.push({ target, pin: null, current, reason: `MALFORMED_PIN: ${reason}` });
      continue;
    }

    const cmp = compareVersions(pin, current);
    if (cmp !== null && cmp < 0) {
      // Historical sample. Only a failure if no sibling sample reaches current.
      const hasCurrentSibling = mappings
        .filter((m) => m.target.split(/[\\/]/)[0] === blueprint)
        .some((m) => {
          const p = samplePinnedVersion(path.join(blueprintsRoot, m.target));
          return !p.malformed && p.pin === current;
        });
      if (!hasCurrentSibling) {
        failures.push({ target, pin, current, reason: 'NO_CURRENT_SAMPLE' });
      }
      continue;
    }
    // cmp === 0 (coherent) or cmp > 0 (ahead — accept; not this guard's concern).
  }

  return { ok: failures.length === 0, failures };
}

// ── CLI ────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const asJson = process.argv.includes('--json');
  const { ok, failures } = checkSamplesVersion();

  if (asJson) {
    console.log(JSON.stringify({ ok, failures }, null, 2));
  } else if (ok) {
    console.log('✅ All template samples track a current shipped blueprint version.');
  } else {
    console.error('❌ Samples version drift detected:');
    for (const f of failures) {
      console.error(`  - ${f.target} [${f.reason}] pin=${f.pin ?? '—'} current=${f.current ?? '—'}`);
    }
    console.error('\nA blueprint bump requires refreshing its sample(s) at both sites:');
    console.error('  test/_samples_nn/kNNowledge/  and  iNNfo/specs/bluepriNNts/<bp>/samples/');
    console.error('The guard will not auto-fix: a bump changes the sample schema/content, not just the number.');
  }

  process.exit(ok ? 0 : 1);
}
