/**
 * scripts/release/smoke.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runSmokeTest, SmokeTestError } = require('./smoke.js');

test('runSmokeTest polls until manifest URL serves byte-equal content', async () => {
  const stagedManifest = '---\nagent-bootstrap:\n  version: "1.0.0"\n---\n# Staged';
  let calls = 0;

  const fakeFetch = async (url) => {
    calls++;
    if (calls < 3) {
      return {
        status: 200,
        text: async () => '---\nagent-bootstrap:\n  version: "0.9.0"\n---\n# Old',
      };
    }
    return {
      status: 200,
      text: async () => stagedManifest,
    };
  };

  const result = await runSmokeTest({
    manifestUrl: 'https://cognnitive.com/use/manifest.md',
    stagedManifestText: stagedManifest,
    key: 'skills',
    version: '2.10.0',
    pollIntervalMs: 5,
    timeoutMs: 1000,
    fetchFn: fakeFetch,
    validator: async () => true,
  });

  assert.equal(result.ok, true);
  assert.equal(calls, 3);
});

test('runSmokeTest fails on timeout when manifest is never served', async () => {
  const stagedManifest = '---\nagent-bootstrap:\n  version: "1.0.0"\n---\n# Staged';

  const fakeFetch = async () => ({
    status: 200,
    text: async () => '---\nagent-bootstrap:\n  version: "0.9.0"\n---\n# Stale',
  });

  await assert.rejects(
    () =>
      runSmokeTest({
        manifestUrl: 'https://cognnitive.com/use/manifest.md',
        stagedManifestText: stagedManifest,
        key: 'skills',
        version: '2.10.0',
        pollIntervalMs: 10,
        timeoutMs: 50,
        fetchFn: fakeFetch,
        validator: async () => true,
      }),
    (err) => err instanceof SmokeTestError && /timeout/i.test(err.message)
  );
});

test('runSmokeTest checks MCP bundle sha256 when releasing innfo-mcp', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-mcp-'));
  const bundleContent = 'console.log("mcp bundle test v0.12.0");';
  const bundleSha = crypto.createHash('sha256').update(bundleContent).digest('hex');

  const bundlePath = path.join(tmp, 'iNNfo', 'packages', 'nn-mcp', 'bin');
  fs.mkdirSync(bundlePath, { recursive: true });
  fs.writeFileSync(path.join(bundlePath, 'innfo-mcp.bundle.js'), bundleContent);

  const stagedManifest = '---\nagent-bootstrap:\n  version: "1.0.0"\n---\n# Staged';

  const fakeFetch = async (url) => {
    if (url.includes('innfo-mcp-v0.12.0.bundle.js')) {
      return {
        status: 200,
        text: async () => bundleContent,
      };
    }
    return {
      status: 200,
      text: async () => stagedManifest,
    };
  };

  const result = await runSmokeTest({
    manifestUrl: 'https://cognnitive.com/use/manifest.md',
    stagedManifestText: stagedManifest,
    key: 'innfo-mcp',
    version: '0.12.0',
    repoRoot: tmp,
    pollIntervalMs: 5,
    timeoutMs: 500,
    fetchFn: fakeFetch,
    validator: async () => true,
  });

  assert.equal(result.ok, true);

  // Mismatched bundle sha fails
  const mismatchFetch = async (url) => {
    if (url.includes('innfo-mcp-v0.12.0.bundle.js')) {
      return {
        status: 200,
        text: async () => 'DIFFERENT BYTES',
      };
    }
    return {
      status: 200,
      text: async () => stagedManifest,
    };
  };

  await assert.rejects(
    () =>
      runSmokeTest({
        manifestUrl: 'https://cognnitive.com/use/manifest.md',
        stagedManifestText: stagedManifest,
        key: 'innfo-mcp',
        version: '0.12.0',
        repoRoot: tmp,
        pollIntervalMs: 5,
        timeoutMs: 500,
        fetchFn: mismatchFetch,
        validator: async () => true,
      }),
    (err) => err instanceof SmokeTestError && /sha256 mismatch/i.test(err.message)
  );

  fs.rmSync(tmp, { recursive: true, force: true });
});
