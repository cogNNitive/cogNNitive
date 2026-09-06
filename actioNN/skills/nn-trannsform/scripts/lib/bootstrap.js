const fs = require('fs');
const path = require('path');
const core = require('./scanner-core');
const provenance = require('../provenance');

/**
 * Standard workspace subdirectories created under a new project.
 * @type {string[]}
 */
const WORKSPACE_DIRS = [
  path.join('sources', 'import'),
  path.join('sources', 'conversations'),
  path.join('sources', 'export'),
  path.join('sources', 'nn'),
  'conversations',
  'export',
  'models',
  'procedures',
  'traNNsformations',
];

const TRANNSFORM_README = `# Transform

Transform (traNNsform) is a tool to structure and process unstructured documents:
1. Place files in \`sources/import/\`.
2. Scan and normalize to \`sources/nn/\`.
3. Track provenance with \`<Project>_V_0-2-0_workspace_NN.md\`.
`;

/**
 * Bootstrap a new traNNsform project workspace.
 *
 * Copies every file under `srcDir` into `sources/import/` **recursively,
 * preserving the subfolder structure** (previously a flat `readdirSync` that
 * silently skipped anything below the top level). Reuses
 * `scanner-core.walkOriginal`, so the same ignore rules apply (dotfiles,
 * Office lock files, `desktop.ini`, and any `staging/` directory).
 *
 * @param {string} srcDir Directory of files to import (copied, never moved).
 * @param {string} destParentDir Parent directory the project folder is created in.
 * @param {string} projectName Project folder name.
 * @returns {{ projectDir: string, importDir: string, originalDir: string, copiedCount: number, provModelPath: string }}
 */
function bootstrapProject(srcDir, destParentDir, projectName) {
  const projectDir = path.join(destParentDir, projectName);
  const importDir = path.join(projectDir, 'sources', 'import');

  fs.mkdirSync(projectDir, { recursive: true });
  for (const d of WORKSPACE_DIRS) fs.mkdirSync(path.join(projectDir, d), { recursive: true });

  if (projectName.toLowerCase() === 'trannsform') {
    fs.writeFileSync(path.join(projectDir, 'README.md'), TRANNSFORM_README, 'utf8');
  }

  let copiedCount = 0;
  if (
    srcDir &&
    fs.existsSync(srcDir) &&
    path.resolve(srcDir) !== path.resolve(importDir)
  ) {
    for (const { absPath, relPath } of core.walkOriginal(srcDir)) {
      const destPath = path.join(importDir, relPath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(absPath, destPath);
      copiedCount++;
    }
  }

  const prov = provenance.buildProvenanceModel(projectDir, { projectName });

  return { projectDir, importDir, originalDir: importDir, copiedCount, provModelPath: prov.modelPath };
}

module.exports = { bootstrapProject, WORKSPACE_DIRS };
