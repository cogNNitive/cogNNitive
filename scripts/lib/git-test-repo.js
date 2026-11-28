/**
 * scripts/lib/git-test-repo.js
 *
 * Shared helper for isolated git test repositories with consistent, safe configuration:
 * commit.gpgsign = false, core.autocrlf = false.
 */

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

function git(dir, ...args) {
  return execFileSync('git', args, {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

/**
 * Configures an existing directory as an isolated test git repository.
 * Sets user name/email, disables commit/tag signing, and turns off autocrlf.
 */
function initGitTestRepo(dir, { defaultBranch = 'main' } = {}) {
  git(dir, 'init', '-b', defaultBranch)
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  git(dir, 'config', 'commit.gpgsign', 'false')
  git(dir, 'config', 'core.autocrlf', 'false')
}

/**
 * Creates a throwaway git repository in temp dir with isolated config and optional initial files.
 */
function makeGitTestRepo({ prefix = 'git-test-repo-', defaultBranch = 'main', files = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  initGitTestRepo(root, { defaultBranch })
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel.split('/').join(path.sep))
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content)
  }
  if (Object.keys(files).length > 0) {
    git(root, 'add', '-A')
    git(root, 'commit', '-m', 'initial commit')
  }
  return root
}

module.exports = {
  git,
  initGitTestRepo,
  makeGitTestRepo,
}
