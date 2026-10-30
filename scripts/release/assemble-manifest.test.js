/**
 * scripts/release/assemble-manifest.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { assembleManifest, AssembleManifestError } = require('./assemble-manifest.js');

const PREV_MANIFEST = `---
title: "cogNNitive — Bootstrap manifest"
channel: "stable"
agent-bootstrap:
  version: "1.0.0"
  entrypoint: "nn-router"
  skills:
    - name: nn-router
      repo: cogNNitive/cogNNitive-web
      path: skills/nn-router
      version: "2.9.0"
      ref: "skills-v2.9.0"
      commit: "aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111"
      description: Router
    - name: nn-innfo
      repo: cogNNitive/cogNNitive-web
      path: skills/nn-innfo
      version: "2.9.0"
      ref: "skills-v2.9.0"
      commit: "aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111"
      description: iNNfo
      mcp:
        - name: nn-mcp
          repo: cogNNitive/cogNNitive-web
          path: iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js
          version: "0.11.0"
          ref: "nn-mcp-v0.11.0"
          commit: "bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222"
          url: https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222/iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js
  blueprints:
    - name: workspace_spec_NN
      repo: cogNNitive/cogNNitive-web
      path: iNNfo/specs/workspace_spec_NN.md
      version: "0.19.2"
      ref: "blueprints-v0.19.2"
      commit: "cccc3333cccc3333cccc3333cccc3333cccc3333"
  console-assets:
    - file: docs/console/index.html
      version: "0.2.0"
      ref: "nn-console-v0.2.0"
      commit: "dddd4444dddd4444dddd4444dddd4444dddd4444"
      url: https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/dddd4444dddd4444dddd4444dddd4444dddd4444/docs/console/index.html
  workflows:
    - id: wf1
      label: Test Workflow
      description: Test
---

# Body
`;

const SOURCE_YAML = {
  version: '1.0.0',
  entrypoint: 'nn-router',
  skills: [
    {
      name: 'nn-router',
      repo: 'cogNNitive/cogNNitive-web',
      path: 'skills/nn-router',
      ref_key: 'skills',
      description: 'Router',
    },
    {
      name: 'nn-innfo',
      repo: 'cogNNitive/cogNNitive-web',
      path: 'skills/nn-innfo',
      ref_key: 'skills',
      description: 'iNNfo',
      mcp: [
        {
          name: 'nn-mcp',
          repo: 'cogNNitive/cogNNitive-web',
          path: 'iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js',
          ref_key: 'nn-mcp',
        },
      ],
    },
  ],
  blueprints: [
    {
      name: 'workspace_spec_NN',
      repo: 'cogNNitive/cogNNitive-web',
      path: 'iNNfo/specs/workspace_spec_NN.md',
      ref_key: 'blueprints',
    },
  ],
  consoleAssets: [
    {
      name: 'console-index',
      file: 'docs/console/index.html',
      repo: 'cogNNitive/cogNNitive-web',
      ref_key: 'nn-console',
    },
  ],
  workflows: [
    {
      id: 'wf1',
      label: 'Test Workflow',
      description: 'Test',
    },
  ],
};

test('assembleManifest preserves other pins and updates released key', () => {
  const result = assembleManifest({
    releaseTag: 'skills-v2.10.0',
    contentSha: 'eeee5555eeee5555eeee5555eeee5555eeee5555',
    source: SOURCE_YAML,
    prevManifestText: PREV_MANIFEST,
    readVersion: (entry) => (entry.name === 'nn-router' ? '2.10.0' : '2.10.0'),
    resolveGitRef: () => true,
  });

  assert.ok(result.manifestText.includes('ref: "skills-v2.10.0"'));
  assert.ok(result.manifestText.includes('commit: "eeee5555eeee5555eeee5555eeee5555eeee5555"'));
  // Other pins preserved
  assert.ok(result.manifestText.includes('ref: "blueprints-v0.19.2"'));
  assert.ok(result.manifestText.includes('commit: "cccc3333cccc3333cccc3333cccc3333cccc3333"'));
  // Nested MCP pin retained from previous manifest
  assert.ok(result.manifestText.includes('ref: "nn-mcp-v0.11.0"'));
  assert.ok(result.manifestText.includes('version: "0.11.0"'));
});

test('assembleManifest releasing nn-mcp updates nested mcp pin while preserving skill pin', () => {
  const result = assembleManifest({
    releaseTag: 'nn-mcp-v0.12.0',
    contentSha: 'ffff6666ffff6666ffff6666ffff6666ffff6666',
    source: SOURCE_YAML,
    prevManifestText: PREV_MANIFEST,
    readVersion: () => '0.12.0',
    resolveGitRef: () => true,
  });

  // Skills pin preserved
  assert.ok(result.manifestText.includes('ref: "skills-v2.9.0"'));
  assert.ok(result.manifestText.includes('commit: "aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111"'));
  // Nested MCP pin updated
  assert.ok(result.manifestText.includes('ref: "nn-mcp-v0.12.0"'));
  assert.ok(result.manifestText.includes('commit: "ffff6666ffff6666ffff6666ffff6666ffff6666"'));
  assert.ok(result.manifestText.includes('version: "0.12.0"'));
});

test('assembleManifest regression guard fails if new version is not strictly greater than previous pin', () => {
  assert.throws(
    () =>
      assembleManifest({
        releaseTag: 'skills-v2.8.0',
        contentSha: 'eeee5555eeee5555eeee5555eeee5555eeee5555',
        source: SOURCE_YAML,
        prevManifestText: PREV_MANIFEST,
        readVersion: () => '2.8.0',
      }),
    (err) => err instanceof AssembleManifestError && /not greater|below previous pin/i.test(err.message)
  );
});

test('assembleManifest fails if retained pin does not resolve in clone', () => {
  assert.throws(
    () =>
      assembleManifest({
        releaseTag: 'skills-v2.10.0',
        contentSha: 'eeee5555eeee5555eeee5555eeee5555eeee5555',
        source: SOURCE_YAML,
        prevManifestText: PREV_MANIFEST,
        readVersion: () => '2.10.0',
        resolveGitRef: (ref) => (ref === 'blueprints-v0.19.2' ? 'DIFFERENT_SHA' : true),
      }),
    (err) => err instanceof AssembleManifestError && /does not resolve/i.test(err.message)
  );
});

test('assembleManifest fails with a clear message when a console asset has no previous pin on a non-console release', () => {
  const source = {
    ...SOURCE_YAML,
    consoleAssets: [
      ...SOURCE_YAML.consoleAssets,
      { name: 'console-new', file: 'scripts/console-views.mjs', repo: 'cogNNitive/cogNNitive-web', ref_key: 'nn-console' },
    ],
  };
  assert.throws(
    () =>
      assembleManifest({
        releaseTag: 'skills-v2.10.0',
        contentSha: 'eeee5555eeee5555eeee5555eeee5555eeee5555',
        source,
        prevManifestText: PREV_MANIFEST,
        readVersion: () => '2.10.0',
        resolveGitRef: () => true,
      }),
    (err) =>
      err instanceof AssembleManifestError &&
      /scripts\/console-views\.mjs/.test(err.message) &&
      /nn-console release/i.test(err.message)
  );
});

test('assembleManifest never emits an undefined pin for a console asset', () => {
  const result = assembleManifest({
    releaseTag: 'skills-v2.10.0',
    contentSha: 'eeee5555eeee5555eeee5555eeee5555eeee5555',
    source: SOURCE_YAML,
    prevManifestText: PREV_MANIFEST,
    readVersion: () => '2.10.0',
    resolveGitRef: () => true,
  });
  assert.ok(!/undefined/.test(result.manifestText));
});

test('assembleManifest fails with a clear message when a new blueprint has no previous pin on a non-blueprints release', () => {
  const source = {
    ...SOURCE_YAML,
    blueprints: [
      ...SOURCE_YAML.blueprints,
      { name: 'brand_new_NN', repo: 'cogNNitive/cogNNitive-web', path: 'iNNfo/specs/brand_new_NN.md', ref_key: 'blueprints' },
    ],
  };
  assert.throws(
    () =>
      assembleManifest({
        releaseTag: 'skills-v2.10.0',
        contentSha: 'eeee5555eeee5555eeee5555eeee5555eeee5555',
        source,
        prevManifestText: PREV_MANIFEST,
        readVersion: () => '2.10.0',
        resolveGitRef: () => true,
      }),
    (err) => err instanceof AssembleManifestError && /brand_new_NN/.test(err.message) && /blueprints-v\*/.test(err.message)
  );
});

