import { build } from 'esbuild'
import { mkdir, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'node_modules/.cache/permissions/permissions.test.cjs')
await mkdir(path.dirname(output), { recursive: true })
try {
  await build({
    absWorkingDir: root, entryPoints: ['tests/permissions.test.tsx'], outfile: output,
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    define: { 'import.meta.env': JSON.stringify({ BASE_URL: '/' }) },
    plugins: [{ name: 'source-alias', setup(builder) {
      builder.onResolve({ filter: /^@\// }, async args => {
        for (const extension of ['.ts', '.tsx']) {
          const candidate = path.join(root, 'src', args.path.slice(2)) + extension
          try { await import('node:fs/promises').then(fs => fs.access(candidate)); return { path: candidate } } catch {}
        }
        throw new Error('Unresolved source alias: ' + args.path)
      })
    } }, { name: 'in-memory-auth-fixture', setup(builder) {
      // Exercise real route/action helpers and UI components without persisted
      // browser storage or Zustand's fixed server-rendering initial snapshot.
      builder.onLoad({ filter: /[\\/]store[\\/]auth\.store\.ts$/ }, () => ({
        contents: `let state = { menu: [] };
          export function useAuthStore(selector) { return selector(state) }
          useAuthStore.setState = update => { state = { ...state, ...update } };`,
        loader: 'js',
      }))
    } }, { name: 'server-rendered-portal', setup(builder) {
      builder.onResolve({ filter: /^react-dom$/ }, () => ({ path: 'portal', namespace: 'test-portal' }))
      builder.onLoad({ filter: /.*/, namespace: 'test-portal' }, () => ({
        contents: 'export function createPortal(children) { return children }', loader: 'js',
      }))
    } }],
  })
  execFileSync(process.execPath, [output], { cwd: root, stdio: 'inherit' })
} finally {
  await rm(output, { force: true })
}
