#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const suiteScript = path.join(__dirname, 'generate-docsify-suite.mjs');

// Forward arguments to generate-docsify-suite.mjs in --sidebar-only mode
const args = process.argv.slice(2);
const suiteArgs = ['--sidebar-only', ...args];

const result = spawnSync('node', [suiteScript, ...suiteArgs], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

// A signal-killed child has `status === null`; treat that as failure rather
// than reporting success (matches scripts/skills-manager.js).
process.exit(result.status !== null ? result.status : 1);