test('a retained MCP pin keeps the path it was published with', () => {
  // A retained pin's raw URL is `commit + path`, and the commit is the content
  // commit of the release that pinned it: substituting the path source.yaml declares
  // today requests a file that did not exist at that commit. The 0.25.0 console release
  // failed the staged-manifest validation on exactly this (HTTP 404). The path and ref
  // below are deliberately the previous release's, not source.yaml's current values.
  const prevWithLegacyPath = `---
title: "cogNNitive — Bootstrap manifest"
channel: "stable"
agent-bootstrap:
  version: "1.0.0"
  entrypoint: "nn-router"
  skills:
    - name: nn-innfo
      repo: cogNNitive/cogNNitive-web
      path: skills/nn-innfo
      version: "1.0.0"
      ref: "skills-v1.0.0"
      commit: "aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111"
      description: iNNfo
      mcp:
        - name: nn-mcp
          repo: cogNNitive/cogNNitive-web
          path: iNNfo/packages/nn-mcp/bin/published.bundle.js
          version: "0.11.0"
          ref: "nn-mcp-v0.11.0"
          commit: "bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222"
          url: https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222/iNNfo/packages/nn-mcp/bin/published.bundle.js
  blueprints:
    - name: workspace_spec_NN
      repo: cogNNitive/cogNNitive-web
      path: iNNfo/specs/workspace_spec_NN.md
      version: "0.19.2"
      ref: "blueprints-v0.19.2"
      commit: "cccc3333cccc3333cccc3333cccc3333cccc3333"
  console-assets:
    - file: docs/console/index.html
      version: "0.2.0"
      ref: "nn-console-v0.2.0"
      commit: "dddd4444dddd4444dddd4444dddd4444dddd4444"
      url: https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/dddd4444dddd4444dddd4444dddd4444dddd4444/docs/console/index.html
  workflows:
    - id: wf1
      label: Test Workflow
      description: Test
---
`;

  const result = assembleManifest({
    releaseTag: 'skills-v2.11.0',
    contentSha: 'eeee5555eeee5555eeee5555eeee5555eeee5555',
    source: SOURCE_YAML,
    prevManifestText: prevWithLegacyPath,
    readVersion: () => '2.11.0',
    resolveGitRef: () => true,
  });

  assert.ok(
    result.manifestText.includes('path: iNNfo/packages/nn-mcp/bin/published.bundle.js'),
    'the retained pin keeps the published path',
  );
  assert.ok(
    !result.manifestText.includes('path: iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js'),
    'the retained pin must not adopt the path source.yaml declares today',
  );
  assert.ok(result.manifestText.includes('ref: "nn-mcp-v0.11.0"'), 'the MCP pin itself is unchanged');
  assert.ok(result.manifestText.includes('ref: "skills-v2.11.0"'), 'the released key still moves');
});

test('assembleManifest uses custom body when provided instead of inheriting prev.body', () => {
  const result = assembleManifest({
    releaseTag: 'skills-v2.10.0',
    contentSha: 'aaaa2222aaaa2222aaaa2222aaaa2222aaaa2222',
    source: SOURCE_YAML,
    prevManifestText: PREV_MANIFEST,
    readVersion: () => '2.10.0',
    resolveGitRef: () => true,
    body: '# New Custom Body Content\n\nSome custom instructions.',
  });

  assert.ok(result.manifestText.includes('# New Custom Body Content'), 'Manifest must include custom body');
  assert.ok(!result.manifestText.includes('# Body'), 'Manifest must not inherit previous body when custom is provided');
});
