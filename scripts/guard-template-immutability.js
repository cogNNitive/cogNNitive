#!/usr/bin/env node

/**
 * scripts/guard-template-immutability.js
 *
 * Zero-dependency template immutability guard for iNNfo versioned templates.
 *
 * Versioned templates (`iNNfo/specs/templates/*_V_<x-y-z>*.md`) are
 * write-once: a content change MUST ship as a `template_version` bump plus a
 * new versioned filename. In-place edits (git status `M`) and added templates
 * whose frontmatter `template_version` disagrees with the filename version
 * fail the guard.
 *
 * Usage:
 *   node scripts/guard-template-immutability.js [--diff-file <path>] [--root <path>] [--staged]
 *
 * Diff source (default): `git diff --name-status HEAD -- <root>`.
 *   --staged    → `git diff --cached --name-status -- <root>` instead.
 *   --diff-file → read fixture lines in `git diff --name-status` format
 *                 (`<STATUS>\t<path>`, renames `R<score>\t<old>\t<new>`) from
 *                 a file instead of invoking git — enables plain-node tests.
 *   --root      → templates directory (default: <repo>/iNNfo/specs/templates).
 *
 * Exit 0 when no violations, exit 1 otherwise (every violation is printed).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { parseFocusedYaml, parseFrontmatter } = require('../actioNN/skills/nn-preflight/scripts/lib/yaml-lite');

const DEFAULT_ROOT = path.join(__dirname, '..', 'iNNfo', 'specs', 'templates');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

function normalizeVersion(v) {
  return String(v).replace(/^[vV]_?/, '').replace(/[_-]/g, '.').trim();
}

/** Extract the version embedded in a versioned template filename (`_V_<x-y-z>`). */
function versionFromFilename(basename) {
  const m = basename.match(/_V_([0-9]+(?:[-_.][0-9]+){2})/i);
  return m ? normalizeVersion(m[1]) : null;
}

/** Versioned template filter: `_V_<digits>-<digits>-<digits>` basename + `.md`, outside samples/ and assets/. */
function isVersionedTemplate(relPath) {
  if (!/\.md$/i.test(relPath)) return false;
  if (!/_V_[0-9]+(?:-[0-9]+){2}/i.test(path.basename(relPath))) return false;
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized.includes('/samples/') || normalized.includes('/assets/')) return false;
  return true;
}

function isUnderRoot(filePath, root) {
  const rootNorm = path.resolve(root);
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  return abs === rootNorm || abs.startsWith(rootNorm + path.sep);
}

/** Parse `git diff --name-status` lines into `{ status, path }` (new path for renames). */
function parseDiffLine(line) {
  const tokens = line.split('\t');
  if (tokens.length < 2) return null;
  const status = tokens[0];
  const target = tokens[tokens.length - 1]; // renames: `R<score>\t<old>\t<new>` → new = last token
  return { status: status.charAt(0), target };
}

function diffLinesFromGit(root, staged) {
  const flag = staged ? '--cached' : 'HEAD';
  const out = execSync(`git diff --name-status ${flag} -- "${root}"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return out.split(/\r?\n/).filter(Boolean);
}

function diffLinesFromFile(file) {
  return fs.readFileSync(file, 'utf-8').split(/\r?\n/).filter(Boolean);
}

function main() {
  const root = getArg('--root') || DEFAULT_ROOT;
  const diffFile = getArg('--diff-file');
  const staged = process.argv.includes('--staged');

  const lines = diffFile ? diffLinesFromFile(diffFile) : diffLinesFromGit(root, staged);

  const errors = [];
  for (const line of lines) {
    const parsed = parseDiffLine(line);
    if (!parsed) continue;
    const { status, target } = parsed;
    if (!isUnderRoot(target, root)) continue;
    if (!isVersionedTemplate(target)) continue;

    if (status === 'M') {
      errors.push(
        `ERROR: Versioned template mutated in place: ${target}. Content changes to a versioned template MUST be delivered as a template_version bump plus a new versioned filename (e.g. *_V_<x-y-z>_*.md); never edit an existing versioned template in place.`,
      );
      continue;
    }

    if (status === 'A') {
      const absPath = path.isAbsolute(target)
        ? target
        : path.resolve(process.cwd(), target);
      let declaredRaw = null;
      try {
        const content = fs.readFileSync(absPath, 'utf-8');
        const fm = parseFocusedYaml(parseFrontmatter(content));
        declaredRaw = fm.template_version != null ? String(fm.template_version) : null;
      } catch {
        declaredRaw = null;
      }
      const declared = declaredRaw ? normalizeVersion(declaredRaw) : null;
      const versionMatch = path.basename(target).match(/_V_([^_]+)/i);
      const filenameToken = versionMatch ? `_V_${versionMatch[1]}` : null;
      const filenameVersion = versionMatch ? normalizeVersion(versionMatch[1]) : null;
      if (!filenameVersion || declared !== filenameVersion) {
        errors.push(
          `ERROR: template_version mismatch in ${target}: frontmatter declares "${declaredRaw ?? 'missing'}" but the filename declares "${filenameToken ?? 'missing'}". The frontmatter template_version MUST match the version embedded in the filename.`,
        );
      }
    }
  }

  if (errors.length > 0) {
    console.log(`Template immutability guard: ${errors.length} violation(s) found.`);
    for (const err of errors) console.log(`  ${err}`);
    process.exit(1);
  }
  console.log('Template immutability guard: OK — no versioned template violations.');
  process.exit(0);
}

main();