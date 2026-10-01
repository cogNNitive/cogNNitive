#!/usr/bin/env node
/**
 * scripts/lib/github-client.test.js
 *
 * Offline enforcement for the GitHub client lives in the offline-guard preload
 * (quality-gates spec, "Offline mode MUST be enforced"): the client carries no
 * offline logic of its own. These tests run the client in a child process under
 * `--require offline-guard.js` with `NN_OFFLINE=1` and assert the guard's
 * `ENN_OFFLINE` refusal surfaces, that loopback still works, and that local git
 * lookups are unaffected.
 */

const assert = require('node:assert');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const guard = path.join(__dirname, 'offline-guard.js');
const client = path.join(__dirname, 'github-client.js');

function runUnderGuard(code) {
  const env = { ...process.env, NN_OFFLINE: '1' };
  delete env.NODE_OPTIONS;
  const res = spawnSync(process.execPath, ['--require', guard, '-e', code], {
    env,
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.strictEqual(res.status, 0, `child failed: ${res.stderr}`);
  return JSON.parse(res.stdout.trim().split('\n').pop());
}

// 1. Non-loopback requests are refused (no socket is opened) for every entry point.
{
  const out = runUnderGuard(`
    const c = require(${JSON.stringify(client)});
    (async () => {
      const out = {};
      const api = await c.apiRequest('https://api.github.com/x');
      out.api = { status: api.status, error: api.error };
      for (const [name, fn] of [
        ['fetchString', () => c.fetchString('https://example.com/x')],
        ['fetchJson', () => c.fetchJson('https://example.com/x')],
        ['downloadFile', () => c.downloadFile('https://codeload.github.com/x', require('os').tmpdir() + '/never-written')],
      ]) {
        try { await fn(); out[name] = 'no-throw'; } catch (e) { out[name] = e.code || e.message; }
      }
      console.log(JSON.stringify(out));
    })();
  `);
  assert.strictEqual(out.api.status, 0);
  assert.match(out.api.error, /NN_OFFLINE/);
  assert.strictEqual(out.fetchString, 'ENN_OFFLINE');
  assert.strictEqual(out.fetchJson, 'ENN_OFFLINE');
  assert.strictEqual(out.downloadFile, 'ENN_OFFLINE');
  console.log('✔ client calls to non-loopback hosts are refused by the preload');
}

// 2. Loopback keeps working through the client.
{
  const out = runUnderGuard(`
    const http = require('http');
    const c = require(${JSON.stringify(client)});
    const server = http.createServer((req, res) => res.end('{"ok":true}'));
    server.listen(0, '127.0.0.1', async () => {
      const url = 'http://127.0.0.1:' + server.address().port + '/x';
      const api = await c.apiRequest(url);
      const text = await c.fetchString(url);
      console.log(JSON.stringify({ data: api.data, text }));
      server.close();
    });
  `);
  assert.deepStrictEqual(out, { data: { ok: true }, text: '{"ok":true}' });
  console.log('✔ loopback requests through the client still work');
}

// 3. Local git lookups are not network access and stay allowed under NN_OFFLINE=1.
{
  const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], {
    encoding: 'utf8',
    env: { ...process.env, NN_OFFLINE: '1' },
  });
  assert.ok(gitDir.trim().length > 0);
  console.log('✔ local git lookups are allowed');
}

// 4. The client contains no offline or test-detection logic of its own.
{
  const src = require('node:fs').readFileSync(client, 'utf8');
  assert.ok(!/NN_OFFLINE|assertOnline|isRealFetch|__nn/.test(src), 'enforcement belongs to the preload, not the client');
  console.log('✔ client carries no offline logic');
}

console.log('github-client offline tests passed');
