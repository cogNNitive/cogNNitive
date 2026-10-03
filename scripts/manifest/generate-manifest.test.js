#!/usr/bin/env node
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const generatorScript = path.join(__dirname, 'generate-manifest.js');

function freshGeneratorModule() {
  delete require.cache[require.resolve(generatorScript)];
  return require(generatorScript);
}

function createTempSourceDir({ source, body, banner }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eNNvironment-gen-test-'));
  const manifestDir = path.join(tmpDir, 'manifest');
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(path.join(manifestDir, 'source.yaml'), source, 'utf-8');
  fs.writeFileSync(path.join(manifestDir, 'body.md'), body, 'utf-8');
  if (banner !== undefined) {
    fs.writeFileSync(path.join(manifestDir, 'body.preview-banner.md'), banner, 'utf-8');
  }
  fs.mkdirSync(path.join(tmpDir, 'docs', 'use'), { recursive: true });
  return tmpDir;
}

const BASIC_SOURCE = `version: "2.0"
entrypoint: "workspace_NN.md"
skills:
  - name: nn-router
    repo: cogNNitive/cogNNitive
    path: actioNN/skills/nn-router
    version: "3.2"
    ref_key: skills
    description: Central system governance and skill router.
templates: []
workflows: []
channels:
  stable:
    refs:
      - key: skills
        repo: cogNNitive/cogNNitive
        ref: skills-v1.0.0
  preview:
    refs:
      - key: skills
        repo: cogNNitive/cogNNitive
        ref: feat/innfo-v0-2-0-adoption
`;

const MCP_SOURCE = `version: "2.0"
entrypoint: "workspace_NN.md"
skills:
  - name: nn-innfo
    repo: cogNNitive/cogNNitive
    path: actioNN/skills/nn-innfo
    version: "V_0-1-0"
    ref_key: skills
    description: Author and validate iNNfo models.
    mcp:
      - name: innfo-mcp
        repo: cogNNitive/cogNNitive
        path: iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js
        version: "0.2.1"
        ref_key: innfo-mcp
templates: []
workflows: []
channels:
  stable:
    refs:
      - key: skills
        repo: cogNNitive/cogNNitive
        ref: skills-v1.0.0
      - key: innfo-mcp
        repo: cogNNitive/cogNNitive
        ref: innfo-mcp-v0.2.1
  preview:
    refs:
      - key: skills
        repo: cogNNitive/cogNNitive
        ref: feat/innfo-v0-2-0-adoption
      - key: innfo-mcp
        repo: cogNNitive/cogNNitive
        ref: feat/business-template-decomposition
`;

const CONSOLE_SOURCE = `version: "2.0"
entrypoint: "workspace_NN.md"
skills: []
templates: []
console_assets:
  - name: innfo-console
    repo: cogNNitive/cogNNitive
    file: iNNfo/specs/templates/console/innfo-console.bundle.js
    version: "0.1.0"
    ref_key: innfo-console
workflows: []
channels:
  stable:
    refs:
      - key: innfo-console
        repo: cogNNitive/cogNNitive
        ref: innfo-console-v0.1.0
  preview:
    refs:
      - key: innfo-console
        repo: cogNNitive/cogNNitive
        ref: main
`;

const BASIC_BODY = `# cogNNitive — bootstrap manifest

Body prose goes here.
`;

function fakeResolveRef(tagShas, branchShas) {
  return async (repo, ref) => {
    if (Object.prototype.hasOwnProperty.call(tagShas, ref)) {
      return { sha: tagShas[ref], kind: 'tag' };
    }
    if (Object.prototype.hasOwnProperty.call(branchShas, ref)) {
      return { sha: branchShas[ref], kind: 'branch' };
    }
    return { error: `ref '${ref}' not found in ${repo}` };
  };
}

