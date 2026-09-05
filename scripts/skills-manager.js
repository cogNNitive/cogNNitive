#!/usr/bin/env node

/**
  * Root convenience forwarder to actioNN/scripts/skills-manager.js
  */

const path = require('path');
const { spawnSync } = require('child_process');

const target = path.join(__dirname, '..', 'actioNN', 'scripts', 'skills-manager.js');
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status !== null ? result.status : 1);
