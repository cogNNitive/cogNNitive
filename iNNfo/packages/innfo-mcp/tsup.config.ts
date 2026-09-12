import { defineConfig } from 'tsup'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}
const MCP_VERSION = JSON.stringify(pkg.version)

export default defineConfig([
  {
    entry: {
      server: 'src/server.ts',
    },
    format: 'esm',
    clean: true,
    outDir: 'dist',
    dts: false,
    noExternal: ['@cognnitive/innfo-core'],
    external: ['yaml'],
    // Inline the version so the emitted artifact never reads ../package.json
    // at runtime (the dist build is shipped with its package.json, but baking
    // it in keeps one deterministic source of truth).
    define: {
      __INNFO_MCP_VERSION__: MCP_VERSION,
    },
  },
  {
    entry: {
      'innfo-mcp.bundle': 'src/server.ts',
    },
    format: 'esm',
    clean: false,
    outDir: 'bin',
    dts: false,
    noExternal: [/.*/],
    minify: true,
    // The distributed bundle is copied as a single file to docs/innfo/cdn/ by
    // scripts/build-docs.mjs; code-splitting would emit sibling chunk-*.js the
    // CDN never publishes, breaking the install.
    splitting: false,
    // Inline the version so the standalone bundle (installed flat, e.g. into
    // ~/.agents/mcp/) boots without a sibling package.json — the previous
    // `readFileSync(new URL('../package.json'))` crashed with ENOENT there.
    define: {
      __INNFO_MCP_VERSION__: MCP_VERSION,
    },
    // Single-file ESM bundle: inlined CJS deps (MCP SDK, ajv) perform dynamic
    // `require` of Node builtins. ESM has no `require`, so provide one via
    // createRequire — otherwise the bundle throws at load ("Dynamic require of
    // 'process' is not supported").
    banner: {
      js: "import{createRequire as __innfoCreateRequire}from'module';const require=__innfoCreateRequire(import.meta.url);",
    },
  },
])
