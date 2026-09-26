#!/usr/bin/env -S npx tsx

/**
 * skills/nn-video-script/scripts/vus-parse-runner.mjs
 *
 * Internal helper, always executed via `npx tsx` (never `node` directly) so
 * it can dynamically import VidGeNN's TypeScript-only core package. Never
 * invoked by hand — vus-parse.mjs spawns it as a child process.
 *
 * argv: [vidgennRoot, scriptPath]
 * stdout: JSON.stringify({ issues })
 */

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const [vidgennRoot, scriptPath] = process.argv.slice(2);

if (!vidgennRoot || !scriptPath) {
  console.error('Usage: vus-parse-runner.mjs <vidgennRoot> <scriptPath>');
  process.exit(2);
}

const entryUrl = pathToFileURL(`${vidgennRoot.replace(/\\/g, '/')}/packages/core/src/index.ts`).href;

let ScriptParser;
try {
  ({ ScriptParser } = await import(entryUrl));
} catch (err) {
  console.error(`Failed to import ScriptParser from ${entryUrl}: ${err.message}`);
  process.exit(2);
}

const content = fs.readFileSync(scriptPath, 'utf8');
const { issues } = ScriptParser.parse(content, scriptPath);

process.stdout.write(JSON.stringify({ issues }));
