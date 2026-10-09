/**
 * scripts/guard-template-immutability.test.js
 *
 * Plain-node tests for guard-template-immutability.js (canonical-template era).
 * Zero external test framework dependencies.
 *
 * The guard runs in --diff-file mode: it reads working-tree content from
 * <tmp>/iNNfo/specs/bluepriNNts (via --root) and base-revision content from
 * <tmp>/base-templates (via --base-root).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawn, execFileSync } = require('child_process');

const guardScript = path.join(__dirname, 'guard-template-immutability.js');

function runGuard(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn('node', [guardScript, ...args], { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += c; });
    child.stderr.on('data', (c) => { stderr += c; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

const tpl = (version, body = 'Body.') =>
  `---\nspec_version: "V_0-2-1"\nlevel: 2\nblueprint_version: "${version}"\ntitle: "T"\n---\n\n# T\n\n${body}\n`;

async function runTests() {
  console.log('Running template immutability guard tests...');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-immutability-'));
  const workRoot = path.join(tmpDir, 'iNNfo', 'specs', 'bluepriNNts');
  const baseRoot = path.join(tmpDir, 'base-templates');

  const writeWork = (rel, content) => {
    const f = path.join(workRoot, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content, 'utf-8');
  };
  const writeBase = (rel, content) => {
    const f = path.join(baseRoot, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content, 'utf-8');
  };
  const writeFixture = (lines, name = 'diff.txt') => {
    const f = path.join(tmpDir, name);
    fs.writeFileSync(f, lines.join('\n') + '\n', 'utf-8');
    return f;
  };
  const args = (fixture) => [
    '--diff-file', fixture,
    '--root', workRoot,
    '--base-root', baseRoot,
    '--base', 'BASE',
  ];

  try {
    // 1. Modified template, content changed, blueprint_version NOT bumped -> exit 1
    {
      writeBase('business/spec_NN.md', tpl('V_0-2-1', 'Old body.'));
      writeWork('business/spec_NN.md', tpl('V_0-2-1', 'New body.'));
      const fx = writeFixture(['M\tiNNfo/specs/bluepriNNts/business/spec_NN.md']);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 1, 'unbumped content change must exit 1');
      assert.ok(res.stdout.includes('business/spec_NN.md'), 'names the file');
      assert.ok(/blueprint_version/.test(res.stdout), 'carries the bump remediation');
      console.log('✔ modified template without a blueprint_version bump fails');
    }

    // 2. Modified template, content changed, blueprint_version bumped -> exit 0
    {
      writeBase('projects/spec_NN.md', tpl('V_0-2-0', 'Old body.'));
      writeWork('projects/spec_NN.md', tpl('V_0-3-0', 'New body.'));
      const fx = writeFixture(['M\tiNNfo/specs/bluepriNNts/projects/spec_NN.md']);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 0, 'bumped content change must exit 0');
      console.log('✔ modified template with an incremented blueprint_version passes');
    }

    // 2b. Modified frontmatter only (same body) with same version -> exit 0
    {
      writeBase('blank/spec_NN.md', tpl('V_0-2-0', 'Same body.'));
      writeWork('blank/spec_NN.md', tpl('V_0-2-0', 'Same body.'));
      const fx = writeFixture(['M\tiNNfo/specs/bluepriNNts/blank/spec_NN.md']);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 0, 'no content change must exit 0');
      console.log('✔ a no-op M entry (identical content) passes');
    }

    // 3. Added template with a valid semver blueprint_version -> exit 0
    {
      writeWork('newthing/spec_NN.md', tpl('V_0-1-0'));
      const fx = writeFixture(['A\tiNNfo/specs/bluepriNNts/newthing/spec_NN.md']);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 0, 'valid added template must exit 0');
      console.log('✔ added template with a valid frontmatter blueprint_version passes');
    }

    // 4. Added template with missing / invalid blueprint_version -> exit 1
    {
      writeWork('broken/spec_NN.md', '---\nlevel: 2\ntitle: "T"\n---\n\n# T\n');
      const fx = writeFixture(['A\tiNNfo/specs/bluepriNNts/broken/spec_NN.md']);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 1, 'added template without a version must exit 1');
      assert.ok(res.stdout.includes('broken/spec_NN.md'));
      console.log('✔ added template without a valid blueprint_version fails');
    }

    // 5. Deleted template -> exit 0
    {
      const fx = writeFixture(['D\tiNNfo/specs/bluepriNNts/organization/organization_V_0-1-0_NN.md']);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 0, 'deletion must exit 0');
      console.log('✔ deleted template passes (history lives in git tags)');
    }

    // 6. Pure rename with no content change -> exit 0
    {
      writeBase('procedures/procedures_V_0-2-0_NN.md', tpl('V_0-2-0', 'Identical.'));
      writeWork('procedures/spec_NN.md', tpl('V_0-2-0', 'Identical.'));
      const fx = writeFixture([
        'R100\tiNNfo/specs/bluepriNNts/procedures/procedures_V_0-2-0_NN.md\tiNNfo/specs/bluepriNNts/procedures/spec_NN.md',
      ]);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 0, 'pure rename must exit 0');
      console.log('✔ pure rename (no content change) passes');
    }

    // 6b. Legacy-versioned -> canonical rename is the one-time migration: it
    //     may carry content edits (e.g. self-referential URLs) without a bump,
    //     but MUST still declare a valid blueprint_version.
    {
      writeBase('analysis/analysis_V_0-2-0_NN.md', tpl('V_0-2-0', 'Old.'));
      writeWork('analysis/spec_NN.md', tpl('V_0-2-0', 'URLs rewritten during migration.'));
      const fx = writeFixture([
        'R090\tiNNfo/specs/bluepriNNts/analysis/analysis_V_0-2-0_NN.md\tiNNfo/specs/bluepriNNts/analysis/spec_NN.md',
      ]);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 0, 'canonical migration rename is exempt from the bump');
      console.log('✔ legacy->canonical migration rename is exempt from the version bump');
    }

    // 6c. ...but a migration rename that drops blueprint_version entirely fails.
    {
      writeBase('innovation/innovation_V_0-2-0_NN.md', tpl('V_0-2-0'));
      writeWork('innovation/spec_NN.md', '---\nlevel: 2\ntitle: "T"\n---\n\n# T\n');
      const fx = writeFixture([
        'R100\tiNNfo/specs/bluepriNNts/innovation/innovation_V_0-2-0_NN.md\tiNNfo/specs/bluepriNNts/innovation/spec_NN.md',
      ]);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 1, 'migration rename without a valid version must exit 1');
      console.log('✔ migration rename that drops blueprint_version still fails');
    }

    // 7. Clean diff -> exit 0
    {
      const fx = writeFixture([]);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 0, 'clean diff must exit 0');
      console.log('✔ clean diff exits zero');
    }

    // 8. Non-template edits (samples/, assets/, procedures/) -> exit 0
    {
      const fx = writeFixture([
        'M\tiNNfo/specs/bluepriNNts/business/samples/Ghostbusters_V_0-2-1_business_NN.md',
        'M\tiNNfo/specs/bluepriNNts/assets/people/egon_spengler.png',
        'M\tiNNfo/specs/bluepriNNts/business/procedures/compile_strategic_master_NN.md',
      ]);
      const res = await runGuard(args(fx), tmpDir);
      assert.strictEqual(res.status, 0, 'non-template edits must not fail the guard');
      console.log('✔ edits to samples/assets/procedures are not flagged');
    }

    // 8b. Embedded skill edits: any A/M/D/R under <bluepriNNt>/skills/** requires the owning
    //     spec_NN.md to carry a blueprint_version greater than its base, even when the
    //     owner spec itself is not part of the diff.
    {
      writeBase('video/spec_NN.md', tpl('V_0-7-2', 'Owner body.'));
      writeWork('video/spec_NN.md', tpl('V_0-7-2', 'Owner body.'));
      const skillFile = 'iNNfo/specs/bluepriNNts/video/skills/nn-video-script/SKILL.md';

      for (const status of ['M', 'A', 'D']) {
        const fx = writeFixture([`${status}\t${skillFile}`], `skill-${status}.txt`);
        const res = await runGuard(args(fx), tmpDir);
        assert.strictEqual(res.status, 1, `${status} under skills/ without an owner bump must exit 1`);
        assert.ok(res.stdout.includes('video/spec_NN.md'), 'names the owning package spec');
        assert.ok(res.stdout.includes('skills/nn-video-script/SKILL.md'), 'names the changed skill file');
        assert.ok(/blueprint_version/.test(res.stdout), 'carries the bump remediation');
      }
      console.log('✔ skill edit (M/A/D) without an owner blueprint_version bump fails');

      const renameFx = writeFixture([
        `R100\tiNNfo/specs/bluepriNNts/video/skills/old-name/SKILL.md\t${skillFile}`,
      ], 'skill-R.txt');
      const renameRes = await runGuard(args(renameFx), tmpDir);
      assert.strictEqual(renameRes.status, 1, 'a skill rename without an owner bump must exit 1');
      console.log('✔ skill rename without an owner bump fails');

      writeWork('video/spec_NN.md', tpl('V_0-8-0', 'Owner body.'));
      const okFx = writeFixture([`M\t${skillFile}`], 'skill-ok.txt');
      const okRes = await runGuard(args(okFx), tmpDir);
      assert.strictEqual(okRes.status, 0, `owner bump must satisfy the guard. stdout: ${okRes.stdout}`);
      console.log('✔ skill edit with an owner blueprint_version bump passes');

      // Owner spec in the same diff with a body change and no bump is reported once.
      writeBase('video2/spec_NN.md', tpl('V_0-7-2', 'Old.'));
      writeWork('video2/spec_NN.md', tpl('V_0-7-2', 'New.'));
      const dupFx = writeFixture([
        'M\tiNNfo/specs/bluepriNNts/video2/spec_NN.md',
        'M\tiNNfo/specs/bluepriNNts/video2/skills/s/SKILL.md',
      ], 'skill-dup.txt');
      const dupRes = await runGuard(args(dupFx), tmpDir);
      assert.strictEqual(dupRes.status, 1);
      assert.strictEqual(
        dupRes.stdout.split('\n').filter((l) => l.includes('video2/spec_NN.md')).length,
        1,
        'the same owner must not be reported twice',
      );
      console.log('✔ owner spec already reported by the template check is not reported twice');

      // Base-less owner (brand new bluepriNNt) passes with a valid version, fails without one.
      writeWork('fresh/spec_NN.md', tpl('V_0-1-0'));
      const freshFx = writeFixture(['A\tiNNfo/specs/bluepriNNts/fresh/skills/s/SKILL.md'], 'skill-fresh.txt');
      const freshRes = await runGuard(args(freshFx), tmpDir);
      assert.strictEqual(freshRes.status, 0, `a base-less owner with a valid version must pass. stdout: ${freshRes.stdout}`);

      writeWork('nover/spec_NN.md', '---\nlevel: 2\ntitle: "T"\n---\n\n# T\n');
      const noVerFx = writeFixture(['A\tiNNfo/specs/bluepriNNts/nover/skills/s/SKILL.md'], 'skill-nover.txt');
      const noVerRes = await runGuard(args(noVerFx), tmpDir);
      assert.strictEqual(noVerRes.status, 1, 'an owner without a valid version must exit 1');
      console.log('✔ base-less owner passes only with a valid blueprint_version');

      // Markdown inside skills/ is never mistaken for a canonical bluepriNNt spec.
      const mdFx = writeFixture(['A\tiNNfo/specs/bluepriNNts/fresh/skills/s/docs/extra_spec_NN.md'], 'skill-md.txt');
      const mdRes = await runGuard(args(mdFx), tmpDir);
      assert.strictEqual(mdRes.status, 0, `skill docs must not be validated as a template. stdout: ${mdRes.stdout}`);
      console.log('✔ *_NN.md files inside skills/ are not treated as bluepriNNt specs');
    }

    // 9. Release-tag build: HEAD is an exact tag that is an ANCESTOR of a
    //    moved-on origin/main (the v0.7.2 re-run failure). The guard must diff
    //    against the merge-base (the tag itself), not origin/main, or it reports
    //    main's later blueprint_version bumps as unbumped tag edits.
    {
      const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-immutability-tag-'));
      const g = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'pipe' });
      const rel = 'iNNfo/specs/bluepriNNts/artifacts/spec_NN.md';
      try {
        g('init', '-q');
        g('config', 'user.email', 'test@example.com');
        g('config', 'user.name', 'Test');
        g('config', 'commit.gpgsign', 'false');
        fs.mkdirSync(path.join(repo, path.dirname(rel)), { recursive: true });
        fs.writeFileSync(path.join(repo, rel), tpl('V_0-3-0'));
        g('add', '-A');
        g('commit', '-qm', 'release 0.3.0');
        g('tag', 'innfo-console-v0.7.2');
        fs.writeFileSync(path.join(repo, rel), tpl('V_0-4-0'));
        g('add', '-A');
        g('commit', '-qm', 'bump blueprint_version to 0.4.0 on main');
        g('update-ref', 'refs/remotes/origin/main', 'HEAD');
        g('checkout', '-q', 'innfo-console-v0.7.2');
        const res = await runGuard(['--root', 'iNNfo/specs/bluepriNNts'], repo);
        assert.strictEqual(
          res.status,
          0,
          'a release tag older than origin/main must not fail the guard',
        );
        console.log('✔ release tag older than origin/main passes (merge-base base)');
      } finally {
        fs.rmSync(repo, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }
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