async function main() {
  console.log('Running generate-manifest unit tests...');

  // 1. Determinism: re-rendering the same source produces byte-identical output
  {
    const mod = freshGeneratorModule();
    const source = mod.parseSourceYaml(BASIC_SOURCE);
    const resolveRef = fakeResolveRef({}, { 'feat/innfo-v0-2-0-adoption': 'cccccccccccccccccccccccccccccccccccccccc' });
    const first = await mod.renderManifest(source, 'preview', BASIC_BODY, resolveRef);
    const second = await mod.renderManifest(source, 'preview', BASIC_BODY, resolveRef);
    assert.strictEqual(typeof first, 'string');
    assert.strictEqual(first, second, 'regeneration with no upstream change must be byte-identical');
    console.log('✔ Determinism (byte-identical re-render) test passed');
  }

  // 2. LF only, single trailing newline, no trailing whitespace on any line
  {
    const mod = freshGeneratorModule();
    const source = mod.parseSourceYaml(BASIC_SOURCE);
    const resolveRef = fakeResolveRef({}, { 'feat/innfo-v0-2-0-adoption': 'cccccccccccccccccccccccccccccccccccccccc' });
    const rendered = await mod.renderManifest(source, 'preview', BASIC_BODY, resolveRef);
    assert.ok(!rendered.includes('\r'), 'output must not contain CR');
    assert.ok(rendered.endsWith('\n') && !rendered.endsWith('\n\n'), 'output must end with exactly one trailing newline');
    for (const line of rendered.split('\n')) {
      assert.strictEqual(line, line.replace(/[ \t]+$/, ''), `line has trailing whitespace: ${JSON.stringify(line)}`);
    }
    console.log('✔ LF + single trailing newline + no trailing whitespace test passed');
  }

  // 3. note: field renders as deterministic # lines above the entry
  {
    const mod = freshGeneratorModule();
    const sourceWithNote = `version: "2.0"
entrypoint: "workspace_NN.md"
skills:
  - name: nn-router
    repo: cogNNitive/cogNNitive
    path: actioNN/skills/nn-router
    version: "3.2"
    ref_key: skills
    note: provisional pin, re-check after next release
    description: Central system governance and skill router.
templates: []
workflows: []
channels:
  preview:
    refs:
      - key: skills
        repo: cogNNitive/cogNNitive
        ref: feat/innfo-v0-2-0-adoption
`;
    const source = mod.parseSourceYaml(sourceWithNote);
    const resolveRef = fakeResolveRef({}, { 'feat/innfo-v0-2-0-adoption': 'cccccccccccccccccccccccccccccccccccccccc' });
    const rendered = await mod.renderManifest(source, 'preview', BASIC_BODY, resolveRef);
    assert.match(rendered, /# provisional pin, re-check after next release\r?\n\s*- name: nn-router/, 'note must render as a # comment line directly above its entry');
    console.log('✔ note: rendering test passed');
  }

  // 4. All-or-nothing: a resolution failure aborts without writing any file
  {
    const tmpDir = createTempSourceDir({ source: BASIC_SOURCE, body: BASIC_BODY });
    try {
      const mod = freshGeneratorModule();
      const outPath = path.join(tmpDir, 'docs', 'use', 'manifest-next.md');
      const resolveRef = fakeResolveRef({}, {}); // nothing resolves -> forces failure
      const exitCode = await mod.run(['--channel', 'preview'], { cwd: tmpDir, resolveRef, log: () => {}, logError: () => {} });
      assert.strictEqual(exitCode, 2, 'resolution failure must exit 2');
      assert.ok(!fs.existsSync(outPath), 'no manifest file must be written on resolution failure');
      console.log('✔ All-or-nothing on resolution failure test passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 5. --check reports drift with exit 1 and does not touch the on-disk file
  {
    const tmpDir = createTempSourceDir({ source: BASIC_SOURCE, body: BASIC_BODY });
    try {
      const mod = freshGeneratorModule();
      const outPath = path.join(tmpDir, 'docs', 'use', 'manifest-next.md');
      fs.writeFileSync(outPath, 'stale hand-edited content\n', 'utf-8');
      const resolveRef = fakeResolveRef({}, { 'feat/innfo-v0-2-0-adoption': 'cccccccccccccccccccccccccccccccccccccccc' });
      const errors = [];
      const exitCode = await mod.run(['--channel', 'preview', '--check'], { cwd: tmpDir, resolveRef, log: () => {}, logError: (msg) => errors.push(msg) });
      assert.strictEqual(exitCode, 1, '--check drift must exit 1');
      assert.strictEqual(fs.readFileSync(outPath, 'utf-8'), 'stale hand-edited content\n', '--check must not modify the on-disk file');
      assert.ok(errors.length > 0, '--check drift must report a diff on stderr');
      console.log('✔ --check drift test passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 6. --check passes (exit 0) when the on-disk file is byte-identical to the render
  {
    const tmpDir = createTempSourceDir({ source: BASIC_SOURCE, body: BASIC_BODY });
    try {
      const mod = freshGeneratorModule();
      const resolveRef = fakeResolveRef({}, { 'feat/innfo-v0-2-0-adoption': 'cccccccccccccccccccccccccccccccccccccccc' });
      const writeExit = await mod.run(['--channel', 'preview'], { cwd: tmpDir, resolveRef, log: () => {}, logError: () => {} });
      assert.strictEqual(writeExit, 0, 'initial write must succeed');
      const checkExit = await mod.run(['--channel', 'preview', '--check'], { cwd: tmpDir, resolveRef, log: () => {}, logError: () => {} });
      assert.strictEqual(checkExit, 0, '--check must pass when the file is already up to date');
      console.log('✔ --check up-to-date test passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 7. --out writes to a custom path
  {
    const tmpDir = createTempSourceDir({ source: BASIC_SOURCE, body: BASIC_BODY });
    try {
      const mod = freshGeneratorModule();
      const customOut = path.join(tmpDir, 'custom-manifest.md');
      const resolveRef = fakeResolveRef({}, { 'feat/innfo-v0-2-0-adoption': 'cccccccccccccccccccccccccccccccccccccccc' });
      const exitCode = await mod.run(['--channel', 'preview', '--out', customOut], { cwd: tmpDir, resolveRef, log: () => {}, logError: () => {} });
      assert.strictEqual(exitCode, 0);
      assert.ok(fs.existsSync(customOut), '--out must write to the given path');
      console.log('✔ --out custom path test passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 8. Preview channel prepends the banner and never touches the stable file
  {
    const tmpDir = createTempSourceDir({ source: BASIC_SOURCE, body: BASIC_BODY, banner: '> PREVIEW — not for production.\n' });
    try {
      const mod = freshGeneratorModule();
      const resolveRef = fakeResolveRef({}, { 'feat/innfo-v0-2-0-adoption': 'cccccccccccccccccccccccccccccccccccccccc' });
      const exitCode = await mod.run(['--channel', 'preview'], { cwd: tmpDir, resolveRef, log: () => {}, logError: () => {} });
      assert.strictEqual(exitCode, 0);
      const previewPath = path.join(tmpDir, 'docs', 'use', 'manifest-next.md');
      const stablePath = path.join(tmpDir, 'docs', 'use', 'manifest.md');
      assert.ok(fs.existsSync(previewPath), 'preview channel must write manifest-next.md');
      assert.ok(!fs.existsSync(stablePath), 'preview generation must not touch the stable file');
      const content = fs.readFileSync(previewPath, 'utf-8');
      assert.match(content, /PREVIEW — not for production/, 'preview banner must be prepended to the body');
      console.log('✔ Preview channel banner + isolation test passed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  // 9. Stable channel is rejected (assembled strictly by release workflow)
  {
    const mod = freshGeneratorModule();
    const source = mod.parseSourceYaml(BASIC_SOURCE);
    const resolveRef = fakeResolveRef({ 'skills-v1.0.0': 'd60a7109315820085ab127b70412992db6986c88' }, {});
    const result = await mod.renderManifest(source, 'stable', BASIC_BODY, resolveRef);
    assert.strictEqual(typeof result, 'object');
    assert.match(String(result.error), /release workflow/i);

    const errors = [];
    const exitCode = await mod.run(['--channel', 'stable'], { cwd: process.cwd(), resolveRef, log: () => {}, logError: (msg) => errors.push(msg) });
    assert.strictEqual(exitCode, 2);
    assert.ok(errors.some((e) => /preview is required/i.test(e)));
    console.log('✔ stable channel is rejected by generate-manifest test passed');
  }

  // 10. An mcp entry carries its own display version in preview.
  {
    const mod = freshGeneratorModule();
    const source = mod.parseSourceYaml(MCP_SOURCE);
    const resolveRef = fakeResolveRef({}, {
      'feat/innfo-v0-2-0-adoption': 'cccccccccccccccccccccccccccccccccccccccc',
      'feat/business-template-decomposition': 'dddddddddddddddddddddddddddddddddddddddd',
    });
    const rendered = await mod.renderManifest(source, 'preview', BASIC_BODY, resolveRef);
    assert.match(rendered, /version: "0\.2\.1"/, 'mcp entry must render its version field');
    console.log('✔ mcp version field is rendered in preview test passed');
  }

  // 11. Console assets in preview
  {
    const mod = freshGeneratorModule();
    const source = mod.parseSourceYaml(CONSOLE_SOURCE);
    const commit = 'a'.repeat(40);
    const resolveRef = fakeResolveRef({}, { main: commit });
    const rendered = await mod.renderManifest(source, 'preview', BASIC_BODY, resolveRef);
    assert.strictEqual(typeof rendered, 'string', 'console asset must resolve on the preview channel');
    assert.match(rendered, /\n  console-assets:\n/, 'console-assets block must be emitted');
    assert.match(rendered, /- file: iNNfo\/specs\/templates\/console\/innfo-console\.bundle\.js/, 'file must render');
    assert.match(rendered, /ref: "main"/, 'ref must render');
    assert.match(rendered, new RegExp(`commit: "${commit}"`), 'commit must render');
    console.log('✔ console-assets block rendering in preview test passed');
  }

  console.log('All generate-manifest unit tests passed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
