#!/usr/bin/env node
/**
 * nn-video-script/scripts/build-draft-html.mjs
 *
 * Generates the self-contained interactive Review Console HTML artifact from a draft JSON artifact:
 * the JSON is embedded inline and every media thumbnail is inlined as a base64 data
 * URI, so the HTML is a single portable file (no assets folder) that works from file://.
 *
 * Series-parameterized through the parameter cascade: the display series title
 * comes from the scope document found by walking the scope chain from the draft JSON's
 * folder (or an explicit `--series <dir>`); the template ships neutral
 * (`{{SERIES}}`).
 *
 * Usage:
 *   node build-draft-html.mjs <slug>_draft_V_x-y-z.json [--out <file.html>]
 *     [--series <dir>] [--series-title <name>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSeriesFor } from './build-script-from-draft.mjs';
import { findBlueprintPackage } from './lib/video-scope.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The owning blueprint's `blueprint_version`, read from the package's `spec_NN.md`.
 * The review console emits it as the exported document's `parent_spec`, so the
 * template never carries a literal version that goes stale on every bump.
 */
export function blueprintVersion() {
  try {
    const pkg = findBlueprintPackage();
    const text = fs.readFileSync(path.join(pkg, 'spec_NN.md'), 'utf8');
    const m = /^blueprint_version:\s*"?([^"\r\n]+)"?\s*$/m.exec(text);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

