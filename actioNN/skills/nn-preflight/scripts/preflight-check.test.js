/**
 * skills/nn-preflight/scripts/preflight-check.test.js
 *
 * Unit tests for preflight-check.js.
 * Zero external test framework dependencies (runs with plain node).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const assert = require('assert');
const { spawn } = require('child_process');
const { parseManifest } = require('./preflight-check');

const preflightScript = path.join(__dirname, 'preflight-check.js');

function serveManifest(content) {
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

/** Serve different content per URL path (used for workspace spec freshness scenarios). */
function serveRoutes(routes) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const route = routes[req.url];
      if (route === undefined) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(route);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        routes,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

function runScriptAsync(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [preflightScript, ...args], { env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

async function runTests() {
  console.log('Running preflight-check unit tests...');

  // Test 1: parseManifest
  {
    const sampleManifest = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-innfo
      commit: "a55a709cfd4482979547fda2b8633e6b8541a813"
      version: "V_0-1-0"
      mcp:
        - name: innfo-mcp
          version: "0.2.4"
  templates:
    - name: workspace_spec_NN
      commit: "3bd4501e75915e8f2365fd7c547d9384a3e0c837"
      version: "V_0-2-0"
---
# Manifest body
`;
    const parsed = parseManifest(sampleManifest);
    assert.strictEqual(parsed.version, '2.0');
    assert.strictEqual(parsed.skills.length, 1);
    assert.strictEqual(parsed.skills[0].name, 'nn-innfo');
    assert.strictEqual(parsed.skills[0].mcp[0].name, 'innfo-mcp');
    assert.strictEqual(parsed.templates.length, 1);
    console.log('✔ parseManifest extracts skills, mcp, and templates correctly');
  }

  // Test 2: Up-to-date execution (Exit code 0, status OK)
  {
    const manifestContent = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-innfo
      commit: "1111111111111111111111111111111111111111"
      version: "V_0-1-0"
      mcp:
        - name: innfo-mcp
          version: "0.2.4"
  templates:
    - name: workspace_spec_NN
      commit: "2222222222222222222222222222222222222222"
      version: "V_0-2-0"
---
`;
    const server = await serveManifest(manifestContent);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-test-'));
    try {
      const skillsDir = path.join(tmpDir, 'skills');
      const templatesDir = path.join(tmpDir, 'templates');
      const mcpDir = path.join(tmpDir, 'mcp');
      const stateFile = path.join(tmpDir, 'bootstrap-state.json');

      fs.mkdirSync(path.join(skillsDir, 'nn-innfo'), { recursive: true });
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, 'workspace_spec_NN.md'), '# template');
      fs.mkdirSync(mcpDir, { recursive: true });
      fs.writeFileSync(path.join(mcpDir, 'innfo-mcp.bundle.js'), '// bundle');

      const stateContent = {
        manifest: server.url,
        skills: {
          'nn-innfo': { commit: '1111111111111111111111111111111111111111', version: 'V_0-1-0' },
        },
        templates: {
          workspace_spec_NN: { commit: '2222222222222222222222222222222222222222', version: 'V_0-2-0' },
        },
        mcp: {
          'innfo-mcp': { version: '0.2.4' },
        },
      };
      fs.writeFileSync(stateFile, JSON.stringify(stateContent));

      const res = await runScriptAsync(['--json'], {
        SM_MANIFEST_URL: server.url,
      });

      // Override dirs via flags if needed or verify JSON
      const parsedRes = JSON.parse(res.stdout);
      assert.strictEqual(parsedRes.node.ok, true);
      assert.strictEqual(parsedRes.manifest.reachable, true);
      console.log('✔ Up-to-date execution runs and reaches manifest');
    } finally {
      await server.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Test 3: Outdated detection (Exit code 1, ACTION_REQUIRED)
  {
    const manifestContent = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-innfo
      commit: "latest-commit-sha-99999999999999999999999"
      version: "V_0-2-0"
  templates: []
---
`;
    const server = await serveManifest(manifestContent);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-outdated-'));
    try {
      const skillsDir = path.join(tmpDir, 'skills');
      const stateFile = path.join(tmpDir, 'bootstrap-state.json');

      fs.mkdirSync(path.join(skillsDir, 'nn-innfo'), { recursive: true });
      fs.writeFileSync(stateFile, JSON.stringify({
        manifest: server.url,
        skills: {
          'nn-innfo': { commit: 'old-commit-sha-11111111111111111111111111', version: 'V_0-1-0' },
        },
      }));

      const res = await runScriptAsync([
        '--json',
        '--skills-dir', skillsDir,
        '--state-file', stateFile,
        '--manifest-url', server.url,
      ]);

      assert.strictEqual(res.status, 1, 'Expected exit code 1 for outdated component');
      const parsedRes = JSON.parse(res.stdout);
      assert.strictEqual(parsedRes.status, 'ACTION_REQUIRED');
      assert.strictEqual(parsedRes.summary.skillsOutdated, 1);
      console.log('✔ Outdated component triggers exit code 1 and ACTION_REQUIRED');
    } finally {
      await server.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Test 4: BOM in state file is stripped and parsed correctly
  {
    const manifestContent = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-innfo
      commit: "1111111111111111111111111111111111111111"
      version: "V_0-1-0"
  templates: []
---
`;
    const server = await serveManifest(manifestContent);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-bom-'));
    try {
      const skillsDir = path.join(tmpDir, 'skills');
      const stateFile = path.join(tmpDir, 'bootstrap-state.json');

      fs.mkdirSync(path.join(skillsDir, 'nn-innfo'), { recursive: true });
      const stateWithBom = '\uFEFF' + JSON.stringify({
        manifest: server.url,
        skills: {
          'nn-innfo': { commit: '1111111111111111111111111111111111111111', version: 'V_0-1-0' },
        },
      });
      fs.writeFileSync(stateFile, stateWithBom, 'utf-8');

      const res = await runScriptAsync([
        '--json',
        '--skills-dir', skillsDir,
        '--state-file', stateFile,
        '--manifest-url', server.url,
      ]);

      assert.strictEqual(res.status, 0, `Expected exit code 0 despite BOM in state file. Got: ${res.stderr || res.stdout}`);
      const parsedRes = JSON.parse(res.stdout);
      assert.strictEqual(parsedRes.status, 'OK');
      assert.strictEqual(parsedRes.summary.skillsTotal, 1);
      assert.strictEqual(parsedRes.summary.skillsOutdated, 0);
      console.log('✔ BOM in state file is stripped and parsed correctly');
    } finally {
      await server.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Test 5: Workspace scan — stale spec blocks preflight (exit 1 + ACTION_REQUIRED)
  {
    const emptyManifest = `---
agent-bootstrap:
  version: "2.0"
  skills: []
  templates: []
---
`;
    const server = await serveRoutes({
      '/manifest.md': emptyManifest,
      '/spec.md': '# REMOTE CONTENT\n',
    });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-ws-stale-'));
    try {
      const workspaceDir = path.join(tmpDir, 'ws');
      fs.mkdirSync(path.join(workspaceDir, 'specs'), { recursive: true });
      fs.writeFileSync(
        path.join(workspaceDir, 'specs', 'workspace_V_0-2-0_spec_NN.md'),
        `---\nspec_url: "${server.url}/spec.md"\n---\n# LOCAL CONTENT\n`,
        'utf-8',
      );

      const res = await runScriptAsync([
        '--json',
        '--workspace-dir', workspaceDir,
        '--manifest-url', `${server.url}/manifest.md`,
      ]);

      assert.strictEqual(res.status, 1, `Stale spec must exit 1. Got: ${res.stdout} ${res.stderr}`);
      const parsedRes = JSON.parse(res.stdout);
      assert.strictEqual(parsedRes.status, 'ACTION_REQUIRED');
      assert.strictEqual(parsedRes.summary.specsStale, 1);
      assert.strictEqual(parsedRes.summary.specsFresh, 0);
      const item = parsedRes.items.find((i) => i.type === 'spec-freshness');
      assert.ok(item, 'a spec-freshness item must be reported');
      assert.strictEqual(item.status, 'stale');
      assert.ok(item.name.includes('workspace_V_0-2-0_spec_NN.md'), 'item names the local file');
      assert.ok(item.url.includes('/spec.md'), 'item carries the canonical remote URL');
      console.log('✔ Stale workspace spec triggers exit 1 + ACTION_REQUIRED');
    } finally {
      await server.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Test 6: Workspace scan — all-fresh specs pass (exit 0)
  {
    const emptyManifest = `---
agent-bootstrap:
  version: "2.0"
  skills: []
  templates: []
---
`;
    const localContent = `---\nspec_url: "${''}"\n---\n# IDENTICAL CONTENT\n`;
    const server = await serveRoutes({
      '/manifest.md': emptyManifest,
      '/spec.md': localContent,
    });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-ws-fresh-'));
    try {
      const workspaceDir = path.join(tmpDir, 'ws');
      fs.mkdirSync(path.join(workspaceDir, 'specs'), { recursive: true });
      // The served copy and the local copy MUST be byte-identical (same URL line).
      const specContent = localContent.replace('""', `"${server.url}/spec.md"`);
      fs.writeFileSync(
        path.join(workspaceDir, 'specs', 'workspace_V_0-2-0_spec_NN.md'),
        specContent,
        'utf-8',
      );
      // Re-serve the exact local bytes so both hashes match.
      server.routes['/spec.md'] = specContent;

      const res = await runScriptAsync([
        '--json',
        '--workspace-dir', workspaceDir,
        '--manifest-url', `${server.url}/manifest.md`,
      ]);

      assert.strictEqual(res.status, 0, `Fresh spec must exit 0. Got: ${res.stdout} ${res.stderr}`);
      const parsedRes = JSON.parse(res.stdout);
      assert.strictEqual(parsedRes.status, 'OK');
      assert.strictEqual(parsedRes.summary.specsStale, 0);
      assert.strictEqual(parsedRes.summary.specsFresh, 1);
      console.log('✔ All-fresh workspace specs pass preflight');
    } finally {
      await server.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Test 7: Workspace scan — spec without a canonical URL is skipped silently
  {
    const emptyManifest = `---
agent-bootstrap:
  version: "2.0"
  skills: []
  templates: []
---
`;
    const server = await serveManifest(emptyManifest);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-ws-nourl-'));
    try {
      const workspaceDir = path.join(tmpDir, 'ws');
      fs.mkdirSync(path.join(workspaceDir, 'specs'), { recursive: true });
      fs.writeFileSync(
        path.join(workspaceDir, 'specs', 'orphan_NN.md'),
        '---\ntitle: "No URL"\n---\n',
        'utf-8',
      );

      const res = await runScriptAsync([
        '--json',
        '--workspace-dir', workspaceDir,
        '--manifest-url', server.url,
      ]);

      assert.strictEqual(res.status, 0, `No-URL spec must not block. Got: ${res.stdout} ${res.stderr}`);
      const parsedRes = JSON.parse(res.stdout);
      assert.strictEqual(parsedRes.summary.specsStale, 0);
      assert.strictEqual(parsedRes.summary.specsFresh, 0);
      assert.strictEqual(parsedRes.summary.specsOffline, 0);
      assert.strictEqual(
        parsedRes.items.filter((i) => i.type === 'spec-freshness').length,
        0,
        'no spec-freshness item for a file without a canonical URL',
      );
      console.log('✔ Spec without canonical URL is skipped silently');
    } finally {
      await server.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // Test 8: No --workspace-dir → staleness fields default to zero (global-env audit unchanged)
  {
    const manifestContent = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-innfo
      commit: "1111111111111111111111111111111111111111"
      version: "V_0-1-0"
  templates: []
---
`;
    const server = await serveManifest(manifestContent);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-ws-none-'));
    try {
      const skillsDir = path.join(tmpDir, 'skills');
      const stateFile = path.join(tmpDir, 'bootstrap-state.json');
      fs.mkdirSync(path.join(skillsDir, 'nn-innfo'), { recursive: true });
      fs.writeFileSync(stateFile, JSON.stringify({
        manifest: server.url,
        skills: {
          'nn-innfo': { commit: '1111111111111111111111111111111111111111', version: 'V_0-1-0' },
        },
      }));

      const res = await runScriptAsync([
        '--json',
        '--skills-dir', skillsDir,
        '--state-file', stateFile,
        '--manifest-url', server.url,
      ]);

      assert.strictEqual(res.status, 0, `No-flag run must stay exit 0. Got: ${res.stdout} ${res.stderr}`);
      const parsedRes = JSON.parse(res.stdout);
      assert.strictEqual(parsedRes.status, 'OK');
      assert.strictEqual(parsedRes.summary.specsStale, 0);
      assert.strictEqual(parsedRes.summary.specsFresh, 0);
      assert.strictEqual(parsedRes.summary.specsOffline, 0);
      console.log('✔ No --workspace-dir run leaves global-env audit unchanged');
    } finally {
      await server.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  console.log('All preflight-check unit tests passed successfully!\n');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
