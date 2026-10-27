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

// 8b. cmdUpdate completes a partially installed console asset set, but does not start one
{
  const mkManifest = (base) => `---
agent-bootstrap:
  version: "2.0"
  skills: []
  blueprints: []
  console-assets:
    - file: scripts/export-console.mjs
      version: "0.10.0"
      ref: "nn-console-v0.10.0"
      commit: "2222222222222222222222222222222222222222"
      url: ${base}/export-console.mjs
    - file: scripts/console-views.mjs
      version: "0.10.0"
      ref: "nn-console-v0.10.0"
      commit: "2222222222222222222222222222222222222222"
      url: ${base}/console-views.mjs
---
# Manifest`;
  const run = async (preinstall) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-update-console-'));
    const consoleDir = path.join(tmpDir, 'console');
    const stateFile = path.join(tmpDir, 'bootstrap-state.json');
    fs.mkdirSync(consoleDir, { recursive: true });
    if (preinstall) fs.writeFileSync(path.join(consoleDir, 'export-console.mjs'), '// old', 'utf-8');
    const srv = await new Promise((resolve) => {
      const http2 = require('node:http');
      let base = '';
      const sv = http2.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(req.url === '/manifest.md' ? mkManifest(base) : '// new');
      });
      sv.listen(0, '127.0.0.1', () => {
        base = 'http://127.0.0.1:' + sv.address().port;
        resolve({ url: base + '/manifest.md', close: () => new Promise((r) => sv.close(r)) });
      });
    });
    try {
      fs.writeFileSync(stateFile, JSON.stringify({ manifest: srv.url, skills: {}, blueprints: {}, console: {} }), 'utf-8');
      const res = await spawnAsync([managerScript, 'update', '--skills-dir', path.join(tmpDir, 'skills'), '--templates-dir', path.join(tmpDir, 'bp'), '--console-dir', consoleDir, '--state', stateFile, '--scope', 'workspace', '--yes'], {
        env: { ...process.env, USERPROFILE: tmpDir, HOME: tmpDir, SM_MANIFEST_URL: srv.url },
      });
      assert.strictEqual(res.status, 0, `update should succeed. stderr: ${res.stderr}`);
      return { consoleDir, res };
    } finally {
      await srv.close();
    }
  };
  const partial = await run(true);
  assert(fs.existsSync(path.join(partial.consoleDir, 'console-views.mjs')), 'update installs the missing member of a partially installed console set');
  assert.strictEqual(fs.readFileSync(path.join(partial.consoleDir, 'export-console.mjs'), 'utf-8'), '// new', 'update refreshes the present member');
  const empty = await run(false);
  assert(!fs.existsSync(path.join(empty.consoleDir, 'console-views.mjs')), 'update does not start a console set that was never installed');
  console.log('✔ cmdUpdate completes a partial console asset set test passed');
}

