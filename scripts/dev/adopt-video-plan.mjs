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

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seriesValues } from './lib/series-values.mjs';

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
    const pluralProc = join(seriesDir, 'procedures');
    const hasSingular = existsSync(singularProc) && statSync(singularProc).isDirectory();
    const hasPlural = existsSync(pluralProc) && statSync(pluralProc).isDirectory();

    if (hasSingular) {
      if (hasPlural) {
        renames.push({
          from: `series/${seriesSlug}/procedure`,
          to: `series/${seriesSlug}/procedures`,
          status: 'conflict',
          reason: 'destination exists',
        });
      } else {
        renames.push({
          from: `series/${seriesSlug}/procedure`,
          to: `series/${seriesSlug}/procedures`,
          status: 'planned-rename',
        });
      }
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
      // Gather the scattered series values from the sources the series really uses
      // (scope marker, video.series.json, script_template.md, the `## NN Video`
      // blocks of the series document), not from a synthetic series_NN.md.
      const values = seriesValues(absTarget, seriesSlug);
      const hoisted = {};
      if (values.voice) hoisted.voice_id = values.voice;
      if (values.music) hoisted.music = values.music;
      if (values.volume !== null) hoisted.music_volume = String(values.volume);
      if (values.transition) hoisted.transition = values.transition;

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

// 3. Drift: a dry run cannot report drift, because the scopes do not exist yet.
// Say so instead of printing an empty "checked" report; the real report comes
// from `scripts/dev/scope-drift.mjs` once the plan is applied.
/** @type {{ status: string, rows: any[], reason: string }} */
const driftSummary = existsSync(CORE_DIST)
  ? {
      status: 'deferred',
      rows: [],
      reason: 'run scripts/dev/scope-drift.mjs after applying the plan',
    }
  : {
      status: 'unavailable',
      rows: [],
      reason: 'nn-core is not built (npm --workspace=@cognnitive/nn-core run build)',
    };

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
      if (r.status === 'conflict') {
        console.log(`  - ${r.from} -> ${r.to} [CONFLICT: ${r.reason}]`);
      } else {
        console.log(`  - ${r.from} -> ${r.to}`);
      }
    }
  } else {
    console.log('\nRenames: none');
  }
  console.log(`\nDrift: ${driftSummary.status} (${driftSummary.reason})`);
}
