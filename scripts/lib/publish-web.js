/**
 * scripts/lib/publish-web.js
 *
 * Core publishing engine for distributing docs and release surfaces to cogNNitive-web.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { diffTrees } = require('./publish-diff.js');
const { assertNoSource } = require('./publish-web-guard.js');
const { buildGitAuthEnv, runGit, PublishError } = require('./publish-web-git.js');
const { replaceSiteTree, copyDistributionPath } = require('./publish-web-tree.js');

const DISTRIBUTION_PATHS = [
  'skills',
  'iNNfo/specs',
  'iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js',
  'scripts/export-console.mjs',
];

/**
 * Runs the public-web publishing workflow.
 *
 * @param {object} config
 * @param {string} config.repoRoot
 * @param {string} [config.docsRoot]
 * @param {string} [config.targetRepo]
 * @param {string} [config.subdir]
 * @param {boolean} [config.skipDistribution]
 * @param {string[]} [config.distributionPaths]
 * @param {string} [config.token]
 * @param {boolean} [config.dryRun]
 * @param {object} [options]
 * @param {string} [options.tmpRoot]
 * @param {string} [options.remoteUrl]
 * @param {object} [options.logger]
 */
async function runPublish(config, options = {}) {
  const logger = options.logger || console;
  const repoRoot = path.resolve(config.repoRoot);
  const docsRoot = config.docsRoot ? path.resolve(config.docsRoot) : path.join(repoRoot, 'docs');
  const targetRepo = config.targetRepo || 'cogNNitive/cogNNitive-web';
  const subdir = (config.subdir || 'docs').replace(/^\/+|\/+$/g, '');
  const skipDistribution = Boolean(config.skipDistribution);
  const distributionPaths = config.distributionPaths || DISTRIBUTION_PATHS;
  const token = config.token;
  const dryRun = Boolean(config.dryRun);

  const tmpRoot = options.tmpRoot || os.tmpdir();
  const remoteUrl = options.remoteUrl;

  if (!fs.existsSync(docsRoot)) {
    throw new PublishError(`built docs not found at ${docsRoot} — run \`npm run build:docs\` first.`);
  }

  if (!token && !dryRun && !remoteUrl) {
    throw new PublishError('WEB_PUBLISH_TOKEN is required (Contents: write on the target repo).');
  }

  // 1. Guard all surfaces BEFORE creating temp directories or touching network
  const surfaces = skipDistribution ? [docsRoot] : [docsRoot, ...distributionPaths];
  assertNoSource(repoRoot, surfaces);

  const work = fs.mkdtempSync(path.join(tmpRoot, 'publish-web-'));
  try {
    const { env: authEnv, secrets } = buildGitAuthEnv(token);
    const cloneUrl = remoteUrl || `https://github.com/${targetRepo}.git`;

    logger.log(`publish-web: cloning ${targetRepo}...`);
    runGit(['clone', '--depth', '1', cloneUrl, work], {
      cwd: repoRoot,
      env: authEnv,
      secrets,
    });

    // Check clone .git/config for token safety
    const gitConfigPath = path.join(work, '.git', 'config');
    if (fs.existsSync(gitConfigPath) && token) {
      const configText = fs.readFileSync(gitConfigPath, 'utf8');
      if (configText.includes(token)) {
        throw new PublishError('Security violation: token leaked into .git/config');
      }
    }

    // 2. Site: diff and replace
    const targetTree = path.join(work, subdir);
    const siteDiff = diffTrees(docsRoot, fs.existsSync(targetTree) ? targetTree : path.join(work, '__absent__'));

    if (siteDiff.identical) {
      logger.log('publish-web: site artifact is byte-identical.');
    } else {
      logger.log(
        `publish-web: site → ${siteDiff.added.length} added, ${siteDiff.modified.length} modified, ${siteDiff.removed.length} removed.`
      );
      replaceSiteTree(docsRoot, targetTree);
    }

    // 3. Distribution surface: copy verbatim
    if (!skipDistribution) {
      let copiedCount = 0;
      for (const rel of distributionPaths) {
        if (copyDistributionPath(repoRoot, rel, work)) copiedCount++;
      }
      logger.log(`publish-web: staged ${copiedCount} distribution path(s).`);
    }

    if (dryRun) {
      logger.log('publish-web: DRY RUN — no commit/push performed.');
      return { dryRun: true, siteDiff };
    }

    runGit(['config', 'user.name', 'cogNNitive publish bot'], { cwd: work, env: authEnv, secrets });
    runGit(['config', 'user.email', 'publish@cognnitive.com'], { cwd: work, env: authEnv, secrets });

    const addPaths = skipDistribution ? [subdir] : [subdir, ...distributionPaths];
    runGit(['add', '--', ...addPaths], { cwd: work, env: authEnv, secrets });

    const staged = runGit(['diff', '--cached', '--name-only'], { cwd: work, env: authEnv, secrets });
    if (!staged) {
      logger.log('publish-web: nothing staged — no-op (no empty commit).');
      return { staged: false, siteDiff };
    }

    const stamp = new Date().toISOString();
    runGit(
      ['commit', '-m', `chore: publish from cogNNitive@${process.env.GITHUB_SHA || 'local'} (${stamp})`],
      { cwd: work, env: authEnv, secrets }
    );
    runGit(['push', 'origin', 'HEAD:main'], { cwd: work, env: authEnv, secrets });

    logger.log('publish-web: pushed to', targetRepo);
    return { published: true, siteDiff };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

module.exports = {
  DISTRIBUTION_PATHS,
  runPublish,
};
