/**
 * scripts/guard-template-immutability.test.js
 *
 * Plain-node tests for guard-template-immutability.js.
 * Zero external test framework dependencies.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawn } = require('child_process');

const guardScript = path.join(__dirname, 'guard-template-immutability.js');

function runGuard(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn('node', [guardScript, ...args], { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

async function runTests() {
  console.log('Running template immutability guard tests...');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-immutability-'));
  const templatesRoot = path.join(tmpDir, 'iNNfo', 'specs', 'templates');

  const writeFixture = (lines, name = 'diff.txt') => {
    const file = path.join(tmpDir, name);
    fs.writeFileSync(file, lines.join('\n') + '\n', 'utf-8');
    return file;
  };
  const writeTemplate = (relPath, content) => {
    const file = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf-8');
  };
  const argsFor = (fixture) => ['--diff-file', fixture, '--root', templatesRoot];

  try {
    // 1. Modified versioned template → exit 1 with bump-and-rename remediation
    {
      const fixture = writeFixture([
        'M\tiNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md',
      ]);
      const res = await runGuard(argsFor(fixture), tmpDir);
      assert.strictEqual(res.status, 1, 'M status must exit 1');
      assert.ok(
        res.stdout.includes('workspace_V_0-2-0_spec_NN.md'),
        'error must name the modified file',
      );
      assert.ok(
        /template_version/.test(res.stdout) && /versioned filename/.test(res.stdout),
        'error must carry the bump-and-rename remediation',
      );
      console.log('✔ Modified versioned template fails the guard with remediation');
    }

    // 2. Added template with mismatched template_version → exit 1
    {
      const fixture = writeFixture([
        'A\tiNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md',
      ]);
      writeTemplate(
        'iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md',
        '---\ntemplate_version: "V_0-2-0"\n---\n',
      );
      const res = await runGuard(argsFor(fixture), tmpDir);
      assert.strictEqual(res.status, 1, 'version mismatch must exit 1');
      assert.ok(res.stdout.includes('workspace_V_0-3-0_spec_NN.md'));
      assert.ok(res.stdout.includes('V_0-2-0'), 'error must report the declared version');
      console.log('✔ Added template with mismatched template_version fails');
    }

    // 3. Added template with matching template_version → exit 0
    {
      const fixture = writeFixture([
        'A\tiNNfo/specs/templates/business_V_0-5-0_NN.md',
      ]);
      writeTemplate(
        'iNNfo/specs/templates/business_V_0-5-0_NN.md',
        '---\ntemplate_version: "V_0-5-0"\n---\n',
      );
      const res = await runGuard(argsFor(fixture), tmpDir);
      assert.strictEqual(res.status, 0, 'matching version must exit 0');
      console.log('✔ Added template with matching template_version passes');
    }

    // 4. Rename (R100 old → new) → pass
    {
      const fixture = writeFixture([
        'R100\tiNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md\tiNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md',
      ]);
      const res = await runGuard(argsFor(fixture), tmpDir);
      assert.strictEqual(res.status, 0, 'renames must exit 0');
      console.log('✔ Renamed versioned template passes');
    }

    // 5. Deletion → pass (version pruning)
    {
      const fixture = writeFixture([
        'D\tiNNfo/specs/templates/workspace_V_0-1-0_spec_NN.md',
      ]);
      const res = await runGuard(argsFor(fixture), tmpDir);
      assert.strictEqual(res.status, 0, 'deletion must exit 0');
      console.log('✔ Deleted versioned template passes');
    }

    // 6. Clean diff → exit 0
    {
      const fixture = writeFixture([]);
      const res = await runGuard(argsFor(fixture), tmpDir);
      assert.strictEqual(res.status, 0, 'clean diff must exit 0');
      console.log('✔ Clean diff exits zero');
    }

    // 7. Modified sample model under samples/ is not a template → not an error
    {
      const fixture = writeFixture([
        'M\tiNNfo/specs/templates/samples/Ghostbusters_V_0-2-0_business_NN.md',
      ]);
      const res = await runGuard(argsFor(fixture), tmpDir);
      assert.strictEqual(res.status, 0, 'samples/ M must not fail the guard');
      console.log('✔ Modified sample model under samples/ is not flagged');
    }

    console.log('All template immutability guard tests passed successfully!\n');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});