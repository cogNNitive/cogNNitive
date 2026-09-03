/**
 * provenance.js — cogNNitive provenance model generator.
 *
 * Builds and refreshes an iNNfo level-3 provenance model that registers the
 * Sources ingested (and, once the agent adds them, the Models, Artifacts and
 * Procedures produced) as first-class iNNfo elements with explicit lineage.
 *
 * Zero runtime dependencies (Node builtins only), mirroring scanner.js.
 */

const fs = require('fs');
const path = require('path');
const modelLib = require('./lib/provenance-model');
const indexLib = require('./lib/workspace-index');

/**
 * Build or refresh the cogNNitive provenance model for a project.
 * @param {string} projectDir
 * @param {Record<string, any>} [options]
 * @returns {{ modelPath: string, sourceCount: number, created: boolean }}
 */
function buildProvenanceModel(projectDir, options = {}) {
  const projectName = options.projectName || path.basename(projectDir);
  const mdDir = path.join(projectDir, 'sources', 'nn');
  const sources = modelLib.collectSources(mdDir);

  modelLib.materializeAssets(projectDir, sources);

  const bestFile = modelLib.resolveLatestModelFile(projectDir, projectName, indexLib.compareVersions);

  let modelPath;
  let created;
  if (bestFile) {
    modelPath = path.join(projectDir, bestFile);
    created = false;
  } else {
    modelPath = path.join(projectDir, `${projectName}_V_0-1-0_cogNNitive_NN.md`);
    created = true;
  }

  const content = created
    ? modelLib.buildFreshModel(projectName, sources)
    : modelLib.refreshExistingModel(fs.readFileSync(modelPath, 'utf8'), sources);

  fs.writeFileSync(modelPath, content, 'utf8');
  indexLib.writeWorkspaceIndex(projectDir);

  return { modelPath, sourceCount: sources.length, created };
}

module.exports = {
  buildProvenanceModel,
  collectSources: modelLib.collectSources,
  slugify: modelLib.slugify,
  writeWorkspaceIndex: indexLib.writeWorkspaceIndex,
  listWorkspaceModels: indexLib.listWorkspaceModels,
};

if (require.main === module) {
  const minimist = (() => {
    try {
      return require('minimist');
    } catch {
      return null;
    }
  })();
  const args = minimist
    ? minimist(process.argv.slice(2))
    : { src: process.argv[3] };
  const projectDir = args.src || process.cwd();
  const result = buildProvenanceModel(projectDir, { projectName: args.name });
  console.log(
    `cogNNitive Provenance model ${result.created ? 'created' : 'refreshed'}: ${result.modelPath}`
  );
  console.log(`Sources registered: ${result.sourceCount}`);
}
