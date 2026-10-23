#!/usr/bin/env node

/**
 * scripts/audit-skill-docs.mjs
 *
 * On-demand audit that every option an end-user skill presents has a matching
 * page in the published documentation, and that every documentation link a
 * skill declares resolves to a real page.
 *
 * This is deliberately NOT a CI gate. It is a developer tool: run it when you
 * add, rename, or remove a menu option in a skill, or when you add/rename a
 * documentation page, to see the skill ↔ docs coverage at a glance.
 *
 * Convention (option B — explicit marker, no central manifest):
 *   A skill declares its menu options in a `docs-options` HTML comment beside
 *   the menu:
 *
 *     <!-- docs-options: sources=content/how-to/import-sources, model=content/tutorials/domain-from-scratch, procedures, cancel -->
 *
 *   - `<id>=<route>`  the option has a documentation page (route is a Page
 *                     route from docs/documentation/documentation_NN.md).
 *   - `<id>`          the option has no documentation page yet (a coverage gap).
 *
 * Usage:
 *   node scripts/audit-skill-docs.mjs [--root <dir>] [--strict] [--json]
 *
 *     (no flags)   report coverage; exit 1 only on a BROKEN link.
 *     --strict     also exit 1 when any option has no documentation page.
 *     --json       machine-readable output.
 *     --root <d>   resolve `skills/` and `docs/` relative to <d> (tests).
 *
 * Exit codes:
 *   0  no broken links (and, with --strict, no coverage gaps).
 *   1  a declared route does not resolve to a documentation Page (or a
 *      coverage gap under --strict).
 *   2  input failure (skills dir or documentation model missing).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseNNModel } from './generate-docsify-suite.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const DOCS_MODEL_RELATIVE_PATH = path.join('docs', 'documentation', 'documentation_NN.md');
const SKILLS_DIR = 'skills';
const OPTIONS_MARKER_RE = /<!--\s*docs-options:\s*([^>]*?)\s*-->/g;

/**
 * Normalizes a documentation route to the form used by the model (`source`
 * without the `.md` extension, posix separators, no leading `#/`).
 * @param {string} route
 * @returns {string}
 */
export function normalizeRoute(route) {
  return route
    .trim()
    .replace(/^#?\//, '')
    .replace(/\.md$/i, '')
    .replace(/\\/g, '/');
}

/**
 * Parses the body of a `docs-options` marker into option entries.
 * @param {string} body
 * @returns {Array<{ id: string, route: string | null }>}
 */
export function parseOptionsMarker(body) {
  return body
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const eq = entry.indexOf('=');
      if (eq === -1) return { id: entry.trim(), route: null };
      return { id: entry.slice(0, eq).trim(), route: entry.slice(eq + 1).trim() || null };
    });
}

/**
 * Collects every `docs-options` marker body found in a skill document.
 * @param {string} content
 * @returns {string[]}
 */
export function extractOptionMarkers(content) {
  const bodies = [];
  for (const match of content.matchAll(OPTIONS_MARKER_RE)) bodies.push(match[1]);
  return bodies;
}

/**
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {boolean} [options.strict]
 * @returns {{ ok: boolean, exitCode: number, report: Array<object>, pages: string[] }}
 */
export function auditSkillDocs(options = {}) {
  const root = options.root ? path.resolve(options.root) : REPO_ROOT;
  const strict = Boolean(options.strict);

  const modelPath = path.join(root, DOCS_MODEL_RELATIVE_PATH);
  if (!fs.existsSync(modelPath)) {
    throw new Error(`documentation model not found at ${modelPath}`);
  }
  const pages = new Set(
    parseNNModel(fs.readFileSync(modelPath, 'utf-8')).pages.map((page) =>
      normalizeRoute(page.fields.route || page.fields.source || page.id),
    ),
  );

  const skillsDir = path.join(root, SKILLS_DIR);
  if (!fs.existsSync(skillsDir)) {
    throw new Error(`skills directory not found at ${skillsDir}`);
  }

  const report = [];
  let brokenLinks = 0;
  let coverageGaps = 0;

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    const markers = extractOptionMarkers(fs.readFileSync(skillFile, 'utf-8'));
    const options = markers.flatMap(parseOptionsMarker);
    const rows = options.map((option) => {
      if (!option.route) {
        coverageGaps += 1;
        return { id: option.id, route: null, status: 'no-docs' };
      }
      const normalized = normalizeRoute(option.route);
      if (!pages.has(normalized)) {
        brokenLinks += 1;
        return { id: option.id, route: option.route, status: 'broken' };
      }
      return { id: option.id, route: option.route, status: 'ok' };
    });

    report.push({ skill: entry.name, markers: markers.length, options: rows });
  }

  const ok = brokenLinks === 0 && (!strict || coverageGaps === 0);
  return { ok, exitCode: ok ? 0 : 1, report, pages: [...pages] };
}

function printReport(result) {
  console.log('🔎 [Skill ↔ Docs coverage audit]\n');
  let covered = 0;
  let total = 0;
  for (const skill of result.report) {
    if (skill.options.length === 0) {
      console.log(`  ${skill.skill}: no docs-options marker (nothing declared)`);
      continue;
    }
    const okCount = skill.options.filter((o) => o.status === 'ok').length;
    covered += okCount;
    total += skill.options.length;
    console.log(`  ${skill.skill}: ${okCount}/${skill.options.length} options documented`);
    for (const option of skill.options) {
      if (option.status === 'broken') {
        console.log(`      ✖ ${option.id} → ${option.route} (no such documentation page)`);
      } else if (option.status === 'no-docs') {
        console.log(`      · ${option.id} (no documentation page yet)`);
      }
    }
  }
  console.log(`\n  Total: ${covered}/${total} options documented.`);
  console.log(
    result.exitCode === 0
      ? '  ✅ No broken documentation links.'
      : '  ❌ Broken documentation links found (or strict coverage gap).',
  );
}

function main() {
  const argv = process.argv.slice(2);
  const strict = argv.includes('--strict');
  const json = argv.includes('--json');
  let root = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = argv[++i] ?? null;
    else if (argv[i].startsWith('--root=')) root = argv[i].slice('--root='.length);
  }

  let result;
  try {
    result = auditSkillDocs({ root, strict });
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(2);
  }

  if (json) console.log(JSON.stringify(result, null, 2));
  else printReport(result);
  process.exit(result.exitCode);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
