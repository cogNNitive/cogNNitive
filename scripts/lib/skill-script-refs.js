/**
 * scripts/lib/skill-script-refs.js
 *
 * Self-containment gate for distributed skills: every
 * `node scripts/<file>` referenced in a distributed SKILL.md must exist inside
 * that skill's own folder. A skill is installed alone, so a repo-root script
 * is unreachable on a fresh install. Cross-skill `node skills/<other>/...`
 * paths are out of scope.
 *
 * Distributed skills are the manifest-listed ones plus the skills embedded in a
 * bluepriNNt package (`iNNfo/specs/bluepriNNts/<bp>/skills/<name>/SKILL.md`),
 * which are projected into the skills dir on install.
 */

const fs = require('fs');
const path = require('path');
const { parseFocusedYaml } = require('./yaml-parser.js');

const BLUEPRINTS_REL = ['iNNfo', 'specs', 'bluepriNNts'];

const SCRIPT_REF = /\bnode\s+scripts\/([A-Za-z0-9_./-]+)/g;

/**
 * Skill folders embedded in bluepriNNt packages.
 * @param {string} repoRoot
 * @returns {Array<{ name: string, path: string }>} `path` is repo-relative POSIX.
 */
function embeddedSkills(repoRoot) {
  const found = [];
  const blueprintsDir = path.join(repoRoot, ...BLUEPRINTS_REL);
  if (!fs.existsSync(blueprintsDir)) return found;
  for (const bp of fs.readdirSync(blueprintsDir, { withFileTypes: true })) {
    if (!bp.isDirectory()) continue;
    const skillsDir = path.join(blueprintsDir, bp.name, 'skills');
    if (!fs.existsSync(skillsDir)) continue;
    for (const skill of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!skill.isDirectory() || skill.name === 'node_modules' || skill.name.startsWith('.')) continue;
      found.push({ name: skill.name, path: [...BLUEPRINTS_REL, bp.name, 'skills', skill.name].join('/') });
    }
  }
  return found;
}

/**
 * @param {string} repoRoot
 * @returns {{ ok: boolean, errors: string[], checked: number }}
 */
function checkSkillScriptReferences(repoRoot) {
  const errors = [];
  let checked = 0;
  const sourcePath = path.join(repoRoot, 'manifest', 'source.yaml');
  const doc = parseFocusedYaml(fs.readFileSync(sourcePath, 'utf8')) || {};

  for (const skill of [...(doc.skills || []), ...embeddedSkills(repoRoot)]) {
    if (!skill.path) continue;
    const skillDir = path.join(repoRoot, skill.path);
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    const text = fs.readFileSync(skillMd, 'utf8');
    const refs = new Set([...text.matchAll(SCRIPT_REF)].map((m) => m[1]));
    for (const ref of refs) {
      checked++;
      if (!fs.existsSync(path.join(skillDir, 'scripts', ref))) {
        errors.push(`${skill.name}: SKILL.md references 'node scripts/${ref}' but ${skill.path}/scripts/${ref} does not exist.`);
      }
    }
  }
  return { ok: errors.length === 0, errors, checked };
}

module.exports = { checkSkillScriptReferences };
