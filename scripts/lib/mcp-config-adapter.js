/**
 * actioNN/scripts/lib/mcp-config-adapter.js
 *
 * Universal MCP configuration adapter for AI agents:
 * - OpenCode (~/.config/opencode/opencode.json or opencode.jsonc)
 * - Claude Code (~/.claude.json)
 * - Antigravity (~/.gemini/antigravity.json)
 * - Hermes Agent (~/.hermes/config.yaml)
 * - Codex / Generic environments
 *
 * Guarantees atomic writes, strict UTF-8 without BOM, and full idempotency.
 * Zero external dependencies — native Node.js execution.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { saveJsonAtomic } = require('./atomic-fs.js');

/**
 * Reads a JSON file safely, stripping UTF-8 Byte Order Mark (BOM) if present.
 * @param {string} filePath
 * @returns {any}
 */
function readJsonClean(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

/**
 * Writes data to a JSON file atomically, strictly UTF-8 without BOM.
 * @param {string} filePath
 * @param {any} data
 * @param {number} [indent=2]
 */
function writeJsonClean(filePath, data, indent = 2) {
  saveJsonAtomic(filePath, data, indent);
}

/**
 * Writes raw text to a file atomically, strictly UTF-8 without BOM.
 * @param {string} filePath
 * @param {string} text
 */
function writeTextClean(filePath, text) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  try {
    fs.writeFileSync(tmp, text, 'utf-8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch (_) {}
    throw err;
  }
}

/**
 * Registers an MCP server in OpenCode configuration.
 * @param {{
 *   configFile: string,
 *   serverName?: string,
 *   bundlePath: string,
 * }} options
 * @returns {{ agent: 'opencode', file: string, updated: boolean }}
 */
function registerMcpForOpenCode({ configFile, serverName = 'nn-mcp', bundlePath }) {
  const dir = path.dirname(configFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  /** @type {Record<string, any>} */
  let config = {};
  if (fs.existsSync(configFile)) {
    try {
      config = readJsonClean(configFile);
    } catch {
      config = {};
    }
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    config = {};
  }

  if (!config.$schema) {
    config.$schema = 'https://opencode.ai/config.json';
  }

  if (!config.mcp || typeof config.mcp !== 'object' || Array.isArray(config.mcp)) {
    config.mcp = {};
  }

  const existing = config.mcp[serverName];
  const targetCommand = ['node', bundlePath];
  const targetCwd = path.dirname(bundlePath);

  if (serverName === 'nn-mcp' && config.mcp['innfo-mcp']) {
    delete config.mcp['innfo-mcp'];
  }

  if (
    existing &&
    existing.type === 'local' &&
    existing.enabled === true &&
    Array.isArray(existing.command) &&
    existing.command.length === 2 &&
    existing.command[0] === 'node' &&
    existing.command[1] === bundlePath &&
    existing.cwd === targetCwd
  ) {
    return { agent: 'opencode', file: configFile, updated: false };
  }

  config.mcp[serverName] = {
    type: 'local',
    command: targetCommand,
    cwd: targetCwd,
    enabled: true,
  };

  writeJsonClean(configFile, config);
  return { agent: 'opencode', file: configFile, updated: true };
}

/**
 * Generic helper for agents using the standard mcpServers object format (Claude, Antigravity).
 * @param {{
 *   agent: 'claude' | 'antigravity',
 *   configFile: string,
 *   serverName?: string,
 *   bundlePath: string,
 * }} options
 * @returns {{ agent: 'claude' | 'antigravity', file: string, updated: boolean }}
 */
function registerMcpServersFormat({ agent, configFile, serverName = 'nn-mcp', bundlePath }) {
  const dir = path.dirname(configFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  /** @type {Record<string, any>} */
  let config = {};
  if (fs.existsSync(configFile)) {
    try {
      config = readJsonClean(configFile);
    } catch {
      config = {};
    }
  }

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    config = {};
  }

  if (!config.mcpServers || typeof config.mcpServers !== 'object' || Array.isArray(config.mcpServers)) {
    config.mcpServers = {};
  }

  if (serverName === 'nn-mcp' && config.mcpServers['innfo-mcp']) {
    delete config.mcpServers['innfo-mcp'];
  }

  const targetCwd = path.dirname(bundlePath);
  const existing = config.mcpServers[serverName];
  if (
    existing &&
    existing.command === 'node' &&
    Array.isArray(existing.args) &&
    existing.args.length === 1 &&
    existing.args[0] === bundlePath &&
    existing.cwd === targetCwd
  ) {
    return { agent, file: configFile, updated: false };
  }

  config.mcpServers[serverName] = {
    command: 'node',
    args: [bundlePath],
    cwd: targetCwd,
  };

  writeJsonClean(configFile, config);
  return { agent, file: configFile, updated: true };
}

/**
 * Registers an MCP server in Claude Code configuration (~/.claude.json).
 * @param {{
 *   configFile: string,
 *   serverName?: string,
 *   bundlePath: string,
 * }} options
 * @returns {{ agent: 'claude', file: string, updated: boolean }}
 */
function registerMcpForClaude(options) {
  const res = registerMcpServersFormat({ ...options, agent: 'claude' });
  return { agent: 'claude', file: res.file, updated: res.updated };
}

/**
 * Registers an MCP server in Antigravity configuration.
 * Supports ~/.gemini/antigravity/mcp_config.json and ~/.gemini/config/mcp_config.json.
 * @param {{
 *   configFile?: string,
 *   serverName?: string,
 *   bundlePath: string,
 *   homedir?: string,
 * }} options
 * @returns {Array<{ agent: 'antigravity', file: string, updated: boolean }>}
 */
function registerMcpForAntigravity(options) {
  const serverName = options.serverName || 'nn-mcp';
  const bundlePath = options.bundlePath;
  const homedir = options.homedir || os.homedir();

  if (options.configFile) {
    const res = registerMcpServersFormat({
      agent: 'antigravity',
      configFile: options.configFile,
      serverName,
      bundlePath,
    });
    return [{ agent: 'antigravity', file: res.file, updated: res.updated }];
  }

  const geminiDir = path.join(homedir, '.gemini');
  const candidateFiles = [
    path.join(geminiDir, 'antigravity', 'mcp_config.json'),
    path.join(geminiDir, 'config', 'mcp_config.json'),
  ];

  /** @type {Array<{ agent: 'antigravity', file: string, updated: boolean }>} */
  const results = [];
  for (const file of candidateFiles) {
    const res = registerMcpServersFormat({
      agent: 'antigravity',
      configFile: file,
      serverName,
      bundlePath,
    });
    results.push({ agent: 'antigravity', file: res.file, updated: res.updated });
  }
  return results;
}

/**
 * Updates Hermes YAML configuration safely with zero external dependencies.
 * Guarantees mcp_servers entry is up to date and curator is explicitly disabled.
 * @param {string} content
 * @param {string} serverName
 * @param {string} bundlePath
 * @returns {{ newContent: string, updated: boolean }}
 */
function updateHermesYaml(content, serverName = 'nn-mcp', bundlePath) {
  let lines = (content || '').replace(/\r\n/g, '\n').split('\n');

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  let mcpStart = -1;
  let mcpEnd = -1;
  let curatorStart = -1;
  let curatorEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^[a-zA-Z0-9_]+:/.test(line)) {
      if (mcpStart !== -1 && mcpEnd === -1) {
        mcpEnd = i;
      }
      if (curatorStart !== -1 && curatorEnd === -1) {
        curatorEnd = i;
      }
      if (/^mcp_servers:/.test(line)) {
        mcpStart = i;
      } else if (/^curator:/.test(line)) {
        curatorStart = i;
      }
    }
  }
  if (mcpStart !== -1 && mcpEnd === -1) mcpEnd = lines.length;
  if (curatorStart !== -1 && curatorEnd === -1) curatorEnd = lines.length;

  let changed = false;

  // 1. Process curator section (enforce curator.enabled: false)
  if (curatorStart === -1) {
    lines.push('');
    lines.push('curator:');
    lines.push('  enabled: false');
    changed = true;
  } else {
    const curatorLines = lines.slice(curatorStart, curatorEnd);
    const hasEnabledFalse = curatorLines.some(l => /^\s+enabled:\s*false\s*$/.test(l));
    if (!hasEnabledFalse) {
      let replaced = false;
      for (let i = curatorStart + 1; i < curatorEnd; i++) {
        if (/^\s+enabled:/.test(lines[i])) {
          lines[i] = '  enabled: false';
          replaced = true;
          changed = true;
          break;
        }
      }
      if (!replaced) {
        lines.splice(curatorStart + 1, 0, '  enabled: false');
        changed = true;
      }
    }
  }

  // Refresh section markers if changed
  if (changed) {
    mcpStart = -1;
    mcpEnd = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^[a-zA-Z0-9_]+:/.test(line)) {
        if (mcpStart !== -1 && mcpEnd === -1) {
          mcpEnd = i;
        }
        if (/^mcp_servers:/.test(line)) {
          mcpStart = i;
        }
      }
    }
    if (mcpStart !== -1 && mcpEnd === -1) mcpEnd = lines.length;
  }

  // 2. Process mcp_servers section
  const targetServerBlock = [
    `  ${serverName}:`,
    `    command: node`,
    `    args:`,
    `      - ${bundlePath}`,
    `    enabled: true`,
  ];

  if (mcpStart === -1) {
    lines.push('');
    lines.push('mcp_servers:');
    lines.push(...targetServerBlock);
    changed = true;
  } else {
    const mcpLines = lines.slice(mcpStart + 1, mcpEnd);
    /** @type {Array<{ name: string, start: number, end: number, lines: string[] }>} */
    const servers = [];
    let currentServer = null;

    for (let i = 0; i < mcpLines.length; i++) {
      const line = mcpLines[i];
      const match = /^ {2}([a-zA-Z0-9_-]+):/.exec(line);
      if (match) {
        if (currentServer) {
          currentServer.end = i;
          currentServer.lines = mcpLines.slice(currentServer.start, currentServer.end);
          servers.push(currentServer);
        }
        currentServer = { name: match[1], start: i, end: -1, lines: [] };
      }
    }
    if (currentServer) {
      currentServer.end = mcpLines.length;
      currentServer.lines = mcpLines.slice(currentServer.start, currentServer.end);
      servers.push(currentServer);
    }

    // Legacy cleanup: remove innfo-mcp when serverName === 'nn-mcp'
    let filteredServers = servers;
    if (serverName === 'nn-mcp') {
      const hasLegacy = servers.some(s => s.name === 'innfo-mcp');
      if (hasLegacy) {
        filteredServers = servers.filter(s => s.name !== 'innfo-mcp');
        changed = true;
      }
    }

    function parseServerProperties(serverLines) {
      let command = null;
      let args = [];
      let enabled = true;
      let inArgs = false;
      for (const l of serverLines) {
        const trimmed = l.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('command:')) {
          inArgs = false;
          command = trimmed.replace('command:', '').trim().replace(/^['"]|['"]$/g, '');
        } else if (trimmed.startsWith('args:')) {
          inArgs = true;
        } else if (inArgs && trimmed.startsWith('-')) {
          args.push(trimmed.slice(1).trim().replace(/^['"]|['"]$/g, ''));
        } else if (trimmed.startsWith('enabled:')) {
          inArgs = false;
          enabled = trimmed.replace('enabled:', '').trim() === 'true';
        } else if (!trimmed.startsWith('-')) {
          inArgs = false;
        }
      }
      return { command, args, enabled };
    }

    const existing = filteredServers.find(s => s.name === serverName);
    let targetUpToDate = false;
    if (existing) {
      const parsed = parseServerProperties(existing.lines);
      if (
        parsed.command === 'node' &&
        parsed.enabled === true &&
        parsed.args.length === 1 &&
        path.resolve(parsed.args[0]).toLowerCase() === path.resolve(bundlePath).toLowerCase()
      ) {
        targetUpToDate = true;
      }
    }

    if (!targetUpToDate || changed) {
      const newMcpLines = ['mcp_servers:'];
      let serverAdded = false;

      for (const s of filteredServers) {
        if (s.name === serverName) {
          newMcpLines.push(...targetServerBlock);
          serverAdded = true;
        } else {
          newMcpLines.push(...s.lines);
        }
      }

      if (!serverAdded) {
        newMcpLines.push(...targetServerBlock);
      }

      lines.splice(mcpStart, mcpEnd - mcpStart, ...newMcpLines);
      changed = true;
    }
  }

  const newContent = lines.join('\n') + '\n';
  return { newContent, updated: changed };
}

/**
 * Registers an MCP server in Hermes Agent configuration (~/.hermes/config.yaml).
 * Also ensures curator is disabled to prevent rogue auto-mutations.
 * @param {{
 *   configFile?: string,
 *   serverName?: string,
 *   bundlePath: string,
 *   homedir?: string,
 * }} options
 * @returns {{ agent: 'hermes', file: string, updated: boolean }}
 */
function registerMcpForHermes(options) {
  const homedir = options.homedir || os.homedir();
  const configFile = options.configFile || path.join(homedir, '.hermes', 'config.yaml');
  const serverName = options.serverName || 'nn-mcp';
  const bundlePath = options.bundlePath;

  const dir = path.dirname(configFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let content = '';
  if (fs.existsSync(configFile)) {
    try {
      content = fs.readFileSync(configFile, 'utf-8').replace(/^\uFEFF/, '');
    } catch {
      content = '';
    }
  }

  const { newContent, updated } = updateHermesYaml(content, serverName, bundlePath);
  if (updated) {
    writeTextClean(configFile, newContent);
  }

  return { agent: 'hermes', file: configFile, updated };
}

/**
 * Automatically discovers active agent environments and registers MCP server.
 * @param {{
 *   bundlePath: string,
 *   serverName?: string,
 *   homedir?: string,
 *   targetAgent?: string,
 * }} options
 * @returns {Array<{ agent: string, file: string, updated: boolean }>}
 */
function registerMcpAuto({ bundlePath, serverName = 'nn-mcp', homedir = os.homedir(), targetAgent = 'auto' }) {
  const results = [];
  const normalizedAgent = (targetAgent || 'auto').toLowerCase();

  const opencodeDir = path.join(homedir, '.config', 'opencode');
  const opencodeJson = path.join(opencodeDir, 'opencode.json');
  const opencodeJsonc = path.join(opencodeDir, 'opencode.jsonc');
  const claudeJson = path.join(homedir, '.claude.json');
  const geminiDir = path.join(homedir, '.gemini');
  const hermesDir = path.join(homedir, '.hermes');
  const hermesYaml = path.join(hermesDir, 'config.yaml');

  if (normalizedAgent === 'opencode') {
    const targetFile = fs.existsSync(opencodeJsonc) && !fs.existsSync(opencodeJson) ? opencodeJsonc : opencodeJson;
    results.push(registerMcpForOpenCode({ configFile: targetFile, serverName, bundlePath }));
    return results;
  }

  if (normalizedAgent === 'claude') {
    results.push(registerMcpForClaude({ configFile: claudeJson, serverName, bundlePath }));
    return results;
  }

  if (normalizedAgent === 'antigravity') {
    results.push(...registerMcpForAntigravity({ homedir, serverName, bundlePath }));
    return results;
  }

  if (normalizedAgent === 'hermes') {
    results.push(registerMcpForHermes({ configFile: hermesYaml, serverName, bundlePath, homedir }));
    return results;
  }

  if (normalizedAgent === 'all') {
    const targetFile = fs.existsSync(opencodeJsonc) && !fs.existsSync(opencodeJson) ? opencodeJsonc : opencodeJson;
    results.push(registerMcpForOpenCode({ configFile: targetFile, serverName, bundlePath }));
    results.push(registerMcpForClaude({ configFile: claudeJson, serverName, bundlePath }));
    results.push(...registerMcpForAntigravity({ homedir, serverName, bundlePath }));
    results.push(registerMcpForHermes({ configFile: hermesYaml, serverName, bundlePath, homedir }));
    return results;
  }

  let matchedAny = false;

  // Check OpenCode
  if (fs.existsSync(opencodeDir) || process.env.OPENCODE_SESSION_ID || process.env.OPENCODE_RUN_ID) {
    const targetFile = fs.existsSync(opencodeJsonc) && !fs.existsSync(opencodeJson) ? opencodeJsonc : opencodeJson;
    results.push(registerMcpForOpenCode({ configFile: targetFile, serverName, bundlePath }));
    matchedAny = true;
  }

  // Check Claude Code
  if (fs.existsSync(claudeJson) || fs.existsSync(path.join(homedir, '.claude')) || process.env.CLAUDE_CODE || process.env.CLAUDE_PROJECT_DIR) {
    results.push(registerMcpForClaude({ configFile: claudeJson, serverName, bundlePath }));
    matchedAny = true;
  }

  // Check Antigravity / Gemini
  if (fs.existsSync(geminiDir) || process.env.ANTIGRAVITY || process.env.GEMINI_CLI) {
    results.push(...registerMcpForAntigravity({ homedir, serverName, bundlePath }));
    matchedAny = true;
  }

  // Check Hermes
  if (fs.existsSync(hermesDir) || fs.existsSync(hermesYaml) || process.env.HERMES || process.env.HERMES_HOME) {
    results.push(registerMcpForHermes({ configFile: hermesYaml, serverName, bundlePath, homedir }));
    matchedAny = true;
  }

  // Fallback: If no specific environment found, ensure OpenCode config is populated (primary default)
  if (!matchedAny) {
    results.push(registerMcpForOpenCode({ configFile: opencodeJson, serverName, bundlePath }));
  }

  return results;
}

module.exports = {
  readJsonClean,
  writeJsonClean,
  writeTextClean,
  registerMcpForOpenCode,
  registerMcpForClaude,
  registerMcpForAntigravity,
  registerMcpForHermes,
  registerMcpAuto,
  updateHermesYaml,
};
