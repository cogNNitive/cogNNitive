/**
 * scripts/lib/skill-script-refs.js
 *
 * Self-containment gate for manifest-distributed skills: every
 * `node scripts/<file>` referenced in a distributed SKILL.md must exist inside
 * that skill's own folder. A skill is installed alone, so a repo-root script
 * is unreachable on a fresh install. Cross-skill `node skills/<other>/...`
 * paths are out of scope.
 */

const fs = require('fs');
const path = require('path');
const { parseFocusedYaml } = require('./yaml-parser.js');

const SCRIPT_REF = /\bnode\s+scripts\/([A-Za-z0-9_./-]+)/g;

/**
 * @param {string} repoRoot
 * @returns {{ ok: boolean, errors: string[], checked: number }}
 */
function checkSkillScriptReferences(repoRoot) {
  const errors = [];
  let checked = 0;
  const sourcePath = path.join(repoRoot, 'manifest', 'source.yaml');
  const doc = parseFocusedYaml(fs.readFileSync(sourcePath, 'utf8')) || {};

  for (const skill of doc.skills || []) {
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
