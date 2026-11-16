import { defineConfig } from 'tsup'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'esbuild'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * This checkout's `nn-core` sources. The bin bundle inlines these instead of
 * resolving `@cognnitive/nn-core` through `node_modules`, because that link is a
 * junction into whichever checkout built `nn-core` last: its `dist/` is a
 * gitignored build product, so the bundle bytes used to track a foreign build
 * (backlog item `nn-mcp-bundle-reproducibility`). Reading the tracked sources makes
 * the artifact a function of this tree only, on any platform and at any path.
 */
const NN_CORE_SOURCE_ENTRY = resolve(here, '../nn-core/src/index.ts')
const NN_CORE_SOURCE_DIR = resolve(here, '../nn-core/src')

/**
 * `nn-core` imports its siblings with the `./x.js` specifiers tsc emits under
 * NodeNext, while the files beside them are `.ts`. esbuild resolves neither the
 * rewrite nor the package entry, so both are answered here.
 */
const inlineCoreFromSource: Plugin = {
  name: 'nn-core-from-source',
  setup(build) {
    build.onResolve({ filter: /^@cognnitive\/nn-core$/ }, () => ({ path: NN_CORE_SOURCE_ENTRY }))
    build.onResolve({ filter: /^\.\.?\/.*\.js$/ }, (args) => {
      if (!resolve(args.importer || args.resolveDir).startsWith(NN_CORE_SOURCE_DIR)) return undefined
      const absolute = resolve(args.resolveDir, args.path)
      if (existsSync(absolute)) return undefined
      const source = `${absolute.slice(0, -'.js'.length)}.ts`
      return existsSync(source) ? { path: source } : undefined
    })
  },
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}
const MCP_VERSION = JSON.stringify(pkg.version)

// scripts/build-mcp-bundle.mjs builds the bin entry alone, into a throwaway
// directory when it checks the committed bytes, so a check never touches the tree.
const BUNDLE_ONLY = process.env.INNFO_MCP_BUNDLE_ONLY === '1'
const BUNDLE_OUT_DIR = process.env.INNFO_MCP_BUNDLE_OUT_DIR || 'bin'

const distConfig = {
  entry: {
    server: 'src/server.ts',
  },
  format: 'esm',
  clean: true,
  outDir: 'dist',
  dts: false,
  noExternal: ['@cognnitive/nn-core'],
  external: ['yaml'],
  // Inline the version so the emitted artifact never reads ../package.json
  // at runtime (the dist build is shipped with its package.json, but baking
  // it in keeps one deterministic source of truth).
  define: {
    __INNFO_MCP_VERSION__: MCP_VERSION,
  },
} satisfies import('tsup').Options

const bundleConfig = {
  entry: {
    'nn-mcp.bundle': 'src/server.ts',
  },
  format: 'esm',
  clean: false,
  outDir: BUNDLE_OUT_DIR,
  dts: false,
  noExternal: [/.*/],
  minify: true,
  // The distributed bundle is copied as a single file to docs/innfo/cdn/ by
  // scripts/stage-mcp-bundle.mjs; code-splitting would emit sibling chunk-*.js the
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
  esbuildPlugins: [inlineCoreFromSource],
} satisfies import('tsup').Options

export default defineConfig(BUNDLE_ONLY ? [bundleConfig] : [distConfig, bundleConfig])
