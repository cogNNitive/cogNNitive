#!/usr/bin/env node

/**
 * actioNN/scripts/skills-manager.js
 *
 * Lockfile-lite manager for cogNNitive skills and Level 2 templates.
 * Lean CLI orchestrator handling argument parsing, usage help, and command dispatch.
 * Delegates core command logic, state management, and atomic FS to modular libraries.
 *
 * Zero dependencies. Requires Node >= 18.
 */

const path = require('path');
const commands = require('./lib/skills-commands.js');

/**
 * Parses CLI command line arguments into structured SkillManagerArgs.
 * @param {string[]} argv
 * @returns {{ positional: string[], skillsDir: string | null, templatesDir: string | null, state: string | null, stateFile: string | null, yes: boolean, direction: string }}
 */
function parseArgs(argv) {
  const args = { positional: [], skillsDir: null, templatesDir: null, state: null, stateFile: null, yes: false, direction: 'local-to-global' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') {
      args.yes = true;
    } else if (arg === '--direction') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Option ${arg} requires a value`);
      }
      args.direction = value;
      i++;
    } else if (arg === '--skills-dir' || arg === '--templates-dir' || arg === '--state') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Option ${arg} requires a value`);
      }
      if (arg === '--skills-dir') args.skillsDir = value;
      else if (arg === '--templates-dir') args.templatesDir = value;
      else args.state = value;
      i++;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      args.positional.push(arg);
    }
  }
  return args;
}

/**
 * Displays usage and flag manual to console.
 * @returns {void}
 */
function usage() {
  console.log(`Usage:
  node scripts/skills-manager.js status    [--skills-dir <dir>] [--templates-dir <dir>] [--state <file>]
  node scripts/skills-manager.js install   [--skills-dir <dir>] [--templates-dir <dir>] [--state <file>] [--yes]
  node scripts/skills-manager.js update    [item ...] [--skills-dir <dir>] [--templates-dir <dir>] [--state <file>] [--yes]
  node scripts/skills-manager.js sync      [--skills-dir <dir>] [--templates-dir <dir>] [--direction <local-to-global|global-to-local>] [--yes]

Commands:
  status   Compare installed commits (state file) against manifest pins.
  install  Install missing skills and templates at their pinned commit.
  update   Update outdated skills and templates at their pinned commit.
  sync     Synchronize skill and template files between local repository and global agent directory.

Flags:
  --skills-dir <dir>     Skills directory (default: ~/.agents/skills)
  --templates-dir <dir>  Templates directory (default: ~/.agents/templates)
  --state <file>         State file (default: ~/.agents/bootstrap-state.json)
  --direction <dir>      Sync direction: local-to-global (default) or global-to-local
  --yes, -y              Skip the interactive consent prompt.

Consent is mandatory. Without a TTY and without --yes, the script prints
"needs decision: ..." and exits 2 without applying anything.`);
}

/**
 * Main execution entry point for skills manager.
 * @returns {Promise<void>}
 */
async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`skills-manager: ${err.message}`);
    process.exit(1);
  }

  const command = args.positional.shift();
  if (!command || !['status', 'install', 'update', 'sync'].includes(command)) {
    usage();
    process.exit(1);
  }

  const resolvedArgs = {
    positional: args.positional,
    skillsDir: path.resolve(args.skillsDir || commands.DEFAULT_SKILLS_DIR),
    templatesDir: path.resolve(args.templatesDir || commands.DEFAULT_TEMPLATES_DIR),
    stateFile: path.resolve(args.state || commands.DEFAULT_STATE_FILE),
    yes: args.yes,
    direction: args.direction,
  };

  try {
    if (command === 'status') await commands.cmdStatus(resolvedArgs);
    else if (command === 'install') await commands.cmdInstall(resolvedArgs);
    else if (command === 'update') await commands.cmdUpdate(resolvedArgs);
    else await commands.cmdSync(resolvedArgs);
  } catch (err) {
    console.error(`skills-manager: ${err.message}`);
    process.exit(1);
  }
}

module.exports = Object.defineProperties({
  ...commands,
  parseArgs,
  usage,
  main,
}, {
  MANIFEST_URL: {
    get() { return commands.getManifestUrl(); },
    enumerable: true,
  },
});

if (require.main === module) {
  main();
}
