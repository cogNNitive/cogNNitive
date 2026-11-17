'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { extractTarball } = require('./atomic-fs.js');

// GNU tar reads an archive name with a colon before the first slash as `host:path`
// and tries to reach a remote host. Every absolute Windows path starts with `C:`, so
// with Git's GNU tar first in PATH the skills install failed with "Cannot connect to
// <sha>.tar.gz: resolve failed". Elsewhere a colon in the file name does the same.
test('extractTarball extracts an archive whose path GNU tar would read as host:path', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tar-colon-'));
  try {
    fs.mkdirSync(path.join(root, 'src', 'pkg'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'pkg', 'a.txt'), 'hello');
    // Built through stdout, so creating the fixture never parses an archive path.
    const packed = spawnSync('tar', ['-czf', '-', 'pkg'], { cwd: path.join(root, 'src') });
    assert.strictEqual(packed.status, 0, String(packed.stderr));

    const name = process.platform === 'win32' ? 'archive.tar.gz' : 'host:archive.tar.gz';
    const tarFile = path.join(root, name);
    fs.writeFileSync(tarFile, packed.stdout);

    const dest = path.join(root, 'out');
    extractTarball(tarFile, dest);
    assert.strictEqual(fs.readFileSync(path.join(dest, 'pkg', 'a.txt'), 'utf8'), 'hello');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
