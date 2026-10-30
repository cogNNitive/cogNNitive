/**
 * scripts/release/run-release.js
 *
 * Core orchestrator for tag-driven releases (AD-1). Strictly < 200 lines.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseReleaseTag } = require('./parse-release-tag.js');
const { decidePublish } = require('./publish-decision.js');
const { assembleManifest } = require('./assemble-manifest.js');
const { RELEASE_TABLE } = require('./release-keys.js');
const { checkVersionAgreement } = require('./version-agreement.js');
const { readEntryVersion } = require('../manifest/lib/entry-version.js');
const { parseFocusedYaml } = require('../lib/yaml-parser.js');
const { buildGitAuthEnv, runGit } = require('../lib/publish-web-git.js');
const { copyDistributionPath } = require('../lib/publish-web-tree.js');
const { validateManifestText } = require('../manifest/validate-manifest.js');

class ReleaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReleaseError';
  }
}

function parseSourceYaml(repoRoot) {
  const p = path.join(repoRoot, 'manifest', 'source.yaml');
  if (!fs.existsSync(p)) return { skills: [], blueprints: [], consoleAssets: [], workflows: [] };
  const doc = parseFocusedYaml(fs.readFileSync(p, 'utf8')) || {};
  return {
    version: doc.version || '1.0.0',
    entrypoint: doc.entrypoint || 'nn-router',
    skills: Array.isArray(doc.skills) ? doc.skills : [],
    blueprints: Array.isArray(doc.blueprints) ? doc.blueprints : [],
    consoleAssets: Array.isArray(doc.console_assets) ? doc.console_assets : [],
    workflows: Array.isArray(doc.workflows) ? doc.workflows : [],
  };
}

function pushWithRetry(workDir, args, authEnv, secrets, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      runGit(['push', ...args], { cwd: workDir, env: authEnv, secrets });
      return;
    } catch (err) {
      if (attempt >= maxAttempts) throw err;
      runGit(['fetch', 'origin', 'main'], { cwd: workDir, env: authEnv, secrets });
      try {
        runGit(['rebase', 'origin/main'], { cwd: workDir, env: authEnv, secrets });
      } catch (rebaseErr) {
        // Never retry from a half-applied rebase: leave the clone clean and fail loudly.
        try { runGit(['rebase', '--abort'], { cwd: workDir, env: authEnv, secrets }); } catch {}
        throw rebaseErr;
      }
    }
  }
}

function stampBlueprintCatalog(workDir, tag, logger) {
  for (const rel of ['iNNfo/specs/bluepriNNts/catalog.json', 'docs/innfo/blueprints/catalog.json']) {
    const catPath = path.join(workDir, ...rel.split('/'));
    if (!fs.existsSync(catPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(catPath, 'utf8'));
      for (const sec of [raw.blueprints, raw.frozen]) {
        if (sec) for (const bp of Object.values(sec)) if (bp && typeof bp === 'object') bp.release_tag = tag;
      }
      fs.writeFileSync(catPath, JSON.stringify(raw, null, 2) + '\n', 'utf8');
    } catch (e) {
      logger.warn(`Could not stamp release_tag on ${catPath}: ${e.message}`);
    }
  }
}

async function runRelease(config, options = {}) {
  const logger = config.logger || options.logger || console;
  const repoRoot = path.resolve(config.repoRoot || process.cwd());
  const tag = config.tag;
  const targetRepo = config.targetRepo || 'cogNNitive/cogNNitive-web';
  const token = config.token || process.env.WEB_RELEASE_TOKEN;
  const dryRun = Boolean(config.dryRun);
  const tmpRoot = options.tmpRoot || config.tmpRoot || os.tmpdir();
  const remoteUrl = config.remoteUrl || options.remoteUrl;
  const validator = config.validator || options.validator || (async (text) => (await validateManifestText(text, 'stable')).ok);

  const { key, version } = parseReleaseTag(tag);
  const work = fs.mkdtempSync(path.join(tmpRoot, 'release-run-'));

  try {
    const { env: authEnv, secrets } = buildGitAuthEnv(token);
    logger.log(`run-release: cloning ${targetRepo}...`);
    runGit(['clone', remoteUrl || `https://github.com/${targetRepo}.git`, work], { cwd: repoRoot, env: authEnv, secrets });
    runGit(['config', 'user.name', 'cogNNitive release bot'], { cwd: work, env: authEnv, secrets });
    runGit(['config', 'user.email', 'release@cognnitive.com'], { cwd: work, env: authEnv, secrets });
    const git = (args) => runGit(args, { cwd: work, env: authEnv, secrets }).trim();

    const existingTags = git(['tag', '-l']).split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
    checkVersionAgreement({ releaseTag: tag, repoRoot, existingTags });

    // 1. Stage key paths
    const keyConfig = RELEASE_TABLE[key] || { repoPaths: [], sitePaths: [] };
    for (const rel of keyConfig.repoPaths) copyDistributionPath(repoRoot, rel, work);

    if (key === 'nn-mcp') {
      const src = path.join(repoRoot, 'iNNfo', 'packages', 'nn-mcp', 'bin', 'nn-mcp.bundle.js');
      if (fs.existsSync(src)) {
        const dst = path.join(work, 'docs', 'innfo', 'cdn', `nn-mcp-v${version}.bundle.js`);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
        fs.writeFileSync(path.join(work, 'docs', 'innfo', 'cdn', 'manifest.json'), JSON.stringify({ latest: version }, null, 2) + '\n');
      }
    }

    if (key === 'blueprints') stampBlueprintCatalog(work, tag, logger);

    // 2. Diff and decide commit C
    git(['add', '-A']);
    const tagExists = git(['tag', '-l']).split(/\r?\n/).filter(Boolean).includes(tag);
    let tagTreeMatches = true;
    if (tagExists) {
      try {
        const diff = git(['diff', '--cached', '--name-only', tag, '--', ...keyConfig.repoPaths]);
        tagTreeMatches = !diff.trim();
      } catch { tagTreeMatches = false; }
    }
    const decision = decidePublish({ tagExists, tagTreeMatches, headTreeMatches: !git(['diff', '--cached', '--name-only']) });

    let contentSha;
    if (decision.needCommit) {
      git(['commit', '-m', `release(${key}): publish ${tag}`]);
      if (!dryRun) pushWithRetry(work, ['origin', 'main'], authEnv, secrets);
      contentSha = git(['rev-parse', 'HEAD']);
    } else {
      contentSha = tagExists ? git(['rev-parse', `${tag}^{commit}`]) : git(['rev-parse', 'HEAD']);
    }

    if (decision.needTag && !dryRun) {
      git(['tag', tag, contentSha]);
      pushWithRetry(work, ['origin', tag], authEnv, secrets);
    }

    // 3. Assemble Manifest
    const prevManifestPath = path.join(work, 'docs', 'use', 'manifest.md');
    const prevManifestText = fs.existsSync(prevManifestPath) ? fs.readFileSync(prevManifestPath, 'utf8') : '';
    const readVersion = (entry) => {
      const pList = entry.section === 'skills'
        ? (entry.path ? [entry.path, 'SKILL.md'] : ['skills', entry.name || '', 'SKILL.md'])
        : entry.section === 'blueprints'
          ? (entry.path ? [entry.path] : ['iNNfo', 'specs', entry.name || ''])
          : entry.section === 'mcp'
            ? ['iNNfo', 'packages', 'nn-mcp', 'package.json']
            : ['iNNfo', 'specs', 'bluepriNNts', 'console', 'package.json'];
      const target = path.join(repoRoot, ...pList.filter(Boolean));
      return (fs.existsSync(target) ? readEntryVersion({ section: entry.section, content: fs.readFileSync(target, 'utf8') }) : null) || version;
    };

    const manifestBodyPath = path.join(repoRoot, 'manifest', 'body.md');
    const customBody = fs.existsSync(manifestBodyPath) ? fs.readFileSync(manifestBodyPath, 'utf8') : undefined;

    const { manifestText, snapshotPath } = assembleManifest({
      releaseTag: tag,
      contentSha,
      source: parseSourceYaml(repoRoot),
      prevManifestText,
      readVersion,
      resolveGitRef: (ref) => { try { return git(['rev-parse', `${ref}^{commit}`]); } catch { return null; } },
      body: customBody,
    });

    if (!(await validator(manifestText, 'stable'))) throw new ReleaseError(`Staged manifest validation failed for ${tag}`);

    // 4. Publish Manifest Commit M
    let manifestSha = contentSha;
    if (prevManifestText.trim() !== manifestText.trim()) {
      for (const p of [prevManifestPath, path.join(work, 'docs', 'update', 'manifest.md'), path.join(work, snapshotPath)]) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, manifestText, 'utf8');
      }
      git(['add', 'docs/use/manifest.md', 'docs/update/manifest.md', 'docs/use/manifests/']);
      if (git(['diff', '--cached', '--name-only'])) {
        git(['commit', '-m', `release(${key}): update manifest for ${tag}`]);
        if (!dryRun) pushWithRetry(work, ['origin', 'main'], authEnv, secrets);
        manifestSha = git(['rev-parse', 'HEAD']);
      }
    }

    fs.writeFileSync(path.join(repoRoot, '.release-manifest.md'), manifestText, 'utf8');

    return { tag, key, version, contentSha, manifestSha, action: decision.action, dryRun, manifestText };
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { runRelease, ReleaseError };
