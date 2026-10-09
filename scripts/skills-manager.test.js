#!/usr/bin/env node
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawnSync, spawn } = require('node:child_process');

const managerScript = path.join(__dirname, 'skills-manager.js');

function serveManifestOnce(content) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}/manifest.md`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

// spawnSync blocks this process's event loop, which would starve the
// in-process HTTP server used to serve a local manifest fixture (deadlock:
// the child waits for a response the parent can't produce while blocked).
// Use async spawn whenever a test needs the local server to stay live.
function spawnAsync(args, options) {
  return new Promise((resolve) => {
    const child = spawn('node', args, { ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

async function main() {
console.log('Running skills-manager unit tests...');

// 1. Manifest carrying `ref` parses without error; a version-only change does not
//    mark the skill outdated (update detection stays commit-only).
{
  const manifestWithRef = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-router
      repo: cogNNitive/actioNN
      path: skills/nn-router
      version: "3.2"
      ref: skills-v1.0.0
      commit: "d60a7109315820085ab127b70412992db6986c88"
---
# Manifest`;

  const server = await serveManifestOnce(manifestWithRef);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-'));
  const skillsDir = path.join(tmpDir, 'skills');
  const stateFile = path.join(tmpDir, 'bootstrap-state.json');
  fs.mkdirSync(path.join(skillsDir, 'nn-router'), { recursive: true });
  // Installed state: same commit as manifest, but a stale `version` string —
  // this must NOT be reported as outdated, since update detection is commit-only.
  fs.writeFileSync(stateFile, JSON.stringify({
    manifest: server.url,
    skills: { 'nn-router': { commit: 'd60a7109315820085ab127b70412992db6986c88', version: '2.9' } },
    blueprints: {},
  }, null, 2), 'utf-8');

  try {
    const res = await spawnAsync([managerScript, 'status', '--skills-dir', skillsDir, '--state', stateFile], {
      env: { ...process.env, SM_MANIFEST_URL: server.url },
    });
    assert.strictEqual(res.status, 0, `Manifest with ref should parse without error. stderr: ${res.stderr}`);
    assert.match(res.stdout, /up-to-date/, 'commit match with a stale version string must report up-to-date, not outdated');
    assert.doesNotMatch(res.stdout, /\boutdated\b/, 'a version-only difference must not mark the skill outdated');
    console.log('✔ Manifest ref passthrough + commit-only update detection test passed');
  } finally {
    await server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 2. TTY interactive decision gate (non-TTY without --yes exits code 2)
{
  const manifest = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-test
      repo: cogNNitive/actioNN
      path: skills/nn-test
      version: "1.0"
      commit: "abc1234"
---
# Manifest`;
  const server = await serveManifestOnce(manifest);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-'));
  const skillsDir = path.join(tmpDir, 'skills');
  const stateFile = path.join(tmpDir, 'bootstrap-state.json');

  try {
    const res = await spawnAsync([managerScript, 'install', '--skills-dir', skillsDir, '--state', stateFile], {
      env: { ...process.env, SM_MANIFEST_URL: server.url },
    });
    assert.strictEqual(res.status, 2, `Non-TTY execution without --yes should exit code 2. Got: ${res.status}`);
    assert.match(res.stdout || res.stderr, /needs decision:/);
    console.log('✔ TTY consent gate (needs decision: / exit 2) test passed');
  } finally {
    await server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 3. Legacy state file migration: skills-state.json -> bootstrap-state.json
{
  const manifest = `---
agent-bootstrap:
  version: "2.0"
  skills: []
---
# Manifest`;
  const server = await serveManifestOnce(manifest);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-'));
  const legacyStateFile = path.join(tmpDir, 'skills-state.json');
  const targetStateFile = path.join(tmpDir, 'bootstrap-state.json');

  const legacyContent = {
    manifest: server.url,
    skills: {
      'nn-router': { commit: 'd60a7109315820085ab127b70412992db6986c88', version: '3.2' },
    },
  };
  fs.writeFileSync(legacyStateFile, JSON.stringify(legacyContent, null, 2), 'utf-8');

  try {
    const res = await spawnAsync([managerScript, 'status', '--skills-dir', tmpDir, '--state', targetStateFile], {
      env: { ...process.env, SM_MANIFEST_URL: server.url },
    });
    assert.strictEqual(res.status, 0, `Status execution should succeed. Got stderr: ${res.stderr}`);
    assert(fs.existsSync(targetStateFile), 'bootstrap-state.json should be created after loading legacy state');

    const migrated = JSON.parse(fs.readFileSync(targetStateFile, 'utf-8'));
    assert(migrated.skills['nn-router'], 'Migrated state should contain skills from legacy state');
    assert(migrated.blueprints, 'Migrated state should contain blueprints object');
    console.log('✔ Legacy state file migration test passed');
  } finally {
    await server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 4. Local sync command with --yes
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-'));
  const targetSkillsDir = path.join(tmpDir, 'global-skills');
  fs.mkdirSync(targetSkillsDir, { recursive: true });

  try {
    const res = spawnSync('node', [managerScript, 'sync', '--skills-dir', targetSkillsDir, '--yes'], {
      encoding: 'utf-8',
    });
    assert.strictEqual(res.status, 0, `Sync command with --yes should succeed. Got: ${res.stderr || res.stdout}`);
    assert(fs.existsSync(path.join(targetSkillsDir, 'nn-innfo')), 'nn-innfo skill should be synchronized to destination');
    assert(fs.existsSync(path.join(targetSkillsDir, 'nn-innfo', 'templates', 'workspace_spec_iNNfo_NN.md')), 'Bundled template workspace_spec_iNNfo_NN.md should be synchronized');
    console.log('✔ Skill & bundled template sync test passed');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 5. Bootstrap command with --yes and custom scope
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-bootstrap-'));
  const targetSkillsDir = path.join(tmpDir, 'skills');
  const targetTemplatesDir = path.join(tmpDir, 'templates');
  const targetMcpDir = path.join(tmpDir, 'mcp');
  const targetStateFile = path.join(tmpDir, 'state.json');

  const manifestFixture = `---
agent-bootstrap:
  version: "2.0"
  skills: []
  blueprints:
    - name: domaiNN
      repo: cogNNitive/cogNNitive-web
      path: iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md
      version: "V_0-3-0"
      commit: "535ab18b738280bb479015968f8ec38dee6397a9"
  workflows:
    - id: test-wf
      label: Test Workflow
      description: Just a test
      skill: nn-innfo
---
# Manifest`;

  const manifestServer = await serveManifestOnce(manifestFixture);

  // Hermetic GitHub: build the pinned repo tarball locally and serve it from a
  // loopback server. The CLI is spawned with a preload that rewrites GitHub URLs
  // to that server, so nothing leaves the machine (and the offline guard stays on).
  const commit = '535ab18b738280bb479015968f8ec38dee6397a9';
  const repoDirName = `cogNNitive-web-${commit.slice(0, 7)}`;
  const specRel = 'iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md';
  const fixtureRoot = path.join(tmpDir, 'fixture');
  fs.mkdirSync(path.join(fixtureRoot, repoDirName, path.dirname(specRel)), { recursive: true });
  fs.writeFileSync(path.join(fixtureRoot, repoDirName, specRel), 'ROUTE=tarball\n', 'utf-8');
  // On Windows a Git-for-Windows GNU tar earlier on PATH reads `C:\...` as a remote
  // host and cannot extract. Put the Windows bsdtar (System32) first so the CLI's
  // tarball route is exercised on every OS this suite runs on.
  const baseEnv = { ...process.env };
  const bsdtar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  if (process.platform === 'win32') {
    assert(fs.existsSync(bsdtar), `Windows bsdtar not found at ${bsdtar}; the tarball route cannot be exercised`);
    const pathKey = Object.keys(baseEnv).find((k) => k.toLowerCase() === 'path') || 'PATH';
    baseEnv[pathKey] = `${path.dirname(bsdtar)}${path.delimiter}${baseEnv[pathKey] || ''}`;
  }
  const tarName = 'repo.tar.gz';
  const tarRes = spawnSync('tar', ['-czf', tarName, repoDirName], { cwd: fixtureRoot, encoding: 'utf-8', env: baseEnv });
  assert.strictEqual(tarRes.status, 0, `fixture tarball must build. Got: ${tarRes.stderr}`);
  const tarBytes = fs.readFileSync(path.join(fixtureRoot, tarName));
  const requestedPaths = [];
  const githubServer = http.createServer((req, res) => {
    requestedPaths.push(req.url);
    if (req.url === `/codeload.github.com/cogNNitive/cogNNitive-web/tar.gz/${commit}`) {
      res.writeHead(200, { 'Content-Type': 'application/gzip' });
      res.end(tarBytes);
    } else if (req.url === `/raw.githubusercontent.com/cogNNitive/cogNNitive-web/${commit}/${specRel}`) {
      // Fallback route: the CLI uses it when tarball extraction fails (e.g. GNU tar
      // on Windows reads `C:` as a remote host).
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end('ROUTE=raw\n');
    } else {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((resolve) => githubServer.listen(0, '127.0.0.1', resolve));
  const githubPreload = path.join(__dirname, 'lib', 'test-fixtures', 'github-loopback-preload.js').split(path.sep).join('/');

  try {
    const res = await spawnAsync(
      [
        managerScript,
        'bootstrap',
        '--skills-dir', targetSkillsDir,
        '--templates-dir', targetTemplatesDir,
        '--mcp-dir', targetMcpDir,
        '--state', targetStateFile,
        '--yes',
      ],
      {
        env: {
          ...baseEnv,
          SM_MANIFEST_URL: manifestServer.url,
          SM_TEST_GITHUB_PORT: String(githubServer.address().port),
          NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require "${githubPreload}"`.trim(),
        },
      }
    );

    assert.strictEqual(res.status, 0, `Bootstrap command with --yes should succeed. Got: ${res.stderr || res.stdout}`);
    assert(res.stdout.includes('Bootstrap completed successfully!'), 'Output confirms completion');
    assert(res.stdout.includes('Test Workflow'), 'Output lists available workflows');

    const stateContent = fs.readFileSync(targetStateFile, 'utf-8');
    assert.strictEqual(stateContent.charCodeAt(0), 123, 'State file written without BOM');
    const parsedState = JSON.parse(stateContent);
    assert(parsedState.blueprints.domaiNN, 'State records bootstrapped template');
    assert.strictEqual(parsedState.blueprints.domaiNN.commit, commit, 'State records the pinned commit');
    assert(requestedPaths.length > 0 && requestedPaths.every((p) => /^\/(codeload\.github\.com|raw\.githubusercontent\.com)\//.test(p)),
      'every GitHub download was served by the loopback fixture');

    // Assert the route actually taken: the installed template body says which
    // fixture route served it. The tarball route is the primary path.
    const installed = fs.readFileSync(path.join(targetTemplatesDir, 'domaiNN.md'), 'utf-8');
    assert.strictEqual(installed.trim(), 'ROUTE=tarball', `expected the tarball route, got: ${installed.trim()}`);

    console.log('✔ Bootstrap command with --yes test passed');
  } finally {
    await manifestServer.close();
    await new Promise((resolve) => githubServer.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 6. projectSkillsToAgents multi-agent projection test
{
  const { projectSkillsToAgents } = require('./lib/skills-commands.js');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-project-'));
  const canonicalSkillsDir = path.join(tmpDir, '.agents', 'skills');
  const skillSample = path.join(canonicalSkillsDir, 'nn-sample');
  fs.mkdirSync(skillSample, { recursive: true });
  fs.writeFileSync(path.join(skillSample, 'SKILL.md'), '# Sample Skill', 'utf-8');

  const projections = projectSkillsToAgents({
    canonicalSkillsDir,
    homedir: tmpDir,
    targetAgent: 'all',
    silent: true,
  });

  assert(projections.some(p => p.agent === 'opencode' && p.skill === 'nn-sample'), 'Projected to OpenCode');
  assert(projections.some(p => p.agent === 'claude' && p.skill === 'nn-sample'), 'Projected to Claude');
  assert(projections.some(p => p.agent === 'antigravity' && p.skill === 'nn-sample'), 'Projected to Antigravity');

  assert(fs.existsSync(path.join(tmpDir, '.config', 'opencode', 'skills', 'nn-sample', 'SKILL.md')));
  assert(fs.existsSync(path.join(tmpDir, '.claude', 'skills', 'nn-sample', 'SKILL.md')));
  assert(fs.existsSync(path.join(tmpDir, '.gemini', 'config', 'skills', 'nn-sample', 'SKILL.md')));

  console.log('✔ projectSkillsToAgents multi-agent projection test passed');
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// 7. cmdUpdate re-projects even when canonical is up to date
{
  const manifestRaw = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-sample
      repo: cogNNitive/actioNN
      path: skills/nn-sample
      version: "1.0.0"
      commit: "1111111111111111111111111111111111111111"
---
# Manifest`;

  const server = await serveManifestOnce(manifestRaw);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-update-proj-'));
  const skillsDir = path.join(tmpDir, '.agents', 'skills');
  const stateFile = path.join(tmpDir, 'bootstrap-state.json');
  const skillSample = path.join(skillsDir, 'nn-sample');
  fs.mkdirSync(skillSample, { recursive: true });
  fs.writeFileSync(path.join(skillSample, 'SKILL.md'), '# Canonical Sample', 'utf-8');

  fs.writeFileSync(stateFile, JSON.stringify({
    manifest: server.url,
    skills: { 'nn-sample': { commit: '1111111111111111111111111111111111111111', version: '1.0.0' } },
    blueprints: {},
  }, null, 2), 'utf-8');

  try {
    const res = await spawnAsync([
      managerScript, 'update',
      '--skills-dir', skillsDir,
      '--state', stateFile,
      '--agent', 'claude',
      '--yes',
    ], {
      env: { ...process.env, USERPROFILE: tmpDir, HOME: tmpDir, SM_MANIFEST_URL: server.url },
    });

    assert.strictEqual(res.status, 0, `cmdUpdate should succeed. Stderr: ${res.stderr}`);
    assert(res.stdout.includes('All skills, templates, and console assets up to date'), 'Reports up to date');
    assert(fs.existsSync(path.join(tmpDir, '.claude', 'skills', 'nn-sample', 'SKILL.md')), 'Projected to claude');

    const updatedState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    assert(updatedState.projections && updatedState.projections.claude, 'State records projections');
    assert(updatedState.projections.claude.skills['nn-sample'], 'State records projected skill');

    console.log('✔ cmdUpdate up-to-date projection test passed');
  } finally {
    await server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 8. --scope workspace skips projection
{
  const { projectSkillsToAgents } = require('./lib/skills-commands.js');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-workspace-'));
  const canonicalSkillsDir = path.join(tmpDir, '.agents', 'skills');
  const skillSample = path.join(canonicalSkillsDir, 'nn-sample');
  fs.mkdirSync(skillSample, { recursive: true });
  fs.writeFileSync(path.join(skillSample, 'SKILL.md'), '# Workspace Skill', 'utf-8');

  const projections = projectSkillsToAgents({
    canonicalSkillsDir,
    homedir: tmpDir,
    targetAgent: 'all',
    scope: 'workspace',
    silent: true,
  });

  assert.strictEqual(projections.length, 0, 'Workspace scope must not project');
  assert.strictEqual(fs.existsSync(path.join(tmpDir, '.claude', 'skills', 'nn-sample')), false);

  console.log('✔ --scope workspace skips projection test passed');
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// 9. ADR-2 Ownership and unmanaged link/dir handling
{
  const { projectSkillsToAgents } = require('./lib/skills-commands.js');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-ownership-'));
  const canonicalSkillsDir = path.join(tmpDir, '.agents', 'skills');
  const skillSample = path.join(canonicalSkillsDir, 'nn-sample');
  fs.mkdirSync(skillSample, { recursive: true });
  fs.writeFileSync(path.join(skillSample, 'SKILL.md'), '# Canonical Skill', 'utf-8');

  // Pre-create an unmanaged foreign real dir with different content
  const foreignDir = path.join(tmpDir, '.claude', 'skills', 'nn-sample');
  fs.mkdirSync(foreignDir, { recursive: true });
  fs.writeFileSync(path.join(foreignDir, 'SKILL.md'), '# Foreign Content', 'utf-8');

  const state = { manifest: 'dummy', skills: { 'nn-sample': { version: '1.0' } }, blueprints: {}, projections: {} };

  const projections = projectSkillsToAgents({
    canonicalSkillsDir,
    homedir: tmpDir,
    targetAgent: 'claude',
    state,
    silent: true,
  });

  const proj = projections.find(p => p.agent === 'claude' && p.skill === 'nn-sample');
  assert(proj && proj.action === 'skip', 'Unmanaged foreign directory must be skipped');
  assert.strictEqual(fs.readFileSync(path.join(foreignDir, 'SKILL.md'), 'utf-8'), '# Foreign Content', 'Foreign content must not be overwritten');

  console.log('✔ ADR-2 unmanaged directory protection test passed');
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// 10. Embedded skill projection: a bluepriNNt package carrying skills/<name>/ installs each
//     skill into skillsDir, preserving node_modules, without touching the real home dir.
//     downloadFile and extractTarball are faked by patching github-client / atomic-fs BEFORE a
//     fresh load of skills-commands (both are destructured at require time), so there is no
//     network, no tar binary dependency and no ~/.agents access.
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-embedded-'));
  const githubClientPath = require.resolve('./lib/github-client.js');
  const commandsPath = require.resolve('./lib/skills-commands.js');
  const atomicFsPath = require.resolve('./lib/atomic-fs.js');
  const realDownload = require(githubClientPath).downloadFile;
  const realExtract = require(atomicFsPath).extractTarball;
  const realCommands = require.cache[commandsPath];

  const buildTarball = (variant, withSkills) => {
    const root = path.join(tmpDir, `repo-${variant}`, 'repo-abc');
    const pkg = path.join(root, 'video');
    fs.mkdirSync(pkg, { recursive: true });
    fs.writeFileSync(path.join(pkg, 'spec_NN.md'), '# video', 'utf-8');
    if (withSkills) {
      fs.mkdirSync(path.join(pkg, 'skills', 'x', 'scripts'), { recursive: true });
      fs.writeFileSync(
        path.join(pkg, 'skills', 'x', 'SKILL.md'),
        `---\nname: x\nversion: V_0-4-0\ndescription: embedded\n---\n# x ${variant}\n`,
        'utf-8',
      );
      fs.writeFileSync(path.join(pkg, 'skills', 'x', 'scripts', 'run.mjs'), `// ${variant}\n`, 'utf-8');
    }
    return path.join(tmpDir, `repo-${variant}`);
  };

  let currentFixture = null;
  const downloads = [];
  require(githubClientPath).downloadFile = async (url, dest) => {
    downloads.push(url);
    assert.ok(currentFixture, 'downloadFile fake needs a fixture tree');
    fs.writeFileSync(dest, 'fake-tarball', 'utf-8');
  };
  require(atomicFsPath).extractTarball = (tarFile, destDir) => {
    assert.strictEqual(fs.readFileSync(tarFile, 'utf-8'), 'fake-tarball', 'extract must receive the faked download');
    fs.cpSync(currentFixture, destDir, { recursive: true });
  };
  delete require.cache[commandsPath];
  const { installBlueprintAtCommit } = require('./lib/skills-commands.js');

  const template = { name: 'video', repo: 'o/r', path: 'video', commit: 'abc1234', version: 'V_0-8-0' };
  const newState = () => ({ manifest: 'dummy', skills: {}, blueprints: {}, projections: {} });

  try {
    // 3.1 Install projects skills/x to skillsDir/x and records state
    {
      const blueprintsDir = path.join(tmpDir, 'a', 'bluepriNNts');
      const skillsDir = path.join(tmpDir, 'a', 'skills');
      const state = newState();
      currentFixture = buildTarball('one', true);
      const names = await installBlueprintAtCommit(template, blueprintsDir, state, skillsDir);

      assert.deepStrictEqual(names, ['x'], 'must report the projected skill names');
      assert.ok(fs.existsSync(path.join(skillsDir, 'x', 'SKILL.md')), 'SKILL.md must be projected');
      assert.ok(fs.existsSync(path.join(skillsDir, 'x', 'scripts', 'run.mjs')), 'nested files must be projected');
      assert.strictEqual(state.skills.x.commit, 'abc1234');
      assert.strictEqual(state.skills.x.version, 'V_0-4-0');
      assert.strictEqual(state.skills.x.source_blueprint, 'video');
      assert.ok(state.skills.x.updated_at, 'updated_at must be recorded');
      assert.ok(downloads.every((u) => u.includes('codeload.github.com')), 'fake saw the expected URL');
      console.log('✔ Embedded skill projects to skillsDir and records state');
    }

    // 3.2a Re-install keeps node_modules and updates changed files; standalone dir is overwritten
    {
      const blueprintsDir = path.join(tmpDir, 'b', 'bluepriNNts');
      const skillsDir = path.join(tmpDir, 'b', 'skills');
      const state = newState();
      fs.mkdirSync(path.join(skillsDir, 'x', 'node_modules', 'remotion'), { recursive: true });
      fs.writeFileSync(path.join(skillsDir, 'x', 'node_modules', 'remotion', 'index.js'), 'dep', 'utf-8');
      fs.writeFileSync(path.join(skillsDir, 'x', 'SKILL.md'), '# standalone leftover', 'utf-8');
      fs.writeFileSync(path.join(skillsDir, 'x', 'stale.txt'), 'old', 'utf-8');

      currentFixture = buildTarball('two', true);
      await installBlueprintAtCommit(template, blueprintsDir, state, skillsDir);

      assert.ok(
        fs.existsSync(path.join(skillsDir, 'x', 'node_modules', 'remotion', 'index.js')),
        'node_modules must survive a re-install',
      );
      assert.match(fs.readFileSync(path.join(skillsDir, 'x', 'SKILL.md'), 'utf-8'), /# x two/, 'standalone dir must be overwritten');
      assert.strictEqual(fs.existsSync(path.join(skillsDir, 'x', 'stale.txt')), false, 'stale files must be removed');
      assert.match(fs.readFileSync(path.join(skillsDir, 'x', 'scripts', 'run.mjs'), 'utf-8'), /two/);
      console.log('✔ Embedded skill re-install keeps node_modules and overwrites standalone dir');
    }

    // 3.2b A package without skills/ projects nothing
    {
      const blueprintsDir = path.join(tmpDir, 'c', 'bluepriNNts');
      const skillsDir = path.join(tmpDir, 'c', 'skills');
      const state = newState();
      currentFixture = buildTarball('three', false);
      const names = await installBlueprintAtCommit(template, blueprintsDir, state, skillsDir);

      assert.deepStrictEqual(names, []);
      assert.deepStrictEqual(state.skills, {});
      assert.strictEqual(fs.existsSync(skillsDir), false, 'no skillsDir must be created');
      console.log('✔ Package without skills/ projects nothing');
    }

    // Stub self-check: the fake must be what ran (never the real network/home dir)
    assert.ok(downloads.length >= 3, 'downloadFile fake must have been exercised');
  } finally {
    require(githubClientPath).downloadFile = realDownload;
    require(atomicFsPath).extractTarball = realExtract;
    delete require.cache[commandsPath];
    if (realCommands) require.cache[commandsPath] = realCommands;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ADR / Monorepo release manifest fallback URL agreement test
{
  const { FALLBACK_MANIFEST_URL: smFallback } = require('./lib/skills-commands.js');
  const { FALLBACK_MANIFEST_URL: pfFallback } = require('../skills/nn-preflight/scripts/preflight-check.js');
  const expectedUrl = 'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/docs/use/manifest.md';
  assert.strictEqual(smFallback, expectedUrl, 'skills-commands FALLBACK_MANIFEST_URL must point to cogNNitive-web');
  assert.strictEqual(pfFallback, expectedUrl, 'preflight-check FALLBACK_MANIFEST_URL must point to cogNNitive-web');
  console.log('✔ Fallback manifest URL agreement test passed');
}

console.log('All skills-manager unit tests passed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
