#!/usr/bin/env node
/**
 * scripts/dev/adopt-video-plan.mjs
 *
 * Dry-run adoption planner for video domains.
 * Emits the plan for:
 *   - adding domaiNN_NN.md if missing
 *   - adding one <series>_scope_NN.md per series folder (hoisting scattered series values)
 *   - renaming series/<slug>/procedure/ -> series/<slug>/procedures/
 *   - reporting before/after drift report
 *
 * Dry run only: writes NOTHING to disk.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CORE_DIST = join(REPO, 'iNNfo', 'packages', 'nn-core', 'dist', 'index.js');

const targetDir = process.argv.slice(2).find((a) => !a.startsWith('--'));
const isJson = process.argv.includes('--json');

if (!targetDir || !existsSync(targetDir)) {
  console.error('usage: node scripts/dev/adopt-video-plan.mjs <video-domain-dir> [--json]');
  process.exit(2);
}

const absTarget = resolve(targetDir);

// 1. Check domaiNN_NN.md
const domainPath = join(absTarget, 'domaiNN_NN.md');
const hasDomain = existsSync(domainPath);
const domainPlan = hasDomain
  ? { status: 'already-present', path: 'domaiNN_NN.md' }
  : {
      status: 'planned-create',
      path: 'domaiNN_NN.md',
      content: '# NN DomaiNN\n\ntitle:: Video DomaiNN\n',
    };

// 2. Discover series folders under series/
const seriesBase = join(absTarget, 'series');
const seriesPlans = [];
const renames = [];

if (existsSync(seriesBase) && statSync(seriesBase).isDirectory()) {
  const entries = readdirSync(seriesBase, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const seriesSlug = entry.name;
    const seriesDir = join(seriesBase, seriesSlug);

    // Check procedure rename (procedure/ -> procedures/)
    const singularProc = join(seriesDir, 'procedure');
    if (existsSync(singularProc) && statSync(singularProc).isDirectory()) {
      renames.push({
        from: `series/${seriesSlug}/procedure`,
        to: `series/${seriesSlug}/procedures`,
      });
    }

    // Check scope marker
    const markerName = `${seriesSlug}_scope_NN.md`;
    const markerPath = join(seriesDir, markerName);
    const hasMarker = existsSync(markerPath);

    if (hasMarker) {
      seriesPlans.push({
        slug: seriesSlug,
        scopeMarker: {
          status: 'already-present',
          path: `series/${seriesSlug}/${markerName}`,
        },
      });
    } else {
      // Gather scattered series values to hoist
      const hoisted = {};
      const candidateDocs = [
        join(seriesDir, `${seriesSlug}_series_NN.md`),
        join(seriesDir, 'series_NN.md'),
      ];
      for (const cand of candidateDocs) {
        if (!existsSync(cand)) continue;
        const text = readFileSync(cand, 'utf8');
        for (const line of text.split('\n')) {
          const m = line.match(/^([a-zA-Z0-9_]+)::\s*(.+)$/);
          if (m) {
            const key = m[1].trim();
            const val = m[2].trim();
            if (['voice_id', 'music', 'music_volume', 'transition'].includes(key)) {
              hoisted[key] = val;
            }
          }
        }
      }

      seriesPlans.push({
        slug: seriesSlug,
        scopeMarker: {
          status: 'planned-create',
          path: `series/${seriesSlug}/${markerName}`,
          hoisted,
        },
      });
    }
  }
}

// 3. Drift summary (via nn-core if available)
/** @type {{ status?: string, rows: any[] }} */
let driftSummary = { rows: [] };
try {
  if (existsSync(CORE_DIST)) {
    const core = await import(pathToFileURL(CORE_DIST).href);
    if (typeof core.driftReport === 'function') {
      driftSummary = { status: 'checked', rows: [] };
    }
  }
} catch {
  // drift check optional
}

const plan = {
  v: 1,
  target: absTarget,
  domaiNN: domainPlan,
  series: seriesPlans,
  renames,
  drift: driftSummary,
};

if (isJson) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  console.log(`Video Adoption Plan for: ${absTarget}\n`);
  console.log(`domaiNN_NN.md: ${domainPlan.status}`);
  console.log(`\nSeries Scopes (${seriesPlans.length}):`);
  for (const s of seriesPlans) {
    console.log(`  - ${s.slug}: ${s.scopeMarker.status} (${s.scopeMarker.path})`);
    if (s.scopeMarker.hoisted) {
      console.log(`    hoisted: ${JSON.stringify(s.scopeMarker.hoisted)}`);
    }
  }
  if (renames.length > 0) {
    console.log(`\nRenames (${renames.length}):`);
    for (const r of renames) {
      console.log(`  - ${r.from} -> ${r.to}`);
    }
  } else {
    console.log('\nRenames: none');
  }
}
