import { defineConfig } from 'tsup'

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
    // Single-file ESM bundle: inlined CJS deps (MCP SDK, ajv) perform dynamic
    // `require` of Node builtins. ESM has no `require`, so provide one via
    // createRequire — otherwise the bundle throws at load ("Dynamic require of
    // 'process' is not supported").
    banner: {
      js: "import{createRequire as __innfoCreateRequire}from'module';const require=__innfoCreateRequire(import.meta.url);",
    },
  },
])
