#!/usr/bin/env node
/**
 * scripts/lib/github-client.test.js
 *
 * Offline enforcement (quality-gates spec, "GitHub client throws when offline").
 */

const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { apiRequest, fetchString, downloadFile } = require('./github-client.js');

const net = require('node:net');

// Runs `fn` with NN_OFFLINE=1 and a socket trap; asserts no connection was attempted.
async function withOffline(fn) {
  const prev = process.env.NN_OFFLINE;
  process.env.NN_OFFLINE = '1';
  const origConnect = net.Socket.prototype.connect;
  let connects = 0;
  net.Socket.prototype.connect = function trapped() {
    connects += 1;
    throw new Error('socket trap: network must not be reached');
  };
  try {
    await fn();
    assert.strictEqual(connects, 0, 'no connection is attempted while offline');
  } finally {
    net.Socket.prototype.connect = origConnect;
    if (prev === undefined) delete process.env.NN_OFFLINE;
    else process.env.NN_OFFLINE = prev;
  }
}

const stubResponse = () => ({ status: 200, text: async () => '{"ok":true}', headers: { get: () => null } });

async function main() {
  // The real (unstubbed) fetch is refused before any request is built.
  await withOffline(async () => {
    await assert.rejects(() => apiRequest('https://api.github.com/x'), /NN_OFFLINE/);
    await assert.rejects(() => fetchString('https://example.com/x'), /NN_OFFLINE/);
    await assert.rejects(() => downloadFile('https://codeload.github.com/x', 'unused'), /NN_OFFLINE/);
  });

  // Loopback is not network access; a stubbed fetch cannot reach the network either
  // (and a stub that falls through to the real fetch is caught by the offline-guard preload).
  await withOffline(async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => stubResponse();
    try {
      assert.deepStrictEqual((await apiRequest('http://127.0.0.1:1/x')).data, { ok: true });
      assert.strictEqual(await fetchString('http://localhost:1/x'), '{"ok":true}');
      assert.deepStrictEqual((await apiRequest('https://api.github.com/x')).data, { ok: true });
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  // Local git lookups are not network access and stay allowed under NN_OFFLINE=1.
  const out = execFileSync('git', ['rev-parse', '--git-dir'], {
    encoding: 'utf8',
    env: { ...process.env, NN_OFFLINE: '1' },
  });
  assert.ok(out.trim().length > 0);

  // Without NN_OFFLINE the client still reaches fetch (error is mapped, not thrown).
  const realFetch = globalThis.fetch;
  const prev = process.env.NN_OFFLINE;
  delete process.env.NN_OFFLINE;
  globalThis.fetch = async () => {
    throw new Error('stub-network');
  };
  try {
    const res = await apiRequest('https://api.github.com/x');
    assert.strictEqual(res.status, 0);
    assert.strictEqual(res.error, 'stub-network');
  } finally {
    globalThis.fetch = realFetch;
    if (prev !== undefined) process.env.NN_OFFLINE = prev;
  }

  console.log('github-client offline tests passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
