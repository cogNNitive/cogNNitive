'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, readFileSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { writePendingVersions } = require('./write-pending-versions.js');

/**
 * The write-back half of the lane: a commit that touches a package key's source derives the
 * next version and materializes it into that key's package.json, before any tag exists.
 * Everything runs against a throwaway repository; the real tags are not involved.
 */

function makeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'write-pending-'));
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q');
  git('config', 'user.email', 'write-pending@example.com');
  git('config', 'user.name', 'write-pending');
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel.split('/').join(require('node:path').sep));
    mkdirSync(require('node:path').dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  git('add', '-A');
  git('commit', '-qm', 'base');
  return { root, git };
}

const MCP_PKG = {
  name: '@cognnitive/nn-mcp',
  version: '0.49.4',
  dependencies: { '@cognnitive/nn-core': '^0.49.4' },
};

test('a feat in a package key writes the minor version into its package.json', () => {
  const { root, git } = makeRepo({
    'iNNfo/packages/nn-mcp/package.json': `${JSON.stringify(MCP_PKG, null, 2)}\n`,
    'iNNfo/packages/nn-mcp/src/server.ts': 'export const a = 1\n',
  });
  git('tag', 'nn-mcp-v0.49.4');

  writeFileSync(join(root, 'iNNfo', 'packages', 'nn-mcp', 'src', 'server.ts'), 'export const a = 2\n');
  git('add', '-A');
  git('commit', '-qm', 'feat(nn-mcp): a tool surface');

  const { plan, written } = writePendingVersions(root);
  assert.deepStrictEqual(plan.map((p) => p.tag), ['nn-mcp-v0.50.0']);
  assert.deepStrictEqual(written, [
    { key: 'nn-mcp', version: '0.50.0', file: 'iNNfo/packages/nn-mcp/package.json' },
  ]);

  const pkg = JSON.parse(readFileSync(join(root, 'iNNfo', 'packages', 'nn-mcp', 'package.json'), 'utf8'));
  assert.equal(pkg.version, '0.50.0', 'version-agreement compares the tag against this field');
  assert.equal(pkg.dependencies['@cognnitive/nn-core'], '^0.49.4', 'the range is sync:versions job');
});

test('a commit that only rewrites generated files writes nothing', () => {
  const { root, git } = makeRepo({
    'iNNfo/packages/nn-mcp/package.json': `${JSON.stringify(MCP_PKG, null, 2)}\n`,
    'iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js': 'bundle v1\n',
  });
  git('tag', 'nn-mcp-v0.49.4');

  writeFileSync(join(root, 'iNNfo', 'packages', 'nn-mcp', 'bin', 'nn-mcp.bundle.js'), 'bundle v2\n');
  git('add', '-A');
  git('commit', '-qm', 'chore(regen): regenerate derived artifacts');

  const { plan, written } = writePendingVersions(root);
  assert.deepStrictEqual(plan, [], 'the bundle is generated, so it cannot trigger the release it embeds');
  assert.deepStrictEqual(written, []);
});

test('the write-back is idempotent: planning the same tree twice writes once', () => {
  const { root, git } = makeRepo({
    'iNNfo/packages/nn-mcp/package.json': `${JSON.stringify(MCP_PKG, null, 2)}\n`,
    'iNNfo/packages/nn-mcp/src/server.ts': 'export const a = 1\n',
  });
  git('tag', 'nn-mcp-v0.49.4');

  writeFileSync(join(root, 'iNNfo', 'packages', 'nn-mcp', 'src', 'server.ts'), 'export const a = 3\n');
  git('add', '-A');
  git('commit', '-qm', 'fix(nn-mcp): a fix');

  const first = writePendingVersions(root);
  assert.deepStrictEqual(first.written.map((w) => w.version), ['0.49.5']);

  // The lane commits what it wrote; the next planning pass sees the same commits (the version
  // file is metadata and does not count) and derives the same version, so it writes nothing.
  git('add', '-A');
  git('commit', '-qm', 'chore(regen): regenerate derived artifacts and write back the pending versions');

  const second = writePendingVersions(root);
  assert.deepStrictEqual(second.written, [], 'the version is already materialized');
});
