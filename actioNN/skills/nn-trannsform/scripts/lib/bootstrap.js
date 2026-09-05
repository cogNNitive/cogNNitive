const fs = require('fs');
const path = require('path');
const core = require('./scanner-core');
const provenance = require('../provenance');

/**
 * Standard workspace subdirectories created under a new project.
 * @type {string[]}
 */
const WORKSPACE_DIRS = [
  path.join('sources', 'original'),
  path.join('sources', 'nn'),
  'models',
  'procedures',
  'artifacts',
  'traNNsformations',
];

const TRANNSFORM_README = `# Transform

Transform (traNNsform) is a tool to structure and process unstructured documents:
1. Place files in \`sources/original/\`.
2. Scan and normalize to \`sources/nn/\`.
3. Track provenance with \`<Project>_V_0-1-0_cogNNitive_NN.md\`.
`;

/**
 * Bootstrap a new traNNsform project workspace.
 *
 * Copies every file under `srcDir` into `sources/original/` **recursively,
 * preserving the subfolder structure** (previously a flat `readdirSync` that
 * silently skipped anything below the top level). Reuses
 * `scanner-core.walkOriginal`, so the same ignore rules apply (dotfiles,
 * Office lock files, `desktop.ini`, and any `staging/` directory).
 *
 * @param {string} srcDir Directory of files to import (copied, never moved).
 * @param {string} destParentDir Parent directory the project folder is created in.
 * @param {string} projectName Project folder name.
 * @returns {{ projectDir: string, originalDir: string, copiedCount: number, provModelPath: string }}
 */
function bootstrapProject(srcDir, destParentDir, projectName) {
  const projectDir = path.join(destParentDir, projectName);
  const originalDir = path.join(projectDir, 'sources', 'original');

  fs.mkdirSync(projectDir, { recursive: true });
  for (const d of WORKSPACE_DIRS) fs.mkdirSync(path.join(projectDir, d), { recursive: true });

  if (projectName.toLowerCase() === 'trannsform') {
    fs.writeFileSync(path.join(projectDir, 'README.md'), TRANNSFORM_README, 'utf8');
  }

  let copiedCount = 0;
  if (
    srcDir &&
    fs.existsSync(srcDir) &&
    path.resolve(srcDir) !== path.resolve(originalDir)
  ) {
    for (const { absPath, relPath } of core.walkOriginal(srcDir)) {
      const destPath = path.join(originalDir, relPath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(absPath, destPath);
      copiedCount++;
    }
  }

  const prov = provenance.buildProvenanceModel(projectDir, { projectName });

  return { projectDir, originalDir, copiedCount, provModelPath: prov.modelPath };
}

module.exports = { bootstrapProject, WORKSPACE_DIRS };
