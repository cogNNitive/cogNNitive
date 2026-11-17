'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkAuthoredBumps, describe, main } = require('./check-authored-bump.js');

const tags = ['nn-console-v0.37.4', 'nn-console-v0.37.3', 'nn-mcp-v0.37.2', 'blueprints-v0.69.1'];
const authored = { 'nn-console': '0.37.4', 'nn-mcp': '0.37.2' };

test('a console change without a bump is a violation naming the key, the version and the path', () => {
  const violations = checkAuthoredBumps({
    changedPaths: ['scripts/console-views.mjs', 'README.md'],
    tags,
    authored,
  });
  assert.deepStrictEqual(violations, [
    {
      key: 'nn-console',
      version: '0.37.4',
      latest: '0.37.4',
      packageJson: 'iNNfo/specs/bluepriNNts/console/package.json',
      paths: ['scripts/console-views.mjs'],
    },
  ]);
  assert.match(describe(violations[0]), /still declares 0\.37\.4 and nn-console-v0\.37\.4 is already released/);
});

test('a console change with an untagged version passes', () => {
  const violations = checkAuthoredBumps({
    changedPaths: ['iNNfo/specs/bluepriNNts/console/nn-runtime.js', 'iNNfo/specs/bluepriNNts/console/package.json'],
    tags,
    authored: { ...authored, 'nn-console': '0.37.5' },
  });
  assert.deepStrictEqual(violations, []);
});

test('an nn-mcp bundle change without a bump is a violation; other nn-mcp sources are not release paths', () => {
  assert.deepStrictEqual(
    checkAuthoredBumps({ changedPaths: ['iNNfo/packages/nn-mcp/src/server.ts'], tags, authored }),
    [],
  );
  const violations = checkAuthoredBumps({
    changedPaths: ['iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js'],
    tags,
    authored,
  });
  assert.deepStrictEqual(violations.map((v) => v.key), ['nn-mcp']);
});

test('a path that only shares a prefix with a release path is not a release path', () => {
  const violations = checkAuthoredBumps({
    changedPaths: ['scripts/export-console.mjs.bak', 'iNNfo/specs/bluepriNNts/console-extra/x.js'],
    tags,
    authored,
  });
  assert.deepStrictEqual(violations, []);
});

test('a key never released yet is not checked', () => {
  const violations = checkAuthoredBumps({
    changedPaths: ['scripts/console-views.mjs'],
    tags: ['blueprints-v0.69.1'],
    authored,
  });
  assert.deepStrictEqual(violations, []);
});

test('CLI: exit 1 on an unbumped console change in a real repo, 0 after the bump, 2 without --base', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'authored-bump-'));
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };
  const pkg = 'iNNfo/specs/bluepriNNts/console/package.json';
  try {
    run(['init', '-q', '-b', 'main']);
    run(['config', 'user.email', 't@example.com']);
    run(['config', 'user.name', 't']);
    write(pkg, JSON.stringify({ version: '0.37.4' }));
    write('scripts/console-views.mjs', 'a\n');
    run(['add', '-A']);
    run(['commit', '-q', '-m', 'base']);
    run(['tag', 'nn-console-v0.37.4']);
    run(['checkout', '-q', '-b', 'pr']);
    write('scripts/console-views.mjs', 'b\n');
    run(['commit', '-q', '-am', 'change']);

    const errors = [];
    const original = console.error;
    console.error = (msg) => errors.push(msg);
    try {
      assert.strictEqual(main(['--base', 'main'], dir), 1);
      assert.strictEqual(main([], dir), 2);
    } finally {
      console.error = original;
    }
    assert.match(errors[0], /^nn-console: this PR changes scripts\/console-views\.mjs/);

    write(pkg, JSON.stringify({ version: '0.37.5' }));
    run(['commit', '-q', '-am', 'bump']);
    const log = console.log;
    console.log = () => {};
    try {
      assert.strictEqual(main(['--base', 'main'], dir), 0);
    } finally {
      console.log = log;
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
