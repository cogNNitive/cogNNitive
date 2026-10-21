/**
 * scripts/manifest/lib/entry-version.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  readSkillVersion,
  readBlueprintVersion,
  readMcpVersion,
  readConsoleVersion,
  readEntryVersion,
} = require('./entry-version.js');

test('readSkillVersion extracts version from SKILL.md frontmatter', () => {
  const frontmatterText = `---
name: test-skill
version: "2.10.0"
description: test
---
# Test`;

  assert.equal(readSkillVersion(frontmatterText), '2.10.0');

  const metaObj = { version: '2.9.0' };
  assert.equal(readSkillVersion(metaObj), '2.9.0');

  const metaNested = { metadata: { version: '1.5.0' } };
  assert.equal(readSkillVersion(metaNested), '1.5.0');
});

test('readBlueprintVersion extracts version from spec frontmatter', () => {
  const specText = `---
name: test-spec
spec_version: "0.20.0"
---
# Spec`;
  assert.equal(readBlueprintVersion(specText), '0.20.0');

  const specVersionAlt = `---
name: test-spec
version: "0.19.2"
---
# Spec`;
  assert.equal(readBlueprintVersion(specVersionAlt), '0.19.2');

  const rawVersionTag = `# Spec V_0-18-0\nSome text`;
  assert.equal(readBlueprintVersion(rawVersionTag), 'V_0-18-0');
});

test('readMcpVersion extracts version from innfo-mcp package.json', () => {
  const pkg = JSON.stringify({ name: '@cognnitive/nn-mcp', version: '0.12.0' });
  assert.equal(readMcpVersion(pkg), '0.12.0');
  assert.equal(readMcpVersion({ version: '0.12.0' }), '0.12.0');
});

test('readConsoleVersion extracts version from console package.json', () => {
  const pkg = JSON.stringify({ name: '@cognnitive/innfo-console', version: '0.3.0', private: true });
  assert.equal(readConsoleVersion(pkg), '0.3.0');
  assert.equal(readConsoleVersion({ version: '0.3.0' }), '0.3.0');
});

test('readEntryVersion dispatches by section / key', () => {
  assert.equal(
    readEntryVersion({
      section: 'skills',
      content: '---\nversion: "2.10.0"\n---',
    }),
    '2.10.0'
  );

  assert.equal(
    readEntryVersion({
      section: 'blueprints',
      content: '---\nspec_version: "0.20.0"\n---',
    }),
    '0.20.0'
  );

  assert.equal(
    readEntryVersion({
      section: 'mcp',
      content: JSON.stringify({ version: '0.12.0' }),
    }),
    '0.12.0'
  );

  assert.equal(
    readEntryVersion({
      section: 'console',
      content: JSON.stringify({ version: '0.3.0' }),
    }),
    '0.3.0'
  );
});
