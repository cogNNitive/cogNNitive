/**
 * scripts/lib/skills-commands.test.js
 *
 * `status` and `update` cover installed catalog bluepriNNts that the state file
 * does not record (#611): a package under the blueprints dir hydrated outside
 * the manager, older than the catalog, must not read as "up to date". Every
 * run uses an isolated HOME, an explicit catalog and a local manifest server.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const managerScript = path.join(__dirname, '..', 'skills-manager.js');
const COMMIT = '1111111111111111111111111111111111111111';
const INSTALL_COMMAND =
  'node ~/.agents/skills/nn-skills-lifecycle/scripts/skills-manager.js install --blueprint coNNtent --yes';

const MANIFEST = `---
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-sample
      repo: cogNNitive/actioNN
      path: skills/nn-sample
      version: "1.0.0"
      commit: "${COMMIT}"
---
# Manifest`;

function serve(content) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/manifest.md`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

function run(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [managerScript, ...args], { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += c; });
    child.stderr.on('data', (c) => { stderr += c; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

/** One installed, up-to-date skill; optionally a hydrated coNNtent package the state does not record. */
async function fixture({ engine } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-commands-bp-'));
  const home = path.join(root, 'home');
  const skillsDir = path.join(root, 'skills');
  const blueprintsDir = path.join(root, 'bluepriNNts');
  const stateFile = path.join(root, 'bootstrap-state.json');
  const catalogFile = path.join(root, 'catalog.json');
  fs.mkdirSync(home, { recursive: true });
  fs.mkdirSync(path.join(skillsDir, 'nn-sample'), { recursive: true });
  fs.writeFileSync(path.join(skillsDir, 'nn-sample', 'SKILL.md'), '# sample\n');
  fs.mkdirSync(blueprintsDir, { recursive: true });
  if (engine) {
    fs.mkdirSync(path.join(blueprintsDir, 'coNNtent'), { recursive: true });
    fs.writeFileSync(
      path.join(blueprintsDir, 'coNNtent', 'spec_NN.md'),
      `---\nlevel: 2\nblueprint_name: "coNNtent"\nblueprint_version: "${engine}"\n---\n# coNNtent\n`,
    );
  }
  fs.writeFileSync(stateFile, JSON.stringify({ skills: { 'nn-sample': { commit: COMMIT, version: '1.0.0' } }, blueprints: {} }));
  fs.writeFileSync(
    catalogFile,
    JSON.stringify({
      blueprints: {
        coNNtent: { name: 'coNNtent', adopted: 'V_0-18-0', release_tag: 'blueprints-v0.58.0', versions: [{ blueprint_version: 'V_0-18-0' }] },
      },
    }),
  );
  const server = await serve(MANIFEST);
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    SM_MANIFEST_URL: server.url,
    COGNNITIVE_CATALOG: catalogFile,
  };
  delete env.SM_CATALOG;
  const flags = ['--skills-dir', skillsDir, '--blueprints-dir', blueprintsDir, '--state', stateFile, '--agent', 'claude'];
  return {
    env,
    flags,
    close: async () => {
      await server.close();
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

test('status lists a hydrated catalog bluepriNNt older than the catalog as outdated, with the install command', async () => {
  const f = await fixture({ engine: 'V_0-15-1' });
  try {
    const res = await run(['status', ...f.flags], f.env);
    assert.strictEqual(res.status, 0, res.stderr);
    const row = res.stdout.split('\n').find((l) => /^catalog\s*\|\s*coNNtent\s*\|/.test(l));
    assert.ok(row, res.stdout);
    assert.deepStrictEqual(row.split('|').map((c) => c.trim()), ['catalog', 'coNNtent', 'V_0-18-0', 'V_0-15-1', 'outdated']);
    assert.ok(res.stdout.includes(INSTALL_COMMAND), res.stdout);
  } finally {
    await f.close();
  }
});

test('update selects a hydrated catalog bluepriNNt older than the catalog instead of reporting up to date', async () => {
  const f = await fixture({ engine: 'V_0-15-1' });
  try {
    // No --yes and no TTY: the consent gate names what would be updated and exits 2.
    const res = await run(['update', ...f.flags], f.env);
    assert.strictEqual(res.status, 2, `${res.stdout}\n${res.stderr}`);
    assert.ok(!res.stdout.includes('up to date'), res.stdout);
    assert.ok(/needs decision: .*catalog:coNNtent/.test(res.stdout), res.stdout);
  } finally {
    await f.close();
  }
});

test('update reports up to date when the hydrated bluepriNNt matches the catalog', async () => {
  const f = await fixture({ engine: 'V_0-18-0' });
  try {
    const res = await run(['update', ...f.flags], f.env);
    assert.strictEqual(res.status, 0, res.stderr);
    assert.ok(res.stdout.includes('All skills, templates, and console assets up to date.'), res.stdout);
  } finally {
    await f.close();
  }
});

test('skills-only output of status and update is unchanged (existing behaviour)', async () => {
  const f = await fixture();
  try {
    const status = await run(['status', ...f.flags], f.env);
    assert.strictEqual(status.status, 0, status.stderr);
    assert.strictEqual(
      status.stdout,
      [
        'Type  | Name      | Pinned  | Installed | Status    ',
        '----- | --------- | ------- | --------- | ----------',
        'skill | nn-sample | 1111111 | 1111111   | up-to-date',
        '',
      ].join('\n'),
    );
    const update = await run(['update', ...f.flags], f.env);
    assert.strictEqual(update.status, 0, update.stderr);
    assert.strictEqual(update.stdout.split('\n')[0], 'All skills, templates, and console assets up to date.');
  } finally {
    await f.close();
  }
});