function argValue(argv, name) {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/**
 * The three standardized quality tiers every animated scene offers, in display order.
 * Each carries the default Motion Graphic Storyboard used when the draft does not
 * author one: camera movements, choreography and GSAP timeline parameters.
 */
const TIER_DEFAULTS = [
  {
    tier: 'ALTA',
    suffix: 'alta',
    motion_type: 'Multi-layer 3D / parallax / kinetic type',
    storyboard: {
      camera: ['Slow 3D dolly-in with a slight orbit', 'Parallax drift across 3+ depth layers'],
      choreography: ['Kinetic type enters layer by layer with depth easing', 'Key graphic folds in with a multi-stage transition', 'Floating accent elements settle last'],
      timeline: { duration_s: 6, ease: 'expo.out', fps: 30 },
    },
  },
  {
    tier: 'MEDIA',
    suffix: 'media',
    motion_type: 'Guided Ken Burns / smooth pan / zoom',
    storyboard: {
      camera: ['Continuous smooth pan', 'Guided zoom-in toward the key element'],
      choreography: ['Hold the frame, then drift toward the key graphic or text', 'Single soft fade for the entrance'],
      timeline: { duration_s: 4, ease: 'power2.inOut', fps: 30 },
    },
  },
  {
    tier: 'RÁPIDA',
    suffix: 'rapida',
    motion_type: 'Subtle snap zoom + vignette',
    storyboard: {
      camera: ['Snap zoom 1.0 to 1.05'],
      choreography: ['Static composition with a vignette', 'No secondary motion'],
      timeline: { duration_s: 2, ease: 'power4.out', fps: 30 },
    },
  },
];

const stripAccents = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

function tierKey(tier) {
  const k = /^(ALTA|MEDIA|RAPIDA)(?![A-Z])/.exec(stripAccents(String(tier ?? '').trim()))?.[1];
  return TIER_DEFAULTS.find((t) => stripAccents(t.tier) === k)?.tier ?? null;
}

const asList = (v, fallback) => (Array.isArray(v) ? v.map(String) : v == null ? fallback : [String(v)]);

function specsFor(tier, sb) {
  const t = sb.timeline;
  return `${tier} · 1920x1920 · ${t.fps} FPS · GSAP ${t.ease} · ${t.duration_s}s`;
}

/**
 * Guarantees that every animated scene (one with at least one `animations` entry)
 * offers exactly the 3 tiers ALTA, MEDIA and RÁPIDA, each with a structured
 * storyboard. Authored options win: they keep their id, label, prompt and
 * storyboard (an untiered one is taken as MEDIA when that slot is free); missing
 * tiers are derived from the first authored option. Procedural options never
 * carry a raster `thumb`. Pure and idempotent: the input is not mutated.
 */
export function normalizeAnimationTiers(draft) {
  return {
    ...draft,
    scenes: (draft?.scenes || []).map((sc) => {
      const authored = Array.isArray(sc.animations) ? sc.animations.filter((a) => a && typeof a === 'object') : [];
      if (authored.length === 0) return sc;
      const slots = new Map();
      const untiered = [];
      const dropped = [];
      for (const an of authored) {
        const key = tierKey(an.tier);
        if (key && !slots.has(key)) slots.set(key, an);
        else if (!key) untiered.push(an);
        else dropped.push(an);
      }
      if (untiered.length > 0 && !slots.has('MEDIA')) slots.set('MEDIA', untiered.shift());
      dropped.push(...untiered);
      for (const an of dropped) {
        console.warn(`animation option discarded (scene ${sc.slug || sc.id || '?'}): ${an.id || an.label || '(unnamed)'}; only one option per tier is kept`);
      }
      const seed = authored[0];
      const baseId = seed.id || `${sc.slug || sc.id || 'scene'}-motion`;
      const animations = TIER_DEFAULTS.map((def) => {
        const src = slots.get(def.tier);
        const authoredSb = src?.storyboard && typeof src.storyboard === 'object' ? src.storyboard : null;
        const sb = structuredClone(def.storyboard);
        if (authoredSb) {
          Object.assign(sb, authoredSb, {
            camera: asList(authoredSb.camera, sb.camera),
            choreography: asList(authoredSb.choreography, sb.choreography),
            timeline: { ...sb.timeline, ...(authoredSb.timeline && typeof authoredSb.timeline === 'object' ? authoredSb.timeline : {}) },
          });
        }
        const { thumb: _drop, ...rest } = src || {};
        return {
          ...rest,
          id: src?.id || `${baseId}-${def.suffix}`,
          label: src?.label || `${seed.label || 'HyperFrames Motion'} · ${def.tier}`,
          prompt: src?.prompt ?? seed.prompt ?? seed.description ?? '',
          tier: def.tier,
          motion_type: src?.motion_type || def.motion_type,
          storyboard: sb,
          specs: src?.specs || specsFor(def.tier, sb),
        };
      });
      return { ...sc, animations };
    }),
  };
}

export function buildDraftHtml(rawDraft, { baseDir, templatePath, seriesTitle = 'Series', title, description, reviewed } = {}) {
  const draft = normalizeAnimationTiers(rawDraft);
  const mimeFor = (p) => {
    const e = path.extname(p).toLowerCase();
    if (e === '.png') return 'image/png';
    if (e === '.webp') return 'image/webp';
    return 'image/jpeg';
  };
  const thumbs = {};
  for (const m of draft.media || []) {
    if (!m.thumb) continue;
    const tp = path.resolve(baseDir, m.thumb);
    try {
      thumbs[m.id] = 'data:' + mimeFor(tp) + ';base64,' + fs.readFileSync(tp).toString('base64');
    } catch {
      console.warn('thumb not found (skipped): ' + tp);
    }
  }

  // Probe draft_thumbs/ directory if present
  if (baseDir) {
    const draftThumbsDir = path.join(baseDir, 'draft_thumbs');
    if (fs.existsSync(draftThumbsDir) && fs.statSync(draftThumbsDir).isDirectory()) {
      try {
        const files = fs.readdirSync(draftThumbsDir);
        for (const f of files) {
          const full = path.join(draftThumbsDir, f);
          try {
            if (fs.statSync(full).isFile()) {
              thumbs[f] = 'data:' + mimeFor(full) + ';base64,' + fs.readFileSync(full).toString('base64');
            }
          } catch {}
        }
      } catch {}
    }
  }

  const effectiveTitle = title || draft.title || draft.slug || 'Video Script Review';
  const effectiveDescription = description || draft.description || 'Self-contained review artifact (HTML Quine). You can adjust editorial choices and cascade parameters, then click <b>Save & Package HTML</b> to save all decisions directly inside this same file to send it back via email.';
  const reviewedJson = reviewed ? JSON.stringify(reviewed, null, 2) : '';

  const tpl = fs.readFileSync(templatePath, 'utf8');
  return tpl
    .replace(/\{\{SERIES\}\}/g, seriesTitle)
    .replace(/\{\{TITLE\}\}/g, effectiveTitle)
    .replace(/\{\{DESCRIPTION\}\}/g, effectiveDescription)
    .replace(/\{\{BLUEPRINT_VERSION\}\}/g, blueprintVersion())
    .replace('/*__DRAFT_JSON__*/', JSON.stringify(draft))
    .replace('/*__THUMBS_JSON__*/', JSON.stringify(thumbs))
    .replace('/*__REVIEWED_JSON__*/', reviewedJson);
}

function main() {
  const argv = process.argv.slice(2);
  if (!argv[0] || argv[0] === '--help') {
    console.error('usage: node build-draft-html.mjs <draft.json> [--out <file.html>] [--series <dir>] [--series-title <name>]');
    process.exit(1);
  }
  const jsonPath = path.resolve(argv[0]);
  if (!fs.existsSync(jsonPath)) {
    console.error('draft JSON not found: ' + jsonPath);
    process.exit(1);
  }
  const draft = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const baseDir = path.dirname(jsonPath);
  const slug = draft.slug || path.basename(jsonPath).replace(/_draft.*\.json$/, '').replace(/\.json$/, '');
  const version = draft.version || 'v1';

  const reviewedPath = path.join(baseDir, `${slug}_reviewed.json`);
  let reviewed = null;
  if (fs.existsSync(reviewedPath)) {
    try {
      reviewed = JSON.parse(fs.readFileSync(reviewedPath, 'utf8'));
    } catch {}
  }

  const out = argValue(argv, 'out');
  const reviewConsolePath = out ? path.resolve(out) : path.join(baseDir, `${slug}_review_console.html`);
  const legacyDraftPath = path.join(baseDir, `${slug}_draft_${version}.html`);

  const series = loadSeriesFor(baseDir, argValue(argv, 'series'));
  const seriesTitle = argValue(argv, 'series-title') || (series && series.title) || (draft.series || 'Series');

  const html = buildDraftHtml(draft, {
    baseDir,
    templatePath: path.join(__dirname, 'draft-template.html'),
    seriesTitle,
    reviewed,
  });

  fs.writeFileSync(reviewConsolePath, html, 'utf8');
  if (!out) {
    fs.writeFileSync(legacyDraftPath, html, 'utf8');
  }

  const embedded = (html.match(/data:[^"]+;base64,/g) || []).length;
  console.log('Review console HTML written: ' + reviewConsolePath + ' (' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB, ' + embedded + ' thumbnails embedded)');
  if (!out) {
    console.log('Legacy draft alias written: ' + legacyDraftPath);
  }
}

const isMain =
  process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
if (isMain) main();
