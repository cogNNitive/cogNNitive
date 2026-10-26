#!/usr/bin/env node

/**
 * scripts/manifest/lib/external-skill-policy.js
 *
 * Structural policy for skills a bluepriNNt *references* (as opposed to embeds)
 * via its frontmatter `skills:` array. A referenced skill is fetched from its
 * upstream repo at install time, so it MUST carry a pin (`commit`) and a
 * declared `license`.
 *
 * Pure and offline: the structural checks run everywhere.
 */

const fs = require('fs');
const path = require('path');

const COMMIT_RE = /^[0-9a-f]{40}$/i;

/**
 * @param {object} skill a frontmatter skill entry
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateExternalSkill(skill) {
  const errors = [];
  const warnings = [];
  if (!skill || typeof skill !== 'object' || skill.embedded) return { errors, warnings };

  const label = skill.name ? `skill '${skill.name}'` : 'external skill';
  for (const field of ['name', 'repo', 'path', 'commit', 'license']) {
    if (!skill[field]) errors.push(`${label}: missing field '${field}'`);
  }
  if (skill.commit && !COMMIT_RE.test(String(skill.commit))) {
    errors.push(`${label}: commit '${skill.commit}' is not a 40-char hex sha`);
  }
  return { errors, warnings };
}

/**
 * @param {object[]} skills
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateExternalSkills(skills) {
  const errors = [];
  const warnings = [];
  for (const skill of skills || []) {
    const result = validateExternalSkill(skill);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }
  return { errors, warnings };
}

const SKIP_DIRS = new Set(['skills', 'procedures', 'samples', 'assets', 'scripts', 'node_modules']);

function findSpecFiles(dir, depth, out) {
  if (depth > 2) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      findSpecFiles(abs, depth + 1, out);
    } else if (entry.isFile() && (entry.name === 'spec_NN.md' || entry.name.endsWith('_spec_NN.md'))) {
      out.push(abs);
    }
  }
}

/**
 * Scans every bluepriNNt spec for referenced external skills and validates them.
 * @param {string} repoRoot
 * @returns {{ errors: string[], warnings: string[], checked: number }}
 */
function collectExternalSkillViolations(repoRoot) {
  const errors = [];
  const warnings = [];
  let checked = 0;

  const { parseFocusedYaml, parseFrontmatter } = require(
    path.join(repoRoot, 'skills', 'nn-preflight', 'scripts', 'lib', 'yaml-lite.js'),
  );

  const specs = [];
  findSpecFiles(path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts'), 0, specs);

  for (const specPath of specs) {
    let skills;
    try {
      const fmText = parseFrontmatter(fs.readFileSync(specPath, 'utf8'));
      skills = parseFocusedYaml(fmText).skills;
    } catch {
      continue; // no/unparseable frontmatter — not this gate's concern
    }
    if (!Array.isArray(skills)) continue;
    const rel = path.relative(repoRoot, specPath).split(path.sep).join('/');
    const result = validateExternalSkills(skills);
    checked += skills.length;
    errors.push(...result.errors.map((e) => `${rel}: ${e}`));
    warnings.push(...result.warnings.map((w) => `${rel}: ${w}`));
  }

  return { errors, warnings, checked };
}

module.exports = {
  COMMIT_RE,
  validateExternalSkill,
  validateExternalSkills,
  collectExternalSkillViolations,
};
