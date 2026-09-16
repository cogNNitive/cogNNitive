#!/usr/bin/env node

/**
 * scripts/sync-template-versions.mjs
 *
 * Synchronizes and validates each shipped template's `template_version` from
 * the Single Source of Truth (`iNNfo/specs/templates/<slug>/spec_NN.md`
 * frontmatter, plus the root `iNNfo/specs/templates/workspace_spec_NN.md`)
 * into the two hand-copied locations that have historically drifted:
 *
 *   - `iNNfo/apps/innfo-editor/src/config/samples.ts` → `SHIPPED_TEMPLATE_VERSIONS`
 *   - `manifest/source.yaml` → each template's `version:` field
 *
 * `SHIPPED_TEMPLATE_VERSIONS` deliberately omits `workspace`: that map is
 * keyed by the `{slug}/` subdirectories under `iNNfo/specs/templates/`, and
 * the root `workspace_spec_NN.md` lives one level up from those
 * subdirectories, so it has no `{slug}/` entry to key against. This is the
 * one place that reason is recorded — the generated file itself only carries
 * a "generated — do not edit" header.
 *
 * `manifest/source.yaml` DOES include `workspace` (it is a real distributed
 * template, root path and all), so it is synced there.
 *
 * Usage:
 *   node scripts/sync-template-versions.mjs          # writes both copies
 *   node scripts/sync-template-versions.mjs --check  # verifies zero drift (exit 1 on drift)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const DEFAULT_TEMPLATES_DIR = path.join(REPO_ROOT, 'iNNfo', 'specs', 'templates');
const DEFAULT_SAMPLES_TS_PATH = path.join(
  REPO_ROOT, 'iNNfo', 'apps', 'innfo-editor', 'src', 'config', 'samples.ts'
);
const DEFAULT_SOURCE_YAML_PATH = path.join(REPO_ROOT, 'manifest', 'source.yaml');

const GENERATED_HEADER = [
  '// GENERATED — DO NOT EDIT. Source: iNNfo/specs/templates/*/spec_NN.md and',
  '// iNNfo/specs/templates/workspace_spec_NN.md.',
  '// Regenerate with `npm run sync:versions` (scripts/sync-template-versions.mjs).',
].join('\n');

const FRONTMATTER_VERSION_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const TEMPLATE_VERSION_RE = /^template_version:\s*"?([^"\r\n]+?)"?\s*$/m;
const SPEC_VERSION_RE = /^spec_version:\s*"?([^"\r\n]+?)"?\s*$/m;

/**
 * Reads `template_version` from a spec_NN.md file's frontmatter.
 * Returns undefined if the file has no parseable frontmatter or version.
 */
function readFrontmatterVersion(filePath, fieldRe) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fmMatch = content.match(FRONTMATTER_VERSION_RE);
  if (!fmMatch) return undefined;
  const versionMatch = fmMatch[1].match(fieldRe);
  return versionMatch ? versionMatch[1].trim() : undefined;
}

/** Reads `template_version` -- the template's OWN version. */
function readTemplateVersion(filePath) {
  return readFrontmatterVersion(filePath, TEMPLATE_VERSION_RE);
}

/**
 * Reads `spec_version` -- the Level-1 iNNfo meta-spec the template conforms to.
 * This is a DIFFERENT axis from `template_version`: every template can ship its
 * own `template_version` while conforming to the same `spec_version`.
 */
function readSpecVersion(filePath) {
  return readFrontmatterVersion(filePath, SPEC_VERSION_RE);
}

/**
 * Walks `templatesDir` for `<slug>/spec_NN.md` files plus the root
 * `workspace_spec_NN.md`, returning a map of slug -> template_version.
 */
function collectVersions(templatesDir, read) {
  const versions = {};

  const workspaceSpecPath = path.join(templatesDir, 'workspace_spec_NN.md');
  if (fs.existsSync(workspaceSpecPath)) {
    const v = read(workspaceSpecPath);
    if (v) versions.workspace = v;
  }

  const entries = fs.readdirSync(templatesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specPath = path.join(templatesDir, entry.name, 'spec_NN.md');
    if (!fs.existsSync(specPath)) continue;
    const v = read(specPath);
    if (v) versions[entry.name] = v;
  }

  return versions;
}

export function collectTemplateVersions(templatesDir = DEFAULT_TEMPLATES_DIR) {
  return collectVersions(templatesDir, readTemplateVersion);
}

export function collectSpecVersions(templatesDir = DEFAULT_TEMPLATES_DIR) {
  return collectVersions(templatesDir, readSpecVersion);
}

function renderSamplesObjectBody(versions) {
  const slugs = Object.keys(versions)
    .filter((slug) => slug !== 'workspace')
    .sort();
  return slugs.map((slug) => {
    const key = /^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(slug) && !slug.includes('-')
      ? slug
      : `'${slug}'`;
    return `  ${key}: '${versions[slug]}',`;
  }).join('\n');
}

const SAMPLES_BLOCK_RE = /export const SHIPPED_TEMPLATE_VERSIONS: Record<string, string> = \{[\s\S]*?\n\}/;

