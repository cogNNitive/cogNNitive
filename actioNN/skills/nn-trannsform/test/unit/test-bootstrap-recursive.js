const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { bootstrapProject } = require('../../scripts/lib/bootstrap');

/**
 * Regression test for the bootstrap copy: files in subfolders of the source
 * directory must land under sources/original/ with their structure preserved.
 * The old implementation did a flat readdirSync + isFile() and silently
 * dropped everything below the top level.
 */
function run() {
  let passed = 0;
  let failed = 0;

  function check(cond, msg) {
    if (cond) {
      console.log(`  PASS: ${msg}`);
      passed++;
    } else {
      console.log(`  FAIL: ${msg}`);
      failed++;
    }
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nnt-bootstrap-'));
  try {
    const srcDir = path.join(tmp, 'incoming');
    const destParent = path.join(tmp, 'workspaces');
    fs.mkdirSync(path.join(srcDir, 'clientA', 'deep'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'clientB'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'top.txt'), 'top');
    fs.writeFileSync(path.join(srcDir, 'clientA', 'report.md'), 'a');
    fs.writeFileSync(path.join(srcDir, 'clientA', 'deep', 'notes.txt'), 'deep');
    fs.writeFileSync(path.join(srcDir, 'clientB', 'memo.md'), 'b');
    // Ignored by walkOriginal — must not be copied.
    fs.writeFileSync(path.join(srcDir, '.DS_Store'), 'x');
    fs.mkdirSync(path.join(srcDir, 'staging'));
    fs.writeFileSync(path.join(srcDir, 'staging', 'scratch.txt'), 'x');

    const result = bootstrapProject(srcDir, destParent, 'Proj');
    const orig = path.join(destParent, 'Proj', 'sources', 'original');

    check(result.copiedCount === 4, `copiedCount is 4 (got ${result.copiedCount})`);
    check(fs.existsSync(path.join(orig, 'top.txt')), 'top-level file copied');
    check(
      fs.existsSync(path.join(orig, 'clientA', 'report.md')),
      'subfolder file copied with structure preserved',
    );
    check(
      fs.existsSync(path.join(orig, 'clientA', 'deep', 'notes.txt')),
      'nested subfolder file copied',
    );
    check(fs.existsSync(path.join(orig, 'clientB', 'memo.md')), 'sibling subfolder file copied');
    check(!fs.existsSync(path.join(orig, '.DS_Store')), 'dotfile not copied');
    check(!fs.existsSync(path.join(orig, 'staging')), 'staging/ not copied');

    // Standard workspace layout still created.
    for (const d of ['models', 'procedures', 'artifacts', path.join('sources', 'nn')]) {
      check(
        fs.existsSync(path.join(destParent, 'Proj', d)),
        `workspace dir ${d} created`,
      );
    }
    check(fs.existsSync(result.provModelPath), 'provenance model initialized');

    // No source dir → no crash, zero copied.
    const empty = bootstrapProject(undefined, destParent, 'Proj2');
    check(empty.copiedCount === 0, 'no srcDir → copiedCount 0');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  return { passed, failed };
}

module.exports = { run };

if (require.main === module) {
  const r = run();
  process.exit(r.failed > 0 ? 1 : 0);
}
