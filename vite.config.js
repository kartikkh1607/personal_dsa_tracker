import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Files that ship from public/ rather than the bundle, so they never appear in
// Rollup's output but still have to be there when the app opens offline.
const STATIC_PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

// Rewrites dist/sw.js with a cache name unique to this build and the real list
// of content-hashed assets to precache. Runs in writeBundle, which is after
// Vite has copied public/ into dist, so this overwrites the copied template
// rather than being overwritten by it.
function serviceWorker() {
  return {
    name: 'dsa-service-worker',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir ?? 'dist'
      const swPath = join(outDir, 'sw.js')

      // Every emitted chunk and asset, which is what actually changes between
      // deploys: the hashed JS, the CSS, and the question data.
      const emitted = Object.keys(bundle)
        .map((name) => `/${name}`)
        .sort()
      const precache = [...new Set([...STATIC_PRECACHE, ...emitted])]

      // Hash names *and* contents. Most assets carry a content hash in the
      // name already, but index.html does not, so hashing names alone would
      // miss a change to it and leave clients on the old shell.
      const fingerprint = createHash('sha256')
      for (const name of Object.keys(bundle).sort()) {
        const item = bundle[name]
        fingerprint.update(name)
        fingerprint.update(item.type === 'chunk' ? item.code : (item.source ?? ''))
      }
      const buildId = fingerprint.digest('hex').slice(0, 12)

      const template = readFileSync(swPath, 'utf8')
      let source = template.replace(/const BUILD_ID = '[^']*'/, `const BUILD_ID = '${buildId}'`)
      source = source.replace(/const PRECACHE = \[[^\]]*\]/, `const PRECACHE = ${JSON.stringify(precache)}`)

      // A silent no-op replace would ship a worker that caches nothing and
      // never updates, so fail the build instead of finding out in production.
      if (!source.includes(`const BUILD_ID = '${buildId}'`)) throw new Error('sw.js: could not substitute BUILD_ID')
      if (!source.includes('const PRECACHE = ["/"')) throw new Error('sw.js: could not substitute PRECACHE')

      writeFileSync(swPath, source)
      console.log(`  sw.js  build ${buildId}, precaching ${precache.length} files`)
    },
  }
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  test: {
    // Tests run against the local-only app, whatever the person running them
    // happens to have in .env.local. Without this, anything that reaches the
    // sync hook would build a real client and start talking to a real project
    // on one machine and not another.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  },
})
