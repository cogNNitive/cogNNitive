const fs = require('fs');
const path = require('path');
const modelLib = require('./provenance-model');
const indexLib = require('./workspace-index');

/**
 * Report drift between the lineage record and the workspace filesystem.
 *
 * Errors:
 *  - a `models/*_NN.md` with no `## NN Models:` entry;
 *  - a `## NN Artifacts:` entry whose `derived_from` names a model/version
 *    absent from `models/`;
 *  - a `sources::` value in any model that does not resolve under `sources/nn/`.
 *
 * @param {string} projectDir
 * @returns {{ errors: string[], warnings: string[] }}
 */
function checkLineage(projectDir) {
  const errors = [];
  const warnings = [];

  const projectName = path.basename(projectDir);
  const best = modelLib.resolveLatestModelFile(projectDir, projectName, indexLib.compareVersions);
  if (!best) {
    errors.push('No lineage record found. Run `--scan` (or `--lineage`) to create one.');
    return { errors, warnings };
  }
  const record = fs.readFileSync(path.join(projectDir, best), 'utf8');
  const models = modelLib.collectModels(projectDir);

  // 1. Every model file is registered.
  for (const m of models) {
    if (!record.includes(`model_ref:: ${m.model_ref}`)) {
      errors.push(`${m.model_ref} has no entry in the lineage record's # NN Models section.`);
    }
  }

  // 2. Every artifact's derived_from resolves to a real model / version.
  for (const blk of record.split(/^## NN Artifacts:/m).slice(1)) {
    const df = blk.match(/^derived_from::\s*\[(.*)\]/m);
    if (!df) continue;
    const nameLine = blk.split(/\r?\n/, 1)[0].trim();
    for (const ref of df[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      const ok = models.some(
        (m) => ref === m.name || (m.model_version && ref === `${m.name} ${m.model_version}`),
      );
      if (!ok) {
        errors.push(
          `Artifact "${nameLine}" derives from "${ref}", but no such model/version exists under models/.`,
        );
      }
    }
  }

  // 3. Every sources:: Citation in every model resolves under sources/nn/.
  const nnDir = path.join(projectDir, 'sources', 'nn');
  const modelsDir = path.join(projectDir, 'models');
  for (const rel of modelLib.walkFiles(modelsDir, (n) => n.endsWith('_NN.md'))) {
    const content = fs.readFileSync(path.join(modelsDir, rel), 'utf8');
    for (const ref of modelLib.scrapeSourceRefs(content)) {
      const filePart = ref.replace(/#.*$/, '').replace(/^sources\/nn\//, '').trim();
      if (!filePart || filePart.startsWith('models/')) continue;
      if (!fs.existsSync(path.join(nnDir, filePart))) {
        errors.push(`models/${rel}: sources:: "${ref}" does not resolve under sources/nn/.`);
      }
    }
  }

  return { errors, warnings };
}

module.exports = { checkLineage };
