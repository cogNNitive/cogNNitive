#!/usr/bin/env node
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  registerMcpForOpenCode,
  registerMcpForClaude,
  registerMcpForAntigravity,
  registerMcpAuto,
  readJsonClean,
  writeJsonClean,
} = require('./mcp-config-adapter.js');

async function testMcpAdapter() {
  console.log('Running mcp-config-adapter unit tests...');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-adapter-test-'));

  try {
    // 1. BOM-safe read and write
    {
      const bomFile = path.join(tmpDir, 'test-bom.json');
      const bomContent = '\uFEFF{"hello": "world"}';
      fs.writeFileSync(bomFile, bomContent, 'utf-8');

      const parsed = readJsonClean(bomFile);
      assert.strictEqual(parsed.hello, 'world', 'BOM was stripped and parsed cleanly');

      writeJsonClean(bomFile, { hello: 'updated' });
      const raw = fs.readFileSync(bomFile, 'utf-8');
      assert.strictEqual(raw.charCodeAt(0), 123, 'Written file does NOT have BOM (first char is {)');
      assert.strictEqual(JSON.parse(raw).hello, 'updated');
      console.log('✔ BOM-safe read and write passed');
    }

    // 2. OpenCode registration
    {
      const configFile = path.join(tmpDir, 'opencode.json');
      fs.writeFileSync(configFile, JSON.stringify({
        $schema: 'https://opencode.ai/config.json',
        mcp: {
          engram: { type: 'local', command: ['engram', 'mcp'] }
        }
      }, null, 2), 'utf-8');

      const bundlePath = 'C:\\test\\innfo-mcp.bundle.js';
      const result = registerMcpForOpenCode({
        configFile,
        serverName: 'innfo-mcp',
        bundlePath,
      });

      assert.strictEqual(result.updated, true);
      const updated = readJsonClean(configFile);
      assert(updated.mcp['innfo-mcp'], 'innfo-mcp added to mcp');
      assert.strictEqual(updated.mcp['innfo-mcp'].type, 'local');
      assert.deepStrictEqual(updated.mcp['innfo-mcp'].command, ['node', bundlePath]);
      assert.strictEqual(updated.mcp['innfo-mcp'].enabled, true);
      assert(updated.mcp.engram, 'existing engram mcp preserved');

      // Idempotency
      const result2 = registerMcpForOpenCode({
        configFile,
        serverName: 'innfo-mcp',
        bundlePath,
      });
      assert.strictEqual(result2.updated, false, 'No mutation if already registered identically');
      console.log('✔ OpenCode MCP registration passed');
    }

    // 3. Claude Code registration
    {
      const configFile = path.join(tmpDir, 'claude.json');
      fs.writeFileSync(configFile, JSON.stringify({
        mcpServers: {
          memory: { command: 'memory-server', args: [] }
        }
      }, null, 2), 'utf-8');

      const bundlePath = '/home/user/.agents/mcp/innfo-mcp.bundle.js';
      const result = registerMcpForClaude({
        configFile,
        serverName: 'innfo-mcp',
        bundlePath,
      });

      assert.strictEqual(result.updated, true);
      const updated = readJsonClean(configFile);
      assert(updated.mcpServers['innfo-mcp'], 'innfo-mcp added to mcpServers');
      assert.strictEqual(updated.mcpServers['innfo-mcp'].command, 'node');
      assert.deepStrictEqual(updated.mcpServers['innfo-mcp'].args, [bundlePath]);
      assert(updated.mcpServers.memory, 'existing memory server preserved');
      console.log('✔ Claude Code MCP registration passed');
    }

    // 4. Antigravity registration
    {
      const configFile = path.join(tmpDir, 'antigravity.json');
      fs.writeFileSync(configFile, JSON.stringify({}, null, 2), 'utf-8');

      const bundlePath = 'C:\\agents\\mcp\\innfo-mcp.bundle.js';
      const result = registerMcpForAntigravity({
        configFile,
        serverName: 'innfo-mcp',
        bundlePath,
      });

      assert.strictEqual(result.updated, true);
      const updated = readJsonClean(configFile);
      assert(updated.mcpServers['innfo-mcp'], 'innfo-mcp added to antigravity mcpServers');
      assert.strictEqual(updated.mcpServers['innfo-mcp'].command, 'node');
      assert.deepStrictEqual(updated.mcpServers['innfo-mcp'].args, [bundlePath]);
      console.log('✔ Antigravity MCP registration passed');
    }

    // 5. Auto-registration
    {
      const opencodeDir = path.join(tmpDir, '.config', 'opencode');
      fs.mkdirSync(opencodeDir, { recursive: true });
      const opencodeFile = path.join(opencodeDir, 'opencode.json');
      fs.writeFileSync(opencodeFile, JSON.stringify({ mcp: {} }), 'utf-8');

      const bundlePath = path.join(tmpDir, 'bundle.js');
      const results = registerMcpAuto({
        bundlePath,
        serverName: 'innfo-mcp',
        homedir: tmpDir,
      });

      assert(results.some(r => r.agent === 'opencode' && r.updated), 'Auto detected and updated OpenCode');
      console.log('✔ Auto-registration passed');
    }

    console.log('All mcp-config-adapter unit tests passed successfully!');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  testMcpAdapter().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { testMcpAdapter };
