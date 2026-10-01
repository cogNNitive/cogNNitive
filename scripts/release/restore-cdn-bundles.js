/**
 * scripts/release/restore-cdn-bundles.js
 *
 * One-time utility to restore previously pruned versioned CDN bundles
 * from git history in cogNNitive-web (AD-2).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildGitAuthEnv, runGit } = require('../lib/publish-web-git.js');

async function restoreCdnBundles(config = {}, options = {}) {
  const logger = options.logger || config.logger || console;
  const targetRepo = config.targetRepo || 'cogNNitive/cogNNitive-web';
  const token = config.token || process.env.WEB_RELEASE_TOKEN;
  const remoteUrl = config.remoteUrl || options.remoteUrl;
  const tmpRoot = options.tmpRoot || config.tmpRoot || os.tmpdir();

  const work = fs.mkdtempSync(path.join(tmpRoot, 'restore-cdn-'));

  try {
    const { env: authEnv, secrets } = buildGitAuthEnv(token);
    logger.log(`restore-cdn: cloning ${targetRepo}...`);
    runGit(['clone', remoteUrl || `https://github.com/${targetRepo}.git`, work], { env: authEnv, secrets });
    runGit(['config', 'user.name', 'cogNNitive restore bot'], { cwd: work, env: authEnv, secrets });
    runGit(['config', 'user.email', 'restore@cognnitive.com'], { cwd: work, env: authEnv, secrets });

    const git = (args) => runGit(args, { cwd: work, env: authEnv, secrets }).trim();

    // 1. Find commits where docs/innfo/cdn/innfo-mcp-v*.bundle.js was deleted
    const logOutput = git([
      'log',
      '--diff-filter=D',
      '--name-only',
      '--pretty=format:COMMIT:%H',
      '--',
      'docs/innfo/cdn/',
    ]);

    const restored = [];
    const lines = logOutput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let currentCommit = null;

    for (const line of lines) {
      if (line.startsWith('COMMIT:')) {
        currentCommit = line.slice('COMMIT:'.length);
      } else if (line.endsWith('.bundle.js') && currentCommit) {
        const filePath = line;
        const targetDiskPath = path.join(work, filePath);
        if (!fs.existsSync(targetDiskPath)) {
          try {
            // Retrieve file contents from the parent commit before deletion
            const fileContent = runGit(['show', `${currentCommit}^:${filePath}`], { cwd: work, env: authEnv, secrets });
            if (fileContent) {
              fs.mkdirSync(path.dirname(targetDiskPath), { recursive: true });
              fs.writeFileSync(targetDiskPath, fileContent, 'utf8');
              restored.push(filePath);
              logger.log(`restore-cdn: restored ${filePath} from ${currentCommit}^`);
            }
          } catch (err) {
            logger.warn(`restore-cdn: could not restore ${filePath} from ${currentCommit}^: ${err.message}`);
          }
        }
      }
    }

    if (restored.length > 0) {
      git(['add', 'docs/innfo/cdn/']);
      git(['commit', '-m', 'chore(cdn): restore previously deleted versioned MCP bundles additively']);
      git(['push', 'origin', 'main']);
      logger.log(`restore-cdn: committed and pushed ${restored.length} bundle(s) to main.`);
      return { restored, committed: true };
    }

    logger.log('restore-cdn: no deleted bundles needed restoration.');
    return { restored: [], committed: false };
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
  }
}

module.exports = {
  restoreCdnBundles,
};
