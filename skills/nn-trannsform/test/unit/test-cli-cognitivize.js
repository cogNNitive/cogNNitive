const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const INDEX = path.resolve(__dirname, '..', '..', 'scripts', 'index.js');

function cli(args) {
  return spawnSync(process.execPath, [INDEX, ...args], { encoding: 'utf8' });
}

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-cog-'));
  fs.mkdirSync(path.join(dir, 'sources', 'import', 'sub'), { recursive: true });
  return dir;
}

function put(root, rel, text) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');
}

function sidecarBody(root, rel) {
  return fs.readFileSync(path.join(root, `${rel}_sidecar_NN.md`), 'utf8').replace(/^normalized_at:.*$/m, 'normalized_at: -');
}

async function run() {
  let passed = 0;
  let failed = 0;

  async function it(desc, fn) {
    try {
      await fn();
      console.log(`  PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${desc}`);
      console.error(err);
      failed++;
    }
  }

  console.log('\n--- test-cli-cognitivize ---');

  await it('--cognitivize <dir> recurses, skips sidecars and staging, never writes a sidecar of a sidecar', () => {
    const root = tmp();
    try {
      put(root, 'sources/import/a.md', '# A\n');
      put(root, 'sources/import/sub/b.csv', 'x,y\n1,2\n');
      put(root, 'sources/import/staging/draft.md', '# draft\n');
      const first = cli(['--src', root, '--cognitivize', 'sources/import']);
      assert.strictEqual(first.status, 0, first.stderr + first.stdout);
      const imp = path.join(root, 'sources', 'import');
      assert.ok(fs.existsSync(path.join(imp, 'a.md_sidecar_NN.md')));
      assert.ok(fs.existsSync(path.join(imp, 'sub', 'b.csv_sidecar_NN.md')));
      assert.ok(!fs.existsSync(path.join(imp, 'staging', 'draft.md_sidecar_NN.md')), 'staging is scratch');

      // A second run sees the sidecars on disk and must not cognitivize them.
      const second = cli(['--src', root, '--cognitivize', 'sources/import']);
      assert.strictEqual(second.status, 0, second.stderr + second.stdout);
      assert.ok(!fs.existsSync(path.join(imp, 'a.md_sidecar_NN.md_sidecar_NN.md')), 'no sidecar of a sidecar');
      const all = fs.readdirSync(imp, { recursive: true }).map(String);
      assert.deepStrictEqual(
        all.filter((f) => /_sidecar_NN\.md_sidecar_NN/.test(f)),
        [],
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await it('--cognitivize <file> cognitivizes exactly that file', () => {
    const root = tmp();
    try {
      put(root, 'sources/import/a.md', '# A\n');
      put(root, 'sources/import/c.md', '# C\n');
      const res = cli(['--src', root, '--cognitivize', 'sources/import/a.md']);
      assert.strictEqual(res.status, 0, res.stderr + res.stdout);
      assert.ok(fs.existsSync(path.join(root, 'sources/import/a.md_sidecar_NN.md')));
      assert.ok(!fs.existsSync(path.join(root, 'sources/import/c.md_sidecar_NN.md')));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  await it('--scan writes the same sidecar bytes as --cognitivize (one operation)', () => {
    const viaScan = tmp();
    const viaCog = tmp();
    try {
      for (const root of [viaScan, viaCog]) put(root, 'sources/import/a.md', '---\ntitle: "Hello"\n---\n# A\n');
      assert.strictEqual(cli(['--src', viaScan, '--scan']).status, 0);
      assert.strictEqual(cli(['--src', viaCog, '--cognitivize', 'sources/import']).status, 0);
      assert.strictEqual(sidecarBody(viaScan, 'sources/import/a.md'), sidecarBody(viaCog, 'sources/import/a.md'));
    } finally {
      fs.rmSync(viaScan, { recursive: true, force: true });
      fs.rmSync(viaCog, { recursive: true, force: true });
    }
  });

  await it('--cognitivize rejects a path outside the project and exits non-zero', () => {
    const root = tmp();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-out-'));
    try {
      put(outside, 'x.md', '# x\n');
      const res = cli(['--src', root, '--cognitivize', path.join(outside, 'x.md')]);
      assert.notStrictEqual(res.status, 0);
      assert.ok(!fs.existsSync(path.join(outside, 'x.md_sidecar_NN.md')));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  await it('--flat is gone: the CLI source no longer reads it and --scan ignores it', () => {
    const src = fs.readFileSync(INDEX, 'utf8');
    assert.ok(!/argv\.flat|preserve-layout/.test(src), 'index.js still reads --flat');
    const root = tmp();
    try {
      put(root, 'sources/import/a.md', '# A\n');
      const res = cli(['--src', root, '--scan', '--flat']);
      assert.strictEqual(res.status, 0, res.stderr + res.stdout);
      assert.ok(fs.existsSync(path.join(root, 'sources/import/a.md_sidecar_NN.md')));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  return { passed, failed };
}

module.exports = { run };

if (require.main === module) {
  run().then((res) => process.exit(res.failed > 0 ? 1 : 0));
}