function syncSamplesTs({ versions, samplesTsPath, check }) {
  if (!fs.existsSync(samplesTsPath)) {
    return { ok: false, error: `Missing samples.ts file: ${samplesTsPath}` };
  }

  const current = fs.readFileSync(samplesTsPath, 'utf8');
  if (!SAMPLES_BLOCK_RE.test(current)) {
    return { ok: false, error: `Could not find SHIPPED_TEMPLATE_VERSIONS block in ${samplesTsPath}` };
  }

  const body = renderSamplesObjectBody(versions);
  const replacement = `${GENERATED_HEADER}\nexport const SHIPPED_TEMPLATE_VERSIONS: Record<string, string> = {\n${body}\n}`;
  const updated = current.replace(new RegExp(`(?:${GENERATED_HEADER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)?${SAMPLES_BLOCK_RE.source}`), replacement);

  if (check) {
    if (updated !== current) {
      return {
        ok: false,
        drift: true,
      };
    }
    return { ok: true };
  }

  if (updated !== current) {
    fs.writeFileSync(samplesTsPath, updated, 'utf8');
  }
  return { ok: true, changed: updated !== current };
}

function syncSourceYaml({ versions, sourceYamlPath, check }) {
  if (!fs.existsSync(sourceYamlPath)) {
    return { ok: false, error: `Missing manifest source file: ${sourceYamlPath}` };
  }

  const current = fs.readFileSync(sourceYamlPath, 'utf8');
  const lines = current.split('\n');

  let inTopLevelListSection = false;
  let currentSlug = null;
  const perSlugDrift = [];

  const updatedLines = lines.map((line) => {
    if (/^\S/.test(line)) {
      // Top-level key: track whether we're inside templates:/frozen_templates:
      inTopLevelListSection = /^(templates|frozen_templates):\s*$/.test(line);
      currentSlug = null;
      return line;
    }

    if (!inTopLevelListSection) return line;

    const nameMatch = line.match(/^\s*- name:\s*(\S+)\s*$/);
    if (nameMatch) {
      currentSlug = nameMatch[1];
      return line;
    }

    const versionMatch = line.match(/^(\s*version:\s*)"([^"]*)"\s*$/);
    if (versionMatch && currentSlug && versions[currentSlug] !== undefined) {
      const expected = versions[currentSlug];
      if (versionMatch[2] !== expected) {
        perSlugDrift.push({ slug: currentSlug, expected, actual: versionMatch[2] });
      }
      return `${versionMatch[1]}"${expected}"`;
    }

    return line;
  });

  if (check) {
    if (perSlugDrift.length > 0) {
      return { ok: false, drift: perSlugDrift };
    }
    return { ok: true };
  }

  const updated = updatedLines.join('\n');
  if (updated !== current) {
    fs.writeFileSync(sourceYamlPath, updated, 'utf8');
  }
  return { ok: true, changed: updated !== current };
}

/**
 * Syncs (or checks) the two generated copies from every spec_NN.md, each from
 * its OWN frontmatter field -- they are different axes and must not be mixed:
 *
 *   - `samples.ts` SHIPPED_TEMPLATE_VERSIONS <- `template_version`
 *     (the template's own version; drives the editor's "newer template" badge)
 *   - `manifest/source.yaml` templates[].version <- `spec_version`
 *     (the Level-1 iNNfo meta-spec the template conforms to)
 *
 * The manifest side is NOT free to use `template_version`: the release gate
 * `checkVersionParity` (scripts/manifest/lib/manifest-rules.js) compares that
 * field against the template's `version`/`spec_version` frontmatter, so writing
 * `template_version` there fails stable-manifest validation on main.
 */
export function syncTemplateVersions({
  check = false,
  templatesDir = DEFAULT_TEMPLATES_DIR,
  samplesTsPath = DEFAULT_SAMPLES_TS_PATH,
  sourceYamlPath = DEFAULT_SOURCE_YAML_PATH,
} = {}) {
  const versions = collectTemplateVersions(templatesDir);
  const specVersions = collectSpecVersions(templatesDir);
  const errors = [];

  const samplesResult = syncSamplesTs({ versions, samplesTsPath, check });
  if (!samplesResult.ok) {
    if (samplesResult.drift) {
      errors.push(
        `SHIPPED_TEMPLATE_VERSIONS in ${samplesTsPath} is stale. ` +
        `Run \`npm run sync:versions\` to regenerate it.`
      );
    } else {
      errors.push(samplesResult.error);
    }
  }

  const sourceResult = syncSourceYaml({ versions: specVersions, sourceYamlPath, check });
  if (!sourceResult.ok) {
    if (sourceResult.drift) {
      for (const d of sourceResult.drift) {
        errors.push(
          `Template '${d.slug}' version drift in ${sourceYamlPath}: ` +
          `expected "${d.expected}" (from spec_version in spec_NN.md), found "${d.actual}". ` +
          `Run \`npm run sync:versions\` to fix it.`
        );
      }
    } else {
      errors.push(sourceResult.error);
    }
  }

  return { ok: errors.length === 0, errors, versions };
}

// Direct CLI invocation
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const isCheck = process.argv.includes('--check');

  if (isCheck) {
    console.log('🔍 Checking template version parity (spec_NN.md <-> samples.ts <-> manifest/source.yaml)...');
    const res = syncTemplateVersions({ check: true });
    if (!res.ok) {
      console.error('❌ Template version drift detected:');
      for (const err of res.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
    console.log('✅ All template versions are in sync with spec_NN.md.');
  } else {
    console.log('📦 Syncing template versions from spec_NN.md into samples.ts and manifest/source.yaml...');
    const res = syncTemplateVersions({ check: false });
    if (!res.ok) {
      console.error('❌ Failed to sync template versions:');
      for (const err of res.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
    console.log('🎉 Successfully synchronized all template versions.');
  }
}
