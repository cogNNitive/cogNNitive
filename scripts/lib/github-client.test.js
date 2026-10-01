#!/usr/bin/env node
/**
 * scripts/lib/github-client.test.js
 *
 * Offline enforcement (quality-gates spec, "GitHub client throws when offline").
 */

const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { apiRequest, fetchString } = require('./github-client.js');

async function withOffline(fn) {
  const prev = process.env.NN_OFFLINE;
  process.env.NN_OFFLINE = '1';
  const realFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('network must not be reached');
  };
  try {
    await fn();
    assert.strictEqual(fetchCalls, 0, 'no request is issued while offline');
  } finally {
    globalThis.fetch = realFetch;
    if (prev === undefined) delete process.env.NN_OFFLINE;
    else process.env.NN_OFFLINE = prev;
  }
}

async function main() {
  await withOffline(async () => {
    await assert.rejects(() => apiRequest('https://api.github.com/x'), /NN_OFFLINE/);
  });

  await withOffline(async () => {
    await assert.rejects(() => fetchString('https://example.com/x'), /NN_OFFLINE/);
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
