/**
 * test/export-console-episodes.test.mjs
 *
 * The console export discovers episodes only under `series/<s>/episodes/<slug>/` and a
 * legacy episode left under `series/<s>/assets/<slug>/` is reported as a `legacy-layout`
 * finding, never silently listed as an episode beside the real ones.
 *
 * (capability conntent-folder-contract "Episode Discovery Is Shared By Every Consumer"
 * and "Legacy Layouts Are Rejected, Not Adapted"; task 1a.3 — RED: the data module still
 * walks `EPISODE_DIRS=['episodes','assets']`.)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { assertLayout, LAYOUT_LEGACY } from '../iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/layout.mjs';

const ASSETS = path.resolve(
  'iNNfo/specs/bluepriNNts/coNNtent/assets',
);
const DATA_FILE = path.join(ASSETS, 'console-view-conntent.data.mjs');

const EPISODE_DOC = (slug) =>
  `---
level: 3
title: "Episode"
---

# NN Video

## NN Video: ${slug}
slug:: ${slug}
`;

function makeDomain() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-export-episodes-'));
  fs.mkdirSync(path.join(root, 'series', 's'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'series', 's', 's_coNNtent_NN.md'),
    `---\nlevel: 3\nscope: true\nparent_spec:\n  name: "coNNtent_V_0-17-0"\n  url: "x"\ntitle: "S"\n---\n\n# NN Series\n\n## NN Series: S\nslug:: s\n`,
    'utf8',
  );
  fs.mkdirSync(path.join(root, 'series', 's', 'episodes', 'ok'), { recursive: true });
  fs.writeFileSync(path.join(root, 'series', 's', 'episodes', 'ok', 'ok_coNNtent_NN.md'), EPISODE_DOC('ok'), 'utf8');
  // A legacy episode under assets/ must be reported, not discovered.
  fs.mkdirSync(path.join(root, 'series', 's', 'assets', 'old'), { recursive: true });
  fs.writeFileSync(path.join(root, 'series', 's', 'assets', 'old', 'old_coNNtent_NN.md'), EPISODE_DOC('old'), 'utf8');
  return root;
}

test('assertLayout reports a legacy episode under series/<s>/assets/<slug>/', () => {
  const root = makeDomain();
  try {
    const hit = assertLayout(root).find((f) => f.code === LAYOUT_LEGACY && /assets\/old/.test(f.path));
    assert.ok(hit, 'expected a legacy-layout finding for the assets episode');
    assert.match(hit.message, /episodes now live in `series\/s\/episodes\/old\/`/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the console data module discovers an episode under episodes/ and does not discover a legacy assets episode as a normal episode', async () => {
  const root = makeDomain();
  try {
    const mod = await import(pathToFileURL(DATA_FILE).href);
    const data = await mod.collect({ rootDir: root });
    const slugs = data.tree.series.flatMap((series) => series.episodes.map((episode) => episode.slug));
    assert.ok(slugs.includes('ok'), 'the episodes/ episode is discovered');
    assert.ok(!slugs.includes('old'), 'a legacy assets/ episode is NOT a discovered episode');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});