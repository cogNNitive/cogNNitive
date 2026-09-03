#!/usr/bin/env node

/**
 * scripts/lib/test-shared-libs.js
 *
 * Unit tests for shared core libraries:
 *   - yaml-parser.js
 *   - github-client.js
 *   - atomic-fs.js
 *
 * Zero external dependencies — native Node.js execution.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const https = require('node:https');
const { spawnSync } = require('node:child_process');
const { EventEmitter } = require('node:events');

const yamlParser = require('./yaml-parser');
const githubClient = require('./github-client');
const atomicFs = require('./atomic-fs');

async function testYamlParser() {
  console.log('Testing yaml-parser.js...');

  // parseScalar
  assert.strictEqual(yamlParser.parseScalar(''), null);
  assert.strictEqual(yamlParser.parseScalar('   '), null);
  assert.strictEqual(yamlParser.parseScalar('true'), true);
  assert.strictEqual(yamlParser.parseScalar('false'), false);
  assert.strictEqual(yamlParser.parseScalar('null'), null);
  assert.strictEqual(yamlParser.parseScalar('"quoted string"'), 'quoted string');
  assert.strictEqual(yamlParser.parseScalar("'single quoted'"), 'single quoted');
  assert.strictEqual(yamlParser.parseScalar('plain text'), 'plain text');
  assert.deepStrictEqual(yamlParser.parseScalar('[a, b, c]'), ['a', 'b', 'c']);
  assert.deepStrictEqual(yamlParser.parseScalar('["item 1", false, true]'), ['item 1', false, true]);

  // parseFocusedYaml
  const yamlText = `
# Comment line
title: "cogNNitive system"
enabled: true
count: 42
tags: [alpha, beta]
details:
  author: actioNN
  channel: stable
skills:
  - name: nn-router
    repo: cogNNitive/actioNN
    version: 1.0.0
  - name: nn-preflight
    repo: cogNNitive/actioNN
    version: 2.0.0
`;
  const parsedYaml = yamlParser.parseFocusedYaml(yamlText);
  assert.strictEqual(parsedYaml.title, 'cogNNitive system');
  assert.strictEqual(parsedYaml.enabled, true);
  assert.strictEqual(parsedYaml.count, '42');
  assert.deepStrictEqual(parsedYaml.tags, ['alpha', 'beta']);
  assert.deepStrictEqual(parsedYaml.details, { author: 'actioNN', channel: 'stable' });
  assert.strictEqual(Array.isArray(parsedYaml.skills), true);
  assert.strictEqual(parsedYaml.skills.length, 2);
  assert.strictEqual(parsedYaml.skills[0].name, 'nn-router');
  assert.strictEqual(parsedYaml.skills[1].name, 'nn-preflight');

  // parseFrontmatter
  const mdWithFrontmatter = `---
agent-bootstrap:
  version: "1.0"
  skills:
    - name: test-skill
---
# Document Content
Some markdown body.`;
  const fm = yamlParser.parseFrontmatter(mdWithFrontmatter);
  assert.match(fm, /agent-bootstrap:/);
  assert.throws(() => yamlParser.parseFrontmatter('# No frontmatter here'), /no YAML frontmatter/);

  // parseManifest
  const manifestData = yamlParser.parseManifest(mdWithFrontmatter);
  assert.strictEqual(manifestData.version, '1.0');
  assert.strictEqual(manifestData.skills.length, 1);
  assert.strictEqual(manifestData.skills[0].name, 'test-skill');
  assert.deepStrictEqual(manifestData.templates, []);
  assert.deepStrictEqual(manifestData.workflows, []);
  assert.deepStrictEqual(manifestData.mcp, []);

  assert.throws(() => yamlParser.parseManifest('---\nother-key: true\n---'), /agent-bootstrap block not found/);
  assert.throws(() => yamlParser.parseManifest('---\nagent-bootstrap:\n  skills: invalid\n---'), /skills is not a list/);

  console.log('✔ yaml-parser.js tests passed');
}

async function testGithubClient() {
  console.log('Testing github-client.js...');

  // authHeaders
  const savedToken = process.env.GITHUB_TOKEN;
  const savedGhToken = process.env.GH_TOKEN;
  try {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    assert.deepStrictEqual(githubClient.authHeaders(), {});

    process.env.GITHUB_TOKEN = 'ghp_secret_123';
    assert.deepStrictEqual(githubClient.authHeaders(), { Authorization: 'Bearer ghp_secret_123' });

    delete process.env.GITHUB_TOKEN;
    process.env.GH_TOKEN = 'ghp_secret_456';
    assert.deepStrictEqual(githubClient.authHeaders(), { Authorization: 'Bearer ghp_secret_456' });
  } finally {
    if (savedToken !== undefined) process.env.GITHUB_TOKEN = savedToken;
    else delete process.env.GITHUB_TOKEN;
    if (savedGhToken !== undefined) process.env.GH_TOKEN = savedGhToken;
    else delete process.env.GH_TOKEN;
  }

  // rateLimited
  assert.strictEqual(githubClient.rateLimited(403), true);
  assert.strictEqual(githubClient.rateLimited(429), true);
  assert.strictEqual(githubClient.rateLimited(200), false);
  assert.strictEqual(githubClient.rateLimited(404), false);
  assert.strictEqual(githubClient.rateLimited(500), false);

  // HTTP server for testing apiRequest, fetchString, fetchJson, downloadFile
  const server = http.createServer((req, res) => {
    if (req.url === '/json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hello: 'world', success: true }));
    } else if (req.url === '/text') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('plain text content');
    } else if (req.url === '/redirect-1') {
      res.writeHead(302, { Location: '/text' });
      res.end();
    } else if (req.url === '/redirect-loop') {
      res.writeHead(302, { Location: '/redirect-loop' });
      res.end();
    } else if (req.url === '/error-500') {
      res.writeHead(500);
      res.end('server error');
    } else {
      res.writeHead(404);
      res.end('not found');
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // apiRequest with http
    const apiRes = await githubClient.apiRequest(`${baseUrl}/json`);
    assert.strictEqual(apiRes.status, 200);
    assert.deepStrictEqual(apiRes.data, { hello: 'world', success: true });

    const api404 = await githubClient.apiRequest(`${baseUrl}/not-exists`);
    assert.strictEqual(api404.status, 404);

    // fetchString & fetchJson
    const textRes = await githubClient.fetchString(`${baseUrl}/text`);
    assert.strictEqual(textRes, 'plain text content');

    const jsonRes = await githubClient.fetchJson(`${baseUrl}/json`);
    assert.deepStrictEqual(jsonRes, { hello: 'world', success: true });

    // redirect handling
    const redirectedText = await githubClient.fetchString(`${baseUrl}/redirect-1`);
    assert.strictEqual(redirectedText, 'plain text content');

    // redirect loop
    await assert.rejects(
      async () => githubClient.fetchString(`${baseUrl}/redirect-loop`, 2),
      /Too many redirects/
    );

    // error 500
    await assert.rejects(
      async () => githubClient.fetchString(`${baseUrl}/error-500`),
      /status: 500/
    );

    // downloadFile
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-download-'));
    const downloadDest = path.join(tmpDir, 'downloaded.txt');
    try {
      await githubClient.downloadFile(`${baseUrl}/redirect-1`, downloadDest);
      assert.strictEqual(fs.readFileSync(downloadDest, 'utf-8'), 'plain text content');

      // failed download cleans up destination file
      const failDest = path.join(tmpDir, 'failed.txt');
      await assert.rejects(
        async () => githubClient.downloadFile(`${baseUrl}/error-500`, failDest),
        /status: 500/
      );
      assert.strictEqual(fs.existsSync(failDest), false, 'failed download must remove destination file');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  // resolveRef using stubbed https.get
  {
    const originalGet = https.get;
    try {
      // 1. Lightweight tag resolution
      https.get = (url, options, callback) => {
        const res = new EventEmitter();
        res.statusCode = 200;
        const req = new EventEmitter();
        process.nextTick(() => {
          callback(res);
          res.emit('data', JSON.stringify({
            ref: 'refs/tags/v1.0.0',
            object: { sha: '1111111111111111111111111111111111111111', type: 'commit' },
          }));
          res.emit('end');
        });
        return req;
      };
      const resLightweight = await githubClient.resolveRef('owner/repo', 'v1.0.0');
      assert.strictEqual(resLightweight.sha, '1111111111111111111111111111111111111111');
      assert.strictEqual(resLightweight.kind, 'tag');

      // 2. Annotated tag peel
      let callCount = 0;
      https.get = (url, options, callback) => {
        callCount++;
        const res = new EventEmitter();
        res.statusCode = 200;
        const req = new EventEmitter();
        process.nextTick(() => {
          callback(res);
          if (callCount === 1) {
            res.emit('data', JSON.stringify({
              ref: 'refs/tags/v2.0.0',
              object: { sha: 'tagobjectsha', type: 'tag' },
            }));
          } else {
            res.emit('data', JSON.stringify({
              object: { sha: '2222222222222222222222222222222222222222', type: 'commit' },
            }));
          }
          res.emit('end');
        });
        return req;
      };
      const resAnnotated = await githubClient.resolveRef('owner/repo', 'v2.0.0');
      assert.strictEqual(resAnnotated.sha, '2222222222222222222222222222222222222222');
      assert.strictEqual(resAnnotated.kind, 'tag');

      // 3. Branch fallback
      callCount = 0;
      https.get = (url, options, callback) => {
        callCount++;
        const res = new EventEmitter();
        res.statusCode = callCount === 1 ? 404 : 200;
        const req = new EventEmitter();
        process.nextTick(() => {
          callback(res);
          if (callCount === 1) {
            res.emit('data', JSON.stringify({ message: 'Not Found' }));
          } else {
            res.emit('data', JSON.stringify({
              ref: 'refs/heads/main',
              object: { sha: '3333333333333333333333333333333333333333', type: 'commit' },
            }));
          }
          res.emit('end');
        });
        return req;
      };
      const resBranch = await githubClient.resolveRef('owner/repo', 'main');
      assert.strictEqual(resBranch.sha, '3333333333333333333333333333333333333333');
      assert.strictEqual(resBranch.kind, 'branch');

      // 4. Rate limited
      https.get = (url, options, callback) => {
        const res = new EventEmitter();
        res.statusCode = 403;
        const req = new EventEmitter();
        process.nextTick(() => {
          callback(res);
          res.emit('data', JSON.stringify({ message: 'API rate limit exceeded' }));
          res.emit('end');
        });
        return req;
      };
      const resRateLimit = await githubClient.resolveRef('owner/repo', 'main');
      assert.match(resRateLimit.error, /rate limit hit/);

      // 5. Neither tag nor branch found
      https.get = (url, options, callback) => {
        const res = new EventEmitter();
        res.statusCode = 404;
        const req = new EventEmitter();
        process.nextTick(() => {
          callback(res);
          res.emit('data', JSON.stringify({ message: 'Not Found' }));
          res.emit('end');
        });
        return req;
      };
      const resNotFound = await githubClient.resolveRef('owner/repo', 'missing');
      assert.match(resNotFound.error, /not found as a tag or branch/);
    } finally {
      https.get = originalGet;
    }
  }

  console.log('✔ github-client.js tests passed');
}

async function testAtomicFs() {
  console.log('Testing atomic-fs.js...');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-fs-test-'));

  try {
    // 1. saveJsonAtomic
    const jsonTarget = path.join(tmpRoot, 'nested', 'state.json');
    const sampleData = { name: 'cogNNitive', version: '1.2.3', features: ['a', 'b'] };
    atomicFs.saveJsonAtomic(jsonTarget, sampleData);
    assert.strictEqual(fs.existsSync(jsonTarget), true);
    const readData = JSON.parse(fs.readFileSync(jsonTarget, 'utf-8'));
    assert.deepStrictEqual(readData, sampleData);

    // 2. copyDirAtomic
    const srcDir = path.join(tmpRoot, 'src-dir');
    fs.mkdirSync(path.join(srcDir, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'file1.txt'), 'hello from file 1');
    fs.writeFileSync(path.join(srcDir, 'sub', 'file2.txt'), 'hello from file 2');

    const destDir = path.join(tmpRoot, 'dest-dir');
    atomicFs.copyDirAtomic(srcDir, destDir);
    assert.strictEqual(fs.existsSync(destDir), true);
    assert.strictEqual(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf-8'), 'hello from file 1');
    assert.strictEqual(fs.readFileSync(path.join(destDir, 'sub', 'file2.txt'), 'utf-8'), 'hello from file 2');

    // 3. replaceDirAtomic (normal replace)
    const updateSrc = path.join(tmpRoot, 'src-update');
    fs.mkdirSync(updateSrc, { recursive: true });
    fs.writeFileSync(path.join(updateSrc, 'file1.txt'), 'updated file 1');
    fs.writeFileSync(path.join(updateSrc, 'file3.txt'), 'new file 3');

    atomicFs.replaceDirAtomic(updateSrc, destDir);
    assert.strictEqual(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf-8'), 'updated file 1');
    assert.strictEqual(fs.readFileSync(path.join(destDir, 'file3.txt'), 'utf-8'), 'new file 3');
    assert.strictEqual(fs.existsSync(path.join(destDir, 'sub', 'file2.txt')), false, 'old content replaced');

    // 4. replaceDirAtomic rollback on failure
    const rollbackDest = path.join(tmpRoot, 'rollback-dest');
    fs.mkdirSync(rollbackDest, { recursive: true });
    fs.writeFileSync(path.join(rollbackDest, 'original.txt'), 'original content that must survive');

    const badSrc = path.join(tmpRoot, 'bad-src');
    fs.mkdirSync(badSrc, { recursive: true });
    fs.writeFileSync(path.join(badSrc, 'new.txt'), 'new staged content');

    const originalRenameSync = fs.renameSync;
    let renameAttempts = 0;
    try {
      // Simulate failure on the second rename (staged -> dest)
      fs.renameSync = (from, to) => {
        renameAttempts++;
        if (renameAttempts === 2) {
          throw new Error('Simulated disk/permission failure renaming staged to dest');
        }
        return originalRenameSync(from, to);
      };

      assert.throws(
        () => atomicFs.replaceDirAtomic(badSrc, rollbackDest),
        /Simulated disk\/permission failure/
      );

      // Verify rollback restored the original destination directory
      assert.strictEqual(fs.existsSync(rollbackDest), true, 'dest must exist after rollback');
      assert.strictEqual(
        fs.readFileSync(path.join(rollbackDest, 'original.txt'), 'utf-8'),
        'original content that must survive',
        'original content must be preserved by rollback'
      );
    } finally {
      fs.renameSync = originalRenameSync;
    }

    // 5. copyDirRecursive (skips node_modules and dot-files)
    const recursiveSrc = path.join(tmpRoot, 'recursive-src');
    fs.mkdirSync(path.join(recursiveSrc, 'node_modules', 'dep'), { recursive: true });
    fs.mkdirSync(path.join(recursiveSrc, '.git'), { recursive: true });
    fs.mkdirSync(path.join(recursiveSrc, 'valid-dir'), { recursive: true });
    fs.writeFileSync(path.join(recursiveSrc, 'node_modules', 'dep', 'package.json'), '{}');
    fs.writeFileSync(path.join(recursiveSrc, '.git', 'HEAD'), 'ref: refs/heads/main');
    fs.writeFileSync(path.join(recursiveSrc, '.env'), 'SECRET=test');
    fs.writeFileSync(path.join(recursiveSrc, 'valid-dir', 'code.js'), 'console.log("hi");');
    fs.writeFileSync(path.join(recursiveSrc, 'root.txt'), 'root file');

    const recursiveDest = path.join(tmpRoot, 'recursive-dest');
    atomicFs.copyDirRecursive(recursiveSrc, recursiveDest);

    assert.strictEqual(fs.existsSync(path.join(recursiveDest, 'valid-dir', 'code.js')), true);
    assert.strictEqual(fs.existsSync(path.join(recursiveDest, 'root.txt')), true);
    assert.strictEqual(fs.existsSync(path.join(recursiveDest, 'node_modules')), false, 'node_modules must be excluded');
    assert.strictEqual(fs.existsSync(path.join(recursiveDest, '.git')), false, '.git must be excluded');
    assert.strictEqual(fs.existsSync(path.join(recursiveDest, '.env')), false, '.env must be excluded');

    // 6. extractTarball
    const tarContentDir = path.join(tmpRoot, 'tar-content');
    fs.mkdirSync(tarContentDir, { recursive: true });
    fs.writeFileSync(path.join(tarContentDir, 'archive-file.txt'), 'tarball content');

    const tarFile = path.join(tmpRoot, 'archive.tar.gz');
    const tarCreateRes = spawnSync('tar', ['-czf', tarFile, '-C', tmpRoot, 'tar-content']);
    if (tarCreateRes.status === 0) {
      const extractDest = path.join(tmpRoot, 'tar-extracted');
      atomicFs.extractTarball(tarFile, extractDest);
      assert.strictEqual(
        fs.readFileSync(path.join(extractDest, 'tar-content', 'archive-file.txt'), 'utf-8'),
        'tarball content'
      );
    }

    // Invalid tarball error handling
    const invalidTarFile = path.join(tmpRoot, 'not-a-tar.tar.gz');
    fs.writeFileSync(invalidTarFile, 'not valid gzip or tar data');
    assert.throws(
      () => atomicFs.extractTarball(invalidTarFile, path.join(tmpRoot, 'invalid-extract')),
      /tar extraction failed/
    );

  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log('✔ atomic-fs.js tests passed');
}

async function runAll() {
  console.log('==============================================');
  console.log('Running shared libraries test suite');
  console.log('==============================================');

  await testYamlParser();
  await testGithubClient();
  await testAtomicFs();

  console.log('==============================================');
  console.log('All shared library unit tests passed successfully!');
  console.log('==============================================');
}

runAll().catch((err) => {
  console.error('Test suite failed with error:', err);
  process.exit(1);
});
