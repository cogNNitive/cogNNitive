#!/usr/bin/env node
/**
 * scripts/lib/channel-refs.test.js
 *
 * Plain-node tests for scripts/lib/channel-refs.js (resolveChannelRefs).
 * Pure: in-memory objects only, zero filesystem/git/network access.
 */

const assert = require('node:assert');
const { resolveChannelRefs, VERSION_SOURCE } = require('./channel-refs.js');

function testDerivationFromVersion() {
  const doc = {
    channels: {
      stable: {
        refs: [
          { key: 'skills', repo: 'cogNNitive/cogNNitive', version: '2.1.0' },
        ],
      },
    },
  };
  const res = resolveChannelRefs(doc, 'stable');
  assert.deepStrictEqual(res, [
    { key: 'skills', repo: 'cogNNitive/cogNNitive', ref: 'skills-v2.1.0' },
  ]);
  console.log('✔ Case A: derives <key>-v<version> when version is present');
}

function testLiteralRefPreserved() {
  const doc = {
    channels: {
      preview: {
        refs: [
          { key: 'skills', repo: 'cogNNitive/cogNNitive', ref: 'main' },
        ],
      },
    },
  };
  const res = resolveChannelRefs(doc, 'preview');
  assert.deepStrictEqual(res, [
    { key: 'skills', repo: 'cogNNitive/cogNNitive', ref: 'main' },
  ]);
  console.log('✔ Case B: literal ref is preserved untouched');
}

function testAmbiguousRefAndVersionThrows() {
  const doc = {
    channels: {
      stable: {
        refs: [
          { key: 'skills', repo: 'cogNNitive/cogNNitive', ref: 'skills-v2.1.0', version: '2.1.0' },
        ],
      },
    },
  };
  assert.throws(
    () => resolveChannelRefs(doc, 'stable'),
    /skills/i,
  );
  console.log('✔ Case C: throws when row declares both ref and version, naming the key');
}

function testNeitherAndUnknownKeyThrows() {
  const doc = {
    channels: {
      stable: {
        refs: [
          { key: 'unknown-thing', repo: 'cogNNitive/cogNNitive' },
        ],
      },
    },
  };
  assert.throws(
    () => resolveChannelRefs(doc, 'stable'),
    /unknown-thing/i,
  );
  console.log('✔ Case D: throws when row declares neither and key is unknown');
}

function testLookupInnfoMcpFromDoc() {
  const doc = {
    skills: [
      {
        name: 'nn-innfo',
        mcp: [
          { name: 'innfo-mcp', version: '0.10.0' },
        ],
      },
    ],
    channels: {
      stable: {
        refs: [
          { key: 'innfo-mcp', repo: 'cogNNitive/cogNNitive' },
        ],
      },
    },
  };
  const res = resolveChannelRefs(doc, 'stable');
  assert.deepStrictEqual(res, [
    { key: 'innfo-mcp', repo: 'cogNNitive/cogNNitive', ref: 'innfo-mcp-v0.10.0' },
  ]);
  console.log('✔ Case E: resolves innfo-mcp from doc artifact version');
}

function testLookupInnfoConsoleFromDoc() {
  const doc = {
    console_assets: [
      { name: 'innfo-console', version: '0.2.0' },
    ],
    channels: {
      stable: {
        refs: [
          { key: 'innfo-console', repo: 'cogNNitive/cogNNitive' },
        ],
      },
    },
  };
  const res = resolveChannelRefs(doc, 'stable');
  assert.deepStrictEqual(res, [
    { key: 'innfo-console', repo: 'cogNNitive/cogNNitive', ref: 'innfo-console-v0.2.0' },
  ]);
  console.log('✔ Case F: resolves innfo-console from doc console_assets version');
}

function testMalformedVersionThrows() {
  const doc = {
    channels: {
      stable: {
        refs: [
          { key: 'skills', repo: 'cogNNitive/cogNNitive', version: 'v2.1' },
        ],
      },
    },
  };
  assert.throws(
    () => resolveChannelRefs(doc, 'stable'),
    /skills.*v2\.1|v2\.1.*skills/i,
  );
  console.log('✔ Case G: throws on malformed version shape with key and version');
}

function testOutputOrderAndShape() {
  const doc = {
    skills: [
      {
        name: 'nn-innfo',
        mcp: [{ name: 'innfo-mcp', version: '0.10.0' }],
      },
    ],
    console_assets: [
      { name: 'innfo-console', version: '0.2.0' },
    ],
    channels: {
      stable: {
        refs: [
          { key: 'skills', repo: 'cogNNitive/cogNNitive', version: '2.1.0' },
          { key: 'templates', repo: 'cogNNitive/cogNNitive', version: '0.13.0' },
          { key: 'innfo-mcp', repo: 'cogNNitive/cogNNitive' },
          { key: 'innfo-console', repo: 'cogNNitive/cogNNitive' },
        ],
      },
    },
  };
  const res = resolveChannelRefs(doc, 'stable');
  assert.strictEqual(res.length, 4);
  assert.deepStrictEqual(res.map((r) => r.key), ['skills', 'templates', 'innfo-mcp', 'innfo-console']);
  for (const r of res) {
    assert.deepStrictEqual(Object.keys(r).sort(), ['key', 'ref', 'repo']);
  }
  assert.deepStrictEqual(res.map((r) => r.ref), [
    'skills-v2.1.0',
    'templates-v0.13.0',
    'innfo-mcp-v0.10.0',
    'innfo-console-v0.2.0',
  ]);
  console.log('✔ Case H: output order matches input order and shape is exactly {key, repo, ref}');
}

function runAll() {
  testDerivationFromVersion();
  testLiteralRefPreserved();
  testAmbiguousRefAndVersionThrows();
  testNeitherAndUnknownKeyThrows();
  testLookupInnfoMcpFromDoc();
  testLookupInnfoConsoleFromDoc();
  testMalformedVersionThrows();
  testOutputOrderAndShape();
  console.log('All channel-refs tests passed.');
}

runAll();
