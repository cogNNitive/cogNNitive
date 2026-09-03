#!/usr/bin/env node

/**
 * Root convenience runner forwarding to skills/nn-preflight/scripts/preflight-check.js
 */

const path = require('path');
const { spawnSync } = require('child_process');

const target = path.join(__dirname, '..', 'skills', 'nn-preflight', 'scripts', 'preflight-check.js');
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status !== null ? result.status : 1);