// 8c. MCP servers declared nested inside the owning skill are visible to
//     status / install / update, and positional filters still select them.
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-mcp-nested-'));
  const skillsDir = path.join(tmpDir, 'skills');
  const blueprintsDir = path.join(tmpDir, 'bluepriNNts');
  const mcpDir = path.join(tmpDir, 'mcp');
  const stateFile = path.join(tmpDir, 'bootstrap-state.json');
  const home = path.join(tmpDir, 'home');
  // The owning skill is already present, so install/update skip it and only the
  // nested MCP server is exercised — no GitHub tarball traffic.
  fs.mkdirSync(path.join(skillsDir, 'nn-innfo'), { recursive: true });
  fs.mkdirSync(home, { recursive: true });

  const mcpCommit = '94e43dfd764e2d88da3c8e32312c170b7311a055';
  const skillCommit = 'd60a7109315820085ab127b70412992db6986c88';
  // The owning skill is recorded up-to-date so update selects only the MCP server.
  fs.writeFileSync(stateFile, JSON.stringify({
    manifest: '',
    skills: { 'nn-innfo': { commit: skillCommit, version: 'V_0-5-13' } },
    blueprints: {},
    mcp: {},
    console: {},
    projections: {},
  }, null, 2), 'utf-8');
  const commonFlags = [
    '--skills-dir', skillsDir,
    '--templates-dir', blueprintsDir,
    '--mcp-dir', mcpDir,
    '--state', stateFile,
    '--agent', 'opencode',
    '--scope', 'workspace',
  ];

  let base = '';
  const server = http.createServer((req, res) => {
    if (req.url === '/manifest.md') {
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(`---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-innfo
      repo: cogNNitive/cogNNitive-web
      path: skills/nn-innfo
      version: "V_0-5-13"
      commit: "${skillCommit}"
      mcp:
        - name: nn-mcp
          repo: cogNNitive/cogNNitive-web
          path: iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js
          version: "0.27.0"
          ref: "nn-mcp-v0.27.0"
          commit: "${mcpCommit}"
          url: ${base}/nn-mcp.bundle.js
---
# Manifest`);
    } else if (req.url === '/nn-mcp.bundle.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end('module.exports = {};\n');
    } else {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const env = { ...process.env, USERPROFILE: home, HOME: home, SM_MANIFEST_URL: `${base}/manifest.md` };

  try {
    // status surfaces the nested MCP server as a `mcp` row
    const st = await spawnAsync([managerScript, 'status', ...commonFlags], { env });
    assert.strictEqual(st.status, 0, `status must succeed. stderr: ${st.stderr}`);
    assert.match(
      st.stdout,
      /mcp\s*\|\s*nn-mcp\s*\|\s*94e43df\s*\|\s*-\s*\|\s*missing/,
      `status must list the nested MCP server. Got:\n${st.stdout}`,
    );

    // install downloads the missing bundle and records { commit, version, updated_at }
    const ins = await spawnAsync([managerScript, 'install', ...commonFlags, '--yes'], { env });
    assert.strictEqual(ins.status, 0, `install must succeed. stderr: ${ins.stderr}`);
    assert.ok(fs.existsSync(path.join(mcpDir, 'nn-mcp.bundle.js')), 'install must download the MCP bundle');
    let state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    assert.strictEqual(state.mcp['nn-mcp'].commit, mcpCommit, 'install must record the MCP commit');
    assert.strictEqual(state.mcp['nn-mcp'].version, '0.27.0', 'install must record the MCP version');
    assert.ok(state.mcp['nn-mcp'].updated_at, 'install must record updated_at');

    // update upgrades an outdated bundle
    state.mcp['nn-mcp'].commit = '0'.repeat(40);
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
    const upd = await spawnAsync([managerScript, 'update', ...commonFlags, '--yes'], { env });
    assert.strictEqual(upd.status, 0, `update must succeed. stderr: ${upd.stderr}`);
    assert.match(upd.stdout, /updated MCP nn-mcp -> 0\.27\.0/, `update must upgrade the MCP bundle. Got:\n${upd.stdout}`);
    state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    assert.strictEqual(state.mcp['nn-mcp'].commit, mcpCommit, 'update must record the upgraded MCP commit');
    assert.ok(state.mcp['nn-mcp'].updated_at, 'update must record updated_at');

    // positional filters: `update nn-mcp` and `update mcp`
    for (const filter of ['nn-mcp', 'mcp']) {
      state.mcp['nn-mcp'].commit = '0'.repeat(40);
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
      const r = await spawnAsync([managerScript, 'update', filter, ...commonFlags, '--yes'], { env });
      assert.strictEqual(r.status, 0, `update ${filter} must succeed. stderr: ${r.stderr}`);
      assert.match(r.stdout, /updated MCP nn-mcp/, `update ${filter} must select the MCP server. Got:\n${r.stdout}`);
    }

    console.log('✔ Nested MCP server status/install/update + positional filters test passed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 8d. D10: a pre-cutover `innfo-mcp` state entry, legacy bundle file and
//     user-config key migrate to `nn-mcp`; re-running is a no-op.
{
  const { migrateLegacyMcpState } = require('./lib/skills-commands.js');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-mcp-migrate-'));
  const mcpDir = path.join(tmpDir, 'mcp');
  fs.mkdirSync(mcpDir, { recursive: true });
  fs.writeFileSync(path.join(mcpDir, 'innfo-mcp.bundle.js'), '// legacy bundle\n');

  const state = { mcp: { 'innfo-mcp': { commit: 'abc', version: '0.29.0' } } };
  assert.strictEqual(migrateLegacyMcpState(state, mcpDir), true, 'first migration must report a change');
  assert.deepStrictEqual(state.mcp['nn-mcp'], { commit: 'abc', version: '0.29.0' }, 'the state entry moves to nn-mcp');
  assert.ok(!state.mcp['innfo-mcp'], 'the legacy state entry is gone');
  assert.ok(fs.existsSync(path.join(mcpDir, 'nn-mcp.bundle.js')), 'the legacy bundle is renamed');
  assert.ok(!fs.existsSync(path.join(mcpDir, 'innfo-mcp.bundle.js')), 'the legacy bundle is deleted');
  assert.strictEqual(migrateLegacyMcpState(state, mcpDir), false, 'second migration changes nothing');

  const { registerMcpForOpenCode } = require('./lib/mcp-config-adapter.js');
  const configFile = path.join(tmpDir, 'opencode.json');
  fs.writeFileSync(configFile, JSON.stringify({ mcp: { 'innfo-mcp': { type: 'local', command: ['node', 'x'], cwd: '.', enabled: true } } }), 'utf-8');
  registerMcpForOpenCode({ configFile, serverName: 'nn-mcp', bundlePath: path.join(mcpDir, 'nn-mcp.bundle.js') });
  const cfg = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  assert.ok(!cfg.mcp['innfo-mcp'], 'the legacy config key is removed');
  assert.ok(cfg.mcp['nn-mcp'], 'the nn-mcp config key is registered');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('✔ D10 legacy innfo-mcp state/bundle/config migration is idempotent');
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

    // 3.3 Projection failure: the blueprint must NOT be recorded (so a later run retries), skills
    //     projected before the failure stay recorded, and a fresh package dir is rolled back.
    //     Failure injected with a skill whose SKILL.md is a directory (readFileSync -> EISDIR),
    //     ordered after a good skill ("a" < "b").
    {
      const blueprintsDir = path.join(tmpDir, 'd', 'bluepriNNts');
      const skillsDir = path.join(tmpDir, 'd', 'skills');
      const state = newState();
      const root = path.join(tmpDir, 'repo-fail');
      const pkg = path.join(root, 'repo-abc', 'video');
      fs.mkdirSync(path.join(pkg, 'skills', 'a'), { recursive: true });
      fs.writeFileSync(path.join(pkg, 'skills', 'a', 'SKILL.md'), '---\nname: a\nversion: V_0-1-0\n---\n', 'utf-8');
      fs.mkdirSync(path.join(pkg, 'skills', 'b', 'SKILL.md'), { recursive: true });
      fs.writeFileSync(path.join(pkg, 'spec_NN.md'), '# video', 'utf-8');
      currentFixture = root;

      let caught = null;
      try {
        await installBlueprintAtCommit(template, blueprintsDir, state, skillsDir);
      } catch (err) {
        caught = err;
      }
      assert.ok(caught, 'a projection failure must propagate');
      assert.strictEqual(state.blueprints.video, undefined, 'blueprint must not be recorded after a failed projection');
      assert.ok(state.skills.a, 'skill projected before the failure must stay recorded');
      assert.deepStrictEqual(caught.projectedSkills, ['a'], 'partial projections must be reported to the caller');
      assert.strictEqual(fs.existsSync(path.join(blueprintsDir, 'video')), false, 'fresh package dir must be rolled back so bootstrap retries');
      console.log('✔ Projection failure leaves the blueprint unrecorded and retryable');
    }

    // 3.4 cmdUpdate with a positional blueprint name projects the embedded skills to the agent dir
    {
      const { cmdUpdate } = require('./lib/skills-commands.js');
      const blueprintsDir = path.join(tmpDir, 'e', 'bluepriNNts');
      const skillsDir = path.join(tmpDir, 'e', 'skills');
      const fakeHome = path.join(tmpDir, 'e', 'home');
      const stateFile = path.join(tmpDir, 'e', 'state.json');
      fs.mkdirSync(path.join(blueprintsDir, 'video'), { recursive: true });
      fs.mkdirSync(fakeHome, { recursive: true });
      fs.writeFileSync(
        stateFile,
        JSON.stringify({ manifest: 'dummy', skills: {}, blueprints: { video: { commit: 'old0000', version: 'V_0-7-2', path: path.join(blueprintsDir, 'video') } }, projections: {} }),
        'utf-8',
      );
      currentFixture = buildTarball('four', true);
      const manifest = `---
agent-bootstrap:
  version: "2.0"
  skills: []
  blueprints:
    - name: video
      repo: o/r
      path: video
      version: "V_0-8-0"
      commit: "abc1234"
---
# Manifest`;
      const manifestServer = await serveManifestOnce(manifest);
      const envKeys = ['SM_MANIFEST_URL', 'HOME', 'USERPROFILE'];
      const savedEnv = Object.fromEntries(envKeys.map((k) => [k, process.env[k]]));
      process.env.SM_MANIFEST_URL = manifestServer.url;
      process.env.HOME = fakeHome;
      process.env.USERPROFILE = fakeHome;
      try {
        await cmdUpdate({ skillsDir, blueprintsDir, stateFile, positional: ['video'], yes: true, agent: 'claude', scope: 'global' });
        assert.ok(fs.existsSync(path.join(skillsDir, 'x', 'SKILL.md')), 'embedded skill must be installed');
        assert.ok(
          fs.existsSync(path.join(fakeHome, '.claude', 'skills', 'x')),
          'embedded skill must be projected to the agent dir on a positional blueprint update',
        );
        console.log('✔ Positional blueprint update projects embedded skills to agents');
      } finally {
        for (const k of envKeys) {
          if (savedEnv[k] === undefined) delete process.env[k];
          else process.env[k] = savedEnv[k];
        }
        await manifestServer.close();
      }
    }

    // Stub self-check: the fake must be what ran (never the real network/home dir).
    // All sub-cases share (repo 'o/r', commit 'abc1234'), so the session tarball
    // cache serves every re-install from a single deduplicated download.
    assert.strictEqual(downloads.length, 1, 'downloadFile fake must have run exactly once for the shared (repo, commit)');
    assert.ok(downloads.every((u) => u.includes('codeload.github.com')), 'fake saw only codeload URLs');
  } finally {
    require(githubClientPath).downloadFile = realDownload;
    require(atomicFsPath).extractTarball = realExtract;
    delete require.cache[commandsPath];
    if (realCommands) require.cache[commandsPath] = realCommands;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 11. Referenced external skill install: verify the sha256 tree digest before the
//     atomic swap. A mismatch must throw and write nothing. Mocks as in block 10.
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-external-'));
  const githubClientPath = require.resolve('./lib/github-client.js');
  const commandsPath = require.resolve('./lib/skills-commands.js');
  const atomicFsPath = require.resolve('./lib/atomic-fs.js');
  const realDownload = require(githubClientPath).downloadFile;
  const realExtract = require(atomicFsPath).extractTarball;
  const realCommands = require.cache[commandsPath];
  const { skillTreeDigest } = require('./lib/skill-tree-digest.js');

  const buildRepo = (variant) => {
    const repoRoot = path.join(tmpDir, `ext-${variant}`);
    const skill = path.join(repoRoot, 'repo-abc', 'skills', 'ext');
    fs.mkdirSync(path.join(skill, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(skill, 'SKILL.md'), `---\nname: ext\n---\n# ext ${variant}\n`, 'utf-8');
    fs.writeFileSync(path.join(skill, 'scripts', 'run.mjs'), `// ${variant}\n`, 'utf-8');
    return { repoRoot, skillDir: skill };
  };

  let currentFixture = null;
  require(githubClientPath).downloadFile = async (url, dest) => { fs.writeFileSync(dest, 'fake', 'utf-8'); };
  require(atomicFsPath).extractTarball = (tarFile, destDir) => { fs.cpSync(currentFixture, destDir, { recursive: true }); };
  delete require.cache[commandsPath];
  const { installSkillAtCommit } = require('./lib/skills-commands.js');
  const newState = () => ({ skills: {} });

  try {
    // 11.1 a matching digest installs
    {
      const { repoRoot, skillDir } = buildRepo('good');
      currentFixture = repoRoot;
      const digest = skillTreeDigest(skillDir);
      const skillsDir = path.join(tmpDir, 'g', 'skills');
      const state = newState();
      await installSkillAtCommit({ name: 'ext', repo: 'o/r', path: 'skills/ext', commit: 'a'.repeat(40), sha256: digest }, skillsDir, state);
      assert.ok(fs.existsSync(path.join(skillsDir, 'ext', 'SKILL.md')), 'matching digest must install');
      console.log('✔ external skill installs when the digest matches');
    }

    // 11.2 a mismatched digest throws and writes nothing
    {
      const { repoRoot } = buildRepo('bad');
      currentFixture = repoRoot;
      const skillsDir = path.join(tmpDir, 'b', 'skills');
      const state = newState();
      let caught = null;
      try {
        await installSkillAtCommit({ name: 'ext', repo: 'o/r', path: 'skills/ext', commit: 'a'.repeat(40), sha256: 'f'.repeat(64) }, skillsDir, state);
      } catch (err) { caught = err; }
      assert.ok(caught && /integrity mismatch/.test(caught.message), 'a digest mismatch must throw');
      assert.strictEqual(fs.existsSync(path.join(skillsDir, 'ext')), false, 'nothing must be written on mismatch');
      console.log('✔ digest mismatch writes nothing');
    }

    // 11.3 no sha256 → commit-only install
    {
      const { repoRoot } = buildRepo('nosha');
      currentFixture = repoRoot;
      const skillsDir = path.join(tmpDir, 'n', 'skills');
      const state = newState();
      await installSkillAtCommit({ name: 'ext', repo: 'o/r', path: 'skills/ext', commit: 'a'.repeat(40) }, skillsDir, state);
      assert.ok(fs.existsSync(path.join(skillsDir, 'ext', 'SKILL.md')), 'commit-only install must work');
      console.log('✔ commit-only install works without sha256');
    }
  } finally {
    require(githubClientPath).downloadFile = realDownload;
    require(atomicFsPath).extractTarball = realExtract;
    delete require.cache[commandsPath];
    if (realCommands) require.cache[commandsPath] = realCommands;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 11b. Session tarball cache: repeated (repo, commit) fetches download one archive,
//      a distinct commit downloads again, resetTarballCache() re-enables a fresh
//      download, and a download failure keeps withRetiredHint behavior. Mocks as in
//      blocks 10/11 (patch github-client before a fresh load of skills-commands).
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-tarball-'));
  const githubClientPath = require.resolve('./lib/github-client.js');
  const commandsPath = require.resolve('./lib/skills-commands.js');
  const realDownload = require(githubClientPath).downloadFile;
  const realCommands = require.cache[commandsPath];

  const downloads = [];
  require(githubClientPath).downloadFile = async (url, dest) => {
    downloads.push(url);
    fs.writeFileSync(dest, 'fake-tarball', 'utf-8');
  };
  delete require.cache[commandsPath];
  const { fetchRepoCommitTarball, resetTarballCache } = require('./lib/skills-commands.js');

  try {
    const item = { name: 'x', repo: 'o/r', commit: 'a'.repeat(40) };
    const first = await fetchRepoCommitTarball(item);
    const second = await fetchRepoCommitTarball(item);
    assert.strictEqual(first, second, 'same (repo, commit) must reuse the cached archive path');
    assert.strictEqual(downloads.length, 1, 'only one codeload download per (repo, commit)');
    assert.match(downloads[0], /^https:\/\/codeload\.github\.com\/o\/r\/tar\.gz\//);
    assert.ok(fs.existsSync(first), 'cached archive must exist on disk');

    await fetchRepoCommitTarball({ name: 'y', repo: 'o/r', commit: 'b'.repeat(40) });
    assert.strictEqual(downloads.length, 2, 'a distinct commit downloads its own archive');

    resetTarballCache();
    assert.strictEqual(fs.existsSync(first), false, 'resetTarballCache removes the cached temp archive');
    await fetchRepoCommitTarball(item);
    assert.strictEqual(downloads.length, 3, 'resetTarballCache re-enables a fresh download');

    // A failed download is surfaced through withRetiredHint for retired repos.
    require(githubClientPath).downloadFile = async () => {
      throw new Error('Failed to download https://codeload.github.com/x, status: 404');
    };
    delete require.cache[commandsPath];
    const { fetchRepoCommitTarball: fetchRetired } = require('./lib/skills-commands.js');
    let caught = null;
    try {
      await fetchRetired({ name: 'z', repo: 'cogNNitive/cogNNitive', commit: 'c'.repeat(40) });
    } catch (err) { caught = err; }
    assert.ok(caught && /retired repo/.test(caught.message), 'download failure on a retired repo keeps the migration hint');

    console.log('✔ Session tarball cache dedup + resetTarballCache + retired-hint test passed');
  } finally {
    require(githubClientPath).downloadFile = realDownload;
    delete require.cache[commandsPath];
    if (realCommands) require.cache[commandsPath] = realCommands;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// 12. On-demand catalog blueprint install: `install --blueprint <name>` resolves the
//     catalog release pin, installs the package, and projects embedded skills to the
//     agent dir. Mocks as in blocks 10/11 (patch github-client / atomic-fs before a
//     fresh load of skills-commands).
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actioNN-test-catalog-'));
  const githubClientPath = require.resolve('./lib/github-client.js');
  const commandsPath = require.resolve('./lib/skills-commands.js');
  const atomicFsPath = require.resolve('./lib/atomic-fs.js');
  const realDownload = require(githubClientPath).downloadFile;
  const realExtract = require(atomicFsPath).extractTarball;
  const realCommands = require.cache[commandsPath];

  const fixtureRoot = path.join(tmpDir, 'repo-org');
  const pkg = path.join(fixtureRoot, 'repo-abc', 'iNNfo', 'specs', 'bluepriNNts', 'organization');
  fs.mkdirSync(path.join(pkg, 'skills', 'nn-org'), { recursive: true });
  fs.writeFileSync(path.join(pkg, 'spec_NN.md'), '---\nblueprint_version: "V_0-4-0"\nlevel: 2\n---\n# org', 'utf-8');
  fs.writeFileSync(
    path.join(pkg, 'skills', 'nn-org', 'SKILL.md'),
    '---\nname: nn-org\nversion: V_1-0-0\n---\n# nn-org',
    'utf-8',
  );

  const catalogPath = path.join(tmpDir, 'catalog.json');
  fs.writeFileSync(
    catalogPath,
    JSON.stringify({
      blueprints: {
        organization: {
          name: 'organization',
          adopted: 'V_0-4-0',
          tier: 'free',
          access: 'public',
          when_to_use: 'Model an organization',
          release_tag: 'blueprints-v0.39.0',
          embedded_skills: ['nn-org'],
        },
      },
    }),
    'utf-8',
  );

  const downloads = [];
  require(githubClientPath).downloadFile = async (url, dest) => {
    downloads.push(url);
    fs.writeFileSync(dest, 'fake-tarball', 'utf-8');
  };
  require(atomicFsPath).extractTarball = (tarFile, destDir) => {
    fs.cpSync(fixtureRoot, destDir, { recursive: true });
  };
  delete require.cache[commandsPath];
  const { cmdInstallBlueprint, loadBlueprintCatalog } = require('./lib/skills-commands.js');

  const saveEnv = (keys) => Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const restoreEnv = (saved) => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };

  try {
    const blueprintsDir = path.join(tmpDir, 'out', 'bluepriNNts');
    const skillsDir = path.join(tmpDir, 'out', 'skills');
    const stateFile = path.join(tmpDir, 'out', 'state.json');
    const fakeHome = path.join(tmpDir, 'out', 'home');
    fs.mkdirSync(fakeHome, { recursive: true });
    const saved = saveEnv(['HOME', 'USERPROFILE']);
    process.env.HOME = fakeHome;
    process.env.USERPROFILE = fakeHome;
    try {
      await cmdInstallBlueprint({
        blueprint: 'organization',
        catalogPath,
        repo: 'o/r',
        blueprintsDir,
        skillsDir,
        stateFile,
        yes: true,
        agent: 'claude',
        scope: 'global',
      });
    } finally {
      restoreEnv(saved);
    }

    assert.ok(fs.existsSync(path.join(blueprintsDir, 'organization', 'spec_NN.md')), 'blueprint package must be installed');
    assert.ok(fs.existsSync(path.join(skillsDir, 'nn-org', 'SKILL.md')), 'embedded skill must be projected to the skills dir');
    assert.ok(
      fs.existsSync(path.join(fakeHome, '.claude', 'skills', 'nn-org')),
      'embedded skill must be projected to the agent dir',
    );
    assert.ok(downloads.some((u) => u.includes('blueprints-v0.39.0')), 'must download from the catalog release pin');

    // Unknown blueprint name is rejected before any download.
    let caught = null;
    try {
      await cmdInstallBlueprint({ blueprint: 'nope', catalogPath, blueprintsDir, skillsDir, stateFile, yes: true });
    } catch (err) { caught = err; }
    assert.ok(caught && /not in the catalog/.test(caught.message), 'unknown blueprint must be rejected');

    // Unreleased entry (release_tag: null) is refused before any download.
    const unreleasedPath = path.join(tmpDir, 'catalog-unreleased.json');
    fs.writeFileSync(
      unreleasedPath,
      JSON.stringify({
        blueprints: { organization: { name: 'organization', adopted: 'V_0-4-0', release_tag: null, embedded_skills: ['nn-org'] } },
      }),
      'utf-8',
    );
    const downloadsBefore = downloads.length;
    caught = null;
    try {
      await cmdInstallBlueprint({ blueprint: 'organization', catalogPath: unreleasedPath, repo: 'o/r', blueprintsDir, skillsDir, stateFile, yes: true });
    } catch (err) { caught = err; }
    assert.ok(caught && /not yet released/.test(caught.message), 'unreleased blueprint must be refused');
    assert.strictEqual(downloads.length, downloadsBefore, 'unreleased blueprint must not download');

    // Catalog resolution: a URL override is fetched (not the in-repo file).
    const served = await serveManifestOnce(
      JSON.stringify({ blueprints: { x: { name: 'x', release_tag: 'blueprints-v1.0.0' } } }),
    );
    const savedCatalogEnv = process.env.COGNNITIVE_CATALOG;
    try {
      process.env.COGNNITIVE_CATALOG = served.url;
      const fromUrl = await loadBlueprintCatalog();
      assert.strictEqual(fromUrl.blueprints.x.release_tag, 'blueprints-v1.0.0', 'catalog resolves from an explicit URL');
    } finally {
      if (savedCatalogEnv === undefined) delete process.env.COGNNITIVE_CATALOG;
      else process.env.COGNNITIVE_CATALOG = savedCatalogEnv;
      await served.close();
    }

    console.log('✔ on-demand catalog blueprint install + skill projection test passed');
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

// End to end on the REAL video-script package: project its embedded skill into a temp skills dir
// and run the projected CLI from a cwd with no monorepo around it. The projected scripts must run
// from the committed skill alone (node builtins only), proving there is no monorepo dependency.
{
  const { installEmbeddedSkills } = require('./lib/skills-commands.js');
  const videoPkgDir = path.join(__dirname, '..', 'iNNfo', 'specs', 'bluepriNNts', 'video-script');
  const e2eDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-e2e-embedded-'));
  try {
    const skillsDir = path.join(e2eDir, 'skills');
    const state = { skills: {} };
    const names = installEmbeddedSkills(videoPkgDir, skillsDir, { name: 'video-script', commit: 'e2e' }, state);
    assert.deepStrictEqual(names, ['nn-video-script'], 'the real video-script package projects exactly nn-video-script');
    assert.strictEqual(state.skills['nn-video-script'].source_blueprint, 'video-script');
    assert.ok(
      state.skills['nn-video-script'].files && Object.keys(state.skills['nn-video-script'].files).includes('SKILL.md'),
      'install records a per-file content hash (excludes node_modules/.bak-*)',
    );

    const projected = path.join(skillsDir, 'nn-video-script');
    const cli = path.join(projected, 'scripts', 'finalize-video.mjs');
    assert.ok(fs.existsSync(path.join(projected, 'SKILL.md')), 'SKILL.md is projected');

    // finalize-video.mjs with no args prints its usage banner and exits non-zero;
    // what matters is that it loads and runs without a monorepo checkout.
    const ok = spawnSync(process.execPath, [cli], { cwd: e2eDir, encoding: 'utf8' });
    assert.ok(
      !/ERR_MODULE_NOT_FOUND|Cannot find (package|module)/.test(`${ok.stdout}${ok.stderr}`),
      `projected CLI must run outside the monorepo: ${ok.stderr}`,
    );
    assert.ok(/finalize-video/.test(`${ok.stdout}${ok.stderr}`), 'CLI prints its usage banner');
    console.log('✔ End-to-end embedded video-script skill projection test passed');
  } finally {
    fs.rmSync(e2eDir, { recursive: true, force: true });
  }
}

// External-skill install notice: keep it calm, minimal and contextual. It must
// name the provenance and link the trust guidance — not recite attack types.
{
  const { buildExternalSkillNotice, THIRD_PARTY_SKILL_DOC_URL } = require('./lib/skills-commands.js');

  const pinned = buildExternalSkillNotice({
    name: 'widget',
    repo: 'acme/skills',
    path: 'skills/widget',
    commit: 'a'.repeat(40),
    sha256: 'b'.repeat(64),
  });
  assert.ok(/Third-party skill — not from cogNNitive/.test(pinned), 'notice must name the non-affiliation');
  assert.ok(/acme\/skills\/skills\/widget @ aaaaaaa/.test(pinned), 'notice must show the source and shortened pin');
  assert.ok(/pinned and verified against the author's sha256/.test(pinned), 'a sha256 pin reads as verified');
  assert.ok(pinned.includes(THIRD_PARTY_SKILL_DOC_URL), 'notice must link the trust guidance page');
  assert.ok(/\[a\] Install anyway\s+\[b\] Skip/.test(pinned), 'notice must keep the consent options');
  // Design decision: the notice informs, it does not frighten. No threat catalogue.
  assert.ok(
    !/injection|exfiltration|credential|malicious/i.test(pinned),
    'notice must stay calm — no threat catalogue',
  );

  const unpinned = buildExternalSkillNotice({
    name: 'widget',
    repo: 'acme/skills',
    path: 'skills/widget',
    commit: 'c'.repeat(40),
  });
  assert.ok(/pinned by commit only \(no sha256 to verify\)/.test(unpinned), 'a commit-only pin reads as unverified');

  console.log('✔ external-skill install notice test passed');
}

// depends_on reader + validator (blueprint-dependency-lifecycle, template-skill-bundling)
{
  const { readDependsOn, validateDependsOn } = require('./lib/skills-commands.js');

  const text = [
    '---',
    'name: demo',
    'depends_on:',
    '  cli:',
    '    - name: hyperframes',
    '      agent_skills: true',
    '  env:',
    '    - name: WAVESPEED_API_KEY',
    '      purpose: TTS',
    '      required: true',
    '  binaries: [ffmpeg]',
    '  node: ">=22"',
    '  optional_mcp: [wavespeed]',
    '---',
    '# demo',
  ].join('\n');
  const dep = readDependsOn(text);
  assert.ok(dep && dep.cli && dep.cli[0].name === 'hyperframes', 'reader preserves the nested cli entry');
  assert.deepStrictEqual(dep.binaries, ['ffmpeg'], 'reader preserves sequence scalars');

  const pkg = { dependencies: { hyperframes: '0.8.192' } };
  assert.deepStrictEqual(validateDependsOn(dep, pkg), [], 'a well-formed depends_on validates');
  assert.ok(
    validateDependsOn({ cli: [{ name: 'hyperframes', version: '0.8.192' }] }, pkg).some((e) => /version belongs in package.json/.test(e)),
    'a version field in a cli entry is rejected',
  );
  assert.ok(
    validateDependsOn({ cli: [{ name: 'hyperframes' }] }, { dependencies: {} }).some((e) => /not in package.json/.test(e)),
    'a cli package absent from package.json is rejected',
  );
  assert.ok(
    validateDependsOn({ cli: [{ name: 'hyperframes' }] }, { dependencies: { hyperframes: '^0.8.0' } }).some((e) => /pinned exactly/.test(e)),
    'a ranged cli pin is rejected',
  );
  assert.ok(
    validateDependsOn({ npm: {} }, pkg).some((e) => /unknown depends_on key: npm/.test(e)),
    'an unknown key is rejected',
  );
  console.log('✔ depends_on reader + validator');
}

console.log('All skills-manager unit tests passed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
